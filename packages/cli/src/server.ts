/**
 * @codeatlas/cli — Fastify local HTTP server
 *
 * Serves the web UI static files and exposes a JSON API for the analysis
 * graph produced by the `analyze` command.
 *
 * Sprint 16: Removed fire-and-forget AI pipeline on startup.
 * AI analysis is now triggered on demand by the Job Manager (T1).
 * AI results are persisted via PersistentAICache.
 */

import fs from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import type { AnalysisResult } from '@codeatlas/core';
import {
  createProvider,
  extractStructureInfo,
  buildOverviewPrompt,
  aggregateByDirectory,
  detectEndpoints,
  scanDirectory,
} from '@codeatlas/core';
import type { ServerMode, ServerStatus, AnalysisProgress } from '@codeatlas/core';
import type { DirectorySummary, StepDetail } from '@codeatlas/core';
import type { WikiManifest, WikiNode, WikiPageMeta } from '@codeatlas/core';
import {
  buildConceptDeepAnalysisPrompt,
  parseConceptDeepAnalysisResponse,
} from '@codeatlas/core';
import { getCachedSummary, setCachedSummary } from './cache.js';
import { PersistentAICache } from './ai-cache.js';
import type { AICacheEntry } from './ai-cache.js';
import { AIJobManager } from './ai-job-manager.js';
import { isAnalysisProvider } from '@codeatlas/core';
import { runAnalysis } from './analysis-runner.js';
import {
  getRecentProjects,
  addRecentProject,
  removeRecentProject,
} from './recent-projects.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServerOptions {
  port: number;
  analysisPath: string;  // absolute path to .codeatlas/analysis.json
  staticDir: string;     // absolute path to packages/web/
  aiKey?: string;        // API key for AI provider
  aiProvider?: string;   // 'ollama' | 'openai' | 'anthropic' | 'disabled'
  ollamaModel?: string;  // Ollama model name (default: 'codellama')
  /** Sprint 20: Initial server mode. 'idle' = no project loaded yet. */
  mode?: ServerMode;
}

// ---------------------------------------------------------------------------
// Sprint 20: Project analysis job registry (module-level, single-server)
// ---------------------------------------------------------------------------

interface ProjectJob {
  progress: AnalysisProgress;
  /** Listeners subscribed via SSE — notified on each progress update. */
  listeners: Set<(p: AnalysisProgress) => void>;
}

const projectJobs = new Map<string, ProjectJob>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Read and parse analysis.json from disk on every call (no cache),
 * so a re-analyze followed by a browser refresh always returns fresh data.
 */
async function readAnalysis(analysisPath: string): Promise<AnalysisResult> {
  let raw: string;
  try {
    raw = await fs.readFile(analysisPath, 'utf-8');
  } catch {
    const err = new Error(`analysis.json not found at "${analysisPath}"`);
    (err as NodeJS.ErrnoException).code = 'ENOENT';
    throw err;
  }
  try {
    return JSON.parse(raw) as AnalysisResult;
  } catch {
    const err = new Error(`analysis.json is malformed at "${analysisPath}"`);
    (err as NodeJS.ErrnoException).code = 'EPARSE';
    throw err;
  }
}

/**
 * Sprint 16: Merge PersistentAICache results into graph response data.
 *
 * Cache entries use scoped keys:
 *   method:<nodeId>:<provider>:<promptVersion>       → result: string (oneLineSummary)
 *   directory:<dirId>:<provider>:<promptVersion>     → result: DirectorySummary
 *   endpoint-desc:<epId>:<provider>:<promptVersion>  → result: string (chineseDescription)
 *   endpoint-steps:<epId>:<provider>:<promptVersion> → result: StepDetail[]
 *
 * Mutates the passed-in nodes/directoryGraph/endpointGraph in place.
 */
function mergeAICache(
  nodes: AnalysisResult['graph']['nodes'],
  directoryGraph: ReturnType<typeof aggregateByDirectory>,
  endpointGraph: ReturnType<typeof detectEndpoints>,
  cache: PersistentAICache,
): void {
  // Merge method summaries into function nodes.
  // Key prefix "method:" — match any provider/promptVersion suffix.
  for (const node of nodes) {
    const entry = findEntryByPrefix(cache, `method:${node.id}:`);
    if (entry && typeof entry.result === 'string') {
      node.metadata.aiSummary = entry.result;
    }
  }

  // Merge directory summaries.
  if (directoryGraph) {
    for (const dirNode of directoryGraph.nodes) {
      const entry = findEntryByPrefix(cache, `directory:${dirNode.id}:`);
      if (entry && entry.result !== null && typeof entry.result === 'object') {
        const dirSummary = entry.result as DirectorySummary;
        (dirNode as unknown as Record<string, unknown>).aiSummary = dirSummary.oneLineSummary;
        (dirNode as unknown as Record<string, unknown>).directoryRole = dirSummary.role;
      }
    }
  }

  // Merge endpoint descriptions + step details.
  if (endpointGraph) {
    for (const endpoint of endpointGraph.endpoints) {
      const descEntry = findEntryByPrefix(cache, `endpoint-desc:${endpoint.id}:`);
      if (descEntry && typeof descEntry.result === 'string') {
        endpoint.description = descEntry.result;
      }
    }
    for (const chain of endpointGraph.chains) {
      const stepsEntry = findEntryByPrefix(cache, `endpoint-steps:${chain.endpointId}:`);
      if (stepsEntry && Array.isArray(stepsEntry.result)) {
        const details = stepsEntry.result as StepDetail[];
        for (const detail of details) {
          const step = chain.steps[detail.stepIndex];
          if (step) {
            step.description = detail.description;
            if (detail.input) step.input = detail.input;
            if (detail.output) step.output = detail.output;
            if (detail.transform) step.transform = detail.transform;
          }
        }
      }
    }
  }
}

/**
 * Find the most recently created cache entry whose key starts with the given prefix.
 * Returns null when no matching entry exists.
 */
function findEntryByPrefix(cache: PersistentAICache, prefix: string): AICacheEntry | null {
  const matches = cache
    .getAllEntries()
    .filter((e) => e.key.startsWith(prefix))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return matches[0] ?? null;
}

/**
 * Sprint 19 T9: Parse YAML frontmatter from .md content.
 * Handles only simple key: value pairs (no nested structures or arrays).
 * Does NOT add a heavy dependency — manual parsing only.
 */
function parseFrontmatter(content: string): Record<string, unknown> {
  const match = /^---\n([\s\S]*?)\n---/.exec(content);
  if (!match) return {};

  const result: Record<string, unknown> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    if (!key) continue;
    let value: unknown = line.slice(colonIdx + 1).trim();
    // Remove surrounding quotes from string values
    if (
      typeof value === 'string' &&
      value.startsWith('"') &&
      value.endsWith('"') &&
      value.length >= 2
    ) {
      value = value.slice(1, -1);
    }
    // Coerce boolean literals
    if (value === 'true') value = true;
    if (value === 'false') value = false;
    result[key] = value;
  }
  return result;
}

/** Shared handler for analysis read errors. Returns true if reply was sent. */
async function handleAnalysisError(
  err: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reply: { code: (n: number) => any; send: (body: unknown) => any },
): Promise<boolean> {
  const code = (err as NodeJS.ErrnoException).code;
  if (code === 'ENOENT') {
    await reply.code(503).send({
      error: 'analysis_not_ready',
      message: 'Analysis has not been run yet. Execute `codeatlas analyze` first.',
    });
    return true;
  }
  if (code === 'EPARSE') {
    await reply.code(500).send({
      error: 'analysis_corrupt',
      message: 'analysis.json is malformed. Re-run `codeatlas analyze`.',
    });
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function startServer(options: ServerOptions): Promise<void> {
  const { port, analysisPath, staticDir, ollamaModel } = options;

  // Mutable AI state — updated at runtime via POST /api/ai/configure
  let currentAiProvider: string = options.aiProvider ?? 'disabled';
  let currentAiKey: string | undefined = options.aiKey;
  let currentOllamaModel: string = ollamaModel ?? 'gemma3:4b';
  // T7: Track whether Web UI has explicitly configured an AI provider via
  // POST /api/ai/configure. When true, project .codeatlas.json settings do
  // NOT override the Web-configured values.
  let aiConfiguredByWeb = false;

  // Sprint 20: Mutable server mode state
  let serverMode: ServerMode = options.mode ?? 'ready';
  // currentProjectPath is the project being served (may differ from options.analysisPath
  // when the user changes project via POST /api/project/analyze in idle mode).
  let currentProjectPath: string | undefined =
    serverMode === 'idle' ? undefined : path.dirname(path.dirname(analysisPath));
  // Mutable analysisPath — updated when user triggers a new analysis
  let currentAnalysisPath: string = analysisPath;

  // Try to read provider/model from .codeatlas.json (overrides CLI defaults)
  try {
    const configPath = path.join(path.dirname(analysisPath), '..', '.codeatlas.json');
    const configRaw = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configRaw) as Record<string, unknown>;
    if (typeof config.aiProvider === 'string') currentAiProvider = config.aiProvider;
    if (typeof config.aiApiKey === 'string') currentAiKey = config.aiApiKey;
    if (typeof config.ollamaModel === 'string') currentOllamaModel = config.ollamaModel;
  } catch {
    // No config file or corrupted — use CLI defaults
  }

  // Derive cache directory from analysisPath (sibling of analysis.json).
  // getCacheDir() reads currentAnalysisPath so it follows project switches.
  function getCacheDir(): string {
    return path.join(path.dirname(currentAnalysisPath), 'cache');
  }
  const cacheDir = getCacheDir();

  // Sprint 16: Initialize persistent AI cache and load from disk.
  // The pipeline is no longer started automatically at startup — the Job
  // Manager (T1) triggers individual phases on demand.
  const aiCache = new PersistentAICache(
    path.join(cacheDir, 'ai-results.json'),
  );
  aiCache.loadFromDisk();

  // Sprint 16 T1: Job Manager for on-demand AI analysis
  const aiJobManager = new AIJobManager(
    aiCache,
    () => {
      const provider = createProvider(
        currentAiProvider,
        currentAiKey,
        currentAiProvider === 'ollama' ? { ollamaModel: currentOllamaModel } : undefined,
      );
      return isAnalysisProvider(provider) ? (provider as unknown as import('@codeatlas/core').AIAnalysisProvider) : null;
    },
    () => readAnalysis(currentAnalysisPath),
  );

  const fastify = Fastify({
    logger: false,
    bodyLimit: 1_048_576,          // 1 MB max request body
    requestTimeout: 30_000,        // 30s request timeout
    connectionTimeout: 60_000,     // 60s connection timeout
  });

  // ---- Static files (packages/web/) ----------------------------------------
  await fastify.register(fastifyStatic, {
    root: staticDir,
    prefix: '/',
  });

  // ---- GET /api/health -------------------------------------------------------
  fastify.get('/api/health', async (_req, reply) => {
    await reply.send({ status: 'ok', version: '0.1.0' });
  });

  // ---- GET /api/graph --------------------------------------------------------
  fastify.get<{ Querystring: { include?: string } }>('/api/graph', async (req, reply) => {
    let analysis: AnalysisResult;
    try {
      analysis = await readAnalysis(currentAnalysisPath);
    } catch (err) {
      if (await handleAnalysisError(err, reply)) return;
      throw err;
    }

    // Sprint 7: filter function/class nodes and call edges unless ?include=functions
    const includeFunctions = (req.query.include ?? '').split(',').includes('functions');
    if (!includeFunctions) {
      const filteredNodes = analysis.graph.nodes.filter(
        (n) => n.metadata?.parentFileId === undefined,
      );
      const filteredEdges = analysis.graph.edges.filter(
        (e) => e.type !== 'call',
      );

      // Sprint 12 / T2: compute directory-level graph from filtered nodes/edges
      const directoryGraph = aggregateByDirectory(filteredNodes, filteredEdges);

      // Sprint 13 / T2: detect API endpoints and build request-chain graph
      const endpointGraph = detectEndpoints(analysis);

      // Sprint 15.1: Merge AI cache into response
      mergeAICache(filteredNodes, directoryGraph, endpointGraph, aiCache);

      await reply.send({
        ...analysis,
        graph: { nodes: filteredNodes, edges: filteredEdges },
        directoryGraph,
        endpointGraph: endpointGraph ?? null,
      });
      return;
    }

    // Sprint 12 / T2: compute directory graph for full (functions-included) response too
    const directoryGraph = aggregateByDirectory(
      analysis.graph.nodes,
      analysis.graph.edges,
    );

    // Sprint 13 / T2: detect API endpoints and build request-chain graph
    const endpointGraph = detectEndpoints(analysis);

    // Sprint 15.1: Merge AI cache into response
    mergeAICache(analysis.graph.nodes, directoryGraph, endpointGraph, aiCache);

    await reply.send({ ...analysis, directoryGraph, endpointGraph: endpointGraph ?? null });
  });

  // ---- GET /api/graph/stats --------------------------------------------------
  fastify.get('/api/graph/stats', async (_req, reply) => {
    let analysis: AnalysisResult;
    try {
      analysis = await readAnalysis(currentAnalysisPath);
    } catch (err) {
      if (await handleAnalysisError(err, reply)) return;
      throw err;
    }
    await reply.send(analysis.stats);
  });

  // ---- GET /api/graph/functions/:fileId --------------------------------------
  // Sprint 7: return function/class nodes and call edges for a specific file
  fastify.get<{ Params: { fileId: string } }>('/api/graph/functions/:fileId', async (req, reply) => {
    const fileId = decodeURIComponent(req.params.fileId);

    if (!fileId || fileId.includes('..')) {
      await reply.code(400).send({
        error: 'invalid_file_id',
        message: 'File ID contains invalid characters.',
      });
      return;
    }

    let analysis: AnalysisResult;
    try {
      analysis = await readAnalysis(currentAnalysisPath);
    } catch (err) {
      if (await handleAnalysisError(err, reply)) return;
      throw err;
    }

    // Check that the file node exists
    const fileNode = analysis.graph.nodes.find(
      (n) => n.id === fileId && n.type === 'file',
    );
    if (!fileNode) {
      await reply.code(404).send({
        error: 'file_not_found',
        message: `File node not found: ${fileId}`,
      });
      return;
    }

    // Filter function/class nodes belonging to this file
    const nodes = analysis.graph.nodes.filter(
      (n) => n.metadata?.parentFileId === fileId,
    );

    // Filter call edges related to this file's functions
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = analysis.graph.edges.filter(
      (e) => e.type === 'call' && (nodeIds.has(e.source) || nodeIds.has(e.target)),
    );

    await reply.send({ fileId, nodes, edges });
  });

  // ---- GET /api/node/:id -----------------------------------------------------
  fastify.get<{ Params: { id: string } }>('/api/node/:id', async (req, reply) => {
    const nodeId = decodeURIComponent(req.params.id);

    // Reject path traversal attempts
    if (!nodeId || nodeId.includes('..')) {
      await reply.code(400).send({
        error: 'invalid_node_id',
        message: 'Node ID contains invalid characters.',
      });
      return;
    }

    let analysis: AnalysisResult;
    try {
      analysis = await readAnalysis(currentAnalysisPath);
    } catch (err) {
      if (await handleAnalysisError(err, reply)) return;
      throw err;
    }

    const node = analysis.graph.nodes.find((n) => n.id === nodeId);
    if (!node) {
      await reply.code(404).send({
        error: 'node_not_found',
        message: `No node found with id "${nodeId}".`,
      });
      return;
    }

    // Edges where this node is source or target
    const edges = analysis.graph.edges.filter(
      (e) => e.source === nodeId || e.target === nodeId,
    );

    // Read source code for file nodes; directories have no source
    let sourceCode: string | null = null;
    if (node.type === 'file' || node.type === 'function' || node.type === 'class') {
      const absoluteFilePath = path.join(analysis.projectPath, node.filePath);
      try {
        sourceCode = await fs.readFile(absoluteFilePath, 'utf-8');
      } catch {
        // File may have been deleted since analysis — return null rather than crashing
        sourceCode = null;
      }
    }

    await reply.send({ node, edges, sourceCode });
  });

  // ---- GET /api/ai/status ----------------------------------------------------
  // Sprint 16: Removed analysisStatus/progress/completedPhases — now owned by
  // the Job Manager (T1). Added cacheSize for UI display.
  fastify.get('/api/ai/status', async (_req, reply) => {
    const provider = createProvider(
      currentAiProvider,
      currentAiKey,
      currentAiProvider === 'ollama' ? { ollamaModel: currentOllamaModel } : undefined,
    );

    const mode: 'local' | 'cloud' | 'disabled' =
      currentAiProvider === 'ollama' || currentAiProvider === 'claude-code' ? 'local'
      : currentAiProvider === 'disabled' || currentAiProvider === undefined ? 'disabled'
      : 'cloud';

    const privacyLevel: 'full' | 'partial' | 'none' =
      mode === 'local' ? 'full'
      : mode === 'disabled' ? 'none'
      : 'partial';

    const model: string | null =
      currentAiProvider === 'ollama' ? (currentOllamaModel) : null;

    await reply.send({
      enabled: provider.isConfigured(),
      provider: currentAiProvider,
      mode,
      privacyLevel,
      model,
      // Sprint 16: cacheSize replaces pipeline progress tracking
      cacheSize: aiCache.size,
      // Sprint 16 T1: job metrics
      metrics: aiJobManager.getMetrics(),
    });
  });

  // ---- POST /api/ai/summary --------------------------------------------------
  fastify.post<{ Body: { nodeId: string; provider?: string } }>('/api/ai/summary', async (req, reply) => {
    const { nodeId, provider: bodyProvider } = req.body ?? {};
    if (!nodeId) {
      await reply.code(400).send({
        error: 'invalid_request',
        message: 'Request body must include "nodeId".',
      });
      return;
    }

    // Use server-configured provider, fallback to body-specified provider
    const providerName = currentAiProvider !== 'disabled' ? currentAiProvider : (bodyProvider ?? 'disabled');

    let analysis: AnalysisResult;
    try {
      analysis = await readAnalysis(currentAnalysisPath);
    } catch (err) {
      if (await handleAnalysisError(err, reply)) return;
      throw err;
    }

    const node = analysis.graph.nodes.find((n) => n.id === nodeId);
    if (!node) {
      await reply.code(404).send({
        error: 'node_not_found',
        message: `No node found with id "${nodeId}".`,
      });
      return;
    }

    const summaryProvider = createProvider(
      providerName,
      currentAiKey,
      providerName === 'ollama' ? { ollamaModel: currentOllamaModel } : undefined,
    );
    if (!summaryProvider.isConfigured()) {
      await reply.code(400).send({
        error: 'ai_not_configured',
        message: 'No API key configured. Set in .codeatlas.json or use --ai-key flag.',
      });
      return;
    }

    // --- Check cache first ---
    const cached = await getCachedSummary(cacheDir, nodeId, providerName);
    if (cached) {
      await reply.send({
        nodeId,
        summary: cached.summary,
        provider: providerName,
        cached: true,
      });
      return;
    }

    // Read source code for context
    let sourceCode = '';
    if (node.type === 'file') {
      const absoluteFilePath = path.join(analysis.projectPath, node.filePath);
      try {
        sourceCode = await fs.readFile(absoluteFilePath, 'utf-8');
      } catch {
        sourceCode = '';
      }
    }

    // Gather import/export context
    const relatedEdges = analysis.graph.edges.filter(
      (e) => e.source === nodeId || e.target === nodeId,
    );
    const imports = relatedEdges.filter((e) => e.source === nodeId).map((e) => e.target);
    const exports = relatedEdges.filter((e) => e.target === nodeId).map((e) => e.source);

    try {
      const summary = await summaryProvider.summarize(sourceCode, {
        filePath: node.filePath,
        language: node.metadata.language ?? 'javascript',
        imports,
        exports,
      });

      // --- Write to cache (non-blocking) ---
      void setCachedSummary(cacheDir, nodeId, providerName, summary);

      await reply.send({
        nodeId,
        summary,
        provider: providerName,
        cached: false,
      });
    } catch (err) {
      await reply.code(500).send({
        error: 'ai_error',
        message: err instanceof Error ? err.message : 'AI summarization failed.',
      });
    }
  });

  // ---- POST /api/ai/overview --------------------------------------------------
  fastify.post<{ Body: { provider?: string } }>('/api/ai/overview', async (req, reply) => {
    const { provider: bodyProvider } = req.body ?? {};

    // Use server-configured provider, fallback to body-specified provider
    const providerName = currentAiProvider !== 'disabled' ? currentAiProvider : (bodyProvider ?? 'disabled');

    const overviewProvider = createProvider(
      providerName,
      currentAiKey,
      providerName === 'ollama' ? { ollamaModel: currentOllamaModel } : undefined,
    );
    if (!overviewProvider.isConfigured()) {
      await reply.code(400).send({
        error: 'ai_not_configured',
        message: 'No AI provider configured. Set in .codeatlas.json or use --ai-key flag.',
      });
      return;
    }

    let analysis: AnalysisResult;
    try {
      analysis = await readAnalysis(currentAnalysisPath);
    } catch (err) {
      if (await handleAnalysisError(err, reply)) return;
      throw err;
    }

    // --- Check cache (key = "overview:{provider}") ---
    const cacheKey = 'overview';
    const cached = await getCachedSummary(cacheDir, cacheKey, providerName);
    if (cached) {
      // Re-extract structure info for response (cheap operation)
      const structureInfo = extractStructureInfo(analysis);
      await reply.send({
        overview: cached.summary,
        provider: providerName,
        cached: true,
        structureInfo: {
          totalFiles: structureInfo.totalFiles,
          totalFunctions: structureInfo.totalFunctions,
          topModules: structureInfo.topModules.map((m) => ({
            path: m.path,
            dependencyCount: m.dependencyCount,
          })),
        },
      });
      return;
    }

    // --- Extract structure + build prompt ---
    const structureInfo = extractStructureInfo(analysis);
    const prompt = buildOverviewPrompt(structureInfo);

    try {
      // Reuse summarize() — the prompt is the "code" and context is minimal
      const overview = await overviewProvider.summarize(prompt, {
        filePath: 'project-overview',
        language: 'text',
        imports: [],
        exports: [],
      });

      // --- Write to cache (non-blocking) ---
      void setCachedSummary(cacheDir, cacheKey, providerName, overview);

      await reply.send({
        overview,
        provider: providerName,
        cached: false,
        structureInfo: {
          totalFiles: structureInfo.totalFiles,
          totalFunctions: structureInfo.totalFunctions,
          topModules: structureInfo.topModules.map((m) => ({
            path: m.path,
            dependencyCount: m.dependencyCount,
          })),
        },
      });
    } catch (err) {
      await reply.code(500).send({
        error: 'ai_overview_failed',
        message: err instanceof Error ? err.message : 'AI overview generation failed.',
      });
    }
  });

  // ---- POST /api/ai/search-keywords ------------------------------------------
  fastify.post<{ Body: { query: string; provider?: string } }>('/api/ai/search-keywords', async (req, reply) => {
    const { query, provider: bodyProvider } = req.body ?? {};

    if (!query || typeof query !== 'string') {
      await reply.code(400).send({
        error: 'invalid_request',
        message: 'Request body must include "query".',
      });
      return;
    }

    // Use server-configured provider, fallback to body-specified provider
    const providerName = currentAiProvider !== 'disabled' ? currentAiProvider : (bodyProvider ?? 'disabled');

    const searchProvider = createProvider(
      providerName,
      currentAiKey,
      providerName === 'ollama' ? { ollamaModel: currentOllamaModel } : undefined,
    );
    if (!searchProvider.isConfigured()) {
      await reply.code(400).send({
        error: 'ai_not_configured',
        message: 'No AI provider configured. Set in .codeatlas.json or use --ai-key flag.',
      });
      return;
    }

    const prompt = `Extract code-relevant keywords from the following natural language query.
Return ONLY a JSON array of strings (max 10 keywords).
Keywords should include: file names, function names, module names, technical concepts.

Query: "${query}"

Response format: ["keyword1", "keyword2", ...]`;

    try {
      const aiResponse = await searchProvider.summarize(prompt, {
        filePath: 'search-keywords',
        language: 'text',
        imports: [],
        exports: [],
      });

      let keywords: string[];
      try {
        // Try to extract JSON array from AI response using regex
        const match = /\[.*\]/s.exec(aiResponse);
        if (match) {
          keywords = JSON.parse(match[0]) as string[];
        } else {
          keywords = JSON.parse(aiResponse) as string[];
        }
        // Ensure result is an array of strings
        if (!Array.isArray(keywords)) {
          throw new Error('Parsed value is not an array');
        }
        keywords = keywords.filter((k) => typeof k === 'string').slice(0, 10);
      } catch {
        // Fallback: split query by whitespace
        keywords = query.split(/\s+/).filter((k) => k.length > 0);
      }

      await reply.send({ keywords, originalQuery: query });
    } catch (err) {
      await reply.code(500).send({
        error: 'ai_search_keywords_failed',
        message: err instanceof Error ? err.message : 'AI keyword extraction failed.',
      });
    }
  });

  // ---- POST /api/ai/configure ------------------------------------------------
  // Sprint 16 T2: Immediately switch AI provider; persist to .codeatlas.json
  fastify.post('/api/ai/configure', async (request, reply) => {
    const body = request.body as { provider?: string; apiKey?: string } | null;

    if (!body?.provider) {
      return reply.status(400).send({ ok: false, message: 'Missing provider field' });
    }

    const validProviders = ['openai', 'anthropic', 'ollama', 'claude-code', 'gemini', 'disabled'];
    if (!validProviders.includes(body.provider)) {
      return reply.status(400).send({ ok: false, message: `Invalid provider: ${body.provider}` });
    }

    // Update mutable state — takes effect immediately for subsequent requests
    currentAiProvider = body.provider;
    if (body.apiKey !== undefined) {
      currentAiKey = body.apiKey;
    }
    // T7: Mark that Web UI has explicitly configured AI — project .codeatlas.json
    // will no longer override these settings on subsequent project switches.
    aiConfiguredByWeb = true;

    // Persist to .codeatlas.json in the target directory (best-effort)
    let persisted = false;
    try {
      const configPath = path.join(path.dirname(currentAnalysisPath), '..', '.codeatlas.json');
      let config: Record<string, unknown> = {};
      try {
        const existing = readFileSync(configPath, 'utf-8');
        config = JSON.parse(existing) as Record<string, unknown>;
      } catch {
        // File doesn't exist or is corrupted — start fresh
      }
      config.aiProvider = body.provider;
      if (body.apiKey !== undefined) {
        config.aiApiKey = body.apiKey;
      }
      writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      persisted = true;
    } catch (err) {
      console.warn(
        '[configure] Failed to persist to .codeatlas.json:',
        err instanceof Error ? err.message : String(err),
      );
    }

    return reply.send({
      ok: true,
      provider: currentAiProvider,
      persisted,
      message: persisted ? '設定已儲存' : '設定已套用（本次有效），無法寫入設定檔',
    });
  });

  // ---- POST /api/ai/test-connection -------------------------------------------
  // Sprint 15 T9: Real connection test for Settings UI
  fastify.post<{ Body: { provider?: string; apiKey?: string } }>('/api/ai/test-connection', async (req, reply) => {
    const { provider: reqProvider, apiKey: reqKey } = req.body ?? {};
    const testProvider = reqProvider ?? currentAiProvider;
    const testKey = reqKey ?? currentAiKey;

    // Disabled → always OK
    if (testProvider === 'disabled') {
      await reply.send({ ok: true, provider: testProvider, message: '已停用' });
      return;
    }

    try {
      if (testProvider === 'claude-code') {
        // Test: can we find the claude binary?
        const cmd = process.platform === 'win32' ? 'where' : 'which';
        const { execFile: execFileCb } = await import('node:child_process');
        const { promisify } = await import('node:util');
        const execFileP = promisify(execFileCb);
        const { stdout } = await execFileP(cmd, ['claude'], { timeout: 5_000 });
        const binaryPath = stdout.trim().split(/\r?\n/)[0];
        if (!binaryPath) throw new Error('claude binary not found');
        await reply.send({ ok: true, provider: testProvider, message: `CLI found: ${binaryPath}` });
        return;
      }

      if (testProvider === 'ollama') {
        // Test: ping Ollama API
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5_000);
        try {
          const res = await fetch('http://localhost:11434/api/tags', { signal: controller.signal });
          clearTimeout(timeoutId);
          if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
          await reply.send({ ok: true, provider: testProvider, message: 'Ollama 服務運行中' });
        } catch (err) {
          clearTimeout(timeoutId);
          const msg = err instanceof DOMException && err.name === 'AbortError'
            ? 'Ollama 連線逾時'
            : 'Ollama 服務未運行，請確認 http://localhost:11434';
          throw new Error(msg);
        }
        return;
      }

      // Cloud providers: gemini / openai / anthropic — validate key exists
      if (!testKey) {
        throw new Error('API Key 未提供');
      }

      // Quick validation call per provider
      if (testProvider === 'gemini') {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5_000);
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${testKey}`,
            { signal: controller.signal },
          );
          clearTimeout(timeoutId);
          if (res.status === 401 || res.status === 403) throw new Error('API Key 無效');
          if (!res.ok) throw new Error(`Gemini API 回傳 ${res.status}`);
          await reply.send({ ok: true, provider: testProvider, message: 'Gemini API 連線成功' });
        } catch (err) {
          clearTimeout(timeoutId);
          if (err instanceof Error) throw err;
          throw new Error('Gemini API 連線失敗');
        }
        return;
      }

      if (testProvider === 'openai') {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5_000);
        try {
          const res = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${testKey}` },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (res.status === 401) throw new Error('API Key 無效');
          if (!res.ok) throw new Error(`OpenAI API 回傳 ${res.status}`);
          await reply.send({ ok: true, provider: testProvider, message: 'OpenAI API 連線成功' });
        } catch (err) {
          clearTimeout(timeoutId);
          if (err instanceof Error) throw err;
          throw new Error('OpenAI API 連線失敗');
        }
        return;
      }

      if (testProvider === 'anthropic') {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5_000);
        try {
          // Anthropic doesn't have a simple list endpoint; use a minimal messages call
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': testKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              max_tokens: 1,
              messages: [{ role: 'user', content: 'hi' }],
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (res.status === 401) throw new Error('API Key 無效');
          // Any non-401 response means the key is valid (even 400/429)
          await reply.send({ ok: true, provider: testProvider, message: 'Anthropic API 連線成功' });
        } catch (err) {
          clearTimeout(timeoutId);
          if (err instanceof Error) throw err;
          throw new Error('Anthropic API 連線失敗');
        }
        return;
      }

      throw new Error(`不支援的 Provider: ${testProvider}`);
    } catch (err) {
      await reply.code(400).send({
        ok: false,
        provider: testProvider,
        message: err instanceof Error ? err.message : '連線測試失敗',
      });
    }
  });

  // ---- POST /api/ai/analyze --------------------------------------------------
  // Sprint 16 T1: Create and fire-and-forget an AI analysis job.
  fastify.post('/api/ai/analyze', async (request, reply) => {
    const body = request.body as { scope?: string; target?: string; force?: boolean } | null;

    if (!body?.scope) {
      return reply.status(400).send({ ok: false, message: 'Missing scope field' });
    }

    const validScopes = ['directory', 'method', 'method-group', 'endpoint', 'all', 'core'];
    if (!validScopes.includes(body.scope)) {
      return reply.status(400).send({ ok: false, message: `Invalid scope: ${body.scope}` });
    }

    const job = aiJobManager.createJob(
      body.scope as import('./ai-job-manager.js').AIJobScope,
      body.target,
      body.force ?? false,
    );

    // Fire-and-forget: run in background unless result was already cached
    if (job.status !== 'cached') {
      void aiJobManager.runJob(job.jobId);
    }

    return reply.send({ ok: true, job });
  });

  // ---- GET /api/ai/jobs/:jobId -----------------------------------------------
  // Sprint 16 T1: Poll the status of a specific AI analysis job.
  fastify.get<{ Params: { jobId: string } }>('/api/ai/jobs/:jobId', async (request, reply) => {
    const { jobId } = request.params;
    const job = aiJobManager.getJob(jobId);
    if (!job) {
      return reply.status(404).send({ ok: false, message: 'Job not found' });
    }
    return reply.send({ ok: true, job });
  });

  // ---- GET /api/wiki ---------------------------------------------------------
  // Sprint 19 T9: Returns the wiki manifest or not_generated status.
  fastify.get('/api/wiki', async (_req, reply) => {
    const wikiDir = path.join(path.dirname(currentAnalysisPath), 'wiki');
    const manifestPath = path.join(wikiDir, 'wiki-manifest.json');

    let raw: string;
    try {
      raw = await fs.readFile(manifestPath, 'utf-8');
    } catch {
      return reply.send({
        status: 'not_generated',
        message: "Wiki has not been generated. Run 'codeatlas wiki' first.",
      });
    }

    try {
      const manifest = JSON.parse(raw) as Record<string, unknown>;
      return reply.send(manifest);
    } catch {
      return reply.code(500).send({
        error: 'wiki_manifest_corrupt',
        message: 'wiki-manifest.json is malformed. Re-run `codeatlas wiki`.',
      });
    }
  });

  // ---- GET /api/wiki/page/:slug -----------------------------------------------
  // Sprint 19 T9: Returns single page .md content (lazy load).
  fastify.get<{ Params: { slug: string } }>('/api/wiki/page/:slug', async (request, reply) => {
    const { slug } = request.params;

    // Reject path traversal attempts
    if (!slug || slug.includes('..') || slug.includes('/') || slug.includes('\\')) {
      return reply.code(400).send({
        error: 'invalid_slug',
        message: 'Slug contains invalid characters.',
      });
    }

    const wikiDir = path.join(path.dirname(currentAnalysisPath), 'wiki');
    const manifestPath = path.join(wikiDir, 'wiki-manifest.json');

    let manifestRaw: string;
    try {
      manifestRaw = await fs.readFile(manifestPath, 'utf-8');
    } catch {
      return reply.code(404).send({
        error: 'wiki_not_generated',
        message: "Wiki has not been generated. Run 'codeatlas wiki' first.",
      });
    }

    let manifest: { pages?: Array<{ slug: string; mdPath: string }> };
    try {
      manifest = JSON.parse(manifestRaw) as { pages?: Array<{ slug: string; mdPath: string }> };
    } catch {
      return reply.code(500).send({
        error: 'wiki_manifest_corrupt',
        message: 'wiki-manifest.json is malformed. Re-run `codeatlas wiki`.',
      });
    }

    const page = manifest.pages?.find((p) => p.slug === slug);
    if (!page) {
      return reply.code(404).send({
        error: 'page_not_found',
        message: `Wiki page not found: ${slug}`,
        slug,
      });
    }

    // Resolve the .md file path relative to wikiDir and guard against traversal
    const resolvedMdPath = path.resolve(wikiDir, page.mdPath);
    if (!resolvedMdPath.startsWith(path.resolve(wikiDir))) {
      return reply.code(400).send({
        error: 'invalid_md_path',
        message: 'Page path escapes the wiki directory.',
        slug,
      });
    }

    let content: string;
    try {
      content = await fs.readFile(resolvedMdPath, 'utf-8');
    } catch {
      return reply.code(404).send({
        error: 'page_file_not_found',
        message: `Wiki page file not found on disk: ${page.mdPath}`,
        slug,
      });
    }

    const frontmatter = parseFrontmatter(content);
    return reply.send({ slug, content, frontmatter });
  });

  // ---- POST /api/wiki/analyze ------------------------------------------------
  // Sprint 19 T10: Create an async AI analysis job for a wiki page.
  // Returns { jobId } immediately; client polls GET /api/ai/jobs/:jobId.
  fastify.post<{ Body: { slug?: string } }>('/api/wiki/analyze', async (request, reply) => {
    const body = request.body as { slug?: string } | null;

    const slug = body?.slug;

    if (!slug || typeof slug !== 'string') {
      return reply.code(400).send({
        error: 'invalid_request',
        message: 'Request body must include "slug".',
      });
    }

    // Reject path traversal in slug
    if (slug.includes('..') || slug.includes('/') || slug.includes('\\')) {
      return reply.code(400).send({
        error: 'invalid_slug',
        message: 'Slug contains invalid characters.',
      });
    }

    // Check AI provider is available
    const wikiProvider = createProvider(
      currentAiProvider,
      currentAiKey,
      currentAiProvider === 'ollama' ? { ollamaModel: currentOllamaModel } : undefined,
    );
    if (!wikiProvider.isConfigured()) {
      return reply.code(400).send({
        error: 'ai_not_configured',
        message: 'AI provider is disabled or not configured. Configure a provider first.',
      });
    }

    // Locate the wiki manifest
    const wikiDir = path.join(path.dirname(currentAnalysisPath), 'wiki');
    const manifestPath = path.join(wikiDir, 'wiki-manifest.json');

    let manifest: WikiManifest;
    let manifestRaw: string;
    try {
      manifestRaw = await fs.readFile(manifestPath, 'utf-8');
    } catch {
      return reply.code(404).send({
        error: 'wiki_not_generated',
        message: "Wiki has not been generated. Run 'codeatlas wiki' first.",
      });
    }
    try {
      manifest = JSON.parse(manifestRaw) as WikiManifest;
    } catch {
      return reply.code(500).send({
        error: 'wiki_manifest_corrupt',
        message: 'wiki-manifest.json is malformed. Re-run `codeatlas wiki`.',
      });
    }

    // Find the page in the manifest
    const page = manifest.pages?.find((p: WikiPageMeta) => p.slug === slug);
    if (!page) {
      return reply.code(404).send({
        error: 'page_not_found',
        message: `Wiki page not found in manifest: ${slug}`,
        slug,
      });
    }

    // Find the full WikiNode (needed for concept deep analysis)
    const wikiNode = manifest.nodes?.find((n: WikiNode) => n.slug === slug);
    if (!wikiNode) {
      return reply.code(404).send({
        error: 'node_not_found',
        message: `Wiki node not found in manifest: ${slug}`,
        slug,
      });
    }

    // Resolve the .md file path and guard against traversal
    const resolvedMdPath = path.resolve(wikiDir, page.mdPath);
    if (!resolvedMdPath.startsWith(path.resolve(wikiDir))) {
      return reply.code(400).send({
        error: 'invalid_md_path',
        message: 'Page path escapes the wiki directory.',
        slug,
      });
    }

    // Create a wiki job via AIJobManager for state tracking.
    // AIJobScope does not include 'wiki' — use 'directory' scope with a
    // prefixed target ("wiki:{slug}") to distinguish wiki jobs from regular ones.
    // The job object returned by createJob() is the same reference stored in the
    // manager's internal map, so status mutations on it are visible to getJob().

    // Deduplication: if a wiki job for this slug is already running or queued,
    // return its existing jobId so the client continues polling.
    const existingJob = aiJobManager
      .getAllJobs()
      .find(
        (j) =>
          j.target === `wiki:${slug}` &&
          (j.status === 'running' || j.status === 'queued'),
      );
    if (existingJob) {
      return reply.send({ jobId: existingJob.jobId });
    }

    // Create a new queued job. force=true bypasses the cache-hit check since
    // wiki jobs do not use the standard AI analysis cache.
    const job = aiJobManager.createJob('directory', `wiki:${slug}`, true);
    const jobId = job.jobId;

    // Fire-and-forget: run wiki AI analysis in background
    void (async () => {
      job.status = 'running';
      job.startedAt = new Date().toISOString();

      // Read current .md content
      let currentContent: string;
      try {
        currentContent = await fs.readFile(resolvedMdPath, 'utf-8');
      } catch (err) {
        job.status = 'failed';
        job.completedAt = new Date().toISOString();
        job.error = `Failed to read wiki page file: ${err instanceof Error ? err.message : String(err)}`;
        return;
      }

      // Read source files referenced by this concept
      const sourceCode: Array<{ path: string; content: string }> = [];
      const projectRoot = path.dirname(path.dirname(currentAnalysisPath)); // .codeatlas is one level deep
      for (const srcFile of wikiNode.sourceFiles ?? []) {
        try {
          const absPath = path.resolve(projectRoot, srcFile);
          const content = await fs.readFile(absPath, 'utf-8');
          // Truncate individual files to ~4000 chars to fit token budget
          sourceCode.push({ path: srcFile, content: content.slice(0, 4000) });
        } catch {
          // File not found — skip silently
        }
      }

      // Build concept deep analysis prompt
      const concept = {
        name: wikiNode.displayName,
        type: wikiNode.type,
        summary: wikiNode.summary ?? '',
        sourceFiles: wikiNode.sourceFiles ?? [],
      };
      const prompt = buildConceptDeepAnalysisPrompt(concept, sourceCode);

      // Call AI
      let rawAiResponse: string;
      try {
        rawAiResponse = await wikiProvider.rawPrompt(prompt);
      } catch (err) {
        job.status = 'failed';
        job.completedAt = new Date().toISOString();
        job.error = `AI provider error: ${err instanceof Error ? err.message : String(err)}`;
        return;
      }

      // Parse response
      const deepContent = parseConceptDeepAnalysisResponse(rawAiResponse);
      if (!deepContent) {
        job.status = 'failed';
        job.completedAt = new Date().toISOString();
        job.error = 'AI returned an empty or unparseable response.';
        return;
      }

      // Replace "## 詳細說明" section in the .md file.
      // Match from "## 詳細說明" up to the next "## " header or end of string.
      // Note: \z is not valid in JS regex — use $ with the m flag for line-end,
      // but here we need end-of-string, so we use a two-pass approach.
      const detailHeader = '## 詳細說明';
      const detailRegex = /^## 詳細說明[ \t]*\n[\s\S]*?(?=\n## )/m;
      const detailRegexEnd = /^## 詳細說明[ \t]*\n[\s\S]*$/m;
      let updatedContent: string;

      if (detailRegex.test(currentContent)) {
        // "詳細說明" is followed by another ## section — replace up to it
        updatedContent = currentContent.replace(detailRegex, `${detailHeader}\n\n${deepContent}\n`);
      } else if (detailRegexEnd.test(currentContent)) {
        // "詳細說明" is the last section — replace to end of file
        updatedContent = currentContent.replace(detailRegexEnd, `${detailHeader}\n\n${deepContent}\n`);
      } else {
        // No "## 詳細說明" section at all — append after existing content
        updatedContent = `${currentContent.trimEnd()}\n\n${detailHeader}\n\n${deepContent}\n`;
      }

      try {
        await fs.writeFile(resolvedMdPath, updatedContent, 'utf-8');
      } catch (err) {
        job.status = 'failed';
        job.completedAt = new Date().toISOString();
        job.error = `Failed to write updated wiki page: ${err instanceof Error ? err.message : String(err)}`;
        return;
      }

      // Update wiki-manifest.json: set hasAiContent = true for this page
      try {
        const freshManifestRaw = await fs.readFile(manifestPath, 'utf-8');
        let freshManifest: WikiManifest;
        try {
          freshManifest = JSON.parse(freshManifestRaw) as WikiManifest;
        } catch {
          // Manifest corrupted between start and now — skip manifest update
          job.status = 'succeeded';
          job.completedAt = new Date().toISOString();
          job.result = { slug, deepContent, hasAiContent: true };
          return;
        }

        const pageEntry = freshManifest.pages?.find((p: WikiPageMeta) => p.slug === slug);
        if (pageEntry) {
          pageEntry.hasAiContent = true;
        }
        const updatedManifestJson = JSON.stringify(freshManifest, null, 2);
        await fs.writeFile(manifestPath, updatedManifestJson, 'utf-8');
      } catch (err) {
        // Non-fatal: .md was already updated successfully; log and continue
        console.warn(
          `[wiki/analyze] Failed to update manifest hasAiContent for "${slug}":`,
          err instanceof Error ? err.message : String(err),
        );
      }

      // Mark job succeeded
      job.status = 'succeeded';
      job.completedAt = new Date().toISOString();
      job.result = { slug, deepContent, hasAiContent: true };
    })();

    return reply.send({ jobId });
  });

  // ==========================================================================
  // Sprint 20 T5: /api/project/* routes
  // ==========================================================================

  // ---- GET /api/project/status -----------------------------------------------
  fastify.get('/api/project/status', async (_req, reply) => {
    const status: ServerStatus = { mode: serverMode };
    if (currentProjectPath !== undefined) {
      status.currentPath = currentProjectPath;
      status.projectName = path.basename(currentProjectPath);
    }
    await reply.send(status);
  });

  // ---- POST /api/project/validate --------------------------------------------
  fastify.post<{ Body: { path?: string } }>('/api/project/validate', async (req, reply) => {
    const body = req.body ?? {};
    const rawPath = body.path;

    if (typeof rawPath !== 'string' || rawPath.trim().length === 0) {
      return reply.code(400).send({
        error: 'invalid_request',
        message: 'Request body must include a non-empty "path" string.',
      });
    }

    // Guard: path length
    if (rawPath.length > 4096) {
      return reply.send({ valid: false, reason: 'path_too_long' });
    }

    // Guard: path traversal — reject paths containing null bytes or suspicious sequences
    if (rawPath.includes('\0')) {
      return reply.send({ valid: false, reason: 'not_found' });
    }

    let resolvedPath: string;
    try {
      resolvedPath = path.resolve(rawPath);
    } catch {
      return reply.send({ valid: false, reason: 'not_found' });
    }

    // Validate existence and directory
    let stat: Awaited<ReturnType<typeof fs.stat>>;
    try {
      stat = await fs.stat(resolvedPath);
    } catch {
      return reply.send({ valid: false, reason: 'not_found' });
    }

    if (!stat.isDirectory()) {
      return reply.send({ valid: false, reason: 'not_directory' });
    }

    // Validate that source files exist
    let fileCount = 0;
    const languages: string[] = [];
    try {
      const scanResult = await scanDirectory(resolvedPath, {});
      const fileNodes = scanResult.nodes.filter((n) => n.type === 'file');
      fileCount = fileNodes.length;

      const langSet = new Set<string>();
      for (const node of fileNodes) {
        const ext = path.extname(node.filePath).toLowerCase();
        if (ext === '.ts' || ext === '.tsx') langSet.add('typescript');
        else if (ext === '.py' || ext === '.pyw') langSet.add('python');
        else if (ext === '.java') langSet.add('java');
        else if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.cjs') langSet.add('javascript');
      }
      languages.push(...langSet);
    } catch {
      // Scan failure counts as no source files
    }

    if (fileCount === 0) {
      return reply.send({ valid: false, reason: 'no_source_files' });
    }

    return reply.send({
      valid: true,
      stats: { fileCount, languages },
    });
  });

  // ---- POST /api/project/analyze ---------------------------------------------
  fastify.post<{ Body: { path?: string } }>('/api/project/analyze', async (req, reply) => {
    const body = req.body ?? {};
    const rawPath = body.path;

    if (typeof rawPath !== 'string' || rawPath.trim().length === 0) {
      return reply.code(400).send({
        error: 'invalid_request',
        message: 'Request body must include a non-empty "path" string.',
      });
    }

    // Guard: path traversal
    if (rawPath.includes('\0')) {
      return reply.code(400).send({ error: 'invalid_path', message: 'Path contains invalid characters.' });
    }

    let resolvedPath: string;
    try {
      resolvedPath = path.resolve(rawPath);
    } catch {
      return reply.code(400).send({ error: 'invalid_path', message: 'Cannot resolve path.' });
    }

    // Dedup: if server is already ready for the same path, return immediately
    if (serverMode === 'ready' && currentProjectPath === resolvedPath) {
      return reply.code(200).send({ jobId: 'already-ready', status: 'completed' });
    }

    // Dedup: if an analysis job for the same path is already running, return its jobId
    for (const [existingJobId, existingJob] of projectJobs.entries()) {
      const isRunning = existingJob.progress.status !== 'completed' && existingJob.progress.status !== 'failed';
      if (isRunning) {
        return reply.code(202).send({ jobId: existingJobId });
      }
    }

    // Create job state
    const jobId = `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = new Date().toISOString();

    const initialProgress: AnalysisProgress = {
      jobId,
      status: 'queued',
      startedAt,
      stages: {
        scanning: { status: 'pending', progress: 0 },
        parsing: { status: 'pending', progress: 0 },
        building: { status: 'pending', progress: 0 },
      },
    };

    const job: ProjectJob = { progress: initialProgress, listeners: new Set() };
    projectJobs.set(jobId, job);

    // Update server mode
    serverMode = 'analyzing';
    currentProjectPath = resolvedPath;
    const newAnalysisPath = path.join(resolvedPath, '.codeatlas', 'analysis.json');

    // T7: Read project's .codeatlas.json for AI settings, but only if the Web UI
    // has NOT already explicitly configured a provider via POST /api/ai/configure.
    // Priority chain: Web settings > CLI flags > .codeatlas.json > env > defaults
    if (!aiConfiguredByWeb) {
      try {
        const projectConfigPath = path.join(resolvedPath, '.codeatlas.json');
        const projectConfigRaw = readFileSync(projectConfigPath, 'utf-8');
        const projectConfig = JSON.parse(projectConfigRaw) as Record<string, unknown>;
        if (typeof projectConfig.aiProvider === 'string') currentAiProvider = projectConfig.aiProvider;
        if (typeof projectConfig.aiApiKey === 'string') currentAiKey = projectConfig.aiApiKey;
        if (typeof projectConfig.ollamaModel === 'string') currentOllamaModel = projectConfig.ollamaModel;
      } catch {
        // No config file — keep current AI settings
      }
    }

    // Fire-and-forget analysis — update progress and notify SSE listeners
    void (async () => {
      function notify(p: AnalysisProgress): void {
        job.progress = p;
        for (const listener of job.listeners) {
          listener(p);
        }
      }

      try {
        // Ensure .codeatlas directory exists
        const dotCodeatlasDir = path.join(resolvedPath, '.codeatlas');
        await fs.mkdir(dotCodeatlasDir, { recursive: true });

        const result = await runAnalysis({
          projectPath: resolvedPath,
          onProgress: (p) => {
            // Override jobId to match the project job id
            notify({ ...p, jobId });
          },
        });

        // Write analysis.json
        await fs.writeFile(newAnalysisPath, JSON.stringify(result, null, 2), 'utf-8');

        // Switch server to ready mode
        currentAnalysisPath = newAnalysisPath;
        serverMode = 'ready';

        // Update recent projects
        await addRecentProject({
          path: resolvedPath,
          name: path.basename(resolvedPath),
          lastOpened: new Date().toISOString(),
          stats: {
            fileCount: result.stats.analyzedFiles,
            languages: [...new Set(
              result.graph.nodes
                .filter((n) => n.type === 'file' && n.metadata.language)
                .map((n) => n.metadata.language as string),
            )],
          },
        });
      } catch (err) {
        serverMode = 'idle';
        const errorMessage = err instanceof Error ? err.message : String(err);
        const failedProgress: AnalysisProgress = {
          ...job.progress,
          status: 'failed',
          error: errorMessage,
          completedAt: new Date().toISOString(),
        };
        notify(failedProgress);
      }
    })();

    return reply.code(202).send({ jobId });
  });

  // ---- GET /api/project/progress/:jobId (SSE + polling) ----------------------
  fastify.get<{ Params: { jobId: string } }>(
    '/api/project/progress/:jobId',
    async (req, reply) => {
      const { jobId } = req.params;

      if (!jobId || jobId.includes('..')) {
        return reply.code(400).send({ error: 'invalid_job_id', message: 'Invalid job ID.' });
      }

      const job = projectJobs.get(jobId);
      if (!job) {
        return reply.code(404).send({ error: 'job_not_found', message: `No job found: ${jobId}` });
      }

      const acceptHeader = req.headers.accept ?? '';
      const wantsSSE = acceptHeader.includes('text/event-stream');

      if (wantsSSE) {
        // SSE: keep connection open, push progress on each update
        const rawReply = reply.raw;
        rawReply.setHeader('Content-Type', 'text/event-stream');
        rawReply.setHeader('Cache-Control', 'no-cache');
        rawReply.setHeader('Connection', 'keep-alive');
        rawReply.setHeader('X-Accel-Buffering', 'no');
        rawReply.flushHeaders();

        // Send current snapshot immediately
        rawReply.write(`data: ${JSON.stringify(job.progress)}\n\n`);

        // If already terminal, close immediately
        const terminalStatuses = new Set(['completed', 'failed']);
        if (terminalStatuses.has(job.progress.status)) {
          rawReply.end();
          return reply;
        }

        // Register listener for future updates
        const listener = (p: AnalysisProgress): void => {
          rawReply.write(`data: ${JSON.stringify(p)}\n\n`);
          if (terminalStatuses.has(p.status)) {
            rawReply.end();
          }
        };

        job.listeners.add(listener);

        // Clean up listener on client disconnect
        req.raw.on('close', () => {
          job.listeners.delete(listener);
        });

        // Prevent Fastify from sending any automatic response
        await reply.hijack();
      } else {
        // Polling: return current progress snapshot as JSON
        return reply.send(job.progress);
      }
    },
  );

  // ---- GET /api/project/recent -----------------------------------------------
  fastify.get('/api/project/recent', async (_req, reply) => {
    const projects = await getRecentProjects();
    return reply.send(projects);
  });

  // ---- DELETE /api/project/recent/:index -------------------------------------
  fastify.delete<{ Params: { index: string } }>(
    '/api/project/recent/:index',
    async (req, reply) => {
      const indexStr = req.params.index;
      const index = parseInt(indexStr, 10);

      if (isNaN(index) || index < 0) {
        return reply.code(400).send({
          error: 'invalid_index',
          message: 'Index must be a non-negative integer.',
        });
      }

      await removeRecentProject(index);
      return reply.send({ success: true });
    },
  );

  // ---- SPA Fallback -----------------------------------------------------------
  // All non-API routes serve index.html for client-side routing
  fastify.setNotFoundHandler(async (req, reply) => {
    if (req.url.startsWith('/api/')) {
      await reply.code(404).send({
        error: 'not_found',
        message: `API endpoint not found: ${req.method} ${req.url}`,
      });
      return;
    }
    // SPA fallback — serve index.html
    await reply.sendFile('index.html');
  });

  // ---- Start -----------------------------------------------------------------
  await fastify.listen({ port, host: '127.0.0.1' });
}
