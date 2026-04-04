/**
 * CodeAtlas — LOChainNode
 *
 * React Flow custom node for Logic Operation call chain playback.
 * Used as a vertical chain of nodes in the canvas while stagger animation plays.
 *
 * Three visual states:
 *   unreached  → white bg, gray border, opacity reduced by parent
 *   active     → blue glow border (2px solid + box-shadow)
 *   completed  → left color bar accent by category
 *
 * Spec:
 *   size: 280×64px
 *   border: 1.5px solid #e0e0e0 (unreached), 2px solid category color (active)
 *
 * Sprint 13 — T5 (revised: mirrors DJ's React Flow canvas approach)
 */

import { memo, type CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { LoCategory } from '../types/graph';

// ---------------------------------------------------------------------------
// Category color map (same as LOCallChain)
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<LoCategory, { bar: string; bg: string; text: string }> = {
  routes:     { bar: '#1565c0', bg: '#e3f2fd', text: '#0d47a1' },
  middleware: { bar: '#00838f', bg: '#e0f7fa', text: '#006064' },
  services:   { bar: '#7b1fa2', bg: '#f3e5f5', text: '#4a148c' },
  models:     { bar: '#4e342e', bg: '#efebe9', text: '#3e2723' },
  utils:      { bar: '#546e7a', bg: '#eceff1', text: '#37474f' },
};

// ---------------------------------------------------------------------------
// Props (injected via React Flow node.data)
// ---------------------------------------------------------------------------

export interface LOChainNodeData {
  stepIndex: number;
  methodName: string;
  className: string;
  category: LoCategory;
  filePath: string;
  state: 'unreached' | 'active' | 'completed';
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// LOChainNode component
// ---------------------------------------------------------------------------

export const LOChainNode = memo(function LOChainNode({ data }: NodeProps) {
  const { stepIndex, methodName, className, category, state } = data as LOChainNodeData;

  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.utils;

  const isActive = state === 'active';
  const isCompleted = state === 'completed';

  const outerStyle: CSSProperties = {
    width: 280,
    minHeight: 58,
    background: isActive
      ? colors.bg
      : isCompleted
        ? '#ffffff'
        : '#ffffff',
    border: isActive
      ? `2px solid ${colors.bar}`
      : `1.5px solid ${isCompleted ? colors.bar + '66' : '#e0e0e0'}`,
    borderRadius: 6,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: isActive
      ? `0 0 0 3px ${colors.bar}22, 0 4px 16px ${colors.bar}18`
      : isCompleted
        ? `0 1px 6px ${colors.bar}10`
        : '0 1px 4px rgba(0,0,0,0.07)',
    transition: 'border 0.25s ease, box-shadow 0.25s ease, background 0.25s ease',
    cursor: 'pointer',
  };

  // Left accent bar — always visible with category color
  const accentBarStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    background: colors.bar,
    borderRadius: '6px 0 0 6px',
  };

  const innerStyle: CSSProperties = {
    padding: '8px 12px 8px 14px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 2,
  };

  const stepNumStyle: CSSProperties = {
    fontSize: 9,
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    color: isActive ? colors.bar : '#9e9e9e',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
  };

  const methodNameStyle: CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    fontWeight: 700,
    color: colors.text,
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const classNameStyle: CSSProperties = {
    fontSize: 10,
    color: '#888',
    fontFamily: "'Inter', sans-serif",
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  // React Flow handles
  const handleStyle: CSSProperties = {
    width: 6,
    height: 6,
    background: colors.bar,
    border: 'none',
    borderRadius: '50%',
    opacity: isActive ? 1 : 0.4,
  };

  const displayName = methodName.endsWith('()') ? methodName : `${methodName}()`;

  return (
    <div style={outerStyle}>
      <div style={accentBarStyle} />
      <Handle
        type="target"
        position={Position.Top}
        style={handleStyle}
      />
      <div style={innerStyle}>
        <div style={stepNumStyle}>第 {stepIndex} 層</div>
        <div style={methodNameStyle} title={displayName}>{displayName}</div>
        {className && <div style={classNameStyle} title={className}>{className}</div>}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={handleStyle}
      />
    </div>
  );
});
