/**
 * Unit tests for AIJobManager (Sprint 16 T11)
 *
 * Coverage targets:
 *   - createJob: deduplication, cache-hit path, force flag, unique IDs
 *   - getJob / getAllJobs: lookup and sort order
 *   - runJob: status transitions, provider-null path, analysis-load failure, no-throw guarantee
 *   - cancelInFlightJobs: selective cancellation
 *   - metrics: success/fail/cacheHit counts and rate calculations
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the ai-pipeline module BEFORE importing AIJobManager so that
// vi.mock() hoisting replaces the real phase functions.
// ---------------------------------------------------------------------------

vi.mock('../src/ai-pipeline.js', () => ({
  runPhase1MethodBatch: vi.fn().mockResolvedValue(undefined),
  runPhase2DirectorySummaries: vi.fn().mockResolvedValue(undefined),
  runPhase3EndpointAnalysis: vi.fn().mockResolvedValue(undefined),
}));

import { AIJobManager } from '../src/ai-job-manager.js';
import type { AIJobScope } from '../src/ai-job-manager.js';
import type { AICacheEntry } from '../src/ai-cache.js';
import type { AIAnalysisProvider } from '@codeatlas/core';

// ---------------------------------------------------------------------------
// Helpers / Fixtures
// ---------------------------------------------------------------------------

function makeAnalysis(): import('@codeatlas/core').AnalysisResult {
  return {
    version: '0.1.0',
    projectPath: '/tmp/test-project',
    analyzedAt: new Date().toISOString(),
    graph: { nodes: [], edges: [] },
    stats: {
      totalFiles: 0,
      analyzedFiles: 0,
      skippedFiles: 0,
      failedFiles: 0,
      totalNodes: 0,
      totalEdges: 0,
      analysisDurationMs: 0,
      totalFunctions: 0,
      totalClasses: 0,
      totalCallEdges: 0,
    },
    errors: [],
  };
}

function makeProvider(): AIAnalysisProvider {
  return {
    isConfigured: () => true,
    summarize: vi.fn().mockResolvedValue('summary'),
    analyzeMethodBatch: vi.fn().mockResolvedValue([]),
    analyzeDirectorySummary: vi.fn().mockResolvedValue({ oneLineSummary: 'dir', role: 'utility' }),
    analyzeEndpoint: vi.fn().mockResolvedValue({ description: 'ep', steps: [] }),
  } as unknown as AIAnalysisProvider;
}

interface MockCache {
  get: Mock;
  set: Mock;
  getAllEntries: Mock;
  isStale: Mock;
  loadFromDisk: Mock;
  saveToDisk: Mock;
  size: number;
}

function makeCache(entries: AICacheEntry[] = []): MockCache {
  return {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    getAllEntries: vi.fn().mockReturnValue(entries),
    isStale: vi.fn().mockReturnValue(false),
    loadFromDisk: vi.fn(),
    saveToDisk: vi.fn(),
    size: entries.length,
  };
}

function makeCacheEntry(key: string): AICacheEntry {
  return {
    key,
    contentHash: 'hash',
    provider: 'openai',
    promptVersion: 'v1',
    result: 'cached result',
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// createJob
// ---------------------------------------------------------------------------

describe('AIJobManager — createJob', () => {
  it('creates a queued job with correct scope and target', () => {
    const cache = makeCache();
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => null,
      () => Promise.resolve(makeAnalysis()),
    );

    const job = manager.createJob('directory', '/src/utils');
    expect(job.status).toBe('queued');
    expect(job.scope).toBe('directory');
    expect(job.target).toBe('/src/utils');
    expect(job.force).toBe(false);
  });

  it('creates a queued job with force=true even when cache has a matching entry', () => {
    const cacheEntry = makeCacheEntry('directory:/src/utils:openai:v1');
    const cache = makeCache([cacheEntry]);
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => null,
      () => Promise.resolve(makeAnalysis()),
    );

    const job = manager.createJob('directory', '/src/utils', true);
    // With force=true, cache check is skipped — should be queued, not cached
    expect(job.status).toBe('queued');
    expect(job.force).toBe(true);
  });

  it('returns existing running job for same scope+target (deduplication)', () => {
    const cache = makeCache();
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => null,
      () => Promise.resolve(makeAnalysis()),
    );

    const job1 = manager.createJob('endpoint', 'ep-1');
    // Manually transition to running to simulate deduplication scenario
    (manager.getJob(job1.jobId) as { status: string }).status = 'running';

    const job2 = manager.createJob('endpoint', 'ep-1');
    expect(job2.jobId).toBe(job1.jobId);
  });

  it('returns a cached job when cache has a matching entry and force=false', () => {
    // The cache prefix for 'directory' scope is `directory:<target>:`
    const cacheEntry = makeCacheEntry('directory:/src/utils:openai:v1');
    const cache = makeCache([cacheEntry]);
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => null,
      () => Promise.resolve(makeAnalysis()),
    );

    const job = manager.createJob('directory', '/src/utils', false);
    expect(job.status).toBe('cached');
  });

  it('generates unique job IDs for different calls', () => {
    const cache = makeCache();
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => null,
      () => Promise.resolve(makeAnalysis()),
    );

    const job1 = manager.createJob('all');
    // Small delay to ensure different timestamp
    const job2 = manager.createJob('core');
    // Different scope means different prefix — IDs differ
    expect(job1.jobId).not.toBe(job2.jobId);
  });
});

// ---------------------------------------------------------------------------
// getJob / getAllJobs
// ---------------------------------------------------------------------------

describe('AIJobManager — getJob / getAllJobs', () => {
  it('returns undefined for a non-existent jobId', () => {
    const cache = makeCache();
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => null,
      () => Promise.resolve(makeAnalysis()),
    );

    expect(manager.getJob('does-not-exist')).toBeUndefined();
  });

  it('returns the job by its ID', () => {
    const cache = makeCache();
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => null,
      () => Promise.resolve(makeAnalysis()),
    );

    const job = manager.createJob('all');
    expect(manager.getJob(job.jobId)).toBe(job);
  });

  it('getAllJobs returns jobs sorted newest first', async () => {
    const cache = makeCache();
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => null,
      () => Promise.resolve(makeAnalysis()),
    );

    const j1 = manager.createJob('all');
    // Small artificial pause to get different timestamps
    await new Promise((r) => setTimeout(r, 2));
    const j2 = manager.createJob('core');
    await new Promise((r) => setTimeout(r, 2));
    const j3 = manager.createJob('directory', '/src');

    const all = manager.getAllJobs();
    expect(all[0].jobId).toBe(j3.jobId);
    expect(all[1].jobId).toBe(j2.jobId);
    expect(all[2].jobId).toBe(j1.jobId);
  });
});

// ---------------------------------------------------------------------------
// runJob
// ---------------------------------------------------------------------------

describe('AIJobManager — runJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('transitions job from queued to running to succeeded', async () => {
    const cache = makeCache();
    const provider = makeProvider();
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => provider,
      () => Promise.resolve(makeAnalysis()),
    );

    const job = manager.createJob('all');
    expect(job.status).toBe('queued');

    await manager.runJob(job.jobId);

    const updated = manager.getJob(job.jobId)!;
    expect(updated.status).toBe('succeeded');
    expect(updated.startedAt).toBeTruthy();
    expect(updated.completedAt).toBeTruthy();
    expect(updated.error).toBeUndefined();
  });

  it('transitions job to failed when provider getter returns null', async () => {
    const cache = makeCache();
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => null, // no provider
      () => Promise.resolve(makeAnalysis()),
    );

    const job = manager.createJob('all');
    await manager.runJob(job.jobId);

    const updated = manager.getJob(job.jobId)!;
    expect(updated.status).toBe('failed');
    expect(updated.error).toMatch(/AI provider is not configured/);
  });

  it('transitions job to failed when analysis loading throws', async () => {
    const cache = makeCache();
    const provider = makeProvider();
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => provider,
      () => Promise.reject(new Error('analysis.json not found')),
    );

    const job = manager.createJob('all');
    await manager.runJob(job.jobId);

    const updated = manager.getJob(job.jobId)!;
    expect(updated.status).toBe('failed');
    expect(updated.error).toMatch(/Failed to load analysis/);
  });

  it('does not throw even when the job execution fails internally', async () => {
    const cache = makeCache();
    const provider = makeProvider();
    const { runPhase1MethodBatch } = await import('../src/ai-pipeline.js');
    (runPhase1MethodBatch as Mock).mockRejectedValueOnce(new Error('phase error'));

    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => provider,
      () => Promise.resolve(makeAnalysis()),
    );

    const job = manager.createJob('all');
    await expect(manager.runJob(job.jobId)).resolves.toBeUndefined();

    expect(manager.getJob(job.jobId)!.status).toBe('failed');
  });

  it('skips execution for an already succeeded job', async () => {
    const cache = makeCache();
    const provider = makeProvider();
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => provider,
      () => Promise.resolve(makeAnalysis()),
    );

    const job = manager.createJob('all');
    await manager.runJob(job.jobId);
    expect(manager.getJob(job.jobId)!.status).toBe('succeeded');

    // Second run should be a no-op
    const { runPhase1MethodBatch } = await import('../src/ai-pipeline.js');
    (runPhase1MethodBatch as Mock).mockClear();

    await manager.runJob(job.jobId);
    expect(runPhase1MethodBatch).not.toHaveBeenCalled();
  });

  it('skips execution for a cached job', async () => {
    const cacheEntry = makeCacheEntry('directory:/src:openai:v1');
    const cache = makeCache([cacheEntry]);
    const provider = makeProvider();
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => provider,
      () => Promise.resolve(makeAnalysis()),
    );

    const job = manager.createJob('directory', '/src', false);
    expect(job.status).toBe('cached');

    const { runPhase2DirectorySummaries } = await import('../src/ai-pipeline.js');
    (runPhase2DirectorySummaries as Mock).mockClear();

    await manager.runJob(job.jobId);
    expect(runPhase2DirectorySummaries).not.toHaveBeenCalled();
  });

  it('warns but does not throw for an unknown jobId', async () => {
    const cache = makeCache();
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => null,
      () => Promise.resolve(makeAnalysis()),
    );

    await expect(manager.runJob('unknown-id')).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// cancelInFlightJobs
// ---------------------------------------------------------------------------

describe('AIJobManager — cancelInFlightJobs', () => {
  it('marks running jobs as canceled', async () => {
    const cache = makeCache();
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => null,
      () => Promise.resolve(makeAnalysis()),
    );

    const job = manager.createJob('all');
    // Force to running state
    (manager.getJob(job.jobId) as { status: string }).status = 'running';

    manager.cancelInFlightJobs();
    expect(manager.getJob(job.jobId)!.status).toBe('canceled');
  });

  it('marks queued jobs as canceled', () => {
    const cache = makeCache();
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => null,
      () => Promise.resolve(makeAnalysis()),
    );

    const job = manager.createJob('all');
    expect(job.status).toBe('queued');

    manager.cancelInFlightJobs();
    expect(manager.getJob(job.jobId)!.status).toBe('canceled');
  });

  it('does not affect succeeded jobs', async () => {
    const cache = makeCache();
    const provider = makeProvider();
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => provider,
      () => Promise.resolve(makeAnalysis()),
    );

    const job = manager.createJob('all');
    await manager.runJob(job.jobId);
    expect(manager.getJob(job.jobId)!.status).toBe('succeeded');

    manager.cancelInFlightJobs();
    // succeeded should remain succeeded
    expect(manager.getJob(job.jobId)!.status).toBe('succeeded');
  });

  it('does not affect failed jobs', async () => {
    const cache = makeCache();
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => null, // no provider → will fail
      () => Promise.resolve(makeAnalysis()),
    );

    const job = manager.createJob('all');
    await manager.runJob(job.jobId);
    expect(manager.getJob(job.jobId)!.status).toBe('failed');

    manager.cancelInFlightJobs();
    expect(manager.getJob(job.jobId)!.status).toBe('failed');
  });
});

// ---------------------------------------------------------------------------
// metrics
// ---------------------------------------------------------------------------

describe('AIJobManager — metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tracks successCount after a successful job', async () => {
    const cache = makeCache();
    const provider = makeProvider();
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => provider,
      () => Promise.resolve(makeAnalysis()),
    );

    const job = manager.createJob('all');
    await manager.runJob(job.jobId);

    const metrics = manager.getMetrics();
    expect(metrics.successCount).toBe(1);
    expect(metrics.totalJobs).toBe(1);
    expect(metrics.failCount).toBe(0);
  });

  it('tracks failCount after a failed job', async () => {
    const cache = makeCache();
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => null,
      () => Promise.resolve(makeAnalysis()),
    );

    const job = manager.createJob('all');
    await manager.runJob(job.jobId);

    const metrics = manager.getMetrics();
    expect(metrics.failCount).toBe(1);
    expect(metrics.totalJobs).toBe(1);
    expect(metrics.successCount).toBe(0);
  });

  it('tracks cacheHitCount for cached jobs', () => {
    const cacheEntry = makeCacheEntry('directory:/src:openai:v1');
    const cache = makeCache([cacheEntry]);
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => null,
      () => Promise.resolve(makeAnalysis()),
    );

    manager.createJob('directory', '/src', false);

    const metrics = manager.getMetrics();
    expect(metrics.cacheHitCount).toBe(1);
    expect(metrics.totalJobs).toBe(1);
  });

  it('calculates correct cacheHitRate after cache hits and real jobs', async () => {
    const cacheEntry = makeCacheEntry('directory:/src:openai:v1');
    const cache = makeCache([cacheEntry]);
    const provider = makeProvider();
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => provider,
      () => Promise.resolve(makeAnalysis()),
    );

    // 1 cache hit
    manager.createJob('directory', '/src', false);

    // 1 real successful job
    const job2 = manager.createJob('all');
    await manager.runJob(job2.jobId);

    const metrics = manager.getMetrics();
    expect(metrics.totalJobs).toBe(2);
    expect(metrics.cacheHitCount).toBe(1);
    expect(metrics.cacheHitRate).toBeCloseTo(0.5);
  });

  it('calculates correct analyzeSuccessRate after a mix of success and failure', async () => {
    const cache = makeCache();
    const provider = makeProvider();
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => provider,
      () => Promise.resolve(makeAnalysis()),
    );

    // 2 successful jobs
    const job1 = manager.createJob('all');
    await manager.runJob(job1.jobId);
    const job2 = manager.createJob('core');
    await manager.runJob(job2.jobId);

    // Change provider to null to make next job fail
    let callCount = 0;
    const failingManager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => {
        callCount++;
        return callCount <= 2 ? provider : null;
      },
      () => Promise.resolve(makeAnalysis()),
    );

    const fj1 = failingManager.createJob('all');
    await failingManager.runJob(fj1.jobId);
    const fj2 = failingManager.createJob('core');
    await failingManager.runJob(fj2.jobId);
    const fj3 = failingManager.createJob('directory', '/x');
    await failingManager.runJob(fj3.jobId);

    const metrics = failingManager.getMetrics();
    expect(metrics.totalJobs).toBe(3);
    expect(metrics.successCount).toBe(2);
    expect(metrics.failCount).toBe(1);
    expect(metrics.analyzeSuccessRate).toBeCloseTo(2 / 3);
  });

  it('reports zero rates when no jobs have run', () => {
    const cache = makeCache();
    const manager = new AIJobManager(
      cache as unknown as import('../src/ai-cache.js').PersistentAICache,
      () => null,
      () => Promise.resolve(makeAnalysis()),
    );

    const metrics = manager.getMetrics();
    expect(metrics.totalJobs).toBe(0);
    expect(metrics.cacheHitRate).toBe(0);
    expect(metrics.analyzeSuccessRate).toBe(0);
  });
});
