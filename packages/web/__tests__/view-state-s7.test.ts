/**
 * ViewState Sprint 7 unit tests
 *
 * Tests the Sprint 7 additions to viewStateReducer:
 *   - ZOOM_INTO_FILE: sets expandedFileId, expandedNodes, expandedEdges
 *   - ZOOM_OUT_FILE: clears expandedFileId, expandedNodes, expandedEdges
 *   - START_CALL_TRACING: sets tracingSymbol (functionId), tracingPath, tracingEdges
 *   - STOP_CALL_TRACING: clears tracingSymbol, tracingPath, tracingEdges
 *   - Initial state has expandedFileId === null
 *
 * Uses same renderHook pattern as view-state.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ViewStateProvider, useViewState } from '../src/contexts/ViewStateContext';
import type { GraphNode, GraphEdge } from '../src/types/graph';

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(ViewStateProvider, null, children);
}

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const mockFunctionNode: GraphNode = {
  id: 'src/utils.ts#helper',
  type: 'function',
  label: 'helper',
  filePath: 'src/utils.ts',
  metadata: { parentFileId: 'src/utils.ts', kind: 'function' },
};

const mockClassNode: GraphNode = {
  id: 'src/api.ts#Service',
  type: 'class',
  label: 'Service',
  filePath: 'src/api.ts',
  metadata: { parentFileId: 'src/api.ts', kind: 'class', methodCount: 3 },
};

const mockCallEdge: GraphEdge = {
  id: 'src/utils.ts#helper--call--src/api.ts#Service.fetch',
  source: 'src/utils.ts#helper',
  target: 'src/api.ts#Service.fetch',
  type: 'call',
  metadata: { callType: 'method', callerName: 'helper', calleeName: 'Service.fetch' },
};

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 7 — initial state', () => {
  it('has expandedFileId set to null initially', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.expandedFileId).toBeNull();
  });

  it('has expandedNodes as empty array initially', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.expandedNodes).toEqual([]);
  });

  it('has expandedEdges as empty array initially', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    expect(result.current.state.expandedEdges).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// ZOOM_INTO_FILE
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 7 — ZOOM_INTO_FILE', () => {
  it('sets expandedFileId to the given fileId', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'ZOOM_INTO_FILE',
        fileId: 'src/utils.ts',
        nodes: [mockFunctionNode],
        edges: [mockCallEdge],
      });
    });
    expect(result.current.state.expandedFileId).toBe('src/utils.ts');
  });

  it('sets expandedNodes to the provided nodes', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'ZOOM_INTO_FILE',
        fileId: 'src/utils.ts',
        nodes: [mockFunctionNode, mockClassNode],
        edges: [],
      });
    });
    expect(result.current.state.expandedNodes).toHaveLength(2);
    expect(result.current.state.expandedNodes[0].id).toBe('src/utils.ts#helper');
  });

  it('sets expandedEdges to the provided edges', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'ZOOM_INTO_FILE',
        fileId: 'src/api.ts',
        nodes: [],
        edges: [mockCallEdge],
      });
    });
    expect(result.current.state.expandedEdges).toHaveLength(1);
    expect(result.current.state.expandedEdges[0].id).toBe(mockCallEdge.id);
  });

  it('ZOOM_INTO_FILE with empty nodes/edges still sets fileId', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'ZOOM_INTO_FILE',
        fileId: 'src/empty.ts',
        nodes: [],
        edges: [],
      });
    });
    expect(result.current.state.expandedFileId).toBe('src/empty.ts');
    expect(result.current.state.expandedNodes).toEqual([]);
    expect(result.current.state.expandedEdges).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// ZOOM_OUT_FILE
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 7 — ZOOM_OUT_FILE', () => {
  it('clears expandedFileId to null', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'ZOOM_INTO_FILE',
        fileId: 'src/utils.ts',
        nodes: [mockFunctionNode],
        edges: [],
      });
    });
    act(() => {
      result.current.dispatch({ type: 'ZOOM_OUT_FILE' });
    });
    expect(result.current.state.expandedFileId).toBeNull();
  });

  it('clears expandedNodes to empty array', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'ZOOM_INTO_FILE',
        fileId: 'src/utils.ts',
        nodes: [mockFunctionNode, mockClassNode],
        edges: [],
      });
    });
    act(() => {
      result.current.dispatch({ type: 'ZOOM_OUT_FILE' });
    });
    expect(result.current.state.expandedNodes).toEqual([]);
  });

  it('clears expandedEdges to empty array', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'ZOOM_INTO_FILE',
        fileId: 'src/api.ts',
        nodes: [],
        edges: [mockCallEdge],
      });
    });
    act(() => {
      result.current.dispatch({ type: 'ZOOM_OUT_FILE' });
    });
    expect(result.current.state.expandedEdges).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// START_CALL_TRACING
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 7 — START_CALL_TRACING', () => {
  it('sets tracingSymbol to the given functionId', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'START_CALL_TRACING',
        functionId: 'src/utils.ts#helper',
        path: ['src/utils.ts#helper', 'src/api.ts#Service.fetch'],
        edges: ['src/utils.ts#helper--call--src/api.ts#Service.fetch'],
      });
    });
    expect(result.current.state.tracingSymbol).toBe('src/utils.ts#helper');
  });

  it('sets tracingPath to the provided path', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    const path = ['src/utils.ts#helper', 'src/api.ts#Service.fetch'];
    act(() => {
      result.current.dispatch({
        type: 'START_CALL_TRACING',
        functionId: 'src/utils.ts#helper',
        path,
        edges: [],
      });
    });
    expect(result.current.state.tracingPath).toEqual(path);
  });

  it('sets tracingEdges to the provided edges', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    const edges = ['edge1', 'edge2'];
    act(() => {
      result.current.dispatch({
        type: 'START_CALL_TRACING',
        functionId: 'src/utils.ts#helper',
        path: [],
        edges,
      });
    });
    expect(result.current.state.tracingEdges).toEqual(edges);
  });
});

// ---------------------------------------------------------------------------
// STOP_CALL_TRACING
// ---------------------------------------------------------------------------

describe('viewStateReducer Sprint 7 — STOP_CALL_TRACING', () => {
  it('clears tracingSymbol to null', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'START_CALL_TRACING',
        functionId: 'src/utils.ts#helper',
        path: [],
        edges: [],
      });
    });
    act(() => {
      result.current.dispatch({ type: 'STOP_CALL_TRACING' });
    });
    expect(result.current.state.tracingSymbol).toBeNull();
  });

  it('clears tracingPath to empty array', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'START_CALL_TRACING',
        functionId: 'src/utils.ts#helper',
        path: ['node1', 'node2'],
        edges: [],
      });
    });
    act(() => {
      result.current.dispatch({ type: 'STOP_CALL_TRACING' });
    });
    expect(result.current.state.tracingPath).toEqual([]);
  });

  it('clears tracingEdges to empty array', () => {
    const { result } = renderHook(() => useViewState(), { wrapper });
    act(() => {
      result.current.dispatch({
        type: 'START_CALL_TRACING',
        functionId: 'src/utils.ts#helper',
        path: [],
        edges: ['edge1', 'edge2'],
      });
    });
    act(() => {
      result.current.dispatch({ type: 'STOP_CALL_TRACING' });
    });
    expect(result.current.state.tracingEdges).toEqual([]);
  });
});
