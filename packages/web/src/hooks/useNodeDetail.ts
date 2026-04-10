/**
 * CodeAtlas Web — useNodeDetail Hook
 *
 * Fetches node detail (metadata, edges, source code) from /api/node/:id.
 * Returns loading/error/data states for the NodePanel.
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchNodeDetail } from '../api/node';
import type { NodeDetailResponse } from '../types/graph';

export interface UseNodeDetailResult {
  detail: NodeDetailResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useNodeDetail(nodeId: string | null): UseNodeDetailResult {
  const [detail, setDetail] = useState<NodeDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    setDetail(null);

    const result = await fetchNodeDetail(id);

    if (!result.ok) {
      setError(result.error.message);
      setIsLoading(false);
      return;
    }

    setDetail(result.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!nodeId) {
      setDetail(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    void loadDetail(nodeId);
  }, [nodeId, loadDetail]);

  const refetch = useCallback(() => {
    if (nodeId) {
      void loadDetail(nodeId);
    }
  }, [nodeId, loadDetail]);

  return { detail, isLoading, error, refetch };
}
