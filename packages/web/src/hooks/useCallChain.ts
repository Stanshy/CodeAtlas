/**
 * CodeAtlas — useCallChain Hook
 *
 * BFS-based call chain tracer for function-level call graphs.
 * Reuses Sprint 5 path tracing pattern but for call edges.
 * Sprint 7 — T10
 */

import { useCallback } from 'react';
import type { GraphEdge } from '../types/graph';

export interface CallChainResult {
  path: string[];    // ordered node IDs
  edges: string[];   // edge IDs on the path
}

/**
 * BFS-based call chain tracer.
 * Traverses call edges from a starting function node.
 *
 * @param startFunctionId - ID of the function to start tracing from
 * @param allEdges - All graph edges (only 'call' type edges are used)
 * @param direction - 'callers' = upstream, 'callees' = downstream, 'both' = full chain
 * @param maxDepth - Maximum BFS depth (default: 5)
 */
export function traceCallChain(
  startFunctionId: string,
  allEdges: GraphEdge[],
  direction: 'callers' | 'callees' | 'both' = 'both',
  maxDepth: number = 5,
): CallChainResult {
  const callEdges = allEdges.filter((e) => e.type === 'call');
  const path: string[] = [startFunctionId];
  const edgeIds: string[] = [];
  const visited = new Set<string>([startFunctionId]);

  // BFS with depth tracking
  let frontier = [startFunctionId];
  let depth = 0;

  while (frontier.length > 0 && depth < maxDepth) {
    const nextFrontier: string[] = [];

    for (const nodeId of frontier) {
      const neighbors: Array<{ nodeId: string; edgeId: string }> = [];

      if (direction === 'callees' || direction === 'both') {
        // Forward: this node calls others
        for (const edge of callEdges) {
          if (edge.source === nodeId && !visited.has(edge.target)) {
            neighbors.push({ nodeId: edge.target, edgeId: edge.id });
          }
        }
      }

      if (direction === 'callers' || direction === 'both') {
        // Backward: others call this node
        for (const edge of callEdges) {
          if (edge.target === nodeId && !visited.has(edge.source)) {
            neighbors.push({ nodeId: edge.source, edgeId: edge.id });
          }
        }
      }

      for (const { nodeId: nid, edgeId } of neighbors) {
        if (!visited.has(nid)) {
          visited.add(nid);
          path.push(nid);
          edgeIds.push(edgeId);
          nextFrontier.push(nid);
        }
      }
    }

    frontier = nextFrontier;
    depth++;
  }

  return { path, edges: edgeIds };
}

/**
 * React hook that wraps traceCallChain in a stable useCallback.
 */
export function useCallChain() {
  const trace = useCallback(
    (
      startFunctionId: string,
      allEdges: GraphEdge[],
      direction: 'callers' | 'callees' | 'both' = 'both',
      maxDepth: number = 5,
    ): CallChainResult => {
      return traceCallChain(startFunctionId, allEdges, direction, maxDepth);
    },
    [],
  );

  return { trace };
}
