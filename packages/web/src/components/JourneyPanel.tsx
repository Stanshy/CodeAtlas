/**
 * CodeAtlas — JourneyPanel
 *
 * Right-side panel (280px) for Data Journey perspective.
 * Displays ordered step list with stagger-reveal states (inactive/active/done)
 * and a replay button that appears after playback completes.
 *
 * Sprint 12 — T7
 */

import { memo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { THEME } from '../styles/theme';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface JourneyStep {
  id: string;
  name: string;
  description: string;
}

interface JourneyPanelProps {
  steps: JourneyStep[];
  /** How many steps have been revealed (0 = none started, steps.length = all done) */
  revealedSteps: number;
  isPlaying: boolean;
  onReplay: () => void;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const panelStyle: React.CSSProperties = {
  width: 280,
  flexShrink: 0,
  background: '#ffffff',
  borderLeft: `1.5px solid ${THEME.borderDefault}`,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  height: '100%',
};

const headerStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: `1px solid ${THEME.borderDefault}`,
  background: THEME.bgGrid,
};

const headerTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: THEME.inkPrimary,
  fontFamily: THEME.fontUi,
  margin: 0,
};

const headerSubStyle: React.CSSProperties = {
  fontSize: 11,
  color: THEME.inkMuted,
  marginTop: 2,
  fontFamily: THEME.fontUi,
};

const stepsListStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: 12,
};

const footerStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderTop: `1px solid ${THEME.borderDefault}`,
};

// ---------------------------------------------------------------------------
// Step Item helper
// ---------------------------------------------------------------------------

interface StepItemProps {
  step: JourneyStep;
  index: number;
  state: 'inactive' | 'active' | 'done';
}

const StepItem = memo(function StepItem({ step, index, state }: StepItemProps) {
  const isActive = state === 'active';
  const isDone = state === 'done';

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    gap: 10,
    padding: '8px 10px',
    borderRadius: THEME.radiusSm,
    marginBottom: 4,
    opacity: isDone ? 0.7 : isActive ? 1 : 0.35,
    transition: 'opacity 0.3s, background 0.3s, border-color 0.3s',
    border: isActive ? '1px solid #a5d6a7' : '1px solid transparent',
    background: isActive ? THEME.djBg : 'transparent',
  };

  const numStyle: React.CSSProperties = {
    width: 20,
    height: 20,
    borderRadius: '50%',
    fontSize: 10,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background 0.3s, border-color 0.3s, color 0.3s',
    // Active: dj-border bg + white text
    // Done: #a5d6a7 bg + dj-border text + #81c784 border
    // Default: borderDefault bg + inkMuted text
    background: isActive ? THEME.djBorder : isDone ? '#a5d6a7' : THEME.borderDefault,
    border: `1.5px solid ${isActive ? THEME.djBorder : isDone ? '#81c784' : THEME.borderDefault}`,
    color: isActive ? '#ffffff' : isDone ? THEME.djBorder : THEME.inkMuted,
  };

  const bodyStyle: React.CSSProperties = { flex: 1 };

  const nameStyle: React.CSSProperties = {
    fontFamily: THEME.fontMono,
    fontSize: 11,
    fontWeight: 600,
    color: THEME.inkPrimary,
  };

  const descStyle: React.CSSProperties = {
    fontSize: 10,
    color: THEME.inkMuted,
    marginTop: 2,
    lineHeight: 1.4,
  };

  return (
    <div style={itemStyle}>
      <div style={numStyle}>{index + 1}</div>
      <div style={bodyStyle}>
        <div style={nameStyle}>{step.name}</div>
        <div style={descStyle}>{step.description}</div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// JourneyPanel
// ---------------------------------------------------------------------------

export const JourneyPanel = memo(function JourneyPanel({
  steps,
  revealedSteps,
  isPlaying,
  onReplay,
}: JourneyPanelProps) {
  const { t } = useTranslation();
  // Playback is complete when all steps have been revealed and we're not playing
  const isComplete = !isPlaying && revealedSteps >= steps.length && steps.length > 0;

  // Auto-scroll the active step into view
  const stepRefs = useRef<Map<number, HTMLElement>>(new Map());
  const activeIndex = revealedSteps - 1;

  useEffect(() => {
    if (activeIndex < 0) return;
    const el = stepRefs.current.get(activeIndex);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeIndex]);

  const hasSteps = steps.length > 0;
  const headerSubText = hasSteps
    ? t('dj.stepsProgress', { current: revealedSteps, total: steps.length })
    : t('dj.selectEntryHint');

  const replayBtnStyle: React.CSSProperties = {
    width: '100%',
    height: 36,
    background: THEME.djBorder,
    color: '#ffffff',
    border: 'none',
    borderRadius: THEME.radiusSm,
    fontFamily: THEME.fontUi,
    fontSize: 13,
    fontWeight: 600,
    cursor: isComplete ? 'pointer' : 'default',
    opacity: isComplete ? 1 : 0,
    transition: 'opacity 0.3s, background 0.15s',
    pointerEvents: isComplete ? 'auto' : 'none',
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h3 style={headerTitleStyle}>{t('dj.journeySteps')}</h3>
        <p style={headerSubStyle}>{headerSubText}</p>
      </div>

      {/* Steps list */}
      <div style={stepsListStyle}>
        {steps.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 12px',
              fontSize: 12,
              color: THEME.inkMuted,
              fontFamily: THEME.fontUi,
            }}
          >
            {t('dj.clickEntryHint')}
          </div>
        ) : (
          steps.map((step, index) => {
            const stepState: 'inactive' | 'active' | 'done' =
              index < revealedSteps - 1
                ? 'done'
                : index === revealedSteps - 1
                  ? 'active'
                  : 'inactive';

            return (
              <div
                key={step.id}
                ref={(el) => {
                  if (el) stepRefs.current.set(index, el);
                }}
              >
                <StepItem step={step} index={index} state={stepState} />
              </div>
            );
          })
        )}
      </div>

      {/* Footer — replay button */}
      <div style={footerStyle}>
        <button
          type="button"
          style={replayBtnStyle}
          onClick={isComplete ? onReplay : undefined}
          aria-label={t('dj.replayJourney')}
          onMouseEnter={(e) => {
            if (isComplete) {
              (e.currentTarget as HTMLButtonElement).style.background = '#1b5e20';
            }
          }}
          onMouseLeave={(e) => {
            if (isComplete) {
              (e.currentTarget as HTMLButtonElement).style.background = THEME.djBorder;
            }
          }}
        >
          {t('dj.replayJourney')}
        </button>
      </div>
    </div>
  );
});
