/**
 * useCallChain unit tests
 *
 * Tests traceCallChain() pure function:
 *   - Linear chain traversal (callees and callers)
 *   - Cycle prevention via visited set
 *   - maxDepth limiting
 *   - 'both' direction traces callers and callees
 *   - Only 'call' type edges are considered (import edges ignored)
 */

import { describe, it, expect } from 'vitest';
import { traceCallChain } from '../src/hooks/useCallChain';
import type { GraphEdge } from '../src/types/graph';

// ---------------------------------------------------------------------------
// Helpers to build test edge objects
// ---------------------------------------------------------------------------

function callEdge(source: string, target: string): GraphEdge {
  return {
    id: `${source}--call--${target}`,
    source,
    target,
    type: 'call',
    metadata: { callType: 'direct', callerName: source, calleeName: target },
  };
}

function importEdge(source: string, target: string): GraphEdge {
  return {
    id: `${source}--import--${target}`,
    source,
    target,
    type: 'import',
    metadata: {},
  };
}

// ---------------------------------------------------------------------------
// Linear chain: A → B → C
// ---------------------------------------------------------------------------

const linearEdges: GraphEdge[] = [
  callEdge('A', 'B'),
  callEdge('B', 'C'),
];

describe('traceCallChain — linear chain (callees direction)', () => {
  it('starting from A with direction callees returns [A, B, C]', () => {
    const result = traceCallChain('A', linearEdges, 'callees');
    expect(result.path).toEqual(['A', 'B', 'C']);
  });

  it('starting from A includes edge ids for B and C', () => {
    const result = traceCallChain('A', linearEdges, 'callees');
    expect(result.edges).toContain('A--call--B');
    expect(result.edges).toContain('B--call--C');
  });

  it('starting from A with direction callers returns just [A] (no callers)', () => {
    const result = traceCallChain('A', linearEdges, 'callers');
    expect(result.path).toEqual(['A']);
  });

  it('starting from C with direction callers returns [C, B, A]', () => {
    const result = traceCallChain('C', linearEdges, 'callers');
    expect(result.path).toContain('C');
    expect(result.path).toContain('B');
    expect(result.path).toContain('A');
  });

  it('starting from C with direction callers has 3 nodes', () => {
    const result = traceCallChain('C', linearEdges, 'callers');
    expect(result.path.length).toBe(3);
  });

  it('path always starts with the given startFunctionId', () => {
    const result = traceCallChain('B', linearEdges, 'callees');
    expect(result.path[0]).toBe('B');
  });
});

// ---------------------------------------------------------------------------
// Cycle: A → B → A (infinite loop prevention)
// ---------------------------------------------------------------------------

const cycleEdges: GraphEdge[] = [
  callEdge('A', 'B'),
  callEdge('B', 'A'),
];

describe('traceCallChain — cycle prevention', () => {
  it('does not produce an infinite loop for A → B → A', () => {
    // Should return a finite path
    const result = traceCallChain('A', cycleEdges, 'callees');
    expect(result.path.length).toBeGreaterThan(0);
    expect(result.path.length).toBeLessThanOrEqual(10);
  });

  it('visited set prevents A from appearing twice in path', () => {
    const result = traceCallChain('A', cycleEdges, 'callees');
    const aOccurrences = result.path.filter((id) => id === 'A').length;
    expect(aOccurrences).toBe(1);
  });

  it('path contains both A and B for cycle', () => {
    const result = traceCallChain('A', cycleEdges, 'callees');
    expect(result.path).toContain('A');
    expect(result.path).toContain('B');
  });
});

// ---------------------------------------------------------------------------
// maxDepth limiting
// ---------------------------------------------------------------------------

const deepEdges: GraphEdge[] = [
  callEdge('N0', 'N1'),
  callEdge('N1', 'N2'),
  callEdge('N2', 'N3'),
  callEdge('N3', 'N4'),
  callEdge('N4', 'N5'),
  callEdge('N5', 'N6'),
];

describe('traceCallChain — maxDepth limiting', () => {
  it('maxDepth=2 limits traversal to 3 nodes total (start + 2 hops)', () => {
    const result = traceCallChain('N0', deepEdges, 'callees', 2);
    // Start node + 2 hops = at most 3 nodes
    expect(result.path.length).toBeLessThanOrEqual(3);
  });

  it('maxDepth=1 only traverses 1 hop from start', () => {
    const result = traceCallChain('N0', deepEdges, 'callees', 1);
    expect(result.path.length).toBeLessThanOrEqual(2);
  });

  it('maxDepth=5 traverses 5 hops from N0', () => {
    const result = traceCallChain('N0', deepEdges, 'callees', 5);
    expect(result.path.length).toBeLessThanOrEqual(6);
  });
});

// ---------------------------------------------------------------------------
// 'both' direction
// ---------------------------------------------------------------------------

const bothEdges: GraphEdge[] = [
  callEdge('X', 'Y'),
  callEdge('Y', 'Z'),
  callEdge('W', 'Y'),
];

describe('traceCallChain — both direction', () => {
  it('starting from Y with both direction finds X, W (callers) and Z (callee)', () => {
    const result = traceCallChain('Y', bothEdges, 'both');
    expect(result.path).toContain('Y');
    expect(result.path).toContain('Z');
    expect(result.path).toContain('X');
    expect(result.path).toContain('W');
  });

  it('both direction always starts with the given node', () => {
    const result = traceCallChain('Y', bothEdges, 'both');
    expect(result.path[0]).toBe('Y');
  });
});

// ---------------------------------------------------------------------------
// Import edges are ignored
// ---------------------------------------------------------------------------

describe('traceCallChain — only call edges are used', () => {
  it('import edges are not traversed', () => {
    const edges: GraphEdge[] = [
      importEdge('A', 'B'),
      importEdge('B', 'C'),
    ];
    const result = traceCallChain('A', edges, 'callees');
    // No call edges, so only the starting node should be in path
    expect(result.path).toEqual(['A']);
  });

  it('mixed edges: only call edges traversed', () => {
    const edges: GraphEdge[] = [
      importEdge('A', 'B'),
      callEdge('A', 'C'),
    ];
    const result = traceCallChain('A', edges, 'callees');
    expect(result.path).toContain('A');
    expect(result.path).toContain('C');
    expect(result.path).not.toContain('B');
  });
});

// ---------------------------------------------------------------------------
// Empty edges
// ---------------------------------------------------------------------------

describe('traceCallChain — empty edges', () => {
  it('empty edges returns path with just the start node', () => {
    const result = traceCallChain('lone', [], 'both');
    expect(result.path).toEqual(['lone']);
    expect(result.edges).toEqual([]);
  });
});
