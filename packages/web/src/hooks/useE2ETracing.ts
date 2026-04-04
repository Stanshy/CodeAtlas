/**
 * CodeAtlas — End-to-End Data Flow Tracing
 *
 * Pure function: traceE2E() — BFS traversal following all edge types forward.
 * React hook: useE2ETracing() — wraps traceE2E with ViewState integration.
 *
 * Sprint 9 — S9-3.
 */

import { useCallback } from 'react';
import { useViewState } from '../contexts/ViewStateContext';
import type { GraphNode, GraphEdge, E2EStep, E2ETracingResult } from '../types/graph';

// ---------------------------------------------------------------------------
// Pure function — traceE2E (unit-testable, no React dependency)
// ---------------------------------------------------------------------------

/**
 * End-to-end data flow tracing — mixed edge type BFS.
 *
 * Starting from startNodeId, follows ALL edge types forward
 * (where edge.source === current node) via BFS.
 *
 * Records each step's nodeId, nodeLabel, edgeId, edgeType, symbols, depth.
 *
 * Differences from analyzeImpact (Sprint 8):
 * 1. analyzeImpact supports forward/reverse; traceE2E is forward-only
 * 2. traceE2E records per-step symbol + edgeType (for panel display)
 * 3. traceE2E truncates at 30 nodes (panel readability), analyzeImpact at 50
 * 4. traceE2E preserves BFS order (steps array), analyzeImpact uses sets
 *
 * @param startNodeId - The entry point node ID
 * @param nodes - All graph nodes (for label lookup)
 * @param edges - All graph edges
 * @param maxDepth - Maximum BFS depth (default 10)
 * @returns E2ETracingResult with path, edges, steps, truncated flag
 */
export function traceE2E(
  startNodeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  maxDepth: number = 10,
): E2ETracingResult {
  // Build lookup map: nodeId -> node (for label access)
  const nodeMap = new Map<string, GraphNode>(nodes.map(n => [n.id, n]));

  // Build adjacency list: sourceId -> outgoing edges
  const adjacency = new Map<string, GraphEdge[]>();
  for (const edge of edges) {
    const existing = adjacency.get(edge.source);
    if (existing) {
      existing.push(edge);
    } else {
      adjacency.set(edge.source, [edge]);
    }
  }

  const startNode = nodeMap.get(startNodeId);
  const visited = new Set<string>([startNodeId]);

  const result: E2ETracingResult = {
    path: [startNodeId],
    edges: [],
    steps: [
      {
        nodeId: startNodeId,
        nodeLabel: startNode?.label ?? startNodeId,
        edgeId: null,
        edgeType: null,
        symbols: [],
        depth: 0,
      },
    ],
    truncated: false,
  };

  // BFS queue
  const queue: Array<{ nodeId: string; depth: number }> = [
    { nodeId: startNodeId, depth: 0 },
  ];

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;

    // Depth limit check
    if (depth >= maxDepth) continue;

    // Truncation check: if path already has 30+ nodes, mark truncated and stop
    if (result.path.length >= 30) {
      result.truncated = true;
      break;
    }

    // Get outgoing edges from current node
    const outEdges = adjacency.get(nodeId) ?? [];

    for (const edge of outEdges) {
      const targetId = edge.target;

      // Cycle detection: skip already visited nodes
      if (visited.has(targetId)) continue;
      visited.add(targetId);

      const targetNode = nodeMap.get(targetId);
      const symbols = edge.metadata.importedSymbols ?? [];

      // Record step
      const step: E2EStep = {
        nodeId: targetId,
        nodeLabel: targetNode?.label ?? targetId,
        edgeId: edge.id,
        edgeType: edge.type,
        symbols,
        depth: depth + 1,
      };

      result.path.push(targetId);
      result.edges.push(edge.id);
      result.steps.push(step);

      // Continue BFS
      queue.push({ nodeId: targetId, depth: depth + 1 });

      // Check truncation after adding
      if (result.path.length >= 30) {
        result.truncated = true;
        break;
      }
    }

    // Break outer loop too if truncated
    if (result.truncated) break;
  }

  return result;
}

// ---------------------------------------------------------------------------
// React Hook — useE2ETracing
// ---------------------------------------------------------------------------

interface UseE2ETracingOptions {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function useE2ETracing({ nodes, edges }: UseE2ETracingOptions) {
  const { state, dispatch } = useViewState();

  const startTracing = useCallback(
    (nodeId: string) => {
      const maxDepth = state.e2eTracing?.maxDepth ?? 10;
      const result = traceE2E(nodeId, nodes, edges, maxDepth);
      dispatch({
        type: 'START_E2E_TRACING',
        startNodeId: nodeId,
        path: result.path,
        edges: result.edges,
        steps: result.steps,
        truncated: result.truncated,
      });
    },
    [nodes, edges, state.e2eTracing?.maxDepth, dispatch],
  );

  const updateDepth = useCallback(
    (maxDepth: number) => {
      const startNodeId = state.e2eTracing?.startNodeId;
      if (!startNodeId) return;
      const result = traceE2E(startNodeId, nodes, edges, maxDepth);
      dispatch({
        type: 'UPDATE_E2E_DEPTH',
        maxDepth,
        path: result.path,
        edges: result.edges,
        steps: result.steps,
        truncated: result.truncated,
      });
    },
    [nodes, edges, state.e2eTracing?.startNodeId, dispatch],
  );

  const clearTracing = useCallback(() => {
    dispatch({ type: 'CLEAR_E2E_TRACING' });
  }, [dispatch]);

  return {
    e2eTracing: state.e2eTracing,
    isE2ESelecting: state.isE2ESelecting,
    startTracing,
    updateDepth,
    clearTracing,
  };
}
