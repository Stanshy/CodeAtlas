/**
 * Sprint 11 — dagreLayoutProvider unit tests
 *
 * Coverage:
 *   - Provider returns nodes with position set
 *   - Root nodes (no incoming edges) receive rank 0
 *   - Child nodes receive rank 1 (one level down from root)
 *   - Multi-level graph produces rank 0 / 1 / 2 correctly
 *   - Empty nodes input returns empty arrays without throwing
 *   - Isolated nodes (no edges) receive rank 0
 *   - Nodes in a cycle do not cause infinite loops
 */

import { describe, it, expect } from 'vitest';
import { dagreLayoutProvider } from '../src/adapters/dagre-layout';
import type { LayoutInput } from '../src/adapters/layout-router';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(id: string) {
  return {
    id,
    type: 'neonNode' as const,
    position: { x: 0, y: 0 },
    data: {
      label: id,
      filePath: `src/${id}.ts`,
      nodeType: 'file' as const,
      metadata: {},
    },
  };
}

function makeEdge(source: string, target: string) {
  return {
    id: `${source}--${target}`,
    source,
    target,
    type: 'neonEdge' as const,
    data: { edgeType: 'import' as const, metadata: {} },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('dagreLayoutProvider — nodes receive positions', () => {
  it('every node gets a numeric x position', () => {
    const input: LayoutInput = {
      nodes: [makeNode('a'), makeNode('b')],
      edges: [makeEdge('a', 'b')],
    };
    const output = dagreLayoutProvider.compute(input);
    for (const node of output.nodes) {
      expect(typeof node.position.x).toBe('number');
    }
  });

  it('every node gets a numeric y position', () => {
    const input: LayoutInput = {
      nodes: [makeNode('a'), makeNode('b')],
      edges: [makeEdge('a', 'b')],
    };
    const output = dagreLayoutProvider.compute(input);
    for (const node of output.nodes) {
      expect(typeof node.position.y).toBe('number');
    }
  });

  it('edges are returned unchanged', () => {
    const input: LayoutInput = {
      nodes: [makeNode('a'), makeNode('b')],
      edges: [makeEdge('a', 'b')],
    };
    const output = dagreLayoutProvider.compute(input);
    expect(output.edges).toHaveLength(1);
    expect(output.edges[0].id).toBe('a--b');
  });
});

describe('dagreLayoutProvider — rank assignment', () => {
  it('root node (no incoming edge) gets rank 0 in data', () => {
    const input: LayoutInput = {
      nodes: [makeNode('root'), makeNode('child')],
      edges: [makeEdge('root', 'child')],
    };
    const output = dagreLayoutProvider.compute(input);
    const root = output.nodes.find(n => n.id === 'root')!;
    expect((root.data as { rank?: number }).rank).toBe(0);
  });

  it('direct child receives rank 1', () => {
    const input: LayoutInput = {
      nodes: [makeNode('root'), makeNode('child')],
      edges: [makeEdge('root', 'child')],
    };
    const output = dagreLayoutProvider.compute(input);
    const child = output.nodes.find(n => n.id === 'child')!;
    expect((child.data as { rank?: number }).rank).toBe(1);
  });

  it('grandchild receives rank 2', () => {
    const input: LayoutInput = {
      nodes: [makeNode('a'), makeNode('b'), makeNode('c')],
      edges: [makeEdge('a', 'b'), makeEdge('b', 'c')],
    };
    const output = dagreLayoutProvider.compute(input);
    const grandchild = output.nodes.find(n => n.id === 'c')!;
    expect((grandchild.data as { rank?: number }).rank).toBe(2);
  });

  it('isolated node (no edges, no directoryType) gets fallback rank 3', () => {
    const input: LayoutInput = {
      nodes: [makeNode('isolated')],
      edges: [],
    };
    const output = dagreLayoutProvider.compute(input);
    const node = output.nodes.find(n => n.id === 'isolated')!;
    // Sprint 12: isolated nodes without directoryType get rank 3 (mid-point fallback)
    expect((node.data as { rank?: number }).rank).toBe(3);
  });
});

describe('dagreLayoutProvider — y positions increase by rank', () => {
  it('child node has larger y position than root node', () => {
    const input: LayoutInput = {
      nodes: [makeNode('root'), makeNode('child')],
      edges: [makeEdge('root', 'child')],
    };
    const output = dagreLayoutProvider.compute(input);
    const root = output.nodes.find(n => n.id === 'root')!;
    const child = output.nodes.find(n => n.id === 'child')!;
    expect(child.position.y).toBeGreaterThan(root.position.y);
  });

  it('grandchild has greater y than child', () => {
    const input: LayoutInput = {
      nodes: [makeNode('a'), makeNode('b'), makeNode('c')],
      edges: [makeEdge('a', 'b'), makeEdge('b', 'c')],
    };
    const output = dagreLayoutProvider.compute(input);
    const b = output.nodes.find(n => n.id === 'b')!;
    const c = output.nodes.find(n => n.id === 'c')!;
    expect(c.position.y).toBeGreaterThan(b.position.y);
  });
});

describe('dagreLayoutProvider — empty and edge cases', () => {
  it('does not throw with empty nodes', () => {
    const input: LayoutInput = { nodes: [], edges: [] };
    expect(() => dagreLayoutProvider.compute(input)).not.toThrow();
  });

  it('returns empty arrays for empty input', () => {
    const input: LayoutInput = { nodes: [], edges: [] };
    const output = dagreLayoutProvider.compute(input);
    expect(output.nodes).toHaveLength(0);
    expect(output.edges).toHaveLength(0);
  });

  it('does not throw when edges reference nodes not in the list', () => {
    const input: LayoutInput = {
      nodes: [makeNode('a')],
      edges: [makeEdge('a', 'missing')],
    };
    expect(() => dagreLayoutProvider.compute(input)).not.toThrow();
  });

  it('does not throw with cyclic graph', () => {
    const input: LayoutInput = {
      nodes: [makeNode('x'), makeNode('y')],
      edges: [makeEdge('x', 'y'), makeEdge('y', 'x')],
    };
    expect(() => dagreLayoutProvider.compute(input)).not.toThrow();
  });

  it('returns correct number of nodes for cyclic graph', () => {
    const input: LayoutInput = {
      nodes: [makeNode('x'), makeNode('y')],
      edges: [makeEdge('x', 'y'), makeEdge('y', 'x')],
    };
    const output = dagreLayoutProvider.compute(input);
    expect(output.nodes).toHaveLength(2);
  });
});
