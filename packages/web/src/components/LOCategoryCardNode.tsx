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
 *
 * Sprint 14 — T8 method role filtering + noise reduction
 * hiddenMethodRoles: filter utility/framework_glue methods behind "+N hidden" toggle
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
  // Sprint 14: Method role classification
  methodRole?: string;      // MethodRole enum value from rule engine or AI
  roleConfidence?: number;  // 0-1 confidence score
  aiSummary?: string;       // AI one-line summary (T9 will use this)
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
  // Sprint 14: Role filtering
  hiddenMethodRoles?: string[];  // roles to hide (e.g. ['utility', 'framework_glue'])
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CARD_W = 240;
const ROW_H = 24;
const HEADER_H = 36;
const SUMMARY_H = 20;
const PAD_Y = 8;

// Category one-line summaries — help users understand what each group does
const CATEGORY_SUMMARIES: Record<string, string> = {
  routes: '處理 HTTP 請求路由與 API 端點',
  middleware: '請求攔截處理（認證、日誌等）',
  services: '核心業務邏輯與外部服務整合',
  models: '資料模型定義與資料庫操作',
  utils: '共用工具函式與背景任務',
  controllers: '控制器層，協調請求與回應',
};
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
  const [showHidden, setShowHidden] = useState(false);

  // Sprint 14: Split methods into visible (business) and hidden (noise)
  const hiddenRoles = new Set(d.hiddenMethodRoles ?? []);
  const visibleBusinessMethods = d.methods
    .filter(m => !m.methodRole || !hiddenRoles.has(m.methodRole))
    // P0: Sort ★ entry methods to the top
    .sort((a, b) => (b.isEntry ? 1 : 0) - (a.isEntry ? 1 : 0));
  const hiddenMethods = d.methods.filter(m => m.methodRole && hiddenRoles.has(m.methodRole));
  const hiddenCount = hiddenMethods.length;

  const totalMethods = visibleBusinessMethods.length;
  const categorySummary = CATEGORY_SUMMARIES[d.category.toLowerCase()] ?? '';
  const hasToggle = totalMethods > COLLAPSE_AT;
  const visibleMethods = expanded ? visibleBusinessMethods : visibleBusinessMethods.slice(0, COLLAPSE_AT);
  const visibleCount = visibleMethods.length;

  const hiddenSectionH = hiddenCount > 0 ? ROW_H + (showHidden ? hiddenCount * ROW_H : 0) : 0;
  const summaryH = categorySummary ? SUMMARY_H : 0;
  const cardH = HEADER_H + summaryH + PAD_Y + visibleCount * ROW_H + (hasToggle ? ROW_H : 0) + hiddenSectionH + PAD_Y;

  // Sprint 16: use minHeight instead of fixed height so AI result block can expand the card
  const cardStyle: CSSProperties = {
    width: CARD_W,
    minHeight: cardH,
    background: '#ffffff',
    border: `1.5px solid ${d.color}`,
    borderRadius: 8,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    overflow: 'visible',
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
      {/* Category summary — helps users understand this group */}
      {categorySummary && (
        <div style={{
          padding: '2px 10px',
          fontSize: 9,
          color: '#9e9e9e',
          fontFamily: "'Inter', sans-serif",
          lineHeight: `${SUMMARY_H}px`,
          borderBottom: `1px solid ${d.color}11`,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {categorySummary}
        </div>
      )}
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
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0 }}>
              {m.name.endsWith('()') ? m.name : `${m.name}()`}
            </span>
            {/* Sprint 14 T9: AI one-line summary */}
            {m.aiSummary && (
              <span
                style={{
                  fontSize: 9,
                  color: '#9e9e9e',
                  fontFamily: "'Inter', sans-serif",
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 90,
                  flexShrink: 1,
                }}
                title={m.aiSummary}
              >
                {m.aiSummary}
              </span>
            )}
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

        {/* Sprint 14: Hidden utility methods */}
        {hiddenCount > 0 && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 10px',
                height: ROW_H,
                fontSize: 10,
                color: THEME.inkFaint,
                cursor: 'pointer',
                background: '#f8f8f8',
                gap: 4,
                borderTop: '1px solid #eee',
              }}
              onClick={(e) => { e.stopPropagation(); setShowHidden(!showHidden); }}
            >
              <span style={{ fontSize: 9 }}>{showHidden ? '▲' : '▼'}</span>
              <span>{showHidden ? '隱藏工具方法' : `+${hiddenCount} 個工具方法`}</span>
            </div>
            {showHidden && hiddenMethods.map((m) => (
              <div
                key={m.nodeId}
                style={{
                  ...methodRowStyle,
                  color: THEME.inkFaint,
                  fontSize: 10,
                  background: '#fafafa',
                }}
                title={`${m.name} — ${m.filePath} [${m.methodRole}]`}
                onClick={(e) => handleMethodClick(m, e)}
              >
                {m.isEntry && (
                  <span style={{ color: '#f59e0b', fontSize: 10, flexShrink: 0, lineHeight: 1 }} title="推薦入口">★</span>
                )}
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.name.endsWith('()') ? m.name : `${m.name}()`}
                </span>
                {/* Role badge */}
                <span style={{
                  fontSize: 8,
                  color: THEME.inkFaint,
                  background: '#f0f0f0',
                  borderRadius: 3,
                  padding: '1px 4px',
                  flexShrink: 0,
                }}>
                  {m.methodRole}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
      {/* AI analysis moved to LODetailPanel (right side) */}

      {/* Invisible handles for edges (arrows between cards) */}
      <Handle type="target" position={Position.Top} style={{ opacity: 0, width: 0, height: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 0, height: 0 }} />
    </div>
  );
});
