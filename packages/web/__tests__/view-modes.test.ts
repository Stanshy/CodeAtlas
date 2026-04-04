/**
 * Sprint 9 — VIEW_MODE_PRESETS + applyViewMode unit tests
 *
 * Coverage:
 *   VIEW_MODE_PRESETS validation:
 *   1.  Has all 4 keys: panorama, dependency, dataflow, callchain
 *   2.  Each preset has name, label, description, filter, display
 *   3.  panorama filter: nodeTypes=[], edgeTypes=[] (show all)
 *   4.  dependency filter: edgeTypes=['import','export']
 *   5.  dataflow filter: edgeTypes=['data-flow','export'], display.showHeatmap=true, showEdgeLabels=true
 *   6.  callchain filter: nodeTypes=['function','class','file'], edgeTypes=['call'], display.expandFiles=true
 *
 *   applyViewMode:
 *   7.  panorama mode: returns all nodes and all edges
 *   8.  dependency mode: only import/export edges survive; all nodes survive
 *   9.  dataflow mode: only data-flow/export edges survive
 *   10. callchain mode: only function/class/file nodes survive; only call edges survive
 *   11. Empty input: returns empty arrays
 */

import { describe, it, expect } from 'vitest';
import { VIEW_MODE_PRESETS, type ViewModePreset } from '../src/adapters/view-modes';
import { applyViewMode } from '../src/adapters/graph-adapter';
import type { GraphNode, GraphEdge, ViewModeName } from '../src/types/graph';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeNode(id: string, type: GraphNode['type']): GraphNode {
  return {
    id,
    type,
    label: id,
    filePath: `src/${id}.ts`,
    metadata: {},
  };
}

function makeEdge(id: string, source: string, target: string, type: GraphEdge['type']): GraphEdge {
  return { id, source, target, type, metadata: {} };
}

// Nodes: one of each type
const fileNode = makeNode('file-a', 'file');
const funcNode = makeNode('func-a', 'function');
const classNode = makeNode('class-a', 'class');
const dirNode = makeNode('dir-a', 'directory');

const allNodes: GraphNode[] = [fileNode, funcNode, classNode, dirNode];

// Edges: one of each type (using nodes that exist in allNodes)
const importEdge = makeEdge('e-import', 'file-a', 'func-a', 'import');
const exportEdge = makeEdge('e-export', 'func-a', 'class-a', 'export');
const callEdge   = makeEdge('e-call',   'func-a', 'class-a', 'call');
const dataEdge   = makeEdge('e-data',   'class-a', 'file-a', 'data-flow');

const allEdges: GraphEdge[] = [importEdge, exportEdge, callEdge, dataEdge];

// ---------------------------------------------------------------------------
// VIEW_MODE_PRESETS — structure validation
// ---------------------------------------------------------------------------

describe('VIEW_MODE_PRESETS — keys and structure', () => {
  it('has panorama key', () => {
    expect(VIEW_MODE_PRESETS).toHaveProperty('panorama');
  });

  it('has dependency key', () => {
    expect(VIEW_MODE_PRESETS).toHaveProperty('dependency');
  });

  it('has dataflow key', () => {
    expect(VIEW_MODE_PRESETS).toHaveProperty('dataflow');
  });

  it('has callchain key', () => {
    expect(VIEW_MODE_PRESETS).toHaveProperty('callchain');
  });

  it('has exactly 4 keys', () => {
    expect(Object.keys(VIEW_MODE_PRESETS)).toHaveLength(4);
  });

  it('each preset has name, label, description, filter, display', () => {
    const modes: ViewModeName[] = ['panorama', 'dependency', 'dataflow', 'callchain'];
    for (const mode of modes) {
      const preset: ViewModePreset = VIEW_MODE_PRESETS[mode];
      expect(preset).toHaveProperty('name');
      expect(preset).toHaveProperty('label');
      expect(preset).toHaveProperty('description');
      expect(preset).toHaveProperty('filter');
      expect(preset).toHaveProperty('display');
    }
  });

  it('each preset name matches its key', () => {
    const modes: ViewModeName[] = ['panorama', 'dependency', 'dataflow', 'callchain'];
    for (const mode of modes) {
      expect(VIEW_MODE_PRESETS[mode].name).toBe(mode);
    }
  });
});

// ---------------------------------------------------------------------------
// VIEW_MODE_PRESETS — filter config per mode
// ---------------------------------------------------------------------------

describe('VIEW_MODE_PRESETS — panorama filter', () => {
  it('nodeTypes is empty array (show all)', () => {
    expect(VIEW_MODE_PRESETS.panorama.filter.nodeTypes).toEqual([]);
  });

  it('edgeTypes is empty array (show all)', () => {
    expect(VIEW_MODE_PRESETS.panorama.filter.edgeTypes).toEqual([]);
  });
});

describe('VIEW_MODE_PRESETS — dependency filter', () => {
  it('nodeTypes is empty array (show all nodes)', () => {
    expect(VIEW_MODE_PRESETS.dependency.filter.nodeTypes).toEqual([]);
  });

  it('edgeTypes contains import', () => {
    expect(VIEW_MODE_PRESETS.dependency.filter.edgeTypes).toContain('import');
  });

  it('edgeTypes contains export', () => {
    expect(VIEW_MODE_PRESETS.dependency.filter.edgeTypes).toContain('export');
  });

  it('edgeTypes has exactly 2 entries', () => {
    expect(VIEW_MODE_PRESETS.dependency.filter.edgeTypes).toHaveLength(2);
  });
});

describe('VIEW_MODE_PRESETS — dataflow filter and display', () => {
  it('edgeTypes contains data-flow', () => {
    expect(VIEW_MODE_PRESETS.dataflow.filter.edgeTypes).toContain('data-flow');
  });

  it('edgeTypes contains export', () => {
    expect(VIEW_MODE_PRESETS.dataflow.filter.edgeTypes).toContain('export');
  });

  it('display.showHeatmap is true', () => {
    expect(VIEW_MODE_PRESETS.dataflow.display.showHeatmap).toBe(true);
  });

  it('display.showEdgeLabels is true', () => {
    expect(VIEW_MODE_PRESETS.dataflow.display.showEdgeLabels).toBe(true);
  });
});

describe('VIEW_MODE_PRESETS — callchain filter and display', () => {
  it('nodeTypes contains function', () => {
    expect(VIEW_MODE_PRESETS.callchain.filter.nodeTypes).toContain('function');
  });

  it('nodeTypes contains class', () => {
    expect(VIEW_MODE_PRESETS.callchain.filter.nodeTypes).toContain('class');
  });

  it('nodeTypes contains file', () => {
    expect(VIEW_MODE_PRESETS.callchain.filter.nodeTypes).toContain('file');
  });

  it('edgeTypes contains only call', () => {
    expect(VIEW_MODE_PRESETS.callchain.filter.edgeTypes).toEqual(['call']);
  });

  it('display.expandFiles is true', () => {
    expect(VIEW_MODE_PRESETS.callchain.display.expandFiles).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// applyViewMode — panorama (7)
// ---------------------------------------------------------------------------

describe('applyViewMode — panorama', () => {
  it('returns all nodes', () => {
    const { nodes } = applyViewMode(allNodes, allEdges, 'panorama');
    expect(nodes).toHaveLength(allNodes.length);
  });

  it('returns all edges', () => {
    const { edges } = applyViewMode(allNodes, allEdges, 'panorama');
    expect(edges).toHaveLength(allEdges.length);
  });

  it('node IDs are unchanged', () => {
    const { nodes } = applyViewMode(allNodes, allEdges, 'panorama');
    const ids = nodes.map(n => n.id);
    expect(ids).toContain('file-a');
    expect(ids).toContain('func-a');
    expect(ids).toContain('class-a');
    expect(ids).toContain('dir-a');
  });
});

// ---------------------------------------------------------------------------
// applyViewMode — dependency (8)
// ---------------------------------------------------------------------------

describe('applyViewMode — dependency', () => {
  it('all nodes survive (no node type filtering)', () => {
    const { nodes } = applyViewMode(allNodes, allEdges, 'dependency');
    expect(nodes).toHaveLength(allNodes.length);
  });

  it('only import and export edges survive', () => {
    const { edges } = applyViewMode(allNodes, allEdges, 'dependency');
    expect(edges.every(e => e.type === 'import' || e.type === 'export')).toBe(true);
  });

  it('call edge is excluded', () => {
    const { edges } = applyViewMode(allNodes, allEdges, 'dependency');
    expect(edges.find(e => e.type === 'call')).toBeUndefined();
  });

  it('data-flow edge is excluded', () => {
    const { edges } = applyViewMode(allNodes, allEdges, 'dependency');
    expect(edges.find(e => e.type === 'data-flow')).toBeUndefined();
  });

  it('import edge is included', () => {
    const { edges } = applyViewMode(allNodes, allEdges, 'dependency');
    expect(edges.find(e => e.id === 'e-import')).toBeDefined();
  });

  it('export edge is included', () => {
    const { edges } = applyViewMode(allNodes, allEdges, 'dependency');
    expect(edges.find(e => e.id === 'e-export')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// applyViewMode — dataflow (9)
// ---------------------------------------------------------------------------

describe('applyViewMode — dataflow', () => {
  it('all nodes survive (no node type filtering in dataflow)', () => {
    const { nodes } = applyViewMode(allNodes, allEdges, 'dataflow');
    expect(nodes).toHaveLength(allNodes.length);
  });

  it('only data-flow and export edges survive', () => {
    const { edges } = applyViewMode(allNodes, allEdges, 'dataflow');
    expect(edges.every(e => e.type === 'data-flow' || e.type === 'export')).toBe(true);
  });

  it('import edge is excluded', () => {
    const { edges } = applyViewMode(allNodes, allEdges, 'dataflow');
    expect(edges.find(e => e.type === 'import')).toBeUndefined();
  });

  it('call edge is excluded', () => {
    const { edges } = applyViewMode(allNodes, allEdges, 'dataflow');
    expect(edges.find(e => e.type === 'call')).toBeUndefined();
  });

  it('data-flow edge is included', () => {
    const { edges } = applyViewMode(allNodes, allEdges, 'dataflow');
    expect(edges.find(e => e.id === 'e-data')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// applyViewMode — callchain (10)
// ---------------------------------------------------------------------------

describe('applyViewMode — callchain', () => {
  it('directory node is filtered out', () => {
    const { nodes } = applyViewMode(allNodes, allEdges, 'callchain');
    expect(nodes.find(n => n.id === 'dir-a')).toBeUndefined();
  });

  it('file, function, class nodes survive', () => {
    const { nodes } = applyViewMode(allNodes, allEdges, 'callchain');
    const ids = nodes.map(n => n.id);
    expect(ids).toContain('file-a');
    expect(ids).toContain('func-a');
    expect(ids).toContain('class-a');
  });

  it('only call edges survive', () => {
    const { edges } = applyViewMode(allNodes, allEdges, 'callchain');
    expect(edges.every(e => e.type === 'call')).toBe(true);
  });

  it('import edge is excluded', () => {
    const { edges } = applyViewMode(allNodes, allEdges, 'callchain');
    expect(edges.find(e => e.type === 'import')).toBeUndefined();
  });

  it('export edge is excluded', () => {
    const { edges } = applyViewMode(allNodes, allEdges, 'callchain');
    expect(edges.find(e => e.type === 'export')).toBeUndefined();
  });

  it('data-flow edge is excluded', () => {
    const { edges } = applyViewMode(allNodes, allEdges, 'callchain');
    expect(edges.find(e => e.type === 'data-flow')).toBeUndefined();
  });

  it('call edge between surviving nodes is included', () => {
    const { edges } = applyViewMode(allNodes, allEdges, 'callchain');
    expect(edges.find(e => e.id === 'e-call')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// applyViewMode — empty input (11)
// ---------------------------------------------------------------------------

describe('applyViewMode — empty input', () => {
  const modes: ViewModeName[] = ['panorama', 'dependency', 'dataflow', 'callchain'];

  for (const mode of modes) {
    it(`${mode}: empty nodes returns empty nodes`, () => {
      const { nodes } = applyViewMode([], [], mode);
      expect(nodes).toEqual([]);
    });

    it(`${mode}: empty edges returns empty edges`, () => {
      const { edges } = applyViewMode([], [], mode);
      expect(edges).toEqual([]);
    });
  }
});
