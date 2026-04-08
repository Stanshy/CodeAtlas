/**
 * useHighlightPriority — shared highlight mode detection hook (Sprint 17 T9)
 *
 * Determines which highlight mode is currently active based on the priority
 * chain documented in GraphCanvas.tsx and implemented independently in both
 * useNodeEdgeStyling (2D) and use3DHighlightEffects (3D).
 *
 * Priority order (highest → lowest):
 *   e2eTracing > impact > tracing (symbol) > searchFocus > loClickFocus > hover > normal
 *
 * Note: 2D-specific modes (dataJourney DJ, logicOperation LO chain, systemFramework SF)
 * are not represented here because they are React Flow canvas constructs that do not
 * exist in the 3D renderer. The hook covers only the cross-renderer shared priority
 * modes. Callers may extend the returned union with renderer-specific overrides.
 *
 * Integration:
 *   - Graph3DCanvas: use3DHighlightEffects encodes the same priority chain via
 *     imperative useEffect guards (`if (!isActive) return`). We integrate
 *     useHighlightPriority there so the active mode is computable in one place.
 *   - GraphCanvas / useNodeEdgeStyling: the styling logic is tightly coupled with
 *     RF node/edge transformation (inline map calls with style mutations). The
 *     complexity of decoupling the priority detection from the style application
 *     without risking visual regressions means we provide the hook but leave full
 *     integration for a follow-up refactor. The hook can be consumed alongside
 *     useNodeEdgeStyling to derive the mode label (e.g. for analytics or testing).
 */

import { useMemo } from 'react';
import type { E2ETracingState } from '../types/graph';

// ---------------------------------------------------------------------------
// Discriminated union — active highlight mode
// ---------------------------------------------------------------------------

export type ActiveHighlight =
  | { mode: 'e2e'; nodeIds: Set<string>; edgeIds: Set<string> }
  | { mode: 'impact'; nodeIds: Set<string>; edgeIds: Set<string> }
  | { mode: 'tracing'; nodeIds: Set<string>; edgeIds: Set<string> }
  | { mode: 'searchFocus'; nodeIds: Set<string>; edgeIds: Set<string> }
  | { mode: 'loClickFocus'; nodeIds: Set<string>; edgeIds: Set<string> }
  | { mode: 'hover'; hoveredId: string; relatedNodeIds: Set<string> }
  | { mode: 'normal' };

// ---------------------------------------------------------------------------
// Hook params
// ---------------------------------------------------------------------------

export interface UseHighlightPriorityParams {
  // E2E tracing (highest priority)
  e2eTracing?: E2ETracingState | null;

  // Impact analysis
  impactAnalysis?: {
    active: boolean;
    impactedNodes: string[];
    impactedEdges: string[];
  } | null;

  // Symbol / path tracing
  tracingSymbol?: string | null;
  tracingPath?: string[];
  tracingEdges?: string[];

  // Search focus
  isSearchFocused?: boolean;
  searchFocusNodes?: string[];
  searchFocusEdges?: string[];

  // Logic-operation click-focus (2D only — pass null/undefined in 3D)
  loSelectedNodeId?: string | null;
  loFocusedNodes?: Set<string>;
  loFocusedEdges?: Set<string>;

  // Hover (lowest named priority before 'normal')
  hoveredNodeId?: string | null;
  connectedNodes?: Map<string, Set<string>>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the currently active highlight mode as a discriminated union value.
 * All inputs are optional — unset inputs are treated as inactive.
 */
export function useHighlightPriority({
  e2eTracing,
  impactAnalysis,
  tracingSymbol,
  tracingPath = [],
  tracingEdges = [],
  isSearchFocused = false,
  searchFocusNodes = [],
  searchFocusEdges = [],
  loSelectedNodeId,
  loFocusedNodes,
  loFocusedEdges,
  hoveredNodeId,
  connectedNodes,
}: UseHighlightPriorityParams): ActiveHighlight {
  return useMemo<ActiveHighlight>(() => {
    // 1. E2E tracing — highest priority
    if (e2eTracing?.active) {
      return {
        mode: 'e2e',
        nodeIds: new Set(e2eTracing.path),
        edgeIds: new Set(e2eTracing.edges),
      };
    }

    // 2. Impact analysis
    if (impactAnalysis?.active) {
      return {
        mode: 'impact',
        nodeIds: new Set(impactAnalysis.impactedNodes),
        edgeIds: new Set(impactAnalysis.impactedEdges),
      };
    }

    // 3. Symbol / path tracing
    if (tracingSymbol !== null && tracingSymbol !== undefined) {
      return {
        mode: 'tracing',
        nodeIds: new Set(tracingPath),
        edgeIds: new Set(tracingEdges),
      };
    }

    // 4. Search focus
    if (isSearchFocused && searchFocusNodes.length > 0) {
      return {
        mode: 'searchFocus',
        nodeIds: new Set(searchFocusNodes),
        edgeIds: new Set(searchFocusEdges),
      };
    }

    // 5. Logic-operation click-focus (2D-specific; absent in 3D)
    if (loSelectedNodeId && loFocusedNodes && loFocusedEdges) {
      return {
        mode: 'loClickFocus',
        nodeIds: loFocusedNodes,
        edgeIds: loFocusedEdges,
      };
    }

    // 6. Hover
    if (hoveredNodeId) {
      const related = connectedNodes?.get(hoveredNodeId) ?? new Set<string>();
      return {
        mode: 'hover',
        hoveredId: hoveredNodeId,
        relatedNodeIds: related,
      };
    }

    // 7. Normal — no highlight active
    return { mode: 'normal' };
  }, [
    e2eTracing,
    impactAnalysis,
    tracingSymbol,
    tracingPath,
    tracingEdges,
    isSearchFocused,
    searchFocusNodes,
    searchFocusEdges,
    loSelectedNodeId,
    loFocusedNodes,
    loFocusedEdges,
    hoveredNodeId,
    connectedNodes,
  ]);
}
