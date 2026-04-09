/**
 * CodeAtlas Web — WikiNodeCircle Component
 *
 * SVG circle element for a single node in the Wiki Knowledge Graph.
 * Colour is based on node type; size is determined by the pre-computed
 * radius field on the WikiSimNode. Supports selected + hover visual states.
 *
 * Sprint 19 — T13: Wiki Knowledge Graph Tab
 */

import { memo, useCallback, useRef } from 'react';
import type { WikiSimNode } from '../types/wiki';

// ---------------------------------------------------------------------------
// Colour map — matches G1 mockup exactly
// ---------------------------------------------------------------------------

const NODE_COLORS: Record<string, string> = {
  architecture: '#1565c0',  // blue
  pattern:      '#7b1fa2',  // purple
  feature:      '#2e7d32',  // green
  integration:  '#f59e0b',  // amber
  concept:      '#00838f',  // teal
};

const NODE_GLOW: Record<string, string> = {
  architecture: 'rgba(21, 101, 192, 0.45)',
  pattern:      'rgba(123, 31, 162, 0.45)',
  feature:      'rgba(46, 125, 50, 0.45)',
  integration:  'rgba(245, 158, 11, 0.45)',
  concept:      'rgba(0, 131, 143, 0.45)',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WikiNodeCircleProps {
  node: WikiSimNode;
  isSelected: boolean;
  isHovered: boolean;
  /** Called when the user clicks the node */
  onSelect: (slug: string) => void;
  /** Called on mouse-enter */
  onHoverStart: (slug: string) => void;
  /** Called on mouse-leave */
  onHoverEnd: () => void;
  /** Called when drag starts — provides svg-space coords */
  onDragStart: (slug: string, x: number, y: number) => void;
  onDrag: (slug: string, x: number, y: number) => void;
  onDragEnd: (slug: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const WikiNodeCircle = memo(function WikiNodeCircle({
  node,
  isSelected,
  isHovered,
  onSelect,
  onHoverStart,
  onHoverEnd,
  onDragStart,
  onDrag,
  onDragEnd,
}: WikiNodeCircleProps) {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const r = node.radius;
  const color = NODE_COLORS[node.type] ?? '#888888';
  const glowColor = NODE_GLOW[node.type] ?? 'rgba(128,128,128,0.4)';
  const isHighlighted = isSelected || isHovered;

  // Scale circle slightly on hover/select
  const scale = isHighlighted ? 1.3 : 1;

  // ---------------------------------------------------------------------------
  // Drag state — tracked in closure, not React state (avoids re-renders)
  // ---------------------------------------------------------------------------

  const dragging = useRef(false);
  const startSvgPos = useRef({ x: 0, y: 0 });
  const startMousePos = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragging.current = true;
      startMousePos.current = { x: e.clientX, y: e.clientY };
      startSvgPos.current = { x: node.x ?? 0, y: node.y ?? 0 };
      onDragStart(node.slug, node.x ?? 0, node.y ?? 0);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node.slug, node.x, node.y, onDragStart],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      if (!dragging.current) return;
      const dx = e.clientX - startMousePos.current.x;
      const dy = e.clientY - startMousePos.current.y;
      onDrag(node.slug, startSvgPos.current.x + dx, startSvgPos.current.y + dy);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node.slug, onDrag],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      if (!dragging.current) return;
      dragging.current = false;
      e.currentTarget.releasePointerCapture(e.pointerId);

      const dx = Math.abs(e.clientX - startMousePos.current.x);
      const dy = Math.abs(e.clientY - startMousePos.current.y);
      // Treat as click if movement is small
      if (dx < 4 && dy < 4) {
        onSelect(node.slug);
      }
      onDragEnd(node.slug);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node.slug, onSelect, onDragEnd],
  );

  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{ cursor: 'pointer' }}
      aria-label={node.displayName}
      role="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={() => onHoverStart(node.slug)}
      onMouseLeave={onHoverEnd}
    >
      {/* Glow filter backdrop — larger circle at low opacity */}
      {isHighlighted && (
        <circle
          r={r * scale * 2.2}
          fill={glowColor}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Pulse ring on selection — amber per mockup spec */}
      {isSelected && (
        <>
          <circle
            r={r * scale + 4}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeOpacity={0.8}
            style={{ pointerEvents: 'none' }}
          />
          <circle
            r={r * scale + 4}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={2}
            style={{
              pointerEvents: 'none',
              animation: 'wiki-pulse-ring 1.5s ease-out infinite',
              transformOrigin: '0 0',
            }}
          />
        </>
      )}

      {/* Main node circle */}
      <circle
        r={r * scale}
        fill={color}
        style={{
          transition: 'r 0.15s ease-out',
          filter: isHighlighted
            ? `drop-shadow(0 0 12px ${glowColor})`
            : `drop-shadow(0 0 8px ${glowColor})`,
        }}
      />

      {/* Text label — positioned to the right of the circle */}
      <text
        x={r * scale + 5}
        y={0}
        dominantBaseline="central"
        fontSize={node.type === 'architecture' ? 13 : 11}
        fontWeight={node.type === 'architecture' ? 600 : 400}
        fill={isHighlighted ? '#1a1a2e' : '#4a4a6a'}
        style={{
          userSelect: 'none',
          fontFamily: "'Inter', sans-serif",
          whiteSpace: 'pre',
          cursor: 'pointer',
        }}
      >
        {node.displayName}
      </text>
    </g>
  );
});
