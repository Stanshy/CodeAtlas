/**
 * Sprint 11 — layout-router unit tests
 *
 * Coverage:
 *   - computeLayout selects the correct registered provider by engine name
 *   - unknown engine falls back to force-directed (no error thrown)
 *   - empty node input does not throw
 *   - registerLayout adds a new provider callable via computeLayout
 *   - provider that throws causes fallback to force-directed
 */

import { describe, it, expect, vi } from 'vitest';
import {
  computeLayout,
  registerLayout,
} from '../src/adapters/layout-router';
import type { LayoutProvider, LayoutInput } from '../src/adapters/layout-router';
import type { LayoutEngine } from '../src/types/graph';

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

function makeEdge(id: string, source: string, target: string) {
  return {
    id,
    source,
    target,
    type: 'neonEdge' as const,
    data: { edgeType: 'import' as const, metadata: {} },
  };
}

// ---------------------------------------------------------------------------
// Register a test provider before tests run
// ---------------------------------------------------------------------------

const SENTINEL_ENGINE = 'test-sentinel-layout' as LayoutEngine;

const testProvider: LayoutProvider = {
  name: SENTINEL_ENGINE,
  compute(input) {
    // Returns nodes with a distinguishing position
    return {
      nodes: input.nodes.map((n, i) => ({
        ...n,
        position: { x: 1000 + i, y: 2000 + i },
      })),
      edges: input.edges,
    };
  },
};

registerLayout(testProvider);

// Also register force-directed as passthrough so fallback works
const forceDirectedProvider: LayoutProvider = {
  name: 'force-directed' as LayoutEngine,
  compute(input) {
    return { nodes: input.nodes, edges: input.edges };
  },
};
registerLayout(forceDirectedProvider);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeLayout — registered engine', () => {
  it('returns nodes from the correct provider', () => {
    const input: LayoutInput = {
      nodes: [makeNode('a'), makeNode('b')],
      edges: [makeEdge('e1', 'a', 'b')],
    };
    const output = computeLayout(SENTINEL_ENGINE, input);
    // Sentinel provider sets x = 1000+i
    expect(output.nodes[0].position.x).toBe(1000);
    expect(output.nodes[1].position.x).toBe(1001);
  });

  it('returns edges unchanged from provider', () => {
    const input: LayoutInput = {
      nodes: [makeNode('a')],
      edges: [makeEdge('e1', 'a', 'b')],
    };
    const output = computeLayout(SENTINEL_ENGINE, input);
    expect(output.edges).toHaveLength(1);
    expect(output.edges[0].id).toBe('e1');
  });

  it('force-directed returns nodes as-is (passthrough)', () => {
    const input: LayoutInput = {
      nodes: [makeNode('x')],
      edges: [],
    };
    const output = computeLayout('force-directed' as LayoutEngine, input);
    expect(output.nodes[0].id).toBe('x');
    expect(output.nodes[0].position).toEqual({ x: 0, y: 0 });
  });
});

describe('computeLayout — unknown engine fallback', () => {
  it('does not throw when engine is unknown', () => {
    const input: LayoutInput = { nodes: [makeNode('a')], edges: [] };
    expect(() => computeLayout('unknown-engine-xyz' as LayoutEngine, input)).not.toThrow();
  });

  it('returns nodes when engine is unknown (fallback passthrough)', () => {
    const input: LayoutInput = { nodes: [makeNode('a')], edges: [] };
    const output = computeLayout('unknown-engine-xyz' as LayoutEngine, input);
    expect(output.nodes).toHaveLength(1);
    expect(output.edges).toHaveLength(0);
  });

  it('warns to console when engine is unknown', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const input: LayoutInput = { nodes: [], edges: [] };
    computeLayout('not-registered' as LayoutEngine, input);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('computeLayout — empty input', () => {
  it('does not throw with empty nodes array', () => {
    const input: LayoutInput = { nodes: [], edges: [] };
    expect(() => computeLayout(SENTINEL_ENGINE, input)).not.toThrow();
  });

  it('returns empty arrays for empty input', () => {
    const input: LayoutInput = { nodes: [], edges: [] };
    const output = computeLayout(SENTINEL_ENGINE, input);
    expect(output.nodes).toHaveLength(0);
    expect(output.edges).toHaveLength(0);
  });
});

describe('computeLayout — provider that throws', () => {
  const THROWING_ENGINE = 'test-throwing-layout' as LayoutEngine;

  registerLayout({
    name: THROWING_ENGINE,
    compute() {
      throw new Error('layout exploded');
    },
  });

  it('does not throw when provider throws', () => {
    const input: LayoutInput = { nodes: [makeNode('a')], edges: [] };
    expect(() => computeLayout(THROWING_ENGINE, input)).not.toThrow();
  });

  it('falls back and returns nodes when provider throws', () => {
    const input: LayoutInput = { nodes: [makeNode('a')], edges: [] };
    const output = computeLayout(THROWING_ENGINE, input);
    expect(output.nodes).toHaveLength(1);
  });
});
