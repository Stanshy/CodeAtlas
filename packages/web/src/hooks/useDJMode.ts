/**
 * useDJMode — extracted from GraphCanvas.tsx (Sprint 17 refactor)
 *
 * Encapsulates all Data Journey (DJ) state and logic:
 *   - DJ state variables (djPath, djEdgePath, djStarted, djMode, etc.)
 *   - Reset effects when perspective changes away from data-journey
 *   - BFS path computation (computeDjPath / computeDjReversePath)
 *   - DJ handlers (buildDjStepNodes, startDjEndpointPlayback, handleDjEndpointClick, etc.)
 *   - DJ step sync effect
 *   - djJourneySteps memo
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { NeonNodeData, NeonEdgeData } from '../adapters/graph-adapter';
import type { EndpointChain } from '../types/graph';
import type { JourneyStep } from '../components/JourneyPanel';
import { useStaggerAnimation } from './useStaggerAnimation';
import { THEME } from '../styles/theme';
import { deriveStepDesc } from '../utils/dj-descriptions';

export interface UseDJModeParams {
  isDataJourney: boolean;
  hasEndpointGraph: boolean;
  /** Filtered/curated RF nodes for the current perspective */
  curationFilteredNodes: Node[];
  /** Filtered/curated RF edges for the current perspective */
  curationFilteredEdges: Edge[];
  djEntryNodeIds: Set<string>;
  djExitNodeIds: Set<string>;
  /** React Flow setNodes — must be stable (from useNodesState) */
  setNodes: React.Dispatch<React.SetStateAction<Node<NeonNodeData>[]>>;
  /** React Flow setEdges — must be stable (from useEdgesState) */
  setEdges: React.Dispatch<React.SetStateAction<Edge<NeonEdgeData>[]>>;
  /** rfSetCenter adjusted for the right panel offset */
  setCenterAdjusted: (cx: number, cy: number, opts: { zoom: number; duration?: number }) => void;
}

export interface UseDJModeResult {
  djPath: string[];
  djEdgePath: string[];
  djStarted: boolean;
  djMode: 'selector' | 'playing' | 'done';
  djSelectedEndpoint: string | null;
  djSelectedChain: EndpointChain | null;
  djCurrentStep: number;
  djStepIsPlaying: boolean;
  djClickedStep: number;
  djJourneySteps: JourneyStep[];
  djRevealedSteps: number;
  djIsPlaying: boolean;
  djVisibleNodes: Set<string>;
  djVisibleEdges: Set<string>;
  setDjPath: React.Dispatch<React.SetStateAction<string[]>>;
  setDjEdgePath: React.Dispatch<React.SetStateAction<string[]>>;
  setDjStarted: React.Dispatch<React.SetStateAction<boolean>>;
  computeDjPath: (startNodeId: string) => { path: string[]; edgePath: string[] };
  computeDjReversePath: (startNodeId: string) => { path: string[]; edgePath: string[] };
  handleDjEndpointClick: (endpointId: string, chain: EndpointChain) => void;
  handleDjEndpointReplay: () => void;
  handleDjEndpointClear: () => void;
  handleDjStepClick: (stepIndex: number) => void;
  handleDjReplay: () => void;
}

export function useDJMode({
  isDataJourney,
  hasEndpointGraph,
  curationFilteredNodes,
  curationFilteredEdges,
  djEntryNodeIds: _djEntryNodeIds,
  djExitNodeIds: _djExitNodeIds,
  setNodes,
  setEdges,
  setCenterAdjusted,
}: UseDJModeParams): UseDJModeResult {
  const [djPath, setDjPath] = useState<string[]>([]);
  const [djEdgePath, setDjEdgePath] = useState<string[]>([]);
  const [djStarted, setDjStarted] = useState(false);

  // Sprint 13 T6: Endpoint-level DJ mode state
  const [djMode, setDjMode] = useState<'selector' | 'playing' | 'done'>('selector');
  const [djSelectedEndpoint, setDjSelectedEndpoint] = useState<string | null>(null);
  const [djSelectedChain, setDjSelectedChain] = useState<EndpointChain | null>(null);
  const [djCurrentStep, setDjCurrentStep] = useState<number>(-1);
  const [djStepIsPlaying, setDjStepIsPlaying] = useState(false);
  const [djClickedStep, setDjClickedStep] = useState<number>(-1);
  const djStepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        ...(step.desc ? { aiDescription: step.desc } : {}),
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
    setNodes(rfNodes);
    setEdges(rfEdges);
    setDjCurrentStep(-1);
    setDjStepIsPlaying(true);
    setDjClickedStep(-1);

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
        setCenterAdjusted(0, (chain.steps.length * 96) / 2, { zoom: 0.9, duration: 400 });
      }, 100);
    });
  }, [startDjEndpointPlayback, setCenterAdjusted]);

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
    setDjClickedStep(-1);
    setNodes(curationFilteredNodes);
    setEdges(curationFilteredEdges);
  }, [curationFilteredNodes, curationFilteredEdges, setNodes, setEdges]);

  // Handler: user clicks a step in DJPanel or canvas node → sync both sides
  const handleDjStepClick = useCallback((stepIndex: number) => {
    setDjClickedStep((prev) => (prev === stepIndex ? -1 : stepIndex));
  }, []);

  // Sync endpoint step node visual states based on djCurrentStep
  useEffect(() => {

    if (!isDataJourney || !hasEndpointGraph || djMode === 'selector' || !djSelectedChain) return;
    setNodes((prev) =>
      prev.map((node) => {
        if (!node.id.startsWith('dj-step-')) return node;
        const idx = parseInt(node.id.replace('dj-step-', ''), 10);
        const animDone = djMode === 'done';
        const state: 'unreached' | 'active' | 'completed' =
          animDone
            ? (idx <= djCurrentStep ? 'completed' : 'unreached')
            : idx < djCurrentStep ? 'completed' :
              idx === djCurrentStep ? 'active' :
              'unreached';
        const step = djSelectedChain.steps[idx];
        const isSelected = idx === djClickedStep;
        // Early-exit: skip object re-creation if visual state unchanged
        const prevState = (node.data as Record<string, unknown>).state;
        const prevSelected = (node.data as Record<string, unknown>).selected;
        const newOpacity = idx <= djCurrentStep ? 1 : 0;
        const prevOpacity = (node.style as Record<string, unknown> | undefined)?.opacity;
        if (prevState === state && prevSelected === isSelected && prevOpacity === newOpacity) return node;
        return {
          ...node,
          data: {
            ...node.data,
            stepIndex: idx,
            step,
            state,
            selected: isSelected,
          },
          style: {
            opacity: newOpacity,
            transition: 'opacity 0.20s ease-out',
          },
        };
      }),
    );
    setEdges((prev) =>
      prev.map((edge) => {
        if (!edge.id.startsWith('dj-step-edge-')) return edge;
        const idx = parseInt(edge.id.replace('dj-step-edge-', ''), 10);
        const newOpacity = idx < djCurrentStep ? 0.8 : 0;
        const prevOpacity = (edge.style as Record<string, unknown> | undefined)?.opacity;
        if (prevOpacity === newOpacity) return edge;
        return {
          ...edge,
          style: {
            ...edge.style,
            opacity: newOpacity,
            transition: 'opacity 0.3s ease-in-out',
          },
        };
      }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [djCurrentStep, djMode, isDataJourney, hasEndpointGraph, djClickedStep]);

  // Suppress unused import warning — deriveStepDesc is used by callers of this hook
  void deriveStepDesc;

  return {
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
  };
}
