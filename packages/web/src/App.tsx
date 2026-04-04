/**
 * CodeAtlas — Main App Component
 *
 * Integrates Toolbar, ControlPanel, GraphContainer, NodePanel, SearchBar,
 * E2EPanel, TracingPanel, and CameraPresets. Handles loading, error, and
 * empty states.
 *
 * Sprint 4 — T3: 3d-force-graph Integration
 * Sprint 9 — T9: Toolbar + ControlPanel integration
 */

import { useCallback, useMemo } from 'react';
import { ReactFlowProvider, useReactFlow } from '@xyflow/react';
import { useGraphData } from './hooks/useGraphData';
import { useSearch } from './hooks/useSearch';
import { useE2ETracing } from './hooks/useE2ETracing';
import { GraphContainer } from './components/GraphContainer';
import { NodePanel } from './components/NodePanel';
import { SearchBar } from './components/SearchBar';
import { CodePreview } from './components/CodePreview';
import { AiSummary } from './components/AiSummary';
import { CameraPresets } from './components/CameraPresets';
import { TracingPanel } from './components/TracingPanel';
import { ControlPanel } from './components/ControlPanel';
import { Toolbar } from './components/Toolbar';
import { E2EPanel } from './components/E2EPanel';
import { TabBar } from './components/TabBar';
import { ViewStateProvider, useViewState } from './contexts/ViewStateContext';
import type { PerspectiveName } from './types/graph';

// ---------------------------------------------------------------------------
// AppInner — requires ReactFlowProvider + ViewStateProvider context
// ---------------------------------------------------------------------------

function AppInner() {
  const { nodes, edges, rawNodes, rawEdges, directoryGraph, endpointGraph, isLoading, error, refetch } = useGraphData();
  const { state, dispatch } = useViewState();
  const { selectedNodeId, isPanelOpen, mode, tracingSymbol, e2eTracing, activePerspective } = state;

  const reactFlow = useReactFlow();

  // E2E Tracing hook
  const {
    startTracing: e2eStartTracing,
    updateDepth: e2eUpdateDepth,
    clearTracing: e2eClearTracing,
  } = useE2ETracing({ nodes: rawNodes, edges: rawEdges });

  // Focus a node: for 2D use ReactFlow viewport; for 3D dispatch FOCUS_NODE
  const focusNode = useCallback(
    (nodeId: string) => {
      dispatch({ type: 'SELECT_NODE', nodeId });

      if (mode === '2d') {
        const rfNode = reactFlow.getNode(nodeId);
        if (rfNode) {
          reactFlow.setCenter(
            rfNode.position.x + (rfNode.measured?.width ?? 100) / 2,
            rfNode.position.y + (rfNode.measured?.height ?? 40) / 2,
            { zoom: 1.2, duration: 500 },
          );
        }
      } else {
        dispatch({ type: 'FOCUS_NODE', nodeId });
      }
    },
    [reactFlow, dispatch, mode],
  );

  // Search hook
  const search = useSearch({
    nodes,
    onSelect: focusNode,
  });

  // Close panel
  const handleClosePanel = useCallback(() => {
    dispatch({ type: 'CLOSE_PANEL' });
  }, [dispatch]);

  // Navigate to another node from panel (clicking import/export links)
  const handleNavigate = useCallback(
    (nodeId: string) => {
      focusNode(nodeId);
    },
    [focusNode],
  );

  // Tab bar — perspective switching
  const handlePerspectiveChange = useCallback(
    (perspective: PerspectiveName) => {
      dispatch({ type: 'SET_PERSPECTIVE', perspective });
    },
    [dispatch],
  );

  // Compute per-tab node counts for the badge
  const tabCounts = useMemo(() => {
    // sf: directory nodes (system-framework reads directory-level data)
    const sf = directoryGraph ? directoryGraph.nodes.length : rawNodes.filter(n => n.type === 'directory').length;
    // lo: all file nodes
    const lo = rawNodes.filter(n => n.type === 'file').length;
    // dj: file nodes with data-flow edges
    const dj = lo;
    return { sf, lo, dj };
  }, [rawNodes, directoryGraph]);

  if (isLoading) {
    return (
      <div className="codeatlas-canvas">
        <div className="codeatlas-status">
          <div className="codeatlas-spinner" />
          <p className="codeatlas-status__title">CodeAtlas</p>
          <p className="codeatlas-status__message">Loading dependency graph...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="codeatlas-canvas">
        <div className="codeatlas-status">
          <p className="codeatlas-status__title">CodeAtlas</p>
          <p className="codeatlas-status__message codeatlas-status__error">{error}</p>
          <button className="codeatlas-status__retry" onClick={refetch} type="button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="codeatlas-canvas">
        <div className="codeatlas-status">
          <p className="codeatlas-status__title">CodeAtlas</p>
          <p className="codeatlas-status__message">
            No nodes found. Run <code>codeatlas analyze</code> on a project with JS/TS files first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Unified Toolbar — fixed top */}
      <Toolbar onSearchClick={() => dispatch({ type: 'SET_SEARCH_OPEN', open: true })} />

      {/* Control Panel — fixed left sidebar */}
      <ControlPanel graphNodes={rawNodes} graphEdges={rawEdges} />

      {/* Camera Presets — 3D only, keep existing position */}
      <CameraPresets />

      {/* Tab Bar — perspective switcher, positioned below Toolbar */}
      <TabBar
        activePerspective={activePerspective}
        onPerspectiveChange={handlePerspectiveChange}
        counts={tabCounts}
      />

      {/* Graph renderer — switches between 2D and 3D */}
      <GraphContainer
        rfNodes={nodes}
        rfEdges={edges}
        graphNodes={rawNodes}
        graphEdges={rawEdges}
        directoryGraph={directoryGraph}
        endpointGraph={endpointGraph}
        onStartE2ETracing={e2eStartTracing}
      />

      {/* Search Bar — toggle with Ctrl+K */}
      <SearchBar search={search} />

      {/*
       * Right-side panels — mutually exclusive, priority: E2E > Tracing > Node.
       * Sprint 12 T7: data-journey perspective uses JourneyPanel (inside GraphCanvas);
       * E2EPanel is suppressed in that case to prevent overlap.
       */}
      {e2eTracing?.active && activePerspective !== 'data-journey' ? (
        <E2EPanel
          onFocusNode={focusNode}
          onUpdateDepth={e2eUpdateDepth}
          onClose={e2eClearTracing}
        />
      ) : tracingSymbol !== null ? (
        <TracingPanel />
      ) : (
        <NodePanel
          nodeId={isPanelOpen ? selectedNodeId : null}
          onClose={handleClosePanel}
          onNavigate={handleNavigate}
          renderCodePreview={(sourceCode, language) => (
            <CodePreview sourceCode={sourceCode} language={language} />
          )}
          renderAiSummary={(nodeId) => <AiSummary nodeId={nodeId} />}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// App — root with providers
// ---------------------------------------------------------------------------

export function App() {
  return (
    <ViewStateProvider>
      <ReactFlowProvider>
        <AppInner />
      </ReactFlowProvider>
    </ViewStateProvider>
  );
}
