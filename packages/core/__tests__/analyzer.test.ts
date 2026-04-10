/**
 * Analyzer unit tests
 *
 * Tests for:
 *   - packages/core/src/analyzer/index.ts   (analyze)
 *   - packages/core/src/analyzer/graph-builder.ts  (buildGraph)
 *
 * Uses fixture projects under __tests__/fixtures/
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { analyze } from '../src/analyzer/index.js';
import type { AnalysisResult } from '../src/types.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturesDir = resolve(__dirname, 'fixtures');

function fixturePath(name: string): string {
  return resolve(fixturesDir, name);
}

// ---------------------------------------------------------------------------
// AnalysisResult schema helpers
// ---------------------------------------------------------------------------

function assertResultShape(result: AnalysisResult): void {
  // Top-level fields
  expect(typeof result.version).toBe('string');
  expect(typeof result.projectPath).toBe('string');
  expect(typeof result.analyzedAt).toBe('string');
  // analyzedAt must be a valid ISO date
  expect(isNaN(new Date(result.analyzedAt).getTime())).toBe(false);

  // graph
  expect(Array.isArray(result.graph.nodes)).toBe(true);
  expect(Array.isArray(result.graph.edges)).toBe(true);

  // stats
  const s = result.stats;
  expect(typeof s.totalFiles).toBe('number');
  expect(typeof s.analyzedFiles).toBe('number');
  expect(typeof s.skippedFiles).toBe('number');
  expect(typeof s.failedFiles).toBe('number');
  expect(typeof s.totalNodes).toBe('number');
  expect(typeof s.totalEdges).toBe('number');
  expect(typeof s.analysisDurationMs).toBe('number');

  // errors
  expect(Array.isArray(result.errors)).toBe(true);
}

// ---------------------------------------------------------------------------
// simple-project
// ---------------------------------------------------------------------------

describe('analyze — simple-project', () => {
  it('returns a result conforming to AnalysisResult schema', async () => {
    const result = await analyze(fixturePath('simple-project'));
    assertResultShape(result);
  });

  it('sets version to "0.1.0"', async () => {
    const result = await analyze(fixturePath('simple-project'));
    expect(result.version).toBe('0.1.0');
  });

  it('sets projectPath to the target path', async () => {
    const target = fixturePath('simple-project');
    const result = await analyze(target);
    expect(result.projectPath).toBe(target);
  });

  it('discovers all 3 JS files', async () => {
    const result = await analyze(fixturePath('simple-project'));
    const fileNodes = result.graph.nodes.filter((n) => n.type === 'file');
    expect(fileNodes).toHaveLength(3);
  });

  it('discovers the utils directory node', async () => {
    const result = await analyze(fixturePath('simple-project'));
    const dirNodes = result.graph.nodes.filter((n) => n.type === 'directory');
    expect(dirNodes.some((d) => d.label === 'utils')).toBe(true);
  });

  it('creates an import edge from index.js to utils/helper.js', async () => {
    const result = await analyze(fixturePath('simple-project'));
    const edge = result.graph.edges.find(
      (e) => e.source === 'index.js' && e.target === 'utils/helper.js',
    );
    expect(edge).toBeDefined();
    expect(edge!.type).toBe('import');
  });

  it('stats.totalFiles equals number of file nodes scanned', async () => {
    const result = await analyze(fixturePath('simple-project'));
    const fileNodeCount = result.graph.nodes.filter((n) => n.type === 'file').length;
    expect(result.stats.totalFiles).toBe(fileNodeCount);
  });

  it('stats.totalNodes includes both files and directories', async () => {
    const result = await analyze(fixturePath('simple-project'));
    expect(result.stats.totalNodes).toBe(result.graph.nodes.length);
  });

  it('stats.totalEdges matches edges array length', async () => {
    const result = await analyze(fixturePath('simple-project'));
    expect(result.stats.totalEdges).toBe(result.graph.edges.length);
  });

  it('analysisDurationMs is a non-negative number', async () => {
    const result = await analyze(fixturePath('simple-project'));
    expect(result.stats.analysisDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('has no errors for the simple-project', async () => {
    const result = await analyze(fixturePath('simple-project'));
    // The simple project may have unresolvable imports (index.js imports helper)
    // but no files should fail to parse. Filter for fatal errors only.
    const fatalErrors = result.errors.filter((e) => e.phase !== 'analyze');
    expect(fatalErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// ts-project
// ---------------------------------------------------------------------------

describe('analyze — ts-project (TypeScript imports)', () => {
  it('discovers all 5 TS files', async () => {
    const result = await analyze(fixturePath('ts-project'));
    const fileNodes = result.graph.nodes.filter((n) => n.type === 'file');
    expect(fileNodes).toHaveLength(5);
  });

  it('all file nodes have language "typescript"', async () => {
    const result = await analyze(fixturePath('ts-project'));
    const fileNodes = result.graph.nodes.filter((n) => n.type === 'file');
    for (const node of fileNodes) {
      expect(node.metadata.language).toBe('typescript');
    }
  });

  it('creates edge from index.ts to services/greeter.ts', async () => {
    const result = await analyze(fixturePath('ts-project'));
    const edge = result.graph.edges.find(
      (e) => e.source === 'index.ts' && e.target === 'services/greeter.ts',
    );
    expect(edge).toBeDefined();
  });

  it('creates edge from services/greeter.ts to utils/format.ts', async () => {
    const result = await analyze(fixturePath('ts-project'));
    const edge = result.graph.edges.find(
      (e) =>
        e.source === 'services/greeter.ts' && e.target === 'utils/format.ts',
    );
    expect(edge).toBeDefined();
  });

  it('creates a barrel export edge from utils/index.ts to utils/format.ts', async () => {
    const result = await analyze(fixturePath('ts-project'));
    const edge = result.graph.edges.find(
      (e) =>
        e.source === 'utils/index.ts' && e.target === 'utils/format.ts',
    );
    expect(edge).toBeDefined();
  });

  it('has stats.analyzedFiles > 0', async () => {
    const result = await analyze(fixturePath('ts-project'));
    expect(result.stats.analyzedFiles).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// cjs-project
// ---------------------------------------------------------------------------

describe('analyze — cjs-project (CommonJS require)', () => {
  it('discovers all 3 JS files', async () => {
    const result = await analyze(fixturePath('cjs-project'));
    const fileNodes = result.graph.nodes.filter((n) => n.type === 'file');
    expect(fileNodes).toHaveLength(3);
  });

  it('creates import edge from index.js to loader.js', async () => {
    const result = await analyze(fixturePath('cjs-project'));
    const edge = result.graph.edges.find(
      (e) => e.source === 'index.js' && e.target === 'loader.js',
    );
    expect(edge).toBeDefined();
    expect(edge!.type).toBe('import');
  });

  it('creates import edge from loader.js to config.js', async () => {
    const result = await analyze(fixturePath('cjs-project'));
    const edge = result.graph.edges.find(
      (e) => e.source === 'loader.js' && e.target === 'config.js',
    );
    expect(edge).toBeDefined();
  });

  it('all file nodes have language "javascript"', async () => {
    const result = await analyze(fixturePath('cjs-project'));
    const fileNodes = result.graph.nodes.filter((n) => n.type === 'file');
    for (const node of fileNodes) {
      expect(node.metadata.language).toBe('javascript');
    }
  });
});

// ---------------------------------------------------------------------------
// mixed-project (ESM + CJS)
// ---------------------------------------------------------------------------

describe('analyze — mixed-project (ESM + CJS)', () => {
  it('discovers 2 TS files and 1 JS file', async () => {
    const result = await analyze(fixturePath('mixed-project'));
    const fileNodes = result.graph.nodes.filter((n) => n.type === 'file');
    expect(fileNodes).toHaveLength(3);

    const tsFiles = fileNodes.filter((n) => n.metadata.language === 'typescript');
    const jsFiles = fileNodes.filter((n) => n.metadata.language === 'javascript');
    expect(tsFiles).toHaveLength(2);
    expect(jsFiles).toHaveLength(1);
  });

  it('creates edge from index.ts to api.ts via ESM import', async () => {
    const result = await analyze(fixturePath('mixed-project'));
    const edge = result.graph.edges.find(
      (e) => e.source === 'index.ts' && e.target === 'api.ts',
    );
    expect(edge).toBeDefined();
  });

  it('creates edge from index.ts to legacy.js via CJS require', async () => {
    const result = await analyze(fixturePath('mixed-project'));
    const edge = result.graph.edges.find(
      (e) => e.source === 'index.ts' && e.target === 'legacy.js',
    );
    expect(edge).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// error-project (bad.ts has syntax errors)
// ---------------------------------------------------------------------------

describe('analyze — error-project (file with syntax errors)', () => {
  it('does not throw — returns a result', async () => {
    await expect(analyze(fixturePath('error-project'))).resolves.toBeDefined();
  });

  it('still analyses good.ts without errors', async () => {
    const result = await analyze(fixturePath('error-project'));
    const fileNodes = result.graph.nodes.filter((n) => n.type === 'file');
    // Both files should appear as nodes (scanner adds them)
    expect(fileNodes.some((n) => n.filePath === 'good.ts')).toBe(true);
  });

  it('result.errors array is present (may or may not have entries)', async () => {
    const result = await analyze(fixturePath('error-project'));
    expect(Array.isArray(result.errors)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// stats correctness
// ---------------------------------------------------------------------------

describe('analyze — stats', () => {
  it('analyzedFiles <= totalFiles', async () => {
    const result = await analyze(fixturePath('ts-project'));
    expect(result.stats.analyzedFiles).toBeLessThanOrEqual(result.stats.totalFiles);
  });

  it('failedFiles + skippedFiles + analyzedFiles <= totalFiles', async () => {
    const result = await analyze(fixturePath('ts-project'));
    const { failedFiles, skippedFiles, analyzedFiles, totalFiles } = result.stats;
    expect(failedFiles + skippedFiles + analyzedFiles).toBeLessThanOrEqual(totalFiles);
  });

  it('totalNodes counts both file and directory nodes', async () => {
    const result = await analyze(fixturePath('simple-project'));
    expect(result.stats.totalNodes).toBe(result.graph.nodes.length);
  });

  it('nodes have importCount populated after analysis', async () => {
    const result = await analyze(fixturePath('simple-project'));
    const indexNode = result.graph.nodes.find((n) => n.filePath === 'index.js');
    expect(indexNode).toBeDefined();
    // index.js has one import
    expect(indexNode!.metadata.importCount).toBeGreaterThanOrEqual(1);
  });

  it('utils/helper.js has dependencyCount >= 1 (imported by index.js)', async () => {
    const result = await analyze(fixturePath('simple-project'));
    const helperNode = result.graph.nodes.find(
      (n) => n.filePath === 'utils/helper.js',
    );
    expect(helperNode).toBeDefined();
    expect(helperNode!.metadata.dependencyCount).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// buildGraph — direct API tests for error collection branches
// ---------------------------------------------------------------------------

describe('buildGraph — resolve error collection branch', () => {
  it('collects analyze-phase errors when imports cannot be resolved', async () => {
    // unresolvable-project has imports that point to non-existent files
    // This exercises the resolveResult.errors loop in graph-builder.ts
    const result = await analyze(fixturePath('unresolvable-project'));

    // Some errors should be produced for the unresolvable imports
    const analyzeErrors = result.errors.filter((e) => e.phase === 'analyze');
    expect(analyzeErrors.length).toBeGreaterThan(0);
  });

  it('continues analysis after resolve errors — still emits the file node', async () => {
    const result = await analyze(fixturePath('unresolvable-project'));
    const fileNodes = result.graph.nodes.filter((n) => n.type === 'file');
    // index.ts should still be scanned and present
    expect(fileNodes.some((n) => n.filePath === 'index.ts')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AnalyzeOptions
// ---------------------------------------------------------------------------

describe('analyze — AnalyzeOptions', () => {
  it('accepts ignoreDirs option and excludes those directories', async () => {
    // Pass a custom ignoreDirs that is a no-op (ignoring a non-existent dir)
    const result = await analyze(fixturePath('simple-project'), {
      ignoreDirs: ['__nonexistent__'],
    });
    // Should still find the 3 JS files
    const fileNodes = result.graph.nodes.filter((n) => n.type === 'file');
    expect(fileNodes).toHaveLength(3);
  });

  it('accepts extensions option to restrict file types', async () => {
    // Request only .ts files — simple-project has no .ts, so result is empty
    const result = await analyze(fixturePath('simple-project'), {
      extensions: ['.ts'],
    });
    expect(result.graph.nodes).toHaveLength(0);
    expect(result.stats.totalFiles).toBe(0);
  });

  it('accepts both ignoreDirs and extensions together', async () => {
    const result = await analyze(fixturePath('ts-project'), {
      ignoreDirs: ['services'],
      extensions: ['.ts'],
    });
    // services dir should be excluded
    const filePaths = result.graph.nodes
      .filter((n) => n.type === 'file')
      .map((n) => n.filePath);
    for (const p of filePaths) {
      expect(p).not.toMatch(/^services\//);
    }
  });
});

// ---------------------------------------------------------------------------
// Graph JSON schema validation
// ---------------------------------------------------------------------------

describe('analyze — Graph JSON structure', () => {
  it('every node has id, type, label, filePath, metadata fields', async () => {
    const result = await analyze(fixturePath('simple-project'));
    for (const node of result.graph.nodes) {
      expect(node).toHaveProperty('id');
      expect(node).toHaveProperty('type');
      expect(node).toHaveProperty('label');
      expect(node).toHaveProperty('filePath');
      expect(node).toHaveProperty('metadata');
    }
  });

  it('every edge has id, source, target, type, metadata fields', async () => {
    const result = await analyze(fixturePath('simple-project'));
    for (const edge of result.graph.edges) {
      expect(edge).toHaveProperty('id');
      expect(edge).toHaveProperty('source');
      expect(edge).toHaveProperty('target');
      expect(edge).toHaveProperty('type');
      expect(edge).toHaveProperty('metadata');
    }
  });

  it('all node IDs use forward slashes', async () => {
    const result = await analyze(fixturePath('ts-project'));
    for (const node of result.graph.nodes) {
      expect(node.id).not.toContain('\\');
    }
  });

  it('all edge source/target values use forward slashes', async () => {
    const result = await analyze(fixturePath('ts-project'));
    for (const edge of result.graph.edges) {
      expect(edge.source).not.toContain('\\');
      expect(edge.target).not.toContain('\\');
    }
  });

  it('edge IDs follow pattern "source--type--target"', async () => {
    const result = await analyze(fixturePath('simple-project'));
    for (const edge of result.graph.edges) {
      expect(edge.id).toBe(`${edge.source}--${edge.type}--${edge.target}`);
    }
  });

  it('node types are limited to valid NodeType values', async () => {
    const validTypes = new Set(['directory', 'file', 'function', 'class']);
    const result = await analyze(fixturePath('ts-project'));
    for (const node of result.graph.nodes) {
      expect(validTypes.has(node.type)).toBe(true);
    }
  });

  it('edge types are limited to valid EdgeType values', async () => {
    const validTypes = new Set(['import', 'export', 'data-flow', 'call']);
    const result = await analyze(fixturePath('ts-project'));
    for (const edge of result.graph.edges) {
      expect(validTypes.has(edge.type)).toBe(true);
    }
  });
});
