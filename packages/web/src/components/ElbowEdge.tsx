/**
 * CodeAtlas — ElbowEdge Component (Sprint 12)
 *
 * Custom React Flow edge that renders an elbow (orthogonal) path,
 * used in the system-framework perspective for directory-level graphs.
 *
 * Path algorithm (from mockup elbowPath()):
 *   M x1 y1  L x1 my  L x2 my  L x2 y2
 *   where my = y1 + (y2 - y1) * 0.5
 *
 * Normal: stroke #9aa8bc, stroke-width 1.5, marker-end arrow
 * Highlighted (via inline style from GraphCanvas): stroke #1e88e5, stroke-width 2.5
 */

import { memo } from 'react';
import { type EdgeProps, MarkerType } from '@xyflow/react';
import type { NeonEdgeData } from '../adapters/graph-adapter';

// ---------------------------------------------------------------------------
// Elbow path helper (matches mockup elbowPath())
// ---------------------------------------------------------------------------

function elbowPath(x1: number, y1: number, x2: number, y2: number): string {
  const my = y1 + (y2 - y1) * 0.5;
  return `M ${x1} ${y1} L ${x1} ${my} L ${x2} ${my} L ${x2} ${y2}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ElbowEdgeInner({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  data: _data,
}: EdgeProps) {
  void _data as unknown as NeonEdgeData | undefined;

  const path = elbowPath(sourceX, sourceY, targetX, targetY);

  // Base style from mockup .sf-edge
  const baseStroke = '#9aa8bc';
  const baseStrokeWidth = 1.5;

  // The highlight styles (stroke #1e88e5, stroke-width 2.5) are applied
  // via the `style` prop injected by GraphCanvas styledEdges useMemo.

  return (
    <>
      {/* Arrow marker definition — embedded per edge to ensure it renders */}
      <defs>
        <marker
          id={`elbow-arrow-${id}`}
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L0,6 L6,3 z"
            fill={(style?.stroke as string | undefined) ?? baseStroke}
          />
        </marker>
      </defs>
      <path
        id={id}
        className="react-flow__edge-path"
        d={path}
        fill="none"
        stroke={baseStroke}
        strokeWidth={baseStrokeWidth}
        markerEnd={markerEnd ?? `url(#elbow-arrow-${id})`}
        style={{
          transition: 'stroke 0.2s, stroke-width 0.2s, opacity 0.2s',
          ...style,
        }}
      />
    </>
  );
}

export const ElbowEdge = memo(ElbowEdgeInner);

// Re-export for convenience
export { MarkerType };
