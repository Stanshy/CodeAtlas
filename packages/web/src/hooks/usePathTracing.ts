/**
 * CodeAtlas — usePathTracing Hook
 *
 * Path tracing logic: given graph nodes/edges, computes the propagation path
 * for a symbol and dispatches START_TRACING / STOP_TRACING to ViewStateContext.
 *
 * Sprint 5 — T5: 路徑追蹤模式（2D + 3D）
 * Design: .knowledge/sprint5-dataflow-architecture.md §4, §5.2
 */

import { useCallback, useEffect } from 'react';
import { useViewState } from '../contexts/ViewStateContext';
import { traceSymbolPath } from '../utils/path-tracer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PathTracingActions {
  /** Start tracing the given symbol — computes path and dispatches START_TRACING */
  startTracing: (symbol: string) => void;
  /** Stop tracing — dispatches STOP_TRACING */
  stopTracing: () => void;
  /** Whether tracing mode is currently active */
  isTracing: boolean;
  /** The symbol currently being traced (null when not tracing) */
  tracingSymbol: string | null;
  /** Ordered node IDs on the traced path */
  tracingPath: string[];
  /** Edge IDs on the traced path */
  tracingEdges: string[];
}

// Compatible with both ReactFlow Node/Edge types and raw GraphNode/GraphEdge
type TraceNode = { id: string };
type TraceEdge = {
  id: string;
  source: string;
  target: string;
  metadata: { importedSymbols?: string[] };
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Path tracing logic hook.
 *
 * Accepts the graph's nodes and edges, calls traceSymbolPath() to compute the
 * propagation path, and syncs state with ViewStateContext.
 *
 * Also registers a global Escape key listener that stops tracing while active.
 */
export function usePathTracing(
  nodes: TraceNode[],
  edges: TraceEdge[],
): PathTracingActions {
  const { state, dispatch } = useViewState();
  const { tracingSymbol, tracingPath, tracingEdges } = state;
  const isTracing = tracingSymbol !== null;

  // ---------------------------------------------------------------------------
  // startTracing
  // ---------------------------------------------------------------------------
  const startTracing = useCallback(
    (symbol: string) => {
      const result = traceSymbolPath({ symbol, nodes, edges });
      dispatch({
        type: 'START_TRACING',
        symbol,
        path: result.path,
        edges: result.edges,
      });
    },
    [nodes, edges, dispatch],
  );

  // ---------------------------------------------------------------------------
  // stopTracing
  // ---------------------------------------------------------------------------
  const stopTracing = useCallback(() => {
    dispatch({ type: 'STOP_TRACING' });
  }, [dispatch]);

  // ---------------------------------------------------------------------------
  // Escape key listener — exit tracing mode
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isTracing) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        dispatch({ type: 'STOP_TRACING' });
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTracing, dispatch]);

  return {
    startTracing,
    stopTracing,
    isTracing,
    tracingSymbol,
    tracingPath,
    tracingEdges,
  };
}
