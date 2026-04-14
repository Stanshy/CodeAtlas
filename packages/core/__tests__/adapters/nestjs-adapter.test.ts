import { describe, it, expect } from 'vitest';
import { NestJSAdapter } from '../../src/analyzers/adapters/nestjs-adapter.js';
import type { AnalysisResult, GraphNode } from '../../src/types.js';
import type { AdapterContext } from '../../src/analyzers/adapters/types.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeFileNode(filePath: string, id?: string): GraphNode {
  return {
    id: id ?? filePath,
    label: filePath.split('/').pop() ?? filePath,
    type: 'file',
    filePath,
    metadata: {},
  } as GraphNode;
}

function makeAnalysis(nodes: GraphNode[], projectPath = '/test-project'): AnalysisResult {
  return {
    projectPath,
    graph: {
      nodes,
      edges: [],
    },
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

describe('NestJSAdapter', () => {
  const adapter = new NestJSAdapter();

  describe('detect()', () => {
    it('returns null when no package.json exists', () => {
      const analysis = makeAnalysis([]);
      expect(adapter.detect(analysis)).toBeNull();
    });

    it('returns null when package.json has no NestJS deps', () => {
      const pkgNode = makeFileNode('package.json');
      const analysis = makeAnalysis([pkgNode]);
      // Mock readSourceCode by using projectPath
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = () =>
        JSON.stringify({ dependencies: { express: '^4.18.0' } });

      const result = adapter.detect(analysis);
      expect(result).toBeNull();

      (adapter as any).readSourceCode = originalReadSourceCode;
    });

    it('returns detection when @nestjs/common is in dependencies', () => {
      const pkgNode = makeFileNode('package.json');
      const analysis = makeAnalysis([pkgNode]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = () =>
        JSON.stringify({ dependencies: { '@nestjs/common': '^10.0.0', '@nestjs/core': '^10.0.0' } });

      const result = adapter.detect(analysis);
      expect(result).not.toBeNull();
      expect(result!.adapterName).toBe('nestjs');
      expect(result!.confidence).toBe(1.0);
      expect(result!.evidence[0]).toContain('@nestjs/common');

      (adapter as any).readSourceCode = originalReadSourceCode;
    });

    it('returns detection when @nestjs/core is in devDependencies', () => {
      const pkgNode = makeFileNode('package.json');
      const analysis = makeAnalysis([pkgNode]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = () =>
        JSON.stringify({ devDependencies: { '@nestjs/core': '^9.0.0' } });

      const result = adapter.detect(analysis);
      expect(result).not.toBeNull();
      expect(result!.adapterName).toBe('nestjs');

      (adapter as any).readSourceCode = originalReadSourceCode;
    });
  });

  describe('extractEndpoints()', () => {
    it('finds @Get/@Post/@Put/@Delete/@Patch with @Controller prefix', () => {
      const source = `
import { Controller, Get, Post, Put, Delete, Patch } from '@nestjs/common';

@Controller('/users')
export class UsersController {
  @Get()
  findAll() {}

  @Get('/:id')
  findOne() {}

  @Post()
  create() {}

  @Put('/:id')
  update() {}

  @Delete('/:id')
  remove() {}

  @Patch('/:id')
  partialUpdate() {}
}
`;
      const fileNode = makeFileNode('src/users/users.controller.ts');
      const analysis = makeAnalysis([fileNode]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.ts') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      expect(endpoints).toHaveLength(6);
      expect(endpoints.map((e) => e.id)).toEqual([
        'GET /users',
        'GET /users/:id',
        'POST /users',
        'PUT /users/:id',
        'DELETE /users/:id',
        'PATCH /users/:id',
      ]);

      // Verify handler names
      expect(endpoints[0]!.handler).toBe('findAll');
      expect(endpoints[1]!.handler).toBe('findOne');
      expect(endpoints[2]!.handler).toBe('create');

      (adapter as any).readSourceCode = originalReadSourceCode;
    });

    it('handles @Controller() with empty prefix', () => {
      const source = `
@Controller()
export class AppController {
  @Get('/health')
  health() {}
}
`;
      const fileNode = makeFileNode('src/app.controller.ts');
      const analysis = makeAnalysis([fileNode]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.ts') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0]!.path).toBe('/health');

      (adapter as any).readSourceCode = originalReadSourceCode;
    });

    it('handles async methods and access modifiers', () => {
      const source = `
@Controller('/items')
export class ItemsController {
  @Get()
  async findAll() {}

  @Post()
  public async create() {}

  @Delete('/:id')
  protected remove() {}
}
`;
      const fileNode = makeFileNode('src/items.controller.ts');
      const analysis = makeAnalysis([fileNode]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.ts') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      expect(endpoints).toHaveLength(3);
      expect(endpoints[0]!.handler).toBe('findAll');
      expect(endpoints[1]!.handler).toBe('create');
      expect(endpoints[2]!.handler).toBe('remove');

      (adapter as any).readSourceCode = originalReadSourceCode;
    });

    it('handles multiple controllers in one file', () => {
      const source = `
@Controller('/cats')
export class CatsController {
  @Get()
  findAll() {}
}

@Controller('/dogs')
export class DogsController {
  @Get()
  findAll() {}
}
`;
      const fileNode = makeFileNode('src/animals.controller.ts');
      const analysis = makeAnalysis([fileNode]);
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) =>
        node.filePath.endsWith('.ts') ? source : '';

      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      expect(endpoints).toHaveLength(2);
      expect(endpoints[0]!.path).toBe('/cats');
      expect(endpoints[1]!.path).toBe('/dogs');

      (adapter as any).readSourceCode = originalReadSourceCode;
    });

    it('returns empty for non-TS files', () => {
      const fileNode = makeFileNode('src/app.js');
      const analysis = makeAnalysis([fileNode]);
      const ctx = makeContext(analysis);
      const endpoints = adapter.extractEndpoints(ctx);

      expect(endpoints).toHaveLength(0);
    });
  });
});
