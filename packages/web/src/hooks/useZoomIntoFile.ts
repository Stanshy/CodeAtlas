/**
 * CodeAtlas — useZoomIntoFile Hook
 *
 * Fetches function/class nodes for a specific file and dispatches
 * ZOOM_INTO_FILE to expand that file in the graph.
 * Uses an in-memory cache to avoid redundant API calls.
 * Sprint 7 — T9
 */

import { useCallback } from 'react';
import { useViewState } from '../contexts/ViewStateContext';
import { fetchFunctionNodes } from '../api/graph';
import type { GraphNode, GraphEdge } from '../types/graph';

// Module-level cache to persist across component re-mounts
const functionNodesCache = new Map<string, { nodes: GraphNode[]; edges: GraphEdge[] }>();

export function useZoomIntoFile() {
  const { state, dispatch } = useViewState();

  const zoomInto = useCallback(
    async (fileId: string): Promise<void> => {
      // If already expanded with this file, zoom out (toggle)
      if (state.expandedFileId === fileId) {
        dispatch({ type: 'ZOOM_OUT_FILE' });
        return;
      }

      // Check cache first
      let data = functionNodesCache.get(fileId);

      if (!data) {
        const result = await fetchFunctionNodes(fileId);
        if (!result.ok) {
          // Fetch failed — silently return; caller can handle error reporting
          return;
        }
        data = { nodes: result.data.nodes, edges: result.data.edges };
        functionNodesCache.set(fileId, data);
      }

      // No functions in this file — nothing to expand
      if (data.nodes.length === 0) {
        return;
      }

      dispatch({
        type: 'ZOOM_INTO_FILE',
        fileId,
        nodes: data.nodes,
        edges: data.edges,
      });
    },
    [state.expandedFileId, dispatch],
  );

  const zoomOut = useCallback((): void => {
    dispatch({ type: 'ZOOM_OUT_FILE' });
  }, [dispatch]);

  return {
    zoomInto,
    zoomOut,
    expandedFileId: state.expandedFileId,
  };
}
