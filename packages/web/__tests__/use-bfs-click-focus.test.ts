/**
 * useBfsClickFocus hook unit tests
 *
 * Coverage:
 *   - Initial state: selectedNodeId null, focused sets empty, chainLabel/chainNodeCount defaults
 *   - selectNode triggers BFS, focusedNodes/focusedEdges populated correctly
 *   - Bidirectional BFS: follows both forward (source→target) and backward (target→source) edges
 *   - maxDepth limit prevents traversal beyond the specified hop count
 *   - resetSelection clears all state back to initial defaults
 *   - Empty edges array produces empty focused sets after selectNode
 *   - chainLabel uses provided label or falls back to nodeId
 *   - chainNodeCount matches the size of focusedNodes
 *
 * Sprint 12 — T11
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBfsClickFocus } from '../src/hooks/useBfsClickFocus';
import type { GraphEdge } from '../src/types/graph';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Linear chain: A → B → C → D
const LINEAR_EDGES: GraphEdge[] = [
  { id: 'e-ab', source: 'A', target: 'B', type: 'import', metadata: {} },
  { id: 'e-bc', source: 'B', target: 'C', type: 'import', metadata: {} },
  { id: 'e-cd', source: 'C', target: 'D', type: 'import', metadata: {} },
];

// Branching: A → B, A → C, B → D, X → Y (disconnected)
const BRANCHING_EDGES: GraphEdge[] = [
  { id: 'e-ab', source: 'A', target: 'B', type: 'import', metadata: {} },
  { id: 'e-ac', source: 'A', target: 'C', type: 'import', metadata: {} },
  { id: 'e-bd', source: 'B', target: 'D', type: 'import', metadata: {} },
  { id: 'e-xy', source: 'X', target: 'Y', type: 'import', metadata: {} },
];

const EMPTY_EDGES: GraphEdge[] = [];

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('useBfsClickFocus — initial state', () => {
  it('selectedNodeId is null initially', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES));
    expect(result.current.selectedNodeId).toBeNull();
  });

  it('focusedNodes is empty initially', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES));
    expect(result.current.focusedNodes.size).toBe(0);
  });

  it('focusedEdges is empty initially', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES));
    expect(result.current.focusedEdges.size).toBe(0);
  });

  it('chainLabel is empty string initially', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES));
    expect(result.current.chainLabel).toBe('');
  });

  it('chainNodeCount is 0 initially', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES));
    expect(result.current.chainNodeCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// selectNode — basic BFS population
// ---------------------------------------------------------------------------

describe('useBfsClickFocus — selectNode triggers BFS', () => {
  it('sets selectedNodeId to the clicked node', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES));
    act(() => { result.current.selectNode('B'); });
    expect(result.current.selectedNodeId).toBe('B');
  });

  it('includes the selected node itself in focusedNodes', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES));
    act(() => { result.current.selectNode('B'); });
    expect(result.current.focusedNodes.has('B')).toBe(true);
  });

  it('includes forward-reachable nodes in focusedNodes', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES));
    act(() => { result.current.selectNode('B'); });
    // B → C (forward)
    expect(result.current.focusedNodes.has('C')).toBe(true);
  });

  it('includes backward-reachable nodes in focusedNodes', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES));
    act(() => { result.current.selectNode('B'); });
    // A → B (backward from B)
    expect(result.current.focusedNodes.has('A')).toBe(true);
  });

  it('populates focusedEdges with edges touched by BFS', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES));
    act(() => { result.current.selectNode('B'); });
    expect(result.current.focusedEdges.has('e-ab')).toBe(true);
    expect(result.current.focusedEdges.has('e-bc')).toBe(true);
  });

  it('does not include nodes from disconnected subgraph', () => {
    const { result } = renderHook(() => useBfsClickFocus(BRANCHING_EDGES));
    act(() => { result.current.selectNode('A'); });
    expect(result.current.focusedNodes.has('X')).toBe(false);
    expect(result.current.focusedNodes.has('Y')).toBe(false);
  });

  it('does not include edges from disconnected subgraph', () => {
    const { result } = renderHook(() => useBfsClickFocus(BRANCHING_EDGES));
    act(() => { result.current.selectNode('A'); });
    expect(result.current.focusedEdges.has('e-xy')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Bidirectional BFS
// ---------------------------------------------------------------------------

describe('useBfsClickFocus — bidirectional BFS', () => {
  it('follows forward edges from the selected node', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES));
    act(() => { result.current.selectNode('A'); });
    // A → B → C → D (all forward)
    expect(result.current.focusedNodes.has('B')).toBe(true);
    expect(result.current.focusedNodes.has('C')).toBe(true);
    expect(result.current.focusedNodes.has('D')).toBe(true);
  });

  it('follows backward edges to reach ancestors', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES));
    act(() => { result.current.selectNode('D'); });
    // D ← C ← B ← A (all backward)
    expect(result.current.focusedNodes.has('C')).toBe(true);
    expect(result.current.focusedNodes.has('B')).toBe(true);
    expect(result.current.focusedNodes.has('A')).toBe(true);
  });

  it('combines forward and backward traversal from a mid-chain node', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES));
    act(() => { result.current.selectNode('B'); });
    // A ← B → C → D
    expect(result.current.focusedNodes.has('A')).toBe(true);
    expect(result.current.focusedNodes.has('C')).toBe(true);
    expect(result.current.focusedNodes.has('D')).toBe(true);
  });

  it('includes branching children when selecting a root node', () => {
    const { result } = renderHook(() => useBfsClickFocus(BRANCHING_EDGES));
    act(() => { result.current.selectNode('A'); });
    // A → B and A → C
    expect(result.current.focusedNodes.has('B')).toBe(true);
    expect(result.current.focusedNodes.has('C')).toBe(true);
  });

  it('includes grandchildren via BFS from root', () => {
    const { result } = renderHook(() => useBfsClickFocus(BRANCHING_EDGES));
    act(() => { result.current.selectNode('A'); });
    // A → B → D
    expect(result.current.focusedNodes.has('D')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// maxDepth limit
// ---------------------------------------------------------------------------

describe('useBfsClickFocus — maxDepth limit', () => {
  it('with maxDepth=1, only reaches immediate neighbours', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES, 1));
    act(() => { result.current.selectNode('B'); });
    // Depth 1: A (backward) and C (forward) are reachable
    expect(result.current.focusedNodes.has('A')).toBe(true);
    expect(result.current.focusedNodes.has('C')).toBe(true);
    // Depth 2: D is NOT reachable with maxDepth=1
    expect(result.current.focusedNodes.has('D')).toBe(false);
  });

  it('with maxDepth=0, only includes the selected node itself', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES, 0));
    act(() => { result.current.selectNode('B'); });
    expect(result.current.focusedNodes.has('B')).toBe(true);
    expect(result.current.focusedNodes.has('A')).toBe(false);
    expect(result.current.focusedNodes.has('C')).toBe(false);
  });

  it('with maxDepth=2, reaches nodes up to 2 hops away', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES, 2));
    act(() => { result.current.selectNode('A'); });
    // A(0) → B(1) → C(2) → D would be hop 3, excluded
    expect(result.current.focusedNodes.has('C')).toBe(true);
    expect(result.current.focusedNodes.has('D')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resetSelection
// ---------------------------------------------------------------------------

describe('useBfsClickFocus — resetSelection', () => {
  it('clears selectedNodeId after reset', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES));
    act(() => { result.current.selectNode('B'); });
    act(() => { result.current.resetSelection(); });
    expect(result.current.selectedNodeId).toBeNull();
  });

  it('clears focusedNodes after reset', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES));
    act(() => { result.current.selectNode('B'); });
    act(() => { result.current.resetSelection(); });
    expect(result.current.focusedNodes.size).toBe(0);
  });

  it('clears focusedEdges after reset', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES));
    act(() => { result.current.selectNode('B'); });
    act(() => { result.current.resetSelection(); });
    expect(result.current.focusedEdges.size).toBe(0);
  });

  it('clears chainLabel after reset', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES));
    act(() => { result.current.selectNode('B', 'My Label'); });
    act(() => { result.current.resetSelection(); });
    expect(result.current.chainLabel).toBe('');
  });

  it('resets chainNodeCount to 0 after reset', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES));
    act(() => { result.current.selectNode('B'); });
    act(() => { result.current.resetSelection(); });
    expect(result.current.chainNodeCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Empty edges
// ---------------------------------------------------------------------------

describe('useBfsClickFocus — empty edges', () => {
  it('focusedNodes contains only the selected node when no edges exist', () => {
    const { result } = renderHook(() => useBfsClickFocus(EMPTY_EDGES));
    act(() => { result.current.selectNode('A'); });
    expect(result.current.focusedNodes.size).toBe(1);
    expect(result.current.focusedNodes.has('A')).toBe(true);
  });

  it('focusedEdges is empty when no edges exist', () => {
    const { result } = renderHook(() => useBfsClickFocus(EMPTY_EDGES));
    act(() => { result.current.selectNode('A'); });
    expect(result.current.focusedEdges.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// chainLabel and chainNodeCount
// ---------------------------------------------------------------------------

describe('useBfsClickFocus — chainLabel and chainNodeCount', () => {
  it('chainLabel uses the provided label argument', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES));
    act(() => { result.current.selectNode('B', 'My Chain Label'); });
    expect(result.current.chainLabel).toBe('My Chain Label');
  });

  it('chainLabel falls back to nodeId when no label is provided', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES));
    act(() => { result.current.selectNode('B'); });
    expect(result.current.chainLabel).toBe('B');
  });

  it('chainNodeCount equals the size of focusedNodes', () => {
    const { result } = renderHook(() => useBfsClickFocus(LINEAR_EDGES));
    act(() => { result.current.selectNode('B'); });
    expect(result.current.chainNodeCount).toBe(result.current.focusedNodes.size);
  });

  it('chainNodeCount is at least 1 (includes selected node) after selectNode', () => {
    const { result } = renderHook(() => useBfsClickFocus(EMPTY_EDGES));
    act(() => { result.current.selectNode('solo'); });
    expect(result.current.chainNodeCount).toBeGreaterThanOrEqual(1);
  });
});
