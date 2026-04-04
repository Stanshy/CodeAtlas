/**
 * CodeAtlas — ViewToggle Component
 *
 * Toolbar button that switches between 2D and 3D view modes.
 * Styled per canvas.toolbar.button spec from theme.
 *
 * Sprint 4 — T3: 3d-force-graph Integration
 */

import { useCallback } from 'react';
import { useViewState } from '../contexts/ViewStateContext';
import { canvas, colors } from '../styles/theme';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const containerStyles: React.CSSProperties = {
  position: 'fixed',
  top: 16,
  left: 16,
  zIndex: 20,
};

const buttonBaseStyles: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: canvas.toolbar.button.size,
  height: canvas.toolbar.button.size,
  background: canvas.toolbar.background,
  border: canvas.toolbar.border,
  borderRadius: canvas.toolbar.borderRadius,
  backdropFilter: canvas.toolbar.backdropFilter,
  cursor: 'pointer',
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.05em',
  color: canvas.toolbar.button.iconColor.normal,
  transition: 'color 150ms ease, background 150ms ease',
  outline: 'none',
  padding: '0 8px',
  minWidth: canvas.toolbar.button.size,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ViewToggle() {
  const { state, dispatch } = useViewState();
  const { mode } = state;

  const handleToggle = useCallback(() => {
    dispatch({ type: 'SET_MODE', mode: mode === '2d' ? '3d' : '2d' });
  }, [dispatch, mode]);

  const is3DActive = mode === '3d';

  const buttonStyles: React.CSSProperties = {
    ...buttonBaseStyles,
    color: is3DActive
      ? canvas.toolbar.button.iconColor.active
      : canvas.toolbar.button.iconColor.normal,
    background: is3DActive ? canvas.toolbar.button.background.active : canvas.toolbar.background,
    boxShadow: is3DActive
      ? `0 0 8px ${colors.primary.ghost}`
      : 'none',
  };

  return (
    <div style={containerStyles}>
      <button
        type="button"
        style={buttonStyles}
        onClick={handleToggle}
        aria-label={mode === '2d' ? 'Switch to 3D view' : 'Switch to 2D view'}
        title={mode === '2d' ? 'Switch to 3D view' : 'Switch to 2D view'}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color =
            canvas.toolbar.button.iconColor.hover;
          (e.currentTarget as HTMLButtonElement).style.background =
            canvas.toolbar.button.background.hover;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = is3DActive
            ? canvas.toolbar.button.iconColor.active
            : canvas.toolbar.button.iconColor.normal;
          (e.currentTarget as HTMLButtonElement).style.background = is3DActive
            ? canvas.toolbar.button.background.active
            : canvas.toolbar.background;
        }}
      >
        {mode === '2d' ? '3D' : '2D'}
      </button>
    </div>
  );
}
