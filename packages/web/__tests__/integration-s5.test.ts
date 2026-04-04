/**
 * Sprint 5 ViewState integration tests
 *
 * Tests the reducer actions introduced in Sprint 5 at the reducer level
 * (no rendering required — uses renderHook + ViewStateProvider).
 *
 * Actions covered:
 *   - START_TRACING → sets tracingSymbol, tracingPath, tracingEdges, opens panel
 *   - STOP_TRACING  → clears all tracing state
 *   - TOGGLE_HEATMAP → flips isHeatmapEnabled
 *   - HOVER_EDGE → sets hoveredEdgeId
 *   - SET_MODE preserves tracing state
 *   - STOP_TRACING doesn't affect unrelated state
 *
 * Sprint 5 — T9: Unit + Integration Tests
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ViewStateProvider, useViewState } from '../src/contexts/ViewStateContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(ViewStateProvider, null, children);
}

// ---------------------------------------------------------------------------
// START_TRACING
// ---------------------------------------------------------------------------

describe('integration-s5 — START_TRACING', () => {
  it('sets tracingSymbol to the dispatched symbol', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'START_TRACING',
        symbol: 'UserService',
        path: ['src/a.ts', 'src/b.ts'],
        edges: ['e1'],
      });
    });
    expect(result.current.state.tracingSymbol).toBe('UserService');
  });

  it('sets tracingPath to the dispatched path array', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'START_TRACING',
        symbol: 'UserService',
        path: ['src/a.ts', 'src/b.ts'],
        edges: ['e1'],
      });
    });
    expect(result.current.state.tracingPath).toEqual(['src/a.ts', 'src/b.ts']);
  });

  it('sets tracingEdges to the dispatched edges array', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'START_TRACING',
        symbol: 'UserService',
        path: ['src/a.ts'],
        edges: ['e1', 'e2'],
      });
    });
    expect(result.current.state.tracingEdges).toEqual(['e1', 'e2']);
  });

  it('sets isPanelOpen to true', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'START_TRACING',
        symbol: 'UserService',
        path: [],
        edges: [],
      });
    });
    expect(result.current.state.isPanelOpen).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// STOP_TRACING
// ---------------------------------------------------------------------------

describe('integration-s5 — STOP_TRACING', () => {
  function setupWithTracing() {
    const hook = renderHook(() => useViewState(), { wrapper });
    act(() => {
      hook.result.current.dispatch({
        type: 'START_TRACING',
        symbol: 'AuthMiddleware',
        path: ['src/x.ts', 'src/y.ts'],
        edges: ['ex1'],
      });
    });
    return hook;
  }

  it('clears tracingSymbol to null', () => {
    const { result } = setupWithTracing();
    act(() => {
      result.current.dispatch({ type: 'STOP_TRACING' });
    });
    expect(result.current.state.tracingSymbol).toBeNull();
  });

  it('clears tracingPath to empty array', () => {
    const { result } = setupWithTracing();
    act(() => {
      result.current.dispatch({ type: 'STOP_TRACING' });
    });
    expect(result.current.state.tracingPath).toEqual([]);
  });

  it('clears tracingEdges to empty array', () => {
    const { result } = setupWithTracing();
    act(() => {
      result.current.dispatch({ type: 'STOP_TRACING' });
    });
    expect(result.current.state.tracingEdges).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// STOP_TRACING doesn't affect unrelated state
// ---------------------------------------------------------------------------

describe('integration-s5 — STOP_TRACING does not affect other state', () => {
  it('preserves selectedNodeId after STOP_TRACING', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SELECT_NODE', nodeId: 'src/main.ts' });
    });
    act(() => {
      result.current.dispatch({
        type: 'START_TRACING',
        symbol: 'Foo',
        path: ['src/main.ts'],
        edges: [],
      });
    });
    act(() => {
      result.current.dispatch({ type: 'STOP_TRACING' });
    });
    expect(result.current.state.selectedNodeId).toBe('src/main.ts');
  });

  it('preserves mode after STOP_TRACING', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_MODE', mode: '3d' });
    });
    act(() => {
      result.current.dispatch({
        type: 'START_TRACING',
        symbol: 'Foo',
        path: [],
        edges: [],
      });
    });
    act(() => {
      result.current.dispatch({ type: 'STOP_TRACING' });
    });
    expect(result.current.state.mode).toBe('3d');
  });
});

// ---------------------------------------------------------------------------
// TOGGLE_HEATMAP
// ---------------------------------------------------------------------------

describe('integration-s5 — TOGGLE_HEATMAP', () => {
  it('flips isHeatmapEnabled from false to true', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'TOGGLE_HEATMAP' });
    });
    expect(result.current.state.isHeatmapEnabled).toBe(true);
  });

  it('flips isHeatmapEnabled back to false on second dispatch', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'TOGGLE_HEATMAP' });
    });
    act(() => {
      result.current.dispatch({ type: 'TOGGLE_HEATMAP' });
    });
    expect(result.current.state.isHeatmapEnabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// HOVER_EDGE
// ---------------------------------------------------------------------------

describe('integration-s5 — HOVER_EDGE', () => {
  it('sets hoveredEdgeId to the given edge ID', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'HOVER_EDGE', edgeId: 'edge-42' });
    });
    expect(result.current.state.hoveredEdgeId).toBe('edge-42');
  });

  it('clears hoveredEdgeId when null is dispatched', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'HOVER_EDGE', edgeId: 'edge-42' });
    });
    act(() => {
      result.current.dispatch({ type: 'HOVER_EDGE', edgeId: null });
    });
    expect(result.current.state.hoveredEdgeId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// SET_MODE preserves tracing state
// ---------------------------------------------------------------------------

describe('integration-s5 — SET_MODE preserves tracing state', () => {
  it('tracingSymbol is preserved after switching from 2D to 3D', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'START_TRACING',
        symbol: 'PersistSym',
        path: ['src/a.ts'],
        edges: ['e1'],
      });
    });
    act(() => {
      result.current.dispatch({ type: 'SET_MODE', mode: '3d' });
    });
    expect(result.current.state.tracingSymbol).toBe('PersistSym');
  });

  it('tracingPath is preserved after switching mode', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'START_TRACING',
        symbol: 'PersistSym',
        path: ['src/a.ts', 'src/b.ts'],
        edges: ['e1'],
      });
    });
    act(() => {
      result.current.dispatch({ type: 'SET_MODE', mode: '3d' });
    });
    expect(result.current.state.tracingPath).toEqual(['src/a.ts', 'src/b.ts']);
  });

  it('tracingEdges are preserved after switching mode', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'START_TRACING',
        symbol: 'PersistSym',
        path: ['src/a.ts'],
        edges: ['ex1', 'ex2'],
      });
    });
    act(() => {
      result.current.dispatch({ type: 'SET_MODE', mode: '3d' });
    });
    expect(result.current.state.tracingEdges).toEqual(['ex1', 'ex2']);
  });
});
