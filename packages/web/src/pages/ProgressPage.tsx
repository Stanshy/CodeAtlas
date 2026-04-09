/**
 * CodeAtlas — ProgressPage
 *
 * Displays real-time analysis progress for a running job.
 * States: scanning / parsing / building / ai_analyzing / completed / failed
 *
 * - Subscribes to useAnalysisProgress (SSE + polling fallback)
 * - On completed: shows success footer + auto-navigates after 1.5s
 * - On failed: shows error detail card + 重試 / 返回歡迎頁 buttons
 * - Cancel button: POST /api/project/cancel → returnToWelcome()
 *
 * Matches screenshots 05-08 exactly.
 * Sprint 20 — T11
 */

import { useEffect, useState, useRef } from 'react';
import { useAppState } from '../contexts/AppStateContext';
import { useAnalysisProgress } from '../hooks/useAnalysisProgress';
import { ProgressStages } from '../components/ProgressStages';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProgressPageProps {
  jobId: string;
  projectPath: string;
  projectName: string;
}

// ---------------------------------------------------------------------------
// ProgressPage
// ---------------------------------------------------------------------------

export function ProgressPage({ jobId, projectPath, projectName }: ProgressPageProps) {
  const { setPage, returnToWelcome, startAnalysis } = useAppState();
  const { progress, error: hookError } = useAnalysisProgress(jobId);
  const isDark = true;

  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigatedRef = useRef(false);

  // ── Auto-navigate on completed ───────────────────────────────────────────

  useEffect(() => {
    if (progress?.status === 'completed' && !navigatedRef.current) {
      navigatedRef.current = true;
      setCountdown(3);

      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownRef.current!);
            setPage('analysis');
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [progress?.status, setPage]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleCancel = async () => {
    try {
      await fetch('/api/project/cancel', { method: 'POST' });
    } catch {
      // ignore
    }
    returnToWelcome();
  };

  const handleRetry = async () => {
    navigatedRef.current = false;
    try {
      const res = await fetch('/api/project/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: projectPath }),
      });
      const data: { jobId?: string } = await res.json();
      if (data.jobId) {
        startAnalysis(projectPath, data.jobId);
      }
    } catch {
      returnToWelcome();
    }
  };

  const handleViewNow = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setPage('analysis');
  };

  // ── Derived state ────────────────────────────────────────────────────────

  const isCompleted = progress?.status === 'completed';
  const isFailed = progress?.status === 'failed';
  const isRunning = !isCompleted && !isFailed;

  // Stats from completed progress
  const scanTotal = progress?.stages?.scanning?.total;
  const parseTotal = progress?.stages?.parsing?.total;
  const buildTotal = progress?.stages?.building?.total;

  // ── Styles ───────────────────────────────────────────────────────────────

  const pageStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: isDark ? '#1a1a2e' : '#fafafa',
    fontFamily: "'Inter', system-ui, sans-serif",
    overflowY: 'auto',
    padding: '48px 32px',
    gap: 32,
  };

  const projectHeaderStyle: React.CSSProperties = {
    textAlign: 'center',
  };

  const projectNameStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 600,
    color: isDark ? '#e8e8f0' : '#1a1a2e',
    margin: '0 0 4px 0',
  };

  const projectPathStyle: React.CSSProperties = {
    fontSize: 13,
    fontFamily: "'JetBrains Mono', monospace",
    color: isDark ? '#6868aa' : '#8888aa',
    margin: 0,
  };

  const cancelBtnStyle: React.CSSProperties = {
    padding: '8px 20px',
    borderRadius: 7,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    background: 'transparent',
    color: '#ef4444',
    border: '1px solid #ef4444',
    transition: 'all 0.12s',
  };

  // ── Completed footer ─────────────────────────────────────────────────────

  const CompletedFooter = () => (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>✅</span> 分析完成！
      </div>
      {(scanTotal || parseTotal) && (
        <p style={{ fontSize: 13, color: isDark ? '#a0a0c0' : '#4a4a6a', margin: 0 }}>
          {scanTotal && `${scanTotal} 個檔案`}
          {parseTotal && scanTotal ? `・${parseTotal} 個模組` : parseTotal ? `${parseTotal} 個模組` : ''}
          {buildTotal ? `・${buildTotal} 個端點` : ''}
        </p>
      )}
      {countdown !== null && (
        <p style={{ fontSize: 12, color: isDark ? '#6868aa' : '#8888aa', margin: 0 }}>
          即將自動跳轉…（{countdown} 秒）
        </p>
      )}
      <button
        type="button"
        style={{
          marginTop: 4,
          padding: '10px 28px',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
          background: '#22c55e',
          color: 'white',
          border: 'none',
          transition: 'all 0.12s',
          boxShadow: '0 2px 8px rgba(34,197,94,0.3)',
        }}
        onClick={handleViewNow}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#16a34a'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#22c55e'; }}
      >
        立即查看
      </button>
    </div>
  );

  // ── Failed block ─────────────────────────────────────────────────────────

  const FailedBlock = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>✕</span> 分析失敗
      </div>

      {(progress?.error || hookError) && (
        <div
          style={{
            width: '100%',
            maxWidth: 500,
            borderRadius: 8,
            padding: '14px 16px',
            background: isDark ? 'rgba(239,68,68,0.07)' : 'rgba(239,68,68,0.05)',
            border: `1px solid ${isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)'}`,
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1.6,
              color: isDark ? '#fca5a5' : '#b91c1c',
              margin: 0,
            }}
          >
            {progress?.error ?? hookError}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          style={{
            padding: '9px 22px',
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            background: '#1976d2',
            color: 'white',
            border: 'none',
            transition: 'all 0.12s',
          }}
          onClick={handleRetry}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#1565c0'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#1976d2'; }}
        >
          重試
        </button>

        <button
          type="button"
          style={{
            padding: '9px 22px',
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            background: 'transparent',
            color: isDark ? '#a0a0c0' : '#4a4a6a',
            border: `1px solid ${isDark ? '#3a3a5a' : '#d0d0d8'}`,
            transition: 'all 0.12s',
          }}
          onClick={returnToWelcome}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f8';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          返回歡迎頁
        </button>
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={pageStyle}>
      {/* Project header */}
      <div style={projectHeaderStyle}>
        <h1 style={projectNameStyle}>{projectName}</h1>
        <p style={projectPathStyle}>{projectPath}</p>
      </div>

      {/* Stage bars */}
      <ProgressStages progress={progress} isDark={isDark} />

      {/* Completed footer */}
      {isCompleted && <CompletedFooter />}

      {/* Failed block */}
      {isFailed && <FailedBlock />}

      {/* Cancel button (only while running) */}
      {isRunning && (
        <button
          type="button"
          style={cancelBtnStyle}
          onClick={handleCancel}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.06)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          取消分析
        </button>
      )}
    </div>
  );
}
