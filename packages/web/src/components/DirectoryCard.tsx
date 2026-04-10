/**
 * CodeAtlas — DirectoryCard Component (Sprint 12-15)
 *
 * Custom React Flow node for system-framework perspective.
 * Renders directory-level cards with type-specific colors,
 * an accent bar, a file-count badge, and React Flow handles.
 *
 * Design source: proposal/references/sprint12/three-perspectives-mockup.html
 * CSS class: .dir-card
 *
 * Type colors (SF_TYPE_COLOR in mockup):
 *   entry   → border #1565c0, bg #e3f2fd, badgeBg #bbdefb
 *   logic   → border #1565c0, bg #e3f2fd, badgeBg #bbdefb
 *   data    → border #0d47a1, bg #e8eaf6, badgeBg #c5cae9
 *   support → border #546e7a, bg #eceff1, badgeBg #cfd8dc
 */

import { memo, useState, type CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NeonNodeData } from '../adapters/graph-adapter';
import type { DirectoryType, DirectoryCategory } from '../types/graph';
// AI analysis moved to SFDetailPanel (right side)

// ---------------------------------------------------------------------------
// Type-color map (from mockup SF_TYPE_COLOR)
// ---------------------------------------------------------------------------

interface TypeColors {
  border: string;
  bg: string;
  badgeBg: string;
  badge: string;
}

const TYPE_COLORS: Record<DirectoryType, TypeColors> = {
  entry: {
    border: '#1565c0',
    bg: '#e3f2fd',
    badgeBg: '#bbdefb',
    badge: '#1565c0',
  },
  logic: {
    border: '#1565c0',
    bg: '#e3f2fd',
    badgeBg: '#bbdefb',
    badge: '#1565c0',
  },
  data: {
    border: '#0d47a1',
    bg: '#e8eaf6',
    badgeBg: '#c5cae9',
    badge: '#0d47a1',
  },
  support: {
    border: '#546e7a',
    bg: '#eceff1',
    badgeBg: '#cfd8dc',
    badge: '#546e7a',
  },
};

const DEFAULT_COLORS: TypeColors = TYPE_COLORS.logic;

// ---------------------------------------------------------------------------
// Sprint 13: Category left-border accent colors
// ---------------------------------------------------------------------------

const CATEGORY_ACCENT_COLOR: Record<DirectoryCategory, string> = {
  frontend: '#7b1fa2', // purple
  backend: '#1565c0',  // blue
  infra: '#546e7a',    // gray
};

// ---------------------------------------------------------------------------
// Type icons (from mockup)
// ---------------------------------------------------------------------------

const TYPE_ICONS: Record<DirectoryType, string> = {
  entry: '⬡',
  logic: '◈',
  data: '◆',
  support: '◇',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// DirectoryCardInner
// ---------------------------------------------------------------------------

function DirectoryCardInner({ data, selected = false }: NodeProps) {
  const nodeData = data as unknown as NeonNodeData & {
    category?: DirectoryCategory;
    sublabel?: string;
    directoryType?: DirectoryType;
    aiSummary?: string;
    directoryRole?: string;
    directoryPath?: string;
  };
  const [isHovered, setIsHovered] = useState(false);

  // Resolve directory type: prefer data-level directoryType → metadata directoryType → fallback 'logic'
  const rawDirType = nodeData.directoryType
    ?? (nodeData.metadata as Record<string, unknown>)?.directoryType as string | undefined;
  const dirType: DirectoryType = (rawDirType && rawDirType in TYPE_COLORS)
    ? rawDirType as DirectoryType
    : 'logic';
  const c: TypeColors = TYPE_COLORS[dirType] ?? DEFAULT_COLORS;
  const icon = TYPE_ICONS[dirType] ?? '◈';

  // Sprint 13: category accent color (5px left border)
  const category = nodeData.category as DirectoryCategory | undefined;

  // Sprint 15: enhance category from AI directoryRole if no category set
  const resolvedCategory: DirectoryCategory | undefined = category ?? (
    nodeData.directoryRole === '前端' ? 'frontend' :
    nodeData.directoryRole === '路由層' || nodeData.directoryRole === '資料層' || nodeData.directoryRole === '服務層' ? 'backend' :
    nodeData.directoryRole === '基礎設施' || nodeData.directoryRole === '設定' ? 'infra' :
    undefined
  );
  const categoryAccentColor = resolvedCategory ? CATEGORY_ACCENT_COLOR[resolvedCategory] : undefined;

  // Sprint 13: sublabel (full path)
  const sublabel = nodeData.sublabel as string | undefined;

  // fileSize field in metadata holds fileCount (see adaptDirectoryGraph / applyPerspective)
  const fileCount = nodeData.metadata?.fileSize ?? 0;

  // Active state: hovered or selected (React Flow passes selected prop)
  const isActive = isHovered || selected;

  // Sprint 13: selected state shows a blue glow border
  const isSelected = selected;

  // Card height: taller when sublabel or AI summary is present
  const hasAiSummary = !!nodeData.aiSummary;
  const cardHeight = sublabel
    ? (hasAiSummary ? 96 : 84)
    : (hasAiSummary ? 84 : 72);

  // Outer wrapper — flex column, width 160px
  // Card box has fixed height; AI button area sits below it
  const containerStyle: CSSProperties = {
    width: 160,
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
    filter: isSelected
      ? 'drop-shadow(0 0 10px rgba(21,101,192,0.45))'
      : isActive
        ? 'drop-shadow(0 3px 8px rgba(21,101,192,0.2))'
        : 'drop-shadow(0 1px 3px rgba(0,0,0,0.08))',
    transition: 'filter 0.2s',
  };

  // Card box — fixed height, position relative for absolute children
  const cardBoxStyle: CSSProperties = {
    width: 160,
    height: cardHeight,
    position: 'relative',
    flexShrink: 0,
  };

  // Card body rect
  const cardBodyStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: 8,
    // Sprint 13: selected → blue glow border; active → normal border
    border: isSelected
      ? '2.5px solid #1565c0'
      : `${isActive ? 2 : 1.5}px solid ${c.border}`,
    background: isActive ? c.bg : '#ffffff',
    transition: 'border-width 0.2s, background 0.2s, border-color 0.2s',
    boxSizing: 'border-box',
    // Sprint 13: if selected, box shadow for glow effect
    ...(isSelected ? { boxShadow: '0 0 0 3px rgba(21,101,192,0.15)' } : {}),
  };

  // Sprint 13: Left category accent bar (5px wide, full height)
  const categoryBarStyle: CSSProperties | undefined = categoryAccentColor
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 5,
        height: '100%',
        borderRadius: '8px 0 0 8px',
        background: categoryAccentColor,
        opacity: 0.85,
        pointerEvents: 'none',
        zIndex: 1,
      }
    : undefined;

  // Top accent bar — height 5px, color=border, opacity 0.15
  // Only shown when no category bar (to avoid visual conflict)
  const accentBarStyle: CSSProperties = {
    position: 'absolute',
    top: 1,
    left: categoryAccentColor ? 5 : 1,
    right: 1,
    height: 5,
    borderRadius: categoryAccentColor ? '0 7px 0 0' : '7px 7px 0 0',
    background: c.border,
    opacity: 0.12,
    pointerEvents: 'none',
  };

  // Content area: dot + label row
  const contentLeft = categoryAccentColor ? 14 : 10;
  const contentStyle: CSSProperties = {
    position: 'absolute',
    top: 12,
    left: contentLeft,
    right: 10,
  };

  // Dot (8px diameter)
  const dotStyle: CSSProperties = {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: c.border,
    flexShrink: 0,
    marginRight: 6,
    verticalAlign: 'middle',
  };

  // Dir name label
  const labelStyle: CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 700,
    fontSize: 11,
    color: '#1a1a2e',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    verticalAlign: 'middle',
    lineHeight: '14px',
    flex: 1,
  };

  // Sprint 13: sublabel style (full path)
  const sublabelStyle: CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: 9,
    color: '#9e9e9e',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginTop: 2,
    lineHeight: '12px',
    paddingLeft: 14, // align under the label (after dot)
  };

  // Badge area: bottom section
  const badgeTop = sublabel
    ? (hasAiSummary ? 64 : 52)
    : (hasAiSummary ? 52 : 40);
  const badgeStyle: CSSProperties = {
    position: 'absolute',
    top: badgeTop,
    left: contentLeft,
    background: c.badgeBg,
    color: c.badge,
    fontSize: 9,
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600,
    padding: '1px 6px',
    borderRadius: 4,
    lineHeight: '16px',
    whiteSpace: 'nowrap',
  };

  // Handle style — hidden, for React Flow edge connections only
  const handleStyle: CSSProperties = {
    visibility: 'hidden',
    width: 6,
    height: 6,
  };

  // SF-2: Directory icon in bottom-right corner
  const dirIconStyle: CSSProperties = {
    position: 'absolute',
    bottom: 6,
    right: 8,
    fontSize: 11,
    lineHeight: 1,
    opacity: 0.35,
    pointerEvents: 'none',
    userSelect: 'none',
  };

  return (
    <div
      style={containerStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card box — fixed height section */}
      <div style={cardBoxStyle}>
        {/* Card body rect with border and bg */}
        <div style={cardBodyStyle} />

        {/* Sprint 13: Category left-border accent bar */}
        {categoryBarStyle && <div style={categoryBarStyle} />}

        {/* Top accent bar */}
        <div style={accentBarStyle} />

        {/* Content: dot + label (+ sublabel below) */}
        <div style={contentStyle}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={dotStyle} title={icon} />
            <span style={labelStyle}>{nodeData.label}</span>
          </span>
          {/* Sprint 13: sublabel (full path) */}
          {sublabel && (
            <div style={sublabelStyle} title={sublabel}>{sublabel}</div>
          )}
          {/* Sprint 15: AI summary */}
          {nodeData.aiSummary && (
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 9,
                color: '#9e9e9e',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: 2,
                lineHeight: '12px',
                paddingLeft: 14,
              }}
              title={nodeData.aiSummary}
            >
              {nodeData.aiSummary}
            </div>
          )}
        </div>

        {/* File count badge */}
        <div style={badgeStyle}>
          {fileCount} 個檔案
        </div>

        {/* SF-2: Directory icon — bottom-right corner */}
        <span style={dirIconStyle} aria-hidden="true">📁</span>
      </div>

      {/* React Flow handles — hidden, required for edge connections */}
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

export const DirectoryCard = memo(DirectoryCardInner);
