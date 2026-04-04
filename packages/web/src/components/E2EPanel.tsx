/**
 * CodeAtlas — E2EPanel
 * End-to-end data flow tracing result panel.
 * Sprint 9 — S9-3.
 */

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useViewState } from '../contexts/ViewStateContext';
import { colors, tracing as tracingTheme } from '../styles/theme';
import { useStaggerAnimation } from '../hooks/useStaggerAnimation';
import type { E2EStep } from '../types/graph';

// ---------------------------------------------------------------------------
// Inline SVG Icons (lucide-react not available — inline fallback)
// ---------------------------------------------------------------------------

function RotateCcwIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function PlayIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function PauseIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface E2EPanelProps {
  onFocusNode: (nodeId: string) => void;
  onUpdateDepth: (maxDepth: number) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Animation variants — floating panel fade/scale in from right
// ---------------------------------------------------------------------------

const panelVariants = {
  hidden: { opacity: 0, scale: 0.95, x: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: { type: 'tween', duration: 0.25, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    x: 20,
    transition: { type: 'tween', duration: 0.18, ease: 'easeIn' },
  },
};

// ---------------------------------------------------------------------------
// Edge type badge colours
// ---------------------------------------------------------------------------

const EDGE_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  import: {
    bg: 'rgba(0, 204, 102, 0.15)',
    text: colors.neon.green.DEFAULT,
    label: 'import',
  },
  call: {
    bg: 'rgba(255, 170, 0, 0.15)',
    text: colors.neon.amber.bright,
    label: 'call',
  },
  export: {
    bg: 'rgba(0, 153, 204, 0.15)',
    text: colors.neon.cyan.dim,
    label: 'export',
  },
  'data-flow': {
    bg: 'rgba(136, 85, 255, 0.15)',
    text: colors.neon.magenta.purple,
    label: 'data-flow',
  },
};

function getEdgeTypeBadge(edgeType: string | null) {
  if (!edgeType) return null;
  return EDGE_TYPE_COLORS[edgeType] ?? {
    bg: 'rgba(255,255,255,0.08)',
    text: colors.text.secondary,
    label: edgeType,
  };
}

// ---------------------------------------------------------------------------
// Styles — C7: Floating compact panel, vertically centred on right edge
// ---------------------------------------------------------------------------

// Data-journey: floating small panel (230px wide, vertically centred)
const dataJourneyPanelStyles: React.CSSProperties = {
  position: 'absolute',
  right: 24,
  top: '50%',
  transform: 'translateY(-50%)',
  width: 230,
  background: 'rgba(13,13,26,0.95)',
  border: '1px solid rgba(0,255,136,0.25)',
  borderRadius: 10,
  padding: '14px 16px',
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  fontSize: 11,
  zIndex: 30,
  backdropFilter: 'blur(8px)',
  boxShadow: '0 0 24px rgba(0,255,136,0.12), 0 4px 32px rgba(0,0,0,0.6)',
};

// Non-data-journey: full-height sidebar (unchanged original behaviour)
const sidebarPanelStyles: React.CSSProperties = {
  position: 'fixed',
  top: 48,
  right: 0,
  width: 340,
  height: 'calc(100vh - 48px)',
  background: colors.bg.elevated,
  borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
  zIndex: 30,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  fontFamily: "'Inter', system-ui, sans-serif",
};

const headerStyles: React.CSSProperties = {
  padding: '14px 16px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
  flexShrink: 0,
};

// C8: data-journey title style
const dataJourneyTitleStyles: React.CSSProperties = {
  color: '#00ff88',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.5px',
  marginBottom: 8,
};

const titleStyles: React.CSSProperties = {
  color: colors.neon.cyan.bright,
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: '0.01em',
};

const closeButtonStyles: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: colors.text.secondary,
  fontSize: 18,
  cursor: 'pointer',
  padding: '2px 8px',
  borderRadius: 4,
  lineHeight: 1,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const summaryStyles: React.CSSProperties = {
  padding: '10px 16px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  flexShrink: 0,
};

const summaryRowStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 4,
  fontSize: 12,
  color: colors.text.secondary,
};

const summaryLabelStyles: React.CSSProperties = {
  color: colors.text.muted,
  flexShrink: 0,
};

const summaryValueStyles: React.CSSProperties = {
  color: colors.text.primary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const warningStyles: React.CSSProperties = {
  color: colors.neon.amber.bright,
  fontSize: 12,
  marginTop: 4,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

const depthSectionStyles: React.CSSProperties = {
  padding: '10px 16px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  flexShrink: 0,
};

const depthLabelRowStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 6,
  fontSize: 12,
};

const sliderStyles: React.CSSProperties = {
  width: '100%',
  accentColor: colors.neon.cyan.DEFAULT,
  cursor: 'pointer',
};

const stepListStyles: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '8px 0',
};

const emptyStyles: React.CSSProperties = {
  textAlign: 'center',
  padding: '40px 20px',
  color: colors.text.muted,
  fontSize: 13,
};

// ---------------------------------------------------------------------------
// StepRow sub-component
// ---------------------------------------------------------------------------

interface StepRowProps {
  step: E2EStep;
  stepNumber: number;
  isLast: boolean;
  onFocusNode: (nodeId: string) => void;
}

const StepRow = memo(function StepRow({ step, stepNumber, isLast, onFocusNode }: StepRowProps) {
  const [hovered, setHovered] = useState(false);

  const handleClick = useCallback(() => {
    onFocusNode(step.nodeId);
  }, [step.nodeId, onFocusNode]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onFocusNode(step.nodeId);
      }
    },
    [step.nodeId, onFocusNode],
  );

  // Left border colour intensity based on depth
  const depthIntensity = Math.min(0.9, 0.2 + step.depth * 0.07);
  const borderColor = `rgba(0, 212, 255, ${depthIntensity})`;

  // Symbols display: max 3 + "+N more"
  const MAX_SYMBOLS = 3;
  const visibleSymbols = step.symbols.slice(0, MAX_SYMBOLS);
  const extraCount = step.symbols.length - MAX_SYMBOLS;

  const badge = step.edgeType ? getEdgeTypeBadge(step.edgeType) : null;

  const nodeRowStyle: React.CSSProperties = {
    padding: '6px 16px 6px 12px',
    borderLeft: `3px solid ${borderColor}`,
    marginLeft: 0,
    cursor: 'pointer',
    background: hovered ? 'rgba(0, 212, 255, 0.05)' : 'transparent',
    transition: 'background 120ms ease',
  };

  const edgeRowStyle: React.CSSProperties = {
    padding: '3px 16px 3px 28px',
    display: !isLast ? 'flex' : 'none',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: colors.text.muted,
  };

  return (
    <>
      {/* Node row */}
      <div
        style={nodeRowStyle}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={`Focus node: ${step.nodeLabel}`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Step number circle */}
          <span
            style={{
              flexShrink: 0,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: tracingTheme.panelBackground,
              border: `1.5px solid ${borderColor}`,
              color: colors.neon.cyan.DEFAULT,
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {stepNumber}
          </span>
          {/* Node label */}
          <span
            style={{
              color: colors.text.primary,
              fontSize: 13,
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
            title={step.nodeId}
          >
            {step.nodeLabel}
          </span>
          {/* "起點" badge for step 0 */}
          {step.depth === 0 && (
            <span
              style={{
                fontSize: 10,
                color: colors.neon.cyan.dim,
                background: 'rgba(0, 212, 255, 0.10)',
                padding: '1px 5px',
                borderRadius: 3,
                flexShrink: 0,
              }}
            >
              起點
            </span>
          )}
        </div>
      </div>

      {/* Edge connector row (shown between steps, not after last) */}
      {!isLast && (
        <div style={edgeRowStyle}>
          <span style={{ color: colors.text.muted }}>↓</span>
          {/* Edge type badge */}
          {badge && (
            <span
              style={{
                background: badge.bg,
                color: badge.text,
                fontSize: 10,
                padding: '1px 5px',
                borderRadius: 3,
                fontWeight: 500,
              }}
            >
              {badge.label}
            </span>
          )}
          {/* Symbols */}
          {visibleSymbols.length > 0 && (
            <span
              style={{
                color: colors.text.secondary,
                fontSize: 11,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={step.symbols.join(', ')}
            >
              [{visibleSymbols.join(', ')}
              {extraCount > 0 ? ` +${extraCount} more` : ''}]
            </span>
          )}
        </div>
      )}
    </>
  );
});

// ---------------------------------------------------------------------------
// E2EPanel
// ---------------------------------------------------------------------------

export const E2EPanel = memo(function E2EPanel({
  onFocusNode,
  onUpdateDepth,
  onClose,
}: E2EPanelProps) {
  const { state } = useViewState();
  const { e2eTracing, activePerspective } = state;

  const handleDepthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdateDepth(Number(e.target.value));
    },
    [onUpdateDepth],
  );

  const isActive = e2eTracing !== null && e2eTracing.active;
  const isDataJourney = activePerspective === 'data-journey';

  // Start node label: first step if available
  const startNodeLabel =
    e2eTracing?.steps?.[0]?.nodeLabel ?? e2eTracing?.startNodeId ?? '—';
  const stepCount = e2eTracing?.steps?.length ?? 0;
  const maxDepth = e2eTracing?.maxDepth ?? 10;
  const truncated = e2eTracing?.truncated ?? false;

  // Sprint 11 T7: Stagger animation for data-journey perspective
  const path = e2eTracing?.path ?? [];
  const pathEdges = e2eTracing?.edges ?? [];
  const {
    currentStep: staggerStep,
    isPlaying: staggerPlaying,
    play: staggerPlay,
    pause: staggerPause,
    replay: staggerReplay,
  } = useStaggerAnimation(path, pathEdges, 350);

  // Auto-scroll current step into view
  const stepRefs = useRef<Map<number, HTMLElement>>(new Map());
  useEffect(() => {
    if (!isDataJourney || staggerStep < 0) return;
    const el = stepRefs.current.get(staggerStep);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [staggerStep, isDataJourney]);

  return (
    <>
    <AnimatePresence>
      {isActive && (
        <motion.div
          key="e2e-panel"
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Framer Motion MotionStyle incompatible with exactOptionalPropertyTypes
          style={(isDataJourney ? dataJourneyPanelStyles : sidebarPanelStyles) as any}
          role="complementary"
          aria-label="端到端追蹤面板"
        >
          {/* Header */}
          <div style={isDataJourney ? { marginBottom: 8 } : headerStyles}>
            <span style={isDataJourney ? dataJourneyTitleStyles : titleStyles}>
              {isDataJourney ? '資料旅程' : '端到端追蹤'}
            </span>
            {!isDataJourney && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Stagger playback controls (data-journey only — moved outside panel) */}
                <button
                  type="button"
                  style={closeButtonStyles}
                  onClick={onClose}
                  aria-label="結束追蹤"
                  title="結束追蹤"
                >
                  <span style={{ fontSize: 11, fontWeight: 500 }}>結束</span>
                  <span>&times;</span>
                </button>
              </div>
            )}
            {isDataJourney && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Play/Pause button */}
                {path.length > 0 && (
                  <button
                    type="button"
                    onClick={staggerPlaying ? staggerPause : staggerPlay}
                    disabled={path.length === 0}
                    aria-label={staggerPlaying ? '暫停' : '播放'}
                    title={staggerPlaying ? '暫停' : '播放'}
                    style={{
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0, 255, 136, 0.08)',
                      border: '1px solid rgba(0, 255, 136, 0.25)',
                      borderRadius: 6,
                      cursor: 'pointer',
                      color: '#00ff88',
                      transition: 'background 150ms ease',
                      opacity: path.length === 0 ? 0.4 : 1,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 255, 136, 0.16)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 255, 136, 0.08)';
                    }}
                  >
                    {staggerPlaying
                      ? <PauseIcon size={14} />
                      : <PlayIcon size={14} />
                    }
                  </button>
                )}
                <button
                  type="button"
                  style={closeButtonStyles}
                  onClick={onClose}
                  aria-label="結束追蹤"
                  title="結束追蹤"
                >
                  <span>&times;</span>
                </button>
              </div>
            )}
          </div>

          {/* Summary */}
          <div style={summaryStyles}>
            <div style={summaryRowStyles}>
              <span style={summaryLabelStyles}>起點:</span>
              <span style={summaryValueStyles} title={e2eTracing?.startNodeId ?? ''}>
                {startNodeLabel}
              </span>
            </div>
            <div style={summaryRowStyles}>
              <span style={summaryLabelStyles}>步數:</span>
              <span style={summaryValueStyles}>{stepCount}</span>
            </div>
            {truncated && (
              <div style={warningStyles}>
                <span>&#9888;</span>
                <span>路徑截斷（超過 30 個節點）</span>
              </div>
            )}
          </div>

          {/* Depth slider */}
          <div style={depthSectionStyles}>
            <div style={depthLabelRowStyles}>
              <span style={{ color: colors.text.secondary }}>追蹤深度</span>
              <span style={{ color: colors.neon.cyan.DEFAULT, fontWeight: 600 }}>
                {maxDepth}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              value={maxDepth}
              onChange={handleDepthChange}
              style={sliderStyles}
              aria-label="追蹤深度"
              aria-valuemin={1}
              aria-valuemax={20}
              aria-valuenow={maxDepth}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10,
                color: colors.text.muted,
                marginTop: 2,
              }}
            >
              <span>1</span>
              <span>20</span>
            </div>
          </div>

          {/* Step list */}
          <div style={stepListStyles}>
            {!e2eTracing || stepCount === 0 ? (
              <div style={emptyStyles}>
                <div style={{ marginBottom: 8, fontSize: 24 }}>—</div>
                {isDataJourney
                  ? <div>請先選取起點與終點節點</div>
                  : <div>尚無追蹤結果</div>
                }
                {!isDataJourney && (
                  <div style={{ marginTop: 6, fontSize: 11 }}>
                    請從圖譜節點右鍵選擇「端到端追蹤」
                  </div>
                )}
              </div>
            ) : (
              e2eTracing.steps.map((step, index) => {
                // Data-journey stagger highlight
                const isCurrentStep = isDataJourney && index === staggerStep;
                const isPastStep = isDataJourney && index < staggerStep;
                const rowBg = isCurrentStep
                  ? 'rgba(0, 255, 136, 0.1)'
                  : isPastStep
                    ? 'rgba(0, 255, 136, 0.03)'
                    : 'transparent';
                const rowBorderColor = isCurrentStep
                  ? '#00ff88'
                  : isPastStep
                    ? 'rgba(0, 255, 136, 0.2)'
                    : 'transparent';
                const rowTextColor = isCurrentStep
                  ? '#00ff88'
                  : isPastStep
                    ? colors.text.secondary
                    : colors.text.muted;

                return (
                  <div
                    key={`${step.nodeId}-${index}`}
                    ref={(el) => {
                      if (el && isDataJourney) stepRefs.current.set(index, el);
                    }}
                    style={
                      isDataJourney
                        ? {
                            borderLeft: `2px solid ${rowBorderColor}`,
                            background: rowBg,
                            color: rowTextColor,
                            transition: 'background 150ms ease, border-color 150ms ease, color 150ms ease',
                            boxShadow: isCurrentStep
                              ? '0 0 8px rgba(0, 255, 136, 0.15)'
                              : undefined,
                          }
                        : undefined
                    }
                  >
                    <StepRow
                      step={step}
                      stepNumber={index + 1}
                      isLast={index === e2eTracing.steps.length - 1}
                      onFocusNode={onFocusNode}
                    />
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    {/* Replay button — floating bottom-center, data-journey + active only */}
    {isActive && isDataJourney && path.length > 0 && (
      <button
        type="button"
        onClick={staggerReplay}
        aria-label="重播動畫"
        title="重播動畫"
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 20px',
          background: 'rgba(0,255,136,0.08)',
          border: '1px solid rgba(0,255,136,0.35)',
          borderRadius: 20,
          color: '#00ff88',
          fontSize: 12,
          fontWeight: 500,
          zIndex: 30,
          cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace",
          transition: 'background 150ms ease, border-color 150ms ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,136,0.16)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,255,136,0.6)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,136,0.08)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,255,136,0.35)';
        }}
      >
        ↺ 重播動畫
      </button>
    )}
    </>
  );
});
