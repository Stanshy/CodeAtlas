/**
 * integration-3d tests
 *
 * Integration tests for the ViewStateProvider and reducer in combination.
 * Exercises multi-step dispatch sequences that simulate real user flows:
 * - Switching between 2D and 3D modes
 * - Selecting nodes and verifying panel state
 * - Focus node lifecycle (FOCUS_NODE → CLEAR_FOCUS)
 * - Camera preset lifecycle (SET_CAMERA_PRESET → CLEAR_CAMERA_PRESET)
 *
 * Sprint 4 — T9: Unit + Integration Tests
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ViewStateProvider, useViewState } from '../src/contexts/ViewStateContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(ViewStateProvider, null, children);
}

describe('integration — mode switching', () => {
  it('dispatching SET_MODE 3d changes mode to 3d', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_MODE', mode: '3d' });
    });
    expect(result.current.state.mode).toBe('3d');
  });

  it('selectedNodeId is preserved when mode switches from 2d to 3d', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SELECT_NODE', nodeId: 'src/app.ts' });
    });
    act(() => {
      result.current.dispatch({ type: 'SET_MODE', mode: '3d' });
    });
    expect(result.current.state.selectedNodeId).toBe('src/app.ts');
    expect(result.current.state.mode).toBe('3d');
  });

  it('mode switches back to 2d after two SET_MODE dispatches', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_MODE', mode: '3d' });
    });
    act(() => {
      result.current.dispatch({ type: 'SET_MODE', mode: '2d' });
    });
    expect(result.current.state.mode).toBe('2d');
  });
});

describe('integration — node selection and panel', () => {
  it('SELECT_NODE sets selectedNodeId and opens panel', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SELECT_NODE', nodeId: 'src/utils/helper.ts' });
    });
    expect(result.current.state.selectedNodeId).toBe('src/utils/helper.ts');
    expect(result.current.state.isPanelOpen).toBe(true);
  });

  it('CLOSE_PANEL clears selectedNodeId and closes panel', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SELECT_NODE', nodeId: 'src/utils/helper.ts' });
    });
    act(() => {
      result.current.dispatch({ type: 'CLOSE_PANEL' });
    });
    expect(result.current.state.selectedNodeId).toBeNull();
    expect(result.current.state.isPanelOpen).toBe(false);
  });

  it('SELECT_NODE null deselects and closes panel', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SELECT_NODE', nodeId: 'src/app.ts' });
    });
    act(() => {
      result.current.dispatch({ type: 'SELECT_NODE', nodeId: null });
    });
    expect(result.current.state.selectedNodeId).toBeNull();
    expect(result.current.state.isPanelOpen).toBe(false);
  });
});

describe('integration — focus node lifecycle', () => {
  it('FOCUS_NODE sets focusNodeId correctly', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'FOCUS_NODE', nodeId: 'src/index.ts' });
    });
    expect(result.current.state.focusNodeId).toBe('src/index.ts');
  });

  it('CLEAR_FOCUS nullifies focusNodeId after FOCUS_NODE', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'FOCUS_NODE', nodeId: 'src/index.ts' });
    });
    act(() => {
      result.current.dispatch({ type: 'CLEAR_FOCUS' });
    });
    expect(result.current.state.focusNodeId).toBeNull();
  });

  it('FOCUS_NODE does not affect selectedNodeId', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SELECT_NODE', nodeId: 'src/app.ts' });
    });
    act(() => {
      result.current.dispatch({ type: 'FOCUS_NODE', nodeId: 'src/index.ts' });
    });
    expect(result.current.state.selectedNodeId).toBe('src/app.ts');
    expect(result.current.state.focusNodeId).toBe('src/index.ts');
  });
});

describe('integration — camera preset lifecycle', () => {
  it('SET_CAMERA_PRESET sets cameraPreset correctly', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_CAMERA_PRESET', preset: 'topDown' });
    });
    expect(result.current.state.cameraPreset).toBe('topDown');
  });

  it('CLEAR_CAMERA_PRESET nullifies cameraPreset', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_CAMERA_PRESET', preset: 'topDown' });
    });
    act(() => {
      result.current.dispatch({ type: 'CLEAR_CAMERA_PRESET' });
    });
    expect(result.current.state.cameraPreset).toBeNull();
  });

  it('SET_CAMERA_PRESET updates when called multiple times', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_CAMERA_PRESET', preset: 'topDown' });
    });
    act(() => {
      result.current.dispatch({ type: 'SET_CAMERA_PRESET', preset: 'sideView' });
    });
    expect(result.current.state.cameraPreset).toBe('sideView');
  });
});
