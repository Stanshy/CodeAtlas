/**
 * Sprint 8 — graph-adapter filterNodes / filterEdges unit tests
 *
 * Coverage:
 *   - empty filter (all arrays empty) selects all nodes
 *   - directory filter narrows to matching filePath prefix
 *   - nodeType filter retains only matching types
 *   - edgeType filter retains only matching edge types
 *   - combined directory + nodeType filter
 *   - filterEdges removes edges whose endpoints are not in filteredNodeIds
 *   - filterEdges edgeType filter
 *   - empty nodes/edges input returns empty
 */

import { describe, it, expect } from 'vitest';
import { filterNodes, filterEdges } from '../src/adapters/graph-adapter';
import type { GraphNode, GraphEdge, FilterState } from '../src/types/graph';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const coreEngine: GraphNode = {
  id: 'src/core/engine.ts',
  type: 'file',
  label: 'engine.ts',
  filePath: 'src/core/engine.ts',
  metadata: {},
};

const coreParser: GraphNode = {
  id: 'src/core/parser.ts',
  type: 'file',
  label: 'parser.ts',
  filePath: 'src/core/parser.ts',
  metadata: {},
};

const uiButton: GraphNode = {
  id: 'src/ui/button.tsx',
  type: 'file',
  label: 'button.tsx',
  filePath: 'src/ui/button.tsx',
  metadata: {},
};

const uiPanel: GraphNode = {
  id: 'src/ui/panel.tsx',
  type: 'file',
  label: 'panel.tsx',
  filePath: 'src/ui/panel.tsx',
  metadata: {},
};

const coreDir: GraphNode = {
  id: 'src/core',
  type: 'directory',
  label: 'core',
  filePath: 'src/core',
  metadata: {},
};

const uiDir: GraphNode = {
  id: 'src/ui',
  type: 'directory',
  label: 'ui',
  filePath: 'src/ui',
  metadata: {},
};

const runFn: GraphNode = {
  id: 'src/core/engine.ts#run',
  type: 'function',
  label: 'run',
  filePath: 'src/core/engine.ts',
  metadata: { parentFileId: 'src/core/engine.ts' },
};

const serviceClass: GraphNode = {
  id: 'src/core/engine.ts#Service',
  type: 'class',
  label: 'Service',
  filePath: 'src/core/engine.ts',
  metadata: { parentFileId: 'src/core/engine.ts' },
};

const allNodes: GraphNode[] = [coreEngine, coreParser, uiButton, uiPanel, coreDir, uiDir, runFn, serviceClass];

const emptyFilter: FilterState = { directories: [], nodeTypes: [], edgeTypes: [] };

// Edges
function edge(
  id: string,
  source: string,
  target: string,
  type: GraphEdge['type'] = 'import',
): GraphEdge {
  return { id, source, target, type, metadata: {} };
}

const importEdge = edge('engine--import--parser', 'src/core/engine.ts', 'src/core/parser.ts', 'import');
const callEdge   = edge('button--call--run',      'src/ui/button.tsx',  'src/core/engine.ts#run', 'call');
const dataEdge   = edge('engine--data--panel',    'src/core/engine.ts', 'src/ui/panel.tsx', 'data-flow');
const exportEdge = edge('panel--export--button',  'src/ui/panel.tsx',   'src/ui/button.tsx', 'export');

const allEdges: GraphEdge[] = [importEdge, callEdge, dataEdge, exportEdge];

// ---------------------------------------------------------------------------
// filterNodes
// ---------------------------------------------------------------------------

describe('filterNodes — empty filter', () => {
  it('returns all nodes when all filter arrays are empty', () => {
    const result = filterNodes(allNodes, emptyFilter);
    expect(result).toHaveLength(allNodes.length);
  });

  it('returns empty array when node list is empty', () => {
    expect(filterNodes([], emptyFilter)).toEqual([]);
  });
});

describe('filterNodes — directory filter', () => {
  it('keeps only nodes whose filePath starts with specified directory', () => {
    const filter: FilterState = { directories: ['src/core'], nodeTypes: [], edgeTypes: [] };
    const result = filterNodes(allNodes, filter);
    const ids = result.map((n) => n.id);
    expect(ids).toContain('src/core/engine.ts');
    expect(ids).toContain('src/core/parser.ts');
    expect(ids).toContain('src/core/engine.ts#run');
    expect(ids).toContain('src/core/engine.ts#Service');
  });

  it('excludes nodes from other directories', () => {
    const filter: FilterState = { directories: ['src/core'], nodeTypes: [], edgeTypes: [] };
    const result = filterNodes(allNodes, filter);
    const ids = result.map((n) => n.id);
    expect(ids).not.toContain('src/ui/button.tsx');
    expect(ids).not.toContain('src/ui/panel.tsx');
  });

  it('directory node is matched by id equality', () => {
    const filter: FilterState = { directories: ['src/core'], nodeTypes: [], edgeTypes: [] };
    const result = filterNodes(allNodes, filter);
    // The directory node id === 'src/core', which matches filter.directories[0]
    expect(result.find((n) => n.id === 'src/core')).toBeDefined();
  });

  it('multiple directories returns union', () => {
    const filter: FilterState = { directories: ['src/core', 'src/ui'], nodeTypes: [], edgeTypes: [] };
    const result = filterNodes(allNodes, filter);
    expect(result.length).toBe(allNodes.length);
  });
});

describe('filterNodes — nodeType filter', () => {
  it('keeps only file nodes when nodeTypes=["file"]', () => {
    const filter: FilterState = { directories: [], nodeTypes: ['file'], edgeTypes: [] };
    const result = filterNodes(allNodes, filter);
    expect(result.every((n) => n.type === 'file')).toBe(true);
    expect(result.length).toBe(4);
  });

  it('keeps only directory nodes when nodeTypes=["directory"]', () => {
    const filter: FilterState = { directories: [], nodeTypes: ['directory'], edgeTypes: [] };
    const result = filterNodes(allNodes, filter);
    expect(result.every((n) => n.type === 'directory')).toBe(true);
    expect(result.length).toBe(2);
  });

  it('keeps only function nodes when nodeTypes=["function"]', () => {
    const filter: FilterState = { directories: [], nodeTypes: ['function'], edgeTypes: [] };
    const result = filterNodes(allNodes, filter);
    expect(result.every((n) => n.type === 'function')).toBe(true);
    expect(result.length).toBe(1);
  });

  it('keeps function + class nodes when nodeTypes=["function","class"]', () => {
    const filter: FilterState = { directories: [], nodeTypes: ['function', 'class'], edgeTypes: [] };
    const result = filterNodes(allNodes, filter);
    expect(result.length).toBe(2);
  });
});

describe('filterNodes — combined filter', () => {
  it('applies directory AND nodeType filters together', () => {
    const filter: FilterState = { directories: ['src/core'], nodeTypes: ['file'], edgeTypes: [] };
    const result = filterNodes(allNodes, filter);
    const ids = result.map((n) => n.id);
    expect(ids).toContain('src/core/engine.ts');
    expect(ids).toContain('src/core/parser.ts');
    expect(ids).not.toContain('src/core/engine.ts#run');
    expect(ids).not.toContain('src/ui/button.tsx');
  });
});

// ---------------------------------------------------------------------------
// filterEdges
// ---------------------------------------------------------------------------

describe('filterEdges — endpoint check', () => {
  it('keeps edges where both endpoints are in the filtered set', () => {
    const nodeIds = new Set(['src/core/engine.ts', 'src/core/parser.ts']);
    const result = filterEdges(allEdges, nodeIds, emptyFilter);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('engine--import--parser');
  });

  it('removes edges where source is not in filtered set', () => {
    const nodeIds = new Set(['src/core/parser.ts']);
    const result = filterEdges(allEdges, nodeIds, emptyFilter);
    expect(result).toHaveLength(0);
  });

  it('removes edges where target is not in filtered set', () => {
    const nodeIds = new Set(['src/core/engine.ts']);
    const result = filterEdges(allEdges, nodeIds, emptyFilter);
    expect(result).toHaveLength(0);
  });

  it('returns all edges when all nodes present and empty filter', () => {
    const nodeIds = new Set(allEdges.flatMap((e) => [e.source, e.target]));
    const result = filterEdges(allEdges, nodeIds, emptyFilter);
    expect(result).toHaveLength(allEdges.length);
  });

  it('returns empty array when node set is empty', () => {
    const result = filterEdges(allEdges, new Set<string>(), emptyFilter);
    expect(result).toHaveLength(0);
  });
});

describe('filterEdges — edgeType filter', () => {
  const allNodeIds = new Set(allEdges.flatMap((e) => [e.source, e.target]));

  it('keeps only import edges when edgeTypes=["import"]', () => {
    const filter: FilterState = { directories: [], nodeTypes: [], edgeTypes: ['import'] };
    const result = filterEdges(allEdges, allNodeIds, filter);
    expect(result.every((e) => e.type === 'import')).toBe(true);
    expect(result.length).toBe(1);
  });

  it('keeps only call edges when edgeTypes=["call"]', () => {
    const filter: FilterState = { directories: [], nodeTypes: [], edgeTypes: ['call'] };
    const result = filterEdges(allEdges, allNodeIds, filter);
    expect(result.every((e) => e.type === 'call')).toBe(true);
    expect(result.length).toBe(1);
  });

  it('keeps import + call when edgeTypes=["import","call"]', () => {
    const filter: FilterState = { directories: [], nodeTypes: [], edgeTypes: ['import', 'call'] };
    const result = filterEdges(allEdges, allNodeIds, filter);
    expect(result.length).toBe(2);
  });

  it('empty edgeTypes returns all edges (no type filtering)', () => {
    const result = filterEdges(allEdges, allNodeIds, emptyFilter);
    expect(result.length).toBe(allEdges.length);
  });
});

describe('filterEdges — empty input', () => {
  it('returns empty array when edges list is empty', () => {
    const nodeIds = new Set(['A', 'B']);
    expect(filterEdges([], nodeIds, emptyFilter)).toEqual([]);
  });
});
