/**
 * CodeAtlas — DJPanel
 *
 * 300px right-side panel for Data Journey endpoint-level playback.
 * Shown when a journey is playing or done.
 *
 * Structure:
 *   Header: journey title (mono green) + subtitle
 *   Step list (scrollable): 3-state step items with expandable details
 *   Footer: replay + clear buttons
 *
 * Step states:
 *   unreached  → gray badge, empty circle ○
 *   active     → green badge, white text, green hollow circle + glow
 *   completed  → light-green badge, green solid circle ●
 *
 * Design rule: animation highlights steps (scroll-to-active), details
 * expand ONLY on manual click — never during auto-playback.
 *
 * Sprint 13 — T6
 */

import { memo, useRef, useEffect, useState, useCallback, type CSSProperties } from 'react';
import { THEME } from '../styles/theme';
import type { EndpointChain, DJChainStep } from '../types/graph';
import { deriveStepDetail } from '../utils/dj-descriptions';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DJPanelProps {
  endpointId: string;
  chain: EndpointChain;
  /** -1 = animation not started, 0+ = current active step index */
  currentStep: number;
  isPlaying: boolean;
  onReplay: () => void;
  onClear: () => void;
  onStepClick: (stepIndex: number) => void;
}

// ---------------------------------------------------------------------------
// Step detail expand area
// ---------------------------------------------------------------------------

interface StepDetailProps {
  step: DJChainStep;
}

const StepDetail = memo(function StepDetail({ step }: StepDetailProps) {
  const containerStyle: CSSProperties = {
    padding: '8px 10px 4px 10px',
    borderTop: `1px solid ${THEME.borderDefault}`,
    background: '#fafafa',
  };

  const rowStyle: CSSProperties = {
    display: 'flex',
    gap: 6,
    marginBottom: 5,
    fontSize: 11,
    fontFamily: THEME.fontUi,
    lineHeight: 1.5,
  };

  const iconStyle: CSSProperties = {
    flexShrink: 0,
    fontSize: 12,
    marginTop: 1,
  };

  const labelStyle: CSSProperties = {
    color: THEME.inkMuted,
    fontWeight: 600,
    flexShrink: 0,
    minWidth: 70,
  };

  const valueStyle: CSSProperties = {
    color: THEME.inkSecondary,
    fontFamily: THEME.fontMono,
    fontSize: 10,
    wordBreak: 'break-all',
  };

  const monoValueStyle: CSSProperties = {
    ...valueStyle,
    background: '#f0f0f0',
    borderRadius: 3,
    padding: '1px 4px',
  };

  // Heuristically fill missing INPUT/OUTPUT/TRANSFORM from step name + file
  const heuristic = deriveStepDetail(step.name, step.file ?? '');
  const resolvedInput = step.input || heuristic.input;
  const resolvedOutput = step.output || heuristic.output;
  const resolvedTransform = step.transform || heuristic.transform;
  const resolvedMethod = step.method && step.method !== step.name ? step.method : (step.name || undefined);
  const resolvedFile = step.file;

  const hasAny = resolvedInput || resolvedOutput || resolvedTransform || resolvedMethod || resolvedFile;
  if (!hasAny) {
    return (
      <div style={{ ...containerStyle, color: THEME.inkFaint, fontSize: 11, fontFamily: THEME.fontUi }}>
        詳細資訊未提供
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {resolvedInput && (
        <div style={rowStyle}>
          <span style={iconStyle}>📥</span>
          <span style={labelStyle}>輸入</span>
          <span style={valueStyle}>{resolvedInput}</span>
        </div>
      )}
      {resolvedOutput && (
        <div style={rowStyle}>
          <span style={iconStyle}>📤</span>
          <span style={labelStyle}>輸出</span>
          <span style={valueStyle}>{resolvedOutput}</span>
        </div>
      )}
      {resolvedTransform && (
        <div style={rowStyle}>
          <span style={iconStyle}>🔄</span>
          <span style={labelStyle}>轉換</span>
          <span style={valueStyle}>{resolvedTransform}</span>
        </div>
      )}
      {(resolvedMethod || resolvedFile) && (
        <div style={rowStyle}>
          <span style={iconStyle}>📍</span>
          <span style={labelStyle}>方法</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {resolvedMethod && <span style={monoValueStyle}>{resolvedMethod}</span>}
            {resolvedFile && <span style={{ ...valueStyle, color: THEME.inkMuted }}>{resolvedFile}</span>}
          </div>
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Step item
// ---------------------------------------------------------------------------

type StepState = 'unreached' | 'active' | 'completed';

interface StepItemProps {
  step: DJChainStep;
  stepIndex: number;
  state: StepState;
  isExpanded: boolean;
  onToggle: (index: number) => void;
}

const StepItem = memo(function StepItem({
  step,
  stepIndex,
  state,
  isExpanded,
  onToggle,
}: StepItemProps) {
  const isActive = state === 'active';
  const isCompleted = state === 'completed';
  const isUnreached = state === 'unreached';

  const itemStyle: CSSProperties = {
    marginBottom: 4,
    borderRadius: THEME.radiusSm,
    border: isActive
      ? `1px solid #a5d6a7`
      : `1px solid ${THEME.borderDefault}`,
    background: isActive
      ? THEME.djBg
      : isCompleted
        ? '#f9fbe7'
        : '#ffffff',
    transition: 'background 0.2s, border-color 0.2s',
    overflow: 'hidden',
    cursor: 'pointer',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 10px',
    userSelect: 'none',
  };

  // Badge (round number)
  const badgeBg = isActive ? THEME.djBorder : isCompleted ? '#c8e6c9' : THEME.borderDefault;
  const badgeColor = isActive ? '#ffffff' : isCompleted ? THEME.djBorder : THEME.inkMuted;
  const badgeBorderColor = isActive ? THEME.djBorder : isCompleted ? '#81c784' : THEME.borderDefault;

  const badgeStyle: CSSProperties = {
    width: 20,
    height: 20,
    borderRadius: '50%',
    fontSize: 10,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: badgeBg,
    border: `1.5px solid ${badgeBorderColor}`,
    color: badgeColor,
    fontFamily: THEME.fontUi,
    transition: 'all 0.2s',
    boxShadow: isActive ? `0 0 0 3px ${THEME.djGlow}` : 'none',
  };

  const nameStyle: CSSProperties = {
    flex: 1,
    fontFamily: THEME.fontMono,
    fontSize: 11,
    fontWeight: 600,
    color: isUnreached ? THEME.inkMuted : THEME.inkPrimary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    transition: 'color 0.2s',
  };

  const descStyle: CSSProperties = {
    fontSize: 10,
    color: THEME.inkMuted,
    fontFamily: THEME.fontUi,
    marginTop: 1,
    lineHeight: 1.4,
  };

  // Status icon on the right
  const statusIcon = isActive
    ? <span style={{ color: THEME.djBorder, fontSize: 12, filter: 'drop-shadow(0 0 3px rgba(46,125,50,0.5))' }}>◉</span>
    : isCompleted
      ? <span style={{ color: THEME.djBorder, fontSize: 12 }}>●</span>
      : <span style={{ color: THEME.inkFaint, fontSize: 12 }}>○</span>;

  const chevronStyle: CSSProperties = {
    fontSize: 10,
    color: THEME.inkMuted,
    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
    transition: 'transform 0.15s',
    flexShrink: 0,
  };

  return (
    <div style={itemStyle} onClick={() => onToggle(stepIndex)}>
      <div style={headerStyle}>
        <div style={badgeStyle}>{stepIndex + 1}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={nameStyle}>{step.name}</div>
          {step.desc && <div style={descStyle}>{step.desc}</div>}
        </div>
        {statusIcon}
        <span style={chevronStyle}>▶</span>
      </div>
      {isExpanded && <StepDetail step={step} />}
    </div>
  );
});

// ---------------------------------------------------------------------------
// DJPanel
// ---------------------------------------------------------------------------

export const DJPanel = memo(function DJPanel({
  chain,
  currentStep,
  isPlaying,
  onReplay,
  onClear,
  onStepClick,
}: DJPanelProps) {
  const totalSteps = chain.steps.length;
  const isComplete = !isPlaying && currentStep >= totalSteps - 1 && totalSteps > 0;

  // Track which step item is manually expanded (one at a time)
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // Auto-scroll the active step into view
  const stepRefs = useRef<Map<number, HTMLElement>>(new Map());

  useEffect(() => {
    if (currentStep < 0) return;
    const el = stepRefs.current.get(currentStep);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentStep]);

  // Manual step click: toggle expand + notify parent
  const handleToggle = useCallback((index: number) => {
    setExpandedStep((prev) => (prev === index ? null : index));
    onStepClick(index);
  }, [onStepClick]);

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  const panelStyle: CSSProperties = {
    width: 300,
    flexShrink: 0,
    background: '#ffffff',
    borderLeft: `1.5px solid ${THEME.borderDefault}`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100%',
  };

  const headerStyle: CSSProperties = {
    padding: '14px 16px',
    borderBottom: `1px solid ${THEME.borderDefault}`,
    background: THEME.bgGrid,
  };

  const journeyTitleStyle: CSSProperties = {
    fontFamily: THEME.fontMono,
    fontSize: 12,
    fontWeight: 700,
    color: THEME.djBorder,
    lineHeight: 1.35,
    marginBottom: 3,
  };

  const methodBadgeStyle: CSSProperties = {
    display: 'inline-block',
    fontSize: 9,
    fontWeight: 700,
    fontFamily: THEME.fontUi,
    color: chain.method === 'POST' ? '#e65100' : '#1565c0',
    background: chain.method === 'POST' ? '#fff3e0' : '#e3f2fd',
    border: `1px solid ${chain.method === 'POST' ? '#ffcc80' : '#90caf9'}`,
    borderRadius: 3,
    padding: '1px 5px',
    marginRight: 5,
    letterSpacing: '0.03em',
    verticalAlign: 'middle',
  };

  const subtitleStyle: CSSProperties = {
    fontSize: 11,
    color: THEME.inkMuted,
    fontFamily: THEME.fontUi,
    marginTop: 4,
  };

  const progressStyle: CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    color: THEME.djBorder,
    fontFamily: THEME.fontUi,
    marginTop: 2,
  };

  const stepListStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '10px 12px',
  };

  const footerStyle: CSSProperties = {
    padding: '10px 14px',
    borderTop: `1px solid ${THEME.borderDefault}`,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  };

  const replayBtnStyle: CSSProperties = {
    width: '100%',
    height: 34,
    background: isComplete ? THEME.djBorder : '#e0e0e0',
    color: isComplete ? '#ffffff' : THEME.inkMuted,
    border: 'none',
    borderRadius: THEME.radiusSm,
    fontFamily: THEME.fontUi,
    fontSize: 12,
    fontWeight: 600,
    cursor: isComplete ? 'pointer' : 'default',
    opacity: isComplete ? 1 : 0.5,
    transition: 'opacity 0.3s, background 0.15s, color 0.15s',
    pointerEvents: isComplete ? 'auto' : 'none',
  };

  const clearBtnStyle: CSSProperties = {
    width: '100%',
    height: 32,
    background: 'transparent',
    color: THEME.inkSecondary,
    border: `1px solid ${THEME.borderDefault}`,
    borderRadius: THEME.radiusSm,
    fontFamily: THEME.fontUi,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'border-color 0.15s, color 0.15s',
  };

  const revealedCount = currentStep < 0 ? 0 : currentStep + 1;

  // Determine step state
  const getStepState = (index: number): StepState => {
    if (currentStep < 0) return 'unreached';
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'active';
    return 'unreached';
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={journeyTitleStyle}>
          <span style={methodBadgeStyle}>{chain.method}</span>
          {chain.path}
        </div>
        {chain.desc && (
          <div style={subtitleStyle}>{chain.desc} · {totalSteps} 個步驟</div>
        )}
        {currentStep >= 0 && (
          <div style={progressStyle}>
            {revealedCount} / {totalSteps} 步驟完成
            {isComplete && ' ✓'}
          </div>
        )}
      </div>

      {/* Step list */}
      <div style={stepListStyle}>
        {totalSteps === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 12px',
              fontSize: 12,
              color: THEME.inkMuted,
              fontFamily: THEME.fontUi,
            }}
          >
            此端點無步驟資料
          </div>
        ) : (
          chain.steps.map((step, index) => {
            const stepState = getStepState(index);
            return (
              <div
                key={`step-${index}`}
                ref={(el) => {
                  if (el) stepRefs.current.set(index, el);
                }}
              >
                <StepItem
                  step={step}
                  stepIndex={index}
                  state={stepState}
                  isExpanded={expandedStep === index}
                  onToggle={handleToggle}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div style={footerStyle}>
        <button
          type="button"
          style={replayBtnStyle}
          onClick={isComplete ? onReplay : undefined}
          aria-label="重播此旅程"
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
          重播此旅程
        </button>
        <button
          type="button"
          style={clearBtnStyle}
          onClick={onClear}
          aria-label="清除選取"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.djBorder;
            (e.currentTarget as HTMLButtonElement).style.color = THEME.djBorder;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.borderDefault;
            (e.currentTarget as HTMLButtonElement).style.color = THEME.inkSecondary;
          }}
        >
          清除選取
        </button>
      </div>
    </div>
  );
});
