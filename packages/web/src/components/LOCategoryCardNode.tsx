/**
 * CodeAtlas — LOCategoryCardNode
 *
 * React Flow custom node for LO perspective category group cards on canvas.
 * Each node represents one of the 5 categories (routes/middleware/services/models/utils)
 * with a list of methods. Rendered on canvas for pan/zoom like SF.
 *
 * Sprint 13 — T5 canvas refactor
 * LO-4: Show source file name next to each method row (muted, right-aligned)
 * LO-5: ★ marker for recommended entry point methods
 */

import { memo, useState, type CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { THEME } from '../styles/theme';
import type { LoCategory } from './LOCategoryGroup';

// ---------------------------------------------------------------------------
// Data interface
// ---------------------------------------------------------------------------

export interface MethodItem {
  name: string;
  filePath: string;
  nodeId: string;
  /** LO-5: true if this method is a recommended entry point (HTTP handler, etc.) */
  isEntry?: boolean;
}

export interface LOCategoryCardData {
  category: string;
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  methods: MethodItem[];
  /** LO-4/LO-5: callback when a method row is clicked */
  onMethodClick?: (methodName: string, category: LoCategory) => void;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CARD_W = 240;
const ROW_H = 24;
const HEADER_H = 36;
const PAD_Y = 8;
const COLLAPSE_AT = 5;

// ---------------------------------------------------------------------------
// Helper: extract filename from filePath
// ---------------------------------------------------------------------------

function extractFilename(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.split('/').pop() ?? filePath;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const LOCategoryCardNode = memo(function LOCategoryCardNode({ data }: NodeProps) {
  const d = data as LOCategoryCardData;
  const [expanded, setExpanded] = useState(false);

  const totalMethods = d.methods.length;
  const hasToggle = totalMethods > COLLAPSE_AT;
  const visibleMethods = expanded ? d.methods : d.methods.slice(0, COLLAPSE_AT);
  const visibleCount = visibleMethods.length;
  const cardH = HEADER_H + PAD_Y + visibleCount * ROW_H + (hasToggle ? ROW_H : 0) + PAD_Y;

  const cardStyle: CSSProperties = {
    width: CARD_W,
    height: cardH,
    background: '#ffffff',
    border: `1.5px solid ${d.color}`,
    borderRadius: 8,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    userSelect: 'none',
    fontFamily: "'Inter', sans-serif",
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '0 10px',
    height: HEADER_H,
    background: d.bgColor,
    borderBottom: `1px solid ${d.color}22`,
  };

  const methodRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '0 8px',
    height: ROW_H,
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
    color: '#1a1a2e',
    cursor: 'pointer',
    borderBottom: '1px solid #f5f5f5',
    gap: 4,
  };

  const toggleStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '0 10px',
    height: ROW_H,
    fontSize: 10,
    color: d.color,
    cursor: 'pointer',
    background: d.bgColor + '55',
    gap: 4,
  };

  const handleMethodClick = (m: MethodItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (d.onMethodClick) {
      d.onMethodClick(m.name, d.category as LoCategory);
    }
  };

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
        <span style={{ flex: 1, fontWeight: 600, fontSize: 11, color: d.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {d.label}
        </span>
        <span style={{ fontSize: 10, color: '#757575', background: 'rgba(0,0,0,0.06)', borderRadius: 10, padding: '1px 5px', flexShrink: 0 }}>
          {totalMethods}
        </span>
        <span style={{ fontSize: 12, flexShrink: 0 }}>{d.icon}</span>
      </div>
      <div style={{ padding: `${PAD_Y / 2}px 0` }}>
        {visibleMethods.map((m) => (
          <div
            key={m.nodeId}
            style={methodRowStyle}
            title={`${m.name} — ${m.filePath}`}
            onClick={(e) => handleMethodClick(m, e)}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = d.bgColor + 'aa';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = '';
            }}
          >
            {/* LO-5: ★ entry marker */}
            {m.isEntry && (
              <span
                style={{ color: '#f59e0b', fontSize: 10, flexShrink: 0, lineHeight: 1 }}
                title="推薦入口"
              >
                ★
              </span>
            )}
            {/* Method name */}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {m.name.endsWith('()') ? m.name : `${m.name}()`}
            </span>
            {/* LO-4: Source file name (muted, right side) */}
            <span
              style={{
                fontSize: 9,
                color: THEME.inkFaint,
                flexShrink: 0,
                fontFamily: "'Inter', sans-serif",
                maxWidth: 80,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={m.filePath}
            >
              {extractFilename(m.filePath)}
            </span>
          </div>
        ))}
        {hasToggle && (
          <div style={toggleStyle} onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
            <span style={{ fontSize: 10 }}>{expanded ? '▲' : '▼'}</span>
            <span>{expanded ? '收起' : `展開更多 (${totalMethods - COLLAPSE_AT})`}</span>
          </div>
        )}
      </div>
      {/* Invisible handles for edges (arrows between cards) */}
      <Handle type="target" position={Position.Top} style={{ opacity: 0, width: 0, height: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 0, height: 0 }} />
    </div>
  );
});
