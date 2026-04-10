/**
 * Sprint 9 — traceE2E pure function unit tests
 *
 * Coverage:
 *   1.  Linear path A→B→C: path, edges, steps, truncated=false
 *   2.  Mixed edge types (import, call, data-flow) all followed
 *   3.  Depth limit: maxDepth=2 stops traversal at depth 2
 *   4.  Cycle detection: A→B→C→A loop — each node appears once
 *   5.  Truncation at 30 nodes: chain of 35 nodes → truncated=true
 *   6.  Steps structure: correct nodeId, nodeLabel, edgeId, edgeType, symbols, depth
 *   7.  Symbol collection: edge.metadata.importedSymbols collected in step.symbols
 *   8.  Empty graph: no nodes/edges → path=[startNodeId], 1 step
 *   9.  Start node not in graph: returns path=[startNodeId], steps=[{startNodeId...}]
 *   10. Branching BFS: A→B and A→C both reachable
 */

import { describe, it, expect } from 'vitest';
import { traceE2E } from '../src/hooks/useE2ETracing';
import type { GraphNode, GraphEdge } from '../src/types/graph';

// ---------------------------------------------------------------------------
// Fixtures helpers
// ---------------------------------------------------------------------------

function makeNode(id: string, label?: string): GraphNode {
  return {
    id,
    type: 'file',
    label: label ?? id,
    filePath: `src/${id}.ts`,
    metadata: {},
  };
}

function makeEdge(
  id: string,
  source: string,
  target: string,
  type: GraphEdge['type'] = 'import',
  importedSymbols?: string[],
): GraphEdge {
  return {
    id,
    source,
    target,
    type,
    metadata: importedSymbols ? { importedSymbols } : {},
  };
}

// Linear chain: A → B → C
const nodeA = makeNode('A', 'NodeA');
const nodeB = makeNode('B', 'NodeB');
const nodeC = makeNode('C', 'NodeC');
const nodeD = makeNode('D', 'NodeD');

const edgeAB = makeEdge('e-AB', 'A', 'B', 'import');
const edgeBC = makeEdge('e-BC', 'B', 'C', 'import');
const edgeCD = makeEdge('e-CD', 'C', 'D', 'import');

// ---------------------------------------------------------------------------
// 1. Linear path A→B→C
// ---------------------------------------------------------------------------

describe('traceE2E — linear path A→B→C', () => {
  const nodes = [nodeA, nodeB, nodeC];
  const edges = [edgeAB, edgeBC];

  it('path contains A, B, C in order', () => {
    const result = traceE2E('A', nodes, edges);
    expect(result.path).toEqual(['A', 'B', 'C']);
  });

  it('edges contains the two traversed edge IDs', () => {
    const result = traceE2E('A', nodes, edges);
    expect(result.edges).toEqual(['e-AB', 'e-BC']);
  });

  it('steps has 3 entries (one per node)', () => {
    const result = traceE2E('A', nodes, edges);
    expect(result.steps).toHaveLength(3);
  });

  it('truncated is false', () => {
    const result = traceE2E('A', nodes, edges);
    expect(result.truncated).toBe(false);
  });

  it('first step is the start node with depth 0 and null edge fields', () => {
    const result = traceE2E('A', nodes, edges);
    expect(result.steps[0]).toMatchObject({
      nodeId: 'A',
      nodeLabel: 'NodeA',
      edgeId: null,
      edgeType: null,
      symbols: [],
      depth: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Mixed edge types — import, call, data-flow
// ---------------------------------------------------------------------------

describe('traceE2E — mixed edge types', () => {
  const funcNode = { ...makeNode('func', 'func'), type: 'function' as const };
  const classNode = { ...makeNode('cls', 'cls'), type: 'class' as const };
  const fileNode = makeNode('file', 'file');
  const entryNode = makeNode('entry', 'entry');

  const importEdge = makeEdge('e-import', 'entry', 'file', 'import');
  const callEdge = makeEdge('e-call', 'entry', 'func', 'call');
  const dataEdge = makeEdge('e-data', 'entry', 'cls', 'data-flow');

  it('follows import edges', () => {
    const result = traceE2E('entry', [entryNode, fileNode], [importEdge]);
    expect(result.path).toContain('file');
  });

  it('follows call edges', () => {
    const result = traceE2E('entry', [entryNode, funcNode], [callEdge]);
    expect(result.path).toContain('func');
  });

  it('follows data-flow edges', () => {
    const result = traceE2E('entry', [entryNode, classNode], [dataEdge]);
    expect(result.path).toContain('cls');
  });

  it('all 3 edge types are followed in a single traversal', () => {
    const result = traceE2E(
      'entry',
      [entryNode, fileNode, funcNode, classNode],
      [importEdge, callEdge, dataEdge],
    );
    expect(result.path).toContain('file');
    expect(result.path).toContain('func');
    expect(result.path).toContain('cls');
    expect(result.path).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// 3. Depth limit
// ---------------------------------------------------------------------------

describe('traceE2E — depth limit', () => {
  // A(0) → B(1) → C(2) → D(3): with maxDepth=2, D is never reached
  const nodes = [nodeA, nodeB, nodeC, nodeD];
  const edges = [edgeAB, edgeBC, edgeCD];

  it('with maxDepth=2, path does not include D (depth 3)', () => {
    const result = traceE2E('A', nodes, edges, 2);
    expect(result.path).not.toContain('D');
  });

  it('with maxDepth=2, path contains A, B, C', () => {
    const result = traceE2E('A', nodes, edges, 2);
    expect(result.path).toEqual(['A', 'B', 'C']);
  });

  it('with maxDepth=1, path contains only A and B', () => {
    const result = traceE2E('A', nodes, edges, 1);
    expect(result.path).toEqual(['A', 'B']);
  });

  it('with maxDepth=0, path contains only the start node', () => {
    const result = traceE2E('A', nodes, edges, 0);
    expect(result.path).toEqual(['A']);
  });

  it('truncated is false when stopped by depth limit (not node count)', () => {
    const result = traceE2E('A', nodes, edges, 2);
    expect(result.truncated).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Cycle detection
// ---------------------------------------------------------------------------

describe('traceE2E — cycle detection', () => {
  // A → B → C → A (back to start)
  const cycleEdgeCA = makeEdge('e-CA', 'C', 'A', 'import');
  const nodes = [nodeA, nodeB, nodeC];
  const edges = [edgeAB, edgeBC, cycleEdgeCA];

  it('each node appears at most once in path', () => {
    const result = traceE2E('A', nodes, edges);
    const unique = new Set(result.path);
    expect(unique.size).toBe(result.path.length);
  });

  it('path contains A, B, C exactly once each', () => {
    const result = traceE2E('A', nodes, edges);
    expect(result.path.filter(id => id === 'A')).toHaveLength(1);
    expect(result.path.filter(id => id === 'B')).toHaveLength(1);
    expect(result.path.filter(id => id === 'C')).toHaveLength(1);
  });

  it('does not loop infinitely — returns a result', () => {
    const result = traceE2E('A', nodes, edges);
    expect(result).toBeDefined();
    expect(result.path.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Truncation at 30 nodes
// ---------------------------------------------------------------------------

describe('traceE2E — truncation at 30 nodes', () => {
  // Build a chain of 35 nodes: n0 → n1 → n2 → ... → n34
  // Use maxDepth=50 to ensure depth limit is not the stopping factor — only node count matters
  const chainNodes: GraphNode[] = Array.from({ length: 35 }, (_, i) =>
    makeNode(`n${i}`, `Node${i}`),
  );
  const chainEdges: GraphEdge[] = Array.from({ length: 34 }, (_, i) =>
    makeEdge(`e-${i}-${i + 1}`, `n${i}`, `n${i + 1}`, 'import'),
  );

  it('truncated is true when chain exceeds 30 nodes', () => {
    const result = traceE2E('n0', chainNodes, chainEdges, 50);
    expect(result.truncated).toBe(true);
  });

  it('path.length is at most 30', () => {
    const result = traceE2E('n0', chainNodes, chainEdges, 50);
    expect(result.path.length).toBeLessThanOrEqual(30);
  });

  it('path starts at the start node', () => {
    const result = traceE2E('n0', chainNodes, chainEdges, 50);
    expect(result.path[0]).toBe('n0');
  });
});

// ---------------------------------------------------------------------------
// 6. Steps structure
// ---------------------------------------------------------------------------

describe('traceE2E — steps structure', () => {
  const nodes = [nodeA, nodeB, nodeC];
  const edges = [edgeAB, edgeBC];

  it('step[0] has nodeId=A, nodeLabel=NodeA, edgeId=null, depth=0', () => {
    const result = traceE2E('A', nodes, edges);
    expect(result.steps[0]).toMatchObject({
      nodeId: 'A',
      nodeLabel: 'NodeA',
      edgeId: null,
      edgeType: null,
      depth: 0,
    });
  });

  it('step[1] has nodeId=B, edgeId=e-AB, edgeType=import, depth=1', () => {
    const result = traceE2E('A', nodes, edges);
    expect(result.steps[1]).toMatchObject({
      nodeId: 'B',
      nodeLabel: 'NodeB',
      edgeId: 'e-AB',
      edgeType: 'import',
      depth: 1,
    });
  });

  it('step[2] has nodeId=C, edgeId=e-BC, edgeType=import, depth=2', () => {
    const result = traceE2E('A', nodes, edges);
    expect(result.steps[2]).toMatchObject({
      nodeId: 'C',
      nodeLabel: 'NodeC',
      edgeId: 'e-BC',
      edgeType: 'import',
      depth: 2,
    });
  });

  it('every step has all required fields', () => {
    const result = traceE2E('A', nodes, edges);
    for (const step of result.steps) {
      expect(step).toHaveProperty('nodeId');
      expect(step).toHaveProperty('nodeLabel');
      expect(step).toHaveProperty('edgeId');
      expect(step).toHaveProperty('edgeType');
      expect(step).toHaveProperty('symbols');
      expect(step).toHaveProperty('depth');
    }
  });
});

// ---------------------------------------------------------------------------
// 7. Symbol collection
// ---------------------------------------------------------------------------

describe('traceE2E — symbol collection', () => {
  const symbolEdge = makeEdge('e-sym', 'A', 'B', 'import', ['foo', 'bar']);
  const nodes = [nodeA, nodeB];

  it('step for B has symbols=[foo, bar] from importedSymbols', () => {
    const result = traceE2E('A', nodes, [symbolEdge]);
    const stepB = result.steps.find(s => s.nodeId === 'B');
    expect(stepB?.symbols).toEqual(['foo', 'bar']);
  });

  it('start node step always has empty symbols', () => {
    const result = traceE2E('A', nodes, [symbolEdge]);
    expect(result.steps[0].symbols).toEqual([]);
  });

  it('edge without importedSymbols produces empty symbols array', () => {
    const noSymbolEdge = makeEdge('e-nosym', 'A', 'B', 'call');
    const result = traceE2E('A', nodes, [noSymbolEdge]);
    const stepB = result.steps.find(s => s.nodeId === 'B');
    expect(stepB?.symbols).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 8. Empty graph (no nodes, no edges)
// ---------------------------------------------------------------------------

describe('traceE2E — empty graph', () => {
  it('path contains only the start node ID', () => {
    const result = traceE2E('A', [], []);
    expect(result.path).toEqual(['A']);
  });

  it('edges is empty', () => {
    const result = traceE2E('A', [], []);
    expect(result.edges).toEqual([]);
  });

  it('steps has exactly 1 entry for the start node', () => {
    const result = traceE2E('A', [], []);
    expect(result.steps).toHaveLength(1);
  });

  it('the single step uses nodeId as label when node is not in graph', () => {
    const result = traceE2E('A', [], []);
    expect(result.steps[0].nodeLabel).toBe('A');
  });

  it('truncated is false', () => {
    const result = traceE2E('A', [], []);
    expect(result.truncated).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 9. Start node not in graph
// ---------------------------------------------------------------------------

describe('traceE2E — start node not in graph', () => {
  const someNode = makeNode('X', 'NodeX');
  const someEdge = makeEdge('e-XY', 'X', 'Y', 'import');

  it('path contains only the unknown start node', () => {
    const result = traceE2E('UNKNOWN', [someNode], [someEdge]);
    expect(result.path).toEqual(['UNKNOWN']);
  });

  it('steps has exactly 1 entry', () => {
    const result = traceE2E('UNKNOWN', [someNode], [someEdge]);
    expect(result.steps).toHaveLength(1);
  });

  it('the step uses nodeId as label when node not found', () => {
    const result = traceE2E('UNKNOWN', [someNode], [someEdge]);
    expect(result.steps[0].nodeLabel).toBe('UNKNOWN');
  });

  it('truncated is false', () => {
    const result = traceE2E('UNKNOWN', [someNode], [someEdge]);
    expect(result.truncated).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 10. Branching BFS: A→B and A→C both reachable
// ---------------------------------------------------------------------------

describe('traceE2E — branching BFS', () => {
  const edgeAB2 = makeEdge('e-AB2', 'A', 'B', 'import');
  const edgeAC = makeEdge('e-AC', 'A', 'C', 'call');
  const nodes = [nodeA, nodeB, nodeC];
  const edges = [edgeAB2, edgeAC];

  it('path contains A, B, and C', () => {
    const result = traceE2E('A', nodes, edges);
    expect(result.path).toContain('A');
    expect(result.path).toContain('B');
    expect(result.path).toContain('C');
  });

  it('path length is 3 (A + 2 branches)', () => {
    const result = traceE2E('A', nodes, edges);
    expect(result.path).toHaveLength(3);
  });

  it('A is the first node in path', () => {
    const result = traceE2E('A', nodes, edges);
    expect(result.path[0]).toBe('A');
  });

  it('both branch edges are in result.edges', () => {
    const result = traceE2E('A', nodes, edges);
    expect(result.edges).toContain('e-AB2');
    expect(result.edges).toContain('e-AC');
  });

  it('steps has an entry for each reachable node', () => {
    const result = traceE2E('A', nodes, edges);
    const nodeIds = result.steps.map(s => s.nodeId);
    expect(nodeIds).toContain('A');
    expect(nodeIds).toContain('B');
    expect(nodeIds).toContain('C');
  });
});
