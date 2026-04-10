/**
 * CodeAtlas — DisplayPrefsSection
 * Display preferences controls for the SettingsPopover.
 * Sprint 9 — S9-4.
 */

import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        label={t('display.heatmap')}
        checked={isHeatmapEnabled}
        onChange={handleToggleHeatmap}
      />

      {/* 2. Edge Labels */}
      <ToggleRow
        label={t('display.edgeSymbolLabels')}
        checked={displayPrefs.showEdgeLabels}
        onChange={handleToggleEdgeLabels}
      />

      {/* 3. Particles */}
      <ToggleRow
        label={t('display.particleAnimation')}
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
          {t('display.labelDensity')}
        </div>
        <SegmentedControl
          options={[
            { value: 'none' as const, label: t('display.hidden') },
            { value: 'smart' as const, label: t('display.smart') },
            { value: 'all' as const, label: t('display.all') },
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
          <span>{t('display.impactDepth')}</span>
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
