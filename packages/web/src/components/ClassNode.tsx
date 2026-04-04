/**
 * CodeAtlas — ClassNode Component
 *
 * Custom React Flow node for class-type nodes.
 * Yellow/amber color scheme, smaller than NeonNode (~60% width).
 * Sprint 7 — T8
 */

import { memo, type CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NeonNodeData } from '../adapters/graph-adapter';
import { colors, animation } from '../styles/theme';

// Yellow/amber palette for class nodes
const AMBER = '#facc15';
const AMBER_DIM = '#a16207';
const AMBER_FILL = 'rgba(250, 204, 21, 0.07)';
const AMBER_FILL_ACTIVE = 'rgba(250, 204, 21, 0.15)';
const AMBER_GLOW = '0 0 8px rgba(250, 204, 21, 0.30), 0 0 16px rgba(250, 204, 21, 0.12)';
const AMBER_GLOW_ACTIVE = '0 0 14px rgba(250, 204, 21, 0.60), 0 0 28px rgba(250, 204, 21, 0.25)';

function getNodeStyle(selected: boolean): CSSProperties {
  return {
    minWidth: 90,
    maxWidth: 160,
    minHeight: 34,
    borderRadius: '6px',
    padding: '6px 10px',
    border: selected
      ? `2px solid ${AMBER}`
      : `1.5px solid ${AMBER_DIM}`,
    background: selected ? AMBER_FILL_ACTIVE : AMBER_FILL,
    boxShadow: selected ? AMBER_GLOW_ACTIVE : AMBER_GLOW,
    cursor: 'pointer',
    transition: `all ${animation.nodeHover.duration} ${animation.nodeHover.easing}`,
    position: 'relative',
    overflow: 'hidden',
  };
}

function ClassNodeInner({ data, selected = false }: NodeProps) {
  const nodeData = data as unknown as NeonNodeData;
  const meta = nodeData.metadata;
  const methodCount = meta?.methodCount as number | undefined;
  const isExported = meta?.isExported as boolean | undefined;

  return (
    <div
      className="class-node"
      style={getNodeStyle(selected)}
      role="button"
      aria-label={`Class node: ${nodeData.label}`}
    >
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />

      {/* Badges row */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 2, flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: '9px',
            fontWeight: 600,
            color: AMBER,
            background: 'rgba(250, 204, 21, 0.15)',
            borderRadius: '3px',
            padding: '1px 4px',
            lineHeight: 1.4,
          }}
        >
          class
        </span>
        {isExported && (
          <span
            style={{
              fontSize: '9px',
              fontWeight: 600,
              color: AMBER_DIM,
              background: 'rgba(250, 204, 21, 0.10)',
              borderRadius: '3px',
              padding: '1px 4px',
              lineHeight: 1.4,
            }}
          >
            export
          </span>
        )}
      </div>

      {/* Class name */}
      <div
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 600,
          fontSize: '11px',
          color: AMBER,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {nodeData.label}
      </div>

      {/* Method count */}
      {methodCount !== undefined && methodCount > 0 && (
        <div
          style={{
            fontSize: '9px',
            color: colors.text.muted,
            marginTop: 2,
          }}
        >
          {methodCount} {methodCount === 1 ? 'method' : 'methods'}
        </div>
      )}

      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
    </div>
  );
}

export const ClassNode = memo(ClassNodeInner);
