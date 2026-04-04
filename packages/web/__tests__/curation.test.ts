/**
 * Sprint 10 — applyCuration unit tests
 *
 * Tests the smart curation function that hides utility + noise nodes
 * while keeping business-logic, cross-cutting, and infrastructure visible.
 *
 * Covers:
 *   - Role-based visibility (business-logic, cross-cutting, infrastructure, utility, noise)
 *   - pinnedNodeIds override for hidden nodes
 *   - role undefined → treated as infrastructure (visible)
 *   - Edge filtering: only kept when both endpoints are visible
 *   - Safety valve: curation leaves < 5 nodes but >= 5 total → relax to show non-noise
 *   - Empty graph never throws
 *   - All-noise graph with pins → only pinned nodes shown
 */

import { describe, it, expect } from 'vitest';
import { applyCuration } from '../src/adapters/graph-adapter';
import type { GraphNode, GraphEdge } from '../src/types/graph';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeNode(id: string, role?: string, type: 'file' | 'directory' = 'file'): GraphNode {
  return {
    id,
    type,
    label: id.split('/').pop() || id,
    filePath: id,
    metadata: { role: role as any },
  };
}

function makeEdge(source: string, target: string): GraphEdge {
  return {
    id: `${source}--import--${target}`,
    source,
    target,
    type: 'import',
    metadata: {},
  };
}

const NO_PINS = new Set<string>();

// ---------------------------------------------------------------------------
// Role-based visibility
// ---------------------------------------------------------------------------

describe('applyCuration — role-based visibility', () => {
  it('shows business-logic nodes', () => {
    const nodes = [makeNode('src/orders.ts', 'business-logic')];
    const { nodes: result } = applyCuration(nodes, [], NO_PINS);
    expect(result.map(n => n.id)).toContain('src/orders.ts');
  });

  it('shows cross-cutting nodes', () => {
    const nodes = [makeNode('src/logger.ts', 'cross-cutting')];
    const { nodes: result } = applyCuration(nodes, [], NO_PINS);
    expect(result.map(n => n.id)).toContain('src/logger.ts');
  });

  it('shows infrastructure directory nodes with depth <= 2', () => {
    const nodes = [makeNode('packages', 'infrastructure', 'directory')];
    const { nodes: result } = applyCuration(nodes, [], NO_PINS);
    expect(result.map(n => n.id)).toContain('packages');
  });

  it('hides infrastructure file nodes (not pinned)', () => {
    const nodes = [
      makeNode('src/a.ts', 'business-logic'),
      makeNode('src/b.ts', 'business-logic'),
      makeNode('src/c.ts', 'business-logic'),
      makeNode('src/d.ts', 'business-logic'),
      makeNode('src/e.ts', 'business-logic'),
      makeNode('src/db.ts', 'infrastructure'),
    ];
    const { nodes: result } = applyCuration(nodes, [], NO_PINS);
    expect(result.map(n => n.id)).not.toContain('src/db.ts');
  });

  it('hides utility nodes', () => {
    // Build a graph with enough non-utility nodes to avoid safety valve
    const nodes = [
      makeNode('src/a.ts', 'business-logic'),
      makeNode('src/b.ts', 'business-logic'),
      makeNode('src/c.ts', 'business-logic'),
      makeNode('src/d.ts', 'business-logic'),
      makeNode('src/e.ts', 'cross-cutting'),
      makeNode('src/util.ts', 'utility'),
    ];
    const { nodes: result } = applyCuration(nodes, [], NO_PINS);
    expect(result.map(n => n.id)).not.toContain('src/util.ts');
  });

  it('hides noise nodes', () => {
    // Build a graph with enough non-noise nodes to avoid safety valve
    const nodes = [
      makeNode('src/a.ts', 'business-logic'),
      makeNode('src/b.ts', 'business-logic'),
      makeNode('src/c.ts', 'business-logic'),
      makeNode('src/d.ts', 'business-logic'),
      makeNode('src/e.ts', 'cross-cutting'),
      makeNode('src/noise.ts', 'noise'),
    ];
    const { nodes: result } = applyCuration(nodes, [], NO_PINS);
    expect(result.map(n => n.id)).not.toContain('src/noise.ts');
  });

  it('treats undefined role as infrastructure (hidden for files, shown for shallow directories)', () => {
    // File with undefined role → treated as infrastructure file → hidden
    const fileNode = makeNode('src/unknown.ts', undefined);
    delete (fileNode.metadata as any).role;
    const { nodes: fileResult } = applyCuration([fileNode], [], NO_PINS);
    expect(fileResult.map(n => n.id)).not.toContain('src/unknown.ts');

    // Directory with undefined role → treated as infrastructure dir (depth 1) → shown
    const dirNode = makeNode('packages', undefined, 'directory');
    delete (dirNode.metadata as any).role;
    const { nodes: dirResult } = applyCuration([dirNode], [], NO_PINS);
    expect(dirResult.map(n => n.id)).toContain('packages');
  });
});

// ---------------------------------------------------------------------------
// pinnedNodeIds override
// ---------------------------------------------------------------------------

describe('applyCuration — pinnedNodeIds override', () => {
  it('pinned utility node appears in visible set', () => {
    const nodes = [
      makeNode('src/a.ts', 'business-logic'),
      makeNode('src/b.ts', 'business-logic'),
      makeNode('src/c.ts', 'business-logic'),
      makeNode('src/d.ts', 'business-logic'),
      makeNode('src/e.ts', 'cross-cutting'),
      makeNode('src/util.ts', 'utility'),
    ];
    const pins = new Set(['src/util.ts']);
    const { nodes: result } = applyCuration(nodes, [], pins);
    expect(result.map(n => n.id)).toContain('src/util.ts');
  });

  it('pinned noise node appears in visible set', () => {
    const nodes = [
      makeNode('src/a.ts', 'business-logic'),
      makeNode('src/b.ts', 'business-logic'),
      makeNode('src/c.ts', 'business-logic'),
      makeNode('src/d.ts', 'business-logic'),
      makeNode('src/e.ts', 'cross-cutting'),
      makeNode('src/noise.ts', 'noise'),
    ];
    const pins = new Set(['src/noise.ts']);
    const { nodes: result } = applyCuration(nodes, [], pins);
    expect(result.map(n => n.id)).toContain('src/noise.ts');
  });

  it('unpinned utility node remains hidden even if other nodes are pinned', () => {
    const nodes = [
      makeNode('src/a.ts', 'business-logic'),
      makeNode('src/b.ts', 'business-logic'),
      makeNode('src/c.ts', 'business-logic'),
      makeNode('src/d.ts', 'business-logic'),
      makeNode('src/e.ts', 'cross-cutting'),
      makeNode('src/util.ts', 'utility'),
      makeNode('src/noise.ts', 'noise'),
    ];
    // Only pin noise — utility should still be hidden
    const pins = new Set(['src/noise.ts']);
    const { nodes: result } = applyCuration(nodes, [], pins);
    expect(result.map(n => n.id)).not.toContain('src/util.ts');
  });
});

// ---------------------------------------------------------------------------
// Edge filtering
// ---------------------------------------------------------------------------

describe('applyCuration — edge filtering', () => {
  it('keeps edge when both source and target are visible', () => {
    const nodes = [
      makeNode('src/a.ts', 'business-logic'),
      makeNode('src/b.ts', 'cross-cutting'),
    ];
    const edges = [makeEdge('src/a.ts', 'src/b.ts')];
    const { edges: result } = applyCuration(nodes, edges, NO_PINS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('src/a.ts--import--src/b.ts');
  });

  it('removes edge when source is a hidden utility node', () => {
    const nodes = [
      makeNode('src/a.ts', 'business-logic'),
      makeNode('src/b.ts', 'business-logic'),
      makeNode('src/c.ts', 'business-logic'),
      makeNode('src/d.ts', 'business-logic'),
      makeNode('src/e.ts', 'cross-cutting'),
      makeNode('src/util.ts', 'utility'),
    ];
    const edges = [makeEdge('src/util.ts', 'src/a.ts')];
    const { edges: result } = applyCuration(nodes, edges, NO_PINS);
    expect(result).toHaveLength(0);
  });

  it('removes edge when target is a hidden noise node', () => {
    const nodes = [
      makeNode('src/a.ts', 'business-logic'),
      makeNode('src/b.ts', 'business-logic'),
      makeNode('src/c.ts', 'business-logic'),
      makeNode('src/d.ts', 'business-logic'),
      makeNode('src/e.ts', 'cross-cutting'),
      makeNode('src/noise.ts', 'noise'),
    ];
    const edges = [makeEdge('src/a.ts', 'src/noise.ts')];
    const { edges: result } = applyCuration(nodes, edges, NO_PINS);
    expect(result).toHaveLength(0);
  });

  it('keeps edge when a hidden node is pinned (both endpoints visible)', () => {
    const nodes = [
      makeNode('src/a.ts', 'business-logic'),
      makeNode('src/b.ts', 'business-logic'),
      makeNode('src/c.ts', 'business-logic'),
      makeNode('src/d.ts', 'business-logic'),
      makeNode('src/e.ts', 'cross-cutting'),
      makeNode('src/util.ts', 'utility'),
    ];
    const edges = [makeEdge('src/a.ts', 'src/util.ts')];
    const pins = new Set(['src/util.ts']);
    const { edges: result } = applyCuration(nodes, edges, pins);
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Safety valve: < 5 visible nodes, total >= 5
// ---------------------------------------------------------------------------

describe('applyCuration — safety valve', () => {
  it('relaxes visibility when curation leaves < 5 nodes out of >= 5 total', () => {
    // All utility → normally 0 visible; safety valve should kick in and show them
    const nodes = [
      makeNode('src/a.ts', 'utility'),
      makeNode('src/b.ts', 'utility'),
      makeNode('src/c.ts', 'utility'),
      makeNode('src/d.ts', 'utility'),
      makeNode('src/e.ts', 'utility'),
    ];
    const { nodes: result } = applyCuration(nodes, [], NO_PINS);
    // All 5 utility nodes should be visible (safety valve)
    expect(result).toHaveLength(5);
  });

  it('safety valve still hides noise nodes (only relaxes utility)', () => {
    const nodes = [
      makeNode('src/a.ts', 'utility'),
      makeNode('src/b.ts', 'utility'),
      makeNode('src/c.ts', 'utility'),
      makeNode('src/d.ts', 'utility'),
      makeNode('src/e.ts', 'noise'),
    ];
    const { nodes: result } = applyCuration(nodes, [], NO_PINS);
    expect(result.map(n => n.id)).not.toContain('src/e.ts');
  });

  it('safety valve shows pinned noise nodes', () => {
    const nodes = [
      makeNode('src/a.ts', 'utility'),
      makeNode('src/b.ts', 'utility'),
      makeNode('src/c.ts', 'utility'),
      makeNode('src/d.ts', 'utility'),
      makeNode('src/e.ts', 'noise'),
    ];
    const pins = new Set(['src/e.ts']);
    const { nodes: result } = applyCuration(nodes, [], pins);
    expect(result.map(n => n.id)).toContain('src/e.ts');
  });

  it('safety valve filters edges to only visible relaxed nodes', () => {
    const nodes = [
      makeNode('src/a.ts', 'utility'),
      makeNode('src/b.ts', 'utility'),
      makeNode('src/c.ts', 'utility'),
      makeNode('src/d.ts', 'utility'),
      makeNode('src/e.ts', 'utility'),
    ];
    const edges = [
      makeEdge('src/a.ts', 'src/b.ts'),
      makeEdge('src/c.ts', 'src/d.ts'),
    ];
    const { edges: result } = applyCuration(nodes, edges, NO_PINS);
    expect(result).toHaveLength(2);
  });

  it('does not trigger safety valve when fewer than 5 nodes total', () => {
    // 3 utility nodes total → safety valve condition requires nodes.length >= 5
    const nodes = [
      makeNode('src/a.ts', 'utility'),
      makeNode('src/b.ts', 'utility'),
      makeNode('src/c.ts', 'utility'),
    ];
    // Safety valve: nodes.length < 5, so it won't trigger; all utility stays hidden
    const { nodes: result } = applyCuration(nodes, [], NO_PINS);
    // visibleNodes = 0, but nodes.length (3) < 5 so safety valve does NOT fire
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('applyCuration — edge cases', () => {
  it('returns empty nodes and edges for empty graph without throwing', () => {
    expect(() => applyCuration([], [], NO_PINS)).not.toThrow();
    const { nodes, edges } = applyCuration([], [], NO_PINS);
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });

  it('all noise with one pin → only pinned node shown', () => {
    const nodes = [
      makeNode('src/a.ts', 'noise'),
      makeNode('src/b.ts', 'noise'),
      makeNode('src/c.ts', 'noise'),
      makeNode('src/d.ts', 'noise'),
      makeNode('src/e.ts', 'noise'),
    ];
    const pins = new Set(['src/a.ts']);
    const { nodes: result } = applyCuration(nodes, [], pins);
    expect(result.map(n => n.id)).toContain('src/a.ts');
    expect(result.map(n => n.id)).not.toContain('src/b.ts');
    expect(result.map(n => n.id)).not.toContain('src/c.ts');
  });

  it('returns empty edges array when no edges provided', () => {
    const nodes = [makeNode('src/a.ts', 'business-logic')];
    const { edges } = applyCuration(nodes, [], NO_PINS);
    expect(edges).toHaveLength(0);
  });

  it('keeps all visible nodes when none need filtering', () => {
    const nodes = [
      makeNode('src/a.ts', 'business-logic'),
      makeNode('src/b.ts', 'cross-cutting'),
      makeNode('packages', 'infrastructure', 'directory'),
    ];
    const { nodes: result } = applyCuration(nodes, [], NO_PINS);
    expect(result).toHaveLength(3);
  });
});
