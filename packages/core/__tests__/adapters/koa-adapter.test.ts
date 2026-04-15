/**
 * @file KoaAdapter unit tests
 * @description Vitest tests for Koa.js framework adapter detection and endpoint extraction.
 */

import { describe, it, expect, vi } from 'vitest';
import { KoaAdapter } from '../../src/analyzers/adapters/koa-adapter.js';
import type { ApiEndpoint } from '../../src/analyzers/endpoint-detector.js';
import type { AnalysisResult, GraphNode } from '../../src/types.js';
import type { AdapterContext } from '../../src/analyzers/adapters/types.js';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

/**
 * Create a minimal GraphNode for testing.
 */
function makeFileNode(id: string, filePath: string): GraphNode {
  return {
    id,
    label: filePath,
    type: 'file',
    filePath,
    metadata: {},
  } as GraphNode;
}

/**
 * Create a minimal AnalysisResult with the given nodes and optional source map.
 * The `readSourceCode` helper reads from fs, so we mock it via the adapter.
 */
function makeAnalysis(
  nodes: GraphNode[],
  sourceMap: Map<string, string> = new Map(),
): AnalysisResult {
  return {
    projectPath: '/mock/project',
    graph: {
      nodes,
      edges: [],
    },
    metadata: {},
    errors: [],
    // Attach source map for mock purposes
    _sourceMap: sourceMap,
  } as unknown as AnalysisResult;
}

/**
 * Create a minimal AdapterContext from an AnalysisResult.
 */
function makeContext(analysis: AnalysisResult): AdapterContext {
  const nodeMap = new Map<string, GraphNode>();
  for (const n of analysis.graph.nodes) {
    nodeMap.set(n.id, n);
  }

  return {
    analysis,
    nodeMap,
    callAdjacency: new Map(),
    functionsByLabel: new Map(),
    functionNodes: [],
  };
}

/**
 * Create a KoaAdapter subclass that reads source from a Map instead of the filesystem.
 */
class TestableKoaAdapter extends KoaAdapter {
  private sourceMap: Map<string, string>;

  constructor(sourceMap: Map<string, string> = new Map()) {
    super();
    this.sourceMap = sourceMap;
  }

  protected override readSourceCode(_analysis: AnalysisResult, node: GraphNode): string {
    return this.sourceMap.get(node.filePath) ?? '';
  }

  protected override readProjectFile(_analysis: AnalysisResult, relativePath: string): string {
    return this.sourceMap.get(relativePath) ?? '';
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('KoaAdapter', () => {
  // -----------------------------------------------------------------------
  // detect()
  // -----------------------------------------------------------------------

  describe('detect()', () => {
    it('returns null when no koa in package.json', () => {
      const pkgContent = JSON.stringify({
        name: 'my-app',
        dependencies: { express: '^4.18.0' },
      });
      const sourceMap = new Map([['package.json', pkgContent]]);
      const adapter = new TestableKoaAdapter(sourceMap);

      const pkgNode = makeFileNode('pkg', 'package.json');
      const analysis = makeAnalysis([pkgNode], sourceMap);

      const result = adapter.detect(analysis);
      expect(result).toBeNull();
    });

    it('returns detection when koa is in dependencies', () => {
      const pkgContent = JSON.stringify({
        name: 'my-koa-app',
        dependencies: { koa: '^2.14.0' },
      });
      const sourceMap = new Map([['package.json', pkgContent]]);
      const adapter = new TestableKoaAdapter(sourceMap);

      const pkgNode = makeFileNode('pkg', 'package.json');
      const analysis = makeAnalysis([pkgNode], sourceMap);

      const result = adapter.detect(analysis);
      expect(result).not.toBeNull();
      expect(result!.adapterName).toBe('koa');
      expect(result!.confidence).toBe(1.0);
      expect(result!.evidence).toContain('found koa@^2.14.0 in package.json dependencies');
    });

    it('returns detection when @koa/router is in devDependencies', () => {
      const pkgContent = JSON.stringify({
        name: 'my-koa-app',
        devDependencies: { '@koa/router': '^12.0.0' },
      });
      const sourceMap = new Map([['package.json', pkgContent]]);
      const adapter = new TestableKoaAdapter(sourceMap);

      const pkgNode = makeFileNode('pkg', 'package.json');
      const analysis = makeAnalysis([pkgNode], sourceMap);

      const result = adapter.detect(analysis);
      expect(result).not.toBeNull();
      expect(result!.adapterName).toBe('koa');
      expect(result!.confidence).toBe(1.0);
      expect(result!.evidence).toContain(
        'found @koa/router@^12.0.0 in package.json dependencies',
      );
    });

    it('returns null when package.json is missing', () => {
      const adapter = new TestableKoaAdapter();
      const analysis = makeAnalysis([]);

      const result = adapter.detect(analysis);
      expect(result).toBeNull();
    });

    it('returns null when package.json is invalid JSON', () => {
      const sourceMap = new Map([['package.json', '{ invalid json']]);
      const adapter = new TestableKoaAdapter(sourceMap);

      const pkgNode = makeFileNode('pkg', 'package.json');
      const analysis = makeAnalysis([pkgNode], sourceMap);

      const result = adapter.detect(analysis);
      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // extractEndpoints()
  // -----------------------------------------------------------------------

  describe('extractEndpoints()', () => {
    it('finds router.get/post/put/delete/patch routes', () => {
      const routerSource = `
const Router = require('@koa/router');
const router = new Router();

router.get('/users', listUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id', patchUser);
`;
      const sourceMap = new Map([['src/routes.ts', routerSource]]);
      const adapter = new TestableKoaAdapter(sourceMap);

      const fileNode = makeFileNode('routes', 'src/routes.ts');
      const analysis = makeAnalysis([fileNode], sourceMap);
      const ctx = makeContext(analysis);

      const endpoints = adapter.extractEndpoints(ctx);

      expect(endpoints).toHaveLength(5);

      const methods = endpoints.map((ep) => ep.method);
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('PUT');
      expect(methods).toContain('DELETE');
      expect(methods).toContain('PATCH');

      const ids = endpoints.map((ep) => ep.id);
      expect(ids).toContain('GET /users');
      expect(ids).toContain('POST /users');
      expect(ids).toContain('PUT /users/:id');
      expect(ids).toContain('DELETE /users/:id');
      expect(ids).toContain('PATCH /users/:id');
    });

    it('handles middleware arguments', () => {
      const routerSource = `
const router = new Router();

router.post('/upload', authMiddleware, validateBody, handleUpload);
`;
      const sourceMap = new Map([['src/upload.ts', routerSource]]);
      const adapter = new TestableKoaAdapter(sourceMap);

      const fileNode = makeFileNode('upload', 'src/upload.ts');
      const analysis = makeAnalysis([fileNode], sourceMap);
      const ctx = makeContext(analysis);

      const endpoints = adapter.extractEndpoints(ctx);

      expect(endpoints).toHaveLength(1);
      const ep = endpoints[0]!;
      expect(ep.method).toBe('POST');
      expect(ep.path).toBe('/upload');
      expect(ep.handler).toBe('handleUpload');
      expect(ep.middlewares).toEqual(['authMiddleware', 'validateBody']);
    });

    it('handles inline arrow handlers', () => {
      const routerSource = `
const router = new Router();

router.get('/health', (ctx) => {
  ctx.body = { status: 'ok' };
});
`;
      const sourceMap = new Map([['src/health.ts', routerSource]]);
      const adapter = new TestableKoaAdapter(sourceMap);

      const fileNode = makeFileNode('health', 'src/health.ts');
      const analysis = makeAnalysis([fileNode], sourceMap);
      const ctx = makeContext(analysis);

      const endpoints = adapter.extractEndpoints(ctx);

      expect(endpoints).toHaveLength(1);
      const ep = endpoints[0]!;
      expect(ep.method).toBe('GET');
      expect(ep.path).toBe('/health');
      expect(ep.handler).toBe('<anonymous>');
    });

    it('returns empty for non-Koa files', () => {
      const plainSource = `
const express = require('express');
const app = express();
console.log('Hello world');
`;
      const sourceMap = new Map([['src/app.ts', plainSource]]);
      const adapter = new TestableKoaAdapter(sourceMap);

      const fileNode = makeFileNode('app', 'src/app.ts');
      const analysis = makeAnalysis([fileNode], sourceMap);
      const ctx = makeContext(analysis);

      const endpoints = adapter.extractEndpoints(ctx);

      expect(endpoints).toHaveLength(0);
    });

    it('ignores non-JS/TS files', () => {
      const sourceMap = new Map([['README.md', 'router.get("/foo", handler)']]);
      const adapter = new TestableKoaAdapter(sourceMap);

      const fileNode = makeFileNode('readme', 'README.md');
      const analysis = makeAnalysis([fileNode], sourceMap);
      const ctx = makeContext(analysis);

      const endpoints = adapter.extractEndpoints(ctx);

      expect(endpoints).toHaveLength(0);
    });

    it('handles router.all() catch-all routes', () => {
      const routerSource = `
const router = new Router();
router.all('/api/proxy', proxyHandler);
`;
      const sourceMap = new Map([['src/proxy.ts', routerSource]]);
      const adapter = new TestableKoaAdapter(sourceMap);

      const fileNode = makeFileNode('proxy', 'src/proxy.ts');
      const analysis = makeAnalysis([fileNode], sourceMap);
      const ctx = makeContext(analysis);

      const endpoints = adapter.extractEndpoints(ctx);

      expect(endpoints).toHaveLength(1);
      const ep = endpoints[0]!;
      expect(ep.method).toBe('GET');
      expect(ep.path).toBe('/api/proxy');
      expect(ep.handler).toBe('proxyHandler');
    });

    it('calculates correct line numbers', () => {
      const routerSource = `// line 1
// line 2
// line 3
router.get('/test', handler);
`;
      const sourceMap = new Map([['src/test.ts', routerSource]]);
      const adapter = new TestableKoaAdapter(sourceMap);

      const fileNode = makeFileNode('test', 'src/test.ts');
      const analysis = makeAnalysis([fileNode], sourceMap);
      const ctx = makeContext(analysis);

      const endpoints = adapter.extractEndpoints(ctx);

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0]!.line).toBe(4);
    });

    it('sets handlerFileId to the file node id', () => {
      const routerSource = `router.get('/foo', fooHandler);`;
      const sourceMap = new Map([['src/foo.ts', routerSource]]);
      const adapter = new TestableKoaAdapter(sourceMap);

      const fileNode = makeFileNode('foo-file', 'src/foo.ts');
      const analysis = makeAnalysis([fileNode], sourceMap);
      const ctx = makeContext(analysis);

      const endpoints = adapter.extractEndpoints(ctx);

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0]!.handlerFileId).toBe('foo-file');
    });
  });

  // -----------------------------------------------------------------------
  // Adapter properties
  // -----------------------------------------------------------------------

  describe('adapter properties', () => {
    it('has correct name, displayName, and language', () => {
      const adapter = new KoaAdapter();
      expect(adapter.name).toBe('koa');
      expect(adapter.displayName).toBe('Koa.js');
      expect(adapter.language).toBe('javascript');
    });
  });
});
