/**
 * Sprint 8 — impact-analysis unit tests
 *
 * Tests the analyzeImpact pure function from useImpactAnalysis.ts.
 *
 * Coverage:
 *   - forward BFS: follows source→target edges
 *   - reverse BFS: follows target→source back-edges
 *   - maxDepth=1: only one hop from start node
 *   - cycle guard: A→B→C→A does not loop infinitely
 *   - truncation: impactedNodes capped at 51 when graph exceeds that size
 *   - mixed edge types: import, call, data-flow all traversed
 *   - isolated node: returns only start node when no edges connect
 *   - depthMap correctness: BFS depth per node is accurate
 *   - impactedEdges list: contains traversed edge IDs
 *   - truncated flag: false when within limit, true when exceeded
 */

import { describe, it, expect } from 'vitest';
import { analyzeImpact } from '../src/hooks/useImpactAnalysis';
import type { GraphEdge } from '../src/types/graph';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function edge(
  id: string,
  source: string,
  target: string,
  type: GraphEdge['type'] = 'import',
): GraphEdge {
  return { id, source, target, type, metadata: {} };
}

// ---------------------------------------------------------------------------
// Linear chain: A → B → C → D → E
// ---------------------------------------------------------------------------

const linearEdges: GraphEdge[] = [
  edge('a-b', 'A', 'B'),
  edge('b-c', 'B', 'C'),
  edge('c-d', 'C', 'D'),
  edge('d-e', 'D', 'E'),
];

describe('analyzeImpact — forward BFS', () => {
  it('reaches all downstream nodes from root', () => {
    const result = analyzeImpact('A', linearEdges, 'forward');
    expect(result.impactedNodes).toContain('A');
    expect(result.impactedNodes).toContain('B');
    expect(result.impactedNodes).toContain('C');
    expect(result.impactedNodes).toContain('D');
    expect(result.impactedNodes).toContain('E');
  });

  it('does not include nodes outside the forward path', () => {
    const result = analyzeImpact('C', linearEdges, 'forward');
    expect(result.impactedNodes).not.toContain('A');
    expect(result.impactedNodes).not.toContain('B');
    expect(result.impactedNodes).toContain('C');
    expect(result.impactedNodes).toContain('D');
    expect(result.impactedNodes).toContain('E');
  });

  it('collects traversed edge IDs', () => {
    const result = analyzeImpact('A', linearEdges, 'forward');
    expect(result.impactedEdges).toContain('a-b');
    expect(result.impactedEdges).toContain('b-c');
    expect(result.impactedEdges).toContain('c-d');
    expect(result.impactedEdges).toContain('d-e');
  });

  it('returns truncated=false for small graph', () => {
    const result = analyzeImpact('A', linearEdges, 'forward');
    expect(result.truncated).toBe(false);
  });
});

describe('analyzeImpact — reverse BFS', () => {
  it('reaches all upstream nodes from leaf', () => {
    const result = analyzeImpact('E', linearEdges, 'reverse');
    expect(result.impactedNodes).toContain('E');
    expect(result.impactedNodes).toContain('D');
    expect(result.impactedNodes).toContain('C');
    expect(result.impactedNodes).toContain('B');
    expect(result.impactedNodes).toContain('A');
  });

  it('does not include nodes outside the reverse path', () => {
    const result = analyzeImpact('C', linearEdges, 'reverse');
    expect(result.impactedNodes).toContain('C');
    expect(result.impactedNodes).toContain('B');
    expect(result.impactedNodes).toContain('A');
    expect(result.impactedNodes).not.toContain('D');
    expect(result.impactedNodes).not.toContain('E');
  });

  it('collects upstream edge IDs', () => {
    const result = analyzeImpact('C', linearEdges, 'reverse');
    expect(result.impactedEdges).toContain('a-b');
    expect(result.impactedEdges).toContain('b-c');
  });
});

// ---------------------------------------------------------------------------
// maxDepth
// ---------------------------------------------------------------------------

describe('analyzeImpact — depth limit', () => {
  it('maxDepth=1 only visits direct neighbours', () => {
    const result = analyzeImpact('A', linearEdges, 'forward', 1);
    expect(result.impactedNodes).toContain('A');
    expect(result.impactedNodes).toContain('B');
    expect(result.impactedNodes).not.toContain('C');
    expect(result.impactedNodes).not.toContain('D');
    expect(result.impactedNodes).not.toContain('E');
  });

  it('maxDepth=2 visits two hops', () => {
    const result = analyzeImpact('A', linearEdges, 'forward', 2);
    expect(result.impactedNodes).toContain('A');
    expect(result.impactedNodes).toContain('B');
    expect(result.impactedNodes).toContain('C');
    expect(result.impactedNodes).not.toContain('D');
  });

  it('maxDepth=0 returns only start node', () => {
    const result = analyzeImpact('A', linearEdges, 'forward', 0);
    expect(result.impactedNodes).toEqual(['A']);
    expect(result.impactedEdges).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Cycle guard
// ---------------------------------------------------------------------------

describe('analyzeImpact — cycle guard', () => {
  // A → B → C → A (cycle)
  const cyclicEdges: GraphEdge[] = [
    edge('a-b', 'A', 'B'),
    edge('b-c', 'B', 'C'),
    edge('c-a', 'C', 'A', 'call'),
  ];

  it('terminates without infinite loop when cycle present', () => {
    // If this test completes it proves there is no infinite loop
    const result = analyzeImpact('A', cyclicEdges, 'forward');
    expect(result.impactedNodes).toContain('A');
    expect(result.impactedNodes).toContain('B');
    expect(result.impactedNodes).toContain('C');
  });

  it('each node appears exactly once in impactedNodes', () => {
    const result = analyzeImpact('A', cyclicEdges, 'forward');
    const unique = new Set(result.impactedNodes);
    expect(unique.size).toBe(result.impactedNodes.length);
  });
});

// ---------------------------------------------------------------------------
// Truncation
// ---------------------------------------------------------------------------

describe('analyzeImpact — truncation', () => {
  // Build a star graph: start → N1, N2, ..., N55 (56 nodes total, start + 55 leaves)
  function buildStarEdges(count: number): GraphEdge[] {
    return Array.from({ length: count }, (_, i) => edge(`e${i}`, 'start', `node${i}`));
  }

  it('truncated=true when total impacted nodes exceed 51', () => {
    const edges = buildStarEdges(55); // 1 start + 55 targets = 56 nodes → truncated
    const result = analyzeImpact('start', edges, 'forward');
    expect(result.truncated).toBe(true);
  });

  it('impactedNodes capped at 51 when truncated', () => {
    const edges = buildStarEdges(55);
    const result = analyzeImpact('start', edges, 'forward');
    expect(result.impactedNodes.length).toBe(51);
  });

  it('truncated=false when exactly 51 nodes', () => {
    // 1 start + 50 leaves = 51 total — boundary, NOT truncated
    const edges = buildStarEdges(50);
    const result = analyzeImpact('start', edges, 'forward');
    expect(result.truncated).toBe(false);
    expect(result.impactedNodes.length).toBe(51);
  });

  it('truncated=false when under limit', () => {
    const result = analyzeImpact('A', linearEdges, 'forward');
    expect(result.truncated).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Mixed edge types
// ---------------------------------------------------------------------------

describe('analyzeImpact — mixed edge types', () => {
  const mixedEdges: GraphEdge[] = [
    edge('a-b', 'A', 'B', 'import'),
    edge('b-c', 'B', 'C', 'call'),
    edge('c-d', 'C', 'D', 'data-flow'),
    edge('d-e', 'D', 'E', 'export'),
  ];

  it('traverses import edges forward', () => {
    const result = analyzeImpact('A', mixedEdges, 'forward');
    expect(result.impactedNodes).toContain('B');
  });

  it('traverses call edges forward', () => {
    const result = analyzeImpact('A', mixedEdges, 'forward');
    expect(result.impactedNodes).toContain('C');
  });

  it('traverses data-flow edges forward', () => {
    const result = analyzeImpact('A', mixedEdges, 'forward');
    expect(result.impactedNodes).toContain('D');
  });

  it('traverses export edges forward', () => {
    const result = analyzeImpact('A', mixedEdges, 'forward');
    expect(result.impactedNodes).toContain('E');
  });

  it('traverses mixed edges in reverse', () => {
    const result = analyzeImpact('E', mixedEdges, 'reverse');
    expect(result.impactedNodes).toContain('D');
    expect(result.impactedNodes).toContain('C');
    expect(result.impactedNodes).toContain('B');
    expect(result.impactedNodes).toContain('A');
  });
});

// ---------------------------------------------------------------------------
// Isolated node
// ---------------------------------------------------------------------------

describe('analyzeImpact — isolated node', () => {
  it('forward: returns only start node when no outgoing edges', () => {
    const result = analyzeImpact('src/isolated.ts', linearEdges, 'forward');
    expect(result.impactedNodes).toEqual(['src/isolated.ts']);
    expect(result.impactedEdges).toEqual([]);
  });

  it('reverse: returns only start node when no incoming edges', () => {
    const result = analyzeImpact('src/isolated.ts', linearEdges, 'reverse');
    expect(result.impactedNodes).toEqual(['src/isolated.ts']);
    expect(result.impactedEdges).toEqual([]);
  });

  it('empty edge list: returns only start node', () => {
    const result = analyzeImpact('A', [], 'forward');
    expect(result.impactedNodes).toEqual(['A']);
    expect(result.impactedEdges).toEqual([]);
    expect(result.truncated).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// depthMap correctness
// ---------------------------------------------------------------------------

describe('analyzeImpact — depthMap', () => {
  it('start node has depth 0', () => {
    const result = analyzeImpact('A', linearEdges, 'forward');
    expect(result.depthMap['A']).toBe(0);
  });

  it('direct neighbour has depth 1', () => {
    const result = analyzeImpact('A', linearEdges, 'forward');
    expect(result.depthMap['B']).toBe(1);
  });

  it('two-hop node has depth 2', () => {
    const result = analyzeImpact('A', linearEdges, 'forward');
    expect(result.depthMap['C']).toBe(2);
  });

  it('three-hop node has depth 3', () => {
    const result = analyzeImpact('A', linearEdges, 'forward');
    expect(result.depthMap['D']).toBe(3);
  });

  it('all impacted nodes have an entry in depthMap (when not truncated)', () => {
    const result = analyzeImpact('A', linearEdges, 'forward');
    for (const nodeId of result.impactedNodes) {
      expect(result.depthMap[nodeId]).toBeDefined();
    }
  });

  it('reverse depthMap is also correct (relative to start)', () => {
    const result = analyzeImpact('E', linearEdges, 'reverse');
    expect(result.depthMap['E']).toBe(0);
    expect(result.depthMap['D']).toBe(1);
    expect(result.depthMap['C']).toBe(2);
    expect(result.depthMap['B']).toBe(3);
    expect(result.depthMap['A']).toBe(4);
  });
});
