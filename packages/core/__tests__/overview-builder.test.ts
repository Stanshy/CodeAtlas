/**
 * Sprint 8 — overview-builder unit tests
 *
 * Tests extractStructureInfo() and buildOverviewPrompt() in src/ai/overview-builder.ts.
 *
 * Coverage:
 *   - extractStructureInfo: totalFiles / totalFunctions / totalClasses counts
 *   - topModules: sorted by dependencyCount desc, capped at 20
 *   - moduleRelationships: excludes call edges, groups by source→target, sorted by edgeCount desc, capped at 30
 *   - buildOverviewPrompt: no source code in output (privacy)
 *   - buildOverviewPrompt: contains statistical numbers
 *   - edge cases: empty graph
 */

import { describe, it, expect } from 'vitest';
import {
  extractStructureInfo,
  buildOverviewPrompt,
} from '../src/ai/overview-builder.js';
import type { AnalysisResult } from '../src/types.js';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeResult(overrides: Partial<AnalysisResult['graph']> = {}): AnalysisResult {
  return {
    version: '0.1.0',
    projectPath: '/test',
    analyzedAt: '2026-03-31T00:00:00Z',
    stats: {
      totalFiles: 0,
      analyzedFiles: 0,
      skippedFiles: 0,
      failedFiles: 0,
      totalNodes: 0,
      totalEdges: 0,
      analysisDurationMs: 0,
    },
    graph: {
      nodes: [],
      edges: [],
      ...overrides,
    },
    errors: [],
  };
}

const fileA = {
  id: 'src/a.ts',
  type: 'file' as const,
  label: 'a.ts',
  filePath: 'src/a.ts',
  metadata: { dependencyCount: 10, importCount: 3, exportCount: 5 },
};

const fileB = {
  id: 'src/b.ts',
  type: 'file' as const,
  label: 'b.ts',
  filePath: 'src/b.ts',
  metadata: { dependencyCount: 2, importCount: 1, exportCount: 1 },
};

const fileC = {
  id: 'src/c.ts',
  type: 'file' as const,
  label: 'c.ts',
  filePath: 'src/c.ts',
  metadata: { dependencyCount: 7, importCount: 2, exportCount: 3 },
};

const fnNode = {
  id: 'src/a.ts#fn1',
  type: 'function' as const,
  label: 'fn1',
  filePath: 'src/a.ts',
  metadata: { parentFileId: 'src/a.ts' },
};

const fnNode2 = {
  id: 'src/b.ts#fn2',
  type: 'function' as const,
  label: 'fn2',
  filePath: 'src/b.ts',
  metadata: { parentFileId: 'src/b.ts' },
};

const classNode = {
  id: 'src/c.ts#MyClass',
  type: 'class' as const,
  label: 'MyClass',
  filePath: 'src/c.ts',
  metadata: { parentFileId: 'src/c.ts' },
};

const importEdgeAB = {
  id: 'a--import--b',
  source: 'src/a.ts',
  target: 'src/b.ts',
  type: 'import' as const,
  metadata: {},
};

const importEdgeAC = {
  id: 'a--import--c',
  source: 'src/a.ts',
  target: 'src/c.ts',
  type: 'import' as const,
  metadata: {},
};

const callEdge = {
  id: 'fn1--call--fn2',
  source: 'src/a.ts#fn1',
  target: 'src/b.ts#fn2',
  type: 'call' as const,
  metadata: {},
};

const dataFlowEdge = {
  id: 'a--data-flow--c',
  source: 'src/a.ts',
  target: 'src/c.ts',
  type: 'data-flow' as const,
  metadata: {},
};

// ---------------------------------------------------------------------------
// extractStructureInfo — counts
// ---------------------------------------------------------------------------

describe('extractStructureInfo — node counts', () => {
  it('counts file nodes correctly', () => {
    const result = makeResult({ nodes: [fileA, fileB, fileC, fnNode, classNode], edges: [] });
    const info = extractStructureInfo(result);
    expect(info.totalFiles).toBe(3);
  });

  it('counts function nodes correctly', () => {
    const result = makeResult({ nodes: [fileA, fnNode, fnNode2], edges: [] });
    const info = extractStructureInfo(result);
    expect(info.totalFunctions).toBe(2);
  });

  it('counts class nodes correctly', () => {
    const result = makeResult({ nodes: [fileA, classNode], edges: [] });
    const info = extractStructureInfo(result);
    expect(info.totalClasses).toBe(1);
  });

  it('returns zeros for empty graph', () => {
    const info = extractStructureInfo(makeResult());
    expect(info.totalFiles).toBe(0);
    expect(info.totalFunctions).toBe(0);
    expect(info.totalClasses).toBe(0);
  });

  it('directory nodes are not counted as files', () => {
    const dirNode = { id: 'src', type: 'directory' as const, label: 'src', filePath: 'src', metadata: {} };
    const result = makeResult({ nodes: [fileA, dirNode], edges: [] });
    const info = extractStructureInfo(result);
    expect(info.totalFiles).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// extractStructureInfo — topModules
// ---------------------------------------------------------------------------

describe('extractStructureInfo — topModules', () => {
  it('sorts topModules by dependencyCount descending', () => {
    const result = makeResult({ nodes: [fileA, fileB, fileC], edges: [] });
    const info = extractStructureInfo(result);
    expect(info.topModules[0].path).toBe('src/a.ts');  // dependencyCount 10
    expect(info.topModules[1].path).toBe('src/c.ts');  // dependencyCount 7
    expect(info.topModules[2].path).toBe('src/b.ts');  // dependencyCount 2
  });

  it('topModules contains correct counts per module', () => {
    const result = makeResult({ nodes: [fileA], edges: [] });
    const info = extractStructureInfo(result);
    expect(info.topModules[0].dependencyCount).toBe(10);
    expect(info.topModules[0].importCount).toBe(3);
    expect(info.topModules[0].exportCount).toBe(5);
  });

  it('caps topModules at 20', () => {
    // Create 25 file nodes
    const manyFiles = Array.from({ length: 25 }, (_, i) => ({
      id: `src/file${i}.ts`,
      type: 'file' as const,
      label: `file${i}.ts`,
      filePath: `src/file${i}.ts`,
      metadata: { dependencyCount: 25 - i },
    }));
    const result = makeResult({ nodes: manyFiles, edges: [] });
    const info = extractStructureInfo(result);
    expect(info.topModules.length).toBe(20);
  });

  it('handles missing dependencyCount (defaults to 0)', () => {
    const nodeNoDeps = {
      id: 'src/z.ts',
      type: 'file' as const,
      label: 'z.ts',
      filePath: 'src/z.ts',
      metadata: {},
    };
    const result = makeResult({ nodes: [nodeNoDeps, fileA], edges: [] });
    const info = extractStructureInfo(result);
    // fileA has dependencyCount=10, nodeNoDeps has 0; fileA should be first
    expect(info.topModules[0].path).toBe('src/a.ts');
    expect(info.topModules[1].dependencyCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// extractStructureInfo — moduleRelationships
// ---------------------------------------------------------------------------

describe('extractStructureInfo — moduleRelationships', () => {
  it('includes import edges between file nodes', () => {
    const result = makeResult({ nodes: [fileA, fileB], edges: [importEdgeAB] });
    const info = extractStructureInfo(result);
    expect(info.moduleRelationships.some((r) => r.source === 'src/a.ts' && r.target === 'src/b.ts')).toBe(true);
  });

  it('excludes call edges', () => {
    const result = makeResult({ nodes: [fileA, fileB, fnNode, fnNode2], edges: [callEdge] });
    const info = extractStructureInfo(result);
    expect(info.moduleRelationships).toHaveLength(0);
  });

  it('includes data-flow edges between file nodes', () => {
    const result = makeResult({ nodes: [fileA, fileC], edges: [dataFlowEdge] });
    const info = extractStructureInfo(result);
    expect(info.moduleRelationships.some((r) => r.source === 'src/a.ts' && r.target === 'src/c.ts')).toBe(true);
  });

  it('groups multiple edges between same pair and counts them', () => {
    const secondImport = { ...importEdgeAC, id: 'a--import--c-2' };
    const result = makeResult({ nodes: [fileA, fileC], edges: [importEdgeAC, secondImport] });
    const info = extractStructureInfo(result);
    const rel = info.moduleRelationships.find((r) => r.source === 'src/a.ts' && r.target === 'src/c.ts');
    expect(rel?.edgeCount).toBe(2);
  });

  it('sorts moduleRelationships by edgeCount descending', () => {
    const dupe = { ...importEdgeAC, id: 'a--import--c-2' };
    const result = makeResult({ nodes: [fileA, fileB, fileC], edges: [importEdgeAB, importEdgeAC, dupe] });
    const info = extractStructureInfo(result);
    // a→c has 2 edges, a→b has 1 edge
    expect(info.moduleRelationships[0].edgeCount).toBeGreaterThanOrEqual(info.moduleRelationships[1]?.edgeCount ?? 0);
  });

  it('caps moduleRelationships at 30', () => {
    // Create 35 file pairs with import edges
    const manyNodes = Array.from({ length: 36 }, (_, i) => ({
      id: `src/file${i}.ts`,
      type: 'file' as const,
      label: `file${i}.ts`,
      filePath: `src/file${i}.ts`,
      metadata: {},
    }));
    const manyEdges = Array.from({ length: 35 }, (_, i) => ({
      id: `edge${i}`,
      source: `src/file${i}.ts`,
      target: `src/file${i + 1}.ts`,
      type: 'import' as const,
      metadata: {},
    }));
    const result = makeResult({ nodes: manyNodes, edges: manyEdges });
    const info = extractStructureInfo(result);
    expect(info.moduleRelationships.length).toBeLessThanOrEqual(30);
  });

  it('excludes edges where source or target is not a file node', () => {
    // call edge between function nodes — should not appear
    const result = makeResult({ nodes: [fileA, fnNode, fnNode2], edges: [callEdge] });
    const info = extractStructureInfo(result);
    expect(info.moduleRelationships).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// buildOverviewPrompt — privacy + content
// ---------------------------------------------------------------------------

describe('buildOverviewPrompt — privacy', () => {
  it('does not contain raw source code keywords', () => {
    const info = extractStructureInfo(
      makeResult({ nodes: [fileA, fileB, fnNode, classNode], edges: [importEdgeAB] }),
    );
    const prompt = buildOverviewPrompt(info);
    // No source code should be included — check for absence of typical TS code
    expect(prompt).not.toContain('import {');
    expect(prompt).not.toContain('export default');
    expect(prompt).not.toContain('const ');
    expect(prompt).not.toContain('function ');
  });
});

describe('buildOverviewPrompt — content', () => {
  it('includes total file count', () => {
    const info = extractStructureInfo(makeResult({ nodes: [fileA, fileB], edges: [] }));
    const prompt = buildOverviewPrompt(info);
    expect(prompt).toContain('2');
  });

  it('includes module path in prompt', () => {
    const info = extractStructureInfo(makeResult({ nodes: [fileA], edges: [] }));
    const prompt = buildOverviewPrompt(info);
    expect(prompt).toContain('src/a.ts');
  });

  it('is a non-empty string', () => {
    const info = extractStructureInfo(makeResult());
    const prompt = buildOverviewPrompt(info);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('contains instructions section', () => {
    const info = extractStructureInfo(makeResult());
    const prompt = buildOverviewPrompt(info);
    expect(prompt).toContain('Instructions');
  });

  it('shows (none) when topModules is empty', () => {
    const info = extractStructureInfo(makeResult());
    const prompt = buildOverviewPrompt(info);
    expect(prompt).toContain('(none)');
  });
});

describe('buildOverviewPrompt — empty graph edge case', () => {
  it('does not throw on empty graph', () => {
    const info = extractStructureInfo(makeResult());
    expect(() => buildOverviewPrompt(info)).not.toThrow();
  });

  it('shows zero counts for empty graph', () => {
    const info = extractStructureInfo(makeResult());
    const prompt = buildOverviewPrompt(info);
    expect(prompt).toContain('Total files: 0');
    expect(prompt).toContain('Total functions: 0');
    expect(prompt).toContain('Total classes: 0');
  });
});
