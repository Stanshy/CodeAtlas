/**
 * useNodeEdgeStyling — extracted from GraphCanvas.tsx (Sprint 17 refactor)
 *
 * Produces styledNodes and styledEdges by applying the priority chain:
 *   viewMode filter > tracing > e2eTracing > impact > searchFocus >
 *   loClickFocus > hover > normal
 *
 * Inputs: nodes, edges, all highlight states (DJ, LO, tracing, e2e, impact,
 *         search, hover, heatmap, displayPrefs)
 * Outputs: { styledNodes, styledEdges }
 */

import { useMemo, useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { NeonNodeData } from '../adapters/graph-adapter';
import type { NeonEdgeExtendedData } from '../components/NeonEdge';
import type { PerspectiveName, DisplayPrefs, E2ETracingState } from '../types/graph';
import { colors, animation, tracing as tracingTheme, glow, THEME } from '../styles/theme';

export interface UseNodeEdgeStylingParams {
  nodes: Node[];
  edges: Node[] | Edge[];   // edgesWithTracing passed in
  edgesWithTracing: Edge[];
  highlightState: {
    hoveredNodeId: string | null;
    highlightedNodeIds: Set<string>;
    highlightedEdgeIds: Set<string>;
  };
  isTracingMode: boolean;
  tracingPath: string[];
  tracingEdges: string[];
  e2eTracing: E2ETracingState | null | undefined;
  impactAnalysis: {
    active: boolean;
    impactedNodes: string[];
    impactedEdges: string[];
  } | null | undefined;
  isSearchFocused: boolean;
  searchFocusNodes: string[];
  searchFocusEdges: string[];
  displayPrefs: DisplayPrefs;
  medianDependencyCount: number;
  isLogicOperation: boolean;
  bfsHoveredNodeId: string | null;
  bfsHighlightedNodes: Set<string>;
  bfsHighlightedEdges: Set<string>;
  loSelectedNodeId: string | null;
  loFocusedNodes: Set<string>;
  loFocusedEdges: Set<string>;
  loEntryNodeIds: Set<string>;
  loExitNodeIds: Set<string>;
  loMode: 'groups' | 'chain';
  isDataJourney: boolean;
  hasEndpointGraph: boolean;
  djMode: 'selector' | 'playing' | 'done';
  djStarted: boolean;
  djVisibleNodes: Set<string>;
  djVisibleEdges: Set<string>;
  djRevealedSteps: number;
  djPath: string[];
  djEntryNodeIds: Set<string>;
  djExitNodeIds: Set<string>;
  isSystemFramework: boolean;
  sfSelectedNodeId: string | null;
  sfFocusedNodes: Set<string>;
  sfFocusedEdges: Set<string>;
}

export interface UseNodeEdgeStylingResult {
  styledNodes: Node[];
  styledEdges: Edge[];
}

export function useNodeEdgeStyling({
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
}: UseNodeEdgeStylingParams): UseNodeEdgeStylingResult {
  // Sprint 12 T6: Helper — derive category border/bg style for LO focused nodes.
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
    return { borderColor: THEME.loRoutes, background: THEME.loBgRoutes, borderWidth: '2.5px' };
  }, []);

  // Apply highlight/fade styles to nodes — priority: tracing > e2eTracing > impact > searchFocus > loClickFocus > hover > normal
  const styledNodes = useMemo(() => {
    const getLabelVisible = (nodeType: string): boolean => {
      if (displayPrefs.labelDensity === 'none') return false;
      if (displayPrefs.labelDensity === 'all') return true;
      if (displayPrefs.labelDensity === 'smart') {
        if (nodeType === 'directory') return true;
        const depCount = 0;
        void depCount;
        return true;
      }
      return true;
    };

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

    // Sprint 9: E2E tracing
    if (e2eTracing?.active) {
      return nodes.map((node) => {
        const isOnPath = e2eTracing.path.includes(node.id);
        const nodeData = node.data as NeonNodeData;
        const labelVisible = displayPrefs.labelDensity === 'smart'
          ? getSmartLabelVisible(nodeData.nodeType, nodeData.metadata?.dependencyCount ?? 0)
          : getLabelVisible(nodeData.nodeType);
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
        return { ...node, data: { ...nodeData, labelVisible }, style };
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

    // Sprint 12 T6: Logic-operation click-focus
    if (isLogicOperation && loSelectedNodeId) {
      return nodes.map((node) => {
        const isLoCatCard = node.type === 'loCategoryCard';
        const isFocused = isLoCatCard || loFocusedNodes.has(node.id);
        const nodeData = node.data as NeonNodeData;
        const labelVisible = displayPrefs.labelDensity === 'smart'
          ? getSmartLabelVisible(nodeData.nodeType, nodeData.metadata?.dependencyCount ?? 0)
          : getLabelVisible(nodeData.nodeType);
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

    // Sprint 12 T6: Logic-operation default state (no selection)
    if (isLogicOperation && !loSelectedNodeId) {
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

    // Sprint 13 T4: System-framework click-select + BFS highlight
    if (isSystemFramework && sfSelectedNodeId) {
      return nodes.map((node) => {
        const isFocused = sfFocusedNodes.has(node.id);
        const isSelected = node.id === sfSelectedNodeId;
        const nodeData = node.data as NeonNodeData;
        return {
          ...node,
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
    hasEndpointGraph,
  ]);

  // Apply highlight/fade styles to edges — priority: tracing > e2eTracing > impact > searchFocus > hover
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

    // Sprint 9: E2E tracing
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

    // Sprint 12 T6 / Sprint 11 T6: Logic-operation default (no selection)
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
      return edgesWithTracing.map((edge) => ({
        ...edge,
        style: { ...edge.style, opacity: 0, transition: 'opacity 200ms ease-out' },
      }));
    }

    // Sprint 13 T4: System-framework click-select BFS edges
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
  }, [edgesWithTracing, highlightState, isTracingMode, tracingEdges, e2eTracing, impactAnalysis, isSearchFocused, searchFocusEdges, isLogicOperation, bfsHoveredNodeId, bfsHighlightedEdges, loSelectedNodeId, loFocusedEdges, isDataJourney, djStarted, djVisibleEdges, isSystemFramework, sfSelectedNodeId, sfFocusedEdges, loMode, hasEndpointGraph, djMode]);

  return { styledNodes, styledEdges };
}
