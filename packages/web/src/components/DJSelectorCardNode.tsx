/**
 * CodeAtlas — DJSelectorCardNode
 *
 * React Flow custom node for DJ endpoint selector cards rendered on canvas.
 * Replaces the overlay-based DJEndpointSelector with canvas-native nodes
 * so users can pan/zoom the selector view like system-framework.
 *
 * Two node sub-types via data.subType:
 *   'category-header' — category group header (icon + label + count)
 *   'endpoint-card'   — clickable endpoint card (method badge + path + steps)
 *
 * Sprint 13-15 — T6 canvas refactor + T7 AI Chinese description
 */

import { memo, useState, type CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { THEME } from '../styles/theme';

// ---------------------------------------------------------------------------
// Data interfaces
// ---------------------------------------------------------------------------

export interface DJSelectorNodeData {
  subType: 'category-header' | 'endpoint-card';
  // category-header fields
  categoryLabel?: string;
  categoryIcon?: string;
  categoryColor?: string;
  categoryCount?: number;
  // endpoint-card fields
  httpMethod?: string;
  path?: string;
  desc?: string;
  stepCount?: number;
  endpointId?: string;
  /** Sprint 15: AI-generated Chinese description */
  aiDescription?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Method badge color
// ---------------------------------------------------------------------------

function methodColor(m: string): string {
  if (m === 'POST') return '#e65100';
  if (m === 'PUT') return '#7b1fa2';
  if (m === 'DELETE') return '#c62828';
  if (m === 'PATCH') return '#ff6f00';
  return '#1565c0'; // GET
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DJSelectorCardNode = memo(function DJSelectorCardNode({ data }: NodeProps) {
  const d = data as DJSelectorNodeData;

  if (d.subType === 'category-header') {
    return <CategoryHeader d={d} />;
  }

  return <EndpointCard d={d} />;
});

// ---------------------------------------------------------------------------
// Category header sub-component
// ---------------------------------------------------------------------------

function CategoryHeader({ d }: { d: DJSelectorNodeData }) {
  const color = d.categoryColor ?? THEME.djBorder;

  const style: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 0',
    userSelect: 'none',
  };

  return (
    <div style={style}>
      <span style={{ fontSize: 18 }}>{d.categoryIcon}</span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          fontFamily: THEME.fontUi,
          color,
        }}
      >
        {d.categoryLabel}
      </span>
      <span
        style={{
          fontSize: 12,
          color: THEME.inkMuted,
          fontFamily: THEME.fontUi,
        }}
      >
        ({d.categoryCount ?? 0})
      </span>
      {/* Invisible handles for React Flow */}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 0, height: 0 }} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0, width: 0, height: 0 }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Endpoint card sub-component
// ---------------------------------------------------------------------------

function EndpointCard({ d }: { d: DJSelectorNodeData }) {
  const [hovered, setHovered] = useState(false);
  const method = d.httpMethod ?? 'GET';
  const path = d.path ?? '';
  const mc = methodColor(method);

  const cardStyle: CSSProperties = {
    width: 260,
    minHeight: 64,
    background: '#ffffff',
    border: hovered ? `1.5px solid ${THEME.djBorder}` : `1.5px dashed ${THEME.djBorder}`,
    borderRadius: THEME.radiusSm,
    padding: '8px 10px 8px 14px',
    cursor: 'pointer',
    transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
    boxShadow: hovered
      ? '0 6px 20px rgba(46,125,50,0.18), 0 0 0 1px rgba(46,125,50,0.08)'
      : THEME.shadowCard,
    transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out, border 0.15s ease-out',
    overflow: 'hidden',
    userSelect: 'none',
    position: 'relative',
  };

  const barStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    background: d.categoryColor ?? THEME.djBorder,
    borderRadius: `${THEME.radiusSm} 0 0 ${THEME.radiusSm}`,
  };

  const badgeStyle: CSSProperties = {
    display: 'inline-block',
    fontSize: 9,
    fontWeight: 700,
    fontFamily: THEME.fontMono,
    color: mc,
    background: `${mc}18`,
    border: `1px solid ${mc}40`,
    borderRadius: 3,
    padding: '1px 4px',
    marginRight: 5,
    letterSpacing: '0.03em',
  };

  const stepBadge: CSSProperties = {
    display: 'inline-block',
    fontSize: 9,
    fontWeight: 600,
    fontFamily: THEME.fontUi,
    color: THEME.djBorder,
    background: THEME.djBg,
    border: '1px solid #a5d6a7',
    borderRadius: 10,
    padding: '1px 6px',
    marginTop: 3,
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={barStyle} />
      <div style={{ fontFamily: THEME.fontMono, fontSize: 11, color: THEME.inkPrimary, fontWeight: 600, lineHeight: 1.35, wordBreak: 'break-all' }}>
        <span style={badgeStyle}>{method}</span>
        {path}
      </div>
      {d.desc && d.desc !== `${method} ${path}` && (
        <div style={{ fontSize: 10, color: THEME.inkMuted, marginTop: 3, fontFamily: THEME.fontUi }}>{d.desc}</div>
      )}
      {/* Sprint 15: AI Chinese description */}
      {d.aiDescription && (
        <div
          style={{
            fontSize: 10,
            color: THEME.inkMuted,
            marginTop: 3,
            fontFamily: THEME.fontUi,
            fontStyle: 'italic',
          }}
          title={d.aiDescription}
        >
          {d.aiDescription}
        </div>
      )}
      <div style={stepBadge}>{d.stepCount ?? 0} 個步驟</div>
      {/* Invisible handles */}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 0, height: 0 }} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0, width: 0, height: 0 }} />
    </div>
  );
}
