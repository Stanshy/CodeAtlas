/**
 * @codeatlas/core — Flask Adapter Unit Tests
 *
 * Tests cover:
 *   - detect() returns null when flask is not in requirements
 *   - detect() returns detection when flask is in requirements.txt
 *   - extractEndpoints() finds @app.route() endpoints
 *   - extractEndpoints() extracts methods from route decorator
 *   - extractEndpoints() handles @blueprint.route()
 *   - extractEndpoints() finds Flask 2.0+ method shortcuts (@app.get, etc.)
 *   - extractEndpoints() defaults to GET when no methods specified
 *   - extractEndpoints() creates multiple endpoints for multiple methods
 *   - extractEndpoints() returns empty for non-Flask files
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

// Mock the method-role-classifier to avoid side effects
vi.mock('../../src/ai/method-role-classifier.js', () => ({
  classifyMethodRole: vi.fn(() => null),
}));

import { FlaskAdapter } from '../../src/analyzers/adapters/flask-adapter.js';
import type { AdapterContext } from '../../src/analyzers/adapters/types.js';
import type { AnalysisResult, GraphNode } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePyFileNode(id: string, filePath: string): GraphNode {
  return {
    id,
    type: 'file',
    label: filePath.split('/').pop() ?? filePath,
    filePath,
    metadata: { language: 'python' },
  };
}

function makeAnalysis(
  nodes: GraphNode[],
  projectPath = '/project',
): AnalysisResult {
  return {
    projectPath,
    graph: { nodes, edges: [] },
  } as unknown as AnalysisResult;
}

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

describe('FlaskAdapter', () => {
  let adapter: FlaskAdapter;

  beforeEach(() => {
    adapter = new FlaskAdapter();
    mockReadFileSync.mockReset();
  });

  // -----------------------------------------------------------------------
  // detect() — takes AnalysisResult, not AdapterContext
  // -----------------------------------------------------------------------

  describe('detect()', () => {
    it('returns null when no flask in requirements', () => {
      // No requirements.txt, pyproject.toml, or setup.py exist
      mockReadFileSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const analysis = makeAnalysis([]);
      const result = adapter.detect(analysis);
      expect(result).toBeNull();
    });

    it('returns null when requirements.txt exists but does not contain flask', () => {
      mockReadFileSync.mockImplementation((filePath: string) => {
        if (filePath.includes('requirements.txt')) {
          return 'django==4.2\ncelery==5.3\n';
        }
        throw new Error('ENOENT');
      });

      const analysis = makeAnalysis([]);
      const result = adapter.detect(analysis);
      expect(result).toBeNull();
    });

    it('returns detection when flask is in requirements.txt', () => {
      mockReadFileSync.mockImplementation((filePath: string) => {
        if (filePath.includes('requirements.txt')) {
          return 'flask==3.0.0\nflask-cors==4.0.0\n';
        }
        throw new Error('ENOENT');
      });

      const analysis = makeAnalysis([]);
      const result = adapter.detect(analysis);
      expect(result).not.toBeNull();
      expect(result!.adapterName).toBe('flask');
      expect(result!.confidence).toBe(1.0);
      expect(result!.evidence.length).toBeGreaterThan(0);
    });

    it('returns detection when flask is in pyproject.toml', () => {
      mockReadFileSync.mockImplementation((filePath: string) => {
        if (filePath.includes('pyproject.toml')) {
          return '[project]\ndependencies = ["flask>=3.0"]\n';
        }
        throw new Error('ENOENT');
      });

      const analysis = makeAnalysis([]);
      const result = adapter.detect(analysis);
      expect(result).not.toBeNull();
      expect(result!.confidence).toBe(1.0);
    });
  });

  // -----------------------------------------------------------------------
  // extractEndpoints() — takes AdapterContext
  // -----------------------------------------------------------------------

  describe('extractEndpoints()', () => {
    it('finds @app.route() endpoints', () => {
      const fileNode = makePyFileNode('app.py', 'app.py');
      const source = `
from flask import Flask
app = Flask(__name__)

@app.route('/users')
def get_users():
    return jsonify(users)
`;

      const analysis = makeAnalysis([fileNode]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0]!.method).toBe('GET');
      expect(endpoints[0]!.path).toBe('/users');
      expect(endpoints[0]!.handler).toBe('get_users');
      expect(endpoints[0]!.id).toBe('GET /users');
    });

    it('extracts methods from route decorator', () => {
      const fileNode = makePyFileNode('app.py', 'app.py');
      const source = `
@app.route('/login', methods=['POST'])
def login():
    pass
`;

      const analysis = makeAnalysis([fileNode]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0]!.method).toBe('POST');
      expect(endpoints[0]!.path).toBe('/login');
    });

    it('handles @blueprint.route()', () => {
      const fileNode = makePyFileNode('views.py', 'views.py');
      const source = `
from flask import Blueprint
auth_bp = Blueprint('auth', __name__)

@blueprint.route('/register', methods=['POST'])
def register():
    pass
`;

      const analysis = makeAnalysis([fileNode]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0]!.method).toBe('POST');
      expect(endpoints[0]!.path).toBe('/register');
      expect(endpoints[0]!.handler).toBe('register');
    });

    it('finds Flask 2.0+ method shortcuts (@app.get, @app.post, etc.)', () => {
      const fileNode = makePyFileNode('app.py', 'app.py');
      const source = `
@app.get('/items')
def list_items():
    return jsonify(items)

@app.post('/items')
def create_item():
    return jsonify(item), 201

@bp.delete('/items/<id>')
def delete_item(id):
    pass
`;

      const analysis = makeAnalysis([fileNode]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toHaveLength(3);

      const getEndpoint = endpoints.find((e) => e.method === 'GET');
      expect(getEndpoint).toBeDefined();
      expect(getEndpoint!.path).toBe('/items');
      expect(getEndpoint!.handler).toBe('list_items');

      const postEndpoint = endpoints.find((e) => e.method === 'POST');
      expect(postEndpoint).toBeDefined();
      expect(postEndpoint!.path).toBe('/items');
      expect(postEndpoint!.handler).toBe('create_item');

      const deleteEndpoint = endpoints.find((e) => e.method === 'DELETE');
      expect(deleteEndpoint).toBeDefined();
      expect(deleteEndpoint!.path).toBe('/items/<id>');
      expect(deleteEndpoint!.handler).toBe('delete_item');
    });

    it('defaults to GET when no methods specified in route()', () => {
      const fileNode = makePyFileNode('app.py', 'app.py');
      const source = `
@app.route('/health')
def health_check():
    return 'ok'
`;

      const analysis = makeAnalysis([fileNode]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0]!.method).toBe('GET');
      expect(endpoints[0]!.path).toBe('/health');
    });

    it('creates multiple endpoints for multiple methods in route()', () => {
      const fileNode = makePyFileNode('app.py', 'app.py');
      const source = `
@app.route('/resource', methods=['GET', 'POST', 'PUT'])
def handle_resource():
    pass
`;

      const analysis = makeAnalysis([fileNode]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toHaveLength(3);

      const methods = endpoints.map((e) => e.method).sort();
      expect(methods).toEqual(['GET', 'POST', 'PUT']);

      // All should share the same path and handler
      for (const ep of endpoints) {
        expect(ep.path).toBe('/resource');
        expect(ep.handler).toBe('handle_resource');
      }
    });

    it('returns empty for non-Flask files (no decorators)', () => {
      const fileNode = makePyFileNode('utils.py', 'utils.py');
      const source = `
def add(a, b):
    return a + b

class Calculator:
    def multiply(self, x, y):
        return x * y
`;

      const analysis = makeAnalysis([fileNode]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toHaveLength(0);
    });

    it('handles @bp.route() shorthand for blueprint', () => {
      const fileNode = makePyFileNode('api.py', 'api.py');
      const source = `
from flask import Blueprint
bp = Blueprint('api', __name__, url_prefix='/api')

@bp.route('/data', methods=['GET'])
def get_data():
    return jsonify(data)
`;

      const analysis = makeAnalysis([fileNode]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0]!.method).toBe('GET');
      expect(endpoints[0]!.path).toBe('/data');
    });

    it('handles async def handlers', () => {
      const fileNode = makePyFileNode('app.py', 'app.py');
      const source = `
@app.get('/async-data')
async def get_async_data():
    data = await fetch_data()
    return jsonify(data)
`;

      const analysis = makeAnalysis([fileNode]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0]!.handler).toBe('get_async_data');
    });

    it('skips non-.py files in analysis', () => {
      const jsFile: GraphNode = {
        id: 'index.js',
        type: 'file',
        label: 'index.js',
        filePath: 'index.js',
        metadata: { language: 'javascript' },
      };

      const analysis = makeAnalysis([jsFile]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = () => '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // Adapter metadata
  // -----------------------------------------------------------------------

  describe('metadata', () => {
    it('has correct name, displayName, and language', () => {
      expect(adapter.name).toBe('flask');
      expect(adapter.displayName).toBe('Flask');
      expect(adapter.language).toBe('python');
    });
  });
});
