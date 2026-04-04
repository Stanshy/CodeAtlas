/**
 * graph-adapter — directoryGraph routing unit tests
 *
 * Coverage:
 *   - applyPerspective('system-framework') with directoryGraph → returns directory nodes/edges
 *   - applyPerspective('system-framework') without directoryGraph → falls back to file-level filter
 *   - applyPerspective('logic-operation') with directoryGraph → ignores directoryGraph, uses file nodes
 *   - applyPerspective('data-journey') with directoryGraph → ignores directoryGraph, uses file nodes
 *   - adaptDirectoryGraph converts DirectoryGraph to RF-compatible nodes/edges
 *   - adaptDirectoryGraph node shape: id, type='directoryCard', position, data fields
 *   - adaptDirectoryGraph edge shape: id prefix 'dir-edge-', source, target, type='neonEdge'
 *   - adaptDirectoryGraph handles empty DirectoryGraph gracefully
 *
 * Sprint 12 — T11
 */

import { describe, it, expect } from 'vitest';
import { applyPerspective, adaptDirectoryGraph } from '../src/adapters/graph-adapter';
import type { GraphNode, GraphEdge, DirectoryGraph } from '../src/types/graph';

// ---------------------------------------------------------------------------
// Fixtures — file-level graph
// ---------------------------------------------------------------------------

const fileNodeA: GraphNode = {
  id: 'src/a.ts',
  type: 'file',
  label: 'a.ts',
  filePath: 'src/a.ts',
  metadata: { role: 'business-logic' },
};

const fileNodeB: GraphNode = {
  id: 'src/b.ts',
  type: 'file',
  label: 'b.ts',
  filePath: 'src/b.ts',
  metadata: { role: 'business-logic' },
};

const importEdge: GraphEdge = {
  id: 'a--import--b',
  source: 'src/a.ts',
  target: 'src/b.ts',
  type: 'import',
  metadata: {},
};

const callEdge: GraphEdge = {
  id: 'a--call--b',
  source: 'src/a.ts',
  target: 'src/b.ts',
  type: 'call',
  metadata: {},
};

const allFileNodes = [fileNodeA, fileNodeB];
const allFileEdges = [importEdge, callEdge];

// ---------------------------------------------------------------------------
// Fixtures — directory-level graph
// ---------------------------------------------------------------------------

const directoryGraph: DirectoryGraph = {
  nodes: [
    {
      id: 'src/controllers',
      label: 'controllers',
      type: 'entry',
      fileCount: 3,
      files: ['src/controllers/a.ts', 'src/controllers/b.ts', 'src/controllers/c.ts'],
      role: 'entry',
    },
    {
      id: 'src/services',
      label: 'services',
      type: 'logic',
      fileCount: 5,
      files: ['src/services/x.ts'],
      role: 'logic',
    },
  ],
  edges: [
    { source: 'src/controllers', target: 'src/services', weight: 3 },
  ],
};

const emptyDirectoryGraph: DirectoryGraph = {
  nodes: [],
  edges: [],
};

// ---------------------------------------------------------------------------
// applyPerspective — system-framework with directoryGraph
// ---------------------------------------------------------------------------

describe('applyPerspective — system-framework + directoryGraph routing', () => {
  it('returns directory nodes when directoryGraph is provided and non-empty', () => {
    const result = applyPerspective(allFileNodes, allFileEdges, 'system-framework', directoryGraph);
    // Should return directory-level nodes, not file-level nodes
    expect(result.nodes.some(n => n.type === 'directory')).toBe(true);
  });

  it('returns directory node IDs matching directoryGraph.nodes', () => {
    const result = applyPerspective(allFileNodes, allFileEdges, 'system-framework', directoryGraph);
    const resultIds = result.nodes.map(n => n.id);
    expect(resultIds).toContain('src/controllers');
    expect(resultIds).toContain('src/services');
  });

  it('does NOT return file-level nodes when directoryGraph is provided', () => {
    const result = applyPerspective(allFileNodes, allFileEdges, 'system-framework', directoryGraph);
    const resultIds = result.nodes.map(n => n.id);
    expect(resultIds).not.toContain('src/a.ts');
    expect(resultIds).not.toContain('src/b.ts');
  });

  it('returns directory-level edges derived from directoryGraph.edges', () => {
    const result = applyPerspective(allFileNodes, allFileEdges, 'system-framework', directoryGraph);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].source).toBe('src/controllers');
    expect(result.edges[0].target).toBe('src/services');
  });

  it('node count equals directoryGraph.nodes.length', () => {
    const result = applyPerspective(allFileNodes, allFileEdges, 'system-framework', directoryGraph);
    expect(result.nodes).toHaveLength(directoryGraph.nodes.length);
  });

  it('directory node metadata carries role from DirectoryNode', () => {
    const result = applyPerspective(allFileNodes, allFileEdges, 'system-framework', directoryGraph);
    const controllersNode = result.nodes.find(n => n.id === 'src/controllers');
    expect(controllersNode?.metadata.role).toBe('entry');
  });

  it('directory node metadata carries fileSize (fileCount) from DirectoryNode', () => {
    const result = applyPerspective(allFileNodes, allFileEdges, 'system-framework', directoryGraph);
    const servicesNode = result.nodes.find(n => n.id === 'src/services');
    expect(servicesNode?.metadata.fileSize).toBe(5);
  });

  it('falls back to file-level filter when directoryGraph is empty', () => {
    const result = applyPerspective(
      allFileNodes,
      allFileEdges,
      'system-framework',
      emptyDirectoryGraph,
    );
    // Empty directoryGraph → use file-level pipeline
    expect(result.nodes.some(n => n.type === 'file')).toBe(true);
  });

  it('falls back to file-level filter when directoryGraph is undefined', () => {
    const result = applyPerspective(allFileNodes, allFileEdges, 'system-framework', undefined);
    expect(result.nodes.some(n => n.type === 'file')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// applyPerspective — logic-operation ignores directoryGraph
// ---------------------------------------------------------------------------

describe('applyPerspective — logic-operation ignores directoryGraph', () => {
  it('returns file nodes even when directoryGraph is provided', () => {
    const result = applyPerspective(allFileNodes, allFileEdges, 'logic-operation', directoryGraph);
    const resultIds = result.nodes.map(n => n.id);
    expect(resultIds).toContain('src/a.ts');
    expect(resultIds).toContain('src/b.ts');
  });

  it('does not return directory nodes for logic-operation', () => {
    const result = applyPerspective(allFileNodes, allFileEdges, 'logic-operation', directoryGraph);
    expect(result.nodes.some(n => n.id === 'src/controllers')).toBe(false);
  });

  it('keeps all edges for logic-operation (empty filter = select all)', () => {
    const result = applyPerspective(allFileNodes, allFileEdges, 'logic-operation', directoryGraph);
    expect(result.edges).toHaveLength(allFileEdges.length);
  });
});

// ---------------------------------------------------------------------------
// applyPerspective — data-journey ignores directoryGraph
// ---------------------------------------------------------------------------

describe('applyPerspective — data-journey ignores directoryGraph', () => {
  it('returns file nodes even when directoryGraph is provided', () => {
    const result = applyPerspective(allFileNodes, allFileEdges, 'data-journey', directoryGraph);
    const resultIds = result.nodes.map(n => n.id);
    expect(resultIds).toContain('src/a.ts');
    expect(resultIds).toContain('src/b.ts');
  });

  it('does not return directory nodes for data-journey', () => {
    const result = applyPerspective(allFileNodes, allFileEdges, 'data-journey', directoryGraph);
    expect(result.nodes.some(n => n.id === 'src/services')).toBe(false);
  });

  it('keeps all edges for data-journey (empty filter = select all)', () => {
    const result = applyPerspective(allFileNodes, allFileEdges, 'data-journey', directoryGraph);
    expect(result.edges).toHaveLength(allFileEdges.length);
  });
});

// ---------------------------------------------------------------------------
// adaptDirectoryGraph — RF node/edge conversion
// ---------------------------------------------------------------------------

describe('adaptDirectoryGraph — node conversion', () => {
  it('returns the correct number of RF nodes', () => {
    const { nodes } = adaptDirectoryGraph(directoryGraph);
    expect(nodes).toHaveLength(directoryGraph.nodes.length);
  });

  it('RF node id matches DirectoryNode id', () => {
    const { nodes } = adaptDirectoryGraph(directoryGraph);
    const ids = nodes.map(n => n.id);
    expect(ids).toContain('src/controllers');
    expect(ids).toContain('src/services');
  });

  it('RF node type is "directoryCard"', () => {
    const { nodes } = adaptDirectoryGraph(directoryGraph);
    nodes.forEach((node) => {
      expect(node.type).toBe('directoryCard');
    });
  });

  it('RF node position initializes to {x:0, y:0}', () => {
    const { nodes } = adaptDirectoryGraph(directoryGraph);
    nodes.forEach((node) => {
      expect(node.position).toEqual({ x: 0, y: 0 });
    });
  });

  it('RF node data.label matches DirectoryNode label', () => {
    const { nodes } = adaptDirectoryGraph(directoryGraph);
    const controllersNode = nodes.find(n => n.id === 'src/controllers');
    expect(controllersNode?.data.label).toBe('controllers');
  });

  it('RF node data.nodeType is "directory"', () => {
    const { nodes } = adaptDirectoryGraph(directoryGraph);
    nodes.forEach((node) => {
      expect(node.data.nodeType).toBe('directory');
    });
  });

  it('RF node data.metadata.role carries DirectoryNode role', () => {
    const { nodes } = adaptDirectoryGraph(directoryGraph);
    const servicesNode = nodes.find(n => n.id === 'src/services');
    expect(servicesNode?.data.metadata.role).toBe('logic');
  });

  it('RF node data.metadata.fileSize carries DirectoryNode fileCount', () => {
    const { nodes } = adaptDirectoryGraph(directoryGraph);
    const controllersNode = nodes.find(n => n.id === 'src/controllers');
    expect(controllersNode?.data.metadata.fileSize).toBe(3);
  });
});

describe('adaptDirectoryGraph — edge conversion', () => {
  it('returns the correct number of RF edges', () => {
    const { edges } = adaptDirectoryGraph(directoryGraph);
    expect(edges).toHaveLength(directoryGraph.edges.length);
  });

  it('RF edge id starts with "dir-edge-"', () => {
    const { edges } = adaptDirectoryGraph(directoryGraph);
    edges.forEach((edge) => {
      expect(edge.id).toMatch(/^dir-edge-/);
    });
  });

  it('RF edge source matches DirectoryEdge source', () => {
    const { edges } = adaptDirectoryGraph(directoryGraph);
    expect(edges[0].source).toBe('src/controllers');
  });

  it('RF edge target matches DirectoryEdge target', () => {
    const { edges } = adaptDirectoryGraph(directoryGraph);
    expect(edges[0].target).toBe('src/services');
  });

  it('RF edge type is "neonEdge"', () => {
    const { edges } = adaptDirectoryGraph(directoryGraph);
    edges.forEach((edge) => {
      expect(edge.type).toBe('neonEdge');
    });
  });

  it('RF edge data.edgeType is "import"', () => {
    const { edges } = adaptDirectoryGraph(directoryGraph);
    edges.forEach((edge) => {
      expect(edge.data?.edgeType).toBe('import');
    });
  });
});

describe('adaptDirectoryGraph — empty graph', () => {
  it('returns empty nodes array for empty DirectoryGraph', () => {
    const { nodes } = adaptDirectoryGraph(emptyDirectoryGraph);
    expect(nodes).toEqual([]);
  });

  it('returns empty edges array for empty DirectoryGraph', () => {
    const { edges } = adaptDirectoryGraph(emptyDirectoryGraph);
    expect(edges).toEqual([]);
  });
});
