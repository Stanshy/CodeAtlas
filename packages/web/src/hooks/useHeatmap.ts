/**
 * CodeAtlas — useHeatmap Hook
 *
 * Heatmap computation hook: maps symbol count → edge style (strokeWidth,
 * opacity, particleSpeed). Reads isHeatmapEnabled from ViewStateContext.
 *
 * Sprint 5 — T7: 資料流熱力圖（2D + 3D）
 * Design: .knowledge/sprint5-dataflow-architecture.md §5.3, §9
 */

import { useCallback } from 'react';
import { useViewState } from '../contexts/ViewStateContext';
import { heatmap } from '../styles/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HeatmapStyle {
  /** Edge stroke width in px */
  strokeWidth: number;
  /** Edge opacity (0–1) */
  opacity: number;
  /** 3D particle speed */
  particleSpeed: number;
}

export interface HeatmapActions {
  /** Whether the heatmap is currently enabled */
  isEnabled: boolean;
  /** Toggle the heatmap on/off */
  toggle: () => void;
  /** Map a symbol count to the appropriate edge visual style */
  getEdgeStyle: (symbolCount: number) => HeatmapStyle;
}

// ---------------------------------------------------------------------------
// Mapping table (matches §5.3 design doc)
// symbolCount | strokeWidth | opacity | particleSpeed
// ---------------------------------------------------------------------------
//   0         |     1       |  0.3    |  0.004
//   1–2       |     1       |  0.4    |  0.005
//   3–5       |     2       |  0.6    |  0.006
//   6–10      |     3       |  0.8    |  0.008
//   11+       |     4       |  1.0    |  0.010

function computeEdgeStyle(symbolCount: number): HeatmapStyle {
  if (symbolCount <= 0) {
    return {
      strokeWidth: heatmap.strokeWidth.min,
      opacity: heatmap.opacity.min,
      particleSpeed: heatmap.particleSpeed.min,
    };
  }
  if (symbolCount <= 2) {
    return { strokeWidth: 1, opacity: 0.4, particleSpeed: 0.005 };
  }
  if (symbolCount <= 5) {
    return { strokeWidth: 2, opacity: 0.6, particleSpeed: 0.006 };
  }
  if (symbolCount <= 10) {
    return { strokeWidth: 3, opacity: 0.8, particleSpeed: 0.008 };
  }
  // 11+
  return {
    strokeWidth: heatmap.strokeWidth.max,
    opacity: heatmap.opacity.max,
    particleSpeed: heatmap.particleSpeed.max,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Heatmap computation hook.
 *
 * Reads ViewStateContext.isHeatmapEnabled and provides:
 * - toggle() → dispatch TOGGLE_HEATMAP
 * - getEdgeStyle(symbolCount) → { strokeWidth, opacity, particleSpeed }
 *
 * getEdgeStyle is a stable callback (does not depend on state) so callers can
 * safely include it in render without causing extra re-renders.
 */
export function useHeatmap(): HeatmapActions {
  const { state, dispatch } = useViewState();
  const isEnabled = state.isHeatmapEnabled;

  const toggle = useCallback(() => {
    dispatch({ type: 'TOGGLE_HEATMAP' });
  }, [dispatch]);

  const getEdgeStyle = useCallback(
    (symbolCount: number): HeatmapStyle => computeEdgeStyle(symbolCount),
    [],
  );

  return { isEnabled, toggle, getEdgeStyle };
}
