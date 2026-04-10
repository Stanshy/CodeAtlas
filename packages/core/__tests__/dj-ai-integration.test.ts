/**
 * Sprint 15 — DJ AI Integration Tests (T10)
 *
 * Coverage targets:
 *   - EndpointDescriptionSchema + StepDetailSchema: valid and invalid cases
 *   - ChainStep type has role and roleConfidence fields after BFS build
 *   - endpoint-detector chain steps are enriched with MethodRole classification
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  EndpointDescriptionSchema,
  StepDetailSchema,
} from '../src/ai/contracts.js';

// ---------------------------------------------------------------------------
// Mocks for endpoint-detector (requires fs)
// ---------------------------------------------------------------------------

const { mockReadFileSync } = vi.hoisted(() => ({
  mockReadFileSync: vi.fn<[string, BufferEncoding], string>(),
}));

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

function makeAnalysis(nodes: GraphNode[], edges: GraphEdge[]): AnalysisResult {
  return {
    version: '1.0.0',
    projectPath: '/project',
    analyzedAt: '2026-04-05T00:00:00.000Z',
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
// EndpointDescriptionSchema — extended coverage
// ---------------------------------------------------------------------------

describe('EndpointDescriptionSchema — DJ integration', () => {
  const valid = {
    endpointId: 'GET /api/videos',
    method: 'GET',
    path: '/api/videos',
    chineseDescription: '取得影片列表',
    purpose: 'Returns a paginated list of videos',
    confidence: 0.88,
  };

  it('parses all required fields correctly', () => {
    const result = EndpointDescriptionSchema.parse(valid);
    expect(result.endpointId).toBe('GET /api/videos');
    expect(result.method).toBe('GET');
    expect(result.path).toBe('/api/videos');
    expect(result.chineseDescription).toBe('取得影片列表');
    expect(result.purpose).toBe('Returns a paginated list of videos');
    expect(result.confidence).toBe(0.88);
  });

  it('accepts various HTTP methods as strings', () => {
    for (const method of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']) {
      const result = EndpointDescriptionSchema.safeParse({ ...valid, method });
      expect(result.success).toBe(true);
    }
  });

  it('rejects missing method field', () => {
    const { method: _m, ...without } = valid;
    expect(EndpointDescriptionSchema.safeParse(without).success).toBe(false);
  });

  it('rejects chineseDescription exceeding 20 chars', () => {
    const tooLong = '取'.repeat(21);
    expect(EndpointDescriptionSchema.safeParse({ ...valid, chineseDescription: tooLong }).success).toBe(false);
  });

  it('accepts chineseDescription of exactly 20 chars', () => {
    const exactly20 = 'a'.repeat(20);
    expect(EndpointDescriptionSchema.safeParse({ ...valid, chineseDescription: exactly20 }).success).toBe(true);
  });

  it('rejects missing purpose', () => {
    const { purpose: _p, ...without } = valid;
    expect(EndpointDescriptionSchema.safeParse(without).success).toBe(false);
  });

  it('rejects confidence < 0', () => {
    expect(EndpointDescriptionSchema.safeParse({ ...valid, confidence: -0.01 }).success).toBe(false);
  });

  it('rejects confidence > 1', () => {
    expect(EndpointDescriptionSchema.safeParse({ ...valid, confidence: 1.01 }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// StepDetailSchema — extended coverage
// ---------------------------------------------------------------------------

describe('StepDetailSchema — DJ integration', () => {
  const valid = {
    stepIndex: 0,
    methodId: 'src/routes/video.ts#listVideos',
    description: '查詢影片清單',
    input: 'req: Request',
    output: 'VideoList[]',
    transform: 'Queries DB and formats response',
  };

  it('parses all required fields correctly', () => {
    const result = StepDetailSchema.parse(valid);
    expect(result.stepIndex).toBe(0);
    expect(result.methodId).toBe('src/routes/video.ts#listVideos');
    expect(result.description).toBe('查詢影片清單');
    expect(result.input).toBe('req: Request');
    expect(result.output).toBe('VideoList[]');
    expect(result.transform).toBe('Queries DB and formats response');
  });

  it('rejects missing input', () => {
    const { input: _i, ...without } = valid;
    expect(StepDetailSchema.safeParse(without).success).toBe(false);
  });

  it('rejects missing output', () => {
    const { output: _o, ...without } = valid;
    expect(StepDetailSchema.safeParse(without).success).toBe(false);
  });

  it('rejects missing transform', () => {
    const { transform: _t, ...without } = valid;
    expect(StepDetailSchema.safeParse(without).success).toBe(false);
  });

  it('rejects description exceeding 30 chars', () => {
    const tooLong = 'a'.repeat(31);
    expect(StepDetailSchema.safeParse({ ...valid, description: tooLong }).success).toBe(false);
  });

  it('accepts description of exactly 30 chars', () => {
    const exactly30 = 'a'.repeat(30);
    expect(StepDetailSchema.safeParse({ ...valid, description: exactly30 }).success).toBe(true);
  });

  it('accepts stepIndex of 0 (zero-indexed)', () => {
    expect(StepDetailSchema.safeParse({ ...valid, stepIndex: 0 }).success).toBe(true);
  });

  it('parses step with high stepIndex', () => {
    const result = StepDetailSchema.parse({ ...valid, stepIndex: 9 });
    expect(result.stepIndex).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// ChainStep MethodRole fields — Sprint 15 enrichment
// ---------------------------------------------------------------------------

describe('ChainStep — role and roleConfidence fields (Sprint 15)', () => {
  beforeEach(() => {
    mockReadFileSync.mockReset();
  });

  it('chain steps have role field after BFS build', () => {
    const fileNode = makeFileNode('src/routes/videos.ts', 'src/routes/videos.ts');
    const source = `router.get('/videos', listVideos);`;
    mockReadFileSync.mockReturnValue(source);

    const handlerFn = makeFunctionNode('fn:listVideos', 'listVideos', 'src/routes/videos.ts');
    const serviceFn = makeFunctionNode('fn:getVideos', 'getVideos', 'src/services/video.ts');

    const callEdge = makeCallEdge('e1', 'fn:listVideos', 'fn:getVideos');
    const analysis = makeAnalysis([fileNode, handlerFn, serviceFn], [callEdge]);

    const result = detectEndpoints(analysis);

    expect(result).not.toBeNull();
    expect(result!.chains).toHaveLength(1);
    const chain = result!.chains[0]!;
    expect(chain.steps).toHaveLength(1);

    const step = chain.steps[0]!;
    // Sprint 15: role field must exist on every ChainStep
    expect('role' in step).toBe(true);
  });

  it('chain steps have roleConfidence field after BFS build', () => {
    const fileNode = makeFileNode('src/routes/api.ts', 'src/routes/api.ts');
    const source = `router.post('/upload', uploadHandler);`;
    mockReadFileSync.mockReturnValue(source);

    const handlerFn = makeFunctionNode('fn:uploadHandler', 'uploadHandler', 'src/routes/api.ts');
    const serviceFn = makeFunctionNode('fn:saveFile', 'saveFile', 'src/services/storage.ts');

    const callEdge = makeCallEdge('e1', 'fn:uploadHandler', 'fn:saveFile');
    const analysis = makeAnalysis([fileNode, handlerFn, serviceFn], [callEdge]);

    const result = detectEndpoints(analysis);

    expect(result).not.toBeNull();
    const step = result!.chains[0]!.steps[0]!;
    // Sprint 15: roleConfidence field must exist on every ChainStep
    expect('roleConfidence' in step).toBe(true);
  });

  it('roleConfidence is a number between 0 and 1 when present', () => {
    const fileNode = makeFileNode('src/routes/users.ts', 'src/routes/users.ts');
    const source = `router.get('/users', listUsers);`;
    mockReadFileSync.mockReturnValue(source);

    const handlerFn = makeFunctionNode('fn:listUsers', 'listUsers', 'src/routes/users.ts');
    const repoFn = makeFunctionNode('fn:findAll', 'findAll', 'src/db/user-repo.ts');

    const callEdge = makeCallEdge('e1', 'fn:listUsers', 'fn:findAll');
    const analysis = makeAnalysis([fileNode, handlerFn, repoFn], [callEdge]);

    const result = detectEndpoints(analysis);

    expect(result).not.toBeNull();
    const step = result!.chains[0]!.steps[0]!;

    if (step.roleConfidence !== undefined) {
      expect(step.roleConfidence).toBeGreaterThanOrEqual(0);
      expect(step.roleConfidence).toBeLessThanOrEqual(1);
    }
  });

  it('role is a non-empty string when present', () => {
    const fileNode = makeFileNode('src/routes/auth.ts', 'src/routes/auth.ts');
    const source = `router.post('/login', loginHandler);`;
    mockReadFileSync.mockReturnValue(source);

    const handlerFn = makeFunctionNode('fn:loginHandler', 'loginHandler', 'src/routes/auth.ts');
    const authFn = makeFunctionNode('fn:validateCredentials', 'validateCredentials', 'src/services/auth.ts');

    const callEdge = makeCallEdge('e1', 'fn:loginHandler', 'fn:validateCredentials');
    const analysis = makeAnalysis([fileNode, handlerFn, authFn], [callEdge]);

    const result = detectEndpoints(analysis);

    expect(result).not.toBeNull();
    const step = result!.chains[0]!.steps[0]!;

    if (step.role !== undefined) {
      expect(typeof step.role).toBe('string');
      expect(step.role.length).toBeGreaterThan(0);
    }
  });

  it('chain steps with multiple steps all have role field', () => {
    const fileNode = makeFileNode('src/routes/orders.ts', 'src/routes/orders.ts');
    const source = `router.post('/orders', createOrder);`;
    mockReadFileSync.mockReturnValue(source);

    const handlerFn = makeFunctionNode('fn:createOrder', 'createOrder', 'src/routes/orders.ts');
    const serviceFn = makeFunctionNode('fn:processOrder', 'processOrder', 'src/services/order.ts');
    const repoFn = makeFunctionNode('fn:insertOrder', 'insertOrder', 'src/db/order-repo.ts');

    const edge1 = makeCallEdge('e1', 'fn:createOrder', 'fn:processOrder');
    const edge2 = makeCallEdge('e2', 'fn:processOrder', 'fn:insertOrder');

    const analysis = makeAnalysis(
      [fileNode, handlerFn, serviceFn, repoFn],
      [edge1, edge2],
    );

    const result = detectEndpoints(analysis);

    expect(result).not.toBeNull();
    const chain = result!.chains[0]!;
    expect(chain.steps.length).toBeGreaterThan(0);

    for (const step of chain.steps) {
      expect('role' in step).toBe(true);
      expect('roleConfidence' in step).toBe(true);
    }
  });
});
