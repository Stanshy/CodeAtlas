/**
 * @codeatlas/cli — AI Analysis Pipeline
 *
 * Sprint 16: Phase functions are now individually exported so the Job Manager
 * (T1) can invoke them on demand instead of running the full pipeline at
 * server startup. Results are stored in a PersistentAICache that survives
 * server restarts.
 *
 * Three phases:
 *   Phase 1: Method batch analysis (LO perspective — aiSummary per function)
 *   Phase 2: Directory summaries (SF perspective — oneLineSummary per directory)
 *   Phase 3: Endpoint + Step analysis (DJ perspective — description per endpoint/step)
 *
 * All phases are wrapped in try-catch; failures are logged but never crash the server.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { AnalysisResult } from '@codeatlas/core';
import {
  createProvider,
  isAnalysisProvider,
  buildChainContext,
  buildDirectorySummaryPrompt,
  buildEndpointDescriptionPrompt,
  buildStepDetailPrompt,
  buildLargeContext,
  safeValidateDirectorySummary,
  safeValidateEndpointDescription,
  safeValidateStepDetail,
  aggregateByDirectory,
  detectEndpoints,
} from '@codeatlas/core';
import type {
  AIAnalysisProvider,
  MethodContext,
  ChainContext,
  DirectoryInfo,
  MethodRole,
  StepDetail,
  Locale,
} from '@codeatlas/core';
import { PersistentAICache, computeContentHash } from './ai-cache.js';

// Re-export so consumers can import from a single entry point if needed
export { PersistentAICache, computeContentHash } from './ai-cache.js';

// ---------------------------------------------------------------------------
// Legacy in-memory AICache — kept for backward-compatibility with callers
// that have not yet migrated to PersistentAICache.
// Sprint 17: remove this interface once all callers are migrated.
// ---------------------------------------------------------------------------

export interface AICache {
  /** nodeId → aiSummary */
  methodSummaries: Map<string, string>;
  /** directoryId → DirectorySummary */
  directorySummaries: Map<string, import('@codeatlas/core').DirectorySummary>;
  /** endpointId → chineseDescription */
  endpointDescriptions: Map<string, string>;
  /** endpointId → StepDetail[] */
  stepDetails: Map<string, StepDetail[]>;
  /** Pipeline status */
  status: 'idle' | 'running' | 'done' | 'error';
  /** Progress message */
  progress: string;
  /** Error message (if status='error') */
  error?: string;
  /** Number of completed phases (0-3). Frontend can refetch after phase 1. */
  completedPhases: number;
}

export function createAICache(): AICache {
  return {
    methodSummaries: new Map(),
    directorySummaries: new Map(),
    endpointDescriptions: new Map(),
    stepDetails: new Map(),
    status: 'idle',
    progress: '',
    completedPhases: 0,
  };
}

// ---------------------------------------------------------------------------
// Pipeline options
// ---------------------------------------------------------------------------

export interface PipelineOptions {
  analysis: AnalysisResult;
  providerName: string;
  apiKey?: string | undefined;
  ollamaModel?: string | undefined;
  /** PersistentAICache to read from and write results to */
  cache: PersistentAICache;
  /** Locale for AI prompt output language. Default: 'en' */
  locale?: import('@codeatlas/core').Locale;
}

// Prompt versions — bump these when the prompt template changes so that
// existing cache entries are treated as stale and regenerated.
const PROMPT_VERSION_PHASE1 = 'v1';
const PROMPT_VERSION_PHASE2 = 'v1';
const PROMPT_VERSION_PHASE3 = 'v1';

// ---------------------------------------------------------------------------
// Phase 1: Method batch analysis (exported for Job Manager)
// ---------------------------------------------------------------------------

/**
 * Analyze function nodes in batches and write one-line summaries into cache.
 * Skips nodes whose cache entry is still fresh.
 * Never throws — logs warnings and moves on.
 */
export async function runPhase1MethodBatch(
  analysis: AnalysisResult,
  aiProvider: AIAnalysisProvider,
  cache: PersistentAICache,
  locale: Locale = 'en',
): Promise<void> {
  const functionNodes = analysis.graph.nodes.filter(
    (n) => n.type === 'function' && n.metadata?.parentFileId,
  );
  const totalMethods = functionNodes.length;

  if (totalMethods === 0) return;

  const BATCH_SIZE = 5;
  for (let i = 0; i < functionNodes.length; i += BATCH_SIZE) {
    const batch = functionNodes.slice(i, i + BATCH_SIZE);

    try {
      // Check if all nodes in batch are already cached and fresh
      const needsAnalysis = batch.filter((n) => {
        const cacheKey = `method:${n.id}:${aiProvider.name}:${PROMPT_VERSION_PHASE1}:${locale}`;
        const existing = cache.get(cacheKey);
        if (!existing) return true;
        const nodeContent = JSON.stringify(n.metadata ?? {});
        return cache.isStale(existing, computeContentHash(nodeContent), PROMPT_VERSION_PHASE1);
      });

      if (needsAnalysis.length === 0) continue;

      const methodContexts: MethodContext[] = needsAnalysis.map((n) => {
        const ctx: MethodContext = {
          nodeId: n.id,
          name: n.label,
          filePath: n.filePath,
        };
        if (n.metadata.kind) ctx.kind = n.metadata.kind;
        if (n.metadata.parameters) {
          ctx.parameters = n.metadata.parameters.map((p) => {
            const param: { name: string; type?: string } = { name: p.name };
            if (p.type) param.type = p.type;
            return param;
          });
        }
        if (n.metadata.returnType) ctx.returnType = n.metadata.returnType;
        if (n.metadata.isAsync) ctx.isAsync = n.metadata.isAsync;
        if (n.metadata.isExported) ctx.isExported = n.metadata.isExported;
        if (n.metadata.lineCount) ctx.lineCount = n.metadata.lineCount;

        // Read source code snippet using startLine/endLine metadata
        if (n.metadata.startLine != null && n.metadata.endLine != null && n.filePath) {
          try {
            const absPath = join(analysis.projectPath, n.filePath);
            const src = readFileSync(absPath, 'utf-8');
            const lines = src.split('\n');
            const start = Math.max(0, n.metadata.startLine);
            const end = Math.min(lines.length - 1, n.metadata.endLine);
            ctx.codeSnippet = lines.slice(start, end + 1).join('\n');
          } catch {
            // File not readable — proceed without snippet
          }
        }
        return ctx;
      });

      const result = await aiProvider.analyzeMethodBatch(methodContexts, 'medium');

      // Write summaries to cache — skip low-quality fallback results
      for (const method of result.methods) {
        if (method.oneLineSummary) {
          const summary = method.oneLineSummary;
          // Skip caching garbage results (AI couldn't analyze properly)
          if (
            summary.includes('尚未被') ||
            summary.includes('無法進行') ||
            summary.includes('not supported') ||
            summary.includes('cannot be analyzed')
          ) {
            console.warn(`[AI Pipeline] Skipping cache for "${method.id}" — low quality result`);
            continue;
          }
          const node = needsAnalysis.find((n) => n.id === method.id);
          const nodeContent = JSON.stringify(node?.metadata ?? {});
          const cacheKey = `method:${method.id}:${aiProvider.name}:${PROMPT_VERSION_PHASE1}:${locale}`;
          cache.set(cacheKey, {
            key: cacheKey,
            contentHash: computeContentHash(nodeContent),
            provider: aiProvider.name,
            promptVersion: PROMPT_VERSION_PHASE1,
            result: summary,
            createdAt: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.warn(
        `[AI Pipeline] Method batch ${i}-${i + BATCH_SIZE} failed:`,
        err instanceof Error ? err.message : String(err),
      );
      // Continue with next batch
    }
  }

}

// ---------------------------------------------------------------------------
// Phase 2: Directory summaries (exported for Job Manager)
// ---------------------------------------------------------------------------

/**
 * Summarize each directory and write DirectorySummary objects into cache.
 * Skips directories whose cache entry is still fresh.
 * Never throws — logs warnings and moves on.
 */
export async function runPhase2DirectorySummaries(
  analysis: AnalysisResult,
  aiProvider: AIAnalysisProvider,
  cache: PersistentAICache,
  targetDirPath?: string,
  locale: Locale = 'en',
): Promise<void> {
  const fileNodes = analysis.graph.nodes.filter(
    (n) => n.metadata?.parentFileId === undefined,
  );
  const nonCallEdges = analysis.graph.edges.filter((e) => e.type !== 'call');
  const directoryGraph = aggregateByDirectory(fileNodes, nonCallEdges);

  if (!directoryGraph) return;

  // Filter to single directory if target is specified (normalize trailing slash)
  const normalizedTarget = targetDirPath?.replace(/\/+$/, '');
  const dirNodes = normalizedTarget
    ? directoryGraph.nodes.filter((d) => d.id === normalizedTarget || d.id === targetDirPath)
    : directoryGraph.nodes;

  for (const dirNode of dirNodes) {
    try {
      const dirFiles = analysis.graph.nodes.filter(
        (n) => n.type === 'file' && n.filePath.startsWith(dirNode.id),
      );

      // Staleness check
      const dirContent = JSON.stringify(dirFiles.map((f) => ({ id: f.id, label: f.label })));
      const cacheKey = `directory:${dirNode.id}:${aiProvider.name}:${PROMPT_VERSION_PHASE2}:${locale}`;
      const existing = cache.get(cacheKey);
      if (existing && !cache.isStale(existing, computeContentHash(dirContent), PROMPT_VERSION_PHASE2)) {
        continue;
      }

      const directoryInfo: DirectoryInfo = {
        path: dirNode.id,
        files: dirFiles.map((f) => ({
          name: f.label,
          exports: [],
          lineCount: f.metadata.lineCount ?? 0,
        })),
      };

      const directoryContext = buildLargeContext(directoryInfo, 'medium');
      const prompt = buildDirectorySummaryPrompt(directoryContext, dirNode.id, locale);

      // Use rawPrompt to avoid legacy buildPrompt() wrapping an English system
      // message around our Chinese prompt template.
      const raw = await withTimeout(
        aiProvider.rawPrompt(prompt),
        PER_ITEM_TIMEOUT_MS,
        `directory ${dirNode.id}`,
      );

      // Try structured JSON first; fall back gracefully for different model capabilities
      let dirResult: Record<string, unknown> | undefined;
      try {
        const parsed = extractJson(raw);
        const validated = safeValidateDirectorySummary(parsed);
        if (validated.success) {
          dirResult = validated.data as Record<string, unknown>;
        } else {
          // Schema validation failed — truncate and use raw fields
          const obj = parsed as Record<string, unknown>;
          if (typeof obj.oneLineSummary === 'string' || typeof obj.role === 'string') {
            dirResult = {
              directoryPath: typeof obj.directoryPath === 'string' ? obj.directoryPath : dirNode.id,
              role: typeof obj.role === 'string' ? obj.role.slice(0, 100) : '未分類',
              oneLineSummary: typeof obj.oneLineSummary === 'string' ? obj.oneLineSummary.slice(0, 200) : '',
              keyResponsibilities: Array.isArray(obj.keyResponsibilities) ? obj.keyResponsibilities : [],
              confidence: typeof obj.confidence === 'number' ? obj.confidence : 0.5,
            };
            console.warn(`[AI Pipeline] Directory ${dirNode.id}: schema validation failed, using truncated fields`);
          }
        }
      } catch {
        // JSON extraction failed — build a minimal result from raw text
        const trimmed = raw.trim();
        if (trimmed.length > 0) {
          dirResult = {
            directoryPath: dirNode.id,
            role: '未分類',
            oneLineSummary: trimmed.slice(0, 200),
            keyResponsibilities: [],
            confidence: 0.4,
          };
          console.warn(`[AI Pipeline] Directory ${dirNode.id}: JSON extraction failed, using raw text`);
        }
      }

      if (dirResult) {
        cache.set(cacheKey, {
          key: cacheKey,
          contentHash: computeContentHash(dirContent),
          provider: aiProvider.name,
          promptVersion: PROMPT_VERSION_PHASE2,
          result: dirResult,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn(
        `[AI Pipeline] Directory ${dirNode.id} failed:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

}

// ---------------------------------------------------------------------------
// Phase 3: Endpoint + Step analysis (exported for Job Manager)
// ---------------------------------------------------------------------------

/**
 * Generate AI descriptions for each API endpoint and its chain steps,
 * writing results into cache. Skips endpoints whose cache entry is fresh.
 * Never throws — logs warnings and moves on.
 */
export async function runPhase3EndpointAnalysis(
  analysis: AnalysisResult,
  aiProvider: AIAnalysisProvider,
  cache: PersistentAICache,
  targetEndpointId?: string,
  locale: Locale = 'en',
): Promise<void> {
  const endpointGraph = detectEndpoints(analysis);
  if (!endpointGraph) return;

  // Filter to single endpoint if target is specified
  const endpoints = targetEndpointId
    ? endpointGraph.endpoints.filter((e) => e.id === targetEndpointId)
    : endpointGraph.endpoints;

  for (const endpoint of endpoints) {
    try {
      const chain = endpointGraph.chains.find((c) => c.endpointId === endpoint.id);

      // Staleness check for endpoint description
      const endpointContent = JSON.stringify({ method: endpoint.method, path: endpoint.path });
      const descCacheKey = `endpoint-desc:${endpoint.id}:${aiProvider.name}:${PROMPT_VERSION_PHASE3}:${locale}`;
      const existingDesc = cache.get(descCacheKey);
      const descIsStale = !existingDesc || cache.isStale(
        existingDesc,
        computeContentHash(endpointContent),
        PROMPT_VERSION_PHASE3,
      );

      if (descIsStale) {
        console.log(`[AI Pipeline] Endpoint ${endpoint.id}: locale="${locale}", cacheKey="${descCacheKey}"`);
        const chainContext: ChainContext = {
          endpointId: endpoint.id,
          method: endpoint.method,
          path: endpoint.path,
          steps: (chain?.steps ?? []).map((s) => ({
            name: s.name,
            ...(s.className ? { className: s.className } : {}),
            fileId: s.fileId,
            ...(s.role ? { role: s.role as MethodRole } : {}),
          })),
        };

        const context = buildChainContext(chainContext, 'medium');
        const endpointPrompt = buildEndpointDescriptionPrompt(
          context,
          endpoint.id,
          endpoint.method,
          endpoint.path,
          locale,
        );

        const rawEndpoint = await withTimeout(
          aiProvider.rawPrompt(endpointPrompt),
          PER_ITEM_TIMEOUT_MS,
          `endpoint ${endpoint.id}`,
        );

        // Try structured JSON first; fall back gracefully for different model capabilities
        let endpointDescription: string | undefined;
        try {
          const parsedEndpoint = extractJson(rawEndpoint);
          const validatedEndpoint = safeValidateEndpointDescription(parsedEndpoint);
          if (validatedEndpoint.success) {
            endpointDescription = validatedEndpoint.data.chineseDescription;
          } else {
            // Schema validation failed — try extracting chineseDescription directly
            // (model returned valid JSON but fields exceeded limits or missing optional fields)
            const obj = parsedEndpoint as Record<string, unknown>;
            if (typeof obj.chineseDescription === 'string' && obj.chineseDescription.length > 0) {
              endpointDescription = obj.chineseDescription.slice(0, 500);
              console.warn(`[AI Pipeline] Endpoint ${endpoint.id}: schema validation failed, using raw chineseDescription (${obj.chineseDescription.length} chars)`);
            } else if (typeof obj.purpose === 'string' && obj.purpose.length > 0) {
              endpointDescription = obj.purpose.slice(0, 500);
              console.warn(`[AI Pipeline] Endpoint ${endpoint.id}: schema validation failed, falling back to purpose field`);
            }
          }
        } catch {
          // JSON extraction failed — use raw text as-is (common with local models)
          const trimmed = rawEndpoint.trim();
          if (trimmed.length > 0 && trimmed.length < 1000) {
            endpointDescription = trimmed;
            console.warn(`[AI Pipeline] Endpoint ${endpoint.id}: JSON extraction failed, using raw text (${trimmed.length} chars)`);
          }
        }

        if (endpointDescription) {
          cache.set(descCacheKey, {
            key: descCacheKey,
            contentHash: computeContentHash(endpointContent),
            provider: aiProvider.name,
            promptVersion: PROMPT_VERSION_PHASE3,
            result: {
              description: endpointDescription,
              endpointId: endpoint.id,
              method: endpoint.method,
              path: endpoint.path,
            },
            createdAt: new Date().toISOString(),
          });
        }
      }

      // Step details
      if (chain && chain.steps.length > 0) {
        const stepsCacheKey = `endpoint-steps:${endpoint.id}:${aiProvider.name}:${PROMPT_VERSION_PHASE3}:${locale}`;
        const stepsContent = JSON.stringify(chain.steps.map((s) => s.method));
        const existingSteps = cache.get(stepsCacheKey);
        const stepsIsStale = !existingSteps || cache.isStale(
          existingSteps,
          computeContentHash(stepsContent),
          PROMPT_VERSION_PHASE3,
        );

        if (stepsIsStale) {
          const chainContext: ChainContext = {
            endpointId: endpoint.id,
            method: endpoint.method,
            path: endpoint.path,
            steps: chain.steps.map((s) => ({
              name: s.name,
              ...(s.className ? { className: s.className } : {}),
              fileId: s.fileId,
              ...(s.role ? { role: s.role as MethodRole } : {}),
            })),
          };

          const context = buildChainContext(chainContext, 'medium');
          const stepsInput = chain.steps.map((s, idx) => ({
            stepIndex: idx,
            methodId: `${s.fileId}#${s.method}`,
          }));

          const stepPrompt = buildStepDetailPrompt(context, stepsInput, locale);
          const rawSteps = await withTimeout(
            aiProvider.rawPrompt(stepPrompt),
            PER_ITEM_TIMEOUT_MS,
            `steps for ${endpoint.id}`,
          );

          const parsedSteps = extractJsonArray(rawSteps);
          if (Array.isArray(parsedSteps)) {
            const validatedSteps: StepDetail[] = [];
            for (const step of parsedSteps) {
              const v = safeValidateStepDetail(step);
              if (v.success) {
                validatedSteps.push(v.data);
              } else {
                // Fallback: truncate fields that exceeded max length
                const raw = step as Record<string, unknown>;
                if (typeof raw.stepIndex === 'number' && typeof raw.methodId === 'string') {
                  validatedSteps.push({
                    stepIndex: raw.stepIndex,
                    methodId: raw.methodId,
                    description: typeof raw.description === 'string' ? raw.description.slice(0, 200) : '',
                    input: typeof raw.input === 'string' ? raw.input.slice(0, 200) : '',
                    output: typeof raw.output === 'string' ? raw.output.slice(0, 200) : '',
                    transform: typeof raw.transform === 'string' ? raw.transform.slice(0, 300) : '',
                  });
                }
              }
            }
            if (validatedSteps.length > 0) {
              cache.set(stepsCacheKey, {
                key: stepsCacheKey,
                contentHash: computeContentHash(stepsContent),
                provider: aiProvider.name,
                promptVersion: PROMPT_VERSION_PHASE3,
                result: validatedSteps,
                createdAt: new Date().toISOString(),
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn(
        `[AI Pipeline] Endpoint ${endpoint.id} failed:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

}

// ---------------------------------------------------------------------------
// Full pipeline (convenience wrapper — primarily for backwards compat / testing)
// ---------------------------------------------------------------------------

/**
 * Run all three AI pipeline phases sequentially.
 * Resolves when all phases complete. Never throws.
 */
export async function runAIPipeline(options: PipelineOptions): Promise<void> {
  const { analysis, providerName, apiKey, ollamaModel, cache } = options;
  const locale: Locale = options.locale ?? 'en';

  const provider = createProvider(
    providerName,
    apiKey,
    providerName === 'ollama' ? { ollamaModel: ollamaModel ?? 'gemma3:4b' } : undefined,
  );

  if (!isAnalysisProvider(provider)) {
    return;
  }

  const aiProvider = provider as unknown as AIAnalysisProvider;

  try {
    await runPhase1MethodBatch(analysis, aiProvider, cache, locale);
    await runPhase2DirectorySummaries(analysis, aiProvider, cache, undefined, locale);
    await runPhase3EndpointAnalysis(analysis, aiProvider, cache, undefined, locale);
  } catch (err) {
    console.error('[AI Pipeline] Fatal error:', err instanceof Error ? err.message : String(err));
  }
}

// ---------------------------------------------------------------------------
// Timeout helper
// ---------------------------------------------------------------------------

const PER_ITEM_TIMEOUT_MS = 300_000; // 300s (5min) — local models like gemma4 9.6GB are slow

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout: ${label} exceeded ${ms / 1000}s`)),
      ms,
    );
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

// ---------------------------------------------------------------------------
// JSON extraction helpers
// ---------------------------------------------------------------------------

function extractJson(text: string): unknown {
  try { return JSON.parse(text); } catch { /* noop */ }
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* noop */ }
  }
  throw new Error('Failed to extract JSON from AI response');
}

function extractJsonArray(text: string): unknown {
  try { return JSON.parse(text); } catch { /* noop */ }
  const match = text.match(/\[[\s\S]*\]/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* noop */ }
  }
  throw new Error('Failed to extract JSON array from AI response');
}
