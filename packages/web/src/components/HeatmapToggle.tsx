/**
 * CodeAtlas — HeatmapToggle Component
 *
 * Toolbar button that enables/disables the data-flow heatmap visualisation.
 * Placed in the bottom-right corner alongside CameraPresets (stacked above it).
 * Reads/writes isHeatmapEnabled via useHeatmap() → ViewStateContext.
 *
 * Sprint 5 — T8: 熱力圖開關（F40）
 * Design: .knowledge/sprint5-dataflow-architecture.md §5.3, §9
 */

import { useHeatmap } from '../hooks/useHeatmap';
import { canvas, colors } from '../styles/theme';

// ---------------------------------------------------------------------------
// Flame SVG icon (inline, no external dependency)
// ---------------------------------------------------------------------------

function FlameIcon({ active }: { active: boolean }) {
  const color = active ? colors.primary.DEFAULT : canvas.toolbar.button.iconColor.normal;
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={color}
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {/* Simple flame path */}
      <path d="M12 2C12 2 7 8 7 13a5 5 0 0 0 10 0c0-2.5-1.5-4.5-2.5-6C14 9 14 11 12 11c-1.5 0-2-1.5-2-2.5C10 6.5 12 2 12 2Z" />
    </svg>
  );
}

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HeatmapToggle() {
  const { isEnabled, toggle } = useHeatmap();

  const buttonStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '6px 10px',
    minWidth: 90,
    background: isEnabled
      ? canvas.toolbar.button.background.active
      : canvas.toolbar.background,
    border: isEnabled
      ? `1px solid ${colors.primary.DEFAULT}`
      : canvas.toolbar.border,
    borderRadius: canvas.toolbar.borderRadius,
    backdropFilter: canvas.toolbar.backdropFilter,
    cursor: 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: '11px',
    fontWeight: isEnabled ? 600 : 500,
    color: isEnabled
      ? canvas.toolbar.button.iconColor.active
      : canvas.toolbar.button.iconColor.normal,
    transition: 'color 150ms ease, background 150ms ease, border-color 150ms ease',
    outline: 'none',
    boxShadow: isEnabled ? `0 0 8px ${colors.primary.ghost}` : 'none',
  };

  return (
    <div style={containerStyles}>
      <button
        type="button"
        style={buttonStyles}
        onClick={toggle}
        aria-label={isEnabled ? 'Disable heatmap' : 'Toggle heatmap'}
        aria-pressed={isEnabled}
        title={isEnabled ? 'Disable heatmap' : 'Enable heatmap'}
        onMouseEnter={(e) => {
          if (!isEnabled) {
            (e.currentTarget as HTMLButtonElement).style.color =
              canvas.toolbar.button.iconColor.hover;
            (e.currentTarget as HTMLButtonElement).style.background =
              canvas.toolbar.button.background.hover;
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = isEnabled
            ? canvas.toolbar.button.iconColor.active
            : canvas.toolbar.button.iconColor.normal;
          (e.currentTarget as HTMLButtonElement).style.background = isEnabled
            ? canvas.toolbar.button.background.active
            : canvas.toolbar.background;
        }}
      >
        <FlameIcon active={isEnabled} />
        <span>Heatmap</span>
      </button>
    </div>
  );
}
