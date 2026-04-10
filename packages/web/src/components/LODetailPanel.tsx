/**
 * CodeAtlas — LODetailPanel Component (Sprint 13)
 *
 * 300px-wide right-side panel for the Logic Operation perspective.
 * Shown when a chain node is clicked in LOCallChain.
 *
 * Sections:
 *   1. Method name with category color bar + category badge
 *   2. Signature: parameters → returnType (monospace)
 *   3. Location: Class, File, Lines
 *   4. Complexity (if available)
 *   5. Callers: graphNodes with call edges pointing TO this method
 *   6. Callees: graphNodes with call edges FROM this method
 *
 * Design: white-paper theme (#fafafa background), consistent with Sprint 12/13.
 *
 * Sprint 13 — T5.
 * Sprint 19 — T15: "查看知識文件" button for Wiki bidirectional jump.
 */

import { useMemo, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { GraphNode, GraphEdge, ChainStep, LoCategory } from '../types/graph';
import { useAIAnalysis } from '../hooks/useAIAnalysis';
import { AIResultBlock } from './AIResultBlock';

// ---------------------------------------------------------------------------
// Category color map
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<LoCategory, { bar: string; bg: string; text: string; labelKey: string }> = {
  routes:     { bar: '#1565c0', bg: '#e3f2fd', text: '#0d47a1', labelKey: 'panel.lo.categoryRoutes' },
  middleware: { bar: '#00838f', bg: '#e0f7fa', text: '#006064', labelKey: 'panel.lo.categoryMiddleware' },
  services:   { bar: '#7b1fa2', bg: '#f3e5f5', text: '#4a148c', labelKey: 'panel.lo.categoryServices' },
  models:     { bar: '#4e342e', bg: '#efebe9', text: '#3e2723', labelKey: 'panel.lo.categoryModels' },
  utils:      { bar: '#546e7a', bg: '#eceff1', text: '#37474f', labelKey: 'panel.lo.categoryUtils' },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface LODetailPanelProps {
  selectedStep: ChainStep | null;
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  /** Full chain for deriving caller/callee from chain context */
  chain?: ChainStep[] | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSignature(node: GraphNode): string {
  const params = node.metadata.parameters ?? [];
  const paramStr = params
    .map((p) => {
      let s = p.name;
      if (p.type) s += `: ${p.type}`;
      if (p.isOptional) s += '?';
      return s;
    })
    .join(', ');
  const ret = node.metadata.returnType ? ` → ${node.metadata.returnType}` : '';
  return `(${paramStr})${ret}`;
}

function shortenPath(filePath: string, maxLen = 38): string {
  if (filePath.length <= maxLen) return filePath;
  const parts = filePath.replace(/\\/g, '/').split('/');
  if (parts.length <= 3) return filePath;
  return `…/${parts.slice(-3).join('/')}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ListItemProps {
  label: string;
}

function ListItem({ label }: ListItemProps) {
  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        color: '#424242',
        background: '#f5f5f5',
        borderRadius: 3,
        padding: '2px 6px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
      title={label}
    >
      {label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sprint 14 T9: AI analysis helpers
// ---------------------------------------------------------------------------

/** Role display label key mapping */
function getRoleLabelKey(role: string): string {
  const keys: Record<string, string> = {
    entrypoint:     'panel.lo.roleEntrypoint',
    business_core:  'panel.lo.roleBusinessCore',
    domain_rule:    'panel.lo.roleDomainRule',
    orchestration:  'panel.lo.roleOrchestration',
    io_adapter:     'panel.lo.roleIoAdapter',
    validation:     'panel.lo.roleValidation',
    infra:          'panel.lo.roleInfra',
    utility:        'panel.lo.roleUtility',
    framework_glue: 'panel.lo.roleFrameworkGlue',
  };
  return keys[role] ?? role;
}

/** Role badge colors */
function getRoleBadgeColor(role: string): { bg: string; text: string } {
  const colors: Record<string, { bg: string; text: string }> = {
    entrypoint:      { bg: '#e3f2fd', text: '#1565c0' },
    business_core:   { bg: '#f3e5f5', text: '#7b1fa2' },
    domain_rule:     { bg: '#fff3e0', text: '#e65100' },
    orchestration:   { bg: '#e8f5e9', text: '#2e7d32' },
    io_adapter:      { bg: '#efebe9', text: '#4e342e' },
    validation:      { bg: '#fff8e1', text: '#f9a825' },
    infra:           { bg: '#eceff1', text: '#546e7a' },
    utility:         { bg: '#f5f5f5', text: '#9e9e9e' },
    framework_glue:  { bg: '#fce4ec', text: '#c62828' },
  };
  return colors[role] ?? { bg: '#f5f5f5', text: '#757575' };
}

// ---------------------------------------------------------------------------
// Sprint 16: AI on-demand analysis section for LO detail panel
// ---------------------------------------------------------------------------

function LOAISection({ selectedStep }: { selectedStep: ChainStep }) {
  const { t } = useTranslation();
  // Use specific method identifier: filePath#methodName — so each method gets its own analysis
  // Strip trailing () — backend/cache keys don't include parentheses
  const cleanName = selectedStep.methodName.replace(/\(\)$/, '');
  const methodTarget = selectedStep.filePath
    ? `${selectedStep.filePath}#${cleanName}`
    : cleanName;
  const { status, job, error, analyze } = useAIAnalysis('method', methodTarget);
  const [showTooltip, setShowTooltip] = useState(false);

  const isDisabled = error === 'AI_DISABLED';

  const sectionStyle: CSSProperties = {
    padding: '10px 16px',
    borderBottom: '1px solid #f0f0f0',
  };

  const sectionTitleStyle: CSSProperties = {
    fontWeight: 600,
    fontSize: 11,
    color: '#757575',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  };

  const btnBase: CSSProperties = {
    width: '100%',
    fontSize: 11,
    fontWeight: 500,
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid #7b1fa2',
    background: 'transparent',
    color: '#7b1fa2',
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
      : typeof aiResult.summary === 'string' ? aiResult.summary
      : typeof aiResult.oneLineSummary === 'string' ? aiResult.oneLineSummary
      : undefined;
    const role = typeof aiResult.role === 'string' ? aiResult.role : undefined;
    const provider = typeof aiResult.provider === 'string' ? aiResult.provider : undefined;
    const confidence = typeof aiResult.confidence === 'number' ? aiResult.confidence : undefined;

    if (!description && !job.result) {
      // Job succeeded but no result at all — show "no data" message
      return (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <span>✨</span>
            <span>{t('panel.lo.aiAnalysisTitle')}</span>
          </div>
          <div style={{ fontSize: 12, color: '#9e9e9e', fontStyle: 'italic' }}>
            {t('panel.lo.noAnalysisData')}
          </div>
        </div>
      );
    }

    if (!description) return null;

    return (
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span>✨</span>
          <span>{t('panel.lo.aiAnalysisTitle')}</span>
        </div>
        <AIResultBlock
          variant="full"
          result={{
            summary: description,
            ...(role !== undefined ? { role } : {}),
            ...(confidence !== undefined ? { confidence } : {}),
          }}
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
        <div style={sectionTitleStyle}>
          <span>✨</span>
          <span>{t('panel.lo.aiAnalysisTitle')}</span>
        </div>
        <div style={{ ...btnBase, border: '1px solid #d0d0d8', color: '#8888aa', opacity: 0.6, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} aria-busy="true">
          <span style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid currentColor', borderTopColor: 'transparent', animation: 'ca-spin 0.8s linear infinite', display: 'inline-block' }} aria-hidden="true" />
          {t('ai.analyzing')}
        </div>
      </div>
    );
  }

  // AI disabled → disabled button + tooltip
  if (isDisabled) {
    return (
      <div style={{ ...sectionStyle, position: 'relative' }}>
        <div style={sectionTitleStyle}>
          <span>✨</span>
          <span>{t('panel.lo.aiAnalysisTitle')}</span>
        </div>
        {showTooltip && (
          <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', background: '#333', color: '#fff', fontSize: 10, padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }} role="tooltip">
            {t('ai.enableAiProvider')}
          </div>
        )}
        <button
          style={{ ...btnBase, border: '1px solid #d0d0d8', color: '#8888aa', opacity: 0.55, cursor: 'not-allowed' }}
          disabled
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          type="button"
        >
          {t('ai.analyzeLogic')}
        </button>
      </div>
    );
  }

  // Failed → retry button
  if (status === 'failed') {
    return (
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span>✨</span>
          <span>{t('panel.lo.aiAnalysisTitle')}</span>
        </div>
        <button
          style={{ ...btnBase, border: '1px solid #ef9a9a', background: '#fff5f5', color: '#c62828' }}
          onClick={() => analyze(true)}
          type="button"
        >
          {t('ai.analysisFailedRetry')}
        </button>
      </div>
    );
  }

  // Idle → analyze button
  return (
    <div style={sectionStyle}>
      <div style={sectionTitleStyle}>
        <span>✨</span>
        <span>{t('panel.lo.aiAnalysisTitle')}</span>
      </div>
      <button style={btnBase} onClick={() => analyze()} type="button">
        {t('ai.analyzeLogic')}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function LODetailPanel({ selectedStep, graphNodes, graphEdges, chain }: LODetailPanelProps) {
  const { t } = useTranslation();
  // Find the function/method graphNode that corresponds to the selected chain step
  const methodNode = useMemo<GraphNode | null>(() => {
    if (!selectedStep) return null;
    // Try exact label + filePath match first
    const exact = graphNodes.find(
      (n) =>
        (n.type === 'function' || n.metadata?.kind === 'method' || n.metadata?.kind === 'function') &&
        n.label === selectedStep.methodName &&
        n.filePath === selectedStep.filePath,
    );
    if (exact) return exact;
    // Fallback: label match
    return (
      graphNodes.find(
        (n) =>
          (n.type === 'function' || n.metadata?.kind === 'method' || n.metadata?.kind === 'function') &&
          n.label === selectedStep.methodName,
      ) ?? null
    );
  }, [selectedStep, graphNodes]);

  // Callers/Callees: prefer chain context (prev/next steps), fallback to edge-based
  const callers = useMemo<Array<GraphNode | ChainStep>>(() => {
    if (!selectedStep || !chain) {
      // Fallback: edge-based
      if (!methodNode) return [];
      const callerIds = graphEdges
        .filter((e) => e.type === 'call' && e.target === methodNode.id)
        .map((e) => e.source);
      return callerIds.reduce<GraphNode[]>((acc, id) => {
        const node = graphNodes.find((n) => n.id === id);
        if (node) acc.push(node);
        return acc;
      }, []);
    }
    // Chain-based: the step before this one is the caller
    const idx = chain.findIndex((s) => s.id === selectedStep.id);
    if (idx <= 0) return [];
    const prevStep = chain[idx - 1];
    // Try to find matching GraphNode
    const prevNode = graphNodes.find(
      (n) => n.label === prevStep.methodName && n.filePath === prevStep.filePath,
    );
    return prevNode ? [prevNode] : [prevStep];
  }, [selectedStep, chain, methodNode, graphNodes, graphEdges]);

  const callees = useMemo<Array<GraphNode | ChainStep>>(() => {
    if (!selectedStep || !chain) {
      // Fallback: edge-based
      if (!methodNode) return [];
      const calleeIds = graphEdges
        .filter((e) => e.type === 'call' && e.source === methodNode.id)
        .map((e) => e.target);
      return calleeIds.reduce<GraphNode[]>((acc, id) => {
        const node = graphNodes.find((n) => n.id === id);
        if (node) acc.push(node);
        return acc;
      }, []);
    }
    // Chain-based: the step(s) after this one are callees
    const idx = chain.findIndex((s) => s.id === selectedStep.id);
    if (idx < 0 || idx >= chain.length - 1) return [];
    const nextStep = chain[idx + 1];
    const nextNode = graphNodes.find(
      (n) => n.label === nextStep.methodName && n.filePath === nextStep.filePath,
    );
    return nextNode ? [nextNode] : [nextStep];
  }, [selectedStep, chain, methodNode, graphNodes, graphEdges]);

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  const panelStyle: CSSProperties = {
    width: 300,
    height: '100%',
    background: '#fafafa',
    borderLeft: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Inter', sans-serif",
    fontSize: 12,
    color: '#1a1a2e',
    overflowY: 'auto',
    flexShrink: 0,
  };

  const emptyStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9e9e9e',
    fontSize: 12,
    padding: 24,
    textAlign: 'center',
    gap: 8,
  };

  const sectionStyle: CSSProperties = {
    padding: '10px 16px',
    borderBottom: '1px solid #f0f0f0',
  };

  const sectionTitleStyle: CSSProperties = {
    fontWeight: 600,
    fontSize: 11,
    color: '#757575',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  };

  const statRowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '2px 0',
    fontSize: 12,
  };

  const statLabelStyle: CSSProperties = { color: '#616161' };

  const statValueStyle: CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 600,
    fontSize: 11,
    color: '#1a1a2e',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 160,
    whiteSpace: 'nowrap',
  };

  const listStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  };

  const emptyListStyle: CSSProperties = {
    fontSize: 11,
    color: '#bdbdbd',
    fontStyle: 'italic',
  };

  // ---------------------------------------------------------------------------
  // Empty / no selection
  // ---------------------------------------------------------------------------

  if (!selectedStep) {
    return (
      <div style={panelStyle}>
        <div style={emptyStyle}>
          <span style={{ fontSize: 24 }}>🔧</span>
          <span>{t('panel.lo.clickToView')}</span>
          <span style={{ fontSize: 11, color: '#bdbdbd' }}>{t('panel.lo.clickToViewSub')}</span>
        </div>
      </div>
    );
  }

  const catColors = CATEGORY_COLORS[selectedStep.category] ?? CATEGORY_COLORS.utils;
  const catLabel = t(catColors.labelKey);
  const sig = methodNode ? buildSignature(methodNode) : `(${selectedStep.methodName})`;
  const lineCount = methodNode?.metadata?.lineCount;
  const isAsync = methodNode?.metadata?.isAsync;
  const isExported = methodNode?.metadata?.isExported;
  // Complexity is not stored as a standard field; approximate from lineCount
  const complexityEst = lineCount ? Math.max(1, Math.round(lineCount / 8)) : null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={panelStyle}>
      {/* Header: method name + category color bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          borderBottom: '1px solid #e8e8e8',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 4,
            background: catColors.bar,
            flexShrink: 0,
          }}
        />
        <div
          style={{
            flex: 1,
            padding: '12px 14px 10px',
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              color: catColors.text,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
            }}
          >
            <span>🔧</span>
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
              title={selectedStep.methodName}
            >
              {selectedStep.methodName}()
            </span>
          </div>
          {/* Category badge */}
          <span
            style={{
              display: 'inline-block',
              fontSize: 9,
              fontWeight: 600,
              background: catColors.bg,
              color: catColors.bar,
              borderRadius: 10,
              padding: '1px 6px',
              border: `1px solid ${catColors.bar}44`,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {catLabel}
          </span>
        </div>
      </div>

      {/* Signature section */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span>( )</span>
          <span>{t('panel.lo.signatureTitle')}</span>
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: '#1a1a2e',
            background: '#f5f5f5',
            borderRadius: 4,
            padding: '6px 8px',
            wordBreak: 'break-word',
            lineHeight: 1.5,
          }}
        >
          {sig}
        </div>
        {isAsync && (
          <div style={{ marginTop: 4, fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>
            {t('panel.lo.async')}
          </div>
        )}
        {isExported && (
          <div style={{ marginTop: 2, fontSize: 10, color: '#43a047' }}>
            {t('panel.lo.exported')}
          </div>
        )}
      </div>

      {/* Sprint 14 T9: AI Analysis section */}
      {(methodNode?.metadata?.aiSummary || methodNode?.metadata?.methodRole) && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <span>✨</span>
            <span>{t('panel.lo.aiAnalysisTitle')}</span>
          </div>
          {methodNode?.metadata?.aiSummary && (
            <div style={{
              fontSize: 12,
              color: '#424242',
              lineHeight: 1.5,
              marginBottom: 6,
            }}>
              {methodNode.metadata.aiSummary}
            </div>
          )}
          {methodNode?.metadata?.methodRole && (
            <div style={statRowStyle}>
              <span style={statLabelStyle}>{t('panel.lo.roleLabel')}</span>
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: 10,
                background: getRoleBadgeColor(methodNode.metadata.methodRole).bg,
                color: getRoleBadgeColor(methodNode.metadata.methodRole).text,
              }}>
                {t(getRoleLabelKey(methodNode.metadata.methodRole))}
              </span>
            </div>
          )}
          {methodNode?.metadata?.roleConfidence !== undefined && (
            <div style={statRowStyle}>
              <span style={statLabelStyle}>{t('ai.confidenceLabel')}</span>
              <span style={statValueStyle}>
                {Math.round((methodNode.metadata.roleConfidence ?? 0) * 100)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Location section */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span>📍</span>
          <span>{t('panel.lo.locationTitle')}</span>
        </div>
        {selectedStep.className && (
          <div style={statRowStyle}>
            <span style={statLabelStyle}>{t('panel.lo.classLabel')}</span>
            <span style={statValueStyle} title={selectedStep.className}>
              {selectedStep.className.split('/').pop() ?? selectedStep.className}
            </span>
          </div>
        )}
        <div style={statRowStyle}>
          <span style={statLabelStyle}>{t('panel.lo.fileLabel')}</span>
          <span style={statValueStyle} title={selectedStep.filePath}>
            {shortenPath(selectedStep.filePath)}
          </span>
        </div>
        {lineCount !== undefined && (
          <div style={statRowStyle}>
            <span style={statLabelStyle}>{t('panel.lo.linesLabel')}</span>
            <span style={statValueStyle}>{lineCount}</span>
          </div>
        )}
        {complexityEst !== null && complexityEst !== undefined && (
          <div style={statRowStyle}>
            <span style={statLabelStyle}>{t('panel.lo.complexityLabel')}</span>
            <span
              style={{
                ...statValueStyle,
                color: complexityEst > 10 ? '#e65100' : complexityEst > 5 ? '#f59e0b' : '#43a047',
              }}
            >
              ~{complexityEst}
            </span>
          </div>
        )}
      </div>

      {/* Callers section */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span>⬆</span>
          <span>{t('panel.lo.callersTitle', { count: callers.length })}</span>
        </div>
        {callers.length === 0 ? (
          <span style={emptyListStyle}>
            {chain ? t('panel.lo.noCallers') : methodNode ? t('panel.lo.noCallersDetected') : t('panel.lo.noCallerNodes')}
          </span>
        ) : (
          <div style={listStyle}>
            {callers.slice(0, 8).map((n) => {
              const name = 'label' in n ? n.label : (n as ChainStep).methodName;
              return <ListItem key={n.id} label={`${name}()`} />;
            })}
            {callers.length > 8 && (
              <span style={{ fontSize: 10, color: '#bdbdbd' }}>
                {t('panel.lo.moreItems', { count: callers.length - 8 })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Callees section */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span>⬇</span>
          <span>{t('panel.lo.calleesTitle', { count: callees.length })}</span>
        </div>
        {callees.length === 0 ? (
          <span style={emptyListStyle}>
            {chain ? t('panel.lo.noCallees') : methodNode ? t('panel.lo.noCalleesDetected') : t('panel.lo.noCalleeNodes')}
          </span>
        ) : (
          <div style={listStyle}>
            {callees.slice(0, 8).map((n) => {
              const name = 'label' in n ? n.label : (n as ChainStep).methodName;
              return <ListItem key={n.id} label={`${name}()`} />;
            })}
            {callees.length > 8 && (
              <span style={{ fontSize: 10, color: '#bdbdbd' }}>
                {t('panel.lo.moreItems', { count: callees.length - 8 })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Depth info */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span>🔢</span>
          <span>{t('panel.lo.chainInfoTitle')}</span>
        </div>
        <div style={statRowStyle}>
          <span style={statLabelStyle}>{t('panel.lo.depthLabel')}</span>
          <span style={statValueStyle}>{selectedStep.depth}</span>
        </div>
        {chain && (
          <>
            <div style={statRowStyle}>
              <span style={statLabelStyle}>{t('panel.lo.positionLabel')}</span>
              <span style={statValueStyle}>
                {t('panel.lo.stepOf', { current: chain.findIndex((s) => s.id === selectedStep.id) + 1, total: chain.length })}
              </span>
            </div>
            <div style={statRowStyle}>
              <span style={statLabelStyle}>{t('panel.lo.categoryLabel')}</span>
              <span style={{ ...statValueStyle, color: catColors.bar }}>
                {catLabel}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Sprint 16: AI on-demand analysis — at bottom of panel */}
      <LOAISection selectedStep={selectedStep} />
    </div>
  );
}
