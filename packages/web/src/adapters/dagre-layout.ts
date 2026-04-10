/**
 * CodeAtlas — Dagre Hierarchical Layout Provider
 *
 * Implements a top-down hierarchical (dagre-style) layout using a
 * topological rank assignment algorithm. This avoids the external
 * `dagre` package dependency while fulfilling the same API contract.
 *
 * Sprint 11 — T5.
 * Sprint 12 — T5: directoryCard nodes use smaller 160×72 dimensions.
 *
 * Layout params mirror dagre spec:
 *   rankdir: 'TB', nodesep: 60, ranksep: 100, marginx: 40, marginy: 40
 *
 * System-framework override (directoryCard nodes):
 *   nodesep: 60, ranksep: 100, marginx: 40, marginy: 40
 *   node width: 160, node height: 72
 */

import type { Node, Edge } from '@xyflow/react';
import type { LayoutProvider, LayoutInput, LayoutOutput } from './layout-router';
import type { NeonNodeData } from './graph-adapter';
import type { NeonEdgeData } from './graph-adapter';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 50;
const NODESEP = 60;    // horizontal gap between sibling nodes
const RANKSEP = 100;   // vertical gap between rank layers
const MARGINX = 40;
const MARGINY = 40;

// Sprint 12: system-framework directoryCard dimensions
const SF_NODE_WIDTH = 160;
const SF_NODE_HEIGHT = 72;
const SF_NODESEP = 60;
const SF_RANKSEP = 100;
const SF_MARGINX = 40;
const SF_MARGINY = 40;

/**
 * Map a DirectoryType string to a default rank for isolated nodes.
 *
 * This drives the layered hierarchy described in Sprint 12:
 *   entry      → rank 0  (app entry points at the top)
 *   logic      → rank 2  (controllers / hooks / services in the middle)
 *   data       → rank 4  (models / db / types below logic)
 *   support    → rank 5  (utils / lib / config at the bottom / side)
 *   (unknown)  → rank 3  (mid-point fallback)
 */
function directoryTypeToRank(dirType: string | undefined): number {
  switch (dirType) {
    case 'entry':   return 0;
    case 'logic':   return 2;
    case 'data':    return 4;
    case 'support': return 5;
    default:        return 3;
  }
}

/**
 * Assign rank levels via Kahn's algorithm (topological sort BFS).
 * Nodes with no incoming edges get rank 0.
 *
 * Post-BFS correction for isolated nodes (rank 0, no edges at all):
 * Instead of piling every isolated node on rank 0, assign a rank based on
 * the node's directoryType so that the System Framework view renders a
 * meaningful layered hierarchy even when inter-directory edges are sparse.
 */
function assignRanks(
  nodes: Node<NeonNodeData>[],
  edges: Edge<NeonEdgeData>[],
): Map<string, number> {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  const children = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    outDegree.set(node.id, 0);
    children.set(node.id, []);
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    outDegree.set(edge.source, (outDegree.get(edge.source) ?? 0) + 1);
    children.get(edge.source)?.push(edge.target);
  }

  const ranks = new Map<string, number>();
  const queue: string[] = [];

  // Start from roots (no incoming edges)
  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      ranks.set(id, 0);
      queue.push(id);
    }
  }

  // BFS to assign ranks
  let qi = 0;
  while (qi < queue.length) {
    const nodeId = queue[qi++]!;
    const rank = ranks.get(nodeId) ?? 0;
    for (const child of (children.get(nodeId) ?? [])) {
      const existing = ranks.get(child) ?? -1;
      const newRank = rank + 1;
      if (newRank > existing) {
        ranks.set(child, newRank);
      }
      // Only enqueue if not yet visited (we may revisit to update rank)
      if (existing === -1) {
        queue.push(child);
      }
    }
  }

  // Any node not reached (isolated or in a cycle) gets rank 0 initially
  for (const node of nodes) {
    if (!ranks.has(node.id)) {
      ranks.set(node.id, 0);
    }
  }

  // Post-BFS correction: isolated nodes (rank 0 AND no edges at all) should
  // be distributed across ranks based on their directory type rather than all
  // landing on rank 0, which causes the "all in one horizontal line" bug.
  for (const node of nodes) {
    const isIsolated =
      (inDegree.get(node.id) ?? 0) === 0 &&
      (outDegree.get(node.id) ?? 0) === 0;

    if (isIsolated && (ranks.get(node.id) ?? 0) === 0) {
      const dirType = node.data.directoryType as string | undefined;
      ranks.set(node.id, directoryTypeToRank(dirType));
    }
  }

  return ranks;
}

/**
 * Given rank assignments, compute x/y positions.
 * Nodes in the same rank are distributed horizontally.
 *
 * nodeWidth/nodeHeight/nodesep/ranksep/marginx/marginy can be overridden
 * for different layout contexts (e.g. system-framework directoryCard nodes).
 */
function computePositions(
  nodes: Node<NeonNodeData>[],
  ranks: Map<string, number>,
  nodeWidth = NODE_WIDTH,
  nodeHeight = NODE_HEIGHT,
  nodesep = NODESEP,
  ranksep = RANKSEP,
  marginx = MARGINX,
  marginy = MARGINY,
): Map<string, { x: number; y: number }> {
  // Group nodes by rank
  const rankGroups = new Map<number, string[]>();
  for (const node of nodes) {
    const rank = ranks.get(node.id) ?? 0;
    if (!rankGroups.has(rank)) rankGroups.set(rank, []);
    rankGroups.get(rank)!.push(node.id);
  }

  const positions = new Map<string, { x: number; y: number }>();

  for (const [rank, nodeIds] of rankGroups) {
    const count = nodeIds.length;
    // Total width consumed by this rank
    const totalWidth = count * nodeWidth + (count - 1) * nodesep;
    const startX = marginx - totalWidth / 2;

    nodeIds.forEach((id, index) => {
      const x = startX + index * (nodeWidth + nodesep);
      const y = marginy + rank * (nodeHeight + ranksep);
      positions.set(id, { x, y });
    });
  }

  return positions;
}

export const dagreLayoutProvider: LayoutProvider = {
  name: 'dagre-hierarchical',
  compute(input: LayoutInput): LayoutOutput {
    const { nodes, edges } = input;

    if (nodes.length === 0) {
      return { nodes, edges };
    }

    const ranks = assignRanks(nodes, edges);

    // Sprint 12: detect system-framework directoryCard nodes and use SF dimensions
    const isDirectoryCardGraph = nodes.length > 0 && nodes[0]!.type === 'directoryCard';
    const positions = isDirectoryCardGraph
      ? computePositions(nodes, ranks, SF_NODE_WIDTH, SF_NODE_HEIGHT, SF_NODESEP, SF_RANKSEP, SF_MARGINX, SF_MARGINY)
      : computePositions(nodes, ranks);

    const layoutNodes = nodes.map((node) => {
      const pos = positions.get(node.id);
      if (!pos) return node;
      return {
        ...node,
        position: { x: pos.x, y: pos.y },
        // Attach rank data for badge rendering in NeonNode
        data: {
          ...node.data,
          rank: ranks.get(node.id) ?? 0,
        } as NeonNodeData & { rank: number },
      };
    });

    return { nodes: layoutNodes, edges };
  },
};
