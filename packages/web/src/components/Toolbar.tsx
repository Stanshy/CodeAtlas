/**
 * CodeAtlas — Toolbar
 * Fixed top toolbar with three-section layout.
 * Sprint 9 — S9-5.
 */

import { useState } from 'react';
import { useViewState } from '../contexts/ViewStateContext';
import { PERSPECTIVE_PRESETS } from '../adapters/perspective-presets';
import { colors } from '../styles/theme';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ToolbarProps {
  onSearchClick: () => void;
}

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2 13V8M6 13V4M10 13V6M14 13V2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

export function Toolbar({ onSearchClick }: ToolbarProps) {
  const { state, dispatch } = useViewState();
  const { isControlPanelOpen, activePerspective, mode } = state;

  const [searchHovered, setSearchHovered] = useState(false);
  const [overviewHovered, setOverviewHovered] = useState(false);

  const perspectivePreset = PERSPECTIVE_PRESETS[activePerspective];
  const perspectiveLabel = perspectivePreset?.label ?? activePerspective;

  // system-framework does not support 3D — disable the 3D toggle button
  const is3DDisabled = activePerspective === 'system-framework';

  // Perspective accent color and badge info
  const PERSPECTIVE_META: Record<string, { color: string; accentRgb: string; badge: string }> = {
    'system-framework': { color: '#00d4ff', accentRgb: '0, 212, 255', badge: '2D 專用' },
    'logic-operation': { color: '#ff00ff', accentRgb: '255, 0, 255', badge: '2D + 3D' },
    'data-journey': { color: '#00ff88', accentRgb: '0, 255, 136', badge: '2D + 3D' },
  };
  const perspectiveMeta = PERSPECTIVE_META[activePerspective] ?? {
    color: colors.primary.DEFAULT,
    accentRgb: '0, 212, 255',
    badge: '',
  };

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  const toolbarStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    zIndex: 40,
    background: 'rgba(26, 26, 46, 0.90)',
    backdropFilter: 'blur(8px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    fontFamily: "'Inter', system-ui, sans-serif",
  };

  const leftSectionStyle: React.CSSProperties = {
    width: 48,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const centerSectionStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    padding: '0 8px',
  };

  const rightSectionStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    paddingRight: 12,
    flexShrink: 0,
  };

  const hamburgerButtonStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    background: 'none',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: isControlPanelOpen ? colors.primary.DEFAULT : colors.text.secondary,
    transition: 'color 0.15s ease-out, background 0.15s ease-out',
  };

  const searchTriggerStyle: React.CSSProperties = {
    flex: 1,
    maxWidth: 520,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    background: searchHovered
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    cursor: 'pointer',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    transition: 'background 0.15s ease-out',
    userSelect: 'none',
  };

  const searchPlaceholderStyle: React.CSSProperties = {
    color: colors.text.muted,
    fontSize: 13,
    flex: 1,
  };

  const searchShortcutStyle: React.CSSProperties = {
    fontSize: 11,
    color: colors.text.disabled,
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.10)',
    borderRadius: 4,
    padding: '1px 5px',
    fontFamily: "'JetBrains Mono', monospace",
    flexShrink: 0,
  };

  const perspectivePillStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    height: 24,
    padding: '0 10px',
    borderRadius: 12,
    border: `1px solid ${perspectiveMeta.color}40`,
    background: `rgba(${perspectiveMeta.accentRgb}, 0.06)`,
    color: perspectiveMeta.color,
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };

  const perspectiveBadgeStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: 4,
    background: `rgba(${perspectiveMeta.accentRgb}, 0.08)`,
    border: `1px solid rgba(${perspectiveMeta.accentRgb}, 0.25)`,
    color: perspectiveMeta.color,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  };

  const mode2dStyle: React.CSSProperties = {
    padding: '3px 8px',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: '4px 0 0 4px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    cursor: 'pointer',
    background: mode === '2d' ? colors.primary.DEFAULT : 'rgba(255,255,255,0.04)',
    color: mode === '2d' ? colors.text.onNeon : colors.text.secondary,
    transition: 'background 0.15s ease-out, color 0.15s ease-out',
  };

  const mode3dStyle: React.CSSProperties = {
    padding: '3px 8px',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: '0 4px 4px 0',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderLeft: 'none',
    cursor: is3DDisabled ? 'not-allowed' : 'pointer',
    background: mode === '3d' ? colors.primary.DEFAULT : 'rgba(255,255,255,0.04)',
    color: mode === '3d' ? colors.text.onNeon : colors.text.secondary,
    opacity: is3DDisabled ? 0.35 : 1,
    transition: 'background 0.15s ease-out, color 0.15s ease-out, opacity 0.15s ease-out',
  };

  const overviewButtonStyle: React.CSSProperties = {
    width: 30,
    height: 30,
    background: overviewHovered ? 'rgba(255,255,255,0.08)' : 'none',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: overviewHovered ? colors.text.primary : colors.text.secondary,
    transition: 'color 0.15s ease-out, background 0.15s ease-out',
    flexShrink: 0,
  };

  return (
    <div style={toolbarStyle} role="banner" aria-label="CodeAtlas 主工具列">
      {/* Left section — hamburger toggle */}
      <div style={leftSectionStyle}>
        <button
          type="button"
          style={hamburgerButtonStyle}
          onClick={() => dispatch({ type: 'TOGGLE_CONTROL_PANEL' })}
          title={isControlPanelOpen ? '關閉控制面板' : '開啟控制面板'}
          aria-label={isControlPanelOpen ? '關閉控制面板' : '開啟控制面板'}
          aria-expanded={isControlPanelOpen}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              'rgba(255,255,255,0.06)';
            if (!isControlPanelOpen) {
              (e.currentTarget as HTMLButtonElement).style.color = colors.text.primary;
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'none';
            if (!isControlPanelOpen) {
              (e.currentTarget as HTMLButtonElement).style.color = colors.text.secondary;
            }
          }}
        >
          {isControlPanelOpen ? <CloseIcon /> : <HamburgerIcon />}
        </button>
      </div>

      {/* Center section — search trigger */}
      <div style={centerSectionStyle}>
        <div
          role="button"
          tabIndex={0}
          style={searchTriggerStyle}
          onClick={onSearchClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSearchClick();
            }
          }}
          onMouseEnter={() => setSearchHovered(true)}
          onMouseLeave={() => setSearchHovered(false)}
          aria-label="搜尋節點 (Ctrl+K)"
        >
          <span style={{ color: colors.text.muted, display: 'flex', alignItems: 'center' }}>
            <SearchIcon />
          </span>
          <span style={searchPlaceholderStyle}>搜尋...</span>
          <kbd style={searchShortcutStyle}>Ctrl+K</kbd>
        </div>
      </div>

      {/* Right section — perspective pill + badge, 2D/3D toggle, overview */}
      <div style={rightSectionStyle}>
        {/* Perspective pill */}
        <span style={perspectivePillStyle} title={`目前視角: ${perspectiveLabel}`}>
          {/* Inner dot */}
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: perspectiveMeta.color,
              boxShadow: `0 0 4px ${perspectiveMeta.color}`,
              flexShrink: 0,
            }}
          />
          {perspectiveLabel}
        </span>
        {/* 2D/3D badge — tightly placed after pill */}
        <span style={perspectiveBadgeStyle}>
          {perspectiveMeta.badge}
        </span>

        {/* 2D / 3D toggle — uses SET_3D_MODE for system-framework guard */}
        <div style={{ display: 'flex', flexShrink: 0 }} role="group" aria-label="渲染模式">
          <button
            type="button"
            style={mode2dStyle}
            onClick={() => dispatch({ type: 'SET_3D_MODE', mode: '2d' })}
            aria-label="2D 模式"
            aria-pressed={mode === '2d'}
          >
            2D
          </button>
          <button
            type="button"
            style={mode3dStyle}
            onClick={() => dispatch({ type: 'SET_3D_MODE', mode: '3d' })}
            aria-label="3D 模式"
            aria-pressed={mode === '3d'}
            disabled={is3DDisabled}
            title={is3DDisabled ? '系統架構視角僅支援 2D 模式' : undefined}
          >
            3D
          </button>
        </div>

        {/* Overview button */}
        <button
          type="button"
          style={overviewButtonStyle}
          title="AI 專案概述"
          aria-label="AI 專案概述"
          onMouseEnter={() => setOverviewHovered(true)}
          onMouseLeave={() => setOverviewHovered(false)}
        >
          <BarChartIcon />
        </button>
      </div>
    </div>
  );
}
