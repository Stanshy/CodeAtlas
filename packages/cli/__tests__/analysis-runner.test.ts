/**
 * Unit tests for analysis-runner.ts (Sprint 20 T3)
 *
 * Coverage:
 *   - onProgress callback fires for each stage transition
 *   - queued → scanning → parsing → building → completed sequence
 *   - Error handling: wraps errors and reports failed status
 *   - Cancelled via AbortSignal before start
 *   - jobId is consistent across all progress events
 *   - startedAt is set on all progress events
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @codeatlas/core before importing analysis-runner
// ---------------------------------------------------------------------------

const mockScanDirectory = vi.fn();
const mockAnalyze = vi.fn();

vi.mock('@codeatlas/core', () => ({
  scanDirectory: (...args: unknown[]) => mockScanDirectory(...args),
  analyze: (...args: unknown[]) => mockAnalyze(...args),
}));

import { runAnalysis } from '../src/analysis-runner.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeScanResult(fileCount = 5) {
  return {
    nodes: [
      ...Array.from({ length: fileCount }, (_, i) => ({
        type: 'file',
        filePath: `/project/src/file${i}.ts`,
        id: `file-${i}`,
        name: `file${i}.ts`,
        metadata: {},
      })),
    ],
    edges: [],
  };
}

function makeAnalyzeResult(nodeCount = 10) {
  return {
    stats: {
      totalNodes: nodeCount,
      analyzedFiles: 5,
      totalEdges: 3,
    },
    graph: {
      nodes: Array.from({ length: nodeCount }, (_, i) => ({
        id: `node-${i}`,
        type: 'file',
        filePath: `/project/src/file${i}.ts`,
        name: `file${i}.ts`,
        metadata: { language: 'typescript' },
      })),
      edges: [],
    },
  };
}

// ---------------------------------------------------------------------------
// beforeEach: reset mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockScanDirectory.mockResolvedValue(makeScanResult(5));
  mockAnalyze.mockResolvedValue(makeAnalyzeResult(10));
});

// ---------------------------------------------------------------------------
// onProgress callback sequence
// ---------------------------------------------------------------------------

describe('runAnalysis — progress callback sequence', () => {
  it('fires onProgress at least once for each major stage', async () => {
    const calls: string[] = [];
    const onProgress = vi.fn((p) => calls.push(p.status));

    await runAnalysis({
      projectPath: '/project',
      onProgress,
    });

    expect(calls).toContain('queued');
    expect(calls).toContain('scanning');
    expect(calls).toContain('parsing');
    expect(calls).toContain('building');
    expect(calls).toContain('completed');
  });

  it('first progress event has status queued', async () => {
    const calls: string[] = [];
    const onProgress = vi.fn((p) => calls.push(p.status));

    await runAnalysis({ projectPath: '/project', onProgress });

    expect(calls[0]).toBe('queued');
  });

  it('last progress event has status completed on success', async () => {
    const calls: string[] = [];
    const onProgress = vi.fn((p) => calls.push(p.status));

    await runAnalysis({ projectPath: '/project', onProgress });

    expect(calls[calls.length - 1]).toBe('completed');
  });

  it('all progress events share the same jobId', async () => {
    const jobIds = new Set<string>();
    const onProgress = vi.fn((p) => jobIds.add(p.jobId));

    await runAnalysis({ projectPath: '/project', onProgress });

    expect(jobIds.size).toBe(1);
  });

  it('all progress events have a startedAt timestamp', async () => {
    const onProgress = vi.fn();

    await runAnalysis({ projectPath: '/project', onProgress });

    for (const call of onProgress.mock.calls) {
      const p = call[0];
      expect(typeof p.startedAt).toBe('string');
      expect(p.startedAt.length).toBeGreaterThan(0);
    }
  });

  it('completed progress has a completedAt timestamp', async () => {
    let lastProgress: { completedAt?: string } | null = null;
    const onProgress = vi.fn((p) => { lastProgress = p; });

    await runAnalysis({ projectPath: '/project', onProgress });

    expect(lastProgress).not.toBeNull();
    expect(typeof lastProgress!.completedAt).toBe('string');
  });

  it('scanning stage ends with completed status', async () => {
    const scanningCompletedEvents: unknown[] = [];
    const onProgress = vi.fn((p) => {
      if (p.stages?.scanning?.status === 'completed') {
        scanningCompletedEvents.push(p);
      }
    });

    await runAnalysis({ projectPath: '/project', onProgress });

    expect(scanningCompletedEvents.length).toBeGreaterThan(0);
  });

  it('building stage ends with completed status', async () => {
    let buildingCompleted = false;
    const onProgress = vi.fn((p) => {
      if (p.stages?.building?.status === 'completed') buildingCompleted = true;
    });

    await runAnalysis({ projectPath: '/project', onProgress });

    expect(buildingCompleted).toBe(true);
  });

  it('calls onProgress with queued before calling scanDirectory', async () => {
    const callOrder: string[] = [];
    const onProgress = vi.fn((p) => {
      if (p.status === 'queued') callOrder.push('progress-queued');
    });
    mockScanDirectory.mockImplementation(async () => {
      callOrder.push('scanDirectory');
      return makeScanResult(3);
    });

    await runAnalysis({ projectPath: '/project', onProgress });

    expect(callOrder.indexOf('progress-queued')).toBeLessThan(callOrder.indexOf('scanDirectory'));
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('runAnalysis — error handling', () => {
  it('throws when analyze() rejects', async () => {
    mockAnalyze.mockRejectedValue(new Error('analyze failed'));

    await expect(
      runAnalysis({ projectPath: '/project', onProgress: vi.fn() }),
    ).rejects.toThrow('analyze failed');
  });

  it('calls onProgress with failed status when analyze() throws', async () => {
    mockAnalyze.mockRejectedValue(new Error('analyze failed'));

    const statuses: string[] = [];
    const onProgress = vi.fn((p) => statuses.push(p.status));

    await runAnalysis({ projectPath: '/project', onProgress }).catch(() => {});

    expect(statuses).toContain('failed');
  });

  it('includes the error message in the failed progress event', async () => {
    const errorMsg = 'Disk full error';
    mockAnalyze.mockRejectedValue(new Error(errorMsg));

    let failedProgress: { error?: string } | null = null;
    const onProgress = vi.fn((p) => {
      if (p.status === 'failed') failedProgress = p;
    });

    await runAnalysis({ projectPath: '/project', onProgress }).catch(() => {});

    expect(failedProgress).not.toBeNull();
    expect(failedProgress!.error).toBe(errorMsg);
  });

  it('failed progress event has a completedAt timestamp', async () => {
    mockAnalyze.mockRejectedValue(new Error('some error'));

    let failedProgress: { completedAt?: string } | null = null;
    const onProgress = vi.fn((p) => {
      if (p.status === 'failed') failedProgress = p;
    });

    await runAnalysis({ projectPath: '/project', onProgress }).catch(() => {});

    expect(failedProgress).not.toBeNull();
    expect(typeof failedProgress!.completedAt).toBe('string');
  });

  it('handles non-Error thrown values gracefully', async () => {
    mockAnalyze.mockRejectedValue('string error');

    const statuses: string[] = [];
    const onProgress = vi.fn((p) => statuses.push(p.status));

    await runAnalysis({ projectPath: '/project', onProgress }).catch(() => {});

    expect(statuses).toContain('failed');
  });

  it('pre-scan failure is non-fatal and analysis continues', async () => {
    mockScanDirectory.mockRejectedValue(new Error('scan failed'));
    // analyze should still be called
    mockAnalyze.mockResolvedValue(makeAnalyzeResult(5));

    const onProgress = vi.fn();
    const result = await runAnalysis({ projectPath: '/project', onProgress });

    expect(result).toBeDefined();
    expect(mockAnalyze).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// AbortSignal / cancellation
// ---------------------------------------------------------------------------

describe('runAnalysis — AbortSignal cancellation', () => {
  it('throws and reports failed when signal is already aborted before start', async () => {
    const controller = new AbortController();
    controller.abort();

    const statuses: string[] = [];
    const onProgress = vi.fn((p) => statuses.push(p.status));

    await expect(
      runAnalysis({ projectPath: '/project', onProgress, signal: controller.signal }),
    ).rejects.toThrow();

    expect(statuses).toContain('queued');
    expect(statuses).toContain('failed');
    expect(mockAnalyze).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Return value
// ---------------------------------------------------------------------------

describe('runAnalysis — return value', () => {
  it('returns the AnalysisResult from analyze()', async () => {
    const expectedResult = makeAnalyzeResult(20);
    mockAnalyze.mockResolvedValue(expectedResult);

    const result = await runAnalysis({ projectPath: '/project', onProgress: vi.fn() });

    expect(result).toBe(expectedResult);
  });

  it('calls analyze with the provided projectPath', async () => {
    await runAnalysis({ projectPath: '/my/project', onProgress: vi.fn() });

    expect(mockAnalyze).toHaveBeenCalledWith('/my/project', expect.any(Object));
  });

  it('passes ignoreDirs to analyze', async () => {
    await runAnalysis({
      projectPath: '/project',
      onProgress: vi.fn(),
      ignoreDirs: ['node_modules', 'dist'],
    });

    expect(mockAnalyze).toHaveBeenCalledWith(
      '/project',
      expect.objectContaining({ ignoreDirs: ['node_modules', 'dist'] }),
    );
  });
});
