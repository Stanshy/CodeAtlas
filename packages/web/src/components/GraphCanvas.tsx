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
 *
 * Sprint 17: Refactored — logic extracted to:
 *   useGraphCanvasFiltering, useDJMode, useLOMode, useNodeEdgeStyling, GraphCanvasFooter
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
import React, { useEffect, useMemo, useCallback, useRef } from 'react';
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
import { toReactFlowNodes, toReactFlowEdges } from '../adapters/graph-adapter';
import { computeLayout, registerLayout } from '../adapters/layout-router';
import { dagreLayoutProvider } from '../adapters/dagre-layout';
import { forceDirectedLayoutProvider, pathTracingLayoutProvider } from '../adapters/path-tracing-layout';

// Register layout providers once at module load time
registerLayout(dagreLayoutProvider);
registerLayout(forceDirectedLayoutProvider);
registerLayout(pathTracingLayoutProvider);

import { useViewState } from '../contexts/ViewStateContext';
import { colors, canvas, THEME } from '../styles/theme';
import { useBfsHoverHighlight } from '../hooks/useBfsHoverHighlight';
import { useBfsClickFocus } from '../hooks/useBfsClickFocus';
import { ContextMenu } from './ContextMenu';
import { useImpactAnalysis } from '../hooks/useImpactAnalysis';
import { PerspectiveHint } from './PerspectiveHint';
import { ChainInfoPanel } from './ChainInfoPanel';
import { JourneyPanel } from './JourneyPanel';
import { DJStepNode } from './DJStepNode';
import { LOChainNode } from './LOChainNode';
import { DJSelectorCardNode, type DJSelectorNodeData } from './DJSelectorCardNode';
import { LOCategoryCardNode } from './LOCategoryCardNode';
import { RightPanel } from './RightPanel';
import type { GraphNode, GraphEdge, DirectoryGraph, EndpointGraph, EndpointChain } from '../types/graph';
import { useGraphCanvasFiltering } from '../hooks/useGraphCanvasFiltering';
import { useDJMode } from '../hooks/useDJMode';
import { useLOMode } from '../hooks/useLOMode';
import { useNodeEdgeStyling } from '../hooks/useNodeEdgeStyling';
import { GraphCanvasFooter } from './graph/GraphCanvasFooter';
import { deriveStepDesc } from '../utils/dj-descriptions';

// Stable empty-array ref to avoid creating new [] on every render (prevents unnecessary edge re-renders)
const EMPTY_EDGES: Edge<NeonEdgeData>[] = [];

/** Compute the centroid x/y of an array of positioned nodes. */
function centerOf(nodes: Node[]): { cx: number; cy: number } {
  let sumX = 0, sumY = 0;
  nodes.forEach((n) => { sumX += n.position.x; sumY += n.position.y; });
  return { cx: sumX / nodes.length, cy: sumY / nodes.length };
}

/**
 * Compute initial Data Journey layout: position entry nodes on top row, exit nodes on bottom row.
 * Returns the positioned nodes array and the computed center point for viewport centering.
 */
function computeDjInitialLayout(
  curationFilteredNodes: Node[],
  djEntryNodeIds: Set<string>,
  djExitNodeIds: Set<string>,
): { positioned: Node[]; visibleIds: string[] } {
  const entryIds = Array.from(djEntryNodeIds);
  const exitIds = Array.from(djExitNodeIds).filter((id) => !djEntryNodeIds.has(id));
  const CARD_GAP = 220;
  const ROW_GAP = 120;
  const entryStartX = -(entryIds.length - 1) * CARD_GAP / 2;
  const exitStartX = -(exitIds.length - 1) * CARD_GAP / 2;
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
  return { positioned, visibleIds };
}

/** Build an EndpointChain from an endpointGraph by BFS from the given endpoint ID. */
function buildEndpointChainFromGraph(epId: string, endpointGraph: EndpointGraph): EndpointChain {
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
  return {
    id: epId,
    method: epNode?.method ?? 'GET',
    path: epNode?.path ?? epNode?.label ?? epId,
    desc: epNode?.description ?? epNode?.label ?? epId,
    steps: stepNodes.map((sn) => ({
      name: sn.label,
      desc: sn.description ?? deriveStepDesc(sn.label, sn.filePath ?? ''),
      method: sn.label,
      file: sn.filePath,
    })),
  };
}

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

  // LO method click ref — stable ref avoids stale closures in useMemo
  const loMethodClickRef = useRef<(name: string, category: import('./LOCategoryGroup').LoCategory) => void>(() => undefined);

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

  const { fitView: rfFitView, setCenter: rfSetCenter } = useReactFlow();
  // Stable ref: useReactFlow() returns new refs each render — MUST NOT put rfSetCenter in useEffect deps.
  const rfSetCenterRef = React.useRef(rfSetCenter);
  rfSetCenterRef.current = rfSetCenter;
  // setCenterAdjusted: shifts center-point right so visible area (left of 300px right panel) is centered.
  const setCenterAdjusted = React.useCallback(
    (cx: number, cy: number, opts: { zoom: number; duration?: number }) => { rfSetCenterRef.current(cx + (300 / 2) / opts.zoom, cy, opts); },
    [],
  );

  // Shared viewport animation ref — ensures only one animation is in flight at a time.
  // Prevents viewport lock caused by overlapping setCenterAdjusted/fitView calls.
  const vpAnimRef = useRef<{ raf?: number; timer?: ReturnType<typeof setTimeout> } | null>(null);
  const cancelVpAnim = useCallback(() => {
    if (vpAnimRef.current) {
      if (vpAnimRef.current.raf) cancelAnimationFrame(vpAnimRef.current.raf);
      if (vpAnimRef.current.timer) clearTimeout(vpAnimRef.current.timer);
      vpAnimRef.current = null;
    }
  }, []);
  const scheduleVpCenter = useCallback((cx: number, cy: number, opts: { zoom: number; duration?: number }, delay: number) => {
    cancelVpAnim();
    const raf = requestAnimationFrame(() => {
      const timer = setTimeout(() => {
        setCenterAdjusted(cx, cy, opts);
        vpAnimRef.current = null;
      }, delay);
      vpAnimRef.current = { raf, timer };
    });
    vpAnimRef.current = { raf };
  }, [cancelVpAnim, setCenterAdjusted]);

  const isDataJourney = activePerspective === 'data-journey';
  const hasEndpointGraph = !!endpointGraph && endpointGraph.nodes.length > 0;
  const isLogicOperation = activePerspective === 'logic-operation';
  const isSystemFramework = activePerspective === 'system-framework';

  // Stable callback ref — avoids new function reference on every render which would
  // invalidate curationFilteredNodes useMemo and cause infinite re-render loop.
  const stableOnLOMethodClick = useCallback(
    (name: string, category: import('./LOCategoryGroup').LoCategory) => loMethodClickRef.current(name, category),
    [],
  );

  // Filtering pipeline (extracted hook)
  const {
    curationFilteredNodes,
    curationFilteredEdges,
    djEntryNodeIds,
    djExitNodeIds,
    isDagreLayout,
    isForceDisabled,
    medianDependencyCount,
  } = useGraphCanvasFiltering({
    initialNodes,
    initialEdges,
    filter,
    activePerspective,
    pinnedNodeIds,
    directoryGraph,
    endpointGraph,
    onLOMethodClick: stableOnLOMethodClick,
  });

  // DJ mode (extracted hook)
  const {
    djPath,
    djEdgePath,
    djStarted,
    djMode,
    djSelectedEndpoint,
    djSelectedChain,
    djCurrentStep,
    djStepIsPlaying,
    djClickedStep,
    djJourneySteps,
    djRevealedSteps,
    djIsPlaying,
    djVisibleNodes,
    djVisibleEdges,
    setDjPath,
    setDjEdgePath,
    setDjStarted,
    computeDjPath,
    computeDjReversePath,
    handleDjEndpointClick,
    handleDjEndpointReplay,
    handleDjEndpointClear,
    handleDjStepClick,
    handleDjReplay,
  } = useDJMode({
    isDataJourney,
    hasEndpointGraph,
    curationFilteredNodes,
    curationFilteredEdges,
    djEntryNodeIds,
    djExitNodeIds,
    setNodes,
    setEdges,
    setCenterAdjusted,
  });

  // LO mode (extracted hook)
  const {
    loMode,
    loSelectedChain,
    loSelectedNode,
    loEndpointLabel,
    loCurrentStep,
    handleLOMethodClick,
    handleLOChainNodeClick,
    handleLOClear,
  } = useLOMode({
    activePerspective,
    endpointGraph,
    curationFilteredNodes,
    curationFilteredEdges,
    setNodes,
    setEdges,
    setCenterAdjusted,
  });

  // Keep loMethodClickRef in sync so node data callback is always fresh
  loMethodClickRef.current = handleLOMethodClick;

  // Expanded function nodes (from ViewStateContext)
  const expandedRFNodes = useMemo(
    () => toReactFlowNodes(expandedNodes),
    [expandedNodes],
  );
  const expandedRFEdges = useMemo(
    () => toReactFlowEdges(expandedEdges),
    [expandedEdges],
  );

  // Sprint 12: When entering data-journey initial state, show only entry + exit nodes
  useEffect(() => {
    if (!isDataJourney) return;
    if (hasEndpointGraph) return;
    if (djStarted) return;
    const { positioned, visibleIds } = computeDjInitialLayout(curationFilteredNodes, djEntryNodeIds, djExitNodeIds);
    setNodes(positioned);
    setEdges(curationFilteredEdges);
    if (visibleIds.length > 0) {
      let sumX = 0, sumY = 0, count = 0;
      positioned.forEach((n) => { if (visibleIds.includes(n.id)) { sumX += n.position.x; sumY += n.position.y; count++; } });
      const cx = count > 0 ? sumX / count : 0;
      const cy = count > 0 ? sumY / count : 0;
      scheduleVpCenter(cx + 90, cy + 28, { zoom: 1.0, duration: 400 }, 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDataJourney, djStarted, djEntryNodeIds, djExitNodeIds, curationFilteredNodes, curationFilteredEdges, setNodes, setEdges]);

  // Sync filtered edges when initialEdges change (e.g. refetch)
  // Note: Node sync is handled by the expanded-nodes effect below to avoid duplicate setNodes calls.
  useEffect(() => {

    if (isDagreLayout) return;
    if (isDataJourney && hasEndpointGraph) return;
    setEdges(curationFilteredEdges);
  }, [curationFilteredEdges, setEdges, isDagreLayout, isDataJourney, hasEndpointGraph]);

  // Merge expanded function nodes and call edges into the display graph
  useEffect(() => {

    if (isDagreLayout || isDataJourney) return;
    if (expandedRFNodes.length === 0) {
      setNodes(curationFilteredNodes);
    } else {
      setNodes((prev) => {
        const nonExpanded = prev.filter((n) => {
          const nodeType = (n.data as NeonNodeData | undefined)?.nodeType;
          return nodeType !== 'function' && nodeType !== 'class';
        });
        return [...nonExpanded, ...expandedRFNodes];
      });
    }
  }, [expandedRFNodes, curationFilteredNodes, setNodes, isDagreLayout, isDataJourney]);

  useEffect(() => {

    if (isDagreLayout) return;
    if (isDataJourney && hasEndpointGraph) return;
    if (expandedRFEdges.length === 0) {
      setEdges(curationFilteredEdges);
    } else {
      setEdges((prev) => {
        const nonCall = prev.filter(
          (e) => (e.data)?.edgeType !== 'call',
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

  // Apply layout engine for dagre (Sprint 11 T4 + T5)
  useEffect(() => {
    if (!isDagreLayout || curationFilteredNodes.length === 0) return;
    if (isLogicOperation) {
      if (loMode === 'chain') return;
      setNodes(curationFilteredNodes);
      setEdges(curationFilteredEdges);
      const { cx, cy } = centerOf(curationFilteredNodes);
      scheduleVpCenter(cx, cy, { zoom: 0.85, duration: 500 }, 150);
      return;
    }
    const layoutResult = computeLayout('dagre-hierarchical', { nodes: curationFilteredNodes, edges: curationFilteredEdges });
    setNodes(layoutResult.nodes);
    setEdges(layoutResult.edges);
    if (layoutResult.nodes.length > 0 && activePerspective === 'system-framework') {
      const { cx, cy } = centerOf(layoutResult.nodes);
      scheduleVpCenter(cx, cy, { zoom: 0.85, duration: 500 }, 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDagreLayout, curationFilteredNodes, curationFilteredEdges, setNodes, setEdges, activePerspective]);

  // DJ selector: sync nodes + zoom to center
  useEffect(() => {
    if (!isDataJourney || !hasEndpointGraph || djMode !== 'selector') return;
    if (curationFilteredNodes.length === 0) return;
    setNodes(curationFilteredNodes);
    setEdges(EMPTY_EDGES);
    const cardNodes = curationFilteredNodes.filter((n) => (n.data as DJSelectorNodeData)?.subType === 'endpoint-card');
    const { cx, cy } = centerOf(cardNodes.length > 0 ? cardNodes : curationFilteredNodes);
    scheduleVpCenter(cx + 130, cy, { zoom: 0.85, duration: 500 }, 150);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDataJourney, hasEndpointGraph, curationFilteredNodes, djMode, setNodes, setEdges]);

  // Fit viewport after perspective change
  useEffect(() => {
    if (isDataJourney) {
      if (hasEndpointGraph && djMode === 'selector') return;
      return;
    }
    if (isLogicOperation) return;
    if (activePerspective === 'system-framework') return;
    cancelVpAnim();
    const timer = setTimeout(() => {
      rfFitView({ padding: 0.2, maxZoom: 1.5, duration: 400 });
    }, 250);
    return () => { clearTimeout(timer); cancelVpAnim(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePerspective]);

  // Hover + BFS highlight
  const { highlightState, onNodeMouseEnter, onNodeMouseLeave } = useHoverHighlight(edges);

  const bfsGraphEdges = useMemo<import('../types/graph').GraphEdge[]>(
    () => curationFilteredEdges.map((e) => ({ id: e.id, source: e.source, target: e.target, type: (e.data as NeonEdgeData | undefined)?.edgeType ?? 'import', metadata: (e.data as NeonEdgeData | undefined)?.metadata })),
    [curationFilteredEdges],
  );

  const bfsHoveredNodeId = isLogicOperation ? (highlightState.hoveredNodeId ?? null) : null;
  const { highlightedNodes: bfsHighlightedNodes, highlightedEdges: bfsHighlightedEdges } =
    useBfsHoverHighlight(bfsHoveredNodeId, bfsGraphEdges, 5);

  // Sprint 12 T6: BFS Click Focus
  const {
    selectedNodeId: loSelectedNodeId,
    focusedNodes: loFocusedNodes,
    focusedEdges: loFocusedEdges,
    chainLabel: loChainLabel,
    chainNodeCount: loChainNodeCount,
    selectNode: loSelectNode,
    resetSelection: loResetSelection,
  } = useBfsClickFocus(bfsGraphEdges, 5);

  // Sprint 13 T4: SF Click-Select + BFS Highlight
  const {
    selectedNodeId: sfSelectedNodeId,
    focusedNodes: sfFocusedNodes,
    focusedEdges: sfFocusedEdges,
    selectNode: sfSelectNode,
    resetSelection: sfResetSelection,
  } = useBfsClickFocus(bfsGraphEdges, 10);

  // LO entry/exit node IDs
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

  // Path tracing
  const traceEdges = useMemo(
    () => curationFilteredEdges.map((e) => {
      const symbols = (e.data as NeonEdgeData | undefined)?.metadata?.importedSymbols;
      return { id: e.id, source: e.source, target: e.target, metadata: symbols !== undefined ? { importedSymbols: symbols } : {} };
    }),
    [curationFilteredEdges],
  );
  const traceNodes = useMemo(() => curationFilteredNodes.map((n) => ({ id: n.id })), [curationFilteredNodes]);
  const { startTracing, tracingSymbol, tracingPath, tracingEdges } = usePathTracing(traceNodes, traceEdges);
  const edgesWithTracing = useMemo(
    () => edges.map((edge) => ({ ...edge, data: { ...(edge.data as NeonEdgeData), onStartTracing: startTracing } as NeonEdgeExtendedData })),
    [edges, startTracing],
  );

  const isTracingMode = tracingSymbol !== null;

  // Node/edge styling (extracted hook)
  const { styledNodes, styledEdges } = useNodeEdgeStyling({
    nodes,
    edgesWithTracing,
    highlightState,
    isTracingMode,
    tracingPath,
    tracingEdges,
    e2eTracing,
    impactAnalysis,
    isSearchFocused,
    searchFocusNodes,
    searchFocusEdges,
    displayPrefs,
    medianDependencyCount,
    isLogicOperation,
    bfsHoveredNodeId,
    bfsHighlightedNodes,
    bfsHighlightedEdges,
    loSelectedNodeId,
    loFocusedNodes,
    loFocusedEdges,
    loEntryNodeIds,
    loExitNodeIds,
    loMode,
    isDataJourney,
    hasEndpointGraph,
    djMode,
    djStarted,
    djVisibleNodes,
    djVisibleEdges,
    djRevealedSteps,
    djPath,
    djEntryNodeIds,
    djExitNodeIds,
    isSystemFramework,
    sfSelectedNodeId,
    sfFocusedNodes,
    sfFocusedEdges,
  });

  // Event handlers — node click
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (isDataJourney) {
        if (node.type === 'djStepNode' && (djMode === 'playing' || djMode === 'done') && djSelectedChain) {
          const idx = parseInt(node.id.replace('dj-step-', ''), 10);
          if (idx >= 0 && idx < djSelectedChain.steps.length) {
            handleDjStepClick(idx);
          }
          return;
        }
        if (hasEndpointGraph && djMode === 'selector') {
          const nodeData = node.data as DJSelectorNodeData;
          if (nodeData.subType === 'endpoint-card' && nodeData.endpointId && endpointGraph) {
            const chain = buildEndpointChainFromGraph(nodeData.endpointId, endpointGraph);
            handleDjEndpointClick(nodeData.endpointId, chain);
          }
          return;
        }
        if (hasEndpointGraph) return;
        if (djEntryNodeIds.has(node.id)) {
          const { path, edgePath } = computeDjPath(node.id);
          setDjPath(path);
          setDjEdgePath(edgePath);
          setDjStarted(true);
          return;
        }
        if (djExitNodeIds.has(node.id)) {
          const { path, edgePath } = computeDjReversePath(node.id);
          setDjPath(path);
          setDjEdgePath(edgePath);
          setDjStarted(true);
          return;
        }
        return;
      }
      if (isLogicOperation) {
        if (node.type === 'loChainNode' && loMode === 'chain' && loSelectedChain) {
          const idx = parseInt(node.id.replace('lo-chain-', ''), 10);
          const chainStep = loSelectedChain[idx];
          if (chainStep) {
            handleLOChainNodeClick(chainStep);
          }
          return;
        }
        if (node.type === 'loCategoryCard') return;
        const nodeData = node.data as NeonNodeData | undefined;
        const label = nodeData?.label ?? node.id;
        loSelectNode(node.id, label);
        return;
      }
      if (isSystemFramework) {
        const nodeData = node.data as NeonNodeData | undefined;
        const label = nodeData?.label ?? node.id;
        sfSelectNode(node.id, label);
        return;
      }
      onNodeClick?.(node.id);
    },
    [onNodeClick, isLogicOperation, loSelectNode, isDataJourney, djEntryNodeIds, djExitNodeIds, computeDjPath, computeDjReversePath, isSystemFramework, sfSelectNode, hasEndpointGraph, djMode, endpointGraph, handleDjEndpointClick, loMode, loSelectedChain, handleDjStepClick, djSelectedChain, handleLOChainNodeClick],
  );

  // Pane click → reset LO selection or reset DJ journey
  const handlePaneClick = useCallback(() => {
    if (isLogicOperation) {
      loResetSelection();
    }
    if (isDataJourney && djStarted) {
      setDjPath([]);
      setDjEdgePath([]);
      setDjStarted(false);
    }
    if (isSystemFramework && sfSelectedNodeId) {
      sfResetSelection();
    }
  }, [isLogicOperation, loResetSelection, isDataJourney, djStarted, isSystemFramework, sfSelectedNodeId, sfResetSelection]);

  // Sprint 7 — double-click on file node → zoom into file
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
  const allGraphEdges = useMemo<import('../types/graph').GraphEdge[]>(
    () => curationFilteredEdges.map((e) => ({ id: e.id, source: e.source, target: e.target, type: (e.data as NeonEdgeData | undefined)?.edgeType ?? 'import', metadata: (e.data as NeonEdgeData | undefined)?.metadata })),
    [curationFilteredEdges],
  );
  const { analyze: impactAnalyze, updateDepth: impactUpdateDepth, clearImpact } = useImpactAnalysis(allGraphEdges);

  void impactUpdateDepth;
  void clearImpact;

  const handleImpactForward = useCallback(
    (nodeId: string) => { impactAnalyze(nodeId, 'forward'); },
    [impactAnalyze],
  );

  const handleImpactReverse = useCallback(
    (nodeId: string) => { impactAnalyze(nodeId, 'reverse'); },
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
    (nodeId: string) => { onNodeClick?.(nodeId); },
    [onNodeClick],
  );

  const handleNodeMouseEnter = useCallback(
    (_event: React.MouseEvent, node: Node) => {
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
      {/* Sprint 12 T6: Logic Operation — perspective hint */}
      {isLogicOperation && loMode === 'groups' && (
        <PerspectiveHint
          type="logic-operation"
          visible={!loSelectedNodeId}
        />
      )}
      {/* Sprint 12 T6: Logic Operation — chain info panel */}
      {isLogicOperation && loMode === 'groups' && (
        <ChainInfoPanel
          visible={!!loSelectedNodeId}
          chainLabel={loChainLabel}
          chainNodeCount={loChainNodeCount}
          onReset={loResetSelection}
        />
      )}
      {/* Sprint 13 T7: Unified right-side panel */}
      <RightPanel
        perspective={activePerspective}
        sfSelectedNodeId={sfSelectedNodeId}
        sfDirectoryGraph={directoryGraph ?? null}
        sfGraphNodes={sfPanelNodes ?? []}
        sfGraphEdges={sfPanelEdges ?? []}
        loSelectedStep={loSelectedNode}
        loGraphNodes={sfPanelNodes ?? []}
        loGraphEdges={sfPanelEdges ?? []}
        loChain={loSelectedChain}
        djEndpointId={djSelectedEndpoint}
        djChain={djSelectedChain}
        djCurrentStep={djCurrentStep}
        djIsPlaying={djStepIsPlaying}
        djSelectedStep={djClickedStep}
        onDjReplay={handleDjEndpointReplay}
        onDjClear={handleDjEndpointClear}
        onDjStepClick={handleDjStepClick}
      />
      {/* Sprint 13 T6: DJ selector now renders as canvas RF nodes (djSelectorCard), no overlay needed */}
      {/* Sprint 13 T7: DJ right panel is now rendered via <RightPanel> above */}
      {/* Sprint 12 T7: Data Journey (file-level fallback) — center hint */}
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
      {/* Footer bar for SF / DJ / LO perspectives */}
      <GraphCanvasFooter
        activePerspective={activePerspective}
        sfSelectedNodeId={sfSelectedNodeId}
        onSfResetSelection={sfResetSelection}
        hasEndpointGraph={hasEndpointGraph}
        djMode={djMode}
        djSelectedEndpoint={djSelectedEndpoint}
        djSelectedChain={djSelectedChain}
        djCurrentStep={djCurrentStep}
        onDjEndpointClear={handleDjEndpointClear}
        loMode={loMode}
        loEndpointLabel={loEndpointLabel}
        loCurrentStep={loCurrentStep}
        loSelectedChain={loSelectedChain}
        onLOClear={handleLOClear}
      />
    </div>
  );
}
