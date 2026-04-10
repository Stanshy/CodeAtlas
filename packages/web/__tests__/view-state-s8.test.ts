/**
 * Sprint 8 — ViewState unit tests
 *
 * Tests the 9 new Sprint 8 actions added to viewStateReducer:
 *   - IMPACT_ANALYZE
 *   - UPDATE_IMPACT_DEPTH
 *   - CLEAR_IMPACT
 *   - SET_FILTER
 *   - RESET_FILTER
 *   - ENTER_SEARCH_FOCUS
 *   - EXIT_SEARCH_FOCUS
 *   - SHOW_CONTEXT_MENU
 *   - HIDE_CONTEXT_MENU
 *
 * Uses the same renderHook + ViewStateProvider pattern as view-state-s7.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ViewStateProvider, useViewState } from '../src/contexts/ViewStateContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(ViewStateProvider, null, children);
}

// ---------------------------------------------------------------------------
// Initial state — Sprint 8 fields
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 8 — initial state', () => {
  it('impactAnalysis is null', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.impactAnalysis).toBeNull();
  });

  it('filter starts with empty arrays', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.filter.directories).toEqual([]);
    expect(result.current.state.filter.nodeTypes).toEqual([]);
    expect(result.current.state.filter.edgeTypes).toEqual([]);
  });

  it('isSearchFocused is false', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.isSearchFocused).toBe(false);
  });

  it('searchFocusNodes is empty array', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.searchFocusNodes).toEqual([]);
  });

  it('contextMenu is null', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.contextMenu).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// IMPACT_ANALYZE
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 8 — IMPACT_ANALYZE', () => {
  const payload = {
    type: 'IMPACT_ANALYZE' as const,
    direction: 'forward' as const,
    targetNodeId: 'src/utils.ts',
    impactedNodes: ['src/utils.ts', 'src/app.ts'],
    impactedEdges: ['utils--import--app'],
    depthMap: { 'src/utils.ts': 0, 'src/app.ts': 1 },
  };

  it('sets impactAnalysis.active to true', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch(payload); });
    expect(result.current.state.impactAnalysis?.active).toBe(true);
  });

  it('sets impactAnalysis.direction correctly', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch(payload); });
    expect(result.current.state.impactAnalysis?.direction).toBe('forward');
  });

  it('sets impactAnalysis.targetNodeId', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch(payload); });
    expect(result.current.state.impactAnalysis?.targetNodeId).toBe('src/utils.ts');
  });

  it('sets impactedNodes list', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch(payload); });
    expect(result.current.state.impactAnalysis?.impactedNodes).toEqual(['src/utils.ts', 'src/app.ts']);
  });

  it('sets impactedEdges list', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch(payload); });
    expect(result.current.state.impactAnalysis?.impactedEdges).toEqual(['utils--import--app']);
  });

  it('sets depthMap', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch(payload); });
    expect(result.current.state.impactAnalysis?.depthMap).toEqual({ 'src/utils.ts': 0, 'src/app.ts': 1 });
  });

  it('sets isPanelOpen to true', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch(payload); });
    expect(result.current.state.isPanelOpen).toBe(true);
  });

  it('preserves existing maxDepth default of 5', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch(payload); });
    expect(result.current.state.impactAnalysis?.maxDepth).toBe(5);
  });

  it('works with reverse direction', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ ...payload, direction: 'reverse' });
    });
    expect(result.current.state.impactAnalysis?.direction).toBe('reverse');
  });
});

// ---------------------------------------------------------------------------
// UPDATE_IMPACT_DEPTH
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 8 — UPDATE_IMPACT_DEPTH', () => {
  it('updates maxDepth value', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    // First set up impactAnalysis state
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
    act(() => {
      result.current.dispatch({
        type: 'UPDATE_IMPACT_DEPTH',
        maxDepth: 3,
        impactedNodes: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
        impactedEdges: ['a-b', 'b-c'],
        depthMap: { 'src/a.ts': 0, 'src/b.ts': 1, 'src/c.ts': 2 },
      });
    });
    expect(result.current.state.impactAnalysis?.maxDepth).toBe(3);
  });

  it('updates impactedNodes with new BFS result', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
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
    act(() => {
      result.current.dispatch({
        type: 'UPDATE_IMPACT_DEPTH',
        maxDepth: 2,
        impactedNodes: ['src/a.ts', 'src/b.ts'],
        impactedEdges: ['a-b'],
        depthMap: { 'src/a.ts': 0, 'src/b.ts': 1 },
      });
    });
    expect(result.current.state.impactAnalysis?.impactedNodes).toEqual(['src/a.ts', 'src/b.ts']);
  });

  it('is a no-op when impactAnalysis is null', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'UPDATE_IMPACT_DEPTH',
        maxDepth: 3,
        impactedNodes: [],
        impactedEdges: [],
        depthMap: {},
      });
    });
    expect(result.current.state.impactAnalysis).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// CLEAR_IMPACT
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 8 — CLEAR_IMPACT', () => {
  it('sets impactAnalysis to null', () => {
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
    act(() => {
      result.current.dispatch({ type: 'CLEAR_IMPACT' });
    });
    expect(result.current.state.impactAnalysis).toBeNull();
  });

  it('CLEAR_IMPACT when already null stays null', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'CLEAR_IMPACT' });
    });
    expect(result.current.state.impactAnalysis).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// SET_FILTER
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 8 — SET_FILTER', () => {
  it('updates directories', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_FILTER', filter: { directories: ['src/core'] } });
    });
    expect(result.current.state.filter.directories).toEqual(['src/core']);
  });

  it('updates nodeTypes', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_FILTER', filter: { nodeTypes: ['file', 'function'] } });
    });
    expect(result.current.state.filter.nodeTypes).toEqual(['file', 'function']);
  });

  it('updates edgeTypes', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_FILTER', filter: { edgeTypes: ['import'] } });
    });
    expect(result.current.state.filter.edgeTypes).toEqual(['import']);
  });

  it('is a partial update — untouched fields are preserved', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_FILTER', filter: { directories: ['src/core'] } });
    });
    act(() => {
      result.current.dispatch({ type: 'SET_FILTER', filter: { nodeTypes: ['file'] } });
    });
    // directories should still be set from first dispatch
    expect(result.current.state.filter.directories).toEqual(['src/core']);
    expect(result.current.state.filter.nodeTypes).toEqual(['file']);
  });
});

// ---------------------------------------------------------------------------
// RESET_FILTER
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 8 — RESET_FILTER', () => {
  it('resets directories to empty array', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_FILTER', filter: { directories: ['src/core'] } });
    });
    act(() => {
      result.current.dispatch({ type: 'RESET_FILTER' });
    });
    expect(result.current.state.filter.directories).toEqual([]);
  });

  it('resets nodeTypes to empty array', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_FILTER', filter: { nodeTypes: ['file'] } });
    });
    act(() => {
      result.current.dispatch({ type: 'RESET_FILTER' });
    });
    expect(result.current.state.filter.nodeTypes).toEqual([]);
  });

  it('resets edgeTypes to empty array', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_FILTER', filter: { edgeTypes: ['import', 'call'] } });
    });
    act(() => {
      result.current.dispatch({ type: 'RESET_FILTER' });
    });
    expect(result.current.state.filter.edgeTypes).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// ENTER_SEARCH_FOCUS
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 8 — ENTER_SEARCH_FOCUS', () => {
  it('sets isSearchFocused to true', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'ENTER_SEARCH_FOCUS',
        nodeIds: ['src/a.ts'],
        edgeIds: [],
      });
    });
    expect(result.current.state.isSearchFocused).toBe(true);
  });

  it('sets searchFocusNodes', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'ENTER_SEARCH_FOCUS',
        nodeIds: ['src/a.ts', 'src/b.ts'],
        edgeIds: [],
      });
    });
    expect(result.current.state.searchFocusNodes).toEqual(['src/a.ts', 'src/b.ts']);
  });

  it('sets searchFocusEdges', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'ENTER_SEARCH_FOCUS',
        nodeIds: [],
        edgeIds: ['edge1', 'edge2'],
      });
    });
    expect(result.current.state.searchFocusEdges).toEqual(['edge1', 'edge2']);
  });
});

// ---------------------------------------------------------------------------
// EXIT_SEARCH_FOCUS
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 8 — EXIT_SEARCH_FOCUS', () => {
  it('sets isSearchFocused to false', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'ENTER_SEARCH_FOCUS',
        nodeIds: ['src/a.ts'],
        edgeIds: [],
      });
    });
    act(() => {
      result.current.dispatch({ type: 'EXIT_SEARCH_FOCUS' });
    });
    expect(result.current.state.isSearchFocused).toBe(false);
  });

  it('clears searchFocusNodes to empty array', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'ENTER_SEARCH_FOCUS',
        nodeIds: ['src/a.ts'],
        edgeIds: [],
      });
    });
    act(() => {
      result.current.dispatch({ type: 'EXIT_SEARCH_FOCUS' });
    });
    expect(result.current.state.searchFocusNodes).toEqual([]);
  });

  it('clears searchFocusEdges to empty array', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'ENTER_SEARCH_FOCUS',
        nodeIds: [],
        edgeIds: ['edge1'],
      });
    });
    act(() => {
      result.current.dispatch({ type: 'EXIT_SEARCH_FOCUS' });
    });
    expect(result.current.state.searchFocusEdges).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// SHOW_CONTEXT_MENU
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 8 — SHOW_CONTEXT_MENU', () => {
  it('sets contextMenu.visible to true', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SHOW_CONTEXT_MENU', x: 100, y: 200, nodeId: 'src/a.ts' });
    });
    expect(result.current.state.contextMenu?.visible).toBe(true);
  });

  it('sets contextMenu.x and y coordinates', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SHOW_CONTEXT_MENU', x: 100, y: 200, nodeId: 'src/a.ts' });
    });
    expect(result.current.state.contextMenu?.x).toBe(100);
    expect(result.current.state.contextMenu?.y).toBe(200);
  });

  it('sets contextMenu.nodeId', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SHOW_CONTEXT_MENU', x: 0, y: 0, nodeId: 'src/utils.ts' });
    });
    expect(result.current.state.contextMenu?.nodeId).toBe('src/utils.ts');
  });

  it('replaces previous context menu when called again', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SHOW_CONTEXT_MENU', x: 10, y: 20, nodeId: 'src/a.ts' });
    });
    act(() => {
      result.current.dispatch({ type: 'SHOW_CONTEXT_MENU', x: 50, y: 60, nodeId: 'src/b.ts' });
    });
    expect(result.current.state.contextMenu?.x).toBe(50);
    expect(result.current.state.contextMenu?.nodeId).toBe('src/b.ts');
  });
});

// ---------------------------------------------------------------------------
// HIDE_CONTEXT_MENU
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 8 — HIDE_CONTEXT_MENU', () => {
  it('sets contextMenu to null', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SHOW_CONTEXT_MENU', x: 100, y: 200, nodeId: 'src/a.ts' });
    });
    act(() => {
      result.current.dispatch({ type: 'HIDE_CONTEXT_MENU' });
    });
    expect(result.current.state.contextMenu).toBeNull();
  });

  it('HIDE_CONTEXT_MENU when already null stays null', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'HIDE_CONTEXT_MENU' });
    });
    expect(result.current.state.contextMenu).toBeNull();
  });
});
