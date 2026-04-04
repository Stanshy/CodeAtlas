/**
 * CodeAtlas — NeonNode Component
 *
 * Custom React Flow node for file-type nodes (Cyan neon theme).
 * Supports normal/hover/active states with glow effects.
 * Color constants from theme.ts per G1-approved design.
 *
 * Sprint 11: perspective-aware styling
 *   - system-framework: Cyan monochrome + directory group card + rank badge
 *   - data-journey: Green monochrome
 *   - logic-operation: existing neon multicolor (unchanged)
 */

import { memo, useState, type CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NeonNodeData } from '../adapters/graph-adapter';
import { nodeStyles, glow, colors, animation, PERSPECTIVE_COLORS, THEME } from '../styles/theme';
import { NodeIOBadge } from './NodeIOBadge';
import { useViewStateSelector } from '../contexts/ViewStateContext';
import { PERSPECTIVE_PRESETS } from '../adapters/perspective-presets';

const fileStyle = nodeStyles.file;

// Rank labels for system-framework hierarchical badge
const RANK_LABELS: Record<number, string> = {
  0: 'UI',
  1: 'API',
  2: 'Service',
};
function getRankLabel(rank: number): string {
  return RANK_LABELS[rank] ?? 'Data';
}

const RANK_BG: Record<number, string> = {
  0: THEME.sfBg,
  1: THEME.sfBg,
  2: THEME.sfBg,
};
function getRankBg(rank: number): string {
  return RANK_BG[rank] ?? THEME.sfBg;
}

function getNodeStyle(selected: boolean, _dragging: boolean): CSSProperties {
  const base: CSSProperties = {
    minWidth: fileStyle.minWidth,
    maxWidth: fileStyle.maxWidth,
    minHeight: fileStyle.minHeight,
    borderRadius: fileStyle.borderRadius,
    padding: fileStyle.padding,
    border: `${fileStyle.border.normal.width} solid ${fileStyle.border.normal.color}`,
    background: fileStyle.background.normal,
    boxShadow: glow.file.subtle.boxShadow,
    filter: glow.file.subtle.filter,
    cursor: 'pointer',
    transition: `all ${animation.nodeHover.duration} ${animation.nodeHover.easing}`,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    overflow: 'hidden',
  };

  if (selected) {
    base.border = `${fileStyle.border.active.width} solid ${fileStyle.border.active.color}`;
    base.background = fileStyle.background.active;
    base.boxShadow = glow.file.intense.boxShadow;
    base.filter = glow.file.intense.filter;
  }

  return base;
}

function NeonNodeInner({ data, selected = false, dragging = false }: NodeProps) {
  const nodeData = data as unknown as NeonNodeData & { rank?: number; isEntryNode?: boolean; isExitNode?: boolean; djInitial?: boolean };
  const style = getNodeStyle(selected, dragging);

  const importCount = nodeData.metadata?.importCount ?? 0;
  const exportCount = nodeData.metadata?.exportCount ?? 0;

  // Sprint 10: infrastructure nodes render at slightly reduced opacity
  const role = nodeData.metadata?.role;
  const isInfrastructure = role === 'infrastructure';

  // Sprint 11: perspective-aware rendering
  const activePerspective = useViewStateSelector((s) => s.activePerspective);
  const perspectivePreset = PERSPECTIVE_PRESETS[activePerspective];
  const { colorScheme } = perspectivePreset;
  const perspectiveColors = PERSPECTIVE_COLORS[colorScheme];

  const isSystemFramework = activePerspective === 'system-framework';
  const isDataJourney = activePerspective === 'data-journey';
  const isLogicOperation = activePerspective === 'logic-operation';
  const isDirectory = nodeData.nodeType === 'directory';

  // Hover state for system-framework directory card (must be before conditional return)
  const [dirHovered, setDirHovered] = useState(false);

  // --- System Framework: directory group card ---
  if (isSystemFramework && isDirectory) {
    return (
      <div
        className="neon-node neon-node--dir-group"
        style={{
          width: 180,
          minHeight: 68,
          background: dirHovered ? THEME.sfBg : THEME.nodeFill,
          border: `${dirHovered ? '2px' : '1.5px'} solid ${dirHovered ? THEME.sfBorder : THEME.borderDefault}`,
          borderRadius: 10,
          padding: '10px 14px',
          gap: 3,
          flexDirection: 'column',
          alignItems: 'flex-start',
          display: 'flex',
          position: 'relative',
          cursor: 'pointer',
          boxShadow: dirHovered ? THEME.shadowHover : THEME.shadowCard,
          transition: 'border-color 200ms, box-shadow 200ms, background 200ms',
        }}
        onMouseEnter={() => setDirHovered(true)}
        onMouseLeave={() => setDirHovered(false)}
      >
        <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
        <div
          style={{
            color: THEME.sfBorder,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: THEME.fontUi,
          }}
        >
          {nodeData.label}/
          {' '}
          <span style={{ opacity: 0.6, color: THEME.inkSecondary }}>({importCount + exportCount})</span>
        </div>
        <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
      </div>
    );
  }

  // --- Data Journey: directory node (green monochrome) ---
  if (isDataJourney && isDirectory) {
    return (
      <div
        className="neon-node neon-node--dir-group"
        style={{
          height: 34,
          background: dirHovered ? THEME.djBg : THEME.nodeFill,
          border: `1.5px solid ${dirHovered ? THEME.djBorder : THEME.borderDefault}`,
          borderRadius: 8,
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          position: 'relative',
          cursor: 'pointer',
          boxShadow: dirHovered ? THEME.shadowHover : THEME.shadowCard,
          transition: 'border-color 200ms, box-shadow 200ms, background 200ms',
          color: THEME.inkMuted,
          fontSize: 11.5,
          fontFamily: THEME.fontMono,
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={() => setDirHovered(true)}
        onMouseLeave={() => setDirHovered(false)}
      >
        <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
        <span>{nodeData.label}/</span>
        {nodeData.isEntryNode && (
          <span style={{ fontSize: 10, color: THEME.djAccent, marginLeft: 2 }}>▶</span>
        )}
        {nodeData.isExitNode && !nodeData.isEntryNode && (
          <span style={{ fontSize: 10, color: THEME.djExitBorder, marginLeft: 2 }}>■</span>
        )}
        <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
      </div>
    );
  }

  // --- Data Journey: initial state entry/exit big card (mockup style) ---
  if (isDataJourney && nodeData.djInitial && (nodeData.isEntryNode || nodeData.isExitNode)) {
    const isEntry = !!nodeData.isEntryNode;
    const cardBorder = isEntry ? THEME.djAccent : THEME.djExitBorder;
    const cardBg = isEntry ? THEME.djBg : THEME.djExitBg;
    const cardColor = isEntry ? '#1b5e20' : '#bf360c';
    const subtitle = isEntry ? '點擊開始追蹤' : '出口';
    return (
      <div
        className="neon-node neon-node--dj-card"
        style={{
          width: 180,
          height: 56,
          background: dirHovered ? cardBg : THEME.nodeFill,
          border: `2px solid ${cardBorder}`,
          borderRadius: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          position: 'relative',
          cursor: 'pointer',
          boxShadow: dirHovered ? THEME.shadowHover : THEME.shadowCard,
          transition: 'background 200ms, box-shadow 200ms',
        }}
        onMouseEnter={() => setDirHovered(true)}
        onMouseLeave={() => setDirHovered(false)}
      >
        <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
        <div
          style={{
            fontFamily: THEME.fontMono,
            fontSize: 12,
            fontWeight: 600,
            color: cardColor,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 160,
          }}
        >
          {nodeData.label}
        </div>
        <div
          style={{
            fontSize: 10,
            color: cardBorder,
            opacity: 0.7,
          }}
        >
          {subtitle}
        </div>
        <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
      </div>
    );
  }

  // --- Perspective-aware icon color ---
  const iconColor: string = (isSystemFramework || isDataJourney)
    ? perspectiveColors.primary
    : fileStyle.icon.color;

  let perspectiveStyle: CSSProperties = {};
  if (isSystemFramework) {
    // A4: system-framework file node — white-paper blue theme
    perspectiveStyle = {
      height: 34,
      minWidth: 160,
      minHeight: 'unset' as CSSProperties['minHeight'],
      maxWidth: 'unset' as CSSProperties['maxWidth'],
      borderRadius: 6,
      border: selected ? `1.5px solid ${THEME.sfBorder}` : `1.5px solid ${THEME.borderDefault}`,
      background: selected ? THEME.sfBg : THEME.nodeFill,
      color: selected ? THEME.sfBorder : THEME.inkSecondary,
      padding: '6px 12px',
      boxShadow: selected ? THEME.shadowHover : THEME.shadowCard,
      filter: 'none',
    };
  } else if (isDataJourney) {
    // C2: data-journey file node — white-paper green theme
    perspectiveStyle = {
      height: 34,
      minHeight: 'unset' as CSSProperties['minHeight'],
      borderRadius: 8,
      border: `1.5px solid ${THEME.borderDefault}`,
      background: THEME.nodeFill,
      color: THEME.inkMuted,
      boxShadow: THEME.shadowCard,
      filter: 'none',
    };
  }

  // Rank badge for system-framework (sprint 11 §1.4)
  const rank = nodeData.rank;
  const showRankBadge = isSystemFramework && rank !== undefined;

  // Sprint 12: entry/exit markers for data-journey and logic-operation
  const showEntryBadge = (isDataJourney || isLogicOperation) && nodeData.isEntryNode;
  const showExitBadge = (isDataJourney || isLogicOperation) && nodeData.isExitNode && !nodeData.isEntryNode;

  return (
    <div
      className="neon-node"
      style={{
        ...style,
        ...perspectiveStyle,
        position: 'relative',
        opacity: isInfrastructure ? 0.75 : 1.0,
        transition: `all ${animation.nodeHover.duration} ${animation.nodeHover.easing}`,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />

      {/* Rank badge (system-framework only) */}
      {showRankBadge && (
        <span
          style={{
            position: 'absolute',
            top: -6,
            right: 6,
            background: getRankBg(rank!),
            border: `1px solid ${THEME.sfBorder}`,
            borderRadius: 3,
            padding: '1px 5px',
            fontSize: 9,
            fontWeight: 600,
            color: THEME.sfBorder,
            opacity: 0.9,
            pointerEvents: 'none',
          }}
        >
          {getRankLabel(rank!)}
        </span>
      )}

      {/* Entry marker (data-journey / logic-operation) — symbol only */}
      {showEntryBadge && (
        <span
          style={{
            position: 'absolute',
            top: -7,
            left: 4,
            fontSize: 11,
            lineHeight: 1,
            color: isDataJourney ? THEME.djAccent : THEME.loEntryColor,
            pointerEvents: 'none',
          }}
        >
          {isDataJourney ? '▶' : '★'}
        </span>
      )}

      {/* Exit marker (data-journey / logic-operation) — visually distinct symbol */}
      {showExitBadge && (
        <span
          style={{
            position: 'absolute',
            top: -7,
            right: 4,
            fontSize: 11,
            lineHeight: 1,
            color: isDataJourney ? THEME.djExitBorder : THEME.loExitColor,
            pointerEvents: 'none',
          }}
        >
          ■
        </span>
      )}

      <div
        style={{
          width: fileStyle.icon.size,
          height: fileStyle.icon.size,
          borderRadius: '2px',
          background: iconColor,
          flexShrink: 0,
          opacity: 0.8,
        }}
      />
      <div style={{ overflow: 'hidden', flex: 1 }}>
        <div
          style={{
            fontFamily: fileStyle.label.fontFamily,
            fontWeight: fileStyle.label.fontWeight,
            fontSize: fileStyle.label.fontSize,
            color: fileStyle.label.color,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {nodeData.label}
        </div>
        {nodeData.filePath && nodeData.filePath !== nodeData.label && (
          <div
            style={{
              fontSize: fileStyle.subLabel.fontSize,
              color: fileStyle.subLabel.color,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: '2px',
            }}
          >
            {nodeData.filePath}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />

      {/* I/O badge overlay — shows import/export counts below the node */}
      <NodeIOBadge importCount={importCount} exportCount={exportCount} />
    </div>
  );
}

export const NeonNode = memo(NeonNodeInner);

/**
 * CSS hover styles injected via stylesheet (global.css cannot target React Flow nodes dynamically).
 * The hover effect is applied via onMouseEnter/onMouseLeave in the parent or via CSS :hover.
 */
export const neonNodeHoverStyle: CSSProperties = {
  border: `${fileStyle.border.hover.width} solid ${fileStyle.border.hover.color}`,
  background: fileStyle.background.hover,
  boxShadow: glow.file.normal.boxShadow,
  filter: glow.file.normal.filter,
  transform: fileStyle.transform.hover,
};

/** Faded style for non-highlighted nodes */
export const neonNodeFadedStyle: CSSProperties = {
  opacity: 0.35,
  filter: 'none',
  boxShadow: 'none',
  transition: `all ${animation.edgeFade.duration} ${animation.edgeFade.easing}`,
};

/** Re-export colors for external use */
export { colors };
