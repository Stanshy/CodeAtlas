/**
 * CodeAtlas — NeonEdge Component
 *
 * Custom React Flow edge with neon green glow + particle flow animation.
 * Supports normal/hover/faded/tracing/heatmap states.
 * Particles flow from source → target along the bezier path.
 *
 * Sprint 5 — T3: renders EdgeSymbolLabel on hover when importedSymbols present
 * Sprint 5 — T5: startTracing wired via onSymbolClick prop (GraphCanvas level)
 * Sprint 5 — T7: heatmap edge style when isHeatmapEnabled and not tracing
 *
 * Priority (§10): tracing > hover > heatmap > normal
 */

import { memo, useMemo, useCallback, type CSSProperties } from 'react';
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';
import type { NeonEdgeData } from '../adapters/graph-adapter';
import { edgeStyles, colors, particleFlow } from '../styles/theme';
import { EdgeSymbolLabel } from './EdgeSymbolLabel';
import { useEdgeSymbols } from '../hooks/useEdgeSymbols';
import { useHeatmap } from '../hooks/useHeatmap';
import { useViewState } from '../contexts/ViewStateContext';

// ---------------------------------------------------------------------------
// Extended edge data — GraphCanvas injects startTracing via edge data
// ---------------------------------------------------------------------------

export interface NeonEdgeExtendedData extends NeonEdgeData {
  /** Injected by GraphCanvas — calls usePathTracing.startTracing */
  onStartTracing?: (symbol: string) => void;
}

/** Generate particle circle elements along the edge path */
// B4: 3 particles, delay 0 / -0.8s / -1.6s, size=4, duration=2400ms, glow filter
function ParticleOverlay({ edgePath, id }: { edgePath: string; id: string }) {
  const particles = useMemo(() => {
    const count = 3;
    const delayStep = 0.8; // seconds between each particle (0, -0.8s, -1.6s)
    return Array.from({ length: count }, (_, i) => {
      const delay = -(i * delayStep);
      return (
        <circle
          key={`${id}-particle-${i}`}
          r={particleFlow.size / 2}
          fill={particleFlow.color}
          opacity={0}
          style={{ filter: 'none' }}
        >
          <animateMotion
            dur={`${particleFlow.durationMs}ms`}
            repeatCount="indefinite"
            begin={`${delay}s`}
            path={edgePath}
          />
          <animate
            attributeName="opacity"
            dur={`${particleFlow.durationMs}ms`}
            repeatCount="indefinite"
            begin={`${delay}s`}
            values="0;0.9;1;1;0"
            keyTimes="0;0.1;0.1;0.9;1"
          />
        </circle>
      );
    });
  }, [edgePath, id]);

  return <g className="edge-particles">{particles}</g>;
}

function NeonEdgeInner({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  data,
  selected,
}: EdgeProps) {
  const edgeData = data as unknown as NeonEdgeExtendedData | undefined;
  const edgeType = edgeData?.edgeType ?? 'import';
  const importedSymbols = edgeData?.metadata?.importedSymbols;

  // T3: edge symbol hover label
  const { state } = useViewState();
  const isHovered = state.hoveredEdgeId === id;
  const isDataJourney = state.activePerspective === 'data-journey';
  // Sprint 9 — S9-4: respect display prefs
  const { showEdgeLabels, showParticles } = state.displayPrefs;
  const { symbols, allSymbols } = useEdgeSymbols(importedSymbols);

  // T5: tracing mode state (priority §10)
  const { tracingSymbol, tracingEdges } = state;
  const isTracingMode = tracingSymbol !== null;
  const isOnTracingPath = tracingEdges.includes(id);

  // T7: heatmap
  const { isEnabled: isHeatmapEnabled, getEdgeStyle } = useHeatmap();
  const symbolCount = importedSymbols?.length ?? 0;
  const heatmapStyle = getEdgeStyle(symbolCount);

  // T5: symbol click handler — uses injected callback (set by GraphCanvas)
  const handleSymbolClick = useCallback(
    (symbol: string) => {
      edgeData?.onStartTracing?.(symbol);
    },
    [edgeData],
  );

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: edgeStyles.import.curvature,
  });

  // ---------------------------------------------------------------------------
  // Determine stroke style — priority: tracing > selected > hover > heatmap > normal
  // ---------------------------------------------------------------------------
  let stroke: string = edgeStyles.import.stroke;
  let strokeWidth: number = edgeStyles.import.strokeWidth;
  let strokeOpacity: number = edgeStyles.import.strokeOpacity;
  let strokeDasharray: string | undefined;

  if (edgeType === 'export') {
    stroke = edgeStyles.export.stroke;
    strokeWidth = edgeStyles.export.strokeWidth;
    strokeOpacity = edgeStyles.export.strokeOpacity;
  } else if (edgeType === 'data-flow') {
    stroke = edgeStyles.dataFlow.stroke;
    strokeWidth = edgeStyles.dataFlow.strokeWidth;
    strokeOpacity = edgeStyles.dataFlow.strokeOpacity;
    strokeDasharray = edgeStyles.dataFlow.strokeDasharray;
  }

  if (selected) {
    stroke = colors.edge.importHover;
    strokeWidth = edgeStyles.importHover.strokeWidth;
    strokeOpacity = edgeStyles.importHover.strokeOpacity;
  }

  // T7: apply heatmap style when enabled and NOT in tracing mode
  if (isHeatmapEnabled && !isTracingMode) {
    strokeWidth = heatmapStyle.strokeWidth;
    strokeOpacity = heatmapStyle.opacity;
  }

  // T5: tracing overrides everything (§10)
  if (isTracingMode) {
    if (isOnTracingPath) {
      stroke = colors.edge.importHover; // bright green highlight
      strokeWidth = 2.5;
      strokeOpacity = 1.0;
    } else {
      strokeOpacity = 0.1; // faded — not on traced path
    }
  }

  // Only show particles on import edges (the primary dependency type)
  // and when the displayPrefs.showParticles toggle is enabled
  const showParticlesOverlay = edgeType === 'import' && showParticles;

  // Show label only when this edge is hovered, has symbols,
  // and the displayPrefs.showEdgeLabels toggle is enabled
  const showLabel = isHovered && symbols.length > 0 && showEdgeLabels;

  // C5: Data-journey draw animation — set --dash-len via inline style and animate class
  // Estimate path length using straight-line distance * 1.5 to account for bezier curvature
  const estimatedPathLength = Math.hypot(targetX - sourceX, targetY - sourceY) * 1.5;
  const dataJourneyEdgeStyle: CSSProperties | undefined = isDataJourney
    ? ({ '--dash-len': String(Math.round(estimatedPathLength)) } as CSSProperties)
    : undefined;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        className={isDataJourney ? 'data-journey-edge animate' : undefined}
        style={{
          stroke,
          strokeWidth,
          opacity: strokeOpacity,
          strokeDasharray,
          transition: edgeStyles.import.transition,
          ...dataJourneyEdgeStyle,
          ...style,
        }}
      />
      {showParticlesOverlay && <ParticleOverlay edgePath={edgePath} id={id} />}
      {showLabel && (
        <EdgeSymbolLabel
          labelX={labelX}
          labelY={labelY}
          symbols={symbols}
          allSymbols={allSymbols}
          onSymbolClick={handleSymbolClick}
        />
      )}
    </>
  );
}

export const NeonEdge = memo(NeonEdgeInner);
