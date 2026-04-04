/**
 * CodeAtlas Web — Graph Adapter
 *
 * Converts AnalysisResult (core format) → React Flow nodes/edges.
 *
 * Mapping rules:
 *   - GraphNode → RF Node: id preserved, label→data.label, type maps to custom node component
 *   - GraphEdge → RF Edge: source/target preserved, type maps to 'neonEdge'
 *   - Directory nodes → parentId logic for grouping
 *   - Empty graph → empty arrays (never throw)
 */

import type { Node, Edge } from '@xyflow/react';
import type {
  AnalysisResult,
  GraphNode,
  GraphEdge,
  NodeMetadata,
  EdgeMetadata,
  NodeType,
  NodeRole,
  FilterState,
  ViewModeName,
  PerspectiveName,
  DirectoryGraph,
  EndpointGraph,
} from '../types/graph';
import { VIEW_MODE_PRESETS } from './view-modes';
import { PERSPECTIVE_PRESETS } from './perspective-presets';

// === React Flow Node/Edge Data Types ===

export interface NeonNodeData extends Record<string, unknown> {
  label: string;
  filePath: string;
  nodeType: NodeType;
  metadata: NodeMetadata;
}

export interface NeonEdgeData extends Record<string, unknown> {
  edgeType: GraphEdge['type'];
  metadata: EdgeMetadata;
}

// === RF Node type strings ===

const NODE_TYPE_MAP: Record<NodeType, string> = {
  directory: 'directoryNode',
  file: 'neonNode',
  function: 'functionNode',  // Sprint 7: dedicated function node component
  class: 'classNode',        // Sprint 7: dedicated class node component
};

/**
 * Extract the parent directory id from a file path.
 * e.g. "src/utils/helper.ts" → "src/utils"
 *
 * Returns undefined if the node is at root level.
 */
function findParentDirectoryId(
  filePath: string,
  directoryIds: Set<string>,
): string | undefined {
  const parts = filePath.split('/');
  // Walk up from immediate parent to root, find the first matching directory node
  for (let i = parts.length - 1; i > 0; i--) {
    const candidate = parts.slice(0, i).join('/');
    if (directoryIds.has(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

/**
 * Convert GraphNode[] → React Flow Node[]
 */
export function toReactFlowNodes(nodes: GraphNode[]): Node<NeonNodeData>[] {
  if (!nodes || nodes.length === 0) return [];

  // Collect directory ids for parent resolution
  const directoryIds = new Set<string>(
    nodes.filter((n) => n.type === 'directory').map((n) => n.id),
  );

  return nodes.map((node) => {
    const rfNode: Node<NeonNodeData> = {
      id: node.id,
      type: NODE_TYPE_MAP[node.type] ?? 'neonNode',
      position: { x: 0, y: 0 }, // Placeholder — D3 force layout will set real positions
      data: {
        label: node.label,
        filePath: node.filePath,
        nodeType: node.type,
        metadata: node.metadata,
      },
    };

    // Note: parentId grouping removed — D3 force / dagre layouts don't use
    // React Flow parent-child nesting, and SF mode builds its own nodes.
    // Setting parentId here caused "Parent node not found" warnings when
    // curation filtered out directories but kept their child files.

    return rfNode;
  });
}

/**
 * Convert GraphEdge[] → React Flow Edge[]
 */
export function toReactFlowEdges(edges: GraphEdge[]): Edge<NeonEdgeData>[] {
  if (!edges || edges.length === 0) return [];

  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    // Sprint 7: call edges use dedicated callEdge component
    type: edge.type === 'call' ? 'callEdge' : 'neonEdge',
    data: {
      edgeType: edge.type,
      metadata: edge.metadata,
    },
  }));
}

/**
 * Convert full AnalysisResult → React Flow nodes + edges
 */
export function adaptGraph(result: AnalysisResult): {
  nodes: Node<NeonNodeData>[];
  edges: Edge<NeonEdgeData>[];
} {
  const nodes = toReactFlowNodes(result.graph.nodes);
  const edges = toReactFlowEdges(result.graph.edges);
  return { nodes, edges };
}

// === Sprint 8: Filter functions ===

/**
 * Filter nodes by FilterState.
 * Empty arrays in FilterState mean "select all" (no filtering).
 */
export function filterNodes(
  nodes: GraphNode[],
  filter: FilterState,
): GraphNode[] {
  return nodes.filter((node) => {
    // Directory filter: empty = select all
    if (filter.directories.length > 0) {
      const matchesDir = filter.directories.some((dir) =>
        node.filePath.startsWith(dir) || node.filePath === dir || node.id === dir,
      );
      if (!matchesDir) return false;
    }

    // Node type filter: empty = select all
    if (filter.nodeTypes.length > 0) {
      if (!filter.nodeTypes.includes(node.type)) return false;
    }

    return true;
  });
}

/**
 * Filter edges by filtered node set and edge type.
 * Both source and target must exist in filteredNodeIds.
 */
export function filterEdges(
  edges: GraphEdge[],
  filteredNodeIds: Set<string>,
  filter: FilterState,
): GraphEdge[] {
  return edges.filter((edge) => {
    // Both endpoints must be in filtered set
    if (!filteredNodeIds.has(edge.source) || !filteredNodeIds.has(edge.target)) {
      return false;
    }

    // Edge type filter: empty = select all
    if (filter.edgeTypes.length > 0) {
      if (!filter.edgeTypes.includes(edge.type)) return false;
    }

    return true;
  });
}

/**
 * Apply view mode preset filtering.
 * Uses the preset's filter config to filter nodes and edges.
 * Returns filtered nodes + edges.
 *
 * Sprint 9 — S9-2: View mode presets.
 * @deprecated Use applyPerspective() instead (Sprint 11).
 */
export function applyViewMode(
  nodes: GraphNode[],
  edges: GraphEdge[],
  mode: ViewModeName,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const preset = VIEW_MODE_PRESETS[mode];

  // Build a FilterState from the preset
  const presetFilter: FilterState = {
    directories: [],  // View modes don't filter by directory
    nodeTypes: preset.filter.nodeTypes,
    edgeTypes: preset.filter.edgeTypes,
  };

  const filteredNodes = filterNodes(nodes, presetFilter);
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = filterEdges(edges, filteredNodeIds, presetFilter);

  return { nodes: filteredNodes, edges: filteredEdges };
}

/**
 * Convert a DirectoryGraph (directory-level overview) into React Flow nodes + edges.
 * Directory nodes are rendered with the 'directoryCard' node type.
 *
 * Sprint 12 — T4.
 */
export function adaptDirectoryGraph(dirGraph: DirectoryGraph): {
  nodes: Node<NeonNodeData>[];
  edges: Edge<NeonEdgeData>[];
} {
  const nodes: Node<NeonNodeData>[] = dirGraph.nodes.map((dn) => ({
    id: dn.id,
    type: 'directoryCard',
    position: { x: 0, y: 0 }, // layout engine sets real positions
    data: {
      label: dn.label,
      filePath: dn.id,
      nodeType: 'directory' as NodeType,
      // directoryType exposes the structural classification (entry/logic/data/support)
      // so the dagre layout can assign sensible ranks to isolated nodes.
      directoryType: dn.type,
      metadata: {
        role: dn.role,
        fileSize: dn.fileCount,
      } as NodeMetadata,
    },
  }));

  let edgeIndex = 0;
  const edges: Edge<NeonEdgeData>[] = dirGraph.edges.map((de) => ({
    id: `dir-edge-${edgeIndex++}`,
    source: de.source,
    target: de.target,
    type: 'neonEdge',
    data: {
      edgeType: 'import',
      metadata: {
        confidence: 'high',
      } as EdgeMetadata,
    },
  }));

  return { nodes, edges };
}

/**
 * Apply perspective preset filtering.
 * Replaces applyViewMode() as the primary filter in Sprint 11.
 * Uses PERSPECTIVE_PRESETS to determine which node/edge types to include.
 *
 * Sprint 12 — T4: when perspective is 'system-framework' and directoryGraph is
 * provided, returns directory-level nodes/edges instead of file-level ones.
 *
 * Sprint 13 — T4: when perspective is 'data-journey' or 'logic-operation' and
 * endpointGraph is provided, use endpoint/method-level data.
 *
 * Sprint 11 — T4.
 */
export function applyPerspective(
  nodes: GraphNode[],
  edges: GraphEdge[],
  perspective: PerspectiveName,
  directoryGraph?: DirectoryGraph,
  endpointGraph?: EndpointGraph,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  // Sprint 12: system-framework with directory data → use directory-level graph
  if (perspective === 'system-framework' && directoryGraph && directoryGraph.nodes.length > 0) {
    // Convert DirectoryGraph nodes to GraphNode format so the rest of the pipeline
    // (curation, RF conversion) can process them uniformly.
    const dirNodes: GraphNode[] = directoryGraph.nodes.map((dn) => ({
      id: dn.id,
      type: 'directory' as NodeType,
      label: dn.label,
      filePath: dn.id,
      metadata: {
        role: dn.role,
        fileSize: dn.fileCount,
        // Sprint 13 T3: pass through category/sublabel/autoExpand for DirectoryCard rendering
        category: (dn as Record<string, unknown>).category,
        sublabel: (dn as Record<string, unknown>).sublabel,
        autoExpand: (dn as Record<string, unknown>).autoExpand,
        // Sprint 13: pass DirectoryType (entry/logic/data/support) for card color theming
        directoryType: dn.type,
      } as NodeMetadata,
    }));

    let edgeIndex = 0;
    const dirEdges: GraphEdge[] = directoryGraph.edges.map((de) => ({
      id: `dir-edge-${edgeIndex++}`,
      source: de.source,
      target: de.target,
      type: 'import' as GraphEdge['type'],
      metadata: { confidence: 'high' } as EdgeMetadata,
    }));

    return { nodes: dirNodes, edges: dirEdges };
  }

  // Sprint 13: data-journey ('endpoint') — use endpoint graph nodes if available
  if (perspective === 'data-journey' && endpointGraph && endpointGraph.nodes.length > 0) {
    const endpointNodes: GraphNode[] = endpointGraph.nodes.map((en) => ({
      id: en.id,
      type: 'file' as NodeType,
      label: en.label,
      filePath: en.filePath,
      metadata: {
        role: 'business-logic',
      } as NodeMetadata,
    }));

    let edgeIdx = 0;
    const endpointEdges: GraphEdge[] = endpointGraph.edges.map((ee) => ({
      id: `ep-edge-${edgeIdx++}`,
      source: ee.source,
      target: ee.target,
      type: 'data-flow' as GraphEdge['type'],
      metadata: { confidence: 'high' } as EdgeMetadata,
    }));

    return { nodes: endpointNodes, edges: endpointEdges };
  }

  // Sprint 13: logic-operation ('method') — use endpoint graph for method-level data if available
  if (perspective === 'logic-operation' && endpointGraph && endpointGraph.nodes.length > 0) {
    const methodNodes: GraphNode[] = endpointGraph.nodes.map((en) => ({
      id: en.id,
      type: 'function' as NodeType,
      label: en.label,
      filePath: en.filePath,
      metadata: {
        role: 'business-logic',
        kind: 'method',
      } as NodeMetadata,
    }));

    let edgeIdx = 0;
    const methodEdges: GraphEdge[] = endpointGraph.edges.map((ee) => ({
      id: `method-edge-${edgeIdx++}`,
      source: ee.source,
      target: ee.target,
      type: 'call' as GraphEdge['type'],
      metadata: { confidence: 'high' } as EdgeMetadata,
    }));

    return { nodes: methodNodes, edges: methodEdges };
  }

  const preset = PERSPECTIVE_PRESETS[perspective];

  const presetFilter: FilterState = {
    directories: [],
    nodeTypes: preset.filter.nodeTypes,
    edgeTypes: preset.filter.edgeTypes,
  };

  const filteredNodes = filterNodes(nodes, presetFilter);
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = filterEdges(edges, filteredNodeIds, presetFilter);

  return { nodes: filteredNodes, edges: filteredEdges };
}

/**
 * Apply smart curation: hide utility + noise nodes, show business-logic + cross-cutting.
 * Infrastructure nodes are shown but with reduced opacity (handled by NeonNode).
 *
 * Sprint 10 — S10-2: Smart Curation.
 * No "show all" option — this is a product direction decision.
 */
export function applyCuration(
  nodes: GraphNode[],
  edges: GraphEdge[],
  pinnedNodeIds: Set<string>,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const visibleNodes = nodes.filter(node => {
    const role: NodeRole = (node.metadata.role as NodeRole) ?? 'infrastructure';

    // business-logic + cross-cutting → always show
    if (role === 'business-logic' || role === 'cross-cutting') return true;

    // infrastructure directories → only show top-level (depth ≤ 2 segments)
    // e.g. "packages" (1), "packages/core" (2) → show; "packages/core/src" (3) → hide
    if (role === 'infrastructure') {
      if (node.type === 'directory') {
        const depth = (node.filePath ?? node.id).split('/').length;
        return depth <= 2 || pinnedNodeIds.has(node.id);
      }
      // infrastructure files → hide unless pinned (they're configs, etc.)
      return pinnedNodeIds.has(node.id);
    }

    // utility + noise → hidden unless pinned
    if (pinnedNodeIds.has(node.id)) return true;

    return false;
  });

  // Safety valve: if curation leaves < 5 nodes, relax to show all non-noise
  if (visibleNodes.length < 5 && nodes.length >= 5) {
    const relaxedNodes = nodes.filter(node => {
      const role: NodeRole = (node.metadata.role as NodeRole) ?? 'infrastructure';
      return role !== 'noise' || pinnedNodeIds.has(node.id);
    });
    const relaxedIds = new Set(relaxedNodes.map(n => n.id));
    const relaxedEdges = edges.filter(e => relaxedIds.has(e.source) && relaxedIds.has(e.target));
    return { nodes: relaxedNodes, edges: relaxedEdges };
  }

  // Edge filtering: both endpoints must be visible
  const visibleIds = new Set(visibleNodes.map(n => n.id));
  const visibleEdges = edges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target));

  return { nodes: visibleNodes, edges: visibleEdges };
}
