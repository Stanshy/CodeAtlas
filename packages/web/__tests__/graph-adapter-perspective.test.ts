/**
 * Sprint 11 — applyPerspective unit tests
 *
 * Coverage:
 *   - applyPerspective('system-framework') only keeps import/export edges
 *   - applyPerspective('logic-operation') keeps all edges
 *   - applyPerspective('data-journey') keeps all edges
 *   - Edges whose source or target is outside filtered node set are removed
 *   - Three-layer filter ordering: perspective filter runs on raw nodes/edges
 */

import { describe, it, expect } from 'vitest';
import {
  applyPerspective,
  filterNodes,
  filterEdges,
  applyCuration,
} from '../src/adapters/graph-adapter';
import type { GraphNode, GraphEdge, FilterState } from '../src/types/graph';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const nodeA: GraphNode = {
  id: 'src/a.ts',
  type: 'file',
  label: 'a.ts',
  filePath: 'src/a.ts',
  metadata: { role: 'business-logic' },
};

const nodeB: GraphNode = {
  id: 'src/b.ts',
  type: 'file',
  label: 'b.ts',
  filePath: 'src/b.ts',
  metadata: { role: 'business-logic' },
};

const nodeC: GraphNode = {
  id: 'src/c.ts',
  type: 'file',
  label: 'c.ts',
  filePath: 'src/c.ts',
  metadata: { role: 'business-logic' },
};

const importEdge: GraphEdge = {
  id: 'a--import--b',
  source: 'src/a.ts',
  target: 'src/b.ts',
  type: 'import',
  metadata: {},
};

const exportEdge: GraphEdge = {
  id: 'b--export--c',
  source: 'src/b.ts',
  target: 'src/c.ts',
  type: 'export',
  metadata: {},
};

const callEdge: GraphEdge = {
  id: 'a--call--c',
  source: 'src/a.ts',
  target: 'src/c.ts',
  type: 'call',
  metadata: {},
};

const dataFlowEdge: GraphEdge = {
  id: 'b--data-flow--c',
  source: 'src/b.ts',
  target: 'src/c.ts',
  type: 'data-flow',
  metadata: {},
};

const allNodes = [nodeA, nodeB, nodeC];
const allEdges = [importEdge, exportEdge, callEdge, dataFlowEdge];

// ---------------------------------------------------------------------------
// system-framework perspective
// ---------------------------------------------------------------------------

describe('applyPerspective — system-framework', () => {
  it('keeps import edges', () => {
    const result = applyPerspective(allNodes, allEdges, 'system-framework');
    expect(result.edges.some(e => e.type === 'import')).toBe(true);
  });

  it('keeps export edges', () => {
    const result = applyPerspective(allNodes, allEdges, 'system-framework');
    expect(result.edges.some(e => e.type === 'export')).toBe(true);
  });

  it('removes call edges', () => {
    const result = applyPerspective(allNodes, allEdges, 'system-framework');
    expect(result.edges.some(e => e.type === 'call')).toBe(false);
  });

  it('removes data-flow edges', () => {
    const result = applyPerspective(allNodes, allEdges, 'system-framework');
    expect(result.edges.some(e => e.type === 'data-flow')).toBe(false);
  });

  it('keeps all nodes (nodeTypes filter is empty)', () => {
    const result = applyPerspective(allNodes, allEdges, 'system-framework');
    expect(result.nodes).toHaveLength(allNodes.length);
  });

  it('returns exactly 2 edges (import + export)', () => {
    const result = applyPerspective(allNodes, allEdges, 'system-framework');
    expect(result.edges).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// logic-operation perspective
// ---------------------------------------------------------------------------

describe('applyPerspective — logic-operation', () => {
  it('keeps all edges (filter is empty = select all)', () => {
    const result = applyPerspective(allNodes, allEdges, 'logic-operation');
    expect(result.edges).toHaveLength(allEdges.length);
  });

  it('keeps import edges', () => {
    const result = applyPerspective(allNodes, allEdges, 'logic-operation');
    expect(result.edges.some(e => e.type === 'import')).toBe(true);
  });

  it('keeps call edges', () => {
    const result = applyPerspective(allNodes, allEdges, 'logic-operation');
    expect(result.edges.some(e => e.type === 'call')).toBe(true);
  });

  it('keeps data-flow edges', () => {
    const result = applyPerspective(allNodes, allEdges, 'logic-operation');
    expect(result.edges.some(e => e.type === 'data-flow')).toBe(true);
  });

  it('keeps all nodes', () => {
    const result = applyPerspective(allNodes, allEdges, 'logic-operation');
    expect(result.nodes).toHaveLength(allNodes.length);
  });
});

// ---------------------------------------------------------------------------
// data-journey perspective
// ---------------------------------------------------------------------------

describe('applyPerspective — data-journey', () => {
  it('keeps all edges (filter is empty = select all)', () => {
    const result = applyPerspective(allNodes, allEdges, 'data-journey');
    expect(result.edges).toHaveLength(allEdges.length);
  });

  it('keeps data-flow edges', () => {
    const result = applyPerspective(allNodes, allEdges, 'data-journey');
    expect(result.edges.some(e => e.type === 'data-flow')).toBe(true);
  });

  it('keeps all nodes', () => {
    const result = applyPerspective(allNodes, allEdges, 'data-journey');
    expect(result.nodes).toHaveLength(allNodes.length);
  });
});

// ---------------------------------------------------------------------------
// Three-layer filter order
// ---------------------------------------------------------------------------

describe('three-layer filter order: perspective → curation → manual filter', () => {
  // Utility nodes that curation would hide
  const utilNode: GraphNode = {
    id: 'src/util.ts',
    type: 'file',
    label: 'util.ts',
    filePath: 'src/util.ts',
    metadata: { role: 'utility' },
  };

  const nodesWithUtil = [...allNodes, utilNode];
  const callEdgeToUtil: GraphEdge = {
    id: 'a--call--util',
    source: 'src/a.ts',
    target: 'src/util.ts',
    type: 'call',
    metadata: {},
  };
  const edgesWithUtil = [...allEdges, callEdgeToUtil];

  it('stage 1 perspective filter runs first on raw nodes', () => {
    // system-framework removes call edges, so call edge to util is gone
    const perspResult = applyPerspective(nodesWithUtil, edgesWithUtil, 'system-framework');
    expect(perspResult.edges.some(e => e.type === 'call')).toBe(false);
  });

  it('stage 2 curation applied after perspective does not re-introduce removed edges', () => {
    // After perspective filter removes call edges, curation should not add them back
    const perspResult = applyPerspective(nodesWithUtil, edgesWithUtil, 'system-framework');
    const curationResult = applyCuration(perspResult.nodes, perspResult.edges, new Set());
    expect(curationResult.edges.some(e => e.type === 'call')).toBe(false);
  });

  it('stage 3 manual filter further narrows edges after perspective', () => {
    // After perspective (logic-operation, all edges), manual filter keeps only import
    const perspResult = applyPerspective(nodesWithUtil, edgesWithUtil, 'logic-operation');
    const manualFilter: FilterState = {
      directories: [],
      nodeTypes: [],
      edgeTypes: ['import'],
    };
    const nodeIds = new Set(perspResult.nodes.map(n => n.id));
    const manualFiltered = filterEdges(perspResult.edges, nodeIds, manualFilter);
    expect(manualFiltered.every(e => e.type === 'import')).toBe(true);
  });

  it('curation hides utility node when not pinned', () => {
    const perspResult = applyPerspective(nodesWithUtil, edgesWithUtil, 'logic-operation');
    const curationResult = applyCuration(perspResult.nodes, perspResult.edges, new Set());
    expect(curationResult.nodes.some(n => n.id === 'src/util.ts')).toBe(false);
  });

  it('curation shows utility node when pinned', () => {
    const perspResult = applyPerspective(nodesWithUtil, edgesWithUtil, 'logic-operation');
    const curationResult = applyCuration(
      perspResult.nodes,
      perspResult.edges,
      new Set(['src/util.ts']),
    );
    expect(curationResult.nodes.some(n => n.id === 'src/util.ts')).toBe(true);
  });
});
