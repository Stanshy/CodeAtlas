/**
 * useFilteredGraphData — shared data computation hook (Sprint 17 T9)
 *
 * Wraps the applyPerspective + applyCuration pipeline for data filtering.
 *
 * NOTE on integration with GraphCanvas (2D):
 * GraphCanvas uses useGraphCanvasFiltering which builds full React Flow RF
 * Node/Edge objects (with specialised card types for DJ/LO/SF perspectives)
 * in the same memo pass. The filtering pipeline is inseparable from the RF node
 * construction there, so we do NOT replace useGraphCanvasFiltering with this
 * hook in GraphCanvas. This hook is available for future renderers where
 * filtering and rendering representation are independent.
 */

import { useMemo } from 'react';
import { applyPerspective, applyCuration } from '../adapters/graph-adapter';
import type { GraphNode, GraphEdge, PerspectiveName, DirectoryGraph, EndpointGraph } from '../types/graph';

export interface UseFilteredGraphDataResult {
  filteredNodes: GraphNode[];
  filteredEdges: GraphEdge[];
}

/**
 * Apply perspective + curation filtering to raw graph data.
 *
 * @param nodes          Raw GraphNode array from the API
 * @param edges          Raw GraphEdge array from the API
 * @param activePerspective  Current perspective name
 * @param pinnedNodeIds  Node IDs that must never be hidden by curation
 * @param directoryGraph Optional directory-level graph (required for system-framework)
 * @param endpointGraph  Optional endpoint-level graph (required for data-journey / logic-operation)
 */
export function useFilteredGraphData(
  nodes: GraphNode[],
  edges: GraphEdge[],
  activePerspective: PerspectiveName,
  pinnedNodeIds: string[],
  directoryGraph?: DirectoryGraph | null,
  endpointGraph?: EndpointGraph | null,
): UseFilteredGraphDataResult {
  return useMemo(() => {
    const perspectiveResult = applyPerspective(
      nodes,
      edges,
      activePerspective,
      directoryGraph ?? undefined,
      endpointGraph ?? undefined,
    );
    const curationResult = applyCuration(
      perspectiveResult.nodes,
      perspectiveResult.edges,
      new Set(pinnedNodeIds),
    );
    return { filteredNodes: curationResult.nodes, filteredEdges: curationResult.edges };
  }, [nodes, edges, activePerspective, pinnedNodeIds, directoryGraph, endpointGraph]);
}
