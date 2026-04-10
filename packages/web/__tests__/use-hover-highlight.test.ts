/**
 * useHoverHighlight hook unit tests
 *
 * Tests: hover marks in+out edges and connected nodes, mouse leave restores,
 * non-related nodes fade.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHoverHighlight } from '../src/hooks/useHoverHighlight';
import type { Edge } from '@xyflow/react';
import type { NeonEdgeData } from '../src/adapters/graph-adapter';

const edges: Edge<NeonEdgeData>[] = [
  {
    id: 'a--import--b',
    source: 'a',
    target: 'b',
    type: 'neonEdge',
    data: { edgeType: 'import', metadata: {} },
  },
  {
    id: 'b--import--c',
    source: 'b',
    target: 'c',
    type: 'neonEdge',
    data: { edgeType: 'import', metadata: {} },
  },
  {
    id: 'd--import--e',
    source: 'd',
    target: 'e',
    type: 'neonEdge',
    data: { edgeType: 'import', metadata: {} },
  },
];

describe('useHoverHighlight', () => {
  it('returns no highlights when nothing is hovered', () => {
    const { result } = renderHook(() => useHoverHighlight(edges));
    expect(result.current.highlightState.hoveredNodeId).toBeNull();
    expect(result.current.highlightState.highlightedNodeIds.size).toBe(0);
    expect(result.current.highlightState.highlightedEdgeIds.size).toBe(0);
  });

  it('highlights hovered node and connected nodes/edges', () => {
    const { result } = renderHook(() => useHoverHighlight(edges));

    act(() => {
      result.current.onNodeMouseEnter(new MouseEvent('mouseenter') as unknown as React.MouseEvent, 'b');
    });

    const state = result.current.highlightState;
    expect(state.hoveredNodeId).toBe('b');

    // Node b should be highlighted along with a (source of a→b) and c (target of b→c)
    expect(state.highlightedNodeIds.has('b')).toBe(true);
    expect(state.highlightedNodeIds.has('a')).toBe(true);
    expect(state.highlightedNodeIds.has('c')).toBe(true);

    // Edges involving b
    expect(state.highlightedEdgeIds.has('a--import--b')).toBe(true);
    expect(state.highlightedEdgeIds.has('b--import--c')).toBe(true);

    // Unrelated edge should NOT be highlighted
    expect(state.highlightedEdgeIds.has('d--import--e')).toBe(false);

    // Unrelated nodes should NOT be highlighted
    expect(state.highlightedNodeIds.has('d')).toBe(false);
    expect(state.highlightedNodeIds.has('e')).toBe(false);
  });

  it('restores on mouse leave', () => {
    const { result } = renderHook(() => useHoverHighlight(edges));

    act(() => {
      result.current.onNodeMouseEnter(new MouseEvent('mouseenter') as unknown as React.MouseEvent, 'b');
    });
    expect(result.current.highlightState.hoveredNodeId).toBe('b');

    act(() => {
      result.current.onNodeMouseLeave();
    });
    expect(result.current.highlightState.hoveredNodeId).toBeNull();
    expect(result.current.highlightState.highlightedNodeIds.size).toBe(0);
  });

  it('highlights leaf node with only incoming edges', () => {
    const { result } = renderHook(() => useHoverHighlight(edges));

    act(() => {
      result.current.onNodeMouseEnter(new MouseEvent('mouseenter') as unknown as React.MouseEvent, 'c');
    });

    expect(result.current.highlightState.highlightedNodeIds.has('c')).toBe(true);
    expect(result.current.highlightState.highlightedNodeIds.has('b')).toBe(true);
    expect(result.current.highlightState.highlightedEdgeIds.has('b--import--c')).toBe(true);
  });

  it('handles hover on isolated node (no edges)', () => {
    const { result } = renderHook(() => useHoverHighlight(edges));

    act(() => {
      result.current.onNodeMouseEnter(new MouseEvent('mouseenter') as unknown as React.MouseEvent, 'z');
    });

    expect(result.current.highlightState.hoveredNodeId).toBe('z');
    expect(result.current.highlightState.highlightedNodeIds.size).toBe(1);
    expect(result.current.highlightState.highlightedEdgeIds.size).toBe(0);
  });
});
