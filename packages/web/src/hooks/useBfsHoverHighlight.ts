/**
 * CodeAtlas — useBfsHoverHighlight
 *
 * BFS bidirectional multi-hop hover highlight for logic-operation perspective.
 * Traverses forward (source → target) and backward (target → source) edges
 * up to maxDepth hops from the hovered node.
 *
 * Sprint 11 — T6.
 */

import { useMemo } from 'react';
import type { GraphEdge } from '../types/graph';

export interface BfsHighlightResult {
  highlightedNodes: Set<string>;
  highlightedEdges: Set<string>;
}

/**
 * Returns the set of node/edge IDs reachable from hoveredNodeId within maxDepth
 * hops in either direction.
 *
 * Returns empty sets when hoveredNodeId is null.
 */
export function useBfsHoverHighlight(
  hoveredNodeId: string | null,
  edges: GraphEdge[],
  maxDepth: number = 5,
): BfsHighlightResult {
  return useMemo(() => {
    if (!hoveredNodeId) {
      return { highlightedNodes: new Set<string>(), highlightedEdges: new Set<string>() };
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

    // BFS
    const visited = new Set<string>([hoveredNodeId]);
    const visitedEdges = new Set<string>();
    const queue: Array<{ nodeId: string; depth: number }> = [
      { nodeId: hoveredNodeId, depth: 0 },
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

    return { highlightedNodes: visited, highlightedEdges: visitedEdges };
  }, [hoveredNodeId, edges, maxDepth]);
}
