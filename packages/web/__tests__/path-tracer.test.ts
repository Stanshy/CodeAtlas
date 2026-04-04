/**
 * path-tracer unit tests
 *
 * Tests the pure function traceSymbolPath covering:
 * - Linear path trace
 * - Branching paths
 * - Cyclic dependencies (no infinite loop)
 * - Depth limit truncation
 * - Symbol not found
 * - Empty graph
 * - Edge with undefined importedSymbols
 *
 * Sprint 5 — T9: Unit + Integration Tests
 */

import { describe, it, expect } from 'vitest';
import { traceSymbolPath, type TraceInput } from '../src/utils/path-tracer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEdge(
  id: string,
  source: string,
  target: string,
  symbols: string[] | undefined,
) {
  return {
    id,
    source,
    target,
    metadata: { importedSymbols: symbols },
  };
}

// ---------------------------------------------------------------------------
// Empty / guard cases
// ---------------------------------------------------------------------------

describe('traceSymbolPath — empty graph', () => {
  it('returns empty result when edges array is empty', () => {
    const input: TraceInput = {
      symbol: 'Foo',
      nodes: [{ id: 'A' }, { id: 'B' }],
      edges: [],
    };
    const result = traceSymbolPath(input);
    expect(result.path).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  it('returns empty result when nodes and edges are both empty', () => {
    const input: TraceInput = { symbol: 'Foo', nodes: [], edges: [] };
    const result = traceSymbolPath(input);
    expect(result.path).toEqual([]);
    expect(result.edges).toEqual([]);
  });
});

describe('traceSymbolPath — symbol not found', () => {
  it('returns empty result when no edge carries the symbol', () => {
    const input: TraceInput = {
      symbol: 'NotHere',
      nodes: [{ id: 'A' }, { id: 'B' }],
      edges: [makeEdge('e1', 'A', 'B', ['Foo', 'Bar'])],
    };
    const result = traceSymbolPath(input);
    expect(result.path).toEqual([]);
    expect(result.edges).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Linear path
// ---------------------------------------------------------------------------

describe('traceSymbolPath — linear path A→B→C', () => {
  const edges = [
    makeEdge('e1', 'A', 'B', ['MySymbol']),
    makeEdge('e2', 'B', 'C', ['MySymbol']),
  ];
  const input: TraceInput = {
    symbol: 'MySymbol',
    nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
    edges,
  };

  it('includes all three nodes in the path', () => {
    const result = traceSymbolPath(input);
    expect(result.path).toHaveLength(3);
    expect(result.path).toContain('A');
    expect(result.path).toContain('B');
    expect(result.path).toContain('C');
  });

  it('includes both edges in the result', () => {
    const result = traceSymbolPath(input);
    expect(result.edges).toHaveLength(2);
    expect(result.edges).toContain('e1');
    expect(result.edges).toContain('e2');
  });
});

// ---------------------------------------------------------------------------
// Branching path
// ---------------------------------------------------------------------------

describe('traceSymbolPath — branching A→B and A→C both carry same symbol', () => {
  const edges = [
    makeEdge('e1', 'A', 'B', ['SharedSym']),
    makeEdge('e2', 'A', 'C', ['SharedSym']),
  ];
  const input: TraceInput = {
    symbol: 'SharedSym',
    nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
    edges,
  };

  it('includes A, B, and C in the path', () => {
    const result = traceSymbolPath(input);
    expect(result.path).toContain('A');
    expect(result.path).toContain('B');
    expect(result.path).toContain('C');
  });

  it('includes both branch edges', () => {
    const result = traceSymbolPath(input);
    expect(result.edges).toContain('e1');
    expect(result.edges).toContain('e2');
  });
});

// ---------------------------------------------------------------------------
// Cyclic dependency
// ---------------------------------------------------------------------------

describe('traceSymbolPath — cyclic dependency A→B→C→A', () => {
  const edges = [
    makeEdge('e1', 'A', 'B', ['CycleSym']),
    makeEdge('e2', 'B', 'C', ['CycleSym']),
    makeEdge('e3', 'C', 'A', ['CycleSym']),
  ];
  const input: TraceInput = {
    symbol: 'CycleSym',
    nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
    edges,
  };

  it('does not infinite loop and returns a finite result', () => {
    const result = traceSymbolPath(input);
    expect(result.path.length).toBeGreaterThan(0);
    expect(result.path.length).toBeLessThanOrEqual(3);
  });

  it('each node appears at most once in the path', () => {
    const result = traceSymbolPath(input);
    const unique = new Set(result.path);
    expect(unique.size).toBe(result.path.length);
  });

  it('includes all three edges', () => {
    const result = traceSymbolPath(input);
    expect(result.edges).toContain('e1');
    expect(result.edges).toContain('e2');
    expect(result.edges).toContain('e3');
  });
});

// ---------------------------------------------------------------------------
// Depth limit
// ---------------------------------------------------------------------------

describe('traceSymbolPath — depth limit 10 truncates longer chains', () => {
  // Build a chain of 15 nodes: n0→n1→n2→...→n14, all carrying 'DeepSym'
  const nodeCount = 15;
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({ id: `n${i}` }));
  const edges = Array.from({ length: nodeCount - 1 }, (_, i) =>
    makeEdge(`e${i}`, `n${i}`, `n${i + 1}`, ['DeepSym']),
  );
  const input: TraceInput = { symbol: 'DeepSym', nodes, edges };

  it('path length does not exceed MAX_DEPTH + 1 (11 nodes)', () => {
    const result = traceSymbolPath(input);
    // BFS depth 0..10 means at most 11 nodes can be visited
    expect(result.path.length).toBeLessThanOrEqual(11);
  });

  it('path is shorter than the full 15-node chain', () => {
    const result = traceSymbolPath(input);
    expect(result.path.length).toBeLessThan(nodeCount);
  });
});

// ---------------------------------------------------------------------------
// Edge with undefined importedSymbols
// ---------------------------------------------------------------------------

describe('traceSymbolPath — edge with undefined importedSymbols', () => {
  it('handles undefined importedSymbols safely and returns empty result', () => {
    const input: TraceInput = {
      symbol: 'Foo',
      nodes: [{ id: 'A' }, { id: 'B' }],
      edges: [
        {
          id: 'e1',
          source: 'A',
          target: 'B',
          metadata: { importedSymbols: undefined },
        },
      ],
    };
    const result = traceSymbolPath(input);
    expect(result.path).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  it('skips edges with undefined importedSymbols but still traces relevant edges', () => {
    const input: TraceInput = {
      symbol: 'Foo',
      nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
      edges: [
        {
          id: 'e1',
          source: 'A',
          target: 'B',
          metadata: { importedSymbols: undefined },
        },
        makeEdge('e2', 'B', 'C', ['Foo']),
      ],
    };
    const result = traceSymbolPath(input);
    expect(result.path).toContain('B');
    expect(result.path).toContain('C');
    expect(result.edges).toContain('e2');
    expect(result.edges).not.toContain('e1');
  });
});
