/**
 * @codeatlas/core — HonoAdapter unit tests
 *
 * Sprint 24 — Hono framework adapter endpoint detection.
 *
 * Test coverage:
 *   - detect() returns null when no hono in package.json
 *   - detect() returns detection when hono is in dependencies
 *   - extractEndpoints() finds app.get/post/put/delete/patch routes
 *   - extractEndpoints() handles middleware arguments
 *   - extractEndpoints() handles inline arrow/function handlers
 *   - extractEndpoints() returns empty for non-Hono files
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted before variable declarations, so we must use vi.hoisted()
// to create the mock function reference that is safe to use inside the factory.
const { mockReadFileSync } = vi.hoisted(() => ({
  mockReadFileSync: vi.fn<[string, BufferEncoding], string>(),
}));

// Mock node:fs so we control what readFileSync returns without touching disk.
vi.mock('node:fs', () => ({
  default: {
    readFileSync: mockReadFileSync,
  },
  readFileSync: mockReadFileSync,
}));

import { HonoAdapter } from '../../src/analyzers/adapters/hono-adapter.js';
import type { AnalysisResult, GraphNode } from '../../src/types.js';
import type { AdapterContext } from '../../src/analyzers/adapters/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFileNode(id: string, filePath: string): GraphNode {
  return {
    id,
    type: 'file',
    label: filePath.split('/').pop() ?? filePath,
    filePath,
    metadata: { language: 'typescript' },
  };
}

function makeAnalysis(
  nodes: GraphNode[],
  edges: { id: string; source: string; target: string; type: string; metadata: Record<string, unknown> }[] = [],
): AnalysisResult {
  return {
    version: '1.0.0',
    projectPath: '/fake/project',
    analyzedAt: new Date().toISOString(),
    stats: {
      totalFiles: nodes.length,
      analyzedFiles: nodes.length,
      skippedFiles: 0,
      failedFiles: 0,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      analysisDurationMs: 100,
    },
    graph: {
      nodes,
      edges: edges as AnalysisResult['graph']['edges'],
    },
    errors: [],
  };
}

function makeAdapterContext(analysis: AnalysisResult): AdapterContext {
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HonoAdapter', () => {
  let adapter: HonoAdapter;

  beforeEach(() => {
    adapter = new HonoAdapter();
    mockReadFileSync.mockReset();
  });

  // -----------------------------------------------------------------------
  // Properties
  // -----------------------------------------------------------------------

  it('has correct adapter metadata', () => {
    expect(adapter.name).toBe('hono');
    expect(adapter.displayName).toBe('Hono');
    expect(adapter.language).toBe('javascript');
  });

  // -----------------------------------------------------------------------
  // detect()
  // -----------------------------------------------------------------------

  describe('detect()', () => {
    it('returns null when no package.json node exists', () => {
      const analysis = makeAnalysis([
        makeFileNode('src/index.ts', 'src/index.ts'),
      ]);
      expect(adapter.detect(analysis)).toBeNull();
    });

    it('returns null when package.json does not contain hono', () => {
      const pkgNode = makeFileNode('package.json', 'package.json');
      const analysis = makeAnalysis([pkgNode]);

      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: { express: '^4.18.0' },
      }));

      expect(adapter.detect(analysis)).toBeNull();
    });

    it('returns detection when hono is in dependencies', () => {
      const pkgNode = makeFileNode('package.json', 'package.json');
      const analysis = makeAnalysis([pkgNode]);

      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: { hono: '^4.0.0' },
      }));

      const result = adapter.detect(analysis);
      expect(result).not.toBeNull();
      expect(result!.adapterName).toBe('hono');
      expect(result!.confidence).toBe(1.0);
      expect(result!.evidence[0]).toContain('hono@^4.0.0');
    });

    it('returns detection when hono is in devDependencies', () => {
      const pkgNode = makeFileNode('package.json', 'package.json');
      const analysis = makeAnalysis([pkgNode]);

      mockReadFileSync.mockReturnValue(JSON.stringify({
        devDependencies: { hono: '^3.12.0' },
      }));

      const result = adapter.detect(analysis);
      expect(result).not.toBeNull();
      expect(result!.confidence).toBe(1.0);
    });

    it('returns null when package.json is invalid JSON', () => {
      const pkgNode = makeFileNode('package.json', 'package.json');
      const analysis = makeAnalysis([pkgNode]);

      mockReadFileSync.mockReturnValue('not valid json {{{');

      expect(adapter.detect(analysis)).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // extractEndpoints()
  // -----------------------------------------------------------------------

  describe('extractEndpoints()', () => {
    it('finds app.get/post/put/delete/patch routes', () => {
      const routeFile = makeFileNode('src/routes.ts', 'src/routes.ts');
      const analysis = makeAnalysis([routeFile]);
      const ctx = makeAdapterContext(analysis);

      mockReadFileSync.mockReturnValue(`
import { Hono } from 'hono';
const app = new Hono();

app.get('/users', getUsers)
app.post('/users', createUser)
app.put('/users/:id', updateUser)
app.delete('/users/:id', deleteUser)
app.patch('/users/:id', patchUser)
`);

      const endpoints = adapter.extractEndpoints(ctx);
      expect(endpoints).toHaveLength(5);

      const methods = endpoints.map((e) => e.method);
      expect(methods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);

      const paths = endpoints.map((e) => e.path);
      expect(paths).toEqual(['/users', '/users', '/users/:id', '/users/:id', '/users/:id']);

      // Verify id format
      expect(endpoints[0]!.id).toBe('GET /users');
      expect(endpoints[2]!.id).toBe('PUT /users/:id');
    });

    it('handles middleware arguments', () => {
      const routeFile = makeFileNode('src/routes.ts', 'src/routes.ts');
      const analysis = makeAnalysis([routeFile]);
      const ctx = makeAdapterContext(analysis);

      mockReadFileSync.mockReturnValue(`
app.post('/admin/users', authMiddleware, validateBody, createUser)
`);

      const endpoints = adapter.extractEndpoints(ctx);
      expect(endpoints).toHaveLength(1);

      const ep = endpoints[0]!;
      expect(ep.method).toBe('POST');
      expect(ep.path).toBe('/admin/users');
      expect(ep.handler).toBe('createUser');
      expect(ep.middlewares).toEqual(['authMiddleware', 'validateBody']);
    });

    it('handles inline arrow function handlers', () => {
      const routeFile = makeFileNode('src/routes.ts', 'src/routes.ts');
      const analysis = makeAnalysis([routeFile]);
      const ctx = makeAdapterContext(analysis);

      mockReadFileSync.mockReturnValue(`
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
})
`);

      const endpoints = adapter.extractEndpoints(ctx);
      expect(endpoints).toHaveLength(1);

      const ep = endpoints[0]!;
      expect(ep.method).toBe('GET');
      expect(ep.path).toBe('/health');
      expect(ep.handler).toBe('<anonymous>');
    });

    it('handles hono variable name prefix', () => {
      const routeFile = makeFileNode('src/app.ts', 'src/app.ts');
      const analysis = makeAnalysis([routeFile]);
      const ctx = makeAdapterContext(analysis);

      mockReadFileSync.mockReturnValue(`
const hono = new Hono();
hono.get('/status', getStatus)
hono.post('/data', handleData)
`);

      const endpoints = adapter.extractEndpoints(ctx);
      expect(endpoints).toHaveLength(2);
      expect(endpoints[0]!.id).toBe('GET /status');
      expect(endpoints[1]!.id).toBe('POST /data');
    });

    it('detects app.route() sub-app mounting as route group', () => {
      const routeFile = makeFileNode('src/index.ts', 'src/index.ts');
      const analysis = makeAnalysis([routeFile]);
      const ctx = makeAdapterContext(analysis);

      mockReadFileSync.mockReturnValue(`
const app = new Hono();
const apiRouter = new Hono();

app.route('/api', apiRouter)
`);

      const endpoints = adapter.extractEndpoints(ctx);

      // Should find the route mount
      const routeMount = endpoints.find((e) => e.description?.includes('route group'));
      expect(routeMount).toBeDefined();
      expect(routeMount!.path).toBe('/api');
      expect(routeMount!.handler).toBe('apiRouter');
      expect(routeMount!.description).toContain('app.route');
    });

    it('returns empty array for non-Hono files', () => {
      const routeFile = makeFileNode('src/utils.ts', 'src/utils.ts');
      const analysis = makeAnalysis([routeFile]);
      const ctx = makeAdapterContext(analysis);

      mockReadFileSync.mockReturnValue(`
export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}
`);

      const endpoints = adapter.extractEndpoints(ctx);
      expect(endpoints).toHaveLength(0);
    });

    it('calculates line numbers correctly', () => {
      const routeFile = makeFileNode('src/routes.ts', 'src/routes.ts');
      const analysis = makeAnalysis([routeFile]);
      const ctx = makeAdapterContext(analysis);

      mockReadFileSync.mockReturnValue(`import { Hono } from 'hono';
const app = new Hono();

app.get('/first', handler1)

app.post('/second', handler2)
`);

      const endpoints = adapter.extractEndpoints(ctx);
      expect(endpoints).toHaveLength(2);
      expect(endpoints[0]!.line).toBe(4);
      expect(endpoints[1]!.line).toBe(6);
    });

    it('skips non-JS/TS files', () => {
      const cssFile = makeFileNode('styles.css', 'styles.css');
      const analysis = makeAnalysis([cssFile]);
      const ctx = makeAdapterContext(analysis);

      mockReadFileSync.mockReturnValue(`app.get('/users', handler)`);

      const endpoints = adapter.extractEndpoints(ctx);
      expect(endpoints).toHaveLength(0);
    });

    it('handles inline handler with middleware before it', () => {
      const routeFile = makeFileNode('src/routes.ts', 'src/routes.ts');
      const analysis = makeAnalysis([routeFile]);
      const ctx = makeAdapterContext(analysis);

      mockReadFileSync.mockReturnValue(`
app.post('/upload', authMiddleware, (c) => {
  return c.json({ ok: true });
})
`);

      const endpoints = adapter.extractEndpoints(ctx);
      expect(endpoints).toHaveLength(1);

      const ep = endpoints[0]!;
      expect(ep.handler).toBe('<anonymous>');
      expect(ep.middlewares).toEqual(['authMiddleware']);
    });
  });
});
