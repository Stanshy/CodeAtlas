/**
 * CodeAtlas Web — useGraphData Hook
 *
 * Orchestrates data loading: fetch → adapt → state management.
 * Returns React Flow-ready nodes/edges with loading/error states.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { fetchGraph } from '../api/graph';
import { adaptGraph } from '../adapters/graph-adapter';
import type { NeonNodeData, NeonEdgeData } from '../adapters/graph-adapter';
import type { AnalysisStats, GraphNode, GraphEdge, DirectoryGraph, EndpointGraph, EndpointNode, EndpointEdge } from '../types/graph';

// ---------------------------------------------------------------------------
// Transform API endpoint data → web EndpointGraph format
// ---------------------------------------------------------------------------

interface ApiEndpointRaw {
  id: string;
  method: string;
  path: string;
  handler: string;
  handlerFileId: string;
  description?: string;
}

interface ApiChainStepRaw {
  name: string;
  method: string;
  className?: string;
  fileId: string;
  description?: string;
  input?: string;
  output?: string;
  transform?: string;
}

interface ApiEndpointChainRaw {
  endpointId: string;
  steps: ApiChainStepRaw[];
}

interface ApiEndpointGraphRaw {
  endpoints: ApiEndpointRaw[];
  chains: ApiEndpointChainRaw[];
}

function transformEndpointGraph(raw: ApiEndpointGraphRaw): EndpointGraph {
  const nodes: EndpointNode[] = [];
  const edges: EndpointEdge[] = [];
  const nodeIdSet = new Set<string>();

  // 1. Create endpoint nodes
  for (const ep of raw.endpoints) {
    const node: EndpointNode = {
      id: ep.id,
      label: `${ep.method} ${ep.path}`,
      method: ep.method,
      path: ep.path,
      filePath: ep.handlerFileId,
      kind: 'endpoint',
    };
    // Sprint 15.1: Wire AI description from merged endpoint
    if (ep.description) node.description = ep.description;
    nodes.push(node);
    nodeIdSet.add(ep.id);
  }

  // 2. Create method nodes from chain steps + edges
  for (const chain of raw.chains) {
    if (chain.steps.length === 0) continue;

    let prevId = chain.endpointId;

    for (let i = 0; i < chain.steps.length; i++) {
      const step = chain.steps[i];
      const stepId = `${chain.endpointId}::step-${i}::${step.method}`;

      if (!nodeIdSet.has(stepId)) {
        const stepNode: EndpointNode = {
          id: stepId,
          label: step.name,
          method: step.method,
          filePath: step.fileId,
          kind: 'method',
        };
        // Sprint 15.1: Wire AI step description
        if (step.description) stepNode.description = step.description;
        nodes.push(stepNode);
        nodeIdSet.add(stepId);
      }

      edges.push({
        source: prevId,
        target: stepId,
        weight: 1,
      });

      prevId = stepId;
    }
  }

  return { nodes, edges };
}

export interface UseGraphDataResult {
  /** React Flow nodes (for GraphCanvas) */
  nodes: Node<NeonNodeData>[];
  /** React Flow edges (for GraphCanvas) */
  edges: Edge<NeonEdgeData>[];
  /** Raw graph nodes from API (for SF panel, E2E tracing, future Wiki graph) */
  rawNodes: GraphNode[];
  /** Raw graph edges from API (for SF panel, E2E tracing, future Wiki graph) */
  rawEdges: GraphEdge[];
  /** Sprint 12: optional directory-level graph (system-framework perspective) */
  directoryGraph: DirectoryGraph | null;
  /** Sprint 13: optional endpoint-level graph (data-journey / logic-operation perspectives) */
  endpointGraph: EndpointGraph | null;
  stats: AnalysisStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useGraphData(): UseGraphDataResult {
  const [nodes, setNodes] = useState<Node<NeonNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge<NeonEdgeData>[]>([]);
  const [rawNodes, setRawNodes] = useState<GraphNode[]>([]);
  const [rawEdges, setRawEdges] = useState<GraphEdge[]>([]);
  const [directoryGraph, setDirectoryGraph] = useState<DirectoryGraph | null>(null);
  const [endpointGraph, setEndpointGraph] = useState<EndpointGraph | null>(null);
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await fetchGraph();

    if (!result.ok) {
      setError(result.error.message);
      setIsLoading(false);
      return;
    }

    const { nodes: rfNodes, edges: rfEdges } = adaptGraph(result.data);
    setNodes(rfNodes);
    setEdges(rfEdges);
    setRawNodes(result.data.graph.nodes);
    setRawEdges(result.data.graph.edges);
    setDirectoryGraph(result.data.directoryGraph ?? null);

    // Transform API endpoint format { endpoints, chains } → web format { nodes, edges }
    const rawEpGraph = result.data.endpointGraph as ApiEndpointGraphRaw | null | undefined;
    if (rawEpGraph && Array.isArray(rawEpGraph.endpoints) && rawEpGraph.endpoints.length > 0) {
      setEndpointGraph(transformEndpointGraph(rawEpGraph));
    } else {
      setEndpointGraph(null);
    }
    setStats(result.data.stats);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return { nodes, edges, rawNodes, rawEdges, directoryGraph, endpointGraph, stats, isLoading, error, refetch: loadData };
}
