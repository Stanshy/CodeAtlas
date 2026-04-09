/**
 * Sprint 15.1 — graph-builder methodRole integration tests
 *
 * Verifies that buildFunctionGraph() enriches every function node with
 * `metadata.methodRole` and `metadata.roleConfidence` as added in Sprint 15.1.
 *
 * Strategy:
 *   - Empty-input smoke tests (no file I/O needed)
 *   - Real fixture tests using packages/core/__tests__/fixtures/function-level/
 *     (parsed on-disk; same approach as integration-s7.test.ts)
 *   - Per-role classification tests that drive buildFunctionGraph() with hand-
 *     crafted in-memory fixture paths so we can assert specific MethodRole values.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { buildFunctionGraph } from '../src/analyzer/graph-builder.js';
import { analyze } from '../src/analyzer/index.js';
import type { GraphNode, GraphEdge } from '../src/types.js';
import type { FunctionGraphResult } from '../src/analyzer/graph-builder.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturePath = resolve(__dirname, 'fixtures', 'function-level');

// ---------------------------------------------------------------------------
// Shared: run buildFunctionGraph against the function-level fixture once
// ---------------------------------------------------------------------------

let _funcResult: FunctionGraphResult | null = null;

async function getFuncResult(): Promise<FunctionGraphResult> {
  if (!_funcResult) {
    // Reuse the full analyze() pipeline to obtain the fileNodes + importEdges
    // that buildFunctionGraph requires, then call it again so we get the
    // FunctionGraphResult type directly (not wrapped inside AnalysisResult).
    const fullResult = await analyze(fixturePath);
    const fileNodes = fullResult.graph.nodes.filter((n) => n.type === 'file');
    const importEdges = fullResult.graph.edges.filter((e) => e.type === 'import');
    _funcResult = await buildFunctionGraph(fileNodes, fixturePath, importEdges);
  }
  return _funcResult;
}

// ---------------------------------------------------------------------------
// Empty-input smoke tests (no disk I/O; exercises the stats/return contract)
// ---------------------------------------------------------------------------

describe('buildFunctionGraph — empty input', () => {
  it('returns empty functionNodes for empty file list', async () => {
    const result = await buildFunctionGraph([], '/tmp/test-project', []);
    expect(result.functionNodes).toEqual([]);
  });

  it('returns empty callEdges for empty file list', async () => {
    const result = await buildFunctionGraph([], '/tmp/test-project', []);
    expect(result.callEdges).toEqual([]);
  });

  it('returns empty errors for empty file list', async () => {
    const result = await buildFunctionGraph([], '/tmp/test-project', []);
    expect(result.errors).toEqual([]);
  });

  it('returns zero totalFunctions for empty file list', async () => {
    const result = await buildFunctionGraph([], '/tmp/test-project', []);
    expect(result.stats.totalFunctions).toBe(0);
  });

  it('returns zero totalClasses for empty file list', async () => {
    const result = await buildFunctionGraph([], '/tmp/test-project', []);
    expect(result.stats.totalClasses).toBe(0);
  });

  it('returns zero totalCallEdges for empty file list', async () => {
    const result = await buildFunctionGraph([], '/tmp/test-project', []);
    expect(result.stats.totalCallEdges).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// methodRole presence tests — every function node must carry the field
// ---------------------------------------------------------------------------

describe('buildFunctionGraph — methodRole presence on function nodes', () => {
  it('every function node has metadata.methodRole defined', async () => {
    const result = await getFuncResult();
    const fnNodes = result.functionNodes.filter((n) => n.type === 'function');
    expect(fnNodes.length).toBeGreaterThan(0);
    for (const node of fnNodes) {
      expect(node.metadata.methodRole).toBeDefined();
    }
  });

  it('every function node has metadata.roleConfidence defined', async () => {
    const result = await getFuncResult();
    const fnNodes = result.functionNodes.filter((n) => n.type === 'function');
    for (const node of fnNodes) {
      expect(node.metadata.roleConfidence).toBeDefined();
    }
  });

  it('roleConfidence is a number between 0 and 1 (inclusive)', async () => {
    const result = await getFuncResult();
    const fnNodes = result.functionNodes.filter((n) => n.type === 'function');
    for (const node of fnNodes) {
      const conf = node.metadata.roleConfidence as number;
      expect(conf).toBeGreaterThanOrEqual(0);
      expect(conf).toBeLessThanOrEqual(1);
    }
  });

  it('methodRole is a non-empty string', async () => {
    const result = await getFuncResult();
    const fnNodes = result.functionNodes.filter((n) => n.type === 'function');
    for (const node of fnNodes) {
      expect(typeof node.metadata.methodRole).toBe('string');
      expect((node.metadata.methodRole as string).length).toBeGreaterThan(0);
    }
  });

  it('class nodes do NOT get methodRole (only function nodes do)', async () => {
    const result = await getFuncResult();
    const classNodes = result.functionNodes.filter((n) => n.type === 'class');
    // Class nodes are skipped by the Sprint 15.1 classification loop
    for (const node of classNodes) {
      expect(node.metadata.methodRole).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// methodRole values must be within the known MethodRole enum
// ---------------------------------------------------------------------------

const VALID_METHOD_ROLES = new Set([
  'entrypoint',
  'business_core',
  'domain_rule',
  'orchestration',
  'io_adapter',
  'validation',
  'infra',
  'utility',
  'framework_glue',
]);

describe('buildFunctionGraph — methodRole values are valid MethodRole enum members', () => {
  it('all methodRole values are valid MethodRole enum members', async () => {
    const result = await getFuncResult();
    const fnNodes = result.functionNodes.filter((n) => n.type === 'function');
    for (const node of fnNodes) {
      expect(VALID_METHOD_ROLES).toContain(node.metadata.methodRole);
    }
  });

  it('fixture greet function gets a valid role', async () => {
    const result = await getFuncResult();
    const greetNode = result.functionNodes.find(
      (n) => n.type === 'function' && n.label === 'greet',
    );
    expect(greetNode).toBeDefined();
    expect(VALID_METHOD_ROLES).toContain(greetNode!.metadata.methodRole);
  });

  it('fixture formatDate exported function gets a valid role', async () => {
    const result = await getFuncResult();
    const node = result.functionNodes.find(
      (n) => n.type === 'function' && n.label === 'formatDate',
    );
    expect(node).toBeDefined();
    expect(VALID_METHOD_ROLES).toContain(node!.metadata.methodRole);
  });
});

// ---------------------------------------------------------------------------
// Rule-engine classification: name-driven roles from the fixture set
// ---------------------------------------------------------------------------

describe('buildFunctionGraph — rule-engine classification via full analyze()', () => {
  it('async function fetchData gets roleConfidence >= 0.6', async () => {
    const result = await getFuncResult();
    const node = result.functionNodes.find(
      (n) => n.type === 'function' && n.label === 'fetchData',
    );
    expect(node).toBeDefined();
    // fetchData → io_adapter (name prefix rule), confidence 0.6 (1 signal)
    expect(node!.metadata.roleConfidence).toBeGreaterThanOrEqual(0.6);
  });

  it('fetchData is classified as io_adapter (io-prefix name rule)', async () => {
    const result = await getFuncResult();
    const node = result.functionNodes.find(
      (n) => n.type === 'function' && n.label === 'fetchData',
    );
    expect(node).toBeDefined();
    expect(node!.metadata.methodRole).toBe('io_adapter');
  });

  it('greet function (no special signals) falls back to utility role', async () => {
    const result = await getFuncResult();
    const node = result.functionNodes.find(
      (n) => n.type === 'function' && n.label === 'greet',
    );
    expect(node).toBeDefined();
    expect(node!.metadata.methodRole).toBe('utility');
  });

  it('stats.totalFunctions matches the count of function-typed nodes', async () => {
    const result = await getFuncResult();
    const fnCount = result.functionNodes.filter((n) => n.type === 'function').length;
    expect(result.stats.totalFunctions).toBe(fnCount);
  });

  it('stats.totalClasses matches the count of class-typed nodes', async () => {
    const result = await getFuncResult();
    const clsCount = result.functionNodes.filter((n) => n.type === 'class').length;
    expect(result.stats.totalClasses).toBe(clsCount);
  });
});

// ---------------------------------------------------------------------------
// Integration: AnalysisResult.graph.nodes also carry methodRole (via analyze())
// ---------------------------------------------------------------------------

describe('analyze() pipeline — methodRole propagated into AnalysisResult', () => {
  it('AnalysisResult graph contains function nodes with methodRole', async () => {
    const result = await analyze(fixturePath);
    const fnNodes = result.graph.nodes.filter((n) => n.type === 'function');
    expect(fnNodes.length).toBeGreaterThan(0);
    for (const node of fnNodes) {
      expect(node.metadata.methodRole).toBeDefined();
    }
  });

  it('AnalysisResult graph contains function nodes with roleConfidence', async () => {
    const result = await analyze(fixturePath);
    const fnNodes = result.graph.nodes.filter((n) => n.type === 'function');
    for (const node of fnNodes) {
      expect(typeof node.metadata.roleConfidence).toBe('number');
    }
  });

  it('AnalysisResult stats.totalFunctions is positive for function-level fixture', async () => {
    const result = await analyze(fixturePath);
    expect(result.stats.totalFunctions).toBeGreaterThan(0);
  });
});
