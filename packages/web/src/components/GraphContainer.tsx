/**
 * CodeAtlas — GraphContainer Component
 *
 * Renders the 2D GraphCanvas (React Flow).
 * The 3D layer has been removed in Sprint 19 T12.
 *
 * Sprint 4 — T3: initial integration
 * Sprint 19 — T12: 3D removal, always renders 2D
 */

import { useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { useViewState } from '../contexts/ViewStateContext';
import { GraphCanvas } from './GraphCanvas';
import type { NeonNodeData, NeonEdgeData } from '../adapters/graph-adapter';
import type { GraphNode, GraphEdge, DirectoryGraph, EndpointGraph } from '../types/graph';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GraphContainerProps {
  /** React Flow nodes */
  rfNodes: Node<NeonNodeData>[];
  /** React Flow edges */
  rfEdges: Edge<NeonEdgeData>[];
  /** Raw graph nodes (passed through to SF panel) */
  graphNodes: GraphNode[];
  /** Raw graph edges (passed through to SF panel) */
  graphEdges: GraphEdge[];
  /** Sprint 12 — optional directory-level graph (system-framework perspective) */
  directoryGraph?: DirectoryGraph | null;
  /** Sprint 13 — optional endpoint-level graph (data-journey / logic-operation perspectives) */
  endpointGraph?: EndpointGraph | null;
  /** Sprint 9 — E2E tracing: called when user triggers E2E tracing from context menu */
  onStartE2ETracing?: (nodeId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GraphContainer({ rfNodes, rfEdges, graphNodes, graphEdges, directoryGraph, endpointGraph, onStartE2ETracing }: GraphContainerProps) {
  const { dispatch } = useViewState();

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      dispatch({ type: 'SELECT_NODE', nodeId });
    },
    [dispatch],
  );

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 'calc(100vh - 96px)',
        marginTop: 96,
      }}
    >
      <GraphCanvas
        initialNodes={rfNodes}
        initialEdges={rfEdges}
        onNodeClick={handleNodeClick}
        directoryGraph={directoryGraph ?? null}
        endpointGraph={endpointGraph ?? null}
        sfPanelNodes={graphNodes}
        sfPanelEdges={graphEdges}
        {...(onStartE2ETracing !== undefined && { onStartE2ETracing })}
      />
    </div>
  );
}
