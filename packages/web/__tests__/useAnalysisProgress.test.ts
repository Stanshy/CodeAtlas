/**
 * Unit tests for useAnalysisProgress hook (Sprint 20 T11)
 *
 * Coverage:
 *   - Attempts SSE connection via EventSource
 *   - Sets progress on SSE message event
 *   - Falls back to polling when SSE onerror fires
 *   - Polling calls fetch with correct URL
 *   - Polling stops when terminal status received
 *   - Cleans up EventSource on unmount
 *   - Falls back to polling when EventSource constructor throws
 *   - Does nothing when jobId is empty
 *   - Malformed SSE data is ignored gracefully
 *   - Error state set when polling fetch fails
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { AnalysisProgress } from '../src/hooks/useAnalysisProgress';
import { useAnalysisProgress } from '../src/hooks/useAnalysisProgress';

// ---------------------------------------------------------------------------
// EventSource mock
// ---------------------------------------------------------------------------

interface MockEventSourceInstance {
  url: string;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: (() => void) | null;
  close: ReturnType<typeof vi.fn>;
  _simulateMessage: (data: AnalysisProgress) => void;
  _simulateError: () => void;
}

const mockEventSourceInstances: MockEventSourceInstance[] = [];

class MockEventSource {
  url: string;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    mockEventSourceInstances.push(this);
  }

  _simulateMessage(data: AnalysisProgress) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  _simulateError() {
    this.onerror?.();
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeScanningProgress(jobId = 'job-123'): AnalysisProgress {
  return {
    jobId,
    status: 'scanning',
    startedAt: new Date().toISOString(),
    stages: {
      scanning: { status: 'running', progress: 50 },
      parsing: { status: 'pending', progress: 0 },
      building: { status: 'pending', progress: 0 },
    },
  };
}

function makeCompletedProgress(jobId = 'job-123'): AnalysisProgress {
  return {
    jobId,
    status: 'completed',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    stages: {
      scanning: { status: 'completed', progress: 100 },
      parsing: { status: 'completed', progress: 100 },
      building: { status: 'completed', progress: 100 },
    },
  };
}

function makeFailedProgress(jobId = 'job-123'): AnalysisProgress {
  return {
    jobId,
    status: 'failed',
    error: 'Something went wrong',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    stages: {
      scanning: { status: 'completed', progress: 100 },
      parsing: { status: 'failed', progress: 30 },
      building: { status: 'pending', progress: 0 },
    },
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockEventSourceInstances.length = 0;
  vi.clearAllMocks();
  // Default global.EventSource to mock
  global.EventSource = MockEventSource as unknown as typeof EventSource;
  // Default fetch returns scanning progress
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => makeScanningProgress(),
  });
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// SSE connection
// ---------------------------------------------------------------------------

describe('useAnalysisProgress — SSE connection', () => {
  it('creates an EventSource for the correct URL', () => {
    renderHook(() => useAnalysisProgress('job-123'));

    expect(mockEventSourceInstances).toHaveLength(1);
    expect(mockEventSourceInstances[0].url).toBe('/api/project/progress/job-123');
  });

  it('does nothing when jobId is empty string', () => {
    renderHook(() => useAnalysisProgress(''));

    expect(mockEventSourceInstances).toHaveLength(0);
  });

  it('starts with null progress and null error', () => {
    const { result } = renderHook(() => useAnalysisProgress('job-123'));

    expect(result.current.progress).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('updates progress when SSE message is received', () => {
    const { result } = renderHook(() => useAnalysisProgress('job-123'));

    act(() => {
      mockEventSourceInstances[0]._simulateMessage(makeScanningProgress());
    });

    expect(result.current.progress?.status).toBe('scanning');
    expect(result.current.progress?.jobId).toBe('job-123');
  });

  it('closes EventSource when completed status is received via SSE', () => {
    const { result } = renderHook(() => useAnalysisProgress('job-123'));
    const es = mockEventSourceInstances[0];

    act(() => {
      es._simulateMessage(makeCompletedProgress());
    });

    expect(result.current.progress?.status).toBe('completed');
    expect(es.close).toHaveBeenCalledOnce();
  });

  it('closes EventSource when failed status is received via SSE', () => {
    renderHook(() => useAnalysisProgress('job-123'));
    const es = mockEventSourceInstances[0];

    act(() => {
      es._simulateMessage(makeFailedProgress());
    });

    expect(es.close).toHaveBeenCalledOnce();
  });

  it('ignores malformed SSE data without throwing', () => {
    const { result } = renderHook(() => useAnalysisProgress('job-123'));

    act(() => {
      mockEventSourceInstances[0].onmessage?.({ data: 'NOT VALID JSON {{{' });
    });

    // No crash, progress stays null
    expect(result.current.progress).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('closes EventSource on unmount', () => {
    const { unmount } = renderHook(() => useAnalysisProgress('job-123'));
    const es = mockEventSourceInstances[0];

    unmount();

    expect(es.close).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Polling fallback
// ---------------------------------------------------------------------------

describe('useAnalysisProgress — polling fallback', () => {
  it('starts polling when SSE onerror fires', async () => {
    renderHook(() => useAnalysisProgress('job-123'));
    const es = mockEventSourceInstances[0];

    act(() => {
      es._simulateError();
    });

    // Wait for polling fetch to be called
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/project/progress/job-123');
  });

  it('updates progress from polling response', async () => {
    const pollingProgress = makeScanningProgress();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => pollingProgress,
    });

    const { result } = renderHook(() => useAnalysisProgress('job-123'));

    act(() => {
      mockEventSourceInstances[0]._simulateError();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(result.current.progress?.status).toBe('scanning');
  });

  it('falls back to polling when EventSource constructor throws', async () => {
    global.EventSource = (() => { throw new Error('EventSource not available'); }) as unknown as typeof EventSource;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeScanningProgress(),
    });

    const { result } = renderHook(() => useAnalysisProgress('job-456'));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/project/progress/job-456');
    expect(result.current.progress?.status).toBe('scanning');
  });

  it('stops polling when completed status is received via polling', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        json: async () => makeCompletedProgress(),
      };
    });

    renderHook(() => useAnalysisProgress('job-123'));

    act(() => {
      mockEventSourceInstances[0]._simulateError();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const fetchCallsAtCompletion = callCount;

    // Wait more time to confirm no additional polling
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(callCount).toBe(fetchCallsAtCompletion);
  });

  it('stops polling when failed status is received via polling', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        json: async () => makeFailedProgress(),
      };
    });

    renderHook(() => useAnalysisProgress('job-123'));

    act(() => {
      mockEventSourceInstances[0]._simulateError();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const fetchCallsAtFailure = callCount;

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(callCount).toBe(fetchCallsAtFailure);
  });

  it('sets error state when polling fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAnalysisProgress('job-123'));

    act(() => {
      mockEventSourceInstances[0]._simulateError();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(result.current.error).not.toBeNull();
  });

  it('sets error state when polling fetch returns non-ok status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'not_found' }),
    });

    const { result } = renderHook(() => useAnalysisProgress('job-123'));

    act(() => {
      mockEventSourceInstances[0]._simulateError();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.error).toContain('404');
  });

  it('cleans up polling timer on unmount', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeScanningProgress(),
    });

    const { unmount } = renderHook(() => useAnalysisProgress('job-123'));

    act(() => {
      mockEventSourceInstances[0]._simulateError();
    });

    // Unmount before polling fires again
    unmount();

    // Verify no fetch calls after unmount (timer should be cleared)
    const callsBeforeUnmount = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsBeforeUnmount);
  });
});
