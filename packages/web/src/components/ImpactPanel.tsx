/**
 * CodeAtlas — ImpactPanel Component
 *
 * Displays impact analysis results in a layered list grouped by BFS depth.
 * Features:
 * - Direction indicator (forward / reverse)
 * - Stats row with optional truncation warning
 * - Depth slider (1–10, live re-analysis)
 * - BFS-depth-grouped node list, sorted by label within each layer
 * - Click-to-navigate per node
 * - Empty state when no dependencies exist
 *
 * Sprint 8 — T5
 */

import { memo, useMemo, useState } from 'react';
import { colors } from '../styles/theme';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ImpactNode {
  id: string;
  label: string;
  filePath: string;
}

export interface ImpactPanelProps {
  direction: 'forward' | 'reverse';
  targetNodeId: string;
  targetNodeLabel: string;
  impactedNodes: ImpactNode[];
  depthMap: Record<string, number>;
  maxDepth: number;
  truncated: boolean;
  onDepthChange: (depth: number) => void;
  onNodeClick: (nodeId: string) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const headerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 12,
};

const titleGroupStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minWidth: 0,
};

const titleStyles: React.CSSProperties = {
  color: colors.text.primary,
  fontSize: 14,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const directionIconStyles: React.CSSProperties = {
  fontSize: 16,
  flexShrink: 0,
};

const closeButtonStyles: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: colors.text.secondary,
  fontSize: 18,
  cursor: 'pointer',
  padding: '2px 6px',
  borderRadius: 4,
  lineHeight: 1,
  flexShrink: 0,
};

const targetLabelStyles: React.CSSProperties = {
  color: colors.primary.DEFAULT,
  fontSize: 13,
  fontWeight: 500,
  marginBottom: 10,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const statsStyles: React.CSSProperties = {
  color: colors.text.muted,
  fontSize: 12,
  marginBottom: 12,
};

const truncationWarningStyles: React.CSSProperties = {
  color: '#f59e0b',
  fontSize: 12,
  padding: '6px 10px',
  background: 'rgba(245, 158, 11, 0.1)',
  borderRadius: 6,
  marginBottom: 12,
};

const depthSliderContainerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 16,
  padding: '8px 0',
};

const depthLabelStyles: React.CSSProperties = {
  color: colors.text.secondary,
  fontSize: 12,
  flexShrink: 0,
};

const depthValueStyles: React.CSSProperties = {
  color: colors.text.primary,
  fontSize: 12,
  fontWeight: 600,
  minWidth: 16,
  textAlign: 'right' as const,
  flexShrink: 0,
};

const listContainerStyles: React.CSSProperties = {
  overflowY: 'auto',
  flex: 1,
};

const layerTitleStyles: React.CSSProperties = {
  color: colors.text.secondary,
  fontSize: 12,
  fontWeight: 600,
  marginTop: 12,
  marginBottom: 6,
};

const nodeItemStyles: React.CSSProperties = {
  padding: '6px 10px',
  cursor: 'pointer',
  borderRadius: 6,
  transition: 'background 0.1s',
  fontSize: 13,
};

const nodeLabelStyles: React.CSSProperties = {
  color: colors.text.primary,
  fontWeight: 500,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const nodePathStyles: React.CSSProperties = {
  color: colors.text.muted,
  fontSize: 11,
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  marginTop: 1,
};

const emptyStateStyles: React.CSSProperties = {
  color: colors.text.muted,
  fontSize: 13,
  fontStyle: 'italic',
  textAlign: 'center' as const,
  padding: '24px 0',
};

// ---------------------------------------------------------------------------
// NodeItem sub-component — handles hover state locally
// ---------------------------------------------------------------------------

interface NodeItemProps {
  node: ImpactNode;
  onNodeClick: (nodeId: string) => void;
}

function NodeItem({ node, onNodeClick }: NodeItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        ...nodeItemStyles,
        background: hovered ? colors.primary.ghost : 'transparent',
      }}
      onClick={() => onNodeClick(node.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onNodeClick(node.id)}
      aria-label={`Navigate to node: ${node.label}`}
    >
      <div style={nodeLabelStyles}>{node.label}</div>
      <div style={nodePathStyles}>{node.filePath}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ImpactPanel
// ---------------------------------------------------------------------------

export const ImpactPanel = memo(function ImpactPanel({
  direction,
  targetNodeId: _targetNodeId,
  targetNodeLabel,
  impactedNodes,
  depthMap,
  maxDepth,
  truncated,
  onDepthChange,
  onNodeClick,
  onClose,
}: ImpactPanelProps) {
  // Group impacted nodes by BFS depth, skip depth 0 (start node itself)
  const grouped = useMemo(() => {
    const groups = new Map<number, ImpactNode[]>();

    for (const node of impactedNodes) {
      const depth = depthMap[node.id] ?? 0;
      if (depth === 0) continue; // skip start node
      if (!groups.has(depth)) groups.set(depth, []);
      groups.get(depth)!.push(node);
    }

    // Sort each group by label
    for (const group of groups.values()) {
      group.sort((a, b) => a.label.localeCompare(b.label));
    }

    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [impactedNodes, depthMap]);

  // Affected count excludes the start node (depth 0)
  const affectedCount = impactedNodes.filter(
    (n) => (depthMap[n.id] ?? 0) > 0,
  ).length;

  const isForward = direction === 'forward';
  const directionIcon = isForward ? '\u2192' : '\u2190'; // → or ←
  const directionLabel = isForward ? '正向影響分析' : '反向依賴分析';

  const isEmpty = impactedNodes.length <= 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={headerStyles}>
        <div style={titleGroupStyles}>
          <span
            style={{
              ...directionIconStyles,
              color: isForward ? colors.neon.green.DEFAULT : colors.neon.cyan.DEFAULT,
            }}
          >
            {directionIcon}
          </span>
          <span style={titleStyles}>{directionLabel}</span>
        </div>
        <button
          style={closeButtonStyles}
          onClick={onClose}
          type="button"
          aria-label="Close impact panel"
        >
          &times;
        </button>
      </div>

      {/* Target node label */}
      <div style={targetLabelStyles} title={targetNodeLabel}>
        {targetNodeLabel}
      </div>

      {/* Stats */}
      <div style={statsStyles}>影響 {affectedCount} 個節點</div>

      {/* Truncation warning */}
      {truncated && (
        <div style={truncationWarningStyles}>
          影響範圍較大，已截斷至 50 個節點
        </div>
      )}

      {/* Depth slider */}
      <div style={depthSliderContainerStyles}>
        <span style={depthLabelStyles}>分析深度</span>
        <input
          type="range"
          min={1}
          max={10}
          value={maxDepth}
          onChange={(e) => onDepthChange(Number(e.target.value))}
          style={{
            flex: 1,
            accentColor: colors.primary.DEFAULT,
            cursor: 'pointer',
          }}
          aria-label="分析深度"
        />
        <span style={depthValueStyles}>{maxDepth}</span>
      </div>

      {/* Node list or empty state */}
      <div style={listContainerStyles}>
        {isEmpty ? (
          <div style={emptyStateStyles}>此節點無依賴關係</div>
        ) : (
          grouped.map(([depth, nodes]) => (
            <div key={depth}>
              <div style={layerTitleStyles}>
                第 {depth} 層（{nodes.length} 個節點）
              </div>
              {nodes.map((node) => (
                <NodeItem
                  key={node.id}
                  node={node}
                  onNodeClick={onNodeClick}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
});
