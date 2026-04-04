/**
 * CodeAtlas — TracingPanel Component
 *
 * Right-side slide-in panel that displays the active path-tracing results.
 * Shown when tracingSymbol !== null; occupies the same fixed position as
 * NodePanel so the two are mutually exclusive via conditional rendering in
 * App.tsx.
 *
 * Sprint 5 — T8: 路徑追蹤面板
 * Design: .knowledge/sprint5-dataflow-architecture.md §3, §7, §10
 */

import { memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useViewState } from '../contexts/ViewStateContext';
import { colors, tracing as tracingTheme } from '../styles/theme';

// ---------------------------------------------------------------------------
// Animation variants — mirrors NodePanel slide-in/out behaviour
// ---------------------------------------------------------------------------

const panelVariants = {
  hidden: { x: '100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: 'tween', duration: 0.3, ease: 'easeOut' },
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: { type: 'tween', duration: 0.2, ease: 'easeIn' },
  },
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const panelStyles: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  right: 0,
  width: 400,
  height: '100vh',
  background: tracingTheme.panelBackground, // '#13131f'
  borderLeft: `1px solid rgba(255, 255, 255, 0.08)`,
  zIndex: 50,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const headerStyles: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
};

const titleStyles: React.CSSProperties = {
  color: tracingTheme.nodeHighlight, // '#00ffff'
  fontSize: 16,
  fontWeight: 600,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const subtitleStyles: React.CSSProperties = {
  color: colors.text.secondary,
  fontSize: 12,
  marginTop: 4,
};

const closeButtonStyles: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: colors.text.secondary,
  fontSize: 18,
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: 4,
  lineHeight: 1,
  flexShrink: 0,
};

const bodyStyles: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '12px 20px',
};

const sectionTitleStyles: React.CSSProperties = {
  color: colors.text.secondary,
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  marginBottom: 8,
  marginTop: 16,
};

const nodeRowStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 8px',
  borderRadius: 6,
  cursor: 'pointer',
  transition: 'background 150ms ease',
  marginBottom: 2,
};

const nodeIndexStyles: React.CSSProperties = {
  flexShrink: 0,
  width: 20,
  height: 20,
  borderRadius: '50%',
  background: tracingTheme.edgeHighlight, // '#00ff88'
  color: colors.text.onNeon, // '#0a0a0f'
  fontSize: 10,
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const nodePathStyles: React.CSSProperties = {
  color: colors.text.primary,
  fontSize: 13,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: 1,
};

const footerStyles: React.CSSProperties = {
  padding: '12px 20px',
  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
};

const stopButtonStyles: React.CSSProperties = {
  width: '100%',
  padding: '8px 16px',
  background: 'rgba(0, 255, 136, 0.08)',
  border: `1px solid ${tracingTheme.edgeHighlight}`,
  borderRadius: 6,
  color: tracingTheme.edgeHighlight,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: "'Inter', system-ui, sans-serif",
  transition: 'background 150ms ease',
};

// ---------------------------------------------------------------------------
// Sub-component — individual path node row
// ---------------------------------------------------------------------------

interface NodeRowProps {
  nodeId: string;
  index: number;
  onFocus: (nodeId: string) => void;
}

function PathNodeRow({ nodeId, index, onFocus }: NodeRowProps) {
  const handleClick = useCallback(() => {
    onFocus(nodeId);
  }, [nodeId, onFocus]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onFocus(nodeId);
      }
    },
    [nodeId, onFocus],
  );

  return (
    <div
      style={nodeRowStyles}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = 'rgba(0, 255, 136, 0.06)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = 'transparent';
      }}
      aria-label={`Focus node: ${nodeId}`}
    >
      <div style={nodeIndexStyles}>{index + 1}</div>
      <span style={nodePathStyles} title={nodeId}>
        {nodeId}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TracingPanel
// ---------------------------------------------------------------------------

export const TracingPanel = memo(function TracingPanel() {
  const { state, dispatch } = useViewState();
  const { tracingSymbol, tracingPath, tracingEdges } = state;

  const handleStopTracing = useCallback(() => {
    dispatch({ type: 'STOP_TRACING' });
  }, [dispatch]);

  const handleFocusNode = useCallback(
    (nodeId: string) => {
      dispatch({ type: 'FOCUS_NODE', nodeId });
    },
    [dispatch],
  );

  return (
    <AnimatePresence>
      {tracingSymbol !== null && (
        <motion.div
          key="tracing-panel"
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Framer Motion MotionStyle incompatible with exactOptionalPropertyTypes
          style={panelStyles as any}
          role="complementary"
          aria-label="Path tracing panel"
        >
          {/* Header */}
          <div style={headerStyles}>
            <div style={{ minWidth: 0 }}>
              <div style={titleStyles}>Tracing: {tracingSymbol}</div>
              <div style={subtitleStyles}>
                {tracingPath.length} node{tracingPath.length !== 1 ? 's' : ''},{' '}
                {tracingEdges.length} edge{tracingEdges.length !== 1 ? 's' : ''}
              </div>
            </div>
            <button
              type="button"
              style={closeButtonStyles}
              onClick={handleStopTracing}
              aria-label="Stop tracing"
              title="Stop tracing (Escape)"
            >
              &times;
            </button>
          </div>

          {/* Body — path node list */}
          <div style={bodyStyles}>
            {tracingPath.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 0',
                  color: colors.text.muted,
                  fontSize: 13,
                }}
              >
                No path found for symbol &ldquo;{tracingSymbol}&rdquo;
              </div>
            ) : (
              <>
                <div style={{ ...sectionTitleStyles, marginTop: 0 }}>
                  Path ({tracingPath.length} node{tracingPath.length !== 1 ? 's' : ''})
                </div>
                {tracingPath.map((nodeId, index) => (
                  <PathNodeRow
                    key={nodeId}
                    nodeId={nodeId}
                    index={index}
                    onFocus={handleFocusNode}
                  />
                ))}
              </>
            )}
          </div>

          {/* Footer — stop tracing button */}
          <div style={footerStyles}>
            <button
              type="button"
              style={stopButtonStyles}
              onClick={handleStopTracing}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(0, 255, 136, 0.14)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(0, 255, 136, 0.08)';
              }}
            >
              Stop Tracing
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
