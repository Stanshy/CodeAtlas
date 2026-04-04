/**
 * Sprint 11 — useBfsHoverHighlight unit tests
 *
 * Coverage:
 *   - BFS traverses forward edges (source → target)
 *   - BFS traverses backward edges (target → source)
 *   - Isolated node returns set containing only itself
 *   - null hoveredNodeId returns empty sets
 *   - Cyclic graph does not recurse infinitely
 *   - maxDepth limits traversal depth
 *   - Edges on visited nodes are included in highlightedEdges
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBfsHoverHighlight } from '../src/hooks/useBfsHoverHighlight';
import type { GraphEdge } from '../src/types/graph';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEdge(source: string, target: string, type: GraphEdge['type'] = 'import'): GraphEdge {
  return {
    id: `${source}--${type}--${target}`,
    source,
    target,
    type,
    metadata: {},
  };
}

// ---------------------------------------------------------------------------
// null hoveredNodeId
// ---------------------------------------------------------------------------

describe('useBfsHoverHighlight — null hoveredNodeId', () => {
  it('returns empty highlightedNodes when hoveredNodeId is null', () => {
    const edges = [makeEdge('a', 'b')];
    const { result } = renderHook(() => useBfsHoverHighlight(null, edges));
    expect(result.current.highlightedNodes.size).toBe(0);
  });

  it('returns empty highlightedEdges when hoveredNodeId is null', () => {
    const edges = [makeEdge('a', 'b')];
    const { result } = renderHook(() => useBfsHoverHighlight(null, edges));
    expect(result.current.highlightedEdges.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Isolated node
// ---------------------------------------------------------------------------

describe('useBfsHoverHighlight — isolated node', () => {
  it('returns set containing only the hovered node when it has no edges', () => {
    const edges: GraphEdge[] = [];
    const { result } = renderHook(() => useBfsHoverHighlight('isolated', edges));
    expect(result.current.highlightedNodes.has('isolated')).toBe(true);
    expect(result.current.highlightedNodes.size).toBe(1);
  });

  it('returns empty edge set for isolated node', () => {
    const edges: GraphEdge[] = [];
    const { result } = renderHook(() => useBfsHoverHighlight('isolated', edges));
    expect(result.current.highlightedEdges.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Bidirectional traversal
// ---------------------------------------------------------------------------

describe('useBfsHoverHighlight — bidirectional BFS', () => {
  // Graph: a → b → c, hover on b
  const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')];

  it('includes hovered node itself', () => {
    const { result } = renderHook(() => useBfsHoverHighlight('b', edges));
    expect(result.current.highlightedNodes.has('b')).toBe(true);
  });

  it('includes forward neighbour (b → c)', () => {
    const { result } = renderHook(() => useBfsHoverHighlight('b', edges));
    expect(result.current.highlightedNodes.has('c')).toBe(true);
  });

  it('includes backward neighbour (a → b)', () => {
    const { result } = renderHook(() => useBfsHoverHighlight('b', edges));
    expect(result.current.highlightedNodes.has('a')).toBe(true);
  });

  it('includes forward edge in highlightedEdges', () => {
    const { result } = renderHook(() => useBfsHoverHighlight('b', edges));
    expect(result.current.highlightedEdges.has('b--import--c')).toBe(true);
  });

  it('includes backward edge in highlightedEdges', () => {
    const { result } = renderHook(() => useBfsHoverHighlight('b', edges));
    expect(result.current.highlightedEdges.has('a--import--b')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// maxDepth limiting
// ---------------------------------------------------------------------------

describe('useBfsHoverHighlight — maxDepth', () => {
  // Chain: a → b → c → d → e → f, depth 1 from b should only reach immediate neighbours
  const chain = [
    makeEdge('a', 'b'),
    makeEdge('b', 'c'),
    makeEdge('c', 'd'),
    makeEdge('d', 'e'),
    makeEdge('e', 'f'),
  ];

  it('depth 1 does not reach 2-hop forward node', () => {
    const { result } = renderHook(() => useBfsHoverHighlight('b', chain, 1));
    // c is 1 hop forward from b — included
    expect(result.current.highlightedNodes.has('c')).toBe(true);
    // d is 2 hops forward from b — excluded at depth 1
    expect(result.current.highlightedNodes.has('d')).toBe(false);
  });

  it('depth 5 (default) reaches up to 5 hops', () => {
    const { result } = renderHook(() => useBfsHoverHighlight('a', chain));
    // f is 5 hops from a — should be included with default maxDepth 5
    expect(result.current.highlightedNodes.has('f')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cyclic graph
// ---------------------------------------------------------------------------

describe('useBfsHoverHighlight — cyclic graph', () => {
  // x → y → x (cycle)
  const cycleEdges = [makeEdge('x', 'y'), makeEdge('y', 'x')];

  it('does not throw on cyclic graph', () => {
    expect(() => {
      renderHook(() => useBfsHoverHighlight('x', cycleEdges));
    }).not.toThrow();
  });

  it('returns both nodes for cyclic graph when hovering x', () => {
    const { result } = renderHook(() => useBfsHoverHighlight('x', cycleEdges));
    expect(result.current.highlightedNodes.has('x')).toBe(true);
    expect(result.current.highlightedNodes.has('y')).toBe(true);
  });

  it('does not return more nodes than exist in cyclic graph', () => {
    const { result } = renderHook(() => useBfsHoverHighlight('x', cycleEdges));
    expect(result.current.highlightedNodes.size).toBe(2);
  });

  it('includes both cycle edges in highlightedEdges', () => {
    const { result } = renderHook(() => useBfsHoverHighlight('x', cycleEdges));
    expect(result.current.highlightedEdges.has('x--import--y')).toBe(true);
    expect(result.current.highlightedEdges.has('y--import--x')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Disjoint graph — unrelated nodes are not highlighted
// ---------------------------------------------------------------------------

describe('useBfsHoverHighlight — disjoint subgraphs', () => {
  const edges = [makeEdge('a', 'b'), makeEdge('c', 'd')];

  it('hovering a does not highlight c or d', () => {
    const { result } = renderHook(() => useBfsHoverHighlight('a', edges));
    expect(result.current.highlightedNodes.has('c')).toBe(false);
    expect(result.current.highlightedNodes.has('d')).toBe(false);
  });
});
