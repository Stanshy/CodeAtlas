/**
 * useGraphCanvasFiltering — extracted from GraphCanvas.tsx (Sprint 17 refactor)
 *
 * Handles the full filtering pipeline:
 *   rawGraphNodes / rawGraphEdges → perspective filter → curation filter
 *   djEntryNodeIds / djExitNodeIds memos
 *   Produces curationFilteredNodes / curationFilteredEdges for consumption by
 *   the parent component and other hooks.
 */

import { useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { GraphNode, GraphEdge, DirectoryGraph, EndpointGraph } from '../types/graph';
import type { NeonNodeData, NeonEdgeData } from '../adapters/graph-adapter';
import type { DJSelectorNodeData } from '../components/DJSelectorCardNode';
import type { LOCategoryCardData, MethodItem } from '../components/LOCategoryCardNode';
import type { LoCategory } from '../components/LOCategoryGroup';

import {
  filterNodes,
  filterEdges,
  applyPerspective,
  applyCuration,
} from '../adapters/graph-adapter';
import { PERSPECTIVE_PRESETS } from '../adapters/perspective-presets';
import { classifyPath, CATEGORY_CONFIG } from '../components/LOCategoryGroup';
import { parseUrlPrefix, CATEGORY_META } from '../components/DJEndpointSelector';
import { deriveEndpointLabel } from '../utils/dj-descriptions';
import type { FilterState, PerspectiveName } from '../types/graph';

export interface UseGraphCanvasFilteringParams {
  initialNodes: Node<NeonNodeData>[];
  initialEdges: Edge<NeonEdgeData>[];
  filter: FilterState;
  activePerspective: PerspectiveName;
  pinnedNodeIds: string[];
  directoryGraph: DirectoryGraph | null | undefined;
  endpointGraph: EndpointGraph | null | undefined;
  /** Stable callback ref — read from loMethodClickRef.current inside curation memo */
  onLOMethodClick: (name: string, category: LoCategory) => void;
}

export interface UseGraphCanvasFilteringResult {
  rawGraphNodes: GraphNode[];
  rawGraphEdges: GraphEdge[];
  curationFilteredNodes: Node[];
  curationFilteredEdges: Edge[];
  djEntryNodeIds: Set<string>;
  djExitNodeIds: Set<string>;
  isDagreLayout: boolean;
  isForceDisabled: boolean;
  medianDependencyCount: number;
}

export function useGraphCanvasFiltering({
  initialNodes,
  initialEdges,
  filter,
  activePerspective,
  pinnedNodeIds,
  directoryGraph,
  endpointGraph,
  onLOMethodClick,
}: UseGraphCanvasFilteringParams): UseGraphCanvasFilteringResult {
  const isDataJourney = activePerspective === 'data-journey';

  // Sprint 10 T10: Convert RF nodes → raw GraphNode[] once, reuse downstream.
  const rawGraphNodes = useMemo<GraphNode[]>(
    () => initialNodes.map((n) => ({
      id: n.id,
      type: (n.data).nodeType,
      label: (n.data).label,
      filePath: (n.data).filePath,
      metadata: (n.data).metadata,
    })),
    [initialNodes],
  );

  const rawGraphEdges = useMemo<GraphEdge[]>(
    () => initialEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: (e.data)?.edgeType ?? 'import',
      metadata: (e.data)?.metadata,
    })),
    [initialEdges],
  );

  // Sprint 8 + 9 + 10 + 11: Unified filtering pipeline
  const { curationFilteredNodes, curationFilteredEdges } = useMemo(() => {
    // Stage 1: Manual filter (Sprint 8)
    const filtered = filterNodes(rawGraphNodes, filter);
    const filteredIds = new Set(filtered.map((n) => n.id));
    const filteredEdgesRaw = filterEdges(rawGraphEdges, filteredIds, filter);

    // Stage 2: Perspective filter (Sprint 11 — replaces ViewMode)
    let stageNodes = filtered;
    let stageEdges = filteredEdgesRaw;
    if (activePerspective !== 'logic-operation') {
      const perspectiveFiltered = applyPerspective(
        stageNodes,
        stageEdges,
        activePerspective,
        directoryGraph ?? undefined,
        endpointGraph ?? undefined,
      );
      stageNodes = perspectiveFiltered.nodes;
      stageEdges = perspectiveFiltered.edges;
    }

    // Sprint 13: LO → produce category card RF nodes on canvas (pannable like SF)
    if (activePerspective === 'logic-operation') {
      const methodMap = new Map<LoCategory, MethodItem[]>();
      (Object.keys(CATEGORY_CONFIG) as LoCategory[]).forEach((cat) => methodMap.set(cat, []));

      // Build a set of method labels that actually appear in endpoint chains
      // Only these methods get ★ and are clickable for chain view
      const chainMethodLabels = new Set<string>();
      if (endpointGraph) {
        for (const node of endpointGraph.nodes) {
          if (node.kind === 'method' || node.kind === 'handler') {
            chainMethodLabels.add(node.label.replace(/\(\)$/, ''));
          }
        }
      }

      const isEntryMethod = (name: string, _nodeId: string): boolean => {
        const bare = name.replace(/\(\)$/, '');
        return chainMethodLabels.has(bare);
      };

      rawGraphNodes
        .filter((n) => n.type === 'function' || n.metadata?.kind === 'method' || n.metadata?.kind === 'function')
        .forEach((n) => {
          const cat = classifyPath(n.filePath);
          const item: MethodItem = {
            name: n.label,
            filePath: n.filePath,
            nodeId: n.id,
            isEntry: isEntryMethod(n.label, n.id),
          };
          if (n.metadata?.methodRole) item.methodRole = n.metadata.methodRole;
          if (n.metadata?.roleConfidence) item.roleConfidence = n.metadata.roleConfidence;
          if (n.metadata?.aiSummary) item.aiSummary = n.metadata.aiSummary;
          methodMap.get(cat)!.push(item);
        });

      if (endpointGraph) {
        endpointGraph.nodes
          .filter((en) => en.kind === 'method' || en.kind === 'handler')
          .forEach((en) => {
            const cat = classifyPath(en.filePath);
            const list = methodMap.get(cat)!;
            if (!list.some((m) => m.name === en.label && m.filePath === en.filePath)) {
              list.push({
                name: en.label,
                filePath: en.filePath,
                nodeId: en.id,
                isEntry: isEntryMethod(en.label, en.id),
              });
            }
          });
      }

      const onMethodClick = (name: string, category: LoCategory) => onLOMethodClick(name, category);

      const CARD_W = 240;
      const GAP_Y = 60;
      const layers: LoCategory[][] = [['middleware'], ['services'], ['routes', 'models', 'utils']];
      const rfNodes: Node[] = [];
      const rfEdges: Edge[] = [];
      let curY = 0;

      for (const layer of layers) {
        const layerW = layer.length * CARD_W + (layer.length - 1) * 60;
        const startX = -layerW / 2;
        for (let i = 0; i < layer.length; i++) {
          const cat = layer[i];
          const cfg = CATEGORY_CONFIG[cat];
          const methods = methodMap.get(cat) ?? [];
          rfNodes.push({
            id: `lo-cat-${cat}`,
            type: 'loCategoryCard' as const,
            position: { x: startX + i * (CARD_W + 60), y: curY },
            data: { category: cat, ...cfg, methods, onMethodClick } as LOCategoryCardData,
          });
        }
        const maxH = Math.max(...layer.map((cat) => {
          const n = Math.min((methodMap.get(cat) ?? []).length, 5);
          return 36 + 8 + n * 24 + ((methodMap.get(cat) ?? []).length > 5 ? 24 : 0) + 8;
        }));
        curY += maxH + GAP_Y;
      }

      const arrows: [LoCategory, LoCategory][] = [
        ['middleware', 'services'], ['services', 'routes'], ['services', 'models'], ['services', 'utils'],
      ];
      arrows.forEach(([src, tgt], i) => {
        rfEdges.push({
          id: `lo-arrow-${i}`,
          source: `lo-cat-${src}`,
          target: `lo-cat-${tgt}`,
          type: 'default',
          animated: true,
          style: { stroke: '#9e9e9e', strokeDasharray: '6 3', strokeWidth: 1.5 },
        });
      });

      return { curationFilteredNodes: rfNodes, curationFilteredEdges: rfEdges };
    }

    // Sprint 12: system-framework with directoryGraph → produce directoryCard RF nodes + elbowEdge edges.
    if (activePerspective === 'system-framework' && directoryGraph && directoryGraph.nodes.length > 0) {
      let edgeIdx = 0;
      const rfDirNodes = stageNodes.map((dn) => ({
        id: dn.id,
        type: 'directoryCard' as const,
        position: { x: 0, y: 0 },
        data: {
          label: dn.label,
          filePath: dn.filePath,
          nodeType: 'directory' as const,
          metadata: dn.metadata,
          category: (dn.metadata as Record<string, unknown>)?.category,
          sublabel: (dn.metadata as Record<string, unknown>)?.sublabel,
          directoryType: (dn.metadata as Record<string, unknown>)?.directoryType,
        } as NeonNodeData,
      }));

      const rfDirEdges = stageEdges.map((de) => ({
        id: de.id || `dir-edge-${edgeIdx++}`,
        source: de.source,
        target: de.target,
        type: 'elbowEdge' as const,
        data: {
          edgeType: 'import' as const,
          metadata: de.metadata ?? {},
        } as NeonEdgeData,
      }));

      return {
        curationFilteredNodes: rfDirNodes,
        curationFilteredEdges: rfDirEdges,
      };
    }

    // Sprint 13: DJ selector — render endpoint cards as canvas RF nodes (pannable/zoomable like SF)
    if (activePerspective === 'data-journey' && endpointGraph && endpointGraph.nodes.length > 0) {
      const epNodes = endpointGraph.nodes.filter((n) => n.kind === 'endpoint');
      const groupMap = new Map<string, typeof epNodes>();
      for (const node of epNodes) {
        const mp = node.method ? `${node.method} ${node.path ?? node.label}` : node.path ?? node.label;
        const prefix = parseUrlPrefix(mp);
        if (!groupMap.has(prefix)) groupMap.set(prefix, []);
        groupMap.get(prefix)!.push(node);
      }
      const KNOWN_ORDER = ['videos', 'auth', 'billing', 'users', 'admin', 'dashboard', 'referral', 'health', 'api'];
      const allKeys = Array.from(groupMap.keys());
      const orderedKeys = [
        ...KNOWN_ORDER.filter((k) => groupMap.has(k)),
        ...allKeys.filter((k) => !KNOWN_ORDER.includes(k)).sort(),
      ];

      const adj = new Map<string, string[]>();
      for (const edge of endpointGraph.edges) {
        if (!adj.has(edge.source)) adj.set(edge.source, []);
        adj.get(edge.source)!.push(edge.target);
      }
      const stepCounts = new Map<string, number>();
      for (const node of epNodes) {
        const visited = new Set<string>();
        const queue = [node.id];
        visited.add(node.id);
        let count = 0;
        while (queue.length > 0) {
          const curr = queue.shift()!;
          for (const nb of adj.get(curr) ?? []) {
            if (!visited.has(nb)) { visited.add(nb); queue.push(nb); count++; }
          }
        }
        stepCounts.set(node.id, count);
      }

      const CARD_W = 260;
      const CARD_H = 84;
      const GAP_X = 16;
      const GAP_Y = 12;
      const HEADER_H = 36;
      const CAT_GAP = 28;
      const rfNodes: Node[] = [];
      let curY = 0;

      for (const catKey of orderedKeys) {
        const catNodes = groupMap.get(catKey) ?? [];
        const meta = CATEGORY_META[catKey] ?? { key: catKey, label: catKey, icon: '📂', color: '#546e7a' };

        rfNodes.push({
          id: `dj-cat-${catKey}`,
          type: 'djSelectorCard' as const,
          position: { x: 0, y: curY },
          data: {
            subType: 'category-header',
            categoryLabel: meta.label,
            categoryIcon: meta.icon,
            categoryColor: meta.color,
            categoryCount: catNodes.length,
          } as DJSelectorNodeData,
        });
        curY += HEADER_H;

        for (let i = 0; i < catNodes.length; i++) {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const epNode = catNodes[i];
          rfNodes.push({
            id: `dj-ep-${epNode.id}`,
            type: 'djSelectorCard' as const,
            position: {
              x: col * (CARD_W + GAP_X),
              y: curY + row * (CARD_H + GAP_Y),
            },
            data: {
              subType: 'endpoint-card',
              httpMethod: epNode.method ?? 'GET',
              path: epNode.path ?? epNode.label,
              desc: deriveEndpointLabel(epNode.method ?? 'GET', epNode.path ?? epNode.label),
              stepCount: stepCounts.get(epNode.id) ?? 0,
              endpointId: epNode.id,
              categoryColor: meta.color,
              ...(epNode.description ? { aiDescription: epNode.description } : {}),
            } as DJSelectorNodeData,
          });
        }
        curY += Math.ceil(catNodes.length / 2) * (CARD_H + GAP_Y) + CAT_GAP;
      }

      return {
        curationFilteredNodes: rfNodes,
        curationFilteredEdges: [],
      };
    }

    // Stage 3: Smart curation (Sprint 10)
    const curated = applyCuration(stageNodes, stageEdges, new Set(pinnedNodeIds));

    const allowedNodeIds = new Set(curated.nodes.map((n) => n.id));
    const allowedEdgeIds = new Set(curated.edges.map((e) => e.id));

    const useNeonForDirs = activePerspective === 'data-journey';
    const perspectiveNodes = initialNodes
      .filter((n) => allowedNodeIds.has(n.id))
      .map((n) => {
        if (useNeonForDirs && (n.data).nodeType === 'directory') {
          return { ...n, type: 'neonNode' };
        }
        return n;
      });

    return {
      curationFilteredNodes: perspectiveNodes,
      curationFilteredEdges: initialEdges.filter((e) => allowedEdgeIds.has(e.id)),
    };
  }, [rawGraphNodes, rawGraphEdges, initialNodes, initialEdges, filter, activePerspective, pinnedNodeIds, directoryGraph, endpointGraph, onLOMethodClick]);

  // Layout flags
  const perspectivePreset = PERSPECTIVE_PRESETS[activePerspective];
  const isDagreLayout = perspectivePreset?.layout === 'dagre-hierarchical';
  const isForceDisabled = isDagreLayout || isDataJourney;

  // Sprint 9 — Label density: median dependency count for 'smart' mode
  const medianDependencyCount = useMemo(() => {
    const counts = curationFilteredNodes
      .map((n) => (n.data as NeonNodeData).metadata?.dependencyCount ?? 0)
      .sort((a, b) => a - b);
    if (counts.length === 0) return 0;
    return counts[Math.floor(counts.length / 2)] ?? 0;
  }, [curationFilteredNodes]);

  // Sprint 12 T7: Data Journey — identify entry nodes
  const djEntryNodeIds = useMemo<Set<string>>(() => {
    if (!isDataJourney) return new Set<string>();
    const targetIds = new Set(curationFilteredEdges.map((e) => e.target));
    const sourceIds = new Set(curationFilteredEdges.map((e) => e.source));

    const testPattern = /\.(test|spec)\./i;
    const entries = curationFilteredNodes
      .filter((n) => {
        if (targetIds.has(n.id)) return false;
        if (!sourceIds.has(n.id)) return false;
        const nd = n.data as NeonNodeData;
        if (testPattern.test(nd.label) || testPattern.test(nd.filePath)) return false;
        return true;
      })
      .map((n) => n.id);

    if (entries.length === 0) {
      const outCount = new Map<string, number>();
      curationFilteredEdges.forEach((e) => outCount.set(e.source, (outCount.get(e.source) ?? 0) + 1));
      const sorted = [...outCount.entries()].sort((a, b) => b[1] - a[1]);
      return new Set(sorted.slice(0, 3).map(([id]) => id));
    }
    if (entries.length > 8) {
      const outCount = new Map<string, number>();
      curationFilteredEdges.forEach((e) => outCount.set(e.source, (outCount.get(e.source) ?? 0) + 1));
      const ranked = entries.sort((a, b) => (outCount.get(b) ?? 0) - (outCount.get(a) ?? 0));
      return new Set(ranked.slice(0, 8));
    }
    return new Set(entries);
  }, [isDataJourney, curationFilteredNodes, curationFilteredEdges]);

  const djExitNodeIds = useMemo<Set<string>>(() => {
    if (!isDataJourney) return new Set<string>();
    const targetIds = new Set(curationFilteredEdges.map((e) => e.target));
    const sourceIds = new Set(curationFilteredEdges.map((e) => e.source));

    const exits = curationFilteredNodes
      .filter((n) => !sourceIds.has(n.id) && targetIds.has(n.id))
      .map((n) => n.id);

    if (exits.length === 0) {
      const inCount = new Map<string, number>();
      curationFilteredEdges.forEach((e) => inCount.set(e.target, (inCount.get(e.target) ?? 0) + 1));
      const sorted = [...inCount.entries()].sort((a, b) => b[1] - a[1]);
      return new Set(sorted.slice(0, 3).map(([id]) => id));
    }
    if (exits.length > 8) {
      const inCount = new Map<string, number>();
      curationFilteredEdges.forEach((e) => inCount.set(e.target, (inCount.get(e.target) ?? 0) + 1));
      const ranked = exits.sort((a, b) => (inCount.get(b) ?? 0) - (inCount.get(a) ?? 0));
      return new Set(ranked.slice(0, 8));
    }
    return new Set(exits);
  }, [isDataJourney, curationFilteredNodes, curationFilteredEdges]);

  return {
    rawGraphNodes,
    rawGraphEdges,
    curationFilteredNodes,
    curationFilteredEdges,
    djEntryNodeIds,
    djExitNodeIds,
    isDagreLayout,
    isForceDisabled,
    medianDependencyCount,
  };
}
