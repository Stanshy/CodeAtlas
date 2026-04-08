/**
 * CodeAtlas — AnalysisSection
 *
 * Extracted from SettingsPopover. Contains the analysis/scanning section:
 * - E2E tracing button
 * - AI overview button
 * - "分析全部" / "分析核心目錄" buttons
 * - Progress bar with percentage
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import { THEME } from '../../styles/theme';
import { postAIAnalyze, getAIJob } from '../../api/graph';
import type { GraphNode, DirectoryGraph } from '../../types/graph';
import type { ViewAction } from '../../contexts/ViewStateContext';

// ---------------------------------------------------------------------------
// SVG primitives (local copies — small and self-contained)
// ---------------------------------------------------------------------------

function SparklesIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 2l1.2 3.3L13 6l-3.3 1.2L8 10.5 6.8 7.2 3 6l3.3-1.2L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M3 11l.8 1.2L5 13l-1.2.8L3 15l-.8-1.2L1 13l1.2-.8L3 11z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AnalysisSectionProps {
  directoryGraph: DirectoryGraph | null;
  graphNodes: GraphNode[];
  dispatch: Dispatch<ViewAction>;
}

// ---------------------------------------------------------------------------
// AnalysisSection
// ---------------------------------------------------------------------------

export const AnalysisSection = memo(function AnalysisSection({
  directoryGraph,
  graphNodes,
  dispatch,
}: AnalysisSectionProps) {
  type AnalyzeScope = 'all' | 'core';
  type AnalyzeState = 'idle' | 'running' | 'done' | 'error';

  const [analyzeState, setAnalyzeState] = useState<AnalyzeState>('idle');
  const [activeScope, setActiveScope] = useState<AnalyzeScope | null>(null);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalDirectories = directoryGraph
    ? directoryGraph.nodes.length
    : graphNodes.filter((n) => n.type === 'directory').length;

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current !== null) clearTimeout(pollingRef.current);
    };
  }, []);

  const startPolling = useCallback((jobId: string) => {
    const poll = async () => {
      try {
        const jobRes = await getAIJob(jobId);
        const status = jobRes.job.status;
        if (status === 'succeeded' || status === 'cached') {
          setAnalyzeState('done');
          return;
        }
        if (status === 'failed' || status === 'canceled') {
          setAnalyzeState('error');
          return;
        }
        // queued or running — poll again
        pollingRef.current = setTimeout(poll, 2000);
      } catch {
        setAnalyzeState('error');
      }
    };
    pollingRef.current = setTimeout(poll, 2000);
  }, []);

  const handleAnalyze = useCallback(
    async (scope: AnalyzeScope) => {
      if (analyzeState === 'running') return;
      setAnalyzeState('running');
      setActiveScope(scope);
      try {
        const res = await postAIAnalyze(scope);
        startPolling(res.job.jobId);
      } catch {
        setAnalyzeState('error');
        setActiveScope(null);
      }
    },
    [analyzeState, startPolling],
  );

  const analysisButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '8px 12px',
    background: 'none',
    border: `1px solid ${THEME.borderDefault}`,
    borderRadius: 6,
    cursor: 'pointer',
    color: THEME.inkSecondary,
    fontSize: 12,
    fontWeight: 500,
    fontFamily: THEME.fontUi,
    textAlign: 'left',
    transition: 'border-color 0.15s ease-out, color 0.15s ease-out, background 0.15s ease-out',
    marginBottom: 6,
  };

  const isAnalyzing = analyzeState === 'running';

  const spinner = (
    <svg
      width={12}
      height={12}
      viewBox="0 0 12 12"
      style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
      aria-hidden
    >
      <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="14 8" />
    </svg>
  );

  const progressFillColor = analyzeState === 'done' ? '#2e7d32' : THEME.sfAccent;

  const progressArea = (analyzeState === 'running' || analyzeState === 'done' || analyzeState === 'error') && (
    <div style={{ marginTop: 6, marginBottom: 4 }}>
      <div
        style={{
          height: 6,
          background: '#e8e8f0',
          borderRadius: 3,
          overflow: 'hidden',
          marginBottom: 4,
        }}
      >
        <div
          style={{
            height: '100%',
            width: analyzeState === 'done' ? '100%' : analyzeState === 'error' ? '0%' : '50%',
            background: analyzeState === 'error' ? '#c62828' : progressFillColor,
            borderRadius: 3,
            transition: 'width 0.4s ease-out, background 0.3s ease-out',
          }}
        />
      </div>
      <div style={{ fontSize: 11, color: THEME.inkMuted, fontFamily: THEME.fontUi }}>
        {analyzeState === 'running' && `分析中... · 共 ${totalDirectories} 個目錄`}
        {analyzeState === 'done' && `已完成 · ${totalDirectories} 個目錄`}
        {analyzeState === 'error' && '分析失敗，請稍後再試'}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '4px 14px 8px' }}>
      <button
        style={analysisButtonStyle}
        onClick={() => dispatch({ type: 'SET_E2E_SELECTING', selecting: true })}
        title="選取起點節點以開始端到端追蹤"
        onMouseEnter={(e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          btn.style.borderColor = THEME.sfAccent;
          btn.style.color = THEME.sfAccent;
          btn.style.background = THEME.sfBg;
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          btn.style.borderColor = THEME.borderDefault;
          btn.style.color = THEME.inkSecondary;
          btn.style.background = 'none';
        }}
      >
        <ArrowRightIcon size={14} />
        端到端追蹤
      </button>
      <button
        style={{ ...analysisButtonStyle, marginBottom: 0 }}
        title="AI 專案概述（即將推出）"
        onMouseEnter={(e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          btn.style.borderColor = THEME.loServices;
          btn.style.color = THEME.inkPrimary;
          btn.style.background = THEME.loBgServices;
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          btn.style.borderColor = THEME.borderDefault;
          btn.style.color = THEME.inkSecondary;
          btn.style.background = 'none';
        }}
      >
        <SparklesIcon size={14} />
        AI 專案概述
      </button>

      {/* Divider before AI analyze buttons */}
      <div
        style={{
          height: 1,
          background: THEME.borderDefault,
          margin: '8px 0',
        }}
      />

      {/* T9: 分析全部 */}
      <button
        disabled={isAnalyzing}
        onClick={() => { void handleAnalyze('all'); }}
        title="觸發全專案 AI 分析"
        style={{
          ...analysisButtonStyle,
          opacity: isAnalyzing && activeScope !== 'all' ? 0.5 : 1,
          cursor: isAnalyzing ? 'not-allowed' : 'pointer',
          color: isAnalyzing && activeScope === 'all' ? THEME.sfAccent : THEME.inkSecondary,
          borderColor: isAnalyzing && activeScope === 'all' ? THEME.sfAccent : THEME.borderDefault,
        }}
        onMouseEnter={(e) => {
          if (!isAnalyzing) {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.borderColor = THEME.sfAccent;
            btn.style.color = THEME.inkPrimary;
          }
        }}
        onMouseLeave={(e) => {
          if (!isAnalyzing) {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.borderColor = THEME.borderDefault;
            btn.style.color = THEME.inkSecondary;
          }
        }}
      >
        {isAnalyzing && activeScope === 'all' ? spinner : <SparklesIcon size={13} />}
        {isAnalyzing && activeScope === 'all' ? '分析中...' : '✨ 分析全部'}
      </button>

      {/* T9: 分析核心目錄 */}
      <button
        disabled={isAnalyzing}
        onClick={() => { void handleAnalyze('core'); }}
        title="只分析 business-logic 角色的核心目錄"
        style={{
          ...analysisButtonStyle,
          marginBottom: 0,
          opacity: isAnalyzing && activeScope !== 'core' ? 0.5 : 1,
          cursor: isAnalyzing ? 'not-allowed' : 'pointer',
          color: isAnalyzing && activeScope === 'core' ? THEME.sfAccent : THEME.inkSecondary,
          borderColor: isAnalyzing && activeScope === 'core' ? THEME.sfAccent : THEME.borderDefault,
        }}
        onMouseEnter={(e) => {
          if (!isAnalyzing) {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.borderColor = THEME.sfAccent;
            btn.style.color = THEME.inkPrimary;
          }
        }}
        onMouseLeave={(e) => {
          if (!isAnalyzing) {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.borderColor = THEME.borderDefault;
            btn.style.color = THEME.inkSecondary;
          }
        }}
      >
        {isAnalyzing && activeScope === 'core' ? spinner : <SparklesIcon size={13} />}
        {isAnalyzing && activeScope === 'core' ? '分析中...' : '✨ 分析核心目錄'}
      </button>

      {/* Progress area */}
      {progressArea}
    </div>
  );
});
