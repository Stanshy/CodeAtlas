/**
 * CodeAtlas — CallEdge Component
 *
 * Custom React Flow edge for call-type edges.
 * Dashed line with lime/green color, animated dash pattern.
 * Low confidence edges are more transparent and have no animation.
 * Sprint 7 — T8
 */

import { memo, useMemo } from 'react';
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';
import type { NeonEdgeData } from '../adapters/graph-adapter';

// Lime/green palette matching FunctionNode
const CALL_STROKE = '#84cc16';        // lime-500
const CALL_STROKE_HIGH = '#a3e635';   // lime-400 — high confidence
const CALL_STROKE_LOW = '#4d7c0f';    // lime-900 — low confidence

const DASH_NORMAL = '5 4';
const DASH_LOW = '3 6';

function CallEdgeInner({
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
  const edgeData = data as unknown as NeonEdgeData | undefined;
  const confidence = edgeData?.metadata?.confidence;
  const isLowConfidence = confidence === 'low';
  const isHighConfidence = confidence === 'high' || confidence === undefined;

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.3,
  });

  // Derive stroke properties from confidence
  let stroke = CALL_STROKE;
  let strokeOpacity = 0.65;
  const strokeDasharray = isLowConfidence ? DASH_LOW : DASH_NORMAL;

  if (selected) {
    stroke = CALL_STROKE_HIGH;
    strokeOpacity = 1.0;
  } else if (isHighConfidence) {
    stroke = CALL_STROKE_HIGH;
    strokeOpacity = 0.75;
  } else if (isLowConfidence) {
    stroke = CALL_STROKE_LOW;
    strokeOpacity = 0.35;
  }

  // Animated dash particles — only for high/medium confidence
  const particles = useMemo(() => {
    if (isLowConfidence) return null;
    const count = 2;
    const durationMs = 1600;
    return Array.from({ length: count }, (_, i) => {
      const delay = -(i * (durationMs / count)) / 1000;
      return (
        <circle
          key={`${id}-cp-${i}`}
          r={1.5}
          fill={CALL_STROKE_HIGH}
          opacity={0}
        >
          <animateMotion
            dur={`${durationMs}ms`}
            repeatCount="indefinite"
            begin={`${delay}s`}
            path={edgePath}
          />
          <animate
            attributeName="opacity"
            dur={`${durationMs}ms`}
            repeatCount="indefinite"
            begin={`${delay}s`}
            values="0;0.7;0.7;0"
            keyTimes="0;0.1;0.85;1"
          />
        </circle>
      );
    });
  }, [id, edgePath, isLowConfidence]);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke,
          strokeWidth: selected ? 2 : 1.5,
          opacity: strokeOpacity,
          strokeDasharray,
          transition: 'all 100ms ease-out',
          ...style,
        }}
      />
      {particles && <g className="call-edge-particles">{particles}</g>}
    </>
  );
}

export const CallEdge = memo(CallEdgeInner);
