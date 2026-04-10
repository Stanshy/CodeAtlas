/**
 * CodeAtlas — ProgressBar
 *
 * Single-stage progress bar with:
 *   - Stage badge (number / checkmark / X / skip icon)
 *   - Stage name + percentage
 *   - Horizontal fill bar (colour per stage)
 *   - Sub-text (current file, count, or status message)
 *
 * Matches screenshots 05-08 exactly.
 * Sprint 20 — T11
 */

import type { StageProgress } from '../hooks/useAnalysisProgress';

// ---------------------------------------------------------------------------
// Stage colours (boss-mandated)
// ---------------------------------------------------------------------------

export type StageName = 'scanning' | 'parsing' | 'building' | 'ai_analyzing';

const STAGE_COLORS: Record<StageName, string> = {
  scanning:    '#3b82f6',   // blue
  parsing:     '#8b5cf6',   // purple
  building:    '#22c55e',   // green
  ai_analyzing: '#f59e0b',  // amber
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProgressBarProps {
  label: string;
  stageName: StageName;
  stageNumber: number;
  stage: StageProgress;
  isDark?: boolean;
}

// ---------------------------------------------------------------------------
// Stage Badge
// ---------------------------------------------------------------------------

function StageBadge({
  stageNumber,
  status,
  stageName,
  isDark,
}: {
  stageNumber: number;
  status: StageProgress['status'];
  stageName: StageName;
  isDark: boolean;
}) {
  const color = STAGE_COLORS[stageName];

  const baseStyle: React.CSSProperties = {
    width: 26,
    height: 26,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
  };

  if (status === 'completed') {
    return (
      <div style={{ ...baseStyle, background: '#22c55e', color: 'white' }}>
        ✓
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div style={{ ...baseStyle, background: '#ef4444', color: 'white' }}>
        ✕
      </div>
    );
  }

  if (status === 'skipped') {
    return (
      <div
        style={{
          ...baseStyle,
          border: `2px solid ${isDark ? '#6868aa' : '#bbbbcc'}`,
          color: isDark ? '#6868aa' : '#8888aa',
        }}
      >
        ⏭
      </div>
    );
  }

  if (status === 'running') {
    return (
      <div
        style={{
          ...baseStyle,
          background: color,
          color: 'white',
          animation: 'codeatlas-pulse-badge 1.6s ease-out infinite',
        }}
      >
        {stageNumber}
      </div>
    );
  }

  // pending
  return (
    <div
      style={{
        ...baseStyle,
        border: `2px solid ${isDark ? '#6868aa' : '#bbbbcc'}`,
        color: isDark ? '#6868aa' : '#bbbbcc',
      }}
    >
      {stageNumber}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProgressBar
// ---------------------------------------------------------------------------

export function ProgressBar({
  label,
  stageName,
  stageNumber,
  stage,
  isDark = true,
}: ProgressBarProps) {
  const color = STAGE_COLORS[stageName];
  const { status, progress, current, total, done } = stage;

  // Fill colour: use stage color while running, green when completed, red when failed
  const fillColor =
    status === 'completed' ? '#22c55e' :
    status === 'failed'    ? '#ef4444' :
    color;

  // Percentage display
  const pctText =
    status === 'failed'    ? '失敗' :
    status === 'skipped'   ? '' :
    status === 'completed' ? '100%' :
    status === 'running'   ? `${progress}%` :
    '';

  const pctColor =
    status === 'failed'    ? '#ef4444' :
    status === 'completed' ? '#22c55e' :
    status === 'running'   ? color :
    isDark ? '#6868aa' : '#8888aa';

  // Sub-text
  let subText = '';
  if (status === 'running' && current) {
    subText = total && done !== undefined
      ? `正在${stageName === 'scanning' ? '掃描' : stageName === 'parsing' ? '解析' : '處理'} ${current} · ${done} / ${total} 個檔案`
      : `正在${stageName === 'scanning' ? '掃描' : stageName === 'parsing' ? '解析' : '處理'} ${current}`;
  } else if (status === 'completed') {
    if (total) {
      subText = stageName === 'scanning'
        ? `完成掃描 ${total} 個檔案`
        : stageName === 'parsing'
          ? `完成解析 ${total} 個檔案`
          : `圖譜已建立，${total} 個節點`;
    }
  } else if (status === 'failed' && current) {
    subText = current;
  } else if (status === 'pending') {
    subText = '等待中';
  } else if (status === 'skipped') {
    subText = '已跳過';
  }

  const isMonoSub = status === 'running' || status === 'failed';

  // ── Styles ──────────────────────────────────────────────────────────────

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  };

  const bodyStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
  };

  const topRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  };

  const nameStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: isDark ? '#e8e8f0' : '#1a1a2e',
  };

  const pctStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    marginLeft: 'auto',
    color: pctColor,
  };

  const trackStyle: React.CSSProperties = {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    background: isDark ? '#2a2a3e' : '#f0f0f4',
  };

  const fillStyle: React.CSSProperties = {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.4s ease',
    width: `${status === 'completed' ? 100 : status === 'failed' ? progress : status === 'running' ? progress : 0}%`,
    background: fillColor,
  };

  const subStyle: React.CSSProperties = {
    fontSize: 12,
    fontFamily: isMonoSub ? "'JetBrains Mono', monospace" : "'Inter', sans-serif",
    marginTop: 5,
    color: isDark
      ? (status === 'pending' || status === 'skipped') ? 'rgba(104,104,170,0.6)' : '#6868aa'
      : (status === 'pending' || status === 'skipped') ? '#bbbbcc' : '#8888aa',
  };

  return (
    <>
      {/* Inject pulse animation once globally */}
      <style>{`
        @keyframes codeatlas-pulse-badge {
          0%   { box-shadow: 0 0 0 0 rgba(59,130,246,0.5); }
          60%  { box-shadow: 0 0 0 6px rgba(59,130,246,0); }
          100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
        }
      `}</style>

      <div style={rowStyle}>
        <StageBadge
          stageNumber={stageNumber}
          status={status}
          stageName={stageName}
          isDark={isDark}
        />

        <div style={bodyStyle}>
          <div style={topRowStyle}>
            <span style={nameStyle}>{label}</span>
            {pctText && <span style={pctStyle}>{pctText}</span>}
          </div>
          <div style={trackStyle}>
            <div style={fillStyle} />
          </div>
          {subText && <p style={subStyle}>{subText}</p>}
        </div>
      </div>
    </>
  );
}
