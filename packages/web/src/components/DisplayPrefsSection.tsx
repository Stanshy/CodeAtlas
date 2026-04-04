/**
 * CodeAtlas — DisplayPrefsSection
 * Display preferences controls for the ControlPanel.
 * Sprint 9 — S9-4.
 */

import { memo, useCallback } from 'react';
import { useViewState } from '../contexts/ViewStateContext';
import { colors } from '../styles/theme';
import type { DisplayPrefs } from '../types/graph';

// ---------------------------------------------------------------------------
// ToggleSwitch sub-component
// ---------------------------------------------------------------------------

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  id?: string;
}

function ToggleSwitch({ checked, onChange, id }: ToggleSwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={onChange}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: 36,
        height: 20,
        borderRadius: 10,
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
        background: checked ? colors.primary.DEFAULT : 'rgba(255,255,255,0.1)',
        transition: 'background 150ms ease-out',
        boxShadow: checked ? `0 0 8px rgba(0,212,255,0.45)` : 'none',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: checked ? colors.bg.base : 'rgba(255,255,255,0.55)',
          transition: 'left 150ms ease-out, background 150ms ease-out',
          boxShadow: checked ? `0 0 4px rgba(0,212,255,0.7)` : 'none',
        }}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// ToggleRow sub-component
// ---------------------------------------------------------------------------

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: () => void;
}

function ToggleRow({ label, checked, onChange }: ToggleRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span style={{ fontSize: 12, color: colors.text.secondary }}>
        {label}
      </span>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SegmentedControl sub-component
// ---------------------------------------------------------------------------

interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div
      style={{
        display: 'flex',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 6,
        padding: 2,
        gap: 2,
      }}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            style={{
              flex: 1,
              padding: '4px 0',
              fontSize: 11,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? colors.text.primary : colors.text.muted,
              background: isActive ? colors.primary.ghost : 'none',
              border: isActive
                ? `1px solid ${colors.primary.DEFAULT}`
                : '1px solid transparent',
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'background 150ms ease-out, color 150ms ease-out, border-color 150ms ease-out',
              textAlign: 'center',
              lineHeight: 1,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DisplayPrefsSection
// ---------------------------------------------------------------------------

export const DisplayPrefsSection = memo(function DisplayPrefsSection() {
  const { state, dispatch } = useViewState();
  const { displayPrefs, isHeatmapEnabled } = state;

  const handleToggleHeatmap = useCallback(() => {
    dispatch({ type: 'TOGGLE_HEATMAP' });
  }, [dispatch]);

  const handleToggleEdgeLabels = useCallback(() => {
    dispatch({
      type: 'SET_DISPLAY_PREFS',
      prefs: { showEdgeLabels: !displayPrefs.showEdgeLabels },
    });
  }, [dispatch, displayPrefs.showEdgeLabels]);

  const handleToggleParticles = useCallback(() => {
    dispatch({
      type: 'SET_DISPLAY_PREFS',
      prefs: { showParticles: !displayPrefs.showParticles },
    });
  }, [dispatch, displayPrefs.showParticles]);

  const handleLabelDensity = useCallback(
    (density: DisplayPrefs['labelDensity']) => {
      dispatch({ type: 'SET_DISPLAY_PREFS', prefs: { labelDensity: density } });
    },
    [dispatch],
  );

  const handleImpactDepth = useCallback(
    (depth: number) => {
      dispatch({ type: 'SET_DISPLAY_PREFS', prefs: { impactDefaultDepth: depth } });
    },
    [dispatch],
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '4px 12px 8px',
      }}
    >
      {/* 1. Heatmap */}
      <ToggleRow
        label="Heatmap 熱力圖"
        checked={isHeatmapEnabled}
        onChange={handleToggleHeatmap}
      />

      {/* 2. Edge Labels */}
      <ToggleRow
        label="邊 Symbol 標籤"
        checked={displayPrefs.showEdgeLabels}
        onChange={handleToggleEdgeLabels}
      />

      {/* 3. Particles */}
      <ToggleRow
        label="粒子流動動畫"
        checked={displayPrefs.showParticles}
        onChange={handleToggleParticles}
      />

      {/* 4. Label Density — three-segment control */}
      <div>
        <div
          style={{
            fontSize: 12,
            color: colors.text.secondary,
            marginBottom: 6,
          }}
        >
          節點標籤密度
        </div>
        <SegmentedControl
          options={[
            { value: 'none' as const, label: '隱藏' },
            { value: 'smart' as const, label: '智慧' },
            { value: 'all' as const, label: '全部' },
          ]}
          value={displayPrefs.labelDensity}
          onChange={handleLabelDensity}
        />
      </div>

      {/* 5. Impact Depth */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
            color: colors.text.secondary,
            marginBottom: 4,
          }}
        >
          <span>影響分析深度</span>
          <span style={{ color: colors.text.primary }}>
            {displayPrefs.impactDefaultDepth}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={displayPrefs.impactDefaultDepth}
          onChange={(e) => handleImpactDepth(parseInt(e.target.value, 10))}
          style={{ width: '100%', accentColor: colors.primary.DEFAULT }}
        />
      </div>
    </div>
  );
});
