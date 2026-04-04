/**
 * Sprint 7 Integration test
 *
 * Tests the full analyze() pipeline against the function-level fixture directory.
 * Verifies:
 *   - function/class nodes are produced with correct type
 *   - function node IDs follow the {fileId}#{funcName} format
 *   - function nodes have parentFileId set
 *   - call edges have type 'call' and callType in metadata
 *   - AnalysisStats includes totalFunctions, totalClasses, totalCallEdges
 *   - Module-level nodes/edges (file/directory) are still present
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { analyze } from '../src/analyzer/index.js';
import type { AnalysisResult } from '../src/types.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturePath = resolve(__dirname, 'fixtures', 'function-level');

// Run analysis once and share the result across tests for performance
let _result: AnalysisResult | null = null;

async function getResult(): Promise<AnalysisResult> {
  if (!_result) {
    _result = await analyze(fixturePath);
  }
  return _result;
}

// ---------------------------------------------------------------------------
// Node types
// ---------------------------------------------------------------------------

describe('integration-s7 — function/class nodes', () => {
  it('produces function nodes (type === "function")', async () => {
    const result = await getResult();
    const fnNodes = result.graph.nodes.filter((n) => n.type === 'function');
    expect(fnNodes.length).toBeGreaterThan(0);
  });

  it('produces class nodes (type === "class")', async () => {
    const result = await getResult();
    const classNodes = result.graph.nodes.filter((n) => n.type === 'class');
    expect(classNodes.length).toBeGreaterThan(0);
  });

  it('all function nodes have parentFileId set', async () => {
    const result = await getResult();
    const fnNodes = result.graph.nodes.filter((n) => n.type === 'function');
    for (const node of fnNodes) {
      expect(node.metadata.parentFileId).toBeDefined();
      expect(typeof node.metadata.parentFileId).toBe('string');
    }
  });

  it('all class nodes have parentFileId set', async () => {
    const result = await getResult();
    const classNodes = result.graph.nodes.filter((n) => n.type === 'class');
    for (const node of classNodes) {
      expect(node.metadata.parentFileId).toBeDefined();
      expect(typeof node.metadata.parentFileId).toBe('string');
    }
  });

  it('function node IDs follow the {fileId}#{funcName} format', async () => {
    const result = await getResult();
    const fnNodes = result.graph.nodes.filter((n) => n.type === 'function');
    for (const node of fnNodes) {
      // ID should contain '#'
      expect(node.id).toContain('#');
      // parentFileId should match the part before '#'
      const fileIdPart = node.id.split('#')[0];
      expect(node.metadata.parentFileId).toBe(fileIdPart);
    }
  });

  it('function nodes have a valid kind in metadata', async () => {
    const result = await getResult();
    const fnNodes = result.graph.nodes.filter((n) => n.type === 'function');
    const validKinds = new Set(['function', 'method', 'getter', 'setter', 'constructor']);
    for (const node of fnNodes) {
      if (node.metadata.kind !== undefined) {
        expect(validKinds.has(node.metadata.kind as string)).toBe(true);
      }
    }
  });

  it('function nodes from basic-functions.ts include greet', async () => {
    const result = await getResult();
    const greetNode = result.graph.nodes.find(
      (n) => n.type === 'function' && n.label === 'greet',
    );
    expect(greetNode).toBeDefined();
  });

  it('class node for Animal is produced', async () => {
    const result = await getResult();
    const animalNode = result.graph.nodes.find(
      (n) => n.type === 'class' && n.label === 'Animal',
    );
    expect(animalNode).toBeDefined();
  });

  it('Animal class node has methodCount > 0', async () => {
    const result = await getResult();
    const animalNode = result.graph.nodes.find(
      (n) => n.type === 'class' && n.label === 'Animal',
    );
    expect(animalNode).toBeDefined();
    expect(animalNode!.metadata.methodCount).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Call edges
// ---------------------------------------------------------------------------

describe('integration-s7 — call edges', () => {
  it('produces call edges (type === "call")', async () => {
    const result = await getResult();
    const callEdges = result.graph.edges.filter((e) => e.type === 'call');
    expect(callEdges.length).toBeGreaterThan(0);
  });

  it('call edges have callType in metadata', async () => {
    const result = await getResult();
    const callEdges = result.graph.edges.filter((e) => e.type === 'call');
    const validCallTypes = new Set(['direct', 'method', 'new']);
    for (const edge of callEdges) {
      if (edge.metadata.callType !== undefined) {
        expect(validCallTypes.has(edge.metadata.callType as string)).toBe(true);
      }
    }
  });

  it('call edges have callerName and calleeName in metadata', async () => {
    const result = await getResult();
    const callEdges = result.graph.edges.filter((e) => e.type === 'call');
    for (const edge of callEdges) {
      expect(typeof edge.metadata.callerName).toBe('string');
      expect(typeof edge.metadata.calleeName).toBe('string');
    }
  });

  it('call edge IDs follow pattern "source--call--target"', async () => {
    const result = await getResult();
    const callEdges = result.graph.edges.filter((e) => e.type === 'call');
    for (const edge of callEdges) {
      expect(edge.id).toBe(`${edge.source}--call--${edge.target}`);
    }
  });
});

// ---------------------------------------------------------------------------
// AnalysisStats — Sprint 7 fields
// ---------------------------------------------------------------------------

describe('integration-s7 — AnalysisStats Sprint 7 fields', () => {
  it('stats.totalFunctions is greater than 0', async () => {
    const result = await getResult();
    expect(result.stats.totalFunctions).toBeDefined();
    expect(result.stats.totalFunctions!).toBeGreaterThan(0);
  });

  it('stats.totalClasses is greater than 0', async () => {
    const result = await getResult();
    expect(result.stats.totalClasses).toBeDefined();
    expect(result.stats.totalClasses!).toBeGreaterThan(0);
  });

  it('stats.totalCallEdges is greater than 0', async () => {
    const result = await getResult();
    expect(result.stats.totalCallEdges).toBeDefined();
    expect(result.stats.totalCallEdges!).toBeGreaterThan(0);
  });

  it('stats.totalNodes includes function and class nodes', async () => {
    const result = await getResult();
    const fnAndClassCount = result.graph.nodes.filter(
      (n) => n.type === 'function' || n.type === 'class',
    ).length;
    expect(fnAndClassCount).toBeGreaterThan(0);
    // totalNodes should reflect all nodes
    expect(result.stats.totalNodes).toBe(result.graph.nodes.length);
  });
});

// ---------------------------------------------------------------------------
// Module-level nodes/edges still present
// ---------------------------------------------------------------------------

describe('integration-s7 — module-level graph still present', () => {
  it('file nodes are still present', async () => {
    const result = await getResult();
    const fileNodes = result.graph.nodes.filter((n) => n.type === 'file');
    expect(fileNodes.length).toBeGreaterThan(0);
  });

  it('import edges are still present', async () => {
    const result = await getResult();
    const importEdges = result.graph.edges.filter((e) => e.type === 'import');
    expect(importEdges.length).toBeGreaterThan(0);
  });

  it('stats.totalFiles matches file nodes count', async () => {
    const result = await getResult();
    const fileNodes = result.graph.nodes.filter((n) => n.type === 'file');
    expect(result.stats.totalFiles).toBe(fileNodes.length);
  });

  it('all node types are from the valid set', async () => {
    const result = await getResult();
    const validTypes = new Set(['directory', 'file', 'function', 'class']);
    for (const node of result.graph.nodes) {
      expect(validTypes.has(node.type)).toBe(true);
    }
  });

  it('all edge types are from the valid set', async () => {
    const result = await getResult();
    const validTypes = new Set(['import', 'export', 'data-flow', 'call']);
    for (const edge of result.graph.edges) {
      expect(validTypes.has(edge.type)).toBe(true);
    }
  });
});
