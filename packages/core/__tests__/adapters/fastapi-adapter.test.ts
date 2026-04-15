/**
 * @codeatlas/core — FastAPI Adapter unit tests
 *
 * Test cases:
 *   1. detect() returns null when no fastapi in requirements
 *   2. detect() returns detection when fastapi is in requirements.txt
 *   3. extractEndpoints() finds @app.get/post/put/delete/patch
 *   4. extractEndpoints() finds @router.get/post/etc.
 *   5. extractEndpoints() handles path parameters ({item_id})
 *   6. extractEndpoints() returns empty for non-FastAPI files
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted creates mock references before module initialisation
const { mockReadFileSync } = vi.hoisted(() => ({
  mockReadFileSync: vi.fn<[string, BufferEncoding], string>(),
}));

// Mock node:fs to control file reads without touching disk
vi.mock('node:fs', () => ({
  default: {
    readFileSync: mockReadFileSync,
  },
  readFileSync: mockReadFileSync,
}));

// Mock the method-role-classifier to avoid AI dependency
vi.mock('../../src/ai/method-role-classifier.js', () => ({
  classifyMethodRole: vi.fn(() => null),
}));

import { FastAPIAdapter } from '../../src/analyzers/adapters/fastapi-adapter.js';
import type { AdapterContext } from '../../src/analyzers/adapters/types.js';
import type { AnalysisResult, GraphNode } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal AnalysisResult for testing. */
function makeAnalysis(nodes: GraphNode[], projectPath = '/project'): AnalysisResult {
  return {
    projectPath,
    graph: { nodes, edges: [] },
  } as unknown as AnalysisResult;
}

/** Create a file GraphNode. */
function makeFileNode(filePath: string, label?: string): GraphNode {
  return {
    id: filePath,
    type: 'file',
    label: label ?? filePath.split('/').pop() ?? filePath,
    filePath,
    metadata: {},
  };
}

/** Build an AdapterContext from an AnalysisResult. */
function makeContext(analysis: AnalysisResult): AdapterContext {
  return {
    analysis,
    nodeMap: new Map(),
    callAdjacency: new Map(),
    functionsByLabel: new Map(),
    functionNodes: [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FastAPIAdapter', () => {
  let adapter: FastAPIAdapter;

  beforeEach(() => {
    adapter = new FastAPIAdapter();
    mockReadFileSync.mockReset();
  });

  // -- Metadata -----------------------------------------------------------

  it('has correct name, displayName, and language', () => {
    expect(adapter.name).toBe('fastapi');
    expect(adapter.displayName).toBe('FastAPI');
    expect(adapter.language).toBe('python');
  });

  // -- detect() — takes AnalysisResult -----------------------------------

  describe('detect()', () => {
    it('returns null when no fastapi in requirements', () => {
      mockReadFileSync.mockImplementation((filePath: string) => {
        if (filePath.includes('requirements.txt')) {
          return 'flask==2.0.0\nrequests>=2.28\n';
        }
        throw new Error('ENOENT');
      });

      const analysis = makeAnalysis([]);
      const result = adapter.detect(analysis);
      expect(result).toBeNull();
    });

    it('returns detection when fastapi is in requirements.txt', () => {
      mockReadFileSync.mockImplementation((filePath: string) => {
        if (filePath.includes('requirements.txt')) {
          return 'fastapi==0.100.0\nuvicorn>=0.20\n';
        }
        throw new Error('ENOENT');
      });

      const analysis = makeAnalysis([]);
      const result = adapter.detect(analysis);
      expect(result).not.toBeNull();
      expect(result!.adapterName).toBe('fastapi');
      expect(result!.confidence).toBe(1.0);
      expect(result!.evidence.length).toBeGreaterThan(0);
    });

    it('returns detection when fastapi is in pyproject.toml', () => {
      mockReadFileSync.mockImplementation((filePath: string) => {
        if (filePath.includes('pyproject.toml')) {
          return '[project]\ndependencies = [\n  "fastapi>=0.95.0",\n  "pydantic"\n]\n';
        }
        throw new Error('ENOENT');
      });

      const analysis = makeAnalysis([]);
      const result = adapter.detect(analysis);
      expect(result).not.toBeNull();
      expect(result!.adapterName).toBe('fastapi');
      expect(result!.confidence).toBe(1.0);
    });

    it('returns detection without version when only package name is present', () => {
      mockReadFileSync.mockImplementation((filePath: string) => {
        if (filePath.includes('requirements.txt')) {
          return 'fastapi\nuvicorn\n';
        }
        throw new Error('ENOENT');
      });

      const analysis = makeAnalysis([]);
      const result = adapter.detect(analysis);
      expect(result).not.toBeNull();
      // Evidence should still mention fastapi
      expect(result!.evidence[0]).toContain('fastapi');
    });
  });

  // -- extractEndpoints() — takes AdapterContext --------------------------

  describe('extractEndpoints()', () => {
    it('finds @app.get/post/put/delete/patch endpoints', () => {
      const pyNode = makeFileNode('main.py');
      const source = `
from fastapi import FastAPI

app = FastAPI()

@app.get("/users")
async def list_users():
    return []

@app.post("/users")
async def create_user():
    return {}

@app.put("/users/{user_id}")
async def update_user(user_id: int):
    return {}

@app.delete("/users/{user_id}")
async def delete_user(user_id: int):
    return {}

@app.patch("/users/{user_id}")
async def patch_user(user_id: int):
    return {}
`;

      const analysis = makeAnalysis([pyNode]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toHaveLength(5);

      const methods = endpoints.map((e) => e.method);
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('PUT');
      expect(methods).toContain('DELETE');
      expect(methods).toContain('PATCH');

      // Verify handler names
      const handlers = endpoints.map((e) => e.handler);
      expect(handlers).toContain('list_users');
      expect(handlers).toContain('create_user');
      expect(handlers).toContain('update_user');
      expect(handlers).toContain('delete_user');
      expect(handlers).toContain('patch_user');
    });

    it('finds @router.get/post/etc. endpoints', () => {
      const pyNode = makeFileNode('routers/items.py');
      const source = `
from fastapi import APIRouter

router = APIRouter()

@router.get("/items")
async def list_items():
    return []

@router.post("/items")
async def create_item():
    return {}
`;

      const analysis = makeAnalysis([pyNode]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toHaveLength(2);
      expect(endpoints[0]!.method).toBe('GET');
      expect(endpoints[0]!.path).toBe('/items');
      expect(endpoints[0]!.handler).toBe('list_items');
      expect(endpoints[1]!.method).toBe('POST');
      expect(endpoints[1]!.path).toBe('/items');
      expect(endpoints[1]!.handler).toBe('create_item');
    });

    it('handles path parameters ({item_id}) preserving them as-is', () => {
      const pyNode = makeFileNode('routes.py');
      const source = `
from fastapi import APIRouter

router = APIRouter()

@router.get("/items/{item_id}")
async def get_item(item_id: int):
    return {"id": item_id}

@router.get("/users/{user_id}/orders/{order_id}")
async def get_user_order(user_id: int, order_id: int):
    return {}
`;

      const analysis = makeAnalysis([pyNode]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toHaveLength(2);
      expect(endpoints[0]!.path).toBe('/items/{item_id}');
      expect(endpoints[1]!.path).toBe('/users/{user_id}/orders/{order_id}');
    });

    it('returns empty array for non-FastAPI Python files', () => {
      const pyNode = makeFileNode('utils.py');
      const source = `
def add(a, b):
    return a + b

class Calculator:
    def multiply(self, a, b):
        return a * b
`;

      const analysis = makeAnalysis([pyNode]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toHaveLength(0);
    });

    it('returns empty array for non-Python files', () => {
      const jsNode = makeFileNode('app.js');
      const analysis = makeAnalysis([jsNode]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = () => '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toHaveLength(0);
    });

    it('generates correct endpoint IDs as "${method} ${path}"', () => {
      const pyNode = makeFileNode('api.py');
      const source = `
from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
def health_check():
    return {"status": "ok"}
`;

      const analysis = makeAnalysis([pyNode]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0]!.id).toBe('GET /health');
    });

    it('composes paths with APIRouter prefix', () => {
      const pyNode = makeFileNode('routers/v1.py');
      const source = `
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1")

@router.get("/items")
async def list_items():
    return []

@router.post("/items/{item_id}")
async def get_item(item_id: int):
    return {}
`;

      const analysis = makeAnalysis([pyNode]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toHaveLength(2);
      expect(endpoints[0]!.path).toBe('/api/v1/items');
      expect(endpoints[0]!.id).toBe('GET /api/v1/items');
      expect(endpoints[1]!.path).toBe('/api/v1/items/{item_id}');
    });

    it('sets handlerFileId to the file node id', () => {
      const pyNode = makeFileNode('endpoints.py');
      const source = `
from fastapi import FastAPI

app = FastAPI()

@app.get("/test")
def test_endpoint():
    return {}
`;

      const analysis = makeAnalysis([pyNode]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0]!.handlerFileId).toBe('endpoints.py');
    });
  });
});
