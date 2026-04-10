/**
 * graph-adapter unit tests
 *
 * Tests: GraphNode→RF Node, GraphEdge→RF Edge, empty graph, metadata preservation,
 * directory parentId resolution, edge type mapping.
 */

import { describe, it, expect } from 'vitest';
import { toReactFlowNodes, toReactFlowEdges, adaptGraph } from '../src/adapters/graph-adapter';
import type { GraphNode, GraphEdge, AnalysisResult } from '../src/types/graph';

// --- Test Data ---

const fileNode: GraphNode = {
  id: 'src/utils/helper.ts',
  type: 'file',
  label: 'helper.ts',
  filePath: 'src/utils/helper.ts',
  metadata: { fileSize: 1024, language: 'typescript', importCount: 3, exportCount: 2 },
};

const dirNode: GraphNode = {
  id: 'src/utils',
  type: 'directory',
  label: 'utils',
  filePath: 'src/utils',
  metadata: {},
};

const rootFileNode: GraphNode = {
  id: 'index.ts',
  type: 'file',
  label: 'index.ts',
  filePath: 'index.ts',
  metadata: {},
};

const importEdge: GraphEdge = {
  id: 'src/app.ts--import--src/utils/helper.ts',
  source: 'src/app.ts',
  target: 'src/utils/helper.ts',
  type: 'import',
  metadata: { importedSymbols: ['formatDate'], isDefault: false },
};

const exportEdge: GraphEdge = {
  id: 'src/index.ts--export--src/utils/helper.ts',
  source: 'src/index.ts',
  target: 'src/utils/helper.ts',
  type: 'export',
  metadata: {},
};

const dataFlowEdge: GraphEdge = {
  id: 'src/a.ts--data-flow--src/b.ts',
  source: 'src/a.ts',
  target: 'src/b.ts',
  type: 'data-flow',
  metadata: {},
};

// --- Tests ---

describe('toReactFlowNodes', () => {
  it('converts file node with correct type and data', () => {
    const result = toReactFlowNodes([fileNode]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('src/utils/helper.ts');
    expect(result[0].type).toBe('neonNode');
    expect(result[0].data.label).toBe('helper.ts');
    expect(result[0].data.filePath).toBe('src/utils/helper.ts');
    expect(result[0].data.nodeType).toBe('file');
    expect(result[0].data.metadata).toEqual(fileNode.metadata);
  });

  it('converts directory node with correct type', () => {
    const result = toReactFlowNodes([dirNode]);
    expect(result[0].type).toBe('directoryNode');
    expect(result[0].data.nodeType).toBe('directory');
  });

  it('does not set parentId for file nodes (parentId grouping removed — causes RF warnings)', () => {
    // parentId grouping was removed in Sprint 13 because D3 force / dagre layouts
    // do not use React Flow sub-flows and setting parentId caused "Parent node not
    // found" warnings. File nodes are positioned independently.
    const result = toReactFlowNodes([dirNode, fileNode]);
    const file = result.find((n) => n.id === fileNode.id);
    expect(file?.parentId).toBeUndefined();
  });

  it('does not set parentId for root-level files', () => {
    const result = toReactFlowNodes([dirNode, rootFileNode]);
    const root = result.find((n) => n.id === rootFileNode.id);
    expect(root?.parentId).toBeUndefined();
  });

  it('returns empty array for empty input', () => {
    expect(toReactFlowNodes([])).toEqual([]);
  });

  it('returns empty array for null-ish input', () => {
    expect(toReactFlowNodes(null as unknown as GraphNode[])).toEqual([]);
  });

  it('initializes positions to {x:0, y:0}', () => {
    const result = toReactFlowNodes([fileNode]);
    expect(result[0].position).toEqual({ x: 0, y: 0 });
  });

  it('preserves all metadata fields in data', () => {
    const result = toReactFlowNodes([fileNode]);
    expect(result[0].data.metadata.fileSize).toBe(1024);
    expect(result[0].data.metadata.language).toBe('typescript');
    expect(result[0].data.metadata.importCount).toBe(3);
    expect(result[0].data.metadata.exportCount).toBe(2);
  });
});

describe('toReactFlowEdges', () => {
  it('converts import edge with correct type and data', () => {
    const result = toReactFlowEdges([importEdge]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(importEdge.id);
    expect(result[0].source).toBe('src/app.ts');
    expect(result[0].target).toBe('src/utils/helper.ts');
    expect(result[0].type).toBe('neonEdge');
    expect(result[0].data?.edgeType).toBe('import');
    expect(result[0].data?.metadata.importedSymbols).toEqual(['formatDate']);
  });

  it('converts export edge', () => {
    const result = toReactFlowEdges([exportEdge]);
    expect(result[0].data?.edgeType).toBe('export');
  });

  it('converts data-flow edge', () => {
    const result = toReactFlowEdges([dataFlowEdge]);
    expect(result[0].data?.edgeType).toBe('data-flow');
  });

  it('returns empty array for empty input', () => {
    expect(toReactFlowEdges([])).toEqual([]);
  });

  it('returns empty array for null-ish input', () => {
    expect(toReactFlowEdges(null as unknown as GraphEdge[])).toEqual([]);
  });
});

describe('adaptGraph', () => {
  it('converts full AnalysisResult', () => {
    const analysis: AnalysisResult = {
      version: '0.1.0',
      projectPath: '/test',
      analyzedAt: '2026-03-30T00:00:00Z',
      stats: {
        totalFiles: 2,
        analyzedFiles: 2,
        skippedFiles: 0,
        failedFiles: 0,
        totalNodes: 3,
        totalEdges: 1,
        analysisDurationMs: 100,
      },
      graph: {
        nodes: [dirNode, fileNode],
        edges: [importEdge],
      },
      errors: [],
    };
    const { nodes, edges } = adaptGraph(analysis);
    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(1);
  });

  it('handles empty graph gracefully', () => {
    const analysis: AnalysisResult = {
      version: '0.1.0',
      projectPath: '/test',
      analyzedAt: '2026-03-30T00:00:00Z',
      stats: {
        totalFiles: 0,
        analyzedFiles: 0,
        skippedFiles: 0,
        failedFiles: 0,
        totalNodes: 0,
        totalEdges: 0,
        analysisDurationMs: 0,
      },
      graph: { nodes: [], edges: [] },
      errors: [],
    };
    const { nodes, edges } = adaptGraph(analysis);
    expect(nodes).toEqual([]);
    expect(edges).toEqual([]);
  });
});
