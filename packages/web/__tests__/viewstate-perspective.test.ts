/**
 * Sprint 11 — ViewState SET_PERSPECTIVE / SET_3D_MODE unit tests
 *
 * Coverage:
 *   - Initial activePerspective is 'logic-operation'
 *   - SET_PERSPECTIVE updates activePerspective
 *   - SET_PERSPECTIVE clears impactAnalysis
 *   - SET_PERSPECTIVE clears isSearchFocused
 *   - SET_PERSPECTIVE clears e2eTracing
 *   - SET_PERSPECTIVE clears filter
 *   - SET_PERSPECTIVE system-framework + 3D mode → auto-switches to 2D
 *   - SET_PERSPECTIVE to non-system-framework while 3D stays 3D
 *   - SET_3D_MODE '3d' while system-framework → auto-switch perspective to logic-operation
 *   - SET_3D_MODE '2d' while system-framework → stays system-framework
 *   - pinnedNodeIds are preserved across perspective switches
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ViewStateProvider, useViewState } from '../src/contexts/ViewStateContext';
import type { E2EStep } from '../src/types/graph';

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(ViewStateProvider, null, children);
}

const sampleSteps: E2EStep[] = [
  { nodeId: 'A', nodeLabel: 'NodeA', edgeId: null, edgeType: null, symbols: [], depth: 0 },
  { nodeId: 'B', nodeLabel: 'NodeB', edgeId: 'e-AB', edgeType: 'import', symbols: [], depth: 1 },
];

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 11 — initial state', () => {
  it('activePerspective defaults to logic-operation', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.activePerspective).toBe('logic-operation');
  });
});

// ---------------------------------------------------------------------------
// SET_PERSPECTIVE — basic updates
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 11 — SET_PERSPECTIVE basic', () => {
  it('updates activePerspective to system-framework', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_PERSPECTIVE', perspective: 'system-framework' });
    });
    expect(result.current.state.activePerspective).toBe('system-framework');
  });

  it('updates activePerspective to data-journey', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_PERSPECTIVE', perspective: 'data-journey' });
    });
    expect(result.current.state.activePerspective).toBe('data-journey');
  });

  it('updates activePerspective to logic-operation', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_PERSPECTIVE', perspective: 'system-framework' });
    });
    act(() => {
      result.current.dispatch({ type: 'SET_PERSPECTIVE', perspective: 'logic-operation' });
    });
    expect(result.current.state.activePerspective).toBe('logic-operation');
  });
});

// ---------------------------------------------------------------------------
// SET_PERSPECTIVE — clears conflicting states
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 11 — SET_PERSPECTIVE clears conflicts', () => {
  it('clears impactAnalysis', () => {
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
    expect(result.current.state.impactAnalysis).not.toBeNull();

    act(() => {
      result.current.dispatch({ type: 'SET_PERSPECTIVE', perspective: 'data-journey' });
    });
    expect(result.current.state.impactAnalysis).toBeNull();
  });

  it('clears isSearchFocused', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'ENTER_SEARCH_FOCUS',
        nodeIds: ['src/a.ts'],
        edgeIds: [],
      });
    });
    expect(result.current.state.isSearchFocused).toBe(true);

    act(() => {
      result.current.dispatch({ type: 'SET_PERSPECTIVE', perspective: 'system-framework' });
    });
    expect(result.current.state.isSearchFocused).toBe(false);
  });

  it('clears e2eTracing', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'START_E2E_TRACING',
        startNodeId: 'A',
        path: ['A', 'B'],
        edges: ['e-AB'],
        steps: sampleSteps,
        truncated: false,
      });
    });
    expect(result.current.state.e2eTracing).not.toBeNull();

    act(() => {
      result.current.dispatch({ type: 'SET_PERSPECTIVE', perspective: 'logic-operation' });
    });
    expect(result.current.state.e2eTracing).toBeNull();
  });

  it('resets filter.nodeTypes to empty', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'SET_FILTER',
        filter: { nodeTypes: ['file'], edgeTypes: ['import'] },
      });
    });
    act(() => {
      result.current.dispatch({ type: 'SET_PERSPECTIVE', perspective: 'data-journey' });
    });
    expect(result.current.state.filter.nodeTypes).toEqual([]);
  });

  it('resets filter.edgeTypes to empty', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'SET_FILTER',
        filter: { nodeTypes: [], edgeTypes: ['call'] },
      });
    });
    act(() => {
      result.current.dispatch({ type: 'SET_PERSPECTIVE', perspective: 'system-framework' });
    });
    expect(result.current.state.filter.edgeTypes).toEqual([]);
  });

  it('resets filter.directories to empty', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'SET_FILTER',
        filter: { directories: ['src/utils'], nodeTypes: [], edgeTypes: [] },
      });
    });
    act(() => {
      result.current.dispatch({ type: 'SET_PERSPECTIVE', perspective: 'logic-operation' });
    });
    expect(result.current.state.filter.directories).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// SET_PERSPECTIVE — 3D auto-switch
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 11 — SET_PERSPECTIVE + 3D auto-switch', () => {
  it('switching to system-framework while in 3D mode auto-switches to 2D', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    // First switch to 3D
    act(() => {
      result.current.dispatch({ type: 'SET_MODE', mode: '3d' });
    });
    expect(result.current.state.mode).toBe('3d');

    // Now switch perspective to system-framework
    act(() => {
      result.current.dispatch({ type: 'SET_PERSPECTIVE', perspective: 'system-framework' });
    });
    expect(result.current.state.mode).toBe('2d');
    expect(result.current.state.activePerspective).toBe('system-framework');
  });

  it('switching to logic-operation while in 3D mode stays 3D', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_MODE', mode: '3d' });
    });
    act(() => {
      result.current.dispatch({ type: 'SET_PERSPECTIVE', perspective: 'logic-operation' });
    });
    expect(result.current.state.mode).toBe('3d');
  });

  it('switching to data-journey while in 3D mode stays 3D', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_MODE', mode: '3d' });
    });
    act(() => {
      result.current.dispatch({ type: 'SET_PERSPECTIVE', perspective: 'data-journey' });
    });
    expect(result.current.state.mode).toBe('3d');
  });
});

// ---------------------------------------------------------------------------
// SET_3D_MODE — system-framework auto-switch
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 11 — SET_3D_MODE', () => {
  it('switching to 3D while system-framework is active auto-switches to logic-operation', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_PERSPECTIVE', perspective: 'system-framework' });
    });
    // Ensure 2D first (system-framework may have forced it)
    expect(result.current.state.activePerspective).toBe('system-framework');

    act(() => {
      result.current.dispatch({ type: 'SET_3D_MODE', mode: '3d' });
    });
    expect(result.current.state.mode).toBe('3d');
    expect(result.current.state.activePerspective).toBe('logic-operation');
  });

  it('switching to 3D while logic-operation stays logic-operation', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    // Default is logic-operation
    act(() => {
      result.current.dispatch({ type: 'SET_3D_MODE', mode: '3d' });
    });
    expect(result.current.state.activePerspective).toBe('logic-operation');
  });

  it('switching back to 2D does not change perspective', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_3D_MODE', mode: '3d' });
    });
    act(() => {
      result.current.dispatch({ type: 'SET_3D_MODE', mode: '2d' });
    });
    expect(result.current.state.mode).toBe('2d');
    expect(result.current.state.activePerspective).toBe('logic-operation');
  });

  it('switching to 2D while system-framework leaves perspective unchanged', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    // Switch to system-framework (forces 2D)
    act(() => {
      result.current.dispatch({ type: 'SET_PERSPECTIVE', perspective: 'system-framework' });
    });
    act(() => {
      result.current.dispatch({ type: 'SET_3D_MODE', mode: '2d' });
    });
    expect(result.current.state.activePerspective).toBe('system-framework');
  });
});

// ---------------------------------------------------------------------------
// pinnedNodeIds preserved across perspective switch
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 11 — pinnedNodeIds across perspectives', () => {
  it('pinnedNodeIds are preserved when switching perspective', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'PIN_NODE', nodeId: 'src/util.ts' });
    });
    act(() => {
      result.current.dispatch({ type: 'SET_PERSPECTIVE', perspective: 'system-framework' });
    });
    expect(result.current.state.pinnedNodeIds).toContain('src/util.ts');
  });

  it('pinnedNodeIds not cleared when switching from system-framework to data-journey', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'PIN_NODE', nodeId: 'src/a.ts' });
      result.current.dispatch({ type: 'PIN_NODE', nodeId: 'src/b.ts' });
    });
    act(() => {
      result.current.dispatch({ type: 'SET_PERSPECTIVE', perspective: 'system-framework' });
    });
    act(() => {
      result.current.dispatch({ type: 'SET_PERSPECTIVE', perspective: 'data-journey' });
    });
    expect(result.current.state.pinnedNodeIds).toContain('src/a.ts');
    expect(result.current.state.pinnedNodeIds).toContain('src/b.ts');
  });
});
