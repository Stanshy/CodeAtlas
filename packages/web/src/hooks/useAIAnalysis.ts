/**
 * CodeAtlas — useAIAnalysis Hook (Sprint 16)
 *
 * On-demand AI analysis hook for three-perspective cards.
 * Uses a module-level store (useSyncExternalStore) so that:
 *   1. State persists across component unmount/remount (view switches)
 *   2. Multiple hook instances for the same scope+target share state
 *
 * State machine: idle -> analyzing -> succeeded / failed
 * Polls getAIJob every 2s until terminal state, then stops.
 *
 * Design source: proposal/references/sprint16/g1-ai-experience-mockup.html
 */

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { postAIAnalyze, getAIJob } from '../api/graph';
import type { AIJobScope, AIJob } from '../types/graph';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AIAnalysisStatus = 'idle' | 'analyzing' | 'succeeded' | 'failed';

export interface UseAIAnalysisReturn {
  status: AIAnalysisStatus;
  error: string | undefined;
  analyze: (force?: boolean) => void;
  job: AIJob | undefined;
}

// ---------------------------------------------------------------------------
// Module-level shared store
//
// Survives component unmount/remount (view switches) and ensures multiple
// hook instances for the same scope+target always see the same state.
// ---------------------------------------------------------------------------

interface CachedAnalysis {
  status: AIAnalysisStatus;
  error?: string;
  job?: AIJob;
}

const _store = new Map<string, CachedAnalysis>();
const _subscribers = new Map<string, Set<() => void>>();
const DEFAULT_STATE: CachedAnalysis = { status: 'idle' };

function getCacheKey(scope: AIJobScope, target?: string): string {
  return `${scope}:${target ?? 'all'}`;
}

function getSnapshot(key: string): CachedAnalysis {
  return _store.get(key) ?? DEFAULT_STATE;
}

function subscribeToKey(key: string, callback: () => void): () => void {
  if (!_subscribers.has(key)) _subscribers.set(key, new Set());
  _subscribers.get(key)!.add(callback);
  return () => {
    _subscribers.get(key)?.delete(callback);
  };
}

function updateStore(key: string, state: CachedAnalysis): void {
  _store.set(key, state);
  _subscribers.get(key)?.forEach((cb) => cb());
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAIAnalysis(scope: AIJobScope, target?: string): UseAIAnalysisReturn {
  const cacheKey = getCacheKey(scope, target);

  const state = useSyncExternalStore(
    useCallback((cb: () => void) => subscribeToKey(cacheKey, cb), [cacheKey]),
    useCallback(() => getSnapshot(cacheKey), [cacheKey]),
  );

  // Polling timer ref — cleared on unmount
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current !== null) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // Poll job status until terminal state
  const pollJob = useCallback(
    async (jobId: string) => {
      if (cancelledRef.current) return;

      try {
        const response = await getAIJob(jobId);
        if (cancelledRef.current) return;

        const currentJob = response.job;

        if (currentJob.status === 'succeeded' || currentJob.status === 'cached') {
          updateStore(cacheKey, { status: 'succeeded', job: currentJob });
          return;
        }

        if (currentJob.status === 'failed' || currentJob.status === 'canceled') {
          updateStore(cacheKey, {
            status: 'failed',
            error: currentJob.error ?? '分析失敗',
            job: currentJob,
          });
          return;
        }

        // Still running (queued / running) — schedule next poll in 2s
        if (!cancelledRef.current) {
          pollTimerRef.current = setTimeout(() => {
            void pollJob(jobId);
          }, 2000);
        }
      } catch (err: unknown) {
        if (cancelledRef.current) return;
        updateStore(cacheKey, {
          status: 'failed',
          error: err instanceof Error ? err.message : '輪詢失敗',
        });
      }
    },
    [cacheKey],
  );

  // On mount: check AI status + resume polling if needed
  useEffect(() => {
    cancelledRef.current = false;
    const current = getSnapshot(cacheKey);

    // If idle, check AI provider status upfront so disabled state shows immediately
    if (current.status === 'idle') {
      void (async () => {
        try {
          const res = await fetch('/api/ai/status');
          if (res.ok) {
            const data = (await res.json()) as { enabled?: boolean; provider?: string };
            if (!data.enabled || data.provider === 'disabled') {
              updateStore(cacheKey, { status: 'failed', error: 'AI_DISABLED' });
            }
          }
        } catch {
          // Can't check — leave as idle, will check on analyze()
        }
      })();
    }

    if (current.status === 'analyzing' && current.job?.jobId) {
      void pollJob(current.job.jobId);
    }
    return () => {
      cancelledRef.current = true;
      clearPollTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  // analyze() — check AI status, then trigger job
  const analyze = useCallback(
    async (force = false) => {
      // Read directly from store to avoid stale closure
      const current = getSnapshot(cacheKey);
      if (current.status === 'analyzing') return;

      clearPollTimer();

      // Check if AI is enabled before attempting
      try {
        const res = await fetch('/api/ai/status');
        if (res.ok) {
          const statusData = (await res.json()) as { enabled?: boolean; provider?: string };
          if (!statusData.enabled || statusData.provider === 'disabled') {
            updateStore(cacheKey, { status: 'failed', error: 'AI_DISABLED' });
            return;
          }
        }
      } catch {
        // If we can't check status, proceed anyway and let the API fail
      }

      updateStore(cacheKey, { status: 'analyzing' });

      try {
        const response = await postAIAnalyze(scope, target, force);
        if (cancelledRef.current) return;

        const startedJob = response.job;

        // If already cached/succeeded, no polling needed
        if (startedJob.status === 'succeeded' || startedJob.status === 'cached') {
          updateStore(cacheKey, { status: 'succeeded', job: startedJob });
          return;
        }

        if (startedJob.status === 'failed' || startedJob.status === 'canceled') {
          updateStore(cacheKey, {
            status: 'failed',
            error: startedJob.error ?? '分析失敗',
            job: startedJob,
          });
          return;
        }

        // Start polling
        updateStore(cacheKey, { status: 'analyzing', job: startedJob });
        void pollJob(startedJob.jobId);
      } catch (err: unknown) {
        if (cancelledRef.current) return;
        updateStore(cacheKey, {
          status: 'failed',
          error: err instanceof Error ? err.message : '分析失敗',
        });
      }
    },
    [scope, target, cacheKey, clearPollTimer, pollJob],
  );

  return {
    status: state.status,
    error: state.error,
    analyze,
    job: state.job,
  };
}
