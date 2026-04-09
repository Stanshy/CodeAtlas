/**
 * CodeAtlas — Toolbar
 * Fixed top toolbar with three-section layout.
 * Sprint 9 — S9-5.
 */

import { useState } from 'react';
import { useViewState } from '../contexts/ViewStateContext';
import { useAppState } from '../contexts/AppStateContext';
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

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M9 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M14.7 7.2l-.8-.5a5.7 5.7 0 00-.5-.9l.2-.9a.5.5 0 00-.2-.5l-1-.6a.5.5 0 00-.5 0l-.8.5a5.5 5.5 0 00-1 0l-.8-.5a.5.5 0 00-.5 0l-1 .6a.5.5 0 00-.2.5l.2.9a5.7 5.7 0 00-.5.9l-.8.5a.5.5 0 00-.3.4v1.2a.5.5 0 00.3.4l.8.5c.1.3.3.6.5.9l-.2.9a.5.5 0 00.2.5l1 .6a.5.5 0 00.5 0l.8-.5a5.5 5.5 0 001 0l.8.5a.5.5 0 00.5 0l1-.6a.5.5 0 00.2-.5l-.2-.9c.2-.3.4-.6.5-.9l.8-.5a.5.5 0 00.3-.4V7.6a.5.5 0 00-.3-.4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
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
  const { isSettingsPanelOpen, activePerspective } = state;
  const { returnToWelcome } = useAppState();

  const [searchHovered, setSearchHovered] = useState(false);
  const [overviewHovered, setOverviewHovered] = useState(false);
  const [switchHovered, setSwitchHovered] = useState(false);

  const perspectivePreset = PERSPECTIVE_PRESETS[activePerspective];
  const perspectiveLabel = perspectivePreset?.label ?? activePerspective;

  // Perspective accent color
  const PERSPECTIVE_META: Record<string, { color: string; accentRgb: string }> = {
    'system-framework': { color: '#00d4ff', accentRgb: '0, 212, 255' },
    'logic-operation':  { color: '#ff00ff', accentRgb: '255, 0, 255' },
    'data-journey':     { color: '#00ff88', accentRgb: '0, 255, 136' },
  };
  const perspectiveMeta = PERSPECTIVE_META[activePerspective] ?? {
    color: colors.primary.DEFAULT,
    accentRgb: '0, 212, 255',
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
    color: isSettingsPanelOpen ? colors.primary.DEFAULT : colors.text.secondary,
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

  // Screenshot 09: btn padding 6px 12px, border-radius 6px, font 12px 500
  const switchProjectButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 12px',
    borderRadius: 6,
    border: 'none',
    background: switchHovered ? 'rgba(255,255,255,0.08)' : 'transparent',
    color: switchHovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: 500,
    fontFamily: "'Inter', system-ui, sans-serif",
    cursor: 'pointer',
    transition: 'color 0.15s ease-out, background 0.15s ease-out',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };

  return (
    <div style={toolbarStyle} role="banner" aria-label="CodeAtlas 主工具列">
      {/* Left section — hamburger toggle */}
      <div style={leftSectionStyle}>
        <button
          type="button"
          style={hamburgerButtonStyle}
          data-settings-trigger
          onClick={() => dispatch({ type: 'TOGGLE_SETTINGS_PANEL' })}
          title={isSettingsPanelOpen ? '關閉設定' : '開啟設定'}
          aria-label={isSettingsPanelOpen ? '關閉設定' : '開啟設定'}
          aria-expanded={isSettingsPanelOpen}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              'rgba(255,255,255,0.06)';
            if (!isSettingsPanelOpen) {
              (e.currentTarget as HTMLButtonElement).style.color = colors.text.primary;
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'none';
            if (!isSettingsPanelOpen) {
              (e.currentTarget as HTMLButtonElement).style.color = colors.text.secondary;
            }
          }}
        >
          <GearIcon />
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

      {/* Right section — perspective pill + overview + switch project */}
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

        {/* Switch project button — Sprint 20 T12 */}
        <button
          type="button"
          style={switchProjectButtonStyle}
          title="切換專案"
          aria-label="切換專案"
          onClick={returnToWelcome}
          onMouseEnter={() => setSwitchHovered(true)}
          onMouseLeave={() => setSwitchHovered(false)}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>📁</span>
          切換專案
        </button>
      </div>
    </div>
  );
}
