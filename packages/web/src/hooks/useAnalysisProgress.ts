/**
 * CodeAtlas — useAnalysisProgress
 *
 * Subscribes to analysis progress for a given jobId.
 * Primary: EventSource (SSE) on /api/project/progress/:jobId
 * Fallback: polling every 2 seconds if SSE fails (onerror)
 *
 * Sprint 20 — T11
 */

import { useState, useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types (re-declared locally — web does not import core directly)
// ---------------------------------------------------------------------------

export interface StageProgress {
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed';
  progress: number;       // 0-100
  current?: string;       // current file name
  total?: number;
  done?: number;
}

export interface AnalysisProgress {
  jobId: string;
  status: 'queued' | 'scanning' | 'parsing' | 'building' | 'ai_analyzing' | 'completed' | 'failed';
  stages: {
    scanning:     StageProgress;
    parsing:      StageProgress;
    building:     StageProgress;
    ai_analyzing?: StageProgress;
  };
  error?: string;
  startedAt: string;
  completedAt?: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseAnalysisProgressResult {
  progress: AnalysisProgress | null;
  error: string | null;
}

const POLL_INTERVAL_MS = 2000;

export function useAnalysisProgress(jobId: string): UseAnalysisProgressResult {
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const usingPolling = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!jobId) return;

    mountedRef.current = true;

    const stopPolling = () => {
      if (pollingTimer.current) {
        clearTimeout(pollingTimer.current);
        pollingTimer.current = null;
      }
    };

    const poll = async () => {
      if (!mountedRef.current) return;
      try {
        const res = await fetch(`/api/project/progress/${jobId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: AnalysisProgress = await res.json();
        if (mountedRef.current) {
          setProgress(data);
          // Continue polling unless terminal
          if (data.status !== 'completed' && data.status !== 'failed') {
            pollingTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
          }
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : '輪詢失敗');
        }
      }
    };

    const startPolling = () => {
      usingPolling.current = true;
      poll();
    };

    // ── Try SSE first ──────────────────────────────────────────────────────

    try {
      const es = new EventSource(`/api/project/progress/${jobId}`);
      esRef.current = es;

      es.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data: AnalysisProgress = JSON.parse(event.data);
          setProgress(data);
          // Close SSE when done
          if (data.status === 'completed' || data.status === 'failed') {
            es.close();
          }
        } catch {
          // ignore malformed message
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (!mountedRef.current) return;
        // Degrade to polling
        if (!usingPolling.current) {
          startPolling();
        }
      };
    } catch {
      // EventSource not available — go straight to polling
      startPolling();
    }

    return () => {
      mountedRef.current = false;
      stopPolling();
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [jobId]);

  return { progress, error };
}
