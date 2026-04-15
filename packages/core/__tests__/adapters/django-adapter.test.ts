/**
 * @file DjangoAdapter unit tests
 * @description Sprint 24 — Django / DRF endpoint detection adapter tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock fs before importing the adapter
// ---------------------------------------------------------------------------

const { mockReadFileSync } = vi.hoisted(() => ({
  mockReadFileSync: vi.fn<[string, BufferEncoding], string>(),
}));

vi.mock('node:fs', () => ({
  default: {
    readFileSync: mockReadFileSync,
    readdirSync: vi.fn(() => []),
  },
  readFileSync: mockReadFileSync,
  readdirSync: vi.fn(() => []),
}));

vi.mock('../../src/ai/method-role-classifier.js', () => ({
  classifyMethodRole: vi.fn(() => ({ role: 'utility', confidence: 0.5 })),
}));

import { DjangoAdapter } from '../../src/analyzers/adapters/django-adapter.js';
import type { AnalysisResult, GraphNode } from '../../src/types.js';
import type { AdapterContext } from '../../src/analyzers/adapters/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal AnalysisResult with the given file nodes and project path */
function makeAnalysis(
  nodes: GraphNode[],
  projectPath = '/project',
): AnalysisResult {
  return {
    projectPath,
    graph: { nodes, edges: [] },
  } as unknown as AnalysisResult;
}

/** Create a minimal file GraphNode */
function makeFileNode(filePath: string): GraphNode {
  return {
    id: filePath,
    type: 'file',
    label: filePath.split('/').pop() ?? filePath,
    filePath,
    metadata: {},
  };
}

/** Create an AdapterContext from an AnalysisResult */
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

describe('DjangoAdapter', () => {
  let adapter: DjangoAdapter;

  beforeEach(() => {
    adapter = new DjangoAdapter();
    mockReadFileSync.mockReset();
  });

  // -------------------------------------------------------------------------
  // Properties
  // -------------------------------------------------------------------------

  it('has correct name, displayName, and language', () => {
    expect(adapter.name).toBe('django');
    expect(adapter.displayName).toBe('Django');
    expect(adapter.language).toBe('python');
  });

  // -------------------------------------------------------------------------
  // detect() — takes AnalysisResult
  // -------------------------------------------------------------------------

  describe('detect()', () => {
    it('returns null when no django in requirements', () => {
      mockReadFileSync.mockImplementation((filePath: string) => {
        if (filePath.includes('requirements.txt')) {
          return 'flask==2.0\nrequests>=2.28\n';
        }
        throw new Error('ENOENT');
      });

      const analysis = makeAnalysis([]);
      const result = adapter.detect(analysis);
      expect(result).toBeNull();
    });

    it('returns detection when django is in requirements.txt', () => {
      mockReadFileSync.mockImplementation((filePath: string) => {
        if (filePath.includes('requirements.txt')) {
          return 'django==4.2\ncelery>=5.0\n';
        }
        throw new Error('ENOENT');
      });

      const analysis = makeAnalysis([]);
      const result = adapter.detect(analysis);
      expect(result).not.toBeNull();
      expect(result?.adapterName).toBe('django');
      expect(result?.confidence).toBe(1.0);
      expect(result?.evidence[0]).toContain('django');
    });

    it('returns detection when djangorestframework is present', () => {
      mockReadFileSync.mockImplementation((filePath: string) => {
        if (filePath.includes('requirements.txt')) {
          return 'djangorestframework==3.14\n';
        }
        throw new Error('ENOENT');
      });

      const analysis = makeAnalysis([]);
      const result = adapter.detect(analysis);
      expect(result).not.toBeNull();
      expect(result?.adapterName).toBe('django');
      expect(result?.confidence).toBe(1.0);
      expect(result?.evidence[0]).toContain('djangorestframework');
    });

    it('returns detection from pyproject.toml', () => {
      mockReadFileSync.mockImplementation((filePath: string) => {
        if (filePath.includes('pyproject.toml')) {
          return '[project]\ndependencies = [\n  "django>=4.0",\n]\n';
        }
        throw new Error('ENOENT');
      });

      const analysis = makeAnalysis([]);
      const result = adapter.detect(analysis);
      expect(result).not.toBeNull();
      expect(result?.evidence[0]).toContain('pyproject.toml');
    });
  });

  // -------------------------------------------------------------------------
  // extractEndpoints() — path()
  // -------------------------------------------------------------------------

  describe('extractEndpoints() — path() patterns', () => {
    it('finds path() URL patterns', () => {
      const urlsFile = makeFileNode('myapp/urls.py');
      const source = `
from django.urls import path
from . import views

urlpatterns = [
    path('api/users/', views.user_list, name='user-list'),
    path('api/users/<int:pk>/', views.user_detail),
]
`;

      const analysis = makeAnalysis([urlsFile]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints.length).toBe(2);
      expect(endpoints[0]?.id).toBe('GET /api/users/');
      expect(endpoints[0]?.handler).toBe('user_list');
      expect(endpoints[1]?.id).toBe('GET /api/users/:pk/');
      expect(endpoints[1]?.handler).toBe('user_detail');
    });

    it('handles path converters correctly', () => {
      const urlsFile = makeFileNode('urls.py');
      const source = `
urlpatterns = [
    path('articles/<slug:slug>/', views.article_detail),
    path('categories/<pk>/', views.category_detail),
]
`;

      const analysis = makeAnalysis([urlsFile]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints.length).toBe(2);
      expect(endpoints[0]?.path).toBe('/articles/:slug/');
      expect(endpoints[1]?.path).toBe('/categories/:pk/');
    });
  });

  // -------------------------------------------------------------------------
  // extractEndpoints() — re_path()
  // -------------------------------------------------------------------------

  describe('extractEndpoints() — re_path() patterns', () => {
    it('finds re_path() URL patterns', () => {
      const urlsFile = makeFileNode('myapp/urls.py');
      const source = `
from django.urls import re_path
from . import views

urlpatterns = [
    re_path(r'^api/items/(?P<pk>[0-9]+)/$', views.item_detail),
]
`;

      const analysis = makeAnalysis([urlsFile]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints.length).toBe(1);
      expect(endpoints[0]?.handler).toBe('item_detail');
      // Path should have named group converted to :pk
      expect(endpoints[0]?.path).toContain(':pk');
    });

    it('normalizes regex anchors and named groups', () => {
      const urlsFile = makeFileNode('urls.py');
      const source = `
urlpatterns = [
    re_path(r'^api/orders/(?P<order_id>[0-9]+)/items/(?P<item_id>[0-9]+)/$', views.order_item),
]
`;

      const analysis = makeAnalysis([urlsFile]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints.length).toBe(1);
      const ep = endpoints[0]!;
      expect(ep.path).toContain(':order_id');
      expect(ep.path).toContain(':item_id');
      // Should not contain ^ or $
      expect(ep.path).not.toContain('^');
      expect(ep.path).not.toContain('$');
    });
  });

  // -------------------------------------------------------------------------
  // extractEndpoints() — include()
  // -------------------------------------------------------------------------

  describe('extractEndpoints() — include() nested URLs', () => {
    it('detects include() nested URL configs', () => {
      const rootUrls = makeFileNode('project/urls.py');
      const appUrls = makeFileNode('myapp/urls.py');

      const rootSource = `
from django.urls import path, include

urlpatterns = [
    path('api/', include('myapp.urls')),
    path('admin/', include('django.contrib.admin.urls')),
]
`;

      const appSource = `
from django.urls import path
from . import views

urlpatterns = [
    path('items/', views.item_list),
]
`;

      const analysis = makeAnalysis([rootUrls, appUrls]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) => {
        if (node.filePath === 'project/urls.py') return rootSource;
        if (node.filePath === 'myapp/urls.py') return appSource;
        return '';
      };

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      // Should detect the path() in the nested app urls
      const itemEndpoint = endpoints.find((e) => e.handler === 'item_list');
      expect(itemEndpoint).toBeDefined();
      expect(itemEndpoint?.path).toBe('/items/');
    });
  });

  // -------------------------------------------------------------------------
  // extractEndpoints() — @api_view
  // -------------------------------------------------------------------------

  describe('extractEndpoints() — @api_view', () => {
    it('finds @api_view decorated functions', () => {
      const viewsFile = makeFileNode('myapp/views.py');
      const source = `
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['GET', 'POST'])
def user_list(request):
    if request.method == 'GET':
        return Response([])
    return Response(status=201)

@api_view(['DELETE'])
def user_delete(request):
    return Response(status=204)
`;

      const analysis = makeAnalysis([viewsFile]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      // Should find GET and POST from first @api_view, DELETE from second
      const getMethods = endpoints.filter((e) => e.method === 'GET');
      const postMethods = endpoints.filter((e) => e.method === 'POST');
      const deleteMethods = endpoints.filter((e) => e.method === 'DELETE');

      expect(getMethods.length).toBeGreaterThanOrEqual(1);
      expect(postMethods.length).toBeGreaterThanOrEqual(1);
      expect(deleteMethods.length).toBeGreaterThanOrEqual(1);

      // Handler names should be extracted from def lines
      const userListEndpoint = endpoints.find((e) => e.handler === 'user_list');
      expect(userListEndpoint).toBeDefined();

      const userDeleteEndpoint = endpoints.find((e) => e.handler === 'user_delete');
      expect(userDeleteEndpoint).toBeDefined();
    });

    it('handles single method api_view', () => {
      const viewsFile = makeFileNode('views.py');
      const source = `
@api_view(['PATCH'])
def update_profile(request):
    return Response()
`;

      const analysis = makeAnalysis([viewsFile]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints.length).toBeGreaterThanOrEqual(1);
      const patchEndpoint = endpoints.find((e) => e.method === 'PATCH');
      expect(patchEndpoint).toBeDefined();
      expect(patchEndpoint?.handler).toBe('update_profile');
    });
  });

  // -------------------------------------------------------------------------
  // extractEndpoints() — ViewSet
  // -------------------------------------------------------------------------

  describe('extractEndpoints() — ViewSet', () => {
    it('detects ModelViewSet CRUD endpoints', () => {
      const viewsFile = makeFileNode('myapp/views.py');
      const source = `
from rest_framework import viewsets
from .models import User
from .serializers import UserSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
`;

      const analysis = makeAnalysis([viewsFile]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      // ModelViewSet generates 5 endpoints: list, create, retrieve, update, destroy
      expect(endpoints.length).toBe(5);

      const methods = endpoints.map((e) => e.method).sort();
      expect(methods).toEqual(['DELETE', 'GET', 'GET', 'POST', 'PUT']);

      // Check paths
      const listEndpoint = endpoints.find((e) => e.method === 'GET' && e.path === '/users/');
      expect(listEndpoint).toBeDefined();

      const retrieveEndpoint = endpoints.find(
        (e) => e.method === 'GET' && e.path === '/users/:id',
      );
      expect(retrieveEndpoint).toBeDefined();

      const createEndpoint = endpoints.find((e) => e.method === 'POST');
      expect(createEndpoint?.path).toBe('/users/');

      const updateEndpoint = endpoints.find((e) => e.method === 'PUT');
      expect(updateEndpoint?.path).toBe('/users/:id');

      const deleteEndpoint = endpoints.find((e) => e.method === 'DELETE');
      expect(deleteEndpoint?.path).toBe('/users/:id');
    });

    it('detects ReadOnlyModelViewSet with only list and retrieve', () => {
      const viewsFile = makeFileNode('views.py');
      const source = `
class ArticleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Article.objects.all()
`;

      const analysis = makeAnalysis([viewsFile]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints.length).toBe(2);
      const methods = endpoints.map((e) => e.method);
      expect(methods).toEqual(['GET', 'GET']);
    });

    it('detects ViewSet without viewsets. prefix', () => {
      const viewsFile = makeFileNode('views.py');
      const source = `
from rest_framework.viewsets import ModelViewSet

class ProductViewSet(ModelViewSet):
    queryset = Product.objects.all()
`;

      const analysis = makeAnalysis([viewsFile]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints.length).toBe(5);
    });
  });

  // -------------------------------------------------------------------------
  // extractEndpoints() — edge cases
  // -------------------------------------------------------------------------

  describe('extractEndpoints() — edge cases', () => {
    it('returns empty for non-Django files', () => {
      const pyFile = makeFileNode('myapp/utils.py');
      const source = `
def calculate_tax(amount, rate):
    return amount * rate

def format_currency(value):
    return f"\${value:.2f}"
`;

      const analysis = makeAnalysis([pyFile]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toEqual([]);
    });

    it('returns empty when source is empty', () => {
      const pyFile = makeFileNode('empty.py');
      const analysis = makeAnalysis([pyFile]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = () => '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toEqual([]);
    });

    it('deduplicates endpoints with the same id', () => {
      const urlsFile = makeFileNode('urls.py');
      const source = `
urlpatterns = [
    path('api/users/', views.user_list),
    path('api/users/', views.user_list),
]
`;

      const analysis = makeAnalysis([urlsFile]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.py') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      // Should deduplicate identical endpoints
      expect(endpoints.length).toBe(1);
    });
  });
});
