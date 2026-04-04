/**
 * CodeAtlas — useHoverHighlight Hook
 *
 * Hover node → highlight related dependency paths (in-edges + out-edges + upstream/downstream).
 * Non-related nodes/edges fade to low opacity.
 * Mouse leave → restore all to normal.
 *
 * Performance target: < 50ms response.
 */

import { useState, useCallback, useMemo } from 'react';
import type { Edge } from '@xyflow/react';
import type { NeonEdgeData } from '../adapters/graph-adapter';

export interface HighlightState {
  /** Currently hovered node id, or null */
  hoveredNodeId: string | null;
  /** Set of node ids that should be highlighted (includes hovered + connected) */
  highlightedNodeIds: Set<string>;
  /** Set of edge ids that should be highlighted */
  highlightedEdgeIds: Set<string>;
}

/**
 * Pre-compute adjacency maps for O(1) lookup on hover.
 */
function buildAdjacency(edges: Edge<NeonEdgeData>[]) {
  /** node id → outgoing edge ids */
  const outEdges = new Map<string, Set<string>>();
  /** node id → incoming edge ids */
  const inEdges = new Map<string, Set<string>>();
  /** node id → connected node ids (both directions) */
  const connectedNodes = new Map<string, Set<string>>();
  /** edge id → edge */
  const edgeMap = new Map<string, Edge<NeonEdgeData>>();

  for (const edge of edges) {
    edgeMap.set(edge.id, edge);

    // Outgoing from source
    if (!outEdges.has(edge.source)) outEdges.set(edge.source, new Set());
    outEdges.get(edge.source)!.add(edge.id);

    // Incoming to target
    if (!inEdges.has(edge.target)) inEdges.set(edge.target, new Set());
    inEdges.get(edge.target)!.add(edge.id);

    // Connected (bidirectional)
    if (!connectedNodes.has(edge.source)) connectedNodes.set(edge.source, new Set());
    connectedNodes.get(edge.source)!.add(edge.target);

    if (!connectedNodes.has(edge.target)) connectedNodes.set(edge.target, new Set());
    connectedNodes.get(edge.target)!.add(edge.source);
  }

  return { outEdges, inEdges, connectedNodes, edgeMap };
}

export function useHoverHighlight(edges: Edge<NeonEdgeData>[]) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const adjacency = useMemo(() => buildAdjacency(edges), [edges]);

  const highlightState: HighlightState = useMemo(() => {
    if (!hoveredNodeId) {
      return {
        hoveredNodeId: null,
        highlightedNodeIds: new Set<string>(),
        highlightedEdgeIds: new Set<string>(),
      };
    }

    const highlightedNodeIds = new Set<string>();
    const highlightedEdgeIds = new Set<string>();

    // Add the hovered node itself
    highlightedNodeIds.add(hoveredNodeId);

    // Add all connected nodes
    const connected = adjacency.connectedNodes.get(hoveredNodeId);
    if (connected) {
      for (const nodeId of connected) {
        highlightedNodeIds.add(nodeId);
      }
    }

    // Add outgoing edges
    const out = adjacency.outEdges.get(hoveredNodeId);
    if (out) {
      for (const edgeId of out) {
        highlightedEdgeIds.add(edgeId);
      }
    }

    // Add incoming edges
    const inc = adjacency.inEdges.get(hoveredNodeId);
    if (inc) {
      for (const edgeId of inc) {
        highlightedEdgeIds.add(edgeId);
      }
    }

    return { hoveredNodeId, highlightedNodeIds, highlightedEdgeIds };
  }, [hoveredNodeId, adjacency]);

  const onNodeMouseEnter = useCallback((_event: React.MouseEvent, nodeId: string) => {
    setHoveredNodeId(nodeId);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  return {
    highlightState,
    onNodeMouseEnter,
    onNodeMouseLeave,
  };
}
