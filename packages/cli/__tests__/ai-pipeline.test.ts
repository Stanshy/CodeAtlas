/**
 * Sprint 15.1 — AI Pipeline tests
 *
 * Covers:
 *   1. createAICache() — shape, defaults, instance independence
 *   2. runAIPipeline() with 'disabled' provider — fast path (no AI calls)
 *   3. AICache state machine — status transitions, progress messages
 *   4. Cache map independence — mutations on one instance don't affect another
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createAICache } from '../src/ai-pipeline.js';
import { PersistentAICache } from '../src/ai-cache.js';
import type { AICache } from '../src/ai-pipeline.js';

// ---------------------------------------------------------------------------
// Temp dir for PersistentAICache instances used in runAIPipeline tests
// ---------------------------------------------------------------------------

let tempDir: string;
let tempCachePath: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeatlas-pipeline-test-'));
  tempCachePath = path.join(tempDir, 'ai-results.json');
});

afterEach(async () => {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
});

// ---------------------------------------------------------------------------
// Minimal AnalysisResult fixture used across pipeline tests
// ---------------------------------------------------------------------------

function makeAnalysis(overrides: Partial<{
  nodes: unknown[];
  edges: unknown[];
}> = {}): import('@codeatlas/core').AnalysisResult {
  return {
    version: '0.1.0',
    projectPath: '/tmp/test-project',
    analyzedAt: new Date().toISOString(),
    graph: {
      nodes: (overrides.nodes ?? []) as import('@codeatlas/core').GraphNode[],
      edges: (overrides.edges ?? []) as import('@codeatlas/core').GraphEdge[],
    },
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

// ---------------------------------------------------------------------------
// createAICache — default shape
// ---------------------------------------------------------------------------

describe('createAICache — initial shape', () => {
  it('sets status to "idle"', () => {
    const cache = createAICache();
    expect(cache.status).toBe('idle');
  });

  it('sets progress to empty string', () => {
    const cache = createAICache();
    expect(cache.progress).toBe('');
  });

  it('error field is undefined on fresh cache', () => {
    const cache = createAICache();
    expect(cache.error).toBeUndefined();
  });

  it('methodSummaries is an empty Map', () => {
    const cache = createAICache();
    expect(cache.methodSummaries).toBeInstanceOf(Map);
    expect(cache.methodSummaries.size).toBe(0);
  });

  it('directorySummaries is an empty Map', () => {
    const cache = createAICache();
    expect(cache.directorySummaries).toBeInstanceOf(Map);
    expect(cache.directorySummaries.size).toBe(0);
  });

  it('endpointDescriptions is an empty Map', () => {
    const cache = createAICache();
    expect(cache.endpointDescriptions).toBeInstanceOf(Map);
    expect(cache.endpointDescriptions.size).toBe(0);
  });

  it('stepDetails is an empty Map', () => {
    const cache = createAICache();
    expect(cache.stepDetails).toBeInstanceOf(Map);
    expect(cache.stepDetails.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// createAICache — instance independence
// ---------------------------------------------------------------------------

describe('createAICache — instance independence', () => {
  it('two caches have independent methodSummaries maps', () => {
    const c1 = createAICache();
    const c2 = createAICache();
    c1.methodSummaries.set('node-1', 'summary for node-1');
    expect(c2.methodSummaries.size).toBe(0);
  });

  it('two caches have independent directorySummaries maps', () => {
    const c1 = createAICache();
    const c2 = createAICache();
    c1.directorySummaries.set('src/', {
      oneLineSummary: 'Source root',
      keyFiles: [],
      primaryRole: 'entry',
      technicalTags: [],
    });
    expect(c2.directorySummaries.size).toBe(0);
  });

  it('two caches have independent endpointDescriptions maps', () => {
    const c1 = createAICache();
    const c2 = createAICache();
    c1.endpointDescriptions.set('GET:/api/users', '取得使用者列表');
    expect(c2.endpointDescriptions.size).toBe(0);
  });

  it('two caches have independent stepDetails maps', () => {
    const c1 = createAICache();
    const c2 = createAICache();
    c1.stepDetails.set('GET:/api/users', []);
    expect(c2.stepDetails.size).toBe(0);
  });

  it('mutating status on one cache does not affect another', () => {
    const c1 = createAICache();
    const c2 = createAICache();
    c1.status = 'running';
    expect(c2.status).toBe('idle');
  });
});

// ---------------------------------------------------------------------------
// runAIPipeline — 'disabled' provider
//
// DisabledProvider extends BaseAnalysisProvider (which implements
// AIAnalysisProvider), so isAnalysisProvider() returns true and the pipeline
// runs through all three phases.  With an empty node graph, all phases
// skip their work and the pipeline reaches the happy-path "done" state.
// With function nodes present, Phase 1 batch calls fail gracefully (the
// disabled provider's summarize() returns a non-JSON string, which is caught
// per-batch), but the pipeline still finishes with status "done".
// ---------------------------------------------------------------------------

describe('runAIPipeline — disabled provider (empty graph)', () => {
  it('resolves without throwing after completing all phases on an empty graph', async () => {
    const { runAIPipeline } = await import('../src/ai-pipeline.js');
    const cache = new PersistentAICache(tempCachePath);
    await expect(
      runAIPipeline({
        analysis: makeAnalysis(),
        providerName: 'disabled',
        cache,
      }),
    ).resolves.toBeUndefined();
  });

  it('does not write any cache entries with an empty graph', async () => {
    const { runAIPipeline } = await import('../src/ai-pipeline.js');
    const cache = new PersistentAICache(tempCachePath);
    await runAIPipeline({
      analysis: makeAnalysis(),
      providerName: 'disabled',
      cache,
    });
    expect(cache.size).toBe(0);
  });

  it('does not throw when pipeline completes normally', async () => {
    const { runAIPipeline } = await import('../src/ai-pipeline.js');
    const cache = new PersistentAICache(tempCachePath);
    await expect(
      runAIPipeline({
        analysis: makeAnalysis(),
        providerName: 'disabled',
        cache,
      }),
    ).resolves.toBeUndefined();
  });

  it('returns void (never throws)', async () => {
    const { runAIPipeline } = await import('../src/ai-pipeline.js');
    const cache = new PersistentAICache(tempCachePath);
    await expect(
      runAIPipeline({
        analysis: makeAnalysis(),
        providerName: 'disabled',
        cache,
      }),
    ).resolves.toBeUndefined();
  });

  it('completes without error from idle state through all phases', async () => {
    const { runAIPipeline } = await import('../src/ai-pipeline.js');
    const cache = new PersistentAICache(tempCachePath);
    expect(cache.size).toBe(0);
    await runAIPipeline({
      analysis: makeAnalysis(),
      providerName: 'disabled',
      cache,
    });
    // Pipeline completed all phases — cache is still empty (no nodes to analyze)
    expect(cache.size).toBe(0);
  });
});

describe('runAIPipeline — disabled provider (with function nodes)', () => {
  it('resolves without throwing even when function nodes are present', async () => {
    const { runAIPipeline } = await import('../src/ai-pipeline.js');
    const cache = new PersistentAICache(tempCachePath);
    const analysis = makeAnalysis({
      nodes: [
        {
          id: 'src/index.ts#myFunc',
          type: 'function',
          label: 'myFunc',
          filePath: 'src/index.ts',
          metadata: { parentFileId: 'src/index.ts', kind: 'function' },
        },
      ],
    });
    await expect(
      runAIPipeline({
        analysis,
        providerName: 'disabled',
        cache,
      }),
    // Phase 1 batch fails gracefully per-batch; pipeline still resolves
    ).resolves.toBeUndefined();
  });

  it('does not write cache entries when batch calls fail gracefully', async () => {
    const { runAIPipeline } = await import('../src/ai-pipeline.js');
    const cache = new PersistentAICache(tempCachePath);
    const analysis = makeAnalysis({
      nodes: [
        {
          id: 'src/index.ts#myFunc',
          type: 'function',
          label: 'myFunc',
          filePath: 'src/index.ts',
          metadata: { parentFileId: 'src/index.ts', kind: 'function' },
        },
      ],
    });
    await runAIPipeline({
      analysis,
      providerName: 'disabled',
      cache,
    });
    // Batch failure is caught per-batch; no cache entries are written
    expect(cache.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AICache manual state machine
// ---------------------------------------------------------------------------

describe('AICache — manual state manipulation', () => {
  it('can transition status from idle to running manually', () => {
    const cache = createAICache();
    cache.status = 'running';
    expect(cache.status).toBe('running');
  });

  it('can set a progress message', () => {
    const cache = createAICache();
    cache.progress = 'Analyzing 5 methods...';
    expect(cache.progress).toBe('Analyzing 5 methods...');
  });

  it('can store a method summary by node ID', () => {
    const cache = createAICache();
    cache.methodSummaries.set('src/utils.ts#formatDate', '日期格式化工具');
    expect(cache.methodSummaries.get('src/utils.ts#formatDate')).toBe('日期格式化工具');
  });

  it('can store an endpoint description', () => {
    const cache = createAICache();
    cache.endpointDescriptions.set('GET:/api/users', '取得使用者列表');
    expect(cache.endpointDescriptions.get('GET:/api/users')).toBe('取得使用者列表');
  });

  it('can store step details for an endpoint', () => {
    const cache = createAICache();
    const steps = [{ stepIndex: 0, methodId: 'src/auth.ts#validateToken', summary: 'Validates JWT token' }];
    cache.stepDetails.set('POST:/api/login', steps as unknown as import('@codeatlas/core').StepDetail[]);
    expect(cache.stepDetails.get('POST:/api/login')).toHaveLength(1);
  });

  it('can transition status to error and record error message', () => {
    const cache = createAICache();
    cache.status = 'error';
    cache.error = 'API rate limit exceeded';
    cache.progress = 'AI analysis failed';
    expect(cache.status).toBe('error');
    expect(cache.error).toBe('API rate limit exceeded');
    expect(cache.progress).toBe('AI analysis failed');
  });
});
