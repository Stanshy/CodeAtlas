/**
 * CodeAtlas — SFDetailPanel Component (Sprint 13-15)
 *
 * 300px-wide right-side panel for the System Framework perspective.
 * Shown when a directory card is selected (click-select).
 *
 * Sections:
 *   1. Statistics: files / functions / lines
 *   2. Files: expandable list with function sub-rows
 *   3. Upstream: directories that import FROM this directory
 *   4. Downstream: directories this directory imports
 *
 * Design: white-paper theme (#fafafa background), consistent with Sprint 12.
 *
 * Sprint 13 — T4. Sprint 15 — T6: AI summaries + MethodRole badges.
 * Sprint 19 — T15: "查看知識文件" button for Wiki bidirectional jump.
 */

import { useState, useMemo, useCallback, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { DirectoryGraph, GraphNode, GraphEdge } from '../types/graph';
import { fetchFunctionNodes } from '../api/graph';
import { useAIAnalysis } from '../hooks/useAIAnalysis';
import { AIResultBlock } from './AIResultBlock';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SFDetailPanelProps {
  selectedNodeId: string | null;
  directoryGraph: DirectoryGraph | null;
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Estimate lines of code from fileSize (stored as fileCount in metadata) */
function estimateLines(fileCount: number): string {
  if (fileCount === 0) return '—';
  // Rough heuristic: ~170 lines per file on average
  const est = fileCount * 170;
  if (est >= 1000) return `~${Math.round(est / 100) * 100}`;
  return `~${est}`;
}

// ---------------------------------------------------------------------------
// Sprint 15: MethodRole display helpers (matching LODetailPanel pattern)
// ---------------------------------------------------------------------------

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

function getRoleBadgeBg(role: string): string {
  const colors: Record<string, string> = {
    entrypoint: '#e3f2fd',
    business_core: '#f3e5f5',
    domain_rule: '#fff3e0',
    orchestration: '#e8f5e9',
    io_adapter: '#e0f2f1',
    validation: '#fce4ec',
    infra: '#eceff1',
    utility: '#f5f5f5',
    framework_glue: '#efebe9',
  };
  return colors[role] ?? '#f5f5f5';
}

function getRoleBadgeColor(role: string): string {
  const colors: Record<string, string> = {
    entrypoint: '#1565c0',
    business_core: '#7b1fa2',
    domain_rule: '#e65100',
    orchestration: '#2e7d32',
    io_adapter: '#00695c',
    validation: '#c62828',
    infra: '#546e7a',
    utility: '#757575',
    framework_glue: '#5d4037',
  };
  return colors[role] ?? '#757575';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface FileRowProps {
  filePath: string;
  fileId: string;
  functions: GraphNode[];
}

function FileRow({ filePath, fileId, functions }: FileRowProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [fetchedFns, setFetchedFns] = useState<GraphNode[] | null>(null);
  const [loading, setLoading] = useState(false);
  const fileName = filePath.split('/').pop() ?? filePath;

  // Use pre-loaded functions if available, otherwise fetch on expand
  const displayFunctions = fetchedFns ?? functions;
  const hasFunctions = functions.length > 0 || true; // Always allow expand to try fetching

  const handleExpand = useCallback(async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    // If no pre-loaded functions, try fetching from API
    if (functions.length === 0 && !fetchedFns) {
      setLoading(true);
      try {
        const result = await fetchFunctionNodes(fileId);
        if (result.ok && result.data.nodes.length > 0) {
          setFetchedFns(result.data.nodes as unknown as GraphNode[]);
        } else {
          setFetchedFns([]);
        }
      } catch {
        setFetchedFns([]);
      } finally {
        setLoading(false);
      }
    }
  }, [expanded, functions.length, fetchedFns, fileId]);

  const rowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 0',
    cursor: hasFunctions ? 'pointer' : 'default',
    userSelect: 'none',
  };

  const toggleStyle: CSSProperties = {
    width: 14,
    height: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    color: hasFunctions ? '#1565c0' : '#bdbdbd',
    flexShrink: 0,
    transition: 'transform 0.15s',
    transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
  };

  const fileNameStyle: CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: '#1a1a2e',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const countStyle: CSSProperties = {
    fontSize: 10,
    color: '#757575',
    flexShrink: 0,
  };

  return (
    <div>
      <div
        style={rowStyle}
        onClick={handleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleExpand();
          }
        }}
        aria-expanded={expanded}
      >
        <span style={toggleStyle}>▶</span>
        <span style={fileNameStyle} title={filePath}>{fileName}</span>
        {functions.length > 0 && (
          <span style={countStyle}>{functions.length} fn{functions.length !== 1 ? 's' : ''}</span>
        )}
      </div>
      {expanded && (
        <div style={{ paddingLeft: 20, borderLeft: '1px solid #e0e0e0', marginLeft: 7 }}>
          {loading && (
            <div style={{ padding: '4px 8px', fontSize: 10, color: '#9e9e9e', fontStyle: 'italic' }}>
              {t('panel.sf.loading')}
            </div>
          )}
          {!loading && displayFunctions.length === 0 && (
            <div style={{ padding: '4px 8px', fontSize: 10, color: '#bdbdbd', fontStyle: 'italic' }}>
              {t('panel.sf.noFunctions')}
            </div>
          )}
          {!loading && displayFunctions.map((fn) => {
            const methodRole = fn.metadata?.methodRole;
            const aiSummary = fn.metadata?.aiSummary;
            return (
              <div
                key={fn.id}
                style={{
                  padding: '3px 0 3px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      color: '#424242',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      flex: 1,
                    }}
                    title={fn.label}
                  >
                    {fn.label}()
                  </span>
                  {methodRole && (
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 600,
                        padding: '1px 4px',
                        borderRadius: 3,
                        background: getRoleBadgeBg(methodRole),
                        color: getRoleBadgeColor(methodRole),
                        flexShrink: 0,
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {t(getRoleLabelKey(methodRole))}
                    </span>
                  )}
                </div>
                {aiSummary && (
                  <div
                    style={{
                      fontSize: 9,
                      color: '#9e9e9e',
                      fontFamily: "'Inter', sans-serif",
                      paddingLeft: 0,
                      lineHeight: 1.3,
                    }}
                    title={aiSummary}
                  >
                    {aiSummary}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SFDetailPanel({ selectedNodeId, directoryGraph, graphNodes, graphEdges }: SFDetailPanelProps) {
  const { t } = useTranslation();
  // Which file paths expanded for function list
  const [_expandedFiles] = useState<Set<string>>(new Set());

  // Resolve selected directory node from directoryGraph
  const selectedDirNode = useMemo(() => {
    if (!selectedNodeId || !directoryGraph) return null;
    return directoryGraph.nodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [selectedNodeId, directoryGraph]);

  // Files in this directory: filter graphNodes to those whose filePath starts with selectedNodeId
  const dirFiles = useMemo<GraphNode[]>(() => {
    if (!selectedNodeId) return [];
    return graphNodes.filter((n) => {
      if (n.type !== 'file') return false;
      return n.filePath.startsWith(selectedNodeId + '/') || n.filePath === selectedNodeId;
    });
  }, [selectedNodeId, graphNodes]);

  // Function nodes: graphNodes with type 'function' that belong to the dir files
  const dirFileIds = useMemo(() => new Set(dirFiles.map((f) => f.id)), [dirFiles]);
  const dirFunctions = useMemo<GraphNode[]>(() => {
    return graphNodes.filter(
      (n) => n.type === 'function' && n.metadata?.parentFileId && dirFileIds.has(n.metadata.parentFileId),
    );
  }, [graphNodes, dirFileIds]);

  // Group functions by parent file id
  const functionsByFileId = useMemo<Map<string, GraphNode[]>>(() => {
    const map = new Map<string, GraphNode[]>();
    for (const fn of dirFunctions) {
      const fileId = fn.metadata.parentFileId!;
      if (!map.has(fileId)) map.set(fileId, []);
      map.get(fileId)!.push(fn);
    }
    return map;
  }, [dirFunctions]);

  // Statistics
  const fileCount = selectedDirNode?.fileCount ?? dirFiles.length;
  const functionCount = dirFunctions.length;
  const linesEstimate = estimateLines(fileCount);

  // Upstream: directoryGraph edges where target === selectedNodeId
  const upstreamDirs = useMemo<string[]>(() => {
    if (!selectedNodeId || !directoryGraph) return [];
    const sources = directoryGraph.edges
      .filter((e) => e.target === selectedNodeId)
      .map((e) => e.source);
    return [...new Set(sources)];
  }, [selectedNodeId, directoryGraph]);

  // Downstream: directoryGraph edges where source === selectedNodeId
  const downstreamDirs = useMemo<string[]>(() => {
    if (!selectedNodeId || !directoryGraph) return [];
    const targets = directoryGraph.edges
      .filter((e) => e.source === selectedNodeId)
      .map((e) => e.target);
    return [...new Set(targets)];
  }, [selectedNodeId, directoryGraph]);

  // Suppress unused
  void _expandedFiles;
  void graphEdges;

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

  const headerStyle: CSSProperties = {
    padding: '14px 16px 10px',
    borderBottom: '1px solid #e8e8e8',
    fontWeight: 700,
    fontSize: 13,
    color: '#1565c0',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
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

  const statLabelStyle: CSSProperties = {
    color: '#616161',
  };

  const statValueStyle: CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 600,
    fontSize: 11,
    color: '#1a1a2e',
  };

  const depListStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  };

  const depItemStyle: CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: '#424242',
    background: '#f5f5f5',
    borderRadius: 3,
    padding: '2px 6px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const emptyDepStyle: CSSProperties = {
    fontSize: 11,
    color: '#bdbdbd',
    fontStyle: 'italic',
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!selectedNodeId || !selectedDirNode) {
    return (
      <div style={panelStyle}>
        <div style={emptyStyle}>
          <span style={{ fontSize: 24 }}>📂</span>
          <span>{t('panel.sf.clickToView')}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span>📂</span>
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
          title={selectedNodeId}
        >
          {selectedDirNode.label}
        </span>
      </div>

      {/* Statistics section */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span>📊</span>
          <span>{t('panel.sf.statsTitle')}</span>
        </div>
        <div style={statRowStyle}>
          <span style={statLabelStyle}>{t('panel.sf.filesLabel')}</span>
          <span style={statValueStyle}>{fileCount}</span>
        </div>
        <div style={statRowStyle}>
          <span style={statLabelStyle}>{t('panel.sf.functionsLabel')}</span>
          <span style={statValueStyle}>{functionCount > 0 ? functionCount : '—'}</span>
        </div>
        <div style={statRowStyle}>
          <span style={statLabelStyle}>{t('panel.sf.linesLabel')}</span>
          <span style={statValueStyle}>{linesEstimate}</span>
        </div>
      </div>

      {/* Files section */}
      {dirFiles.length > 0 && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <span>📄</span>
            <span>{t('panel.sf.fileListTitle')}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {dirFiles.map((file) => (
              <FileRow
                key={file.id}
                filePath={file.filePath}
                fileId={file.id}
                functions={functionsByFileId.get(file.id) ?? []}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upstream section */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span>⬆</span>
          <span>{t('panel.sf.upstreamTitle', { count: upstreamDirs.length })}</span>
        </div>
        {upstreamDirs.length === 0 ? (
          <span style={emptyDepStyle}>{t('panel.sf.noUpstream')}</span>
        ) : (
          <div style={depListStyle}>
            {upstreamDirs.map((dir) => (
              <div key={dir} style={depItemStyle} title={dir}>
                {dir}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Downstream section */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span>⬇</span>
          <span>{t('panel.sf.downstreamTitle', { count: downstreamDirs.length })}</span>
        </div>
        {downstreamDirs.length === 0 ? (
          <span style={emptyDepStyle}>{t('panel.sf.noDownstream')}</span>
        ) : (
          <div style={depListStyle}>
            {downstreamDirs.map((dir) => (
              <div key={dir} style={depItemStyle} title={dir}>
                {dir}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Analysis section — bottom of detail panel */}
      <SFAISection directoryPath={selectedNodeId} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SF AI Analysis section — button + result at bottom of detail panel
// ---------------------------------------------------------------------------

function SFAISection({ directoryPath }: { directoryPath: string }) {
  const { t } = useTranslation();
  const { status, error, job, analyze } = useAIAnalysis('directory', directoryPath);
  const isDisabled = error === 'AI_DISABLED';

  const sectionStyle: CSSProperties = {
    padding: '10px 16px',
    borderTop: '1px solid #f0f0f0',
  };

  const btnStyle: CSSProperties = {
    width: '100%',
    fontSize: 11,
    fontWeight: 500,
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid #1565c0',
    background: 'transparent',
    color: '#1565c0',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    textAlign: 'center',
  };

  // Succeeded → show result
  if (status === 'succeeded' && job) {
    const aiResult = (job.result ?? {});
    const summary = typeof aiResult.oneLineSummary === 'string' ? aiResult.oneLineSummary
      : typeof aiResult.summary === 'string' ? aiResult.summary : undefined;
    const responsibilities = Array.isArray(aiResult.keyResponsibilities) ? aiResult.keyResponsibilities as string[]
      : Array.isArray(aiResult.responsibilities) ? aiResult.responsibilities as string[] : undefined;
    const role = typeof aiResult.role === 'string' ? aiResult.role : undefined;
    const confidence = typeof aiResult.confidence === 'number' ? aiResult.confidence : undefined;
    const provider = typeof aiResult.provider === 'string' ? aiResult.provider : undefined;
    const result: { role?: string; summary?: string; responsibilities?: string[]; confidence?: number } = {};
    if (role) result.role = role;
    if (summary) result.summary = summary;
    if (responsibilities) result.responsibilities = responsibilities;
    if (confidence) result.confidence = confidence;

    return (
      <div style={sectionStyle}>
        <AIResultBlock
          variant="full"
          result={result}
          {...(provider ? { provider } : {})}
          {...(job.completedAt ? { analyzedAt: job.completedAt } : {})}
          onReanalyze={() => analyze(true)}
        />
      </div>
    );
  }

  // Analyzing
  if (status === 'analyzing') {
    return (
      <div style={sectionStyle}>
        <div style={{ ...btnStyle, border: '1px solid #d0d0d8', color: '#8888aa', opacity: 0.6, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid currentColor', borderTopColor: 'transparent', animation: 'ca-spin 0.8s linear infinite', display: 'inline-block' }} />
          {t('ai.analyzing')}
        </div>
      </div>
    );
  }

  // Failed
  if (status === 'failed' && !isDisabled) {
    return (
      <div style={sectionStyle}>
        <button
          style={{ ...btnStyle, border: '1px solid #ef9a9a', background: '#fff5f5', color: '#c62828' }}
          onClick={() => analyze(true)}
          type="button"
        >
          {t('ai.analysisFailedRetry')}
        </button>
      </div>
    );
  }

  // Disabled
  if (isDisabled) {
    return (
      <div style={sectionStyle}>
        <button style={{ ...btnStyle, border: '1px solid #d0d0d8', color: '#8888aa', opacity: 0.55, cursor: 'not-allowed' }} disabled type="button" title={t('ai.enableAiProvider')}>
          {t('panel.sf.aiAnalyzeDirectory')}
        </button>
      </div>
    );
  }

  // Idle
  return (
    <div style={sectionStyle}>
      <button style={btnStyle} onClick={() => analyze()} type="button">
        {t('panel.sf.aiAnalyzeDirectory')}
      </button>
    </div>
  );
}
