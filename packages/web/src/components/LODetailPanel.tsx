/**
 * CodeAtlas — LODetailPanel Component (Sprint 13)
 *
 * 300px-wide right-side panel for the Logic Operation perspective.
 * Shown when a chain node is clicked in LOCallChain.
 *
 * Sections:
 *   1. Method name with category color bar + category badge
 *   2. Signature: parameters → returnType (monospace)
 *   3. Location: Class, File, Lines
 *   4. Complexity (if available)
 *   5. Callers: graphNodes with call edges pointing TO this method
 *   6. Callees: graphNodes with call edges FROM this method
 *
 * Design: white-paper theme (#fafafa background), consistent with Sprint 12/13.
 *
 * Sprint 13 — T5.
 */

import { useMemo, type CSSProperties } from 'react';
import type { GraphNode, GraphEdge, ChainStep, LoCategory } from '../types/graph';

// ---------------------------------------------------------------------------
// Category color map
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<LoCategory, { bar: string; bg: string; text: string; label: string }> = {
  routes:     { bar: '#1565c0', bg: '#e3f2fd', text: '#0d47a1', label: '路線' },
  middleware: { bar: '#00838f', bg: '#e0f7fa', text: '#006064', label: '中間層' },
  services:   { bar: '#7b1fa2', bg: '#f3e5f5', text: '#4a148c', label: '服務' },
  models:     { bar: '#4e342e', bg: '#efebe9', text: '#3e2723', label: '模型' },
  utils:      { bar: '#546e7a', bg: '#eceff1', text: '#37474f', label: '工具' },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface LODetailPanelProps {
  selectedStep: ChainStep | null;
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSignature(node: GraphNode): string {
  const params = node.metadata.parameters ?? [];
  const paramStr = params
    .map((p) => {
      let s = p.name;
      if (p.type) s += `: ${p.type}`;
      if (p.isOptional) s += '?';
      return s;
    })
    .join(', ');
  const ret = node.metadata.returnType ? ` → ${node.metadata.returnType}` : '';
  return `(${paramStr})${ret}`;
}

function shortenPath(filePath: string, maxLen = 38): string {
  if (filePath.length <= maxLen) return filePath;
  const parts = filePath.replace(/\\/g, '/').split('/');
  if (parts.length <= 3) return filePath;
  return `…/${parts.slice(-3).join('/')}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ListItemProps {
  label: string;
}

function ListItem({ label }: ListItemProps) {
  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        color: '#424242',
        background: '#f5f5f5',
        borderRadius: 3,
        padding: '2px 6px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
      title={label}
    >
      {label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function LODetailPanel({ selectedStep, graphNodes, graphEdges }: LODetailPanelProps) {
  // Find the function/method graphNode that corresponds to the selected chain step
  const methodNode = useMemo<GraphNode | null>(() => {
    if (!selectedStep) return null;
    // Try exact label + filePath match first
    const exact = graphNodes.find(
      (n) =>
        (n.type === 'function' || n.metadata?.kind === 'method' || n.metadata?.kind === 'function') &&
        n.label === selectedStep.methodName &&
        n.filePath === selectedStep.filePath,
    );
    if (exact) return exact;
    // Fallback: label match
    return (
      graphNodes.find(
        (n) =>
          (n.type === 'function' || n.metadata?.kind === 'method' || n.metadata?.kind === 'function') &&
          n.label === selectedStep.methodName,
      ) ?? null
    );
  }, [selectedStep, graphNodes]);

  // Callers: edges where target === methodNode.id (call type)
  const callers = useMemo<GraphNode[]>(() => {
    if (!methodNode) return [];
    const callerIds = graphEdges
      .filter((e) => e.type === 'call' && e.target === methodNode.id)
      .map((e) => e.source);
    return callerIds.reduce<GraphNode[]>((acc, id) => {
      const node = graphNodes.find((n) => n.id === id);
      if (node) acc.push(node);
      return acc;
    }, []);
  }, [methodNode, graphNodes, graphEdges]);

  // Callees: edges where source === methodNode.id (call type)
  const callees = useMemo<GraphNode[]>(() => {
    if (!methodNode) return [];
    const calleeIds = graphEdges
      .filter((e) => e.type === 'call' && e.source === methodNode.id)
      .map((e) => e.target);
    return calleeIds.reduce<GraphNode[]>((acc, id) => {
      const node = graphNodes.find((n) => n.id === id);
      if (node) acc.push(node);
      return acc;
    }, []);
  }, [methodNode, graphNodes, graphEdges]);

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  const panelStyle: CSSProperties = {
    width: 300,
    height: '100%',
    background: '#fafafa',
    borderLeft: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Inter', sans-serif",
    fontSize: 12,
    color: '#1a1a2e',
    overflowY: 'auto',
    flexShrink: 0,
  };

  const emptyStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9e9e9e',
    fontSize: 12,
    padding: 24,
    textAlign: 'center',
    gap: 8,
  };

  const sectionStyle: CSSProperties = {
    padding: '10px 16px',
    borderBottom: '1px solid #f0f0f0',
  };

  const sectionTitleStyle: CSSProperties = {
    fontWeight: 600,
    fontSize: 11,
    color: '#757575',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  };

  const statRowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '2px 0',
    fontSize: 12,
  };

  const statLabelStyle: CSSProperties = { color: '#616161' };

  const statValueStyle: CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 600,
    fontSize: 11,
    color: '#1a1a2e',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 160,
    whiteSpace: 'nowrap',
  };

  const listStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  };

  const emptyListStyle: CSSProperties = {
    fontSize: 11,
    color: '#bdbdbd',
    fontStyle: 'italic',
  };

  // ---------------------------------------------------------------------------
  // Empty / no selection
  // ---------------------------------------------------------------------------

  if (!selectedStep) {
    return (
      <div style={panelStyle}>
        <div style={emptyStyle}>
          <span style={{ fontSize: 24 }}>🔧</span>
          <span>點擊呼叫鏈節點</span>
          <span style={{ fontSize: 11, color: '#bdbdbd' }}>查看方法詳細資訊</span>
        </div>
      </div>
    );
  }

  const catColors = CATEGORY_COLORS[selectedStep.category] ?? CATEGORY_COLORS.utils;
  const sig = methodNode ? buildSignature(methodNode) : `(${selectedStep.methodName})`;
  const lineCount = methodNode?.metadata?.lineCount;
  const isAsync = methodNode?.metadata?.isAsync;
  const isExported = methodNode?.metadata?.isExported;
  // Complexity is not stored as a standard field; approximate from lineCount
  const complexityEst = lineCount ? Math.max(1, Math.round(lineCount / 8)) : null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={panelStyle}>
      {/* Header: method name + category color bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          borderBottom: '1px solid #e8e8e8',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 4,
            background: catColors.bar,
            flexShrink: 0,
          }}
        />
        <div
          style={{
            flex: 1,
            padding: '12px 14px 10px',
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              color: catColors.text,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
            }}
          >
            <span>🔧</span>
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
              title={selectedStep.methodName}
            >
              {selectedStep.methodName}()
            </span>
          </div>
          {/* Category badge */}
          <span
            style={{
              display: 'inline-block',
              fontSize: 9,
              fontWeight: 600,
              background: catColors.bg,
              color: catColors.bar,
              borderRadius: 10,
              padding: '1px 6px',
              border: `1px solid ${catColors.bar}44`,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {catColors.label}
          </span>
        </div>
      </div>

      {/* Signature section */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span>( )</span>
          <span>簽名</span>
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: '#1a1a2e',
            background: '#f5f5f5',
            borderRadius: 4,
            padding: '6px 8px',
            wordBreak: 'break-word',
            lineHeight: 1.5,
          }}
        >
          {sig}
        </div>
        {isAsync && (
          <div style={{ marginTop: 4, fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>
            非同步
          </div>
        )}
        {isExported && (
          <div style={{ marginTop: 2, fontSize: 10, color: '#43a047' }}>
            已匯出
          </div>
        )}
      </div>

      {/* Location section */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span>📍</span>
          <span>位置</span>
        </div>
        {selectedStep.className && (
          <div style={statRowStyle}>
            <span style={statLabelStyle}>類別</span>
            <span style={statValueStyle} title={selectedStep.className}>
              {selectedStep.className.split('/').pop() ?? selectedStep.className}
            </span>
          </div>
        )}
        <div style={statRowStyle}>
          <span style={statLabelStyle}>檔案</span>
          <span style={statValueStyle} title={selectedStep.filePath}>
            {shortenPath(selectedStep.filePath)}
          </span>
        </div>
        {lineCount !== undefined && (
          <div style={statRowStyle}>
            <span style={statLabelStyle}>行數</span>
            <span style={statValueStyle}>{lineCount}</span>
          </div>
        )}
        {complexityEst !== null && complexityEst !== undefined && (
          <div style={statRowStyle}>
            <span style={statLabelStyle}>複雜度</span>
            <span
              style={{
                ...statValueStyle,
                color: complexityEst > 10 ? '#e65100' : complexityEst > 5 ? '#f59e0b' : '#43a047',
              }}
            >
              ~{complexityEst}
            </span>
          </div>
        )}
      </div>

      {/* Callers section */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span>⬆</span>
          <span>呼叫者 ({callers.length})</span>
        </div>
        {callers.length === 0 ? (
          <span style={emptyListStyle}>
            {methodNode ? '未偵測到呼叫者' : '無函式節點資料'}
          </span>
        ) : (
          <div style={listStyle}>
            {callers.slice(0, 8).map((n) => (
              <ListItem key={n.id} label={`${n.label}()`} />
            ))}
            {callers.length > 8 && (
              <span style={{ fontSize: 10, color: '#bdbdbd' }}>
                +{callers.length - 8} 更多
              </span>
            )}
          </div>
        )}
      </div>

      {/* Callees section */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span>⬇</span>
          <span>被呼叫者 ({callees.length})</span>
        </div>
        {callees.length === 0 ? (
          <span style={emptyListStyle}>
            {methodNode ? '未偵測到被呼叫者' : '無函式節點資料'}
          </span>
        ) : (
          <div style={listStyle}>
            {callees.slice(0, 8).map((n) => (
              <ListItem key={n.id} label={`${n.label}()`} />
            ))}
            {callees.length > 8 && (
              <span style={{ fontSize: 10, color: '#bdbdbd' }}>
                +{callees.length - 8} 更多
              </span>
            )}
          </div>
        )}
      </div>

      {/* Depth info */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span>🔢</span>
          <span>鏈路資訊</span>
        </div>
        <div style={statRowStyle}>
          <span style={statLabelStyle}>層級</span>
          <span style={statValueStyle}>{selectedStep.depth}</span>
        </div>
      </div>
    </div>
  );
}
