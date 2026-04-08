/**
 * CodeAtlas — GraphContainer Component
 *
 * Reads view mode from ViewStateContext and renders either:
 *   - GraphCanvas (2D, React Flow)
 *   - Graph3DCanvas (3D, 3d-force-graph)
 *
 * Applies a CSS opacity fade transition on mode change.
 *
 * Sprint 4 — T3: 3d-force-graph Integration
 * Sprint 5 — T5: pass tracing props to Graph3DCanvas
 * Sprint 5 — T7: pass heatmap props to Graph3DCanvas
 */

import { useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { useViewState } from '../contexts/ViewStateContext';
import { GraphCanvas } from './GraphCanvas';
import { Graph3DCanvas } from './Graph3DCanvas';
import { useHeatmap } from '../hooks/useHeatmap';
import type { NeonNodeData, NeonEdgeData } from '../adapters/graph-adapter';
import type { GraphNode, GraphEdge, DirectoryGraph, EndpointGraph } from '../types/graph';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GraphContainerProps {
  /** React Flow nodes (for 2D mode) */
  rfNodes: Node<NeonNodeData>[];
  /** React Flow edges (for 2D mode) */
  rfEdges: Edge<NeonEdgeData>[];
  /** Raw graph nodes (for 3D mode) */
  graphNodes: GraphNode[];
  /** Raw graph edges (for 3D mode) */
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
  const { state, dispatch } = useViewState();
  const {
    mode,
    hoveredNodeId,
    selectedNodeId,
    focusNodeId,
    cameraPreset,
    hoveredEdgeId,
    // Sprint 5 T5
    tracingSymbol,
    tracingPath,
    tracingEdges,
    // Sprint 7
    expandedFileId,
    // Sprint 8
    impactAnalysis,
    isSearchFocused,
    searchFocusNodes,
    searchFocusEdges,
  } = state;

  // Sprint 5 T7 — heatmap
  const { isEnabled: isHeatmapEnabled, getEdgeStyle: getHeatmapEdgeStyle } = useHeatmap();

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      dispatch({ type: 'SELECT_NODE', nodeId });
    },
    [dispatch],
  );

  const handleNodeHover = useCallback(
    (nodeId: string | null) => {
      dispatch({ type: 'HOVER_NODE', nodeId });
    },
    [dispatch],
  );

  const handleFocusComplete = useCallback(() => {
    dispatch({ type: 'CLEAR_FOCUS' });
  }, [dispatch]);

  const handleCameraPresetApplied = useCallback(() => {
    dispatch({ type: 'CLEAR_CAMERA_PRESET' });
  }, [dispatch]);

  // Sprint 5 T4 — 3D edge hover → sync to ViewStateContext
  const handleEdgeHover = useCallback(
    (edgeId: string | null) => {
      dispatch({ type: 'HOVER_EDGE', edgeId });
    },
    [dispatch],
  );

  // Sprint 8 — right-click context menu in 3D mode
  const handleNodeContextMenu = useCallback(
    (nodeId: string, screenX: number, screenY: number) => {
      dispatch({ type: 'SHOW_CONTEXT_MENU', x: screenX, y: screenY, nodeId });
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
      {/* 2D mode */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: mode === '2d' ? 1 : 0,
          transition: 'opacity 300ms ease',
          pointerEvents: mode === '2d' ? 'auto' : 'none',
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

      {/* 3D mode */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: mode === '3d' ? 1 : 0,
          transition: 'opacity 300ms ease',
          pointerEvents: mode === '3d' ? 'auto' : 'none',
        }}
      >
        <Graph3DCanvas
          graphNodes={graphNodes}
          graphEdges={graphEdges}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          focusNodeId={focusNodeId}
          onFocusComplete={handleFocusComplete}
          hoveredNodeId={hoveredNodeId}
          selectedNodeId={selectedNodeId}
          cameraPreset={cameraPreset}
          onCameraPresetApplied={handleCameraPresetApplied}
          hoveredEdgeId={hoveredEdgeId}
          onEdgeHover={handleEdgeHover}
          // Sprint 5 T5 — path tracing
          tracingSymbol={tracingSymbol}
          tracingPath={tracingPath}
          tracingEdges={tracingEdges}
          // Sprint 5 T7 — heatmap
          isHeatmapEnabled={isHeatmapEnabled}
          getHeatmapEdgeStyle={getHeatmapEdgeStyle}
          // Sprint 7 T12 — zoom into file
          expandedFileId={expandedFileId}
          // Sprint 8 — impact analysis + search focus + context menu
          impactAnalysis={impactAnalysis}
          isSearchFocused={isSearchFocused}
          searchFocusNodes={searchFocusNodes}
          searchFocusEdges={searchFocusEdges}
          onNodeContextMenu={handleNodeContextMenu}
        />
      </div>
    </div>
  );
}
