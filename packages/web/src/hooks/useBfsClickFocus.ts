/**
 * CodeAtlas — useBfsClickFocus
 *
 * BFS click-focus hook for Logic Operation perspective.
 *
 * Unlike useBfsHoverHighlight (hover-based, transient),
 * this hook is click-based and persistent until resetSelection() is called.
 *
 * Sprint 12 — T6.
 */

import { useState, useCallback, useMemo } from 'react';
import type { GraphEdge } from '../types/graph';

export interface BfsClickFocusResult {
  selectedNodeId: string | null;
  focusedNodes: Set<string>;
  focusedEdges: Set<string>;
  chainLabel: string;
  chainNodeCount: number;
  selectNode: (nodeId: string, label?: string) => void;
  resetSelection: () => void;
}

/**
 * Returns the set of node/edge IDs reachable from selectedNodeId within maxDepth
 * hops in either direction (bidirectional BFS). Selection persists until
 * resetSelection() is called.
 *
 * @param edges     - Current graph edges (GraphEdge[])
 * @param maxDepth  - BFS max hops (default 5)
 */
export function useBfsClickFocus(
  edges: GraphEdge[],
  maxDepth: number = 5,
): BfsClickFocusResult {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [chainLabel, setChainLabel] = useState<string>('');

  const selectNode = useCallback((nodeId: string, label?: string) => {
    setSelectedNodeId(nodeId);
    setChainLabel(label ?? nodeId);
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedNodeId(null);
    setChainLabel('');
  }, []);

  const { focusedNodes, focusedEdges } = useMemo(() => {
    if (!selectedNodeId) {
      return { focusedNodes: new Set<string>(), focusedEdges: new Set<string>() };
    }

    // Build adjacency lookup tables
    const edgesBySource = new Map<string, GraphEdge[]>();
    const edgesByTarget = new Map<string, GraphEdge[]>();

    for (const edge of edges) {
      if (!edgesBySource.has(edge.source)) edgesBySource.set(edge.source, []);
      edgesBySource.get(edge.source)!.push(edge);

      if (!edgesByTarget.has(edge.target)) edgesByTarget.set(edge.target, []);
      edgesByTarget.get(edge.target)!.push(edge);
    }

    // BFS — bidirectional, up to maxDepth hops
    const visited = new Set<string>([selectedNodeId]);
    const visitedEdges = new Set<string>();
    const queue: Array<{ nodeId: string; depth: number }> = [
      { nodeId: selectedNodeId, depth: 0 },
    ];

    let qi = 0;
    while (qi < queue.length) {
      const { nodeId, depth } = queue[qi++]!;
      if (depth >= maxDepth) continue;

      // Forward edges (source → target)
      for (const edge of edgesBySource.get(nodeId) ?? []) {
        visitedEdges.add(edge.id);
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push({ nodeId: edge.target, depth: depth + 1 });
        }
      }

      // Backward edges (target → source)
      for (const edge of edgesByTarget.get(nodeId) ?? []) {
        visitedEdges.add(edge.id);
        if (!visited.has(edge.source)) {
          visited.add(edge.source);
          queue.push({ nodeId: edge.source, depth: depth + 1 });
        }
      }
    }

    return { focusedNodes: visited, focusedEdges: visitedEdges };
  }, [selectedNodeId, edges, maxDepth]);

  return {
    selectedNodeId,
    focusedNodes,
    focusedEdges,
    chainLabel,
    chainNodeCount: focusedNodes.size,
    selectNode,
    resetSelection,
  };
}
