/**
 * CodeAtlas — path-tracer
 *
 * Pure utility function for tracing the propagation path of a symbol
 * through the dependency graph.
 *
 * Sprint 5 — T2: 路徑追蹤 utility
 * Design: .knowledge/sprint5-dataflow-architecture.md §4
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TraceInput {
  /** The symbol name to trace */
  symbol: string;
  /** All nodes in the graph (only id is required) */
  nodes: Array<{ id: string }>;
  /** All edges in the graph */
  edges: Array<{
    id: string;
    source: string;
    target: string;
    metadata: { importedSymbols?: string[] };
  }>;
}

export interface TraceResult {
  /** Ordered list of node IDs on the traced path (from start to end) */
  path: string[];
  /** Set of edge IDs that participate in the traced path */
  edges: string[];
}

// ---------------------------------------------------------------------------
// Algorithm
// ---------------------------------------------------------------------------

const MAX_DEPTH = 10;

/**
 * BFS traversal to find all nodes and edges that carry a given symbol.
 *
 * Boundary conditions handled:
 * - symbol not present in any edge → empty result
 * - empty graph → empty result
 * - cyclic dependencies → visited set prevents infinite expansion
 * - depth > MAX_DEPTH (10) → truncated
 * - importedSymbols undefined → safe optional-chaining + nullish coalescing
 */
export function traceSymbolPath(input: TraceInput): TraceResult {
  const { symbol, nodes: _nodes, edges } = input;

  // Guard: empty input
  if (!symbol || !edges || edges.length === 0) {
    return { path: [], edges: [] };
  }

  // Step 1: filter edges that carry this symbol
  const relevantEdges = edges.filter((e) =>
    (e.metadata?.importedSymbols ?? []).includes(symbol),
  );

  if (relevantEdges.length === 0) {
    return { path: [], edges: [] };
  }

  // Step 2: build adjacency map (undirected, only relevant edges)
  const adjacency = new Map<string, Array<{ nodeId: string; edgeId: string }>>();

  for (const edge of relevantEdges) {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    if (!adjacency.has(edge.target)) {
      adjacency.set(edge.target, []);
    }
    adjacency.get(edge.source)!.push({ nodeId: edge.target, edgeId: edge.id });
    adjacency.get(edge.target)!.push({ nodeId: edge.source, edgeId: edge.id });
  }

  // Step 3: BFS from the source of the first relevant edge
  const startNode = relevantEdges[0].source;
  const visited = new Set<string>();
  const visitedEdges = new Set<string>();
  const queue: Array<{ nodeId: string; depth: number }> = [
    { nodeId: startNode, depth: 0 },
  ];
  const path: string[] = [];

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) continue;

    const { nodeId, depth } = item;

    if (visited.has(nodeId)) continue;
    if (depth > MAX_DEPTH) continue;

    visited.add(nodeId);
    path.push(nodeId);

    const neighbors = adjacency.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      visitedEdges.add(neighbor.edgeId);
      if (!visited.has(neighbor.nodeId)) {
        queue.push({ nodeId: neighbor.nodeId, depth: depth + 1 });
      }
    }
  }

  return { path, edges: Array.from(visitedEdges) };
}
