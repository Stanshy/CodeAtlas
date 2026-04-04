/**
 * CodeAtlas Web — useAiSummary Hook
 *
 * Manages AI summary fetching for a node.
 * Returns loading/error/result states and a regenerate function.
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchAiSummary, fetchAiStatus } from '../api/ai';

export interface UseAiSummaryResult {
  summary: string | null;
  isLoading: boolean;
  error: string | null;
  isConfigured: boolean | null; // null = unknown yet
  cached: boolean;
  provider: string | null;
  mode: 'disabled' | 'local' | 'cloud' | undefined;
  model: string | null;
  regenerate: () => void;
}

export function useAiSummary(nodeId: string | null): UseAiSummaryResult {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [cached, setCached] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [mode, setMode] = useState<'disabled' | 'local' | 'cloud' | undefined>(undefined);
  const [model, setModel] = useState<string | null>(null);

  // Check AI status on mount
  useEffect(() => {
    async function checkStatus() {
      const result = await fetchAiStatus();
      if (result.ok) {
        setIsConfigured(result.data.enabled);
        setProvider(result.data.provider);
        setMode(result.data.mode);
        setModel(result.data.model ?? null);
      } else {
        setIsConfigured(false);
      }
    }
    void checkStatus();
  }, []);

  const loadSummary = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    setSummary(null);
    setCached(false);

    const result = await fetchAiSummary(id);

    if (!result.ok) {
      // ai_not_configured is not an error — it's a graceful degradation
      if (result.error.code === 'ai_not_configured') {
        setIsConfigured(false);
        setIsLoading(false);
        return;
      }
      setError(result.error.message);
      setIsLoading(false);
      return;
    }

    setSummary(result.data.summary);
    setCached(result.data.cached);
    setProvider(result.data.provider);
    setIsLoading(false);
  }, []);

  // Auto-fetch when nodeId changes and AI is configured
  useEffect(() => {
    if (!nodeId || isConfigured === false) {
      setSummary(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    // After early return above, isConfigured is true or null (unknown).
    // Fetch if configured or still checking (null = haven't checked yet).
    void loadSummary(nodeId);
  }, [nodeId, isConfigured, loadSummary]);

  const regenerate = useCallback(() => {
    if (nodeId) {
      void loadSummary(nodeId);
    }
  }, [nodeId, loadSummary]);

  return { summary, isLoading, error, isConfigured, cached, provider, mode, model, regenerate };
}
