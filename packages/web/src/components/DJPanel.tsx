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
 * Sprint 13-15
 * Sprint 19 — T15: "查看知識文件" button for Wiki bidirectional jump.
 */

import { memo, useRef, useEffect, useState, useCallback, type CSSProperties } from 'react';
import { THEME } from '../styles/theme';
import type { EndpointChain, DJChainStep } from '../types/graph';
import { deriveStepDetail } from '../utils/dj-descriptions';
import { useAIAnalysis } from '../hooks/useAIAnalysis';
import { AIResultBlock } from './AIResultBlock';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DJPanelProps {
  endpointId: string | null;
  chain: EndpointChain | null;
  /** -1 = animation not started, 0+ = current active step index */
  currentStep: number;
  isPlaying: boolean;
  /** Step index selected from canvas click (-1 = none) */
  selectedStep?: number;
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
      {/* INPUT block */}
      {resolvedInput && (
        <div style={{ marginBottom: 6 }}>
          <div style={{
            fontSize: 9,
            fontWeight: 700,
            fontFamily: THEME.fontUi,
            color: '#1565c0',
            background: '#e3f2fd',
            padding: '3px 8px',
            borderRadius: '4px 4px 0 0',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            輸入
          </div>
          <div style={{
            fontFamily: THEME.fontMono,
            fontSize: 10,
            color: THEME.inkSecondary,
            background: '#f8f9fa',
            padding: '5px 8px',
            borderRadius: '0 0 4px 4px',
            border: '1px solid #e3f2fd',
            borderTop: 'none',
            wordBreak: 'break-all',
          }}>
            {resolvedInput}
          </div>
        </div>
      )}

      {/* OUTPUT block */}
      {resolvedOutput && (
        <div style={{ marginBottom: 6 }}>
          <div style={{
            fontSize: 9,
            fontWeight: 700,
            fontFamily: THEME.fontUi,
            color: '#2e7d32',
            background: '#e8f5e9',
            padding: '3px 8px',
            borderRadius: '4px 4px 0 0',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            輸出
          </div>
          <div style={{
            fontFamily: THEME.fontMono,
            fontSize: 10,
            color: THEME.inkSecondary,
            background: '#f8f9fa',
            padding: '5px 8px',
            borderRadius: '0 0 4px 4px',
            border: '1px solid #e8f5e9',
            borderTop: 'none',
            wordBreak: 'break-all',
          }}>
            {resolvedOutput}
          </div>
        </div>
      )}

      {/* TRANSFORM block */}
      {resolvedTransform && (
        <div style={{ marginBottom: 6 }}>
          <div style={{
            fontSize: 9,
            fontWeight: 700,
            fontFamily: THEME.fontUi,
            color: '#e65100',
            background: '#fff3e0',
            padding: '3px 8px',
            borderRadius: '4px 4px 0 0',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            轉換
          </div>
          <div style={{
            fontFamily: THEME.fontMono,
            fontSize: 10,
            color: THEME.inkSecondary,
            background: '#f8f9fa',
            padding: '5px 8px',
            borderRadius: '0 0 4px 4px',
            border: '1px solid #fff3e0',
            borderTop: 'none',
            wordBreak: 'break-all',
          }}>
            {resolvedTransform}
          </div>
        </div>
      )}

      {/* METHOD block — always shown */}
      {(resolvedMethod || resolvedFile) && (
        <div style={{ marginBottom: 2 }}>
          <div style={{
            fontSize: 9,
            fontWeight: 700,
            fontFamily: THEME.fontUi,
            color: '#546e7a',
            background: '#eceff1',
            padding: '3px 8px',
            borderRadius: '4px 4px 0 0',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            方法
          </div>
          <div style={{
            fontFamily: THEME.fontMono,
            fontSize: 10,
            color: THEME.inkSecondary,
            background: '#f8f9fa',
            padding: '5px 8px',
            borderRadius: '0 0 4px 4px',
            border: '1px solid #eceff1',
            borderTop: 'none',
          }}>
            {resolvedMethod && <div>{resolvedMethod}()</div>}
            {resolvedFile && <div style={{ color: THEME.inkMuted, fontSize: 9, marginTop: 2 }}>@ {resolvedFile}</div>}
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

// ---------------------------------------------------------------------------
// AI Result section — shown in detail panel header when endpoint was analyzed
// ---------------------------------------------------------------------------

function DJAIResultSection({ endpointId }: { endpointId: string | null }) {
  const { status, job, error, analyze } = useAIAnalysis('endpoint', endpointId ?? '');
  const [showTooltip, setShowTooltip] = useState(false);

  if (!endpointId) return null;

  const isDisabled = error === 'AI_DISABLED';

  const sectionStyle: CSSProperties = {
    padding: '10px 14px',
    borderBottom: `1px solid ${THEME.borderDefault}`,
  };

  const btnBase: CSSProperties = {
    width: '100%',
    fontSize: 11,
    fontWeight: 500,
    padding: '6px 10px',
    borderRadius: 6,
    border: `1px solid ${THEME.djBorder}`,
    background: 'transparent',
    color: THEME.djBorder,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    boxSizing: 'border-box',
    textAlign: 'center',
    lineHeight: '16px',
    display: 'block',
  };

  // Succeeded → show result block
  if (status === 'succeeded' && job) {
    const aiResult = (job.result ?? {}) as Record<string, unknown>;
    const description = typeof aiResult.description === 'string' ? aiResult.description
      : typeof aiResult.summary === 'string' ? aiResult.summary : undefined;
    const provider = typeof aiResult.provider === 'string' ? aiResult.provider : undefined;

    if (!description) return null;

    return (
      <div style={sectionStyle}>
        <AIResultBlock
          variant="full"
          result={{ summary: description }}
          {...(provider !== undefined ? { provider } : {})}
          {...(job.completedAt !== undefined ? { analyzedAt: job.completedAt } : {})}
          onReanalyze={() => analyze(true)}
        />
      </div>
    );
  }

  // Analyzing → spinner
  if (status === 'analyzing') {
    return (
      <div style={sectionStyle}>
        <div style={{ ...btnBase, border: '1px solid #d0d0d8', color: '#8888aa', opacity: 0.6, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} aria-busy="true">
          <span style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid currentColor', borderTopColor: 'transparent', animation: 'ca-spin 0.8s linear infinite', display: 'inline-block' }} aria-hidden="true" />
          分析中...
        </div>
      </div>
    );
  }

  // AI disabled → disabled button + tooltip
  if (isDisabled) {
    return (
      <div style={{ ...sectionStyle, position: 'relative' }}>
        {showTooltip && (
          <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 5, background: '#333', color: '#fff', fontSize: 10, padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }} role="tooltip">
            請先在設定中啟用 AI Provider
          </div>
        )}
        <button
          style={{ ...btnBase, border: '1px solid #d0d0d8', color: '#8888aa', opacity: 0.55, cursor: 'not-allowed' }}
          disabled
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          type="button"
        >
          ✨ 解釋資料流
        </button>
      </div>
    );
  }

  // Failed → retry button
  if (status === 'failed') {
    return (
      <div style={sectionStyle}>
        <button
          style={{ ...btnBase, border: '1px solid #ef9a9a', background: '#fff5f5', color: '#c62828' }}
          onClick={() => analyze(true)}
          type="button"
        >
          ⚠️ 分析失敗，點擊重試
        </button>
      </div>
    );
  }

  // Idle → analyze button
  return (
    <div style={sectionStyle}>
      <button style={btnBase} onClick={() => analyze()} type="button">
        ✨ 解釋資料流
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DJPanel
// ---------------------------------------------------------------------------

export const DJPanel = memo(function DJPanel({
  endpointId,
  chain,
  currentStep,
  isPlaying,
  selectedStep: externalSelectedStep,
  onReplay,
  onClear,
  onStepClick,
}: DJPanelProps) {
  // Empty state — no journey selected yet
  if (!chain) {
    return (
      <div style={{ width: 300, height: '100%', background: '#ffffff', borderLeft: `1px solid ${THEME.borderDefault}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: THEME.fontUi }}>
        <span style={{ fontSize: 24 }}>🗺️</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: THEME.inkSecondary }}>選擇端點查看資料旅程</span>
        <span style={{ fontSize: 11, color: THEME.inkMuted }}>點擊左側端點卡片開始</span>
      </div>
    );
  }

  const totalSteps = chain.steps.length;
  const isComplete = !isPlaying && currentStep >= totalSteps - 1 && totalSteps > 0;

  // Track which step item is manually expanded (one at a time)
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // Guard: skip external sync when the click originated from the panel itself
  const panelInitiated = useRef(false);

  // Sync from canvas node click → expand the clicked step
  useEffect(() => {
    if (panelInitiated.current) {
      panelInitiated.current = false;
      return;
    }
    if (externalSelectedStep !== undefined && externalSelectedStep >= 0) {
      setExpandedStep(externalSelectedStep);
    } else if (externalSelectedStep === -1) {
      setExpandedStep(null);
    }
  }, [externalSelectedStep]);

  // Auto-scroll the active step into view
  const stepRefs = useRef<Map<number, HTMLElement>>(new Map());

  useEffect(() => {
    if (currentStep < 0) return;
    const el = stepRefs.current.get(currentStep);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentStep]);

  // Manual step click: toggle expand + notify parent (canvas sync)
  const handleToggle = useCallback((index: number) => {
    panelInitiated.current = true;
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

      {/* AI analysis result — from shared hook, shown when endpoint was analyzed */}
      <DJAIResultSection endpointId={endpointId} />

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
