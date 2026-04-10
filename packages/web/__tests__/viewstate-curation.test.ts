/**
 * Sprint 10 — ViewState PIN_NODE / UNPIN_NODE + useViewStateSelector tests
 *
 * Tests the Sprint 10 additions to viewStateReducer and the new selector hook:
 *   - PIN_NODE: adds nodeId to pinnedNodeIds (no duplicates)
 *   - UNPIN_NODE: removes nodeId from pinnedNodeIds (no error if absent)
 *   - pinnedNodeIds initial state
 *   - useViewStateSelector: returns correct state slice
 *   - useViewStateSelector: updates after dispatch
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import {
  ViewStateProvider,
  useViewState,
  useViewStateSelector,
} from '../src/contexts/ViewStateContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(ViewStateProvider, null, children);
}

// ---------------------------------------------------------------------------
// Initial state — Sprint 10 field
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 10 — initial state', () => {
  it('pinnedNodeIds defaults to empty array', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.pinnedNodeIds).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// PIN_NODE
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 10 — PIN_NODE', () => {
  it('adds a new nodeId to pinnedNodeIds', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch({ type: 'PIN_NODE', nodeId: 'src/util.ts' }); });
    expect(result.current.state.pinnedNodeIds).toContain('src/util.ts');
  });

  it('pinnedNodeIds grows by one after pinning a new node', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch({ type: 'PIN_NODE', nodeId: 'src/util.ts' }); });
    expect(result.current.state.pinnedNodeIds).toHaveLength(1);
  });

  it('does not duplicate nodeId when pinned twice', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch({ type: 'PIN_NODE', nodeId: 'src/util.ts' }); });
    act(() => { result.current.dispatch({ type: 'PIN_NODE', nodeId: 'src/util.ts' }); });
    expect(result.current.state.pinnedNodeIds).toHaveLength(1);
  });

  it('can pin multiple distinct nodes', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch({ type: 'PIN_NODE', nodeId: 'src/a.ts' }); });
    act(() => { result.current.dispatch({ type: 'PIN_NODE', nodeId: 'src/b.ts' }); });
    expect(result.current.state.pinnedNodeIds).toContain('src/a.ts');
    expect(result.current.state.pinnedNodeIds).toContain('src/b.ts');
    expect(result.current.state.pinnedNodeIds).toHaveLength(2);
  });

  it('preserves existing pinnedNodeIds when pinning a new node', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch({ type: 'PIN_NODE', nodeId: 'src/a.ts' }); });
    act(() => { result.current.dispatch({ type: 'PIN_NODE', nodeId: 'src/b.ts' }); });
    // src/a.ts should still be pinned
    expect(result.current.state.pinnedNodeIds).toContain('src/a.ts');
  });
});

// ---------------------------------------------------------------------------
// UNPIN_NODE
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 10 — UNPIN_NODE', () => {
  it('removes a pinned nodeId', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch({ type: 'PIN_NODE', nodeId: 'src/util.ts' }); });
    act(() => { result.current.dispatch({ type: 'UNPIN_NODE', nodeId: 'src/util.ts' }); });
    expect(result.current.state.pinnedNodeIds).not.toContain('src/util.ts');
  });

  it('pinnedNodeIds is empty after unpinning the only pinned node', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch({ type: 'PIN_NODE', nodeId: 'src/util.ts' }); });
    act(() => { result.current.dispatch({ type: 'UNPIN_NODE', nodeId: 'src/util.ts' }); });
    expect(result.current.state.pinnedNodeIds).toHaveLength(0);
  });

  it('does not throw when unpinning a nodeId that is not pinned', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(() => {
      act(() => { result.current.dispatch({ type: 'UNPIN_NODE', nodeId: 'src/not-pinned.ts' }); });
    }).not.toThrow();
  });

  it('leaves pinnedNodeIds unchanged when unpinning absent nodeId', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch({ type: 'PIN_NODE', nodeId: 'src/a.ts' }); });
    act(() => { result.current.dispatch({ type: 'UNPIN_NODE', nodeId: 'src/not-pinned.ts' }); });
    expect(result.current.state.pinnedNodeIds).toEqual(['src/a.ts']);
  });

  it('removes only the targeted node when multiple are pinned', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch({ type: 'PIN_NODE', nodeId: 'src/a.ts' }); });
    act(() => { result.current.dispatch({ type: 'PIN_NODE', nodeId: 'src/b.ts' }); });
    act(() => { result.current.dispatch({ type: 'UNPIN_NODE', nodeId: 'src/a.ts' }); });
    expect(result.current.state.pinnedNodeIds).not.toContain('src/a.ts');
    expect(result.current.state.pinnedNodeIds).toContain('src/b.ts');
  });

  it('unpin from empty pinnedNodeIds does not throw and remains empty', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => { result.current.dispatch({ type: 'UNPIN_NODE', nodeId: 'src/util.ts' }); });
    expect(result.current.state.pinnedNodeIds).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// useViewStateSelector
// ---------------------------------------------------------------------------

describe('useViewStateSelector — Sprint 10', () => {
  it('returns the correct initial state slice for mode', () => {
    const { result } = renderHook(
      () => useViewStateSelector(s => s.mode),
      { wrapper },
    );
    expect(result.current).toBe('2d');
  });

  it('returns the correct initial state slice for pinnedNodeIds', () => {
    const { result } = renderHook(
      () => useViewStateSelector(s => s.pinnedNodeIds),
      { wrapper },
    );
    expect(result.current).toEqual([]);
  });

  it('returns updated pinnedNodeIds after PIN_NODE dispatch', () => {
    const { result: dispatchResult } = renderHook(() => useViewState(), { wrapper });
    const { result: selectorResult } = renderHook(
      () => useViewStateSelector(s => s.pinnedNodeIds),
      { wrapper },
    );

    // Selector before dispatch
    expect(selectorResult.current).toEqual([]);

    // We need a single provider for both hooks. Use a combined hook approach.
    const { result } = renderHook(
      () => ({
        dispatch: useViewState().dispatch,
        pinnedNodeIds: useViewStateSelector(s => s.pinnedNodeIds),
      }),
      { wrapper },
    );

    act(() => { result.current.dispatch({ type: 'PIN_NODE', nodeId: 'src/x.ts' }); });
    expect(result.current.pinnedNodeIds).toContain('src/x.ts');
  });

  it('selector returns updated value after UNPIN_NODE dispatch', () => {
    const { result } = renderHook(
      () => ({
        dispatch: useViewState().dispatch,
        pinnedNodeIds: useViewStateSelector(s => s.pinnedNodeIds),
      }),
      { wrapper },
    );

    act(() => { result.current.dispatch({ type: 'PIN_NODE', nodeId: 'src/x.ts' }); });
    expect(result.current.pinnedNodeIds).toContain('src/x.ts');

    act(() => { result.current.dispatch({ type: 'UNPIN_NODE', nodeId: 'src/x.ts' }); });
    expect(result.current.pinnedNodeIds).not.toContain('src/x.ts');
  });

  it('selector for hoveredNodeId returns null initially', () => {
    const { result } = renderHook(
      () => useViewStateSelector(s => s.hoveredNodeId),
      { wrapper },
    );
    expect(result.current).toBeNull();
  });

  it('selector for isSettingsPanelOpen returns false initially', () => {
    const { result } = renderHook(
      () => useViewStateSelector(s => s.isSettingsPanelOpen),
      { wrapper },
    );
    expect(result.current).toBe(false);
  });

  it('selector updates when unrelated action changes tracked field', () => {
    const { result } = renderHook(
      () => ({
        dispatch: useViewState().dispatch,
        isHeatmapEnabled: useViewStateSelector(s => s.isHeatmapEnabled),
      }),
      { wrapper },
    );

    expect(result.current.isHeatmapEnabled).toBe(false);
    act(() => { result.current.dispatch({ type: 'TOGGLE_HEATMAP' }); });
    expect(result.current.isHeatmapEnabled).toBe(true);
  });

  it('throws when used outside ViewStateProvider', () => {
    expect(() => {
      renderHook(() => useViewStateSelector(s => s.mode));
    }).toThrow('useViewStateSelector must be used inside <ViewStateProvider>');
  });
});
