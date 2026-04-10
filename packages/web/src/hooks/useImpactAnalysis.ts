/**
 * CodeAtlas — useImpactAnalysis Hook
 *
 * BFS-based impact analysis: given a starting node and a direction, traverses
 * the graph edges to find all upstream (reverse) or downstream (forward) nodes
 * within a configurable depth limit, then dispatches the result to
 * ViewStateContext.
 *
 * Sprint 8 — T3: useImpactAnalysis hook
 * Design: .knowledge/sprint8-impact-architecture.md
 */

import { useCallback } from 'react';
import { useViewState } from '../contexts/ViewStateContext';
import type { GraphEdge, ImpactAnalysisResult } from '../types/graph';

// ---------------------------------------------------------------------------
// Pure Function — analyzeImpact
// ---------------------------------------------------------------------------

/**
 * BFS impact analysis — pure function (no React dependency)
 *
 * Forward: follow edges where source === current node (find downstream)
 * Reverse: follow edges where target === current node (find upstream)
 *
 * Supports all edge types: import/export/data-flow/call
 */
export function analyzeImpact(
  startNodeId: string,
  edges: GraphEdge[],
  direction: 'forward' | 'reverse',
  maxDepth: number = 5,
): ImpactAnalysisResult {
  const visited = new Set<string>();
  const impactedEdges: string[] = [];
  const depthMap = new Map<string, number>();
  const queue: Array<{ nodeId: string; depth: number }> = [];

  visited.add(startNodeId);
  depthMap.set(startNodeId, 0);
  queue.push({ nodeId: startNodeId, depth: 0 });

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

    for (const edge of edges) {
      const [from, to] = direction === 'forward'
        ? [edge.source, edge.target]
        : [edge.target, edge.source];

      if (from === nodeId && !visited.has(to)) {
        visited.add(to);
        depthMap.set(to, depth + 1);
        impactedEdges.push(edge.id);
        queue.push({ nodeId: to, depth: depth + 1 });
      }
    }
  }

  const impactedNodes = Array.from(visited);
  const truncated = impactedNodes.length > 51;
  if (truncated) {
    impactedNodes.length = 51;
  }

  return {
    impactedNodes,
    impactedEdges,
    depthMap: Object.fromEntries(depthMap),
    truncated,
  };
}

// ---------------------------------------------------------------------------
// React Hook — useImpactAnalysis
// ---------------------------------------------------------------------------

/**
 * React hook wrapping analyzeImpact with ViewState dispatch.
 *
 * @param edges - All graph edges (from GraphContext or prop)
 */
export function useImpactAnalysis(edges: GraphEdge[]) {
  const { state, dispatch } = useViewState();

  const analyze = useCallback(
    (nodeId: string, direction: 'forward' | 'reverse') => {
      const maxDepth = state.impactAnalysis?.maxDepth ?? 5;
      const result = analyzeImpact(nodeId, edges, direction, maxDepth);
      dispatch({
        type: 'IMPACT_ANALYZE',
        direction,
        targetNodeId: nodeId,
        impactedNodes: result.impactedNodes,
        impactedEdges: result.impactedEdges,
        depthMap: result.depthMap,
      });
    },
    [edges, state.impactAnalysis?.maxDepth, dispatch],
  );

  const updateDepth = useCallback(
    (maxDepth: number) => {
      if (!state.impactAnalysis?.targetNodeId || !state.impactAnalysis.direction) return;
      const result = analyzeImpact(
        state.impactAnalysis.targetNodeId,
        edges,
        state.impactAnalysis.direction,
        maxDepth,
      );
      dispatch({
        type: 'UPDATE_IMPACT_DEPTH',
        maxDepth,
        impactedNodes: result.impactedNodes,
        impactedEdges: result.impactedEdges,
        depthMap: result.depthMap,
      });
    },
    [state.impactAnalysis, edges, dispatch],
  );

  const clearImpact = useCallback(() => {
    dispatch({ type: 'CLEAR_IMPACT' });
  }, [dispatch]);

  return {
    analyze,
    updateDepth,
    clearImpact,
    impactState: state.impactAnalysis,
  };
}
