/**
 * layout utility tests
 *
 * Tests: zoom threshold switching, flat projects, deep nesting,
 * edge filtering by visible nodes.
 */

import { describe, it, expect } from 'vitest';
import {
  getLayerLevel,
  filterNodesByLayer,
  filterEdgesByVisibleNodes,
  getDirectoryDepth,
  ZOOM_THRESHOLD,
} from '../src/utils/layout';
import type { Node } from '@xyflow/react';
import type { NeonNodeData } from '../src/adapters/graph-adapter';

function makeNode(id: string, nodeType: 'file' | 'directory', parentId?: string): Node<NeonNodeData> {
  return {
    id,
    type: nodeType === 'directory' ? 'directoryNode' : 'neonNode',
    position: { x: 0, y: 0 },
    data: {
      label: id.split('/').pop() ?? id,
      filePath: id,
      nodeType,
      metadata: {},
    },
    ...(parentId ? { parentId } : {}),
  };
}

const dirSrc = makeNode('src', 'directory');
const dirUtils = makeNode('src/utils', 'directory');
const fileA = makeNode('src/app.ts', 'file', 'src');
const fileB = makeNode('src/utils/helper.ts', 'file', 'src/utils');
const rootFile = makeNode('index.ts', 'file');

const allNodes = [dirSrc, dirUtils, fileA, fileB, rootFile];

describe('getLayerLevel', () => {
  it('returns directory level below threshold', () => {
    expect(getLayerLevel(0.3)).toBe('directory');
    expect(getLayerLevel(0.49)).toBe('directory');
  });

  it('returns file level at or above threshold', () => {
    expect(getLayerLevel(ZOOM_THRESHOLD)).toBe('file');
    expect(getLayerLevel(0.8)).toBe('file');
    expect(getLayerLevel(1.5)).toBe('file');
  });
});

describe('filterNodesByLayer', () => {
  it('shows all nodes at file level', () => {
    const result = filterNodesByLayer(allNodes, 'file');
    expect(result).toHaveLength(allNodes.length);
  });

  it('shows only directories and root files at directory level', () => {
    const result = filterNodesByLayer(allNodes, 'directory');
    // Should include: dirSrc (depth 1), rootFile (no parentId)
    // Should exclude: dirUtils (depth 2), fileA (has parentId), fileB (has parentId)
    const ids = result.map((n) => n.id);
    expect(ids).toContain('src');
    expect(ids).toContain('index.ts');
    expect(ids).not.toContain('src/utils/helper.ts');
    expect(ids).not.toContain('src/app.ts');
  });

  it('shows all files for flat project (no directories)', () => {
    const flatNodes = [
      makeNode('a.ts', 'file'),
      makeNode('b.ts', 'file'),
    ];
    const result = filterNodesByLayer(flatNodes, 'directory');
    expect(result).toHaveLength(2);
  });

  it('handles empty nodes array', () => {
    expect(filterNodesByLayer([], 'directory')).toEqual([]);
    expect(filterNodesByLayer([], 'file')).toEqual([]);
  });
});

describe('getDirectoryDepth', () => {
  it('returns 1 for top-level directory', () => {
    expect(getDirectoryDepth('src')).toBe(1);
  });

  it('returns 2 for nested directory', () => {
    expect(getDirectoryDepth('src/utils')).toBe(2);
  });

  it('returns 3 for deeply nested directory', () => {
    expect(getDirectoryDepth('src/utils/helpers')).toBe(3);
  });

  it('returns 0 for empty path', () => {
    expect(getDirectoryDepth('')).toBe(0);
  });
});

describe('filterEdgesByVisibleNodes', () => {
  const edges = [
    { source: 'a', target: 'b' },
    { source: 'b', target: 'c' },
    { source: 'c', target: 'd' },
  ];

  it('keeps edges where both endpoints are visible', () => {
    const visible = new Set(['a', 'b', 'c']);
    const result = filterEdgesByVisibleNodes(edges, visible);
    expect(result).toHaveLength(2);
  });

  it('filters edges with invisible source or target', () => {
    const visible = new Set(['a', 'b']);
    const result = filterEdgesByVisibleNodes(edges, visible);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe('a');
    expect(result[0].target).toBe('b');
  });

  it('returns empty for no visible nodes', () => {
    expect(filterEdgesByVisibleNodes(edges, new Set())).toEqual([]);
  });
});
