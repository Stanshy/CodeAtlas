/**
 * CodeAtlas — FunctionNode Component
 *
 * Custom React Flow node for function-type nodes.
 * Lime/green color scheme, smaller than NeonNode (~60% width).
 * Sprint 7 — T8
 */

import { memo, type CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NeonNodeData } from '../adapters/graph-adapter';
import type { FunctionParam } from '../types/graph';
import { colors, animation } from '../styles/theme';

// Lime/green palette for function nodes
const LIME = '#a3e635';
const LIME_DIM = '#65a30d';
const LIME_FILL = 'rgba(163, 230, 53, 0.07)';
const LIME_FILL_ACTIVE = 'rgba(163, 230, 53, 0.15)';
const LIME_GLOW = '0 0 8px rgba(163, 230, 53, 0.35), 0 0 16px rgba(163, 230, 53, 0.15)';
const LIME_GLOW_ACTIVE = '0 0 14px rgba(163, 230, 53, 0.60), 0 0 28px rgba(163, 230, 53, 0.30)';

function getNodeStyle(selected: boolean): CSSProperties {
  return {
    minWidth: 90,
    maxWidth: 160,
    minHeight: 34,
    borderRadius: '6px',
    padding: '6px 10px',
    border: selected
      ? `2px solid ${LIME}`
      : `1.5px solid ${LIME_DIM}`,
    background: selected ? LIME_FILL_ACTIVE : LIME_FILL,
    boxShadow: selected ? LIME_GLOW_ACTIVE : LIME_GLOW,
    cursor: 'pointer',
    transition: `all ${animation.nodeHover.duration} ${animation.nodeHover.easing}`,
    position: 'relative',
    overflow: 'hidden',
  };
}

function formatParams(params: FunctionParam[] | undefined): string {
  if (!params || params.length === 0) return '()';
  if (params.length <= 3) {
    return `(${params.map((p) => p.name).join(', ')})`;
  }
  return `(${params.length} params)`;
}

function FunctionNodeInner({ data, selected = false }: NodeProps) {
  const nodeData = data as unknown as NeonNodeData;
  const meta = nodeData.metadata;
  const params = meta?.parameters;
  const returnType = meta?.returnType;
  const isAsync = meta?.isAsync;
  const isExported = meta?.isExported;

  return (
    <div
      className="function-node"
      style={getNodeStyle(selected)}
      role="button"
      aria-label={`Function node: ${nodeData.label}`}
    >
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />

      {/* Badges row */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 2, flexWrap: 'wrap' }}>
        {isAsync && (
          <span
            style={{
              fontSize: '9px',
              fontWeight: 600,
              color: colors.neon.cyan.dim,
              background: 'rgba(0, 153, 204, 0.15)',
              borderRadius: '3px',
              padding: '1px 4px',
              lineHeight: 1.4,
            }}
          >
            async
          </span>
        )}
        {isExported && (
          <span
            style={{
              fontSize: '9px',
              fontWeight: 600,
              color: LIME_DIM,
              background: 'rgba(163, 230, 53, 0.12)',
              borderRadius: '3px',
              padding: '1px 4px',
              lineHeight: 1.4,
            }}
          >
            export
          </span>
        )}
      </div>

      {/* Function name */}
      <div
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 600,
          fontSize: '11px',
          color: LIME,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {nodeData.label}
      </div>

      {/* Parameters */}
      <div
        style={{
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: '9px',
          color: colors.text.secondary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginTop: 2,
        }}
      >
        {formatParams(params)}
        {returnType && (
          <span style={{ color: colors.text.muted }}>{`: ${returnType}`}</span>
        )}
      </div>

      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
    </div>
  );
}

export const FunctionNode = memo(FunctionNodeInner);
