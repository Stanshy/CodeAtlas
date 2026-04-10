/**
 * performance-3d baseline tests
 *
 * Verifies that core 3D data transformation operations remain fast
 * as the graph grows to 200 nodes with corresponding edges.
 *
 * Thresholds (all measured on jsdom without WebGL):
 * - Adjacency map build for 200 nodes: < 50ms
 * - FG3DNode conversion for 200 nodes: < 50ms
 *
 * Manual test notes (require WebGL / browser):
 * - 3D FPS target: >= 30fps at 200 nodes
 * - Mode switch latency (2D ↔ 3D): < 500ms perceptual delay
 *
 * Sprint 4 — T9: Unit + Integration Tests
 */

import { describe, it, expect } from 'vitest';
import type { GraphNode, GraphEdge } from '../src/types/graph';

// ---------------------------------------------------------------------------
// Mock data generators
// ---------------------------------------------------------------------------

function makeMockNodes(count: number): GraphNode[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `src/module-${i}/index.ts`,
    type: 'file' as const,
    label: `index-${i}.ts`,
    filePath: `src/module-${i}/index.ts`,
    metadata: { fileSize: 1024 + i, language: 'typescript', importCount: i % 5 },
  }));
}

function makeMockEdges(nodes: GraphNode[]): GraphEdge[] {
  const edges: GraphEdge[] = [];
  // Each node imports the next (chain pattern) — ensures adjacency map coverage
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      id: `${nodes[i].id}--import--${nodes[i + 1].id}`,
      source: nodes[i].id,
      target: nodes[i + 1].id,
      type: 'import',
      metadata: {},
    });
  }
  return edges;
}

// ---------------------------------------------------------------------------
// Inline helpers (mirrors Graph3DCanvas / three-helpers logic)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Performance tests
// ---------------------------------------------------------------------------

describe('performance baseline — 200 nodes', () => {
  const NODE_COUNT = 200;
  const THRESHOLD_MS = 50;

  it('adjacency map build completes under 50ms', () => {
    const nodes = makeMockNodes(NODE_COUNT);
    const edges = makeMockEdges(nodes);

    const start = performance.now();
    const adj = buildAdjacency(edges);
    const elapsed = performance.now() - start;

    // Correctness check: all node ids should be present in adjacency map
    expect(adj.size).toBe(NODE_COUNT);
    expect(elapsed).toBeLessThan(THRESHOLD_MS);
  });

  it('FG3DNode conversion for 200 nodes completes under 50ms', () => {
    const nodes = makeMockNodes(NODE_COUNT);

    const start = performance.now();
    const fg3dNodes = nodes.map(toFG3DNode);
    const elapsed = performance.now() - start;

    // Correctness check: all nodes converted
    expect(fg3dNodes).toHaveLength(NODE_COUNT);
    expect(elapsed).toBeLessThan(THRESHOLD_MS);
  });

  it('converted nodes have correct depth values', () => {
    const nodes = makeMockNodes(NODE_COUNT);
    const fg3dNodes = nodes.map(toFG3DNode);

    // All nodes have filePath 'src/module-N/index.ts' → 3 segments → depth=2
    fg3dNodes.forEach((n) => {
      expect(n.depth).toBe(2);
    });
  });

  it('converted nodes preserve node type as "file"', () => {
    const nodes = makeMockNodes(NODE_COUNT);
    const fg3dNodes = nodes.map(toFG3DNode);

    fg3dNodes.forEach((n) => {
      expect(n.nodeType).toBe('file');
    });
  });
});

/**
 * Manual test notes (not executable in jsdom):
 *
 * 1. 3D FPS at 200 nodes:
 *    Open browser DevTools → Performance tab → record while rotating graph
 *    Expected: >= 30fps sustained. Particles disabled when nodes > threshold.
 *
 * 2. Mode switch latency (2D ↔ 3D):
 *    Click ViewToggle button and measure time until new canvas is interactive.
 *    Expected: < 500ms perceptual delay.
 *
 * 3. Camera preset fly-to:
 *    Click each preset button and verify smooth camera animation.
 *    Expected: 1000ms transition (threeD.camera.focusDuration).
 */
