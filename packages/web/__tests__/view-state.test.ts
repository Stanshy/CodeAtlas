/**
 * view-state unit tests
 *
 * Tests the viewStateReducer logic via renderHook + ViewStateProvider.
 * Covers all action types: SET_MODE, SELECT_NODE, HOVER_NODE,
 * SET_SEARCH_QUERY, FOCUS_NODE, CLEAR_FOCUS, CLOSE_PANEL,
 * SET_CAMERA_PRESET, CLEAR_CAMERA_PRESET.
 *
 * Strategy: method A — renderHook(@testing-library/react) wrapped in
 * ViewStateProvider so we exercise the real reducer without exporting it.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ViewStateProvider, useViewState } from '../src/contexts/ViewStateContext';

// Wrapper factory so renderHook can be re-used cleanly
function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(ViewStateProvider, null, children);
}

describe('viewStateReducer — initial state', () => {
  it('has mode set to 2d', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.mode).toBe('2d');
  });

  it('has selectedNodeId set to null', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.selectedNodeId).toBeNull();
  });

  it('has hoveredNodeId set to null', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.hoveredNodeId).toBeNull();
  });

  it('has searchQuery set to empty string', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.searchQuery).toBe('');
  });

  it('has isPanelOpen set to false', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.isPanelOpen).toBe(false);
  });

  it('has focusNodeId set to null', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.focusNodeId).toBeNull();
  });

  it('has cameraPreset set to null', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.cameraPreset).toBeNull();
  });
});

describe('viewStateReducer — SET_MODE', () => {
  it('switches mode from 2d to 3d', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_MODE', mode: '3d' });
    });
    expect(result.current.state.mode).toBe('3d');
  });

  it('switches mode from 3d back to 2d', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_MODE', mode: '3d' });
    });
    act(() => {
      result.current.dispatch({ type: 'SET_MODE', mode: '2d' });
    });
    expect(result.current.state.mode).toBe('2d');
  });

  it('preserves selectedNodeId when switching mode', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SELECT_NODE', nodeId: 'node-1' });
    });
    act(() => {
      result.current.dispatch({ type: 'SET_MODE', mode: '3d' });
    });
    expect(result.current.state.selectedNodeId).toBe('node-1');
  });
});

describe('viewStateReducer — SELECT_NODE', () => {
  it('sets selectedNodeId to the given nodeId', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SELECT_NODE', nodeId: 'src/index.ts' });
    });
    expect(result.current.state.selectedNodeId).toBe('src/index.ts');
  });

  it('opens the panel when a node is selected', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SELECT_NODE', nodeId: 'src/index.ts' });
    });
    expect(result.current.state.isPanelOpen).toBe(true);
  });

  it('clears selectedNodeId when nodeId is null', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SELECT_NODE', nodeId: 'src/index.ts' });
    });
    act(() => {
      result.current.dispatch({ type: 'SELECT_NODE', nodeId: null });
    });
    expect(result.current.state.selectedNodeId).toBeNull();
  });

  it('closes the panel when nodeId is null', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SELECT_NODE', nodeId: 'src/index.ts' });
    });
    act(() => {
      result.current.dispatch({ type: 'SELECT_NODE', nodeId: null });
    });
    expect(result.current.state.isPanelOpen).toBe(false);
  });
});

describe('viewStateReducer — HOVER_NODE', () => {
  it('sets hoveredNodeId to the given nodeId', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'HOVER_NODE', nodeId: 'src/app.ts' });
    });
    expect(result.current.state.hoveredNodeId).toBe('src/app.ts');
  });

  it('clears hoveredNodeId when null is dispatched', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'HOVER_NODE', nodeId: 'src/app.ts' });
    });
    act(() => {
      result.current.dispatch({ type: 'HOVER_NODE', nodeId: null });
    });
    expect(result.current.state.hoveredNodeId).toBeNull();
  });
});

describe('viewStateReducer — SET_SEARCH_QUERY', () => {
  it('sets searchQuery to the given string', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_SEARCH_QUERY', query: 'helper' });
    });
    expect(result.current.state.searchQuery).toBe('helper');
  });

  it('clears searchQuery when empty string is dispatched', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_SEARCH_QUERY', query: 'helper' });
    });
    act(() => {
      result.current.dispatch({ type: 'SET_SEARCH_QUERY', query: '' });
    });
    expect(result.current.state.searchQuery).toBe('');
  });
});

describe('viewStateReducer — FOCUS_NODE', () => {
  it('sets focusNodeId to the given nodeId', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'FOCUS_NODE', nodeId: 'src/utils/helper.ts' });
    });
    expect(result.current.state.focusNodeId).toBe('src/utils/helper.ts');
  });
});

describe('viewStateReducer — CLEAR_FOCUS', () => {
  it('clears focusNodeId after it was set', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'FOCUS_NODE', nodeId: 'src/utils/helper.ts' });
    });
    act(() => {
      result.current.dispatch({ type: 'CLEAR_FOCUS' });
    });
    expect(result.current.state.focusNodeId).toBeNull();
  });
});

describe('viewStateReducer — CLOSE_PANEL', () => {
  it('sets isPanelOpen to false', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SELECT_NODE', nodeId: 'src/index.ts' });
    });
    act(() => {
      result.current.dispatch({ type: 'CLOSE_PANEL' });
    });
    expect(result.current.state.isPanelOpen).toBe(false);
  });

  it('clears selectedNodeId', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SELECT_NODE', nodeId: 'src/index.ts' });
    });
    act(() => {
      result.current.dispatch({ type: 'CLOSE_PANEL' });
    });
    expect(result.current.state.selectedNodeId).toBeNull();
  });
});

describe('viewStateReducer — SET_CAMERA_PRESET', () => {
  it('sets cameraPreset to the given preset name', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_CAMERA_PRESET', preset: 'topDown' });
    });
    expect(result.current.state.cameraPreset).toBe('topDown');
  });

  it('sets cameraPreset to sideView', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_CAMERA_PRESET', preset: 'sideView' });
    });
    expect(result.current.state.cameraPreset).toBe('sideView');
  });
});

describe('viewStateReducer — CLEAR_CAMERA_PRESET', () => {
  it('clears cameraPreset after it was set', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_CAMERA_PRESET', preset: 'topDown' });
    });
    act(() => {
      result.current.dispatch({ type: 'CLEAR_CAMERA_PRESET' });
    });
    expect(result.current.state.cameraPreset).toBeNull();
  });
});
