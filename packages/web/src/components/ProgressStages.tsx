/**
 * CodeAtlas — ProgressStages
 *
 * Vertical list of 4 ProgressBar components for the 4 analysis stages:
 *   1. 掃描檔案  (scanning)
 *   2. 解析語法  (parsing)
 *   3. 建構圖譜  (building)
 *   4. AI 分析   (ai_analyzing)
 *
 * Matches screenshots 05-08 exactly.
 * Sprint 20 — T11
 */

import { ProgressBar } from './ProgressBar';
import type { AnalysisProgress, StageProgress } from '../hooks/useAnalysisProgress';

// ---------------------------------------------------------------------------
// Default stage for stages not yet present in progress data
// ---------------------------------------------------------------------------

const PENDING_STAGE: StageProgress = { status: 'pending', progress: 0 };

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProgressStagesProps {
  progress: AnalysisProgress | null;
  isDark?: boolean;
}

// ---------------------------------------------------------------------------
// ProgressStages
// ---------------------------------------------------------------------------

export function ProgressStages({ progress, isDark = true }: ProgressStagesProps) {
  const stages = progress?.stages;

  const scanning    = stages?.scanning    ?? PENDING_STAGE;
  const parsing     = stages?.parsing     ?? PENDING_STAGE;
  const building    = stages?.building    ?? PENDING_STAGE;
  const ai_analyzing = stages?.ai_analyzing ?? PENDING_STAGE;

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    width: '100%',
    maxWidth: 500,
  };

  return (
    <div style={containerStyle}>
      <ProgressBar
        label="掃描檔案"
        stageName="scanning"
        stageNumber={1}
        stage={scanning}
        isDark={isDark}
      />
      <ProgressBar
        label="解析語法"
        stageName="parsing"
        stageNumber={2}
        stage={parsing}
        isDark={isDark}
      />
      <ProgressBar
        label="建構圖譜"
        stageName="building"
        stageNumber={3}
        stage={building}
        isDark={isDark}
      />
      <ProgressBar
        label="AI 分析（可選）"
        stageName="ai_analyzing"
        stageNumber={4}
        stage={ai_analyzing}
        isDark={isDark}
      />
    </div>
  );
}
