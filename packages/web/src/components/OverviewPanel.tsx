/**
 * CodeAtlas — OverviewPanel Component
 *
 * AI-generated project architecture overview.
 * Triggered from Toolbar button, displays as modal overlay.
 * Sprint 8 — S8-5.
 */

import { memo, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAiOverview } from '../api/ai';
import { colors } from '../styles/theme';
import type { AiOverviewResponse } from '../types/graph';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OverviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type OverviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: AiOverviewResponse }
  | { status: 'error'; message: string };

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const overlayStyles: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  zIndex: 50,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const modalStyles: React.CSSProperties = {
  width: 560,
  maxWidth: 'calc(100vw - 32px)',
  maxHeight: 'calc(100vh - 64px)',
  background: colors.bg.overlay,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 12,
  padding: 24,
  overflowY: 'auto',
  backdropFilter: 'blur(12px)',
};

const headerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20,
};

const titleStyles: React.CSSProperties = {
  color: colors.text.primary,
  fontSize: 16,
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const closeButtonStyles: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: colors.text.secondary,
  fontSize: 20,
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: 4,
  lineHeight: 1,
};

const sectionTitleStyles: React.CSSProperties = {
  color: colors.text.secondary,
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 8,
  marginTop: 16,
};

const overviewTextStyles: React.CSSProperties = {
  color: colors.text.primary,
  fontSize: 14,
  lineHeight: 1.65,
  whiteSpace: 'pre-wrap',
};

const statsRowStyles: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  marginTop: 16,
};

const statCardStyles: React.CSSProperties = {
  flex: 1,
  background: colors.bg.elevated,
  border: '1px solid rgba(255, 255, 255, 0.06)',
  borderRadius: 8,
  padding: '10px 14px',
  textAlign: 'center',
};

const statValueStyles: React.CSSProperties = {
  color: colors.primary.DEFAULT,
  fontSize: 22,
  fontWeight: 700,
  lineHeight: 1.2,
  fontVariantNumeric: 'tabular-nums',
};

const statLabelStyles: React.CSSProperties = {
  color: colors.text.muted,
  fontSize: 11,
  marginTop: 2,
};

const moduleItemStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6px 10px',
  borderRadius: 6,
  background: colors.bg.elevated,
  border: '1px solid rgba(255, 255, 255, 0.04)',
  marginBottom: 4,
};

const modulePathStyles: React.CSSProperties = {
  color: colors.text.primary,
  fontSize: 12,
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: 1,
  marginRight: 8,
};

const moduleDepCountStyles: React.CSSProperties = {
  color: colors.text.muted,
  fontSize: 11,
  flexShrink: 0,
};

const badgeStyles: React.CSSProperties = {
  fontSize: 10,
  padding: '1px 6px',
  borderRadius: 3,
  fontWeight: 500,
};

const footerStyles: React.CSSProperties = {
  marginTop: 16,
  paddingTop: 12,
  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap' as const,
};

const errorTextStyles: React.CSSProperties = {
  color: '#ff4466',
  fontSize: 13,
  lineHeight: 1.5,
};

const notConfiguredStyles: React.CSSProperties = {
  color: colors.text.muted,
  fontSize: 13,
  lineHeight: 1.6,
};

const retryButtonStyles: React.CSSProperties = {
  background: 'transparent',
  border: `1px solid ${colors.text.disabled}`,
  color: colors.text.secondary,
  fontSize: 12,
  padding: '4px 12px',
  borderRadius: 4,
  cursor: 'pointer',
  marginTop: 10,
  display: 'inline-block',
};

// ---------------------------------------------------------------------------
// Framer Motion variants
// ---------------------------------------------------------------------------

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'tween', duration: 0.2, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 12,
    transition: { type: 'tween', duration: 0.15, ease: 'easeIn' },
  },
};

// ---------------------------------------------------------------------------
// Spinner subcomponent
// ---------------------------------------------------------------------------

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0' }}>
      <div
        className="codeatlas-spinner"
        style={{ width: 18, height: 18, borderWidth: 2 }}
        aria-hidden="true"
      />
      <span style={{ color: colors.text.muted, fontSize: 13 }}>
        Generating project overview...
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OverviewPanel
// ---------------------------------------------------------------------------

export const OverviewPanel = memo(function OverviewPanel({
  isOpen,
  onClose,
}: OverviewPanelProps) {
  const [state, setState] = useState<OverviewState>({ status: 'idle' });

  // Fetch when panel opens (if not already loaded/loading)
  useEffect(() => {
    if (!isOpen) return;
    if (state.status !== 'idle') return;

    let cancelled = false;

    setState({ status: 'loading' });

    void fetchAiOverview().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setState({ status: 'success', data: result.data });
      } else {
        setState({ status: 'error', message: result.error.message });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, state.status]);

  // Keyboard: Escape to close
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleRetry = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="overview-overlay"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Framer Motion MotionStyle incompatible with exactOptionalPropertyTypes
          style={overlayStyles as any}
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleBackdropClick}
          aria-modal="true"
          role="dialog"
          aria-label="Project Overview"
        >
          <motion.div
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Framer Motion MotionStyle incompatible with exactOptionalPropertyTypes
            style={modalStyles as any}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={headerStyles}>
              <div style={titleStyles}>
                <span aria-hidden="true">&#9728;</span>
                Project Overview
              </div>
              <button
                style={closeButtonStyles}
                onClick={onClose}
                type="button"
                aria-label="Close overview panel"
              >
                &times;
              </button>
            </div>

            {/* Loading */}
            {state.status === 'loading' && <LoadingSpinner />}

            {/* Not configured */}
            {state.status === 'error' &&
              state.message.toLowerCase().includes('not configured') && (
                <div style={notConfiguredStyles}>
                  AI features need to be enabled to use this function. Start the server with an AI
                  provider configured (
                  <code style={{ color: colors.primary.DEFAULT }}>--ai-key</code> or Ollama).
                </div>
              )}

            {/* Error (general) */}
            {state.status === 'error' &&
              !state.message.toLowerCase().includes('not configured') && (
                <div>
                  <div style={errorTextStyles}>{state.message}</div>
                  <button style={retryButtonStyles} onClick={handleRetry} type="button">
                    Retry
                  </button>
                </div>
              )}

            {/* Success */}
            {state.status === 'success' && (
              <>
                {/* Overview text */}
                <div style={sectionTitleStyles}>Architecture Overview</div>
                <p style={overviewTextStyles}>{state.data.overview}</p>

                {/* Stats */}
                <div style={sectionTitleStyles}>Structure</div>
                <div style={statsRowStyles}>
                  <div style={statCardStyles}>
                    <div style={statValueStyles}>
                      {state.data.structureInfo.totalFiles.toLocaleString()}
                    </div>
                    <div style={statLabelStyles}>Files</div>
                  </div>
                  <div style={statCardStyles}>
                    <div style={statValueStyles}>
                      {state.data.structureInfo.totalFunctions.toLocaleString()}
                    </div>
                    <div style={statLabelStyles}>Functions</div>
                  </div>
                </div>

                {/* Top modules */}
                {state.data.structureInfo.topModules.length > 0 && (
                  <>
                    <div style={sectionTitleStyles}>Top Modules</div>
                    {state.data.structureInfo.topModules.slice(0, 5).map((mod) => (
                      <div key={mod.path} style={moduleItemStyles}>
                        <span style={modulePathStyles} title={mod.path}>
                          {mod.path}
                        </span>
                        <span style={moduleDepCountStyles}>
                          {mod.dependencyCount} dep{mod.dependencyCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </>
                )}

                {/* Footer badges */}
                <div style={footerStyles}>
                  {state.data.provider && (
                    <span
                      style={{
                        ...badgeStyles,
                        background: colors.primary.ghost,
                        color: colors.primary.DEFAULT,
                      }}
                    >
                      {state.data.provider}
                    </span>
                  )}
                  {state.data.cached && (
                    <span
                      style={{
                        ...badgeStyles,
                        background: 'rgba(0, 204, 102, 0.12)',
                        color: '#00cc66',
                      }}
                    >
                      cached
                    </span>
                  )}
                  <span
                    style={{
                      ...badgeStyles,
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: colors.text.disabled,
                    }}
                  >
                    AI generated
                  </span>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
