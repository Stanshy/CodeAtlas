/**
 * useGraphAdjacency — shared adjacency map hook (Sprint 17 T9)
 *
 * Builds a bidirectional adjacency map from a GraphEdge array.
 *
 * Integration:
 *   - useHoverHighlight (2D): builds a richer structure (outEdges, inEdges,
 *     connectedNodes, edgeMap) from React Flow Edge objects. Because it
 *     operates on RF Edge types and is tightly coupled with hover state
 *     management, we leave it unchanged and do not integrate here.
 *   - Available for future renderers (e.g. Wiki knowledge graph) that need
 *     a lightweight bidirectional adjacency structure.
 */

import { useMemo } from 'react';
import type { GraphEdge } from '../types/graph';

export interface UseGraphAdjacencyResult {
  /** Bidirectional neighbour map: nodeId → Set of directly connected nodeIds */
  connectedNodes: Map<string, Set<string>>;
}

/**
 * Build a bidirectional adjacency map from an edge list.
 *
 * @param edges  GraphEdge array (typically the curated/filtered edges)
 * @returns      Object containing a stable `connectedNodes` Map
 */
export function useGraphAdjacency(edges: GraphEdge[]): UseGraphAdjacencyResult {
  return useMemo(() => {
    const connectedNodes = new Map<string, Set<string>>();
    for (const e of edges) {
      if (!connectedNodes.has(e.source)) connectedNodes.set(e.source, new Set());
      if (!connectedNodes.has(e.target)) connectedNodes.set(e.target, new Set());
      connectedNodes.get(e.source)!.add(e.target);
      connectedNodes.get(e.target)!.add(e.source);
    }
    return { connectedNodes };
  }, [edges]);
}
