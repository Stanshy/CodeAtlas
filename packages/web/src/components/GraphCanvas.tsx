/**
 * CodeAtlas — GraphCanvas Component
 *
 * React Flow container with:
 * - D3 force layout (useForceLayout)
 * - Hover highlight (useHoverHighlight)
 * - Path tracing highlight (usePathTracing) — Sprint 5 T5
 * - Custom neon nodes/edges
 * - Minimap, background dots, vignette overlay
 *
 * Priority (§10): viewMode filter > tracing > e2eTracing > impact > searchFocus > loClickFocus > hover > normal
 * Sprint 9: activeViewMode filtering, E2E tracing highlights, label density
 * Sprint 12 T6: Logic Operation click-focus mode (replaces hover in LO perspective)
 */

import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { NeonNodeData, NeonEdgeData } from '../adapters/graph-adapter';
import type { NeonEdgeExtendedData } from './NeonEdge';
import { NeonNode } from './NeonNode';
import { DirectoryNode } from './DirectoryNode';
import { DirectoryCard } from './DirectoryCard';
import { NeonEdge } from './NeonEdge';
import { ElbowEdge } from './ElbowEdge';
import { FunctionNode } from './FunctionNode';
import { ClassNode } from './ClassNode';
import { CallEdge } from './CallEdge';
import { useForceLayout } from '../hooks/useForceLayout';
import { useHoverHighlight } from '../hooks/useHoverHighlight';
import { usePathTracing } from '../hooks/usePathTracing';
import { useZoomIntoFile } from '../hooks/useZoomIntoFile';
import { toReactFlowNodes, toReactFlowEdges, filterNodes, filterEdges, applyPerspective, applyCuration } from '../adapters/graph-adapter';
import { computeLayout, registerLayout } from '../adapters/layout-router';
import { dagreLayoutProvider } from '../adapters/dagre-layout';
import { forceDirectedLayoutProvider, pathTracingLayoutProvider } from '../adapters/path-tracing-layout';
import { PERSPECTIVE_PRESETS } from '../adapters/perspective-presets';

// Register layout providers once at module load time
registerLayout(dagreLayoutProvider);
registerLayout(forceDirectedLayoutProvider);
registerLayout(pathTracingLayoutProvider);

import { useViewState } from '../contexts/ViewStateContext';
import { colors, canvas, animation, tracing as tracingTheme, glow, THEME } from '../styles/theme';
import { useBfsHoverHighlight } from '../hooks/useBfsHoverHighlight';
import { useBfsClickFocus } from '../hooks/useBfsClickFocus';
import { ContextMenu } from './ContextMenu';
import { useImpactAnalysis } from '../hooks/useImpactAnalysis';
import { PerspectiveHint } from './PerspectiveHint';
import { ChainInfoPanel } from './ChainInfoPanel';
import { JourneyPanel } from './JourneyPanel';
import { DJEndpointSelector } from './DJEndpointSelector';
import { DJStepNode } from './DJStepNode';
import { LOChainNode } from './LOChainNode';
import { LOCategoryGroup } from './LOCategoryGroup';
import { buildChainFromEndpointGraph } from './LOCallChain';
import { DJSelectorCardNode, type DJSelectorNodeData } from './DJSelectorCardNode';
import { parseUrlPrefix, CATEGORY_META } from './DJEndpointSelector';
import { deriveEndpointLabel, deriveStepDesc } from '../utils/dj-descriptions';
import { LOCategoryCardNode, type LOCategoryCardData, type MethodItem } from './LOCategoryCardNode';
import { classifyPath, CATEGORY_CONFIG } from './LOCategoryGroup';
import { RightPanel } from './RightPanel';
import { useStaggerAnimation } from '../hooks/useStaggerAnimation';
import type { JourneyStep } from './JourneyPanel';
import type { GraphNode, GraphEdge, DirectoryGraph, EndpointGraph, ChainStep, EndpointChain } from '../types/graph';
import type { LoCategory } from './LOCategoryGroup';

/** Default custom node types */
const defaultNodeTypes: NodeTypes = {
  neonNode: NeonNode,
  directoryNode: DirectoryNode,
  directoryCard: DirectoryCard,  // Sprint 12: system-framework perspective
  functionNode: FunctionNode,    // Sprint 7
  classNode: ClassNode,          // Sprint 7
  djStepNode: DJStepNode,        // Sprint 13: data-journey step node
  djSelectorCard: DJSelectorCardNode, // Sprint 13: DJ endpoint selector on canvas
  loCategoryCard: LOCategoryCardNode, // Sprint 13: LO category cards on canvas
  loChainNode: LOChainNode,      // Sprint 13: LO call chain step node (mirrors DJ approach)
};

/** Default custom edge types */
const defaultEdgeTypes: EdgeTypes = {
  neonEdge: NeonEdge,
  elbowEdge: ElbowEdge,  // Sprint 12: system-framework perspective
  callEdge: CallEdge,    // Sprint 7
};

/** Props for GraphCanvas */
interface GraphCanvasProps {
  initialNodes: Node<NeonNodeData>[];
  initialEdges: Edge<NeonEdgeData>[];
  onNodeClick?: (nodeId: string) => void;
  /** Sprint 9 — E2E tracing: called when user triggers E2E tracing from context menu */
  onStartE2ETracing?: (nodeId: string) => void;
  /** Sprint 12 — optional directory-level graph for system-framework perspective */
  directoryGraph?: DirectoryGraph | null;
  /** Sprint 13 — optional endpoint-level graph for data-journey / logic-operation perspectives */
  endpointGraph?: EndpointGraph | null;
  /** Sprint 13 — raw graph nodes/edges for SFDetailPanel function lookup */
  sfPanelNodes?: GraphNode[];
  sfPanelEdges?: GraphEdge[];
}

export function GraphCanvas({ initialNodes, initialEdges, onNodeClick, onStartE2ETracing, directoryGraph, endpointGraph, sfPanelNodes, sfPanelEdges }: GraphCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // LO method click ref — allows useMemo (runs before handleLOMethodClick is defined)
  // to inject a stable callback into node data without stale closures.
  const loMethodClickRef = useRef<(name: string, category: LoCategory) => void>(() => undefined);

  // Sprint 5 — T3: edge hover → dispatch HOVER_EDGE
  const { state, dispatch } = useViewState();
  const {
    hoveredEdgeId,
    expandedNodes,
    expandedEdges,
    impactAnalysis,
    filter,
    isSearchFocused,
    searchFocusNodes,
    searchFocusEdges,
    contextMenu,
    // Sprint 11 additions
    activePerspective,
    e2eTracing,
    displayPrefs,
    pinnedNodeIds,
  } = state;

  // Sprint 7 — T9: zoom into file
  const { zoomInto, zoomOut } = useZoomIntoFile();

  // Sprint 12 T8: fitView after perspective change (ReactFlowProvider wraps the whole app)
  const { fitView: rfFitView, setCenter: rfSetCenter } = useReactFlow();
  // Stable ref for rfSetCenter — useReactFlow() returns new refs each render,
  // so we MUST NOT put rfSetCenter in useEffect deps (causes infinite re-render).
  const rfSetCenterRef = React.useRef(rfSetCenter);
  rfSetCenterRef.current = rfSetCenter;

  // Sprint 12 T7: Data Journey — local journey path state (set when user clicks an entry node)
  const isDataJourney = activePerspective === 'data-journey';
  const [djPath, setDjPath] = useState<string[]>([]);
  const [djEdgePath, setDjEdgePath] = useState<string[]>([]);
  const [djStarted, setDjStarted] = useState(false);

  // Sprint 13 T6: Endpoint-level DJ mode state
  // When endpointGraph is available, DJ switches to endpoint selector → stagger playback
  const hasEndpointGraph = !!endpointGraph && endpointGraph.nodes.length > 0;
  const [djMode, setDjMode] = useState<'selector' | 'playing' | 'done'>('selector');
  const [djSelectedEndpoint, setDjSelectedEndpoint] = useState<string | null>(null);
  const [djSelectedChain, setDjSelectedChain] = useState<EndpointChain | null>(null);
  const [djCurrentStep, setDjCurrentStep] = useState<number>(-1);
  const [djStepIsPlaying, setDjStepIsPlaying] = useState(false);
  const djStepTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset endpoint DJ state when perspective changes away
  useEffect(() => {
    if (!isDataJourney) {
      setDjMode('selector');
      setDjSelectedEndpoint(null);
      setDjSelectedChain(null);
      setDjCurrentStep(-1);
      setDjStepIsPlaying(false);
      if (djStepTimerRef.current) {
        clearInterval(djStepTimerRef.current);
        djStepTimerRef.current = null;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDataJourney]);

  // Reset journey state when perspective changes away from data-journey
  useEffect(() => {
    if (!isDataJourney) {
      setDjPath([]);
      setDjEdgePath([]);
      setDjStarted(false);
    }
  }, [isDataJourney]);

  // Sprint 13 T5: Logic Operation — category drill state
  // loMode: 'groups' shows LOCategoryGroup; 'chain' shows call chain on RF canvas (like DJ)
  const [loMode, setLoMode] = useState<'groups' | 'chain'>('groups');
  const [loSelectedChain, setLoSelectedChain] = useState<ChainStep[] | null>(null);
  const [loSelectedNode, setLoSelectedNode] = useState<ChainStep | null>(null);
  const [loEndpointLabel, setLoEndpointLabel] = useState<string>('');
  const [loCurrentStep, setLoCurrentStep] = useState<number>(-1);
  const [loStepIsPlaying, setLoStepIsPlaying] = useState(false);
  const loStepTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset LO state when perspective changes away from logic-operation
  useEffect(() => {
    if (activePerspective !== 'logic-operation') {
      setLoMode('groups');
      setLoSelectedChain(null);
      setLoSelectedNode(null);
      setLoEndpointLabel('');
      setLoCurrentStep(-1);
      setLoStepIsPlaying(false);
      if (loStepTimerRef.current) {
        clearInterval(loStepTimerRef.current);
        loStepTimerRef.current = null;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePerspective]);

  // Convert expanded function/class nodes to React Flow format
  const expandedRFNodes = useMemo(
    () => toReactFlowNodes(expandedNodes),
    [expandedNodes],
  );
  const expandedRFEdges = useMemo(
    () => toReactFlowEdges(expandedEdges),
    [expandedEdges],
  );

  // Sprint 10 T10: Extract shared GraphNode/GraphEdge conversion (avoid redundant mapping).
  // Convert RF nodes → raw GraphNode[] once, then reuse downstream.
  const rawGraphNodes = useMemo<GraphNode[]>(
    () => initialNodes.map((n) => ({
      id: n.id,
      type: (n.data as NeonNodeData).nodeType,
      label: (n.data as NeonNodeData).label,
      filePath: (n.data as NeonNodeData).filePath,
      metadata: (n.data as NeonNodeData).metadata,
    })),
    [initialNodes],
  );

  const rawGraphEdges = useMemo<GraphEdge[]>(
    () => initialEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: (e.data as NeonEdgeData | undefined)?.edgeType ?? 'import',
      metadata: (e.data as NeonEdgeData | undefined)?.metadata,
    })),
    [initialEdges],
  );

  // Sprint 8 + 9 + 10 + 11: Unified filtering pipeline (perspective → curation → manual filter).
  // Sprint 11 NOTE: filter order is perspective → curation → manual (three-layer, non-reversible).
  const { curationFilteredNodes, curationFilteredEdges } = useMemo(() => {
    // Stage 1: Manual filter (Sprint 8)
    const filtered = filterNodes(rawGraphNodes, filter);
    const filteredIds = new Set(filtered.map((n) => n.id));
    const filteredEdgesRaw = filterEdges(rawGraphEdges, filteredIds, filter);

    // Stage 2: Perspective filter (Sprint 11 — replaces ViewMode)
    // logic-operation selects all — skip for performance
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
    // Always generate group nodes regardless of loMode — chain overlay renders on top
    if (activePerspective === 'logic-operation') {
      const methodMap = new Map<LoCategory, MethodItem[]>();
      (Object.keys(CATEGORY_CONFIG) as LoCategory[]).forEach((cat) => methodMap.set(cat, []));

      // Collect endpoint IDs for ★ entry marker (endpoints are HTTP handler entry points)
      const endpointNodeIds = new Set<string>();
      if (endpointGraph) {
        endpointGraph.nodes
          .filter((en) => en.kind === 'endpoint')
          .forEach((en) => endpointNodeIds.add(en.id));
      }

      // Helper: detect if a method name looks like an HTTP handler entry point
      const isEntryMethod = (name: string, nodeId: string): boolean => {
        if (endpointNodeIds.has(nodeId)) return true;
        const lower = name.toLowerCase();
        return /^(get|post|put|patch|delete|handle|on[A-Z]|dispatch|request|respond)/.test(lower)
          || /Handler$|Controller$|Action$|Route$|Endpoint$/.test(name);
      };

      // Collect from raw graph nodes (function/method)
      rawGraphNodes
        .filter((n) => n.type === 'function' || n.metadata?.kind === 'method' || n.metadata?.kind === 'function')
        .forEach((n) => {
          const cat = classifyPath(n.filePath);
          methodMap.get(cat)!.push({
            name: n.label,
            filePath: n.filePath,
            nodeId: n.id,
            isEntry: isEntryMethod(n.label, n.id),
          });
        });

      // Collect from endpointGraph (method/handler only)
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

      // Stable method click callback read from ref (avoids stale closure in useMemo)
      const onMethodClick = (name: string, category: LoCategory) => loMethodClickRef.current(name, category);

      // Position cards in layers: middleware (top) → services (middle) → routes + models + utils (bottom)
      const CARD_W = 240;
      const GAP_Y = 60;
      // LO-3: Layout order — middleware at top, services middle, routes+models+utils at bottom
      const layers: LoCategory[][] = [['middleware'], ['services'], ['routes', 'models', 'utils']];
      const rfNodes: Node[] = [];
      const rfEdges: Edge[] = [];
      let curY = 0;

      for (const layer of layers) {
        const layerW = layer.length * CARD_W + (layer.length - 1) * 60;
        const startX = -layerW / 2;
        for (let i = 0; i < layer.length; i++) {
          const cat = layer[i]!;
          const cfg = CATEGORY_CONFIG[cat];
          const methods = methodMap.get(cat) ?? [];
          rfNodes.push({
            id: `lo-cat-${cat}`,
            type: 'loCategoryCard' as const,
            position: { x: startX + i * (CARD_W + 60), y: curY },
            data: { category: cat, ...cfg, methods, onMethodClick } as LOCategoryCardData,
          });
        }
        // Compute max card height in this layer for spacing
        const maxH = Math.max(...layer.map((cat) => {
          const n = Math.min((methodMap.get(cat) ?? []).length, 5);
          return 36 + 8 + n * 24 + ((methodMap.get(cat) ?? []).length > 5 ? 24 : 0) + 8;
        }));
        curY += maxH + GAP_Y;
      }

      // Dependency edges (dashed arrows) — updated for new layer order
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
    // The dirNodes returned by applyPerspective have IDs from DirectoryGraph (e.g. "services/"),
    // which don't exist in initialNodes (file-level). Build RF nodes directly from stageNodes/stageEdges.
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
          // Sprint 13 T3: pass category/sublabel/directoryType for DirectoryCard rendering
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
    // Always generate selector nodes regardless of djMode — playing handler replaces via setNodes
    if (activePerspective === 'data-journey' && endpointGraph && endpointGraph.nodes.length > 0) {
      const epNodes = endpointGraph.nodes.filter((n) => n.kind === 'endpoint');
      // Group by category
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

      // Build chain map for step counts
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

      // Layout: 2-column grid with category headers
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

        // Category header node
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

        // Endpoint cards in 2-col grid
        for (let i = 0; i < catNodes.length; i++) {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const epNode = catNodes[i]!;
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

    // Map back to RF format
    const allowedNodeIds = new Set(curated.nodes.map((n) => n.id));
    const allowedEdgeIds = new Set(curated.edges.map((e) => e.id));

    // Sprint 11: In data-journey perspective, directory nodes render via NeonNode
    // (cyan/green dir-group styling). For system-framework, directoryCard is used
    // (handled above when directoryGraph is present).
    const useNeonForDirs = activePerspective === 'data-journey';
    const perspectiveNodes = initialNodes
      .filter((n) => allowedNodeIds.has(n.id))
      .map((n) => {
        if (useNeonForDirs && (n.data as NeonNodeData).nodeType === 'directory') {
          return { ...n, type: 'neonNode' };
        }
        return n;
      });

    return {
      curationFilteredNodes: perspectiveNodes,
      curationFilteredEdges: initialEdges.filter((e) => allowedEdgeIds.has(e.id)),
    };
  }, [rawGraphNodes, rawGraphEdges, initialNodes, initialEdges, filter, activePerspective, pinnedNodeIds, directoryGraph, endpointGraph]);

  // --- T6: D3 Force Layout (disabled for dagre/path-tracing perspectives) ---
  // Declared before the sync useEffect hooks so isDagreLayout is available as a dependency.
  const perspectivePreset = PERSPECTIVE_PRESETS[activePerspective];
  const isDagreLayout = perspectivePreset?.layout === 'dagre-hierarchical';
  // Sprint 12 B2: Disable force layout entirely for data-journey (uses manual centering + stagger)
  const isForceDisabled = isDagreLayout || isDataJourney;

  // Sprint 9 — Label density: median dependency count for 'smart' mode
  const medianDependencyCount = useMemo(() => {
    const counts = curationFilteredNodes
      .map((n) => (n.data as NeonNodeData).metadata?.dependencyCount ?? 0)
      .sort((a, b) => a - b);
    if (counts.length === 0) return 0;
    return counts[Math.floor(counts.length / 2)] ?? 0;
  }, [curationFilteredNodes]);

  // Sprint 12 T7: Data Journey — identify entry nodes (nodes with no incoming edges in filtered set)
  // Sprint 12: Data Journey — identify meaningful entry/exit nodes
  // Key rule: a node MUST participate in at least one edge to be a DJ candidate.
  // Isolated nodes (no edges at all) are excluded — they have no data flow to trace.
  //
  // Entry = has outgoing edges but NO incoming edges (data originates here)
  // Exit  = has incoming edges but NO outgoing edges (data terminates here)
  const djEntryNodeIds = useMemo<Set<string>>(() => {
    if (!isDataJourney) return new Set<string>();
    const targetIds = new Set(curationFilteredEdges.map((e) => e.target));
    const sourceIds = new Set(curationFilteredEdges.map((e) => e.source));

    // Entry: no incoming + HAS outgoing (so BFS from it will produce a real path)
    // Exclude test files — they import source but aren't real "data entry points"
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
      // Fallback: pick the nodes with most outgoing edges as "roots"
      const outCount = new Map<string, number>();
      curationFilteredEdges.forEach((e) => outCount.set(e.source, (outCount.get(e.source) ?? 0) + 1));
      const sorted = [...outCount.entries()].sort((a, b) => b[1] - a[1]);
      return new Set(sorted.slice(0, 3).map(([id]) => id));
    }
    // Cap at 8 — rank by outgoing edge count to surface the most connected entry points
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

    // Exit: no outgoing + HAS incoming (so reverse BFS from it will produce a real path)
    const exits = curationFilteredNodes
      .filter((n) => !sourceIds.has(n.id) && targetIds.has(n.id))
      .map((n) => n.id);

    if (exits.length === 0) {
      const inCount = new Map<string, number>();
      curationFilteredEdges.forEach((e) => inCount.set(e.target, (inCount.get(e.target) ?? 0) + 1));
      const sorted = [...inCount.entries()].sort((a, b) => b[1] - a[1]);
      return new Set(sorted.slice(0, 3).map(([id]) => id));
    }
    // Cap at 8 — rank by incoming edge count to surface the most connected exit points
    if (exits.length > 8) {
      const inCount = new Map<string, number>();
      curationFilteredEdges.forEach((e) => inCount.set(e.target, (inCount.get(e.target) ?? 0) + 1));
      const ranked = exits.sort((a, b) => (inCount.get(b) ?? 0) - (inCount.get(a) ?? 0));
      return new Set(ranked.slice(0, 8));
    }
    return new Set(exits);
  }, [isDataJourney, curationFilteredNodes, curationFilteredEdges]);

  // Sprint 12 T7: Compute BFS path from an entry node through the graph
  const computeDjPath = useCallback((startNodeId: string): { path: string[]; edgePath: string[] } => {
    const adjMap = new Map<string, Array<{ target: string; edgeId: string }>>();
    curationFilteredEdges.forEach((e) => {
      if (!adjMap.has(e.source)) adjMap.set(e.source, []);
      adjMap.get(e.source)!.push({ target: e.target, edgeId: e.id });
    });

    const visited = new Set<string>();
    const path: string[] = [];
    const edgePath: string[] = [];
    const queue: Array<{ nodeId: string; edgeId: string | null }> = [{ nodeId: startNodeId, edgeId: null }];
    visited.add(startNodeId);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      path.push(curr.nodeId);
      if (curr.edgeId !== null) edgePath.push(curr.edgeId);
      const neighbors = adjMap.get(curr.nodeId) ?? [];
      for (const { target, edgeId: eid } of neighbors) {
        if (!visited.has(target)) {
          visited.add(target);
          queue.push({ nodeId: target, edgeId: eid });
        }
      }
    }
    return { path, edgePath };
  }, [curationFilteredEdges]);

  // Sprint 12: Reverse BFS — trace upstream from an exit node (follows incoming edges)
  const computeDjReversePath = useCallback((startNodeId: string): { path: string[]; edgePath: string[] } => {
    // Build reverse adjacency: target → sources
    const revMap = new Map<string, Array<{ source: string; edgeId: string }>>();
    curationFilteredEdges.forEach((e) => {
      if (!revMap.has(e.target)) revMap.set(e.target, []);
      revMap.get(e.target)!.push({ source: e.source, edgeId: e.id });
    });

    const visited = new Set<string>();
    const revPath: string[] = [];
    const edgePath: string[] = [];
    const queue: Array<{ nodeId: string; edgeId: string | null }> = [{ nodeId: startNodeId, edgeId: null }];
    visited.add(startNodeId);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      revPath.push(curr.nodeId);
      if (curr.edgeId !== null) edgePath.push(curr.edgeId);
      const parents = revMap.get(curr.nodeId) ?? [];
      for (const { source, edgeId: eid } of parents) {
        if (!visited.has(source)) {
          visited.add(source);
          queue.push({ nodeId: source, edgeId: eid });
        }
      }
    }
    // Reverse path so it reads entry → ... → exit (natural data flow direction)
    return { path: revPath.reverse(), edgePath: edgePath.reverse() };
  }, [curationFilteredEdges]);

  // Stagger animation hook for data-journey
  const {
    revealedSteps: djRevealedSteps,
    isPlaying: djIsPlaying,
    visibleNodes: djVisibleNodes,
    visibleEdges: djVisibleEdges,
    play: djPlay,
    replay: djReplay,
  } = useStaggerAnimation(djPath, djEdgePath, 350);

  // Auto-start playback when a new journey path is set
  useEffect(() => {
    if (djStarted && djPath.length > 0) {
      djPlay();
    }
  }, [djPath, djStarted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build JourneyPanel steps from the computed BFS path
  const djJourneySteps = useMemo<JourneyStep[]>(() => {
    if (djPath.length === 0) return [];
    return djPath.map((nodeId) => {
      const rfNode = curationFilteredNodes.find((n) => n.id === nodeId);
      const nd = rfNode ? (rfNode.data as NeonNodeData) : null;
      return {
        id: nodeId,
        name: nd?.label ?? nodeId,
        description: nd?.filePath ?? nodeId,
      };
    });
  }, [djPath, curationFilteredNodes]);

  const handleDjReplay = useCallback(() => { djReplay(); }, [djReplay]);

  // ---------------------------------------------------------------------------
  // Sprint 13 T6: Endpoint-level DJ — stagger animation helpers
  // ---------------------------------------------------------------------------

  // Build React Flow step nodes for the selected chain (centered vertical layout)
  const buildDjStepNodes = useCallback((chain: EndpointChain) => {
    const NODE_W = 340;
    const STEP_SPACING = 96;
    const centerX = -(NODE_W / 2);
    const startY = 0;

    const rfNodes: Node<NeonNodeData>[] = chain.steps.map((step, i) => ({
      id: `dj-step-${i}`,
      type: 'djStepNode' as const,
      position: { x: centerX, y: startY + i * STEP_SPACING },
      data: {
        stepIndex: i,
        step,
        state: 'unreached',
        label: step.name,
        filePath: step.file ?? '',
        nodeType: 'file' as const,
        metadata: {},
      } as unknown as NeonNodeData,
    }));

    const rfEdges: Edge<NeonEdgeData>[] = chain.steps.slice(0, -1).map((_, i) => ({
      id: `dj-step-edge-${i}`,
      source: `dj-step-${i}`,
      target: `dj-step-${i + 1}`,
      type: 'neonEdge' as const,
      data: {
        edgeType: 'data-flow' as const,
        metadata: {},
      } as NeonEdgeData,
      style: {
        stroke: THEME.djLine,
        strokeWidth: 2,
        opacity: 0,
      },
    }));

    return { rfNodes, rfEdges };
  }, []);

  // Start stagger animation for endpoint steps
  const startDjEndpointPlayback = useCallback((chain: EndpointChain) => {
    const { rfNodes, rfEdges } = buildDjStepNodes(chain);
    setNodes(rfNodes as Node<NeonNodeData>[]);
    setEdges(rfEdges);
    setDjCurrentStep(-1);
    setDjStepIsPlaying(true);

    if (djStepTimerRef.current) {
      clearInterval(djStepTimerRef.current);
      djStepTimerRef.current = null;
    }

    const totalSteps = chain.steps.length;
    if (totalSteps === 0) {
      setDjMode('done');
      setDjStepIsPlaying(false);
      return;
    }

    setTimeout(() => {
      setDjCurrentStep(0);
      let step = 0;
      djStepTimerRef.current = setInterval(() => {
        step++;
        if (step >= totalSteps) {
          clearInterval(djStepTimerRef.current!);
          djStepTimerRef.current = null;
          setDjCurrentStep(totalSteps - 1);
          setDjStepIsPlaying(false);
          setDjMode('done');
          return;
        }
        setDjCurrentStep(step);
      }, 350);
    }, 0);
  }, [buildDjStepNodes, setNodes, setEdges]);

  // Handler: user clicks an endpoint card in the selector
  const handleDjEndpointClick = useCallback((endpointId: string, chain: EndpointChain) => {
    setDjSelectedEndpoint(endpointId);
    setDjSelectedChain(chain);
    setDjMode('playing');
    startDjEndpointPlayback(chain);

    requestAnimationFrame(() => {
      setTimeout(() => {
        rfSetCenterRef.current(0, (chain.steps.length * 96) / 2, { zoom: 0.9, duration: 400 });
      }, 100);
    });
  }, [startDjEndpointPlayback]);

  // Handler: replay selected endpoint journey
  const handleDjEndpointReplay = useCallback(() => {
    if (!djSelectedChain) return;
    setDjMode('playing');
    startDjEndpointPlayback(djSelectedChain);
  }, [djSelectedChain, startDjEndpointPlayback]);

  // Handler: clear selection, return to selector
  const handleDjEndpointClear = useCallback(() => {
    if (djStepTimerRef.current) {
      clearInterval(djStepTimerRef.current);
      djStepTimerRef.current = null;
    }
    setDjMode('selector');
    setDjSelectedEndpoint(null);
    setDjSelectedChain(null);
    setDjCurrentStep(-1);
    setDjStepIsPlaying(false);
    setNodes(curationFilteredNodes);
    setEdges(curationFilteredEdges);
  }, [curationFilteredNodes, curationFilteredEdges, setNodes, setEdges]);

  // Handler: user manually clicks a step in DJPanel (no canvas action needed)
  const handleDjStepClick = useCallback((_stepIndex: number) => {}, []);

  // Sync endpoint step node visual states based on djCurrentStep
  useEffect(() => {

    if (!isDataJourney || !hasEndpointGraph || djMode === 'selector' || !djSelectedChain) return;
    setNodes((prev) =>
      prev.map((node) => {
        if (!node.id.startsWith('dj-step-')) return node;
        const idx = parseInt(node.id.replace('dj-step-', ''), 10);
        const state: 'unreached' | 'active' | 'completed' =
          idx < djCurrentStep ? 'completed' :
          idx === djCurrentStep ? 'active' :
          'unreached';
        const step = djSelectedChain.steps[idx];
        return {
          ...node,
          data: {
            ...node.data,
            stepIndex: idx,
            step,
            state,
          },
          style: {
            opacity: idx <= djCurrentStep ? 1 : 0,
            transition: 'opacity 0.20s ease-out',
          },
        };
      }),
    );
    setEdges((prev) =>
      prev.map((edge) => {
        if (!edge.id.startsWith('dj-step-edge-')) return edge;
        const idx = parseInt(edge.id.replace('dj-step-edge-', ''), 10);
        return {
          ...edge,
          style: {
            ...edge.style,
            opacity: idx < djCurrentStep ? 0.8 : 0,
            transition: 'opacity 0.3s ease-in-out',
          },
        };
      }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [djCurrentStep, djMode, isDataJourney, hasEndpointGraph]);

  // ---------------------------------------------------------------------------
  // Sprint 13 T5 (revised): LO chain — mirrors DJ's React Flow canvas approach
  // ---------------------------------------------------------------------------

  // Build React Flow nodes/edges for LO call chain (vertical layout, like DJ)
  const buildLoChainNodes = useCallback((steps: ChainStep[]) => {
    const NODE_W = 280;
    const STEP_SPACING = 88;
    const centerX = -(NODE_W / 2);
    const startY = 0;

    const rfNodes: Node<NeonNodeData>[] = steps.map((step, i) => ({
      id: `lo-chain-${i}`,
      type: 'loChainNode' as const,
      position: { x: centerX, y: startY + i * STEP_SPACING },
      data: {
        stepIndex: step.depth,
        methodName: step.methodName,
        className: step.className,
        category: step.category,
        filePath: step.filePath,
        state: 'unreached',
        label: step.methodName,
        nodeType: 'file' as const,
        metadata: {},
      } as unknown as NeonNodeData,
      style: { opacity: 0, transition: 'opacity 0.20s ease-out' },
    }));

    const rfEdges: Edge<NeonEdgeData>[] = steps.slice(0, -1).map((step, i) => {
      const catColor = CATEGORY_CONFIG[step.category]?.color ?? '#546e7a';
      return {
        id: `lo-chain-edge-${i}`,
        source: `lo-chain-${i}`,
        target: `lo-chain-${i + 1}`,
        type: 'neonEdge' as const,
        data: {
          edgeType: 'data-flow' as const,
          metadata: {},
        } as NeonEdgeData,
        style: {
          stroke: catColor,
          strokeWidth: 2,
          opacity: 0,
        },
      };
    });

    return { rfNodes, rfEdges };
  }, []);

  // Start stagger animation for LO chain steps (mirrors startDjEndpointPlayback)
  const startLoChainPlayback = useCallback((steps: ChainStep[]) => {
    const { rfNodes, rfEdges } = buildLoChainNodes(steps);
    setNodes(rfNodes as Node<NeonNodeData>[]);
    setEdges(rfEdges);
    setLoCurrentStep(-1);
    setLoStepIsPlaying(true);

    if (loStepTimerRef.current) {
      clearInterval(loStepTimerRef.current);
      loStepTimerRef.current = null;
    }

    const totalSteps = steps.length;
    if (totalSteps === 0) {
      setLoStepIsPlaying(false);
      return;
    }

    setTimeout(() => {
      setLoCurrentStep(0);
      let step = 0;
      loStepTimerRef.current = setInterval(() => {
        step++;
        if (step >= totalSteps) {
          clearInterval(loStepTimerRef.current!);
          loStepTimerRef.current = null;
          setLoCurrentStep(totalSteps - 1);
          setLoStepIsPlaying(false);
          return;
        }
        setLoCurrentStep(step);
      }, 280);
    }, 0);
  }, [buildLoChainNodes, setNodes, setEdges]);

  // NOTE: LO chain sync effect moved below isLogicOperation declaration (avoids TDZ)

  // Sprint 12: When entering data-journey initial state, show only entry + exit nodes
  // as large selection cards, centered in the viewport. All other nodes hidden off-screen.
  // Sprint 13: When endpointGraph is available, skip file-level layout (DJEndpointSelector handles init).
  useEffect(() => {

    if (!isDataJourney) return;
    if (hasEndpointGraph) return; // endpoint mode: selector overlay handles UI
    if (djStarted) return;

    // Collect visible node IDs (entries on top row, exits on bottom row)
    const entryIds = Array.from(djEntryNodeIds);
    const exitIds = Array.from(djExitNodeIds).filter((id) => !djEntryNodeIds.has(id));

    // Layout: entries in top row, exits in bottom row, centered
    const CARD_GAP = 220;
    const ROW_GAP = 120;
    const entryCols = entryIds.length;
    const exitCols = exitIds.length;
    // Entry row: y = 0, centered
    const entryStartX = -(entryCols - 1) * CARD_GAP / 2;
    // Exit row: y = ROW_GAP, centered
    const exitStartX = -(exitCols - 1) * CARD_GAP / 2;

    const visibleIds: string[] = [];

    const positioned = curationFilteredNodes.map((node) => {
      const entryIdx = entryIds.indexOf(node.id);
      if (entryIdx !== -1) {
        visibleIds.push(node.id);
        return { ...node, position: { x: entryStartX + entryIdx * CARD_GAP, y: 0 } };
      }
      const exitIdx = exitIds.indexOf(node.id);
      if (exitIdx !== -1) {
        visibleIds.push(node.id);
        return { ...node, position: { x: exitStartX + exitIdx * CARD_GAP, y: ROW_GAP } };
      }
      return { ...node, position: { x: -9999, y: -9999 } };
    });
    setNodes(positioned);
    setEdges(curationFilteredEdges);

    // Center viewport on visible nodes (zoom in, let user zoom out)
    if (visibleIds.length > 0) {
      // Compute center of visible entry/exit nodes
      let sumX = 0, sumY = 0, count = 0;
      positioned.forEach((n) => {
        if (visibleIds.includes(n.id)) {
          sumX += n.position.x;
          sumY += n.position.y;
          count++;
        }
      });
      const cx = count > 0 ? sumX / count : 0;
      const cy = count > 0 ? sumY / count : 0;
      requestAnimationFrame(() => {
        setTimeout(() => {
          rfSetCenterRef.current(cx + 90, cy + 28, { zoom: 1.0, duration: 400 });
        }, 100);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDataJourney, djStarted, djEntryNodeIds, djExitNodeIds, curationFilteredNodes, curationFilteredEdges, setNodes, setEdges]);

  // Sync when initialNodes/initialEdges change (e.g. refetch)
  useEffect(() => {

    if (isDagreLayout) return; // dagre layout manages its own nodes
    if (isDataJourney) return; // data-journey uses manual positioning (entry centering + stagger)
    setNodes(curationFilteredNodes);
  }, [curationFilteredNodes, setNodes, isDagreLayout, isDataJourney]);

  useEffect(() => {

    if (isDagreLayout) return; // dagre layout manages its own edges
    if (isDataJourney && hasEndpointGraph) return; // endpoint DJ manages its own edges
    setEdges(curationFilteredEdges);
  }, [curationFilteredEdges, setEdges, isDagreLayout, isDataJourney, hasEndpointGraph]);

  // Merge expanded function nodes and call edges into the display graph
  useEffect(() => {

    if (isDagreLayout || isDataJourney) return; // dagre/DJ layout handles positioning
    if (expandedRFNodes.length === 0) {
      setNodes(curationFilteredNodes);
    } else {
      // Filter out any previously expanded nodes, then add fresh ones
      setNodes((prev) => {
        const nonExpanded = prev.filter((n) => {
          const nodeType = (n.data as NeonNodeData | undefined)?.nodeType;
          return nodeType !== 'function' && nodeType !== 'class';
        });
        return [...nonExpanded, ...expandedRFNodes];
      });
    }
  }, [expandedRFNodes, curationFilteredNodes, setNodes, isDagreLayout]);

  useEffect(() => {

    if (isDagreLayout) return; // dagre layout manages its own edges
    if (isDataJourney && hasEndpointGraph) return; // endpoint DJ manages its own edges
    if (expandedRFEdges.length === 0) {
      setEdges(curationFilteredEdges);
    } else {
      setEdges((prev) => {
        const nonCall = prev.filter(
          (e) => (e.data as NeonEdgeData | undefined)?.edgeType !== 'call',
        );
        return [...nonCall, ...expandedRFEdges];
      });
    }
  }, [expandedRFEdges, curationFilteredEdges, setEdges, isDagreLayout, isDataJourney, hasEndpointGraph]);

  // Sprint 7 — Escape key handler to zoom out
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        zoomOut();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [zoomOut]);

  const handlePositionsUpdate = useCallback(
    (updatedNodes: Node<NeonNodeData>[]) => {
      // Only accept force positions when force layout is active
      if (!isForceDisabled) {
        setNodes(updatedNodes);
      }
    },
    [setNodes, isForceDisabled],
  );

  useForceLayout(
    isForceDisabled ? [] : curationFilteredNodes,
    isForceDisabled ? [] : curationFilteredEdges,
    handlePositionsUpdate,
  );

  // Perspective flags — declared here so all subsequent hooks/effects can reference them.
  // (Must be before any code that references isLogicOperation, isSystemFramework, etc.)
  const isLogicOperation = activePerspective === 'logic-operation';

  // Apply layout engine for dagre (Sprint 11 T4 + T5)
  // LO groups + DJ selector have pre-computed positions from useMemo — skip dagre, just sync + center
  const isLOGroups = isLogicOperation && loMode === 'groups';
  const isDJSelector = isDataJourney && hasEndpointGraph && djMode === 'selector';

  useEffect(() => {

    if (!isDagreLayout) return;
    if (curationFilteredNodes.length === 0) return;

    // LO: positions are pre-computed in useMemo, no dagre needed
    // Skip if in chain mode — chain nodes are managed by stagger playback
    if (isLogicOperation) {
      if (loMode === 'chain') return;

      setNodes(curationFilteredNodes);
      setEdges(curationFilteredEdges);
      // Entrance: zoom to center
      let sumX = 0, sumY = 0;
      curationFilteredNodes.forEach((n) => { sumX += n.position.x; sumY += n.position.y; });
      const cx = sumX / curationFilteredNodes.length;
      const cy = sumY / curationFilteredNodes.length;
      requestAnimationFrame(() => {
        setTimeout(() => {
          rfSetCenterRef.current(cx, cy, { zoom: 0.85, duration: 500 });
        }, 150);
      });
      return;
    }

    const layoutResult = computeLayout('dagre-hierarchical', {
      nodes: curationFilteredNodes,
      edges: curationFilteredEdges,
    });
    setNodes(layoutResult.nodes);
    setEdges(layoutResult.edges);

    // Center viewport on dagre layout results (entrance animation)
    if (layoutResult.nodes.length > 0) {
      let sumX = 0, sumY = 0;
      layoutResult.nodes.forEach((n) => { sumX += n.position.x; sumY += n.position.y; });
      const cx = sumX / layoutResult.nodes.length;
      const cy = sumY / layoutResult.nodes.length;
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (activePerspective === 'system-framework') {
            rfSetCenterRef.current(cx, cy, { zoom: 0.85, duration: 500 });
          }
        }, 100);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDagreLayout, curationFilteredNodes, curationFilteredEdges, setNodes, setEdges, activePerspective]);

  // Sprint 12 T8: Re-fit viewport after perspective change.
  // SF/LO centering is handled inside the dagre layout effect (after layout completes).
  // DJ: zoom into the center of the graph (let user zoom out themselves).
  // Other perspectives: fitView to show full graph.
  // DJ selector: sync nodes + zoom to center (like SF entrance animation)
  useEffect(() => {
    if (!isDataJourney || !hasEndpointGraph || djMode !== 'selector') return;
    if (curationFilteredNodes.length === 0) return;
    setNodes(curationFilteredNodes);
    setEdges([]);
    // Compute center of all card nodes (skip category headers for better centering)
    const cardNodes = curationFilteredNodes.filter((n) => (n.data as DJSelectorNodeData)?.subType === 'endpoint-card');
    const target = cardNodes.length > 0 ? cardNodes : curationFilteredNodes;
    let sumX = 0, sumY = 0;
    target.forEach((n) => { sumX += n.position.x; sumY += n.position.y; });
    const cx = sumX / target.length;
    const cy = sumY / target.length;
    requestAnimationFrame(() => {
      setTimeout(() => {
        rfSetCenterRef.current(cx + 130, cy, { zoom: 0.85, duration: 500 });
      }, 150);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDataJourney, hasEndpointGraph, curationFilteredNodes]);

  useEffect(() => {
    if (isDataJourney) {
      if (hasEndpointGraph && djMode === 'selector') return; // handled above
      return; // DJ playing has its own centering logic
    }
    if (isLogicOperation) return; // LO centering is handled in dagre layout effect
    if (activePerspective === 'system-framework') return; // SF centering is handled in dagre layout effect
    const timer = setTimeout(() => {
      rfFitView({ padding: 0.2, maxZoom: 1.5, duration: 400 });
    }, 250);
    return () => clearTimeout(timer);
  // activePerspective is the only trigger; rfFitView is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePerspective]);

  // --- T8: Hover Highlight (1-hop, legacy) ---
  const { highlightState, onNodeMouseEnter, onNodeMouseLeave } = useHoverHighlight(edges);

  // --- Sprint 11 T6: BFS Hover Highlight (5-hop, logic-operation perspective) ---
  const bfsGraphEdges = useMemo<GraphEdge[]>(
    () => curationFilteredEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: (e.data as NeonEdgeData | undefined)?.edgeType ?? 'import',
      metadata: (e.data as NeonEdgeData | undefined)?.metadata,
    })),
    [curationFilteredEdges],
  );

  // Sprint 13 T5 (revised): Sync LO chain node visual states based on loCurrentStep
  // (placed here because it needs isLogicOperation which is declared above)
  useEffect(() => {
    if (!isLogicOperation || loMode !== 'chain' || !loSelectedChain) return;
    setNodes((prev) =>
      prev.map((node) => {
        if (!node.id.startsWith('lo-chain-')) return node;
        const idx = parseInt(node.id.replace('lo-chain-', ''), 10);
        const chainStep = loSelectedChain[idx];
        if (!chainStep) return node;
        const state: 'unreached' | 'active' | 'completed' =
          idx < loCurrentStep ? 'completed' :
          idx === loCurrentStep ? 'active' :
          'unreached';
        return {
          ...node,
          data: {
            ...node.data,
            state,
          },
          style: {
            opacity: idx <= loCurrentStep ? 1 : 0,
            transition: 'opacity 0.20s ease-out',
          },
        };
      }),
    );
    setEdges((prev) =>
      prev.map((edge) => {
        if (!edge.id.startsWith('lo-chain-edge-')) return edge;
        const idx = parseInt(edge.id.replace('lo-chain-edge-', ''), 10);
        return {
          ...edge,
          style: {
            ...edge.style,
            opacity: idx < loCurrentStep ? 0.7 : 0,
            transition: 'opacity 0.3s ease-in-out',
          },
        };
      }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loCurrentStep, loMode, isLogicOperation]);

  // Sprint 12: Logic Operation — entry nodes (no incoming edges) and exit nodes (no outgoing edges)
  const loEntryNodeIds = useMemo<Set<string>>(() => {
    if (!isLogicOperation) return new Set<string>();
    const targetIds = new Set(curationFilteredEdges.map((e) => e.target));
    return new Set(curationFilteredNodes.filter((n) => !targetIds.has(n.id)).map((n) => n.id));
  }, [isLogicOperation, curationFilteredNodes, curationFilteredEdges]);

  const loExitNodeIds = useMemo<Set<string>>(() => {
    if (!isLogicOperation) return new Set<string>();
    const sourceIds = new Set(curationFilteredEdges.map((e) => e.source));
    return new Set(curationFilteredNodes.filter((n) => !sourceIds.has(n.id)).map((n) => n.id));
  }, [isLogicOperation, curationFilteredNodes, curationFilteredEdges]);

  const bfsHoveredNodeId = isLogicOperation ? (highlightState.hoveredNodeId ?? null) : null;
  const { highlightedNodes: bfsHighlightedNodes, highlightedEdges: bfsHighlightedEdges } =
    useBfsHoverHighlight(bfsHoveredNodeId, bfsGraphEdges, 5);

  // --- Sprint 12 T6: BFS Click Focus (persistent, logic-operation perspective) ---
  const {
    selectedNodeId: loSelectedNodeId,
    focusedNodes: loFocusedNodes,
    focusedEdges: loFocusedEdges,
    chainLabel: loChainLabel,
    chainNodeCount: loChainNodeCount,
    selectNode: loSelectNode,
    resetSelection: loResetSelection,
  } = useBfsClickFocus(bfsGraphEdges, 5);

  // --- Sprint 13 T4: SF Click-Select + BFS Highlight (system-framework perspective) ---
  const isSystemFramework = activePerspective === 'system-framework';
  const {
    selectedNodeId: sfSelectedNodeId,
    focusedNodes: sfFocusedNodes,
    focusedEdges: sfFocusedEdges,
    selectNode: sfSelectNode,
    resetSelection: sfResetSelection,
  } = useBfsClickFocus(bfsGraphEdges, 10);

  // --- T5: Path Tracing ---
  // Build lightweight TraceEdge array from RF edges (NeonEdgeData has metadata)
  const traceEdges = useMemo(
    () =>
      curationFilteredEdges.map((e) => {
        const symbols = (e.data as NeonEdgeData | undefined)?.metadata?.importedSymbols;
        type TraceEdgeMeta = { importedSymbols?: string[] };
        const meta: TraceEdgeMeta = symbols !== undefined ? { importedSymbols: symbols } : {};
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          metadata: meta,
        };
      }),
    [curationFilteredEdges],
  );

  const traceNodes = useMemo(
    () => curationFilteredNodes.map((n) => ({ id: n.id })),
    [curationFilteredNodes],
  );

  const { startTracing, tracingSymbol, tracingPath, tracingEdges } = usePathTracing(
    traceNodes,
    traceEdges,
  );

  // Inject startTracing into each edge's data so NeonEdge can call it on symbol click
  const edgesWithTracing = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        data: {
          ...(edge.data as NeonEdgeData),
          onStartTracing: startTracing,
        } as NeonEdgeExtendedData,
      })),
    [edges, startTracing],
  );

  const isTracingMode = tracingSymbol !== null;

  // Sprint 12 T6: Helper — derive category border/bg style for LO focused nodes.
  // Determines category based on filePath directory segments or label patterns.
  const getLoCategoryStyle = useCallback((nodeData: NeonNodeData): React.CSSProperties => {
    const path = (nodeData.filePath ?? '').toLowerCase();
    const label = (nodeData.label ?? '').toLowerCase();
    const is = (keyword: string) =>
      path.includes(`/${keyword}`) || path.includes(`\\${keyword}`) || label.includes(keyword);
    if (is('route') || is('router')) {
      return { borderColor: THEME.loRoutes, background: THEME.loBgRoutes, borderWidth: '2.5px' };
    }
    if (is('service')) {
      return { borderColor: THEME.loServices, background: THEME.loBgServices, borderWidth: '2.5px' };
    }
    if (is('controller')) {
      return { borderColor: THEME.loControllers, background: THEME.loBgControllers, borderWidth: '2.5px' };
    }
    if (is('model')) {
      return { borderColor: THEME.loModels, background: THEME.loBgModels, borderWidth: '2.5px' };
    }
    if (is('middleware')) {
      return { borderColor: THEME.loMiddleware, background: THEME.loBgMiddleware, borderWidth: '2.5px' };
    }
    if (is('util') || is('helper') || is('lib')) {
      return { borderColor: THEME.loUtils, background: THEME.loBgUtils, borderWidth: '2.5px' };
    }
    // Fallback: use routes color
    return { borderColor: THEME.loRoutes, background: THEME.loBgRoutes, borderWidth: '2.5px' };
  }, []);

  // Apply highlight/fade styles to nodes — priority: tracing > e2eTracing > impact > searchFocus > loClickFocus > hover > normal
  // Sprint 9: labelDensity applied as data.labelVisible on every node (all modes)
  const styledNodes = useMemo(() => {
    // Helper: compute labelVisible for a node based on labelDensity preference.
    // 'all' → always true; 'none' → always false; 'smart' → true (NeonNode handles zoom-based logic).
    const getLabelVisible = (nodeType: string): boolean => {
      if (displayPrefs.labelDensity === 'none') return false;
      if (displayPrefs.labelDensity === 'all') return true;
      // 'smart': show directory nodes always; show file nodes above median — NeonNode will apply zoom logic.
      // For now we mark all as visible here; NeonNode reads labelVisible to apply final toggle.
      if (displayPrefs.labelDensity === 'smart') {
        if (nodeType === 'directory') return true;
        const depCount = 0; // placeholder — per-node check done below using actual node
        void depCount;
        return true; // default visible; zoom-based thinning handled in NeonNode
      }
      return true;
    };

    // Helper: per-node smart labelVisible using dependencyCount > median
    const getSmartLabelVisible = (nodeType: string, dependencyCount: number): boolean => {
      if (nodeType === 'directory') return true;
      return dependencyCount >= medianDependencyCount;
    };

    // Sprint 13 T6: Endpoint DJ — all nodes managed by selector/playing system; pass through unchanged.
    if (isDataJourney && hasEndpointGraph) {
      return nodes;
    }

    // Sprint 13 T5 (revised): LO chain mode — nodes managed by stagger effect; pass through.
    if (isLogicOperation && loMode === 'chain') {
      return nodes;
    }

    // Sprint 12 T7: Data Journey — appear/invisible semantics (highest priority in DJ mode)
    if (isDataJourney && djStarted) {
      return nodes.map((node) => {
        const isVisible = djVisibleNodes.has(node.id);
        const isCurrent = djRevealedSteps > 0 && djPath[djRevealedSteps - 1] === node.id;
        const isDone = isVisible && !isCurrent;
        const nodeData = node.data as NeonNodeData;
        const style: React.CSSProperties = {
          ...node.style,
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.25s ease-out, border-color 0.35s ease, box-shadow 0.35s ease',
        };
        if (isCurrent) {
          style.borderColor = THEME.djBorder;
          style.background = THEME.djBg;
          style.border = `3px solid ${THEME.djBorder}`;
          style.filter = 'drop-shadow(0 0 12px rgba(46,125,50,0.4))';
        } else if (isDone) {
          style.borderColor = THEME.djBorder;
          style.background = THEME.djBg;
          style.border = `2.5px solid ${THEME.djBorder}`;
          style.filter = 'drop-shadow(0 2px 8px rgba(46,125,50,0.25))';
        }
        return { ...node, data: { ...nodeData, labelVisible: true, isEntryNode: djEntryNodeIds.has(node.id), isExitNode: djExitNodeIds.has(node.id) }, style };
      });
    }

    if (isDataJourney && !djStarted) {
      // Initial state — entry/exit nodes visible as large cards, everything else hidden
      return nodes.map((node) => {
        const isEntry = djEntryNodeIds.has(node.id);
        const isExit = djExitNodeIds.has(node.id);
        const isVisible = isEntry || isExit;
        const nodeData = node.data as NeonNodeData;
        const style: React.CSSProperties = {
          ...node.style,
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.3s ease',
          ...(isEntry ? {
            background: THEME.djBg,
            border: `2px solid ${THEME.djAccent}`,
          } : isExit ? {
            background: THEME.djExitBg,
            border: `2px solid ${THEME.djExitBorder}`,
          } : {}),
        };
        return { ...node, data: { ...nodeData, labelVisible: true, isEntryNode: isEntry, isExitNode: isExit, djInitial: true }, style };
      });
    }

    if (isTracingMode) {
      return nodes.map((node) => {
        const isOnPath = tracingPath.includes(node.id);
        const nodeData = node.data as NeonNodeData;
        const labelVisible = displayPrefs.labelDensity === 'smart'
          ? getSmartLabelVisible(nodeData.nodeType, nodeData.metadata?.dependencyCount ?? 0)
          : getLabelVisible(nodeData.nodeType);
        return {
          ...node,
          data: { ...nodeData, labelVisible },
          style: {
            ...node.style,
            opacity: isOnPath ? 1.0 : tracingTheme.fadedOpacity,
            transition: `opacity ${animation.edgeFade.duration} ${animation.edgeFade.easing}`,
          },
        };
      });
    }

    // Sprint 9: E2E tracing — nodes on path get full opacity + glow; others dim to 0.15
    if (e2eTracing?.active) {
      return nodes.map((node) => {
        const isOnPath = e2eTracing.path.includes(node.id);
        const nodeData = node.data as NeonNodeData;
        const labelVisible = displayPrefs.labelDensity === 'smart'
          ? getSmartLabelVisible(nodeData.nodeType, nodeData.metadata?.dependencyCount ?? 0)
          : getLabelVisible(nodeData.nodeType);
        // C3: path-lit node — double box-shadow + borderColor + background
        const style: React.CSSProperties = {
          ...node.style,
          opacity: isOnPath ? 1 : 0.15,
          transition: 'opacity 300ms ease, border-color 300ms ease, box-shadow 300ms ease',
        };
        if (isOnPath) {
          style.borderColor = colors.neon.green.DEFAULT;
          style.color = colors.neon.green.DEFAULT;
          style.boxShadow = tracingTheme.panelBackground === '#ffffff'
            ? '0 4px 16px rgba(46,125,50,0.3), 0 0 0 1px rgba(46,125,50,0.15)'
            : '0 4px 16px rgba(46,125,50,0.3)';
          style.background = 'rgba(46,125,50,0.08)';
        }
        return {
          ...node,
          data: { ...nodeData, labelVisible },
          style,
        };
      });
    }

    // Sprint 8: Impact analysis overlay
    if (impactAnalysis?.active) {
      const impactSet = new Set(impactAnalysis.impactedNodes);
      return nodes.map((node) => {
        const isImpacted = impactSet.has(node.id);
        const nodeData = node.data as NeonNodeData;
        const labelVisible = displayPrefs.labelDensity === 'smart'
          ? getSmartLabelVisible(nodeData.nodeType, nodeData.metadata?.dependencyCount ?? 0)
          : getLabelVisible(nodeData.nodeType);
        return {
          ...node,
          data: { ...nodeData, labelVisible },
          style: {
            ...node.style,
            opacity: isImpacted ? 1.0 : 0.15,
            transition: `opacity ${animation.edgeFade.duration} ${animation.edgeFade.easing}`,
          },
        };
      });
    }

    // Sprint 8: Search focus
    if (isSearchFocused) {
      const focusSet = new Set(searchFocusNodes);
      return nodes.map((node) => {
        const nodeData = node.data as NeonNodeData;
        const labelVisible = displayPrefs.labelDensity === 'smart'
          ? getSmartLabelVisible(nodeData.nodeType, nodeData.metadata?.dependencyCount ?? 0)
          : getLabelVisible(nodeData.nodeType);
        return {
          ...node,
          data: { ...nodeData, labelVisible },
          style: {
            ...node.style,
            opacity: focusSet.has(node.id) ? 1.0 : 0.1,
            transition: `opacity ${animation.edgeFade.duration} ${animation.edgeFade.easing}`,
          },
        };
      });
    }

    // Sprint 12 T6: Logic-operation click-focus (persistent, highest priority within LO)
    // Sprint 13: LO category cards (lo-cat-*) are always fully visible — BFS focus only
    // applies to old file-level nodes, not the new category card canvas nodes.
    if (isLogicOperation && loSelectedNodeId) {
      return nodes.map((node) => {
        const isLoCatCard = node.type === 'loCategoryCard';
        const isFocused = isLoCatCard || loFocusedNodes.has(node.id);
        const nodeData = node.data as NeonNodeData;
        const labelVisible = displayPrefs.labelDensity === 'smart'
          ? getSmartLabelVisible(nodeData.nodeType, nodeData.metadata?.dependencyCount ?? 0)
          : getLabelVisible(nodeData.nodeType);
        // Determine category color for focused node
        const categoryStyle = isFocused ? getLoCategoryStyle(nodeData) : {};
        return {
          ...node,
          data: { ...nodeData, labelVisible, isEntryNode: loEntryNodeIds.has(node.id), isExitNode: loExitNodeIds.has(node.id) },
          style: {
            ...node.style,
            opacity: isFocused ? 1.0 : 0.08,
            ...categoryStyle,
            transition: 'all 200ms ease-out',
          },
        };
      });
    }

    // Sprint 12 T6: Logic-operation default state (no selection) — near invisible
    if (isLogicOperation && !loSelectedNodeId) {
      // If hovering, show BFS hover highlight; otherwise all near-invisible
      if (bfsHoveredNodeId) {
        return nodes.map((node) => {
          const isHighlighted = bfsHighlightedNodes.has(node.id);
          const nodeData = node.data as NeonNodeData;
          const labelVisible = displayPrefs.labelDensity === 'smart'
            ? getSmartLabelVisible(nodeData.nodeType, nodeData.metadata?.dependencyCount ?? 0)
            : getLabelVisible(nodeData.nodeType);
          return {
            ...node,
            data: { ...nodeData, labelVisible, isEntryNode: loEntryNodeIds.has(node.id), isExitNode: loExitNodeIds.has(node.id) },
            style: {
              ...node.style,
              opacity: isHighlighted ? 1.0 : 0.3,
              borderColor: isHighlighted ? colors.neon.green.DEFAULT : undefined,
              boxShadow: isHighlighted ? glow.file.normal.boxShadow : 'none',
              transition: 'all 150ms ease-out',
            },
          };
        });
      }
      // No hover, no selection: all nodes visible but faded (reference: system-framework style)
      return nodes.map((node) => {
        const nodeData = node.data as NeonNodeData;
        const labelVisible = displayPrefs.labelDensity === 'smart'
          ? getSmartLabelVisible(nodeData.nodeType, nodeData.metadata?.dependencyCount ?? 0)
          : getLabelVisible(nodeData.nodeType);
        return {
          ...node,
          data: { ...nodeData, labelVisible, isEntryNode: loEntryNodeIds.has(node.id), isExitNode: loExitNodeIds.has(node.id) },
          style: {
            ...node.style,
            opacity: 0.75,
            transition: 'opacity 200ms ease-out',
          },
        };
      });
    }

    // Sprint 13 T4: System-framework click-select + BFS highlight (takes priority over hover)
    if (isSystemFramework && sfSelectedNodeId) {
      return nodes.map((node) => {
        const isFocused = sfFocusedNodes.has(node.id);
        const isSelected = node.id === sfSelectedNodeId;
        const nodeData = node.data as NeonNodeData;
        return {
          ...node,
          // Pass selected=true to DirectoryCard for the blue glow border
          selected: isSelected,
          data: nodeData,
          style: {
            ...node.style,
            opacity: isFocused ? 1.0 : 0.3,
            transition: 'opacity 0.2s',
          },
        };
      });
    }

    // Sprint 12 T5: System-framework 1-hop hover highlight for directoryCard nodes
    if (isSystemFramework && highlightState.hoveredNodeId) {
      return nodes.map((node) => {
        const isHighlighted = highlightState.highlightedNodeIds.has(node.id);
        const nodeData = node.data as NeonNodeData;
        return {
          ...node,
          data: nodeData,
          style: {
            ...node.style,
            opacity: isHighlighted ? 1.0 : 0.25,
            transition: 'opacity 0.2s',
          },
        };
      });
    }

    if (!highlightState.hoveredNodeId) {
      // No overlay active — only apply labelDensity
      return nodes.map((node) => {
        const nodeData = node.data as NeonNodeData;
        const labelVisible = displayPrefs.labelDensity === 'smart'
          ? getSmartLabelVisible(nodeData.nodeType, nodeData.metadata?.dependencyCount ?? 0)
          : getLabelVisible(nodeData.nodeType);
        if (displayPrefs.labelDensity === 'all') return node;
        return { ...node, data: { ...nodeData, labelVisible } };
      });
    }

    return nodes.map((node) => {
      const isHighlighted = highlightState.highlightedNodeIds.has(node.id);
      const nodeData = node.data as NeonNodeData;
      const labelVisible = displayPrefs.labelDensity === 'smart'
        ? getSmartLabelVisible(nodeData.nodeType, nodeData.metadata?.dependencyCount ?? 0)
        : getLabelVisible(nodeData.nodeType);
      return {
        ...node,
        data: { ...nodeData, labelVisible },
        style: {
          ...node.style,
          opacity: isHighlighted ? 1 : 0.35,
          transition: `opacity ${animation.edgeFade.duration} ${animation.edgeFade.easing}`,
        },
      };
    });
  }, [
    nodes,
    highlightState,
    isTracingMode,
    tracingPath,
    e2eTracing,
    impactAnalysis,
    isSearchFocused,
    searchFocusNodes,
    displayPrefs.labelDensity,
    medianDependencyCount,
    isLogicOperation,
    bfsHoveredNodeId,
    bfsHighlightedNodes,
    loSelectedNodeId,
    loFocusedNodes,
    getLoCategoryStyle,
    activePerspective,
    isDataJourney,
    djStarted,
    djVisibleNodes,
    djRevealedSteps,
    djPath,
    djEntryNodeIds,
    djExitNodeIds,
    loEntryNodeIds,
    loExitNodeIds,
    isSystemFramework,
    sfSelectedNodeId,
    sfFocusedNodes,
    loMode,
  ]);

  // Apply highlight/fade styles to edges — priority: tracing > e2eTracing > impact > searchFocus > hover (§10)
  // Note: NeonEdge reads tracingEdges from ViewStateContext directly; here we
  // additionally set the RF edge style so React Flow's own rendering (selection
  // ring, etc.) respects the tracing state. NeonEdge handles the actual stroke.
  const styledEdges = useMemo(() => {
    // Sprint 13 T6: Endpoint DJ — edges managed by stagger effect; pass through unchanged.
    if (isDataJourney && hasEndpointGraph && djMode !== 'selector') {
      return edgesWithTracing;
    }

    // Sprint 13 T5 (revised): LO chain mode — edges managed by stagger effect; pass through.
    if (isLogicOperation && loMode === 'chain') {
      return edgesWithTracing;
    }

    // Sprint 12 T7: Data Journey — stroke-dashoffset "draw" animation for edges
    if (isDataJourney && djStarted) {
      return edgesWithTracing.map((edge) => {
        const isDrawn = djVisibleEdges.has(edge.id);
        return {
          ...edge,
          style: {
            ...edge.style,
            stroke: THEME.djLine,
            strokeWidth: 2,
            strokeDasharray: isDrawn ? undefined : '200',
            strokeDashoffset: isDrawn ? 0 : 200,
            opacity: isDrawn ? 1 : 0,
            transition: 'stroke-dashoffset 0.45s ease-in-out, opacity 0.45s ease-in-out',
            filter: 'none',
          },
        };
      });
    }

    if (isDataJourney && !djStarted) {
      // Initial state: hide all edges until journey starts
      return edgesWithTracing.map((edge) => ({
        ...edge,
        style: {
          ...edge.style,
          opacity: 0,
          transition: 'opacity 0.3s ease',
        },
      }));
    }

    if (isTracingMode) {
      return edgesWithTracing.map((edge) => {
        const isOnPath = tracingEdges.includes(edge.id);
        return {
          ...edge,
          style: {
            ...edge.style,
            stroke: isOnPath ? colors.edge.importHover : colors.edge.import,
            strokeWidth: isOnPath ? 2.5 : 1,
            opacity: isOnPath ? 1.0 : tracingTheme.fadedOpacity,
            filter: 'none',
            transition: `all ${animation.edgeHover.duration} ${animation.edgeHover.easing}`,
          },
        };
      });
    }

    // Sprint 9: E2E tracing — edges on path get full opacity + green glow; others dim to 0.08
    if (e2eTracing?.active) {
      return edgesWithTracing.map((edge) => {
        const isOnPath = e2eTracing.edges.includes(edge.id);
        const style: React.CSSProperties = {
          ...edge.style,
          opacity: isOnPath ? 1 : 0.08,
          transition: `all ${animation.edgeHover.duration} ${animation.edgeHover.easing}`,
        };
        if (isOnPath) {
          style.strokeWidth = 3;
          style.filter = 'none';
        }
        return { ...edge, style };
      });
    }

    // Sprint 8: Impact analysis
    if (impactAnalysis?.active) {
      const impactEdgeSet = new Set(impactAnalysis.impactedEdges);
      return edgesWithTracing.map((edge) => {
        const isImpacted = impactEdgeSet.has(edge.id);
        return {
          ...edge,
          style: {
            ...edge.style,
            stroke: isImpacted ? colors.edge.importHover : colors.edge.import,
            strokeWidth: isImpacted ? 2.5 : 1,
            opacity: isImpacted ? 1.0 : 0.08,
            filter: 'none',
            transition: `all ${animation.edgeHover.duration} ${animation.edgeHover.easing}`,
          },
        };
      });
    }

    // Sprint 8: Search focus
    if (isSearchFocused) {
      const focusEdgeSet = new Set(searchFocusEdges);
      return edgesWithTracing.map((edge) => ({
        ...edge,
        style: {
          ...edge.style,
          opacity: focusEdgeSet.has(edge.id) ? 1.0 : 0.1,
          transition: `all ${animation.edgeHover.duration} ${animation.edgeHover.easing}`,
        },
      }));
    }

    // Sprint 12 T6: Logic-operation click-focus edges (persistent)
    if (isLogicOperation && loSelectedNodeId) {
      return edgesWithTracing.map((edge) => {
        const isFocused = loFocusedEdges.has(edge.id);
        return {
          ...edge,
          style: {
            ...edge.style,
            opacity: isFocused ? 1.0 : 0,
            strokeWidth: isFocused ? 2.5 : 1,
            stroke: isFocused ? colors.edge.importHover : undefined,
            filter: 'none',
            transition: 'all 200ms ease-out',
          },
        };
      });
    }

    // Sprint 12 T6 / Sprint 11 T6: Logic-operation default (no selection) — hide edges, show BFS hover
    if (isLogicOperation && !loSelectedNodeId) {
      if (bfsHoveredNodeId) {
        return edgesWithTracing.map((edge) => {
          const isHighlighted = bfsHighlightedEdges.has(edge.id);
          return {
            ...edge,
            style: {
              ...edge.style,
              opacity: isHighlighted ? 1.0 : 0.08,
              strokeWidth: isHighlighted ? 2.5 : 1,
              stroke: isHighlighted ? colors.edge.importHover : undefined,
              filter: 'none',
              transition: 'all 150ms ease-out',
            },
          };
        });
      }
      // No hover, no selection: hide all edges
      return edgesWithTracing.map((edge) => ({
        ...edge,
        style: { ...edge.style, opacity: 0, transition: 'opacity 200ms ease-out' },
      }));
    }

    // Sprint 13 T4: System-framework click-select BFS edges (takes priority over hover)
    if (isSystemFramework && sfSelectedNodeId) {
      return edgesWithTracing.map((edge) => {
        const isFocused = sfFocusedEdges.has(edge.id);
        return {
          ...edge,
          style: {
            ...edge.style,
            stroke: isFocused ? '#1e88e5' : '#9aa8bc',
            strokeWidth: isFocused ? 2.5 : 1.5,
            opacity: isFocused ? 1.0 : 0.1,
            transition: 'stroke 0.2s, stroke-width 0.2s, opacity 0.2s',
          },
        };
      });
    }

    // Sprint 12 T5: System-framework 1-hop edge highlight for elbowEdge
    if (isSystemFramework && highlightState.hoveredNodeId) {
      return edgesWithTracing.map((edge) => {
        const sfHighlighted = highlightState.highlightedEdgeIds.has(edge.id);
        return {
          ...edge,
          style: {
            ...edge.style,
            stroke: sfHighlighted ? '#1e88e5' : '#9aa8bc',
            strokeWidth: sfHighlighted ? 2.5 : 1.5,
            opacity: sfHighlighted ? 1.0 : 0.12,
            transition: 'stroke 0.2s, stroke-width 0.2s, opacity 0.2s',
          },
        };
      });
    }

    if (!highlightState.hoveredNodeId) return edgesWithTracing;

    return edgesWithTracing.map((edge) => {
      const isHighlighted = highlightState.highlightedEdgeIds.has(edge.id);
      return {
        ...edge,
        style: {
          ...edge.style,
          stroke: isHighlighted ? colors.edge.importHover : colors.edge.import,
          strokeWidth: isHighlighted ? 2.5 : 1,
          opacity: isHighlighted ? 1 : 0.12,
          filter: 'none',
          transition: `all ${animation.edgeHover.duration} ${animation.edgeHover.easing}`,
        },
      };
    });
  }, [edgesWithTracing, highlightState, isTracingMode, tracingEdges, e2eTracing, impactAnalysis, isSearchFocused, searchFocusEdges, isLogicOperation, bfsHoveredNodeId, bfsHighlightedEdges, loSelectedNodeId, loFocusedEdges, activePerspective, isDataJourney, djStarted, djVisibleEdges, isSystemFramework, sfSelectedNodeId, sfFocusedEdges, loMode]);

  // Node click handler → open panel; in LO perspective also triggers click-focus;
  // in data-journey perspective clicking an entry node starts playback
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (isDataJourney) {
        // Sprint 13: DJ selector cards on canvas — click triggers endpoint playback
        if (hasEndpointGraph && djMode === 'selector') {
          const nodeData = node.data as DJSelectorNodeData;
          if (nodeData.subType === 'endpoint-card' && nodeData.endpointId && endpointGraph) {
            // Build chain from endpointGraph edges (BFS)
            const epId = nodeData.endpointId;
            const adjMap = new Map<string, string[]>();
            for (const edge of endpointGraph.edges) {
              if (!adjMap.has(edge.source)) adjMap.set(edge.source, []);
              adjMap.get(edge.source)!.push(edge.target);
            }
            const nodeById = new Map(endpointGraph.nodes.map((n) => [n.id, n]));
            const visited = new Set<string>();
            const queue = [epId];
            visited.add(epId);
            const stepNodes: typeof endpointGraph.nodes = [];
            while (queue.length > 0) {
              const curr = queue.shift()!;
              const currNode = nodeById.get(curr);
              if (currNode && currNode.kind !== 'endpoint') stepNodes.push(currNode);
              for (const nb of adjMap.get(curr) ?? []) {
                if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
              }
            }
            const epNode = nodeById.get(epId);
            const chain: EndpointChain = {
              id: epId,
              method: epNode?.method ?? 'GET',
              path: epNode?.path ?? epNode?.label ?? epId,
              desc: epNode?.label ?? epId,
              steps: stepNodes.map((sn) => ({
                name: sn.label,
                desc: deriveStepDesc(sn.label, sn.filePath ?? ''),
                method: sn.label,
                file: sn.filePath,
              })),
            };
            handleDjEndpointClick(epId, chain);
          }
          return;
        }
        if (hasEndpointGraph) return;
        if (djEntryNodeIds.has(node.id)) {
          // Start journey forward from this entry node
          const { path, edgePath } = computeDjPath(node.id);
          setDjPath(path);
          setDjEdgePath(edgePath);
          setDjStarted(true);
          return;
        }
        if (djExitNodeIds.has(node.id)) {
          // Start journey backward from this exit node (trace upstream)
          const { path, edgePath } = computeDjReversePath(node.id);
          setDjPath(path);
          setDjEdgePath(edgePath);
          setDjStarted(true);
          return;
        }
        return; // non-entry/exit clicks do nothing in DJ initial state
      }
      if (isLogicOperation) {
        // LO chain mode: clicking a chain node selects it for detail panel
        if (node.type === 'loChainNode' && loMode === 'chain' && loSelectedChain) {
          const idx = parseInt(node.id.replace('lo-chain-', ''), 10);
          const chainStep = loSelectedChain[idx];
          if (chainStep) {
            setLoSelectedNode(chainStep);
          }
          return;
        }
        // LO-2: loCategoryCard nodes are synthetic (id like "lo-cat-routes") and do not
        // exist in the original graph — clicking the card itself is a no-op at the canvas
        // level. Method-row clicks are handled inside LOCategoryCardNode via onMethodClick.
        if (node.type === 'loCategoryCard') return;
        const nodeData = node.data as NeonNodeData | undefined;
        const label = nodeData?.label ?? node.id;
        loSelectNode(node.id, label);
        return; // Do not open NodePanel for LO perspective nodes
      }
      // Sprint 13 T4: SF click-select
      if (isSystemFramework) {
        const nodeData = node.data as NeonNodeData | undefined;
        const label = nodeData?.label ?? node.id;
        sfSelectNode(node.id, label);
        return; // SF handles selection internally; do not open NodePanel
      }
      onNodeClick?.(node.id);
    },
    [onNodeClick, isLogicOperation, loSelectNode, isDataJourney, djEntryNodeIds, djExitNodeIds, computeDjPath, computeDjReversePath, isSystemFramework, sfSelectNode, hasEndpointGraph, djMode, endpointGraph, handleDjEndpointClick, loMode, loSelectedChain],
  );

  // Pane (empty canvas area) click → reset LO selection or reset DJ journey
  const handlePaneClick = useCallback(() => {
    if (isLogicOperation) {
      loResetSelection();
    }
    if (isDataJourney && djStarted) {
      setDjPath([]);
      setDjEdgePath([]);
      setDjStarted(false);
    }
    // Sprint 13 T4: reset SF selection on pane click
    if (isSystemFramework && sfSelectedNodeId) {
      sfResetSelection();
    }
  }, [isLogicOperation, loResetSelection, isDataJourney, djStarted, isSystemFramework, sfSelectedNodeId, sfResetSelection]);

  // Sprint 13 T5 (revised): LO method click — mirrors DJ endpoint click pattern
  // Builds chain, replaces RF canvas with chain nodes, starts stagger playback
  const handleLOMethodClick = useCallback(
    (methodName: string, _category: LoCategory) => {
      if (!endpointGraph) {
        setLoSelectedChain(null);
        setLoEndpointLabel('');
        return;
      }
      const result = buildChainFromEndpointGraph(methodName, endpointGraph);
      const steps = result.steps;
      if (steps.length === 0) {
        setLoSelectedChain(null);
        setLoEndpointLabel('');
        return;
      }
      setLoSelectedChain(steps);
      setLoEndpointLabel(result.endpointLabel);
      setLoSelectedNode(null);
      setLoMode('chain');
      startLoChainPlayback(steps);

      // Center the view on the chain (like DJ does)
      requestAnimationFrame(() => {
        setTimeout(() => {
          rfSetCenterRef.current(0, (steps.length * 88) / 2, { zoom: 0.9, duration: 400 });
        }, 100);
      });
    },
    [endpointGraph, startLoChainPlayback],
  );
  // Keep loMethodClickRef in sync so node data callback is always fresh
  loMethodClickRef.current = handleLOMethodClick;

  // Sprint 13 T5: LO chain node click — from LOCallChain node
  const handleLOChainNodeClick = useCallback((step: ChainStep) => {
    setLoSelectedNode(step);
  }, []);

  // Sprint 13 T5 (revised): LO clear — go back to groups view, restore canvas nodes
  const handleLOClear = useCallback(() => {
    if (loStepTimerRef.current) {
      clearInterval(loStepTimerRef.current);
      loStepTimerRef.current = null;
    }
    setLoMode('groups');
    setLoSelectedChain(null);
    setLoSelectedNode(null);
    setLoEndpointLabel('');
    setLoCurrentStep(-1);
    setLoStepIsPlaying(false);
    setNodes(curationFilteredNodes);
    setEdges(curationFilteredEdges);
  }, [curationFilteredNodes, curationFilteredEdges, setNodes, setEdges]);

  // Sprint 7 — double-click on file node → zoom into file (load function nodes)
  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const nodeData = node.data as NeonNodeData | undefined;
      if (nodeData?.nodeType === 'file') {
        void zoomInto(node.id);
      }
    },
    [zoomInto],
  );

  // Sprint 8 — Context menu
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      dispatch({
        type: 'SHOW_CONTEXT_MENU',
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
      });
    },
    [dispatch],
  );

  const handleCloseContextMenu = useCallback(() => {
    dispatch({ type: 'HIDE_CONTEXT_MENU' });
  }, [dispatch]);

  // Sprint 8 — Impact analysis
  const allGraphEdges = useMemo<GraphEdge[]>(
    () =>
      curationFilteredEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: (e.data as NeonEdgeData | undefined)?.edgeType ?? 'import',
        metadata: (e.data as NeonEdgeData | undefined)?.metadata,
      })),
    [curationFilteredEdges],
  );

  const { analyze: impactAnalyze, updateDepth: impactUpdateDepth, clearImpact } = useImpactAnalysis(allGraphEdges);

  // Suppress unused variable warning — impactUpdateDepth and clearImpact consumed by ContextMenu/ImpactPanel callers
  void impactUpdateDepth;
  void clearImpact;

  const handleImpactForward = useCallback(
    (nodeId: string) => {
      impactAnalyze(nodeId, 'forward');
    },
    [impactAnalyze],
  );

  const handleImpactReverse = useCallback(
    (nodeId: string) => {
      impactAnalyze(nodeId, 'reverse');
    },
    [impactAnalyze],
  );

  const handleCopyPath = useCallback(
    (nodeId: string) => {
      const node = curationFilteredNodes.find((n) => n.id === nodeId);
      const filePath = node ? (node.data as NeonNodeData).filePath : nodeId;
      void navigator.clipboard.writeText(filePath);
    },
    [curationFilteredNodes],
  );

  const handleOpenInPanel = useCallback(
    (nodeId: string) => {
      onNodeClick?.(nodeId);
    },
    [onNodeClick],
  );

  // Node mouse handlers for React Flow
  const handleNodeMouseEnter = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Suppress hover highlight while tracing (§10)
      if (isTracingMode) return;
      onNodeMouseEnter(_event, node.id);
    },
    [onNodeMouseEnter, isTracingMode],
  );

  const handleNodeMouseLeave = useCallback(
    (_event: React.MouseEvent, _node: Node) => {
      if (isTracingMode) return;
      onNodeMouseLeave();
    },
    [onNodeMouseLeave, isTracingMode],
  );

  // Edge hover handlers — dispatch HOVER_EDGE so NeonEdge can show symbol label
  const handleEdgeMouseEnter = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      dispatch({ type: 'HOVER_EDGE', edgeId: edge.id });
    },
    [dispatch],
  );

  const handleEdgeMouseLeave = useCallback(() => {
    dispatch({ type: 'HOVER_EDGE', edgeId: null });
  }, [dispatch]);

  // Suppress unused variable warning — hoveredEdgeId is read by NeonEdge via context
  void hoveredEdgeId;

  return (
    <div
      className="codeatlas-canvas"
    >
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={defaultNodeTypes}
        edgeTypes={defaultEdgeTypes}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={handleNodeContextMenu}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        onEdgeMouseEnter={handleEdgeMouseEnter}
        onEdgeMouseLeave={handleEdgeMouseLeave}
        onPaneClick={handlePaneClick}
        fitView={!isDataJourney && !isLogicOperation}
        fitViewOptions={{ padding: 0.3, maxZoom: 1.0 }}
        minZoom={0.3}
        maxZoom={2}
        defaultEdgeOptions={{
          animated: false,
          style: { stroke: colors.edge.import, strokeWidth: 1.5, opacity: 0.7, filter: 'none' },
        }}
      >
        <Background
          variant={BackgroundVariant.Lines}
          color={canvas.reactFlowBackground.color}
          size={canvas.reactFlowBackground.size}
          gap={canvas.reactFlowBackground.gap}
        />
        <MiniMap
          style={{
            width: canvas.minimap.width,
            height: canvas.minimap.height,
            background: canvas.minimap.background,
            border: canvas.minimap.border,
            borderRadius: canvas.minimap.borderRadius,
          }}
          maskColor={canvas.minimap.viewportColor}
          nodeColor={(node) => {
            const data = node.data as NeonNodeData | undefined;
            if (data?.nodeType === 'directory') return canvas.minimap.nodeColor.directory;
            return canvas.minimap.nodeColor.file;
          }}
        />
        <Controls
          style={{
            background: canvas.toolbar.background,
            border: canvas.toolbar.border,
            borderRadius: canvas.toolbar.borderRadius,
          }}
        />
      </ReactFlow>
      <div className="codeatlas-vignette" />
      {/* Sprint 8: Context Menu */}
      <ContextMenu
        visible={contextMenu?.visible ?? false}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        nodeId={contextMenu?.nodeId ?? null}
        onClose={handleCloseContextMenu}
        onImpactForward={handleImpactForward}
        onImpactReverse={handleImpactReverse}
        onCopyPath={handleCopyPath}
        onOpenInPanel={handleOpenInPanel}
        {...(onStartE2ETracing !== undefined && { onStartE2ETracing })}
      />
      {/* Sprint 12 T6: Logic Operation — perspective hint (shown when no selection, groups mode) */}
      {isLogicOperation && loMode === 'groups' && (
        <PerspectiveHint
          type="logic-operation"
          visible={!loSelectedNodeId}
        />
      )}
      {/* Sprint 12 T6: Logic Operation — chain info panel (shown after click, groups mode) */}
      {isLogicOperation && loMode === 'groups' && (
        <ChainInfoPanel
          visible={!!loSelectedNodeId}
          chainLabel={loChainLabel}
          chainNodeCount={loChainNodeCount}
          onReset={loResetSelection}
        />
      )}
      {/* Sprint 13 T5 (revised): LO chain mode — top bar overlay (canvas is RF itself) */}
      {isLogicOperation && loMode === 'chain' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 300,
            zIndex: 18,
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.95)',
            borderBottom: '1px solid #e0e0e0',
            backdropFilter: 'blur(8px)',
          }}
        >
          <button
            onClick={handleLOClear}
            style={{
              background: 'none',
              border: '1px solid #e0e0e0',
              borderRadius: 4,
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: 11,
              color: '#616161',
              fontFamily: "'Inter', sans-serif",
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              flexShrink: 0,
            }}
          >
            ← 返回分類視圖
          </button>
          {loEndpointLabel && (
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                fontWeight: 700,
                color: '#1565c0',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {loEndpointLabel}
            </span>
          )}
          <span
            style={{
              fontSize: 11,
              color: '#9e9e9e',
              fontFamily: "'Inter', sans-serif",
              marginLeft: 'auto',
              flexShrink: 0,
            }}
          >
            {loCurrentStep + 1} / {loSelectedChain?.length ?? 0} 步驟
          </span>
        </div>
      )}
      {/* Sprint 13 T5: LO chain mode — bottom legend + clear button */}
      {isLogicOperation && loMode === 'chain' && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 300,
            zIndex: 18,
            pointerEvents: 'auto',
            background: 'rgba(255,255,255,0.95)',
            borderTop: '1px solid #e0e0e0',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Category legend */}
          <div
            style={{
              padding: '6px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              color: '#666',
            }}
          >
            {(['routes', 'middleware', 'services', 'models', 'utils'] as const).map((cat) => {
              const catLabels: Record<string, string> = {
                routes: '路線', middleware: '中間層', services: '服務', models: '模型', utils: '工具',
              };
              const catColors: Record<string, string> = {
                routes: '#1565c0', middleware: '#00838f', services: '#7b1fa2', models: '#4e342e', utils: '#546e7a',
              };
              return (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: catColors[cat] }} />
                  <span>{catLabels[cat]}</span>
                </div>
              );
            })}
          </div>
          {/* Clear button */}
          <div style={{ padding: '6px 12px', display: 'flex', justifyContent: 'center', borderTop: '1px solid #f0f0f0' }}>
            <button
              onClick={handleLOClear}
              style={{
                background: 'none',
                border: '1px solid #e0e0e0',
                borderRadius: 4,
                padding: '5px 20px',
                cursor: 'pointer',
                fontSize: 12,
                color: '#616161',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              清除選取
            </button>
          </div>
        </div>
      )}
      {/* Sprint 13 T7: Unified right-side panel — switches between SF / LO / DJ */}
      <RightPanel
        perspective={activePerspective}
        sfSelectedNodeId={sfSelectedNodeId}
        sfDirectoryGraph={directoryGraph ?? null}
        sfGraphNodes={sfPanelNodes ?? []}
        sfGraphEdges={sfPanelEdges ?? []}
        loSelectedStep={loSelectedNode}
        loGraphNodes={sfPanelNodes ?? []}
        loGraphEdges={sfPanelEdges ?? []}
        djEndpointId={djSelectedEndpoint}
        djChain={djSelectedChain}
        djCurrentStep={djCurrentStep}
        djIsPlaying={djStepIsPlaying}
        onDjReplay={handleDjEndpointReplay}
        onDjClear={handleDjEndpointClear}
        onDjStepClick={handleDjStepClick}
      />
      {/* Sprint 12 T5: System Framework — bottom legend bar */}
      {activePerspective === 'system-framework' && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 44,
            background: '#ffffff',
            borderTop: `1px solid ${THEME.borderDefault}`,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 20,
            paddingRight: 20,
            gap: 20,
            fontFamily: THEME.fontUi,
            fontSize: 11,
            color: THEME.inkSecondary,
            zIndex: 15,
            pointerEvents: 'none',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: THEME.sfBorder,
                flexShrink: 0,
              }}
            />
            模組目錄
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                display: 'inline-block',
                width: 18,
                height: 3,
                borderRadius: 2,
                background: THEME.edgeDefault,
                flexShrink: 0,
              }}
            />
            依賴箭頭
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                display: 'inline-block',
                width: 18,
                height: 3,
                borderRadius: 2,
                background: THEME.sfLine,
                flexShrink: 0,
              }}
            />
            Hover 高亮路徑
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: THEME.inkFaint }}>
            {sfSelectedNodeId ? '點擊空白重置選取' : '點擊目錄卡片查看詳情'}
          </span>
        </div>
      )}
      {/* Sprint 13 T6: DJ selector now renders as canvas RF nodes (djSelectorCard), no overlay needed */}
      {/* Sprint 13 T7: DJ right panel is now rendered via <RightPanel> above */}
      {/* Sprint 12 T7: Data Journey (file-level fallback) — center hint (shown before journey starts) */}
      {isDataJourney && !hasEndpointGraph && (
        <PerspectiveHint
          type="data-journey"
          visible={!djStarted}
        />
      )}
      {/* Sprint 12 T7: Data Journey (file-level fallback) — right side panel */}
      {isDataJourney && !hasEndpointGraph && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            zIndex: 20,
            display: 'flex',
            pointerEvents: 'auto',
          }}
        >
          <JourneyPanel
            steps={djJourneySteps}
            revealedSteps={djRevealedSteps}
            isPlaying={djIsPlaying}
            onReplay={handleDjReplay}
          />
        </div>
      )}
      {/* Sprint 12 T6: Logic Operation — bottom legend bar */}
      {isLogicOperation && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 44,
            background: '#ffffff',
            borderTop: `1px solid ${THEME.borderDefault}`,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 16,
            paddingRight: 16,
            gap: 16,
            fontFamily: THEME.fontUi,
            fontSize: 12,
            color: THEME.inkSecondary,
            zIndex: 15,
            pointerEvents: 'none',
          }}
        >
          {([
            { label: '路線', color: THEME.loRoutes },
            { label: '服務', color: THEME.loServices },
            { label: '控制器', color: THEME.loControllers },
            { label: '模型', color: THEME.loModels },
            { label: '工具', color: THEME.loUtils },
            { label: '中間層', color: THEME.loMiddleware },
          ] as const).map(({ label, color }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: color,
                  flexShrink: 0,
                }}
              />
              {label}
            </span>
          ))}
          <span style={{ flex: 1 }} />
          <span style={{ color: THEME.inkMuted }}>
            點擊節點展開呼叫鏈 · 點擊空白重置
          </span>
        </div>
      )}
    </div>
  );
}
