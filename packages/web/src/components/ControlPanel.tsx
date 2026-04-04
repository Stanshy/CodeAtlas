/**
 * CodeAtlas — ControlPanel
 * Unified left sidebar integrating all feature controls.
 * Sprint 9 — S9-1.
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useViewState } from '../contexts/ViewStateContext';
import { ControlPanelSection } from './ControlPanelSection';
import { FilterPanel } from './FilterPanel';
import { DisplayPrefsSection } from './DisplayPrefsSection';
import { colors } from '../styles/theme';
import type { GraphNode, GraphEdge, PerspectiveName } from '../types/graph';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ControlPanelProps {
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
}

// ---------------------------------------------------------------------------
// SVG Icon primitives
// ---------------------------------------------------------------------------

function EyeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function SlidersIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="5" cy="4" r="1.5" fill="currentColor" />
      <circle cx="10" cy="8" r="1.5" fill="currentColor" />
      <circle cx="6" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function GraphIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="3" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="13" cy="3" r="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="13" cy="13" r="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 8l6-4M5 8l6 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 3h12M4 7h8M6 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function SparklesIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 2l1.2 3.3L13 6l-3.3 1.2L8 10.5 6.8 7.2 3 6l3.3-1.2L8 2z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M3 11l.8 1.2L5 13l-1.2.8L3 15l-.8-1.2L1 13l1.2-.8L3 11z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 4L4 10M4 4l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ArrowRightIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Perspective config (Sprint 11)
// ---------------------------------------------------------------------------

interface PerspectiveOption {
  id: PerspectiveName;
  label: string;
  description: string;
  color: string;
  accentRgb: string;
  badge: string;
}

const PERSPECTIVE_OPTIONS: PerspectiveOption[] = [
  {
    id: 'system-framework',
    label: '系統框架',
    description: '分層結構一目了然',
    color: '#00d4ff',
    accentRgb: '0, 212, 255',
    badge: '2D 專用',
  },
  {
    id: 'logic-operation',
    label: '邏輯運作',
    description: '從入口追呼叫鏈',
    color: '#ff00ff',
    accentRgb: '255, 0, 255',
    badge: '2D + 3D',
  },
  {
    id: 'data-journey',
    label: '資料旅程',
    description: '逐步追蹤資料路徑',
    color: '#00ff88',
    accentRgb: '0, 255, 136',
    badge: '2D + 3D',
  },
];

// ---------------------------------------------------------------------------
// Collapsed icon strip
// ---------------------------------------------------------------------------

interface CollapsedStripProps {
  onExpand: () => void;
}

function CollapsedStrip({ onExpand }: CollapsedStripProps) {
  const STRIP_ICONS = [
    { icon: <EyeIcon size={16} />, label: '視圖模式' },
    { icon: <SlidersIcon size={16} />, label: '顯示偏好' },
    { icon: <GraphIcon size={16} />, label: '分析工具' },
    { icon: <FilterIcon size={16} />, label: '過濾器' },
    { icon: <SparklesIcon size={16} />, label: 'AI 設定' },
  ];

  return (
    <motion.div
      key="collapsed"
      initial={{ width: 280, opacity: 0 }}
      animate={{ width: 44, opacity: 1 }}
      exit={{ width: 44, opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        left: 0,
        top: 48,
        height: 'calc(100vh - 48px)',
        width: 44,
        background: colors.bg.overlay,
        backdropFilter: 'blur(12px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 35,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 12,
        gap: 4,
        overflowX: 'hidden',
      }}
    >
      {/* CodeAtlas logo button — click to expand */}
      <button
        onClick={onExpand}
        title="展開控制面板"
        aria-label="展開控制面板"
        style={{
          width: 32,
          height: 32,
          background: colors.primary.ghost,
          border: `1px solid ${colors.primary.DEFAULT}`,
          borderRadius: 6,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.primary.DEFAULT,
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '-0.03em' }}>CA</span>
      </button>

      {/* Section icon buttons */}
      {STRIP_ICONS.map(({ icon, label }) => (
        <button
          key={label}
          title={label}
          aria-label={label}
          onClick={onExpand}
          style={{
            width: 32,
            height: 32,
            background: 'none',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.text.muted,
            transition: 'color 0.15s ease-out, background 0.15s ease-out',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = colors.text.primary;
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = colors.text.muted;
            (e.currentTarget as HTMLButtonElement).style.background = 'none';
          }}
        >
          {icon}
        </button>
      ))}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// ControlPanel (main expanded panel)
// ---------------------------------------------------------------------------

export const ControlPanel = memo(function ControlPanel({
  graphNodes,
  graphEdges: _graphEdges,
}: ControlPanelProps) {
  const { state, dispatch } = useViewState();
  const { isControlPanelOpen, activePerspective } = state;

  const handleToggle = () => {
    dispatch({ type: 'TOGGLE_CONTROL_PANEL' });
  };

  // -----------------------------------------------------------------------
  // Perspective section content (Sprint 11)
  // -----------------------------------------------------------------------

  const PerspectiveSection = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '4px 12px 8px',
      }}
    >
      {PERSPECTIVE_OPTIONS.map((option) => {
        const isActive = activePerspective === option.id;
        return (
          <button
            key={option.id}
            onClick={() => dispatch({ type: 'SET_PERSPECTIVE', perspective: option.id })}
            title={option.description}
            aria-pressed={isActive}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 0,
              padding: '10px 12px',
              minHeight: 52,
              width: '100%',
              background: isActive
                ? `rgba(${option.accentRgb}, 0.08)`
                : 'transparent',
              border: 'none',
              borderLeft: isActive
                ? `2px solid ${option.color}`
                : '2px solid transparent',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'background 150ms ease, border-color 150ms ease, color 150ms ease',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
                (e.currentTarget as HTMLButtonElement).style.color = colors.text.secondary;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }
            }}
          >
            {/* Color dot */}
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: option.color,
                boxShadow: `0 0 6px ${option.color}80`,
                flexShrink: 0,
                marginRight: 10,
              }}
            />
            {/* Label + description */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: isActive ? colors.text.primary : colors.text.muted,
                  lineHeight: 1.3,
                }}
              >
                {option.label}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: colors.text.muted,
                  marginTop: 2,
                  lineHeight: 1.3,
                }}
              >
                {option.description}
              </div>
            </div>
            {/* 2D/3D badge */}
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                padding: '2px 6px',
                borderRadius: 4,
                background: `rgba(${option.accentRgb}, 0.08)`,
                border: `1px solid rgba(${option.accentRgb}, 0.25)`,
                color: option.color,
                flexShrink: 0,
                marginLeft: 8,
                whiteSpace: 'nowrap',
              }}
            >
              {option.badge}
            </span>
          </button>
        );
      })}
    </div>
  );

  // -----------------------------------------------------------------------
  // Display prefs section content (T10 — DisplayPrefsSection component)
  // -----------------------------------------------------------------------

  const displayPrefsSectionContent = <DisplayPrefsSection />;

  // -----------------------------------------------------------------------
  // Analysis tools section content
  // -----------------------------------------------------------------------

  const analysisButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '8px 12px',
    background: 'none',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    cursor: 'pointer',
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: 500,
    textAlign: 'left',
    transition: 'border-color 0.15s ease-out, color 0.15s ease-out, background 0.15s ease-out',
    marginBottom: 6,
  };

  const AnalysisSection = (
    <div style={{ padding: '4px 12px 8px' }}>
      <button
        style={analysisButtonStyle}
        onClick={() => dispatch({ type: 'SET_E2E_SELECTING', selecting: true })}
        title="選取起點節點以開始端到端追蹤"
        onMouseEnter={(e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          btn.style.borderColor = colors.primary.DEFAULT;
          btn.style.color = colors.primary.DEFAULT;
          btn.style.background = colors.primary.ghost;
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          btn.style.borderColor = 'rgba(255,255,255,0.08)';
          btn.style.color = colors.text.secondary;
          btn.style.background = 'none';
        }}
      >
        <ArrowRightIcon size={14} />
        端到端追蹤
      </button>

      <button
        style={{ ...analysisButtonStyle, marginBottom: 0 }}
        title="AI 專案概述（即將推出）"
        onMouseEnter={(e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          btn.style.borderColor = 'rgba(189,0,255,0.5)';
          btn.style.color = colors.text.primary;
          btn.style.background = 'rgba(189,0,255,0.08)';
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          btn.style.borderColor = 'rgba(255,255,255,0.08)';
          btn.style.color = colors.text.secondary;
          btn.style.background = 'none';
        }}
      >
        <SparklesIcon size={14} />
        AI 專案概述
      </button>
    </div>
  );

  // -----------------------------------------------------------------------
  // Filter section content
  // -----------------------------------------------------------------------

  const FilterSection = (
    <FilterPanel embedded allNodes={graphNodes} />
  );

  // -----------------------------------------------------------------------
  // AI settings section content (placeholder)
  // -----------------------------------------------------------------------

  const AiSettingsSection = (
    <div
      style={{
        padding: '8px 12px',
        color: colors.text.muted,
        fontSize: 12,
      }}
    >
      AI 設定（即將推出）
    </div>
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <AnimatePresence mode="wait">
      {!isControlPanelOpen ? (
        <CollapsedStrip key="strip" onExpand={handleToggle} />
      ) : (
        <motion.div
          key="panel"
          initial={{ width: 44, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 44, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            left: 0,
            top: 48,
            height: 'calc(100vh - 48px)',
            width: 280,
            background: colors.bg.overlay,
            backdropFilter: 'blur(12px)',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            zIndex: 35,
            display: 'flex',
            flexDirection: 'column',
            overflowX: 'hidden',
          }}
          role="complementary"
          aria-label="控制面板"
        >
          {/* Panel header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 12px 12px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                color: colors.primary.DEFAULT,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                userSelect: 'none',
              }}
            >
              CodeAtlas
            </span>
            <button
              onClick={handleToggle}
              title="收合控制面板"
              aria-label="收合控制面板"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: colors.text.muted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                borderRadius: 4,
                transition: 'color 0.15s ease-out',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = colors.text.primary;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = colors.text.muted;
              }}
            >
              <CloseIcon size={14} />
            </button>
          </div>

          {/* Scrollable sections area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            {/* Section 1: Perspectives (Sprint 11) */}
            <ControlPanelSection
              title="故事視角"
              icon={<EyeIcon size={15} />}
              defaultOpen={true}
            >
              {PerspectiveSection}
            </ControlPanelSection>

            {/* Section 2: Display preferences */}
            <ControlPanelSection
              title="顯示偏好"
              icon={<SlidersIcon size={15} />}
              defaultOpen={false}
            >
              {displayPrefsSectionContent}
            </ControlPanelSection>

            {/* Section 3: Analysis tools */}
            <ControlPanelSection
              title="分析工具"
              icon={<GraphIcon size={15} />}
              defaultOpen={false}
            >
              {AnalysisSection}
            </ControlPanelSection>

            {/* Section 4: Filter panel (embedded) */}
            <ControlPanelSection
              title="過濾器"
              icon={<FilterIcon size={15} />}
              defaultOpen={false}
            >
              {FilterSection}
            </ControlPanelSection>

            {/* Section 5: AI settings (P1 placeholder) */}
            <ControlPanelSection
              title="AI 設定"
              icon={<SparklesIcon size={15} />}
              defaultOpen={false}
            >
              {AiSettingsSection}
            </ControlPanelSection>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
