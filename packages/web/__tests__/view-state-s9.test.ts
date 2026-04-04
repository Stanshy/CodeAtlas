/**
 * Sprint 9 — ViewState unit tests
 *
 * Tests the Sprint 9 actions added to viewStateReducer:
 *   - SET_VIEW_MODE
 *   - TOGGLE_CONTROL_PANEL
 *   - SET_DISPLAY_PREFS
 *   - START_E2E_TRACING
 *   - UPDATE_E2E_DEPTH
 *   - CLEAR_E2E_TRACING
 *   - SET_E2E_SELECTING
 *
 * Uses the same renderHook + ViewStateProvider pattern as view-state-s8.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ViewStateProvider, useViewState } from '../src/contexts/ViewStateContext';
import type { E2EStep } from '../src/types/graph';

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(ViewStateProvider, null, children);
}

// ---------------------------------------------------------------------------
// Sample E2E tracing data
// ---------------------------------------------------------------------------

const sampleSteps: E2EStep[] = [
  { nodeId: 'A', nodeLabel: 'NodeA', edgeId: null,   edgeType: null,     symbols: [],       depth: 0 },
  { nodeId: 'B', nodeLabel: 'NodeB', edgeId: 'e-AB', edgeType: 'import', symbols: ['foo'],  depth: 1 },
  { nodeId: 'C', nodeLabel: 'NodeC', edgeId: 'e-BC', edgeType: 'call',   symbols: [],       depth: 2 },
];

// ---------------------------------------------------------------------------
// Initial state — Sprint 9 fields
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 9 — initial state', () => {
  it('activeViewMode is panorama', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.activeViewMode).toBe('panorama');
  });

  it('isControlPanelOpen is true', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.isControlPanelOpen).toBe(true);
  });

  it('displayPrefs.showEdgeLabels defaults to false', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.displayPrefs.showEdgeLabels).toBe(false);
  });

  it('displayPrefs.showParticles defaults to true', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.displayPrefs.showParticles).toBe(true);
  });

  it('displayPrefs.labelDensity defaults to smart', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.displayPrefs.labelDensity).toBe('smart');
  });

  it('displayPrefs.impactDefaultDepth defaults to 5', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.displayPrefs.impactDefaultDepth).toBe(5);
  });

  it('e2eTracing is null', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.e2eTracing).toBeNull();
  });

  it('isE2ESelecting is false', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.isE2ESelecting).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SET_VIEW_MODE
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 9 — SET_VIEW_MODE', () => {
  it('sets activeViewMode to dataflow', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch({ type: 'SET_VIEW_MODE', mode: 'dataflow' }); });
    expect(result.current.state.activeViewMode).toBe('dataflow');
  });

  it('sets activeViewMode to dependency', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch({ type: 'SET_VIEW_MODE', mode: 'dependency' }); });
    expect(result.current.state.activeViewMode).toBe('dependency');
  });

  it('sets activeViewMode to callchain', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch({ type: 'SET_VIEW_MODE', mode: 'callchain' }); });
    expect(result.current.state.activeViewMode).toBe('callchain');
  });

  it('clears impactAnalysis when switching mode', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    // First set impactAnalysis
    act(() => {
      result.current.dispatch({
        type: 'IMPACT_ANALYZE',
        direction: 'forward',
        targetNodeId: 'src/a.ts',
        impactedNodes: ['src/a.ts'],
        impactedEdges: [],
        depthMap: { 'src/a.ts': 0 },
      });
    });
    expect(result.current.state.impactAnalysis).not.toBeNull();
    // Then switch view mode
    act(() => { result.current.dispatch({ type: 'SET_VIEW_MODE', mode: 'dataflow' }); });
    expect(result.current.state.impactAnalysis).toBeNull();
  });

  it('clears e2eTracing when switching mode', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'START_E2E_TRACING',
        startNodeId: 'A',
        path: ['A', 'B'],
        edges: ['e-AB'],
        steps: sampleSteps.slice(0, 2),
        truncated: false,
      });
    });
    expect(result.current.state.e2eTracing).not.toBeNull();
    act(() => { result.current.dispatch({ type: 'SET_VIEW_MODE', mode: 'dependency' }); });
    expect(result.current.state.e2eTracing).toBeNull();
  });

  it('clears isSearchFocused when switching mode', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'ENTER_SEARCH_FOCUS',
        nodeIds: ['src/a.ts'],
        edgeIds: [],
      });
    });
    expect(result.current.state.isSearchFocused).toBe(true);
    act(() => { result.current.dispatch({ type: 'SET_VIEW_MODE', mode: 'callchain' }); });
    expect(result.current.state.isSearchFocused).toBe(false);
  });

  it('resets filter to empty arrays when switching mode', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'SET_FILTER',
        filter: { nodeTypes: ['file'], edgeTypes: ['import'] },
      });
    });
    act(() => { result.current.dispatch({ type: 'SET_VIEW_MODE', mode: 'panorama' }); });
    expect(result.current.state.filter.nodeTypes).toEqual([]);
    expect(result.current.state.filter.edgeTypes).toEqual([]);
    expect(result.current.state.filter.directories).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// TOGGLE_CONTROL_PANEL
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 9 — TOGGLE_CONTROL_PANEL', () => {
  it('toggles isControlPanelOpen from true to false', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    // Initial state is true
    expect(result.current.state.isControlPanelOpen).toBe(true);
    act(() => { result.current.dispatch({ type: 'TOGGLE_CONTROL_PANEL' }); });
    expect(result.current.state.isControlPanelOpen).toBe(false);
  });

  it('toggles isControlPanelOpen back to true', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch({ type: 'TOGGLE_CONTROL_PANEL' }); });
    act(() => { result.current.dispatch({ type: 'TOGGLE_CONTROL_PANEL' }); });
    expect(result.current.state.isControlPanelOpen).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SET_DISPLAY_PREFS
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 9 — SET_DISPLAY_PREFS', () => {
  it('partial update: only changes showEdgeLabels, keeps other prefs', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_DISPLAY_PREFS', prefs: { showEdgeLabels: true } });
    });
    expect(result.current.state.displayPrefs.showEdgeLabels).toBe(true);
    // Other prefs should be unchanged
    expect(result.current.state.displayPrefs.showParticles).toBe(true);
    expect(result.current.state.displayPrefs.labelDensity).toBe('smart');
    expect(result.current.state.displayPrefs.impactDefaultDepth).toBe(5);
  });

  it('updates showParticles to false', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_DISPLAY_PREFS', prefs: { showParticles: false } });
    });
    expect(result.current.state.displayPrefs.showParticles).toBe(false);
  });

  it('updates labelDensity to all', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_DISPLAY_PREFS', prefs: { labelDensity: 'all' } });
    });
    expect(result.current.state.displayPrefs.labelDensity).toBe('all');
  });

  it('updates impactDefaultDepth', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_DISPLAY_PREFS', prefs: { impactDefaultDepth: 3 } });
    });
    expect(result.current.state.displayPrefs.impactDefaultDepth).toBe(3);
  });

  it('multiple partial updates accumulate correctly', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_DISPLAY_PREFS', prefs: { showEdgeLabels: true } });
    });
    act(() => {
      result.current.dispatch({ type: 'SET_DISPLAY_PREFS', prefs: { impactDefaultDepth: 7 } });
    });
    expect(result.current.state.displayPrefs.showEdgeLabels).toBe(true);
    expect(result.current.state.displayPrefs.impactDefaultDepth).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// START_E2E_TRACING
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 9 — START_E2E_TRACING', () => {
  const startPayload = {
    type: 'START_E2E_TRACING' as const,
    startNodeId: 'A',
    path: ['A', 'B', 'C'],
    edges: ['e-AB', 'e-BC'],
    steps: sampleSteps,
    truncated: false,
  };

  it('sets e2eTracing.active to true', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch(startPayload); });
    expect(result.current.state.e2eTracing?.active).toBe(true);
  });

  it('sets e2eTracing.startNodeId', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch(startPayload); });
    expect(result.current.state.e2eTracing?.startNodeId).toBe('A');
  });

  it('sets e2eTracing.path', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch(startPayload); });
    expect(result.current.state.e2eTracing?.path).toEqual(['A', 'B', 'C']);
  });

  it('sets e2eTracing.edges', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch(startPayload); });
    expect(result.current.state.e2eTracing?.edges).toEqual(['e-AB', 'e-BC']);
  });

  it('sets e2eTracing.steps with all 3 entries', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch(startPayload); });
    expect(result.current.state.e2eTracing?.steps).toHaveLength(3);
  });

  it('sets e2eTracing.maxDepth to default 10', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch(startPayload); });
    expect(result.current.state.e2eTracing?.maxDepth).toBe(10);
  });

  it('sets e2eTracing.truncated', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch({ ...startPayload, truncated: true }); });
    expect(result.current.state.e2eTracing?.truncated).toBe(true);
  });

  it('sets isE2ESelecting to false', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    // First set selecting to true
    act(() => { result.current.dispatch({ type: 'SET_E2E_SELECTING', selecting: true }); });
    act(() => { result.current.dispatch(startPayload); });
    expect(result.current.state.isE2ESelecting).toBe(false);
  });

  it('clears impactAnalysis', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'IMPACT_ANALYZE',
        direction: 'forward',
        targetNodeId: 'src/a.ts',
        impactedNodes: ['src/a.ts'],
        impactedEdges: [],
        depthMap: {},
      });
    });
    expect(result.current.state.impactAnalysis).not.toBeNull();
    act(() => { result.current.dispatch(startPayload); });
    expect(result.current.state.impactAnalysis).toBeNull();
  });

  it('clears tracingSymbol', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'START_TRACING', symbol: 'myFn', path: ['A'], edges: [] });
    });
    act(() => { result.current.dispatch(startPayload); });
    expect(result.current.state.tracingSymbol).toBeNull();
  });

  it('clears tracingPath', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'START_TRACING', symbol: 'myFn', path: ['A', 'B'], edges: [] });
    });
    act(() => { result.current.dispatch(startPayload); });
    expect(result.current.state.tracingPath).toEqual([]);
  });

  it('clears tracingEdges', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'START_TRACING', symbol: 'myFn', path: [], edges: ['e1'] });
    });
    act(() => { result.current.dispatch(startPayload); });
    expect(result.current.state.tracingEdges).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// UPDATE_E2E_DEPTH
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 9 — UPDATE_E2E_DEPTH', () => {
  const startPayload = {
    type: 'START_E2E_TRACING' as const,
    startNodeId: 'A',
    path: ['A', 'B'],
    edges: ['e-AB'],
    steps: sampleSteps.slice(0, 2),
    truncated: false,
  };

  it('updates maxDepth', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch(startPayload); });
    act(() => {
      result.current.dispatch({
        type: 'UPDATE_E2E_DEPTH',
        maxDepth: 5,
        path: ['A', 'B', 'C'],
        edges: ['e-AB', 'e-BC'],
        steps: sampleSteps,
        truncated: false,
      });
    });
    expect(result.current.state.e2eTracing?.maxDepth).toBe(5);
  });

  it('updates path with new BFS result', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch(startPayload); });
    act(() => {
      result.current.dispatch({
        type: 'UPDATE_E2E_DEPTH',
        maxDepth: 5,
        path: ['A', 'B', 'C'],
        edges: ['e-AB', 'e-BC'],
        steps: sampleSteps,
        truncated: false,
      });
    });
    expect(result.current.state.e2eTracing?.path).toEqual(['A', 'B', 'C']);
  });

  it('updates edges with new BFS result', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch(startPayload); });
    act(() => {
      result.current.dispatch({
        type: 'UPDATE_E2E_DEPTH',
        maxDepth: 5,
        path: ['A', 'B', 'C'],
        edges: ['e-AB', 'e-BC'],
        steps: sampleSteps,
        truncated: false,
      });
    });
    expect(result.current.state.e2eTracing?.edges).toEqual(['e-AB', 'e-BC']);
  });

  it('updates steps with new BFS result', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch(startPayload); });
    act(() => {
      result.current.dispatch({
        type: 'UPDATE_E2E_DEPTH',
        maxDepth: 5,
        path: ['A', 'B', 'C'],
        edges: ['e-AB', 'e-BC'],
        steps: sampleSteps,
        truncated: false,
      });
    });
    expect(result.current.state.e2eTracing?.steps).toHaveLength(3);
  });

  it('updates truncated flag', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch(startPayload); });
    act(() => {
      result.current.dispatch({
        type: 'UPDATE_E2E_DEPTH',
        maxDepth: 20,
        path: ['A', 'B', 'C'],
        edges: ['e-AB', 'e-BC'],
        steps: sampleSteps,
        truncated: true,
      });
    });
    expect(result.current.state.e2eTracing?.truncated).toBe(true);
  });

  it('keeps other e2eTracing fields (startNodeId, active)', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch(startPayload); });
    act(() => {
      result.current.dispatch({
        type: 'UPDATE_E2E_DEPTH',
        maxDepth: 3,
        path: ['A'],
        edges: [],
        steps: sampleSteps.slice(0, 1),
        truncated: false,
      });
    });
    expect(result.current.state.e2eTracing?.startNodeId).toBe('A');
    expect(result.current.state.e2eTracing?.active).toBe(true);
  });

  it('returns null for e2eTracing when it was null (no-op)', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'UPDATE_E2E_DEPTH',
        maxDepth: 3,
        path: [],
        edges: [],
        steps: [],
        truncated: false,
      });
    });
    expect(result.current.state.e2eTracing).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// CLEAR_E2E_TRACING
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 9 — CLEAR_E2E_TRACING', () => {
  it('sets e2eTracing to null', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'START_E2E_TRACING',
        startNodeId: 'A',
        path: ['A'],
        edges: [],
        steps: sampleSteps.slice(0, 1),
        truncated: false,
      });
    });
    expect(result.current.state.e2eTracing).not.toBeNull();
    act(() => { result.current.dispatch({ type: 'CLEAR_E2E_TRACING' }); });
    expect(result.current.state.e2eTracing).toBeNull();
  });

  it('sets isE2ESelecting to false', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch({ type: 'SET_E2E_SELECTING', selecting: true }); });
    act(() => { result.current.dispatch({ type: 'CLEAR_E2E_TRACING' }); });
    expect(result.current.state.isE2ESelecting).toBe(false);
  });

  it('CLEAR_E2E_TRACING when already null stays null', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch({ type: 'CLEAR_E2E_TRACING' }); });
    expect(result.current.state.e2eTracing).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// SET_E2E_SELECTING
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 9 — SET_E2E_SELECTING', () => {
  it('sets isE2ESelecting to true', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch({ type: 'SET_E2E_SELECTING', selecting: true }); });
    expect(result.current.state.isE2ESelecting).toBe(true);
  });

  it('sets isE2ESelecting to false', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch({ type: 'SET_E2E_SELECTING', selecting: true }); });
    act(() => { result.current.dispatch({ type: 'SET_E2E_SELECTING', selecting: false }); });
    expect(result.current.state.isE2ESelecting).toBe(false);
  });
});
