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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlowProvider, useReactFlow } from '@xyflow/react';
import { useGraphData } from './hooks/useGraphData';
import { useSearch } from './hooks/useSearch';
import { useE2ETracing } from './hooks/useE2ETracing';
import { useToast } from './hooks/useToast';
import { GraphContainer } from './components/GraphContainer';
import { NodePanel } from './components/NodePanel';
import { SearchBar } from './components/SearchBar';
import { CodePreview } from './components/CodePreview';
import { AiSummary } from './components/AiSummary';
import { CameraPresets } from './components/CameraPresets';
import { TracingPanel } from './components/TracingPanel';
import { SettingsPopover } from './components/SettingsPopover';
import { Toolbar } from './components/Toolbar';
import { E2EPanel } from './components/E2EPanel';
import { TabBar } from './components/TabBar';
import { ToastStack } from './components/Toast';
import { ViewStateProvider, useViewState } from './contexts/ViewStateContext';
import type { PerspectiveName } from './types/graph';

// ---------------------------------------------------------------------------
// AppInner — requires ReactFlowProvider + ViewStateProvider context
// ---------------------------------------------------------------------------

function AppInner() {
  const { nodes, edges, rawNodes, rawEdges, directoryGraph, endpointGraph, isLoading, error, refetch } = useGraphData();
  const { state, dispatch } = useViewState();
  const { selectedNodeId, isPanelOpen, mode, tracingSymbol, e2eTracing, activePerspective, isSettingsPanelOpen } = state;

  const reactFlow = useReactFlow();

  // Toast hook
  const { toasts, show: showToast, dismiss: dismissToast } = useToast();

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

  // Sprint 15.1: Poll AI analysis status and auto-refresh graph on each phase completion
  const [aiProgress, setAiProgress] = useState('');
  const [aiDone, setAiDone] = useState(false);
  const lastPhaseRef = useRef(0);

  useEffect(() => {
    if (aiDone) return;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;

      try {
        const res = await fetch('/api/ai/status');
        if (!res.ok) return;
        const data = await res.json();

        // If AI is disabled, don't poll
        if (!data.enabled || data.provider === 'disabled') return;

        setAiProgress(data.progress ?? '');

        // Refetch graph whenever a new phase completes
        const phases = data.completedPhases ?? 0;
        if (phases > lastPhaseRef.current) {
          lastPhaseRef.current = phases;
          refetch();
        }

        // Pipeline fully done — stop polling
        if (data.analysisStatus === 'done' || data.analysisStatus === 'error') {
          setAiDone(true);
          if (data.analysisStatus === 'error') {
            setAiProgress(`AI analysis failed: ${data.progress ?? ''}`);
          }
          return;
        }

        // Still running — schedule next poll
        if (!cancelled) {
          setTimeout(poll, 3000);
        }
      } catch {
        // AI status unavailable — stop polling
      }
    };

    const timer = setTimeout(poll, 1000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [aiDone, refetch]);

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

      {/* Settings Popover — replaces ControlPanel */}
      {isSettingsPanelOpen && (
        <SettingsPopover
          graphNodes={rawNodes}
          directoryGraph={directoryGraph ?? null}
          onClose={() => dispatch({ type: 'TOGGLE_SETTINGS_PANEL' })}
          onShowToast={showToast}
        />
      )}

      {/* Toast notifications — fixed top:60px right:16px */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* Camera Presets — 3D only, keep existing position */}
      <CameraPresets />

      {/* Tab Bar — perspective switcher, positioned below Toolbar */}
      <TabBar
        activePerspective={activePerspective}
        onPerspectiveChange={handlePerspectiveChange}
        counts={tabCounts}
      />

      {/* Sprint 15.1: AI analysis progress indicator */}
      {aiProgress && !aiDone && (
        <div style={{
          position: 'fixed',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(20, 20, 30, 0.85)',
          border: '1px solid rgba(100, 140, 255, 0.3)',
          borderRadius: 8,
          padding: '6px 14px',
          fontSize: 11,
          color: 'rgba(180, 200, 255, 0.8)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#648cff',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          {aiProgress}
        </div>
      )}

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
