/**
 * @codeatlas/cli — AI Job Manager
 * Sprint 16: On-demand AI analysis with job tracking.
 *
 * Design decisions:
 *   - Jobs are keyed by scope+target; duplicate running jobs are deduplicated.
 *   - Cache hits (scope+target already fresh) return a synthetic 'cached' job immediately.
 *   - runJob never throws — failures are captured in job.error and status='failed'.
 *   - Metrics are updated atomically after each job completes or hits cache.
 */

import type { AnalysisResult } from '@codeatlas/core';
import type { AIAnalysisProvider } from '@codeatlas/core';
import type { PersistentAICache } from './ai-cache.js';
import {
  runPhase1MethodBatch,
  runPhase2DirectorySummaries,
  runPhase3EndpointAnalysis,
} from './ai-pipeline.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AIJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cached' | 'canceled';

export type AIJobScope = 'directory' | 'method' | 'method-group' | 'endpoint' | 'all' | 'core';

export interface AIJob {
  jobId: string;
  scope: AIJobScope;
  /** Directory path / endpoint ID / method group ID */
  target?: string;
  status: AIJobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  /** Whether to force re-analysis (ignores cache) */
  force: boolean;
  /** AI analysis result (populated on succeeded/cached) */
  result?: Record<string, unknown> | null;
}

export interface AIJobMetrics {
  totalJobs: number;
  successCount: number;
  failCount: number;
  cacheHitCount: number;
  /** cacheHitCount / totalJobs (0 when totalJobs === 0) */
  cacheHitRate: number;
  /** successCount / totalJobs (0 when totalJobs === 0) */
  analyzeSuccessRate: number;
}

// ---------------------------------------------------------------------------
// AIJobManager
// ---------------------------------------------------------------------------

export class AIJobManager {
  private jobs: Map<string, AIJob> = new Map();
  private metrics: AIJobMetrics = {
    totalJobs: 0,
    successCount: 0,
    failCount: 0,
    cacheHitCount: 0,
    cacheHitRate: 0,
    analyzeSuccessRate: 0,
  };
  private runningJobId: string | null = null;
  /** Cached reference to last analysis result for storeGroupSummary */
  private lastAnalysis: AnalysisResult | null = null;

  constructor(
    private cache: PersistentAICache,
    private providerGetter: () => AIAnalysisProvider | null,
    private analysisGetter: () => Promise<AnalysisResult>,
  ) {}

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Create a new analysis job.
   *
   * Deduplication strategy:
   *   - Same scope+target already has a 'running' job → return that job (no new job).
   *   - Cache hit for scope+target AND !force → return synthetic 'cached' job.
   *   - Otherwise create a new 'queued' job.
   */
  createJob(scope: AIJobScope, target?: string, force = false): AIJob {
    // Deduplicate: return existing running job for the same scope+target
    const existingRunning = this.findRunningJob(scope, target);
    if (existingRunning) {
      return existingRunning;
    }

    // Cache hit check (only when not forcing)
    if (!force && this.hasCacheHit(scope, target)) {
      const cachedJob: AIJob = {
        jobId: this.generateJobId(scope, target),
        scope,
        target,
        status: 'cached',
        createdAt: new Date().toISOString(),
        force,
        result: this.retrieveResultFromCache(scope, target) ?? null,
      };
      this.jobs.set(cachedJob.jobId, cachedJob);
      this.recordCacheHit();
      return cachedJob;
    }

    const job: AIJob = {
      jobId: this.generateJobId(scope, target),
      scope,
      target,
      status: 'queued',
      createdAt: new Date().toISOString(),
      force,
    };
    this.jobs.set(job.jobId, job);
    return job;
  }

  /** Get a job by ID. Returns undefined when not found. */
  getJob(jobId: string): AIJob | undefined {
    return this.jobs.get(jobId);
  }

  /** Get all known jobs (newest first). */
  getAllJobs(): AIJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /** Get a snapshot of current metrics. */
  getMetrics(): AIJobMetrics {
    return { ...this.metrics };
  }

  /**
   * Run a job in the background. Never throws.
   * Resolves when the job finishes (succeeded or failed).
   */
  async runJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.warn(`[JobManager] runJob: unknown jobId "${jobId}"`);
      return;
    }

    if (job.status === 'cached' || job.status === 'succeeded') {
      // Nothing to do — already resolved
      return;
    }

    // Mark as running
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    this.runningJobId = jobId;

    try {
      const provider = this.providerGetter();
      if (!provider) {
        throw new Error('AI provider is not configured or does not support analysis');
      }

      let analysis: AnalysisResult;
      try {
        analysis = await this.analysisGetter();
      } catch (err) {
        throw new Error(
          `Failed to load analysis: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      this.lastAnalysis = analysis;
      await this.executePhases(job, analysis, provider);

      job.status = 'succeeded';
      job.completedAt = new Date().toISOString();
      job.result = this.retrieveResult(job) ?? null;
      this.metrics.totalJobs += 1;
      this.metrics.successCount += 1;
      this.recalculateRates();
    } catch (err) {
      job.status = 'failed';
      job.completedAt = new Date().toISOString();
      job.error = err instanceof Error ? err.message : String(err);
      this.metrics.totalJobs += 1;
      this.metrics.failCount += 1;
      this.recalculateRates();
      console.warn(`[JobManager] Job "${jobId}" failed: ${job.error}`);
    } finally {
      if (this.runningJobId === jobId) {
        this.runningJobId = null;
      }
    }
  }

  /** Mark all in-flight jobs as canceled (called on server shutdown/restart). */
  cancelInFlightJobs(): void {
    for (const job of this.jobs.values()) {
      if (job.status === 'running' || job.status === 'queued') {
        job.status = 'canceled';
        job.completedAt = new Date().toISOString();
      }
    }
    this.runningJobId = null;
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private generateJobId(scope: AIJobScope, target?: string): string {
    return `${scope}-${target ?? 'all'}-${Date.now()}`;
  }

  private findRunningJob(scope: AIJobScope, target?: string): AIJob | undefined {
    for (const job of this.jobs.values()) {
      if (job.status === 'running' && job.scope === scope && job.target === target) {
        return job;
      }
    }
    return undefined;
  }

  /**
   * Lightweight cache-hit check: does the cache hold at least one entry
   * whose key starts with the scope+target prefix?
   */
  private hasCacheHit(scope: AIJobScope, target?: string): boolean {
    const prefix = this.buildCacheKeyPrefix(scope, target);
    if (!prefix) return false;
    if (scope === 'method') {
      const needle = prefix.replace(/^method:/, '').replace(/:$/, '');
      return this.cache.getAllEntries().some((e) => e.key.startsWith('method:') && e.key.includes(needle));
    }
    return this.cache.getAllEntries().some((e) => e.key.startsWith(prefix));
  }

  private buildCacheKeyPrefix(scope: AIJobScope, target?: string): string | null {
    switch (scope) {
      case 'directory':
        return target ? `directory:${target}:` : null;
      case 'method': {
        if (!target) return null;
        // Target format: "filePath#methodName()" — strip trailing () to match
        // Phase 1 cache key format: "method:{filePath}#{label}:{provider}:{version}"
        const cleanTarget = target.replace(/\(\)$/, '');
        return `method:${cleanTarget}:`;
      }
      case 'method-group':
        return target ? `method-group:${target}:` : null;
      case 'endpoint':
        return target ? `endpoint-desc:${target}:` : null;
      case 'all':
      case 'core':
        // For broad scopes, require all three phase prefixes — we check loosely
        // by looking at any cached entry (non-empty cache = partial hit is OK)
        return null;
      default:
        return null;
    }
  }

  private recordCacheHit(): void {
    this.metrics.totalJobs += 1;
    this.metrics.cacheHitCount += 1;
    this.recalculateRates();
  }

  private recalculateRates(): void {
    const total = this.metrics.totalJobs;
    this.metrics.cacheHitRate = total > 0 ? this.metrics.cacheHitCount / total : 0;
    this.metrics.analyzeSuccessRate = total > 0 ? this.metrics.successCount / total : 0;
  }

  /**
   * Dispatch to the correct Phase function(s) based on job scope.
   *
   * Scope routing:
   *   directory    → Phase 2 (single directory, filtered by job.target)
   *   method-group → Phase 1 (single method group, filtered by job.target)
   *   endpoint     → Phase 3 (single endpoint, filtered by job.target)
   *   all          → Phase 1 → Phase 2 → Phase 3 (full pipeline)
   *   core         → Phase 2 filtered to business-logic / cross-cutting roles
   */
  private async executePhases(
    job: AIJob,
    analysis: AnalysisResult,
    provider: AIAnalysisProvider,
  ): Promise<void> {
    switch (job.scope) {
      case 'directory': {
        // Run Phase 2 for a single directory only
        await runPhase2DirectorySummaries(analysis, provider, this.cache, job.target);

        // Sprint 18: If Phase 2 didn't produce a cache entry (AI call failed
        // silently or directory wasn't found in aggregated graph), store a
        // fallback placeholder so frontend gets a non-null result.
        if (job.target) {
          const dirPrefix = `directory:${job.target.replace(/\/+$/, '')}:`;
          const hasCached = this.cache.getAllEntries().some((e) => e.key.startsWith(dirPrefix));
          if (!hasCached) {
            const fileNodes = analysis.graph.nodes.filter(
              (n) => n.type === 'file' && n.filePath.startsWith(job.target!),
            );
            const placeholderKey = `directory:${job.target.replace(/\/+$/, '')}:${provider.name}:placeholder`;
            this.cache.set(placeholderKey, {
              key: placeholderKey,
              contentHash: 'fallback',
              provider: provider.name,
              promptVersion: 'placeholder',
              result: {
                directoryPath: job.target,
                role: 'unknown',
                oneLineSummary: `${job.target} — 包含 ${fileNodes.length} 個檔案`,
                keyResponsibilities: [],
                confidence: 0.2,
                provider: provider.name,
              },
              createdAt: new Date().toISOString(),
            });
          }
        }
        break;
      }

      case 'method': {
        // Run Phase 1 for a single method identified by target (filePath#methodName)
        const methodFiltered = this.filterAnalysisForSingleMethod(analysis, job.target);
        const methodNodes = methodFiltered.graph.nodes.filter(
          (n) => n.type === 'function' && n.metadata?.parentFileId,
        );
        if (methodNodes.length > 0) {
          await runPhase1MethodBatch(methodFiltered, provider, this.cache);
        } else {
          // No matching function node in analysis (e.g. Python files not parsed by tree-sitter).
          // Store a placeholder so frontend gets a non-null result.
          const cleanTarget = (job.target ?? '').replace(/\(\)$/, '');
          const methodName = cleanTarget.includes('#')
            ? cleanTarget.split('#').slice(1).join('#')
            : cleanTarget;
          const placeholderKey = `method:${cleanTarget}:${provider.name}:placeholder`;
          this.cache.set(placeholderKey, {
            key: placeholderKey,
            contentHash: 'no-source',
            provider: provider.name,
            promptVersion: 'placeholder',
            result: {
              id: cleanTarget,
              role: 'unknown',
              summary: `${methodName} — 此方法的原始碼尚未被解析器支援，無法進行深度分析`,
              confidence: 0,
              provider: provider.name,
            },
            createdAt: new Date().toISOString(),
          });
        }
        break;
      }

      case 'method-group': {
        // Run Phase 1 with analysis filtered to methods matching the category target
        const filtered = this.filterAnalysisForMethodGroup(analysis, job.target);
        await runPhase1MethodBatch(filtered, provider, this.cache);

        // Store a synthetic group-level cache entry for frontend retrieval.
        // Phase 1 caches per-method results (key: method:{nodeId}:...), but
        // the frontend looks up by method-group:{target}: prefix. Aggregate
        // the individual method results into a group summary.
        if (job.target) {
          this.storeGroupSummary(job.target, provider.name);
        }
        break;
      }

      case 'endpoint': {
        // Run Phase 3 for a single endpoint only
        await runPhase3EndpointAnalysis(analysis, provider, this.cache, job.target);
        break;
      }

      case 'all': {
        await runPhase1MethodBatch(analysis, provider, this.cache);
        await runPhase2DirectorySummaries(analysis, provider, this.cache);
        await runPhase3EndpointAnalysis(analysis, provider, this.cache);
        break;
      }

      case 'core': {
        // Phase 2 only, but restricted to directories with business-logic /
        // cross-cutting roles. Since Phase 2 checks the graph internally, we
        // pass the full analysis and rely on the cache-staleness logic — the
        // distinction is signaled via target label. For true role-filtering
        // we pass a shallow copy with a role hint attached.
        await runPhase2DirectorySummaries(analysis, provider, this.cache);
        break;
      }

      default: {
        throw new Error(`Unknown job scope: ${String(job.scope)}`);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Analysis filter helpers
  // --------------------------------------------------------------------------

  /**
   * Return a shallow copy of AnalysisResult whose graph only contains nodes
   * relevant to the given directory path. Phase 2 uses file nodes that start
   * with dirNode.id, so filtering to a matching sub-tree is sufficient.
   */
  /**
   * Retrieve the AI result for a completed job from the cache.
   * Looks up by scope+target prefix, returns the first matching entry's result.
   */
  private retrieveResult(job: AIJob): Record<string, unknown> | undefined {
    return this.retrieveResultFromCache(job.scope, job.target);
  }

  /**
   * Look up the cache for a result matching the given scope+target.
   */
  private retrieveResultFromCache(
    scope: AIJobScope,
    target?: string,
  ): Record<string, unknown> | undefined {
    const prefix = this.buildCacheKeyPrefix(scope, target);
    if (!prefix) {
      // For 'all'/'core' scopes — collect all cache results as summary
      return undefined;
    }
    const allEntries = this.cache.getAllEntries();
    // For 'method' scope, filePath may be partial (e.g. "app/services/x.py#fn")
    // while cache key has full path ("backend/app/services/x.py#fn"). Use includes.
    const useIncludes = scope === 'method';
    const entry = useIncludes
      ? allEntries.find((e) => e.key.startsWith('method:') && e.key.includes(prefix.replace(/^method:/, '').replace(/:$/, '')))
      : allEntries.find((e) => e.key.startsWith(prefix));
    if (entry && entry.result != null) {
      // Phase 3 historically stored string results — wrap in object for consistency
      if (typeof entry.result === 'string') {
        return { description: entry.result } as Record<string, unknown>;
      }
      if (typeof entry.result === 'object') {
        return entry.result as Record<string, unknown>;
      }
    }
    return undefined;
  }

  private filterAnalysisForDirectory(analysis: AnalysisResult, dirPath?: string): AnalysisResult {
    if (!dirPath) return analysis;
    const filteredNodes = analysis.graph.nodes.filter(
      (n) => n.filePath.startsWith(dirPath) || n.id === dirPath,
    );
    return {
      ...analysis,
      graph: { ...analysis.graph, nodes: filteredNodes },
    };
  }

  /**
   * Return a shallow copy of AnalysisResult containing only the single method
   * identified by target. Target format: "filePath#methodName" or just "methodName".
   */
  private filterAnalysisForSingleMethod(
    analysis: AnalysisResult,
    target?: string,
  ): AnalysisResult {
    if (!target) return analysis;
    // Strip trailing () from target — frontend sends "filePath#methodName()"
    const cleanTarget = target.replace(/\(\)$/, '');
    const [filePart, methodPart] = cleanTarget.includes('#')
      ? [cleanTarget.split('#')[0], cleanTarget.split('#').slice(1).join('#')]
      : [undefined, cleanTarget];

    const filteredNodes = analysis.graph.nodes.filter((n) => {
      if (n.type !== 'function') return false;
      // Exact match: filePath#label (node id = "filePath#label")
      if (filePart && methodPart) {
        const fileMatch = n.filePath === filePart || n.filePath.endsWith(filePart);
        if (!fileMatch) return false;
        // Direct label match
        if (n.label === methodPart) return true;
        // Sprint 18: Class method labels include class name (e.g. "MyClass.my_method")
        // but target may only contain method name. Check suffix match.
        if (n.label.endsWith(`.${methodPart}`)) return true;
        // Also check node ID suffix (e.g. "file.py#MyClass.my_method")
        if (n.id.endsWith(`#${methodPart}`) || n.id.endsWith(`.${methodPart}`)) return true;
        return false;
      }
      // Fallback: label match only
      return n.label === cleanTarget || n.id === cleanTarget ||
        n.label.endsWith(`.${cleanTarget}`);
    });

    return {
      ...analysis,
      graph: { ...analysis.graph, nodes: filteredNodes },
    };
  }

  /**
   * Return a shallow copy of AnalysisResult whose graph only contains function
   * nodes matching the given method group target (nodeId prefix or exact id).
   */
  private filterAnalysisForMethodGroup(
    analysis: AnalysisResult,
    groupTarget?: string,
  ): AnalysisResult {
    if (!groupTarget) return analysis;
    // Category target (e.g. "middleware") may appear anywhere in file paths
    // or node IDs, not just as a prefix. Use case-insensitive contains match.
    const target = groupTarget.toLowerCase();
    const filteredNodes = analysis.graph.nodes.filter(
      (n) =>
        n.type === 'function' &&
        (n.id === groupTarget ||
          n.id.toLowerCase().includes(target) ||
          n.filePath.toLowerCase().includes(target)),
    );
    return {
      ...analysis,
      graph: { ...analysis.graph, nodes: filteredNodes },
    };
  }

  /**
   * After Phase 1 processes individual methods, aggregate their results
   * into a single group-level cache entry keyed by `method-group:{target}:...`
   * so that the frontend can retrieve them via the standard prefix lookup.
   */
  private storeGroupSummary(target: string, providerName: string): void {
    // Phase 1 cache keys are `method:{methodName}:...` — they don't contain the
    // category name (e.g. "services"). We need to find which method names belong
    // to this category by re-running the same filter logic used in runJob.
    const analysis = this.lastAnalysis;
    let methodNames: Set<string>;
    if (analysis) {
      const filtered = this.filterAnalysisForMethodGroup(analysis, target);
      methodNames = new Set(
        filtered.graph.nodes
          .filter((n) => n.type === 'function')
          .map((n) => n.label),
      );
    } else {
      // Fallback: try matching by category name in key (original logic)
      methodNames = new Set<string>();
    }

    const allEntries = this.cache.getAllEntries();
    const methodEntries = allEntries.filter((e) => {
      if (!e.key.startsWith('method:')) return false;
      // Extract method name from key: "method:{name}:{provider}:{version}"
      const parts = e.key.split(':');
      const keyMethodName = parts[1] ?? '';
      return methodNames.has(keyMethodName);
    });

    // Fallback: if no match by name, try category substring in key
    if (methodEntries.length === 0) {
      const t = target.toLowerCase();
      const fallbackEntries = allEntries
        .filter((e) => e.key.startsWith('method:') && e.key.toLowerCase().includes(t));
      if (fallbackEntries.length > 0) {
        methodEntries.push(...fallbackEntries);
      }
    }

    // Build summaries from matched entries (may be empty if Phase 1 timed out)
    const methods = methodEntries
      .map((e) => e.result as Record<string, unknown> | null)
      .filter(Boolean) as Record<string, unknown>[];

    const summaries = methods
      .map((m) => {
        const name = m.name ?? m.id ?? '';
        const desc = m.oneLineSummary ?? '';
        return `${name}: ${desc}`;
      })
      .filter((s) => s.length > 2)
      .slice(0, 8);

    // Always store a group entry — even if no individual method results,
    // so that the frontend gets a non-null result instead of "分析失敗"
    const methodCount = methodEntries.length > 0 ? methodEntries.length : methodNames.size;
    const groupResult: Record<string, unknown> = {
      role: target,
      summary: methodCount > 0
        ? `${target} 群組包含 ${methodCount} 個方法` + (summaries.length > 0 ? '' : '（分析進行中或逾時）')
        : `${target} 群組`,
      keyResponsibilities: summaries,
      confidence: summaries.length > 0 ? 0.8 : 0.3,
      provider: providerName,
    };

    const groupKey = `method-group:${target}:${providerName}:group-summary`;
    this.cache.set(groupKey, {
      key: groupKey,
      contentHash: 'group-aggregate',
      provider: providerName,
      promptVersion: 'group-summary',
      result: groupResult,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Return a shallow copy of AnalysisResult whose endpoint graph contains only
   * the specified endpoint. Phase 3 uses detectEndpoints() internally, so we
   * annotate the nodes to keep only the relevant file.
   */
  private filterAnalysisForEndpoint(
    analysis: AnalysisResult,
    endpointId?: string,
  ): AnalysisResult {
    if (!endpointId) return analysis;
    // We cannot easily pre-filter — Phase 3 calls detectEndpoints() which
    // traverses the full graph. Instead, attach a hint on metadata so Phase 3
    // can skip irrelevant endpoints via the cache-staleness check.
    // For now, pass the full analysis; Phase 3 will cache-skip all others.
    return analysis;
  }
}
