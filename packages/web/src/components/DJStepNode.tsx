/**
 * CodeAtlas — DJStepNode
 *
 * React Flow custom node for Data Journey step-by-step playback.
 * Used as a vertical chain of nodes in the canvas while stagger animation plays.
 *
 * Three visual states:
 *   unreached  → white bg, gray border, opacity reduced by parent
 *   active     → green glow border (2px solid #2e7d32 + box-shadow)
 *   completed  → left green bar accent, light green bg
 *
 * Spec:
 *   size: 340×76px
 *   border: 1.5px solid #e0e0e0 (unreached), 2px solid #2e7d32 (active)
 *
 * Sprint 13-15
 */

import { memo, type CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { THEME } from '../styles/theme';
import type { DJChainStep } from '../types/graph';
import { deriveStepDesc } from '../utils/dj-descriptions';

// ---------------------------------------------------------------------------
// Props (injected via React Flow node.data)
// ---------------------------------------------------------------------------

export interface DJStepNodeData {
  stepIndex: number;
  step: DJChainStep;
  state: 'unreached' | 'active' | 'completed';
  /** Whether this node is user-selected (for right panel sync) */
  selected?: boolean;
  /** Sprint 15: AI-generated step description */
  aiDescription?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// DJStepNode component
// ---------------------------------------------------------------------------

export const DJStepNode = memo(function DJStepNode({ data }: NodeProps) {
  const { stepIndex, step, state, selected, aiDescription } = data as DJStepNodeData;

  const isActive = state === 'active';
  const isCompleted = state === 'completed';
  const isSelected = !!selected;

  const outerStyle: CSSProperties = {
    width: 340,
    minHeight: 76,
    background: isSelected
      ? THEME.djBg
      : isActive
        ? THEME.djBg
        : isCompleted
          ? '#f1f8e9'
          : '#ffffff',
    border: isSelected
      ? `2px solid ${THEME.djBorder}`
      : isActive
        ? `2px solid ${THEME.djBorder}`
        : `1.5px solid ${isCompleted ? THEME.djBorder + '66' : '#e0e0e0'}`,
    borderRadius: THEME.radiusSm,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: isSelected
      ? `0 0 0 3px ${THEME.djGlow}, 0 4px 16px rgba(46,125,50,0.22)`
      : isActive
        ? `0 0 0 3px ${THEME.djGlow}, 0 4px 16px rgba(46,125,50,0.18)`
        : isCompleted
          ? '0 2px 8px rgba(46,125,50,0.10)'
          : THEME.shadowCard,
    transition: 'border 0.25s ease, box-shadow 0.25s ease, background 0.25s ease',
    cursor: 'pointer',
  };

  // Left accent bar for completed state
  const accentBarStyle: CSSProperties = isCompleted ? {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    background: THEME.djBorder,
    borderRadius: `${THEME.radiusSm} 0 0 ${THEME.radiusSm}`,
  } : { display: 'none' };

  const innerStyle: CSSProperties = {
    padding: '10px 14px 10px 16px',
  };

  const stepNumStyle: CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    fontFamily: THEME.fontUi,
    color: isActive ? THEME.djBorder : THEME.inkMuted,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    marginBottom: 3,
  };

  const methodNameStyle: CSSProperties = {
    fontFamily: THEME.fontMono,
    fontSize: 13,
    fontWeight: 700,
    color: THEME.inkPrimary,
    lineHeight: 1.3,
    marginBottom: 3,
  };

  const descStyle: CSSProperties = {
    fontSize: 11,
    color: THEME.inkSecondary,
    fontFamily: THEME.fontUi,
    lineHeight: 1.4,
  };

  // React Flow handles (transparent, just for edge connections)
  const handleStyle: CSSProperties = {
    width: 6,
    height: 6,
    background: THEME.djBorder,
    border: 'none',
    borderRadius: '50%',
    opacity: isActive ? 1 : 0.4,
  };

  // Resolve description: prefer AI description, then explicit desc if it differs from name, else derive heuristically
  const resolvedDesc = aiDescription
    ? aiDescription
    : (step.desc && step.desc !== step.name)
      ? step.desc
      : deriveStepDesc(step.name, step.file ?? '');

  return (
    <div style={outerStyle}>
      <div style={accentBarStyle} />
      <Handle
        type="target"
        position={Position.Top}
        style={handleStyle}
      />
      <div style={innerStyle}>
        <div style={stepNumStyle}>步驟 {stepIndex + 1}</div>
        <div style={methodNameStyle}>{step.name}</div>
        {resolvedDesc && <div style={descStyle}>{resolvedDesc}</div>}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={handleStyle}
      />
    </div>
  );
});
