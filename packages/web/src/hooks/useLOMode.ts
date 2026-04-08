/**
 * useLOMode — extracted from GraphCanvas.tsx (Sprint 17 refactor)
 *
 * Encapsulates all Logic Operation (LO) state and logic:
 *   - LO state variables (loMode, loSelectedChain, loSelectedNode, etc.)
 *   - Reset effect when perspective changes away from logic-operation
 *   - LO handlers: handleLOMethodClick, handleLOChainNodeClick, handleLOClear
 *   - startLoChainPlayback
 *   - LO chain sync effects (step state + selected node state)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { NeonNodeData, NeonEdgeData } from '../adapters/graph-adapter';
import type { EndpointGraph, ChainStep } from '../types/graph';
import type { LoCategory } from '../components/LOCategoryGroup';
import { buildChainFromEndpointGraph } from '../components/LOCallChain';
import { CATEGORY_CONFIG } from '../components/LOCategoryGroup';

export interface UseLOModeParams {
  activePerspective: string;
  endpointGraph: EndpointGraph | null | undefined;
  curationFilteredNodes: Node[];
  curationFilteredEdges: Edge[];
  /** React Flow setNodes — must be stable */
  setNodes: React.Dispatch<React.SetStateAction<Node<NeonNodeData>[]>>;
  /** React Flow setEdges — must be stable */
  setEdges: React.Dispatch<React.SetStateAction<Edge<NeonEdgeData>[]>>;
  /** rfSetCenter adjusted for the right panel offset */
  setCenterAdjusted: (cx: number, cy: number, opts: { zoom: number; duration?: number }) => void;
}

export interface UseLOModeResult {
  loMode: 'groups' | 'chain';
  loSelectedChain: ChainStep[] | null;
  loSelectedNode: ChainStep | null;
  loEndpointLabel: string;
  loCurrentStep: number;
  loStepIsPlaying: boolean;
  handleLOMethodClick: (methodName: string, category: LoCategory) => void;
  handleLOChainNodeClick: (step: ChainStep) => void;
  handleLOClear: () => void;
  startLoChainPlayback: (steps: ChainStep[]) => void;
}

export function useLOMode({
  activePerspective,
  endpointGraph,
  curationFilteredNodes,
  curationFilteredEdges,
  setNodes,
  setEdges,
  setCenterAdjusted,
}: UseLOModeParams): UseLOModeResult {
  const isLogicOperation = activePerspective === 'logic-operation';

  const [loMode, setLoMode] = useState<'groups' | 'chain'>('groups');
  const [loSelectedChain, setLoSelectedChain] = useState<ChainStep[] | null>(null);
  const [loSelectedNode, setLoSelectedNode] = useState<ChainStep | null>(null);
  const [loEndpointLabel, setLoEndpointLabel] = useState<string>('');
  const [loCurrentStep, setLoCurrentStep] = useState<number>(-1);
  const [loStepIsPlaying, setLoStepIsPlaying] = useState(false);
  const loStepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Sprint 13 T5 (revised): Sync LO chain node visual states based on loCurrentStep
  useEffect(() => {
    if (!isLogicOperation || loMode !== 'chain' || !loSelectedChain) return;
    setNodes((prev) =>
      prev.map((node) => {
        if (!node.id.startsWith('lo-chain-')) return node;
        const idx = parseInt(node.id.replace('lo-chain-', ''), 10);
        const chainStep = loSelectedChain[idx];
        if (!chainStep) return node;
        const animDone = !loStepIsPlaying && loCurrentStep >= 0;
        const state: 'unreached' | 'active' | 'completed' =
          animDone
            ? (idx <= loCurrentStep ? 'completed' : 'unreached')
            : idx < loCurrentStep ? 'completed' :
              idx === loCurrentStep ? 'active' :
              'unreached';
        // Early-exit: skip object re-creation if visual state unchanged
        const prevState = (node.data as Record<string, unknown>).state;
        const newOpacity = idx <= loCurrentStep ? 1 : 0;
        const prevOpacity = (node.style as Record<string, unknown> | undefined)?.opacity;
        if (prevState === state && prevOpacity === newOpacity) return node;
        return {
          ...node,
          data: {
            ...node.data,
            state,
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
        if (!edge.id.startsWith('lo-chain-edge-')) return edge;
        const idx = parseInt(edge.id.replace('lo-chain-edge-', ''), 10);
        const newOpacity = idx < loCurrentStep ? 0.7 : 0;
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
  }, [loCurrentStep, loMode, isLogicOperation, loStepIsPlaying]);

  // LO chain: update `selected` flag on chain nodes when user clicks one
  useEffect(() => {
    if (!isLogicOperation || loMode !== 'chain') return;
    const selectedId = loSelectedNode ? `lo-chain-${loSelectedChain?.indexOf(loSelectedNode) ?? -1}` : null;
    setNodes((prev) =>
      prev.map((node) => {
        if (!node.id.startsWith('lo-chain-')) return node;
        const isSelected = node.id === selectedId;
        const prevSelected = (node.data as Record<string, unknown>).selected;
        if (prevSelected === isSelected) return node;
        return { ...node, data: { ...node.data, selected: isSelected } };
      }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loSelectedNode, loMode, isLogicOperation]);

  // Sprint 13 T5: LO method click — mirrors DJ endpoint click pattern
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

      requestAnimationFrame(() => {
        setTimeout(() => {
          setCenterAdjusted(0, (steps.length * 88) / 2, { zoom: 0.9, duration: 400 });
        }, 100);
      });
    },
    [endpointGraph, startLoChainPlayback, setCenterAdjusted],
  );

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

  return {
    loMode,
    loSelectedChain,
    loSelectedNode,
    loEndpointLabel,
    loCurrentStep,
    loStepIsPlaying,
    handleLOMethodClick,
    handleLOChainNodeClick,
    handleLOClear,
    startLoChainPlayback,
  };
}
