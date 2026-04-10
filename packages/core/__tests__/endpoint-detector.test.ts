/**
 * @codeatlas/core — endpoint-detector unit tests
 *
 * Sprint 13 / T2
 *
 * These tests cover:
 *   - Express router.get  pattern detection
 *   - Express app.post    pattern detection
 *   - Fastify shorthand   pattern detection
 *   - Fastify route block pattern detection
 *   - Non-web project returns null (no endpoints found)
 *   - Chain building via BFS from handler node
 *   - BFS depth cap at MAX_CHAIN_DEPTH (10)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted before variable declarations, so we must use vi.hoisted()
// to create the mock function reference that is safe to use inside the factory.
const { mockReadFileSync } = vi.hoisted(() => ({
  mockReadFileSync: vi.fn<[string, BufferEncoding], string>(),
}));

// Mock node:fs so we control what readFileSync returns without touching disk.
// The source uses `import fs from 'node:fs'` (CJS default interop), so the
// mock must supply both `default` and named exports.
vi.mock('node:fs', () => ({
  default: {
    readFileSync: mockReadFileSync,
  },
  readFileSync: mockReadFileSync,
}));

import { detectEndpoints } from '../src/analyzers/endpoint-detector.js';
import type { AnalysisResult, GraphNode, GraphEdge } from '../src/types.js';

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

function makeFunctionNode(id: string, label: string, parentFileId: string): GraphNode {
  return {
    id,
    type: 'function',
    label,
    filePath: parentFileId,
    metadata: { parentFileId, kind: 'function' },
  };
}

function makeCallEdge(id: string, source: string, target: string): GraphEdge {
  return {
    id,
    source,
    target,
    type: 'call',
    metadata: {},
  };
}

function makeAnalysis(
  nodes: GraphNode[],
  edges: GraphEdge[],
  projectPath = '/project',
): AnalysisResult {
  return {
    version: '1.0.0',
    projectPath,
    analyzedAt: '2026-04-02T00:00:00.000Z',
    stats: {
      totalFiles: nodes.filter((n) => n.type === 'file').length,
      analyzedFiles: nodes.filter((n) => n.type === 'file').length,
      skippedFiles: 0,
      failedFiles: 0,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      analysisDurationMs: 0,
    },
    graph: { nodes, edges },
    errors: [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('detectEndpoints', () => {
  beforeEach(() => {
    mockReadFileSync.mockReset();
  });

  // ---- Express router.get --------------------------------------------------

  it('detects Express router.get endpoint', () => {
    const fileNode = makeFileNode('routes/videos.ts', 'routes/videos.ts');
    const source = `
      import { Router } from 'express';
      const router = Router();
      router.get('/videos', listVideos);
      export default router;
    `;
    mockReadFileSync.mockReturnValue(source);

    const analysis = makeAnalysis([fileNode], []);
    const result = detectEndpoints(analysis);

    expect(result).not.toBeNull();
    expect(result!.endpoints).toHaveLength(1);
    const ep = result!.endpoints[0]!;
    expect(ep.method).toBe('GET');
    expect(ep.path).toBe('/videos');
    expect(ep.handler).toBe('listVideos');
    expect(ep.id).toBe('GET /videos');
  });

  // ---- Express app.post ----------------------------------------------------

  it('detects Express app.post endpoint with middleware', () => {
    const fileNode = makeFileNode('src/app.ts', 'src/app.ts');
    const source = `
      app.post('/api/v1/videos/upload', authMiddleware, validateBody, uploadHandler);
    `;
    mockReadFileSync.mockReturnValue(source);

    const analysis = makeAnalysis([fileNode], []);
    const result = detectEndpoints(analysis);

    expect(result).not.toBeNull();
    const ep = result!.endpoints[0]!;
    expect(ep.method).toBe('POST');
    expect(ep.path).toBe('/api/v1/videos/upload');
    expect(ep.handler).toBe('uploadHandler');
    expect(ep.middlewares).toEqual(['authMiddleware', 'validateBody']);
    expect(ep.id).toBe('POST /api/v1/videos/upload');
  });

  // ---- Fastify shorthand ---------------------------------------------------

  it('detects Fastify shorthand route definition', () => {
    const fileNode = makeFileNode('src/routes/health.ts', 'src/routes/health.ts');
    const source = `
      fastify.get('/health', healthHandler);
      fastify.delete('/sessions/:id', requireAuth, deleteSession);
    `;
    mockReadFileSync.mockReturnValue(source);

    const analysis = makeAnalysis([fileNode], []);
    const result = detectEndpoints(analysis);

    expect(result).not.toBeNull();
    expect(result!.endpoints).toHaveLength(2);

    const getEp = result!.endpoints.find((e) => e.method === 'GET')!;
    expect(getEp.path).toBe('/health');
    expect(getEp.handler).toBe('healthHandler');

    const delEp = result!.endpoints.find((e) => e.method === 'DELETE')!;
    expect(delEp.path).toBe('/sessions/:id');
    expect(delEp.handler).toBe('deleteSession');
    expect(delEp.middlewares).toEqual(['requireAuth']);
  });

  // ---- Fastify route block -------------------------------------------------

  it('detects fastify.route({ method, url, handler }) block', () => {
    const fileNode = makeFileNode('src/routes/upload.ts', 'src/routes/upload.ts');
    const source = `
      fastify.route({
        method: 'POST',
        url: '/api/v1/videos/upload',
        handler: uploadVideoHandler,
      });
    `;
    mockReadFileSync.mockReturnValue(source);

    const analysis = makeAnalysis([fileNode], []);
    const result = detectEndpoints(analysis);

    expect(result).not.toBeNull();
    const ep = result!.endpoints[0]!;
    expect(ep.method).toBe('POST');
    expect(ep.path).toBe('/api/v1/videos/upload');
    expect(ep.handler).toBe('uploadVideoHandler');
  });

  // ---- Non-web project returns null ----------------------------------------

  it('returns null when no endpoints are found (non-web project)', () => {
    const fileNode = makeFileNode('src/utils/math.ts', 'src/utils/math.ts');
    const source = `
      export function add(a: number, b: number): number { return a + b; }
    `;
    mockReadFileSync.mockReturnValue(source);

    const analysis = makeAnalysis([fileNode], []);
    const result = detectEndpoints(analysis);

    expect(result).toBeNull();
  });

  // ---- Returns null when file reading fails --------------------------------

  it('returns null gracefully when source cannot be read', () => {
    const fileNode = makeFileNode('src/routes/api.ts', 'src/routes/api.ts');
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT: no such file');
    });

    const analysis = makeAnalysis([fileNode], []);
    const result = detectEndpoints(analysis);

    expect(result).toBeNull();
  });

  // ---- Chain building via BFS ----------------------------------------------

  it('builds endpoint chain from handler via BFS call edges', () => {
    const fileNode = makeFileNode('src/routes/videos.ts', 'src/routes/videos.ts');
    const source = `router.post('/videos', uploadHandler);`;
    mockReadFileSync.mockReturnValue(source);

    // Function nodes
    const handlerFn = makeFunctionNode('fn:uploadHandler', 'uploadHandler', 'src/routes/videos.ts');
    const serviceFn = makeFunctionNode('fn:createVideo', 'createVideo', 'src/services/video.ts');
    const modelFn = makeFunctionNode('fn:insertRecord', 'insertRecord', 'src/models/video.ts');

    const callEdge1 = makeCallEdge('e1', 'fn:uploadHandler', 'fn:createVideo');
    const callEdge2 = makeCallEdge('e2', 'fn:createVideo', 'fn:insertRecord');

    const analysis = makeAnalysis(
      [fileNode, handlerFn, serviceFn, modelFn],
      [callEdge1, callEdge2],
    );

    const result = detectEndpoints(analysis);

    expect(result).not.toBeNull();
    expect(result!.endpoints).toHaveLength(1);

    const chain = result!.chains[0]!;
    expect(chain.endpointId).toBe('POST /videos');
    expect(chain.steps).toHaveLength(2);
    expect(chain.steps[0]!.method).toBe('createVideo');
    expect(chain.steps[1]!.method).toBe('insertRecord');
  });

  // ---- BFS depth cap at 10 -------------------------------------------------

  it('caps BFS chain depth at 10', () => {
    const fileNode = makeFileNode('src/routes/deep.ts', 'src/routes/deep.ts');
    const source = `router.get('/deep', deepHandler);`;
    mockReadFileSync.mockReturnValue(source);

    // Build a linear chain of 15 function nodes
    const chainLength = 15;
    const functionNodes: GraphNode[] = [];
    const callEdges: GraphEdge[] = [];

    for (let i = 0; i <= chainLength; i++) {
      functionNodes.push(
        makeFunctionNode(`fn:step${i}`, `step${i}`, 'src/routes/deep.ts'),
      );
    }

    // Handler is step0; step0→step1→…→step15
    for (let i = 0; i < chainLength; i++) {
      callEdges.push(makeCallEdge(`e${i}`, `fn:step${i}`, `fn:step${i + 1}`));
    }

    // Rename step0 to deepHandler so it matches the route
    functionNodes[0] = makeFunctionNode('fn:step0', 'deepHandler', 'src/routes/deep.ts');

    const analysis = makeAnalysis([fileNode, ...functionNodes], callEdges);
    const result = detectEndpoints(analysis);

    expect(result).not.toBeNull();
    const chain = result!.chains[0]!;

    // BFS starts at depth 0 (handler); callees discovered at depth 0 are at depth 1, etc.
    // Only callees up to depth < 10 are followed, so max 10 steps.
    expect(chain.steps.length).toBeLessThanOrEqual(10);
  });

  // ---- Deduplication of repeated endpoint ids -----------------------------

  it('deduplicates endpoints with the same method + path', () => {
    const fileNode = makeFileNode('src/routes/dup.ts', 'src/routes/dup.ts');
    const source = `
      router.get('/items', listItems);
      router.get('/items', listItems);
    `;
    mockReadFileSync.mockReturnValue(source);

    const analysis = makeAnalysis([fileNode], []);
    const result = detectEndpoints(analysis);

    expect(result).not.toBeNull();
    expect(result!.endpoints).toHaveLength(1);
  });

  // ---- Multiple HTTP methods in one file ----------------------------------

  it('detects multiple methods in one file', () => {
    const fileNode = makeFileNode('src/routes/crud.ts', 'src/routes/crud.ts');
    const source = `
      router.get('/items', getItems);
      router.post('/items', createItem);
      router.put('/items/:id', updateItem);
      router.delete('/items/:id', deleteItem);
      router.patch('/items/:id', patchItem);
    `;
    mockReadFileSync.mockReturnValue(source);

    const analysis = makeAnalysis([fileNode], []);
    const result = detectEndpoints(analysis);

    expect(result).not.toBeNull();
    const methods = result!.endpoints.map((e) => e.method).sort();
    expect(methods).toEqual(['DELETE', 'GET', 'PATCH', 'POST', 'PUT']);
  });
});
