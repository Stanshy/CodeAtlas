/**
 * CodeAtlas — CameraPresets Component
 *
 * Fixed-position toolbar with preset camera angle buttons.
 * Only visible in 3D mode. Keyboard shortcuts 1/2/3.
 *
 * Sprint 4 — T8: 3D Node Layering + Camera Presets
 */

import { useCallback, useEffect } from 'react';
import { useViewState } from '../contexts/ViewStateContext';
import type { CameraPresetName } from '../contexts/ViewStateContext';
import { canvas, colors } from '../styles/theme';

// ---------------------------------------------------------------------------
// Preset definitions
// ---------------------------------------------------------------------------

interface PresetDef {
  key: CameraPresetName;
  label: string;
  shortcut: string;
}

const presets: PresetDef[] = [
  { key: 'default', label: 'Default', shortcut: '1' },
  { key: 'topDown', label: 'Top', shortcut: '2' },
  { key: 'sideView', label: 'Side', shortcut: '3' },
];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const containerStyles: React.CSSProperties = {
  position: 'fixed',
  bottom: 16,
  right: 16,
  zIndex: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const buttonBaseStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  minWidth: 90,
  padding: '6px 10px',
  background: canvas.toolbar.background,
  border: canvas.toolbar.border,
  borderRadius: canvas.toolbar.borderRadius,
  backdropFilter: canvas.toolbar.backdropFilter,
  cursor: 'pointer',
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: '11px',
  fontWeight: 500,
  color: canvas.toolbar.button.iconColor.normal,
  transition: 'color 150ms ease, background 150ms ease',
  outline: 'none',
};

const shortcutStyles: React.CSSProperties = {
  fontSize: '10px',
  color: colors.text.muted,
  padding: '1px 4px',
  border: `1px solid ${colors.text.disabled}`,
  borderRadius: 3,
  lineHeight: 1.2,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CameraPresets() {
  const { state, dispatch } = useViewState();
  const { mode } = state;

  const applyPreset = useCallback(
    (preset: CameraPresetName) => {
      dispatch({ type: 'SET_CAMERA_PRESET', preset });
    },
    [dispatch],
  );

  // Keyboard shortcuts 1/2/3 — only in 3D mode
  useEffect(() => {
    if (mode !== '3d') return;

    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger when typing in input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const index = ['1', '2', '3'].indexOf(e.key);
      if (index !== -1) {
        e.preventDefault();
        applyPreset(presets[index].key);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mode, applyPreset]);

  // Only render in 3D mode
  if (mode !== '3d') return null;

  return (
    <div style={containerStyles}>
      {presets.map((p) => (
        <button
          key={p.key}
          type="button"
          style={buttonBaseStyles}
          onClick={() => applyPreset(p.key)}
          aria-label={`Camera preset: ${p.label}`}
          title={`${p.label} view (${p.shortcut})`}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              canvas.toolbar.button.iconColor.hover;
            (e.currentTarget as HTMLButtonElement).style.background =
              canvas.toolbar.button.background.hover;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              canvas.toolbar.button.iconColor.normal;
            (e.currentTarget as HTMLButtonElement).style.background =
              canvas.toolbar.background;
          }}
        >
          <span>{p.label}</span>
          <span style={shortcutStyles}>{p.shortcut}</span>
        </button>
      ))}
    </div>
  );
}
