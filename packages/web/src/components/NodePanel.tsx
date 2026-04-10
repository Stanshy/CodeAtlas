/**
 * CodeAtlas — NodePanel Component
 *
 * Right-side slide-out panel showing node detail:
 * file path, metadata, imports, exports, source code, AI summary.
 * Uses Framer Motion for slide animation.
 */

import { memo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNodeDetail } from '../hooks/useNodeDetail';
import { useViewState } from '../contexts/ViewStateContext';
import { colors } from '../styles/theme';
import type { GraphEdge, GraphNode } from '../types/graph';
import { FunctionPanel } from './FunctionPanel';
import { ImpactPanel } from './ImpactPanel';

interface NodePanelProps {
  nodeId: string | null;
  onClose: () => void;
  onNavigate?: (nodeId: string) => void;
  /** Slot for CodePreview (T5) */
  renderCodePreview?: (sourceCode: string | null, language: string) => React.ReactNode;
  /** Slot for AiSummary (T6) */
  renderAiSummary?: (nodeId: string) => React.ReactNode;
  /** All graph nodes — passed to FunctionPanel for call chain lookup (Sprint 7) */
  allNodes?: GraphNode[];
  /** All graph edges — passed to FunctionPanel for call chain lookup (Sprint 7) */
  allEdges?: GraphEdge[];
  /** Sprint 8: Impact analysis depth change handler */
  onImpactDepthChange?: (depth: number) => void;
}

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

const panelStyles: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  right: 0,
  width: 400,
  height: '100vh',
  background: colors.bg.overlay,
  borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
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
  padding: '16px 20px',
};

const sectionTitleStyles: React.CSSProperties = {
  color: colors.text.secondary,
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  marginBottom: 8,
  marginTop: 20,
};

const metaRowStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '4px 0',
  fontSize: 13,
  color: colors.text.primary,
};

const metaLabelStyles: React.CSSProperties = {
  color: colors.text.muted,
};

const linkStyles: React.CSSProperties = {
  color: colors.primary.DEFAULT,
  cursor: 'pointer',
  fontSize: 13,
  textDecoration: 'none',
  display: 'block',
  padding: '2px 0',
};

function categorizeEdges(edges: GraphEdge[], nodeId: string) {
  const imports: string[] = [];
  const importedBy: string[] = [];

  for (const edge of edges) {
    if (edge.source === nodeId) {
      imports.push(edge.target);
    }
    if (edge.target === nodeId) {
      importedBy.push(edge.source);
    }
  }

  return { imports, importedBy };
}

function formatFileSize(bytes: number | undefined): string {
  if (bytes === undefined) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const NodePanel = memo(function NodePanel({
  nodeId,
  onClose,
  onNavigate,
  renderCodePreview,
  renderAiSummary,
  allNodes = [],
  allEdges = [],
  onImpactDepthChange,
}: NodePanelProps) {
  const { detail, isLoading, error } = useNodeDetail(nodeId);
  const panelRef = useRef<HTMLDivElement>(null);
  const { state, dispatch } = useViewState();
  const { impactAnalysis } = state;

  const handleImpactClose = useCallback(() => {
    dispatch({ type: 'CLEAR_IMPACT' });
  }, [dispatch]);

  const handleImpactNodeClick = useCallback((id: string) => {
    onNavigate?.(id);
  }, [onNavigate]);

  // Close on click outside
  useEffect(() => {
    if (!nodeId) return;

    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    }

    // Delay listener to avoid immediate close from the click that opened the panel
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [nodeId, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!nodeId) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [nodeId, onClose]);

  return (
    <AnimatePresence>
      {nodeId && (
        <motion.div
          ref={panelRef}
          key="node-panel"
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Framer Motion MotionStyle incompatible with exactOptionalPropertyTypes
          style={panelStyles as any}
        >
          {/* Header */}
          <div style={headerStyles}>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: colors.text.primary,
                  fontSize: 16,
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {detail?.node.label ?? nodeId}
              </div>
              {detail && (
                <div
                  style={{
                    color: colors.text.muted,
                    fontSize: 12,
                    marginTop: 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {detail.node.filePath}
                </div>
              )}
            </div>
            <button
              style={closeButtonStyles}
              onClick={onClose}
              type="button"
              aria-label="Close panel"
            >
              &times;
            </button>
          </div>

          {/* Body */}
          <div style={bodyStyles}>
            {/* Sprint 8: ImpactPanel replaces body when active */}
            {impactAnalysis?.active ? (
              <ImpactPanel
                direction={impactAnalysis.direction!}
                targetNodeId={impactAnalysis.targetNodeId!}
                targetNodeLabel={allNodes.find((n) => n.id === impactAnalysis.targetNodeId)?.label ?? impactAnalysis.targetNodeId!}
                impactedNodes={impactAnalysis.impactedNodes.map((id) => {
                  const n = allNodes.find((node) => node.id === id);
                  return { id, label: n?.label ?? id, filePath: n?.filePath ?? id };
                })}
                depthMap={impactAnalysis.depthMap}
                maxDepth={impactAnalysis.maxDepth}
                truncated={impactAnalysis.impactedNodes.length > 51}
                onDepthChange={onImpactDepthChange ?? (() => {})}
                onNodeClick={handleImpactNodeClick}
                onClose={handleImpactClose}
              />
            ) : (
            <>
            {isLoading && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div className="codeatlas-spinner" />
                <p style={{ color: colors.text.secondary, fontSize: 13, marginTop: 12 }}>
                  Loading node detail...
                </p>
              </div>
            )}

            {error && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <p style={{ color: '#ff4466', fontSize: 13 }}>{error}</p>
              </div>
            )}

            {detail && !isLoading && !error && (
              <>
                {/* Sprint 7: Function/Class node — render FunctionPanel */}
                {(detail.node.type === 'function' || detail.node.type === 'class') && (
                  <FunctionPanel
                    node={detail.node}
                    allNodes={allNodes}
                    allEdges={allEdges}
                    onNavigate={onNavigate}
                  />
                )}

                {/* Metadata — shown for all node types */}
                <div style={{ ...sectionTitleStyles, marginTop: (detail.node.type === 'function' || detail.node.type === 'class') ? 20 : 0 }}>Metadata</div>
                <div style={metaRowStyles}>
                  <span style={metaLabelStyles}>Type</span>
                  <span>{detail.node.type}</span>
                </div>
                {detail.node.metadata.language && (
                  <div style={metaRowStyles}>
                    <span style={metaLabelStyles}>Language</span>
                    <span>{detail.node.metadata.language}</span>
                  </div>
                )}
                <div style={metaRowStyles}>
                  <span style={metaLabelStyles}>File Size</span>
                  <span>{formatFileSize(detail.node.metadata.fileSize)}</span>
                </div>
                <div style={metaRowStyles}>
                  <span style={metaLabelStyles}>Imports</span>
                  <span>{detail.node.metadata.importCount ?? 0}</span>
                </div>
                <div style={metaRowStyles}>
                  <span style={metaLabelStyles}>Exports</span>
                  <span>{detail.node.metadata.exportCount ?? 0}</span>
                </div>
                <div style={metaRowStyles}>
                  <span style={metaLabelStyles}>Depended by</span>
                  <span>{detail.node.metadata.dependencyCount ?? 0}</span>
                </div>

                {/* Import/Export Lists */}
                {(() => {
                  const { imports, importedBy } = categorizeEdges(detail.edges, detail.node.id);
                  return (
                    <>
                      {imports.length > 0 && (
                        <>
                          <div style={sectionTitleStyles}>Imports ({imports.length})</div>
                          {imports.map((id) => (
                            <div
                              key={id}
                              style={linkStyles}
                              onClick={() => onNavigate?.(id)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => e.key === 'Enter' && onNavigate?.(id)}
                            >
                              {id}
                            </div>
                          ))}
                        </>
                      )}
                      {importedBy.length > 0 && (
                        <>
                          <div style={sectionTitleStyles}>Imported By ({importedBy.length})</div>
                          {importedBy.map((id) => (
                            <div
                              key={id}
                              style={linkStyles}
                              onClick={() => onNavigate?.(id)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => e.key === 'Enter' && onNavigate?.(id)}
                            >
                              {id}
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  );
                })()}

                {/* Source Code Preview Slot (T5) */}
                {renderCodePreview && (
                  <>
                    <div style={sectionTitleStyles}>Source Code</div>
                    {renderCodePreview(detail.sourceCode, detail.node.metadata.language ?? 'javascript')}
                  </>
                )}

                {/* AI Summary Slot (T6) */}
                {renderAiSummary && (
                  <>
                    <div style={sectionTitleStyles}>AI Summary</div>
                    {renderAiSummary(detail.node.id)}
                  </>
                )}
              </>
            )}
            </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
