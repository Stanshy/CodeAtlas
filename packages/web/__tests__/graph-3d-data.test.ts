/**
 * graph-3d-data unit tests
 *
 * Tests pure helper functions extracted from Graph3DCanvas:
 * - hexToRgba: hex colour + alpha → rgba string
 * - resolveLinkEndId: NodeObject | string | number → string id
 *
 * Tests GraphNode → FG3DNode-equivalent transformation logic:
 * - id, name, nodeType, depth derivation from filePath
 *
 * Tests GraphEdge → FG3DLink-equivalent transformation:
 * - source, target, edgeType preservation
 *
 * Tests adjacency map construction correctness.
 *
 * Sprint 4 — T9: Unit + Integration Tests
 */

import { describe, it, expect } from 'vitest';
import { hexToRgba, resolveLinkEndId } from '../src/utils/three-helpers';
import type { GraphNode, GraphEdge } from '../src/types/graph';

// ---------------------------------------------------------------------------
// hexToRgba
// ---------------------------------------------------------------------------

describe('hexToRgba', () => {
  it('converts pure red #ff0000 at full opacity', () => {
    expect(hexToRgba('#ff0000', 1)).toBe('rgba(255,0,0,1)');
  });

  it('converts pure green #00ff00 at half opacity', () => {
    expect(hexToRgba('#00ff00', 0.5)).toBe('rgba(0,255,0,0.5)');
  });

  it('converts pure blue #0000ff at zero opacity', () => {
    expect(hexToRgba('#0000ff', 0)).toBe('rgba(0,0,255,0)');
  });

  it('converts a mixed colour #1a2b3c', () => {
    // 0x1a=26, 0x2b=43, 0x3c=60
    expect(hexToRgba('#1a2b3c', 0.8)).toBe('rgba(26,43,60,0.8)');
  });

  it('converts white #ffffff', () => {
    expect(hexToRgba('#ffffff', 1)).toBe('rgba(255,255,255,1)');
  });

  it('converts black #000000', () => {
    expect(hexToRgba('#000000', 0.3)).toBe('rgba(0,0,0,0.3)');
  });
});

// ---------------------------------------------------------------------------
// resolveLinkEndId
// ---------------------------------------------------------------------------

describe('resolveLinkEndId', () => {
  it('returns a string endpoint unchanged', () => {
    expect(resolveLinkEndId('src/index.ts')).toBe('src/index.ts');
  });

  it('converts a numeric endpoint to a string', () => {
    expect(resolveLinkEndId(42)).toBe('42');
  });

  it('extracts id from a NodeObject with string id', () => {
    const node = { id: 'src/utils/helper.ts' };
    expect(resolveLinkEndId(node)).toBe('src/utils/helper.ts');
  });

  it('extracts id from a NodeObject with numeric id', () => {
    const node = { id: 7 };
    expect(resolveLinkEndId(node)).toBe('7');
  });

  it('returns empty string for a NodeObject with no id', () => {
    const node = {};
    expect(resolveLinkEndId(node)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(resolveLinkEndId(undefined)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// GraphNode → FG3DNode field mapping
// ---------------------------------------------------------------------------

// Replicate the transformation logic from Graph3DCanvas.fg3dNodes useMemo
function toFG3DNode(n: GraphNode) {
  const segments = n.filePath.replace(/\\/g, '/').split('/').filter(Boolean);
  const depth = Math.max(0, segments.length - 1);
  return {
    id: n.id,
    name: n.label,
    nodeType: (n.type === 'directory' ? 'directory' : 'file') as 'file' | 'directory',
    depth,
    filePath: n.filePath,
    metadata: n.metadata,
  };
}

describe('GraphNode → FG3DNode transformation', () => {
  const fileNode: GraphNode = {
    id: 'src/index.ts',
    type: 'file',
    label: 'index.ts',
    filePath: 'src/index.ts',
    metadata: { fileSize: 512, language: 'typescript' },
  };

  const deepFileNode: GraphNode = {
    id: 'src/utils/helper.ts',
    type: 'file',
    label: 'helper.ts',
    filePath: 'src/utils/helper.ts',
    metadata: {},
  };

  const dirNode: GraphNode = {
    id: 'src',
    type: 'directory',
    label: 'src',
    filePath: 'src',
    metadata: {},
  };

  const rootFile: GraphNode = {
    id: 'index.ts',
    type: 'file',
    label: 'index.ts',
    filePath: 'index.ts',
    metadata: {},
  };

  it('maps id correctly', () => {
    expect(toFG3DNode(fileNode).id).toBe('src/index.ts');
  });

  it('maps name from label', () => {
    expect(toFG3DNode(fileNode).name).toBe('index.ts');
  });

  it('maps nodeType to "file" for file nodes', () => {
    expect(toFG3DNode(fileNode).nodeType).toBe('file');
  });

  it('maps nodeType to "directory" for directory nodes', () => {
    expect(toFG3DNode(dirNode).nodeType).toBe('directory');
  });

  it('computes depth=1 for src/index.ts (one directory segment)', () => {
    // filePath 'src/index.ts' → segments ['src','index.ts'] → depth = 2-1 = 1
    expect(toFG3DNode(fileNode).depth).toBe(1);
  });

  it('computes depth=2 for src/utils/helper.ts (two directory segments)', () => {
    // filePath 'src/utils/helper.ts' → segments ['src','utils','helper.ts'] → depth = 3-1 = 2
    expect(toFG3DNode(deepFileNode).depth).toBe(2);
  });

  it('computes depth=0 for root-level file index.ts', () => {
    // filePath 'index.ts' → segments ['index.ts'] → depth = 1-1 = 0
    expect(toFG3DNode(rootFile).depth).toBe(0);
  });

  it('preserves filePath', () => {
    expect(toFG3DNode(fileNode).filePath).toBe('src/index.ts');
  });

  it('preserves metadata', () => {
    expect(toFG3DNode(fileNode).metadata).toEqual({ fileSize: 512, language: 'typescript' });
  });
});

// ---------------------------------------------------------------------------
// GraphEdge → FG3DLink field mapping
// ---------------------------------------------------------------------------

function toFG3DLink(e: GraphEdge) {
  return {
    source: e.source,
    target: e.target,
    edgeType: e.type,
  };
}

describe('GraphEdge → FG3DLink transformation', () => {
  const importEdge: GraphEdge = {
    id: 'src/app.ts--import--src/utils/helper.ts',
    source: 'src/app.ts',
    target: 'src/utils/helper.ts',
    type: 'import',
    metadata: { importedSymbols: ['formatDate'] },
  };

  const dataFlowEdge: GraphEdge = {
    id: 'a--data-flow--b',
    source: 'a',
    target: 'b',
    type: 'data-flow',
    metadata: {},
  };

  it('maps source correctly', () => {
    expect(toFG3DLink(importEdge).source).toBe('src/app.ts');
  });

  it('maps target correctly', () => {
    expect(toFG3DLink(importEdge).target).toBe('src/utils/helper.ts');
  });

  it('maps edgeType from type for import edge', () => {
    expect(toFG3DLink(importEdge).edgeType).toBe('import');
  });

  it('maps edgeType from type for data-flow edge', () => {
    expect(toFG3DLink(dataFlowEdge).edgeType).toBe('data-flow');
  });
});

// ---------------------------------------------------------------------------
// Adjacency map construction
// ---------------------------------------------------------------------------

function buildAdjacency(edges: GraphEdge[]): Map<string, Set<string>> {
  const connectedNodes = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!connectedNodes.has(edge.source)) connectedNodes.set(edge.source, new Set());
    if (!connectedNodes.has(edge.target)) connectedNodes.set(edge.target, new Set());
    connectedNodes.get(edge.source)!.add(edge.target);
    connectedNodes.get(edge.target)!.add(edge.source);
  }
  return connectedNodes;
}

describe('adjacency map construction', () => {
  const edges: GraphEdge[] = [
    { id: 'a--import--b', source: 'a', target: 'b', type: 'import', metadata: {} },
    { id: 'b--import--c', source: 'b', target: 'c', type: 'import', metadata: {} },
    { id: 'd--import--e', source: 'd', target: 'e', type: 'import', metadata: {} },
  ];

  it('creates entries for both source and target of each edge', () => {
    const adj = buildAdjacency(edges);
    expect(adj.has('a')).toBe(true);
    expect(adj.has('b')).toBe(true);
    expect(adj.has('c')).toBe(true);
    expect(adj.has('d')).toBe(true);
    expect(adj.has('e')).toBe(true);
  });

  it('a is connected to b', () => {
    const adj = buildAdjacency(edges);
    expect(adj.get('a')!.has('b')).toBe(true);
  });

  it('b is connected to a (bidirectional)', () => {
    const adj = buildAdjacency(edges);
    expect(adj.get('b')!.has('a')).toBe(true);
  });

  it('b is also connected to c', () => {
    const adj = buildAdjacency(edges);
    expect(adj.get('b')!.has('c')).toBe(true);
  });

  it('d and e are not connected to a/b/c', () => {
    const adj = buildAdjacency(edges);
    expect(adj.get('d')!.has('a')).toBe(false);
    expect(adj.get('e')!.has('b')).toBe(false);
  });

  it('returns empty map for empty edges', () => {
    expect(buildAdjacency([])).toEqual(new Map());
  });
});
