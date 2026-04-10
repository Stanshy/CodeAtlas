/**
 * @codeatlas/cli — Analysis Runner
 *
 * Wraps the core scan → parse → build graph pipeline and exposes
 * a progress-reporting interface via an `onProgress` callback.
 *
 * Sprint 20 T3: analysis-runner.ts
 */

import path from 'node:path';
import type { AnalysisResult } from '@codeatlas/core';
import { scanDirectory } from '@codeatlas/core';
import { analyze } from '@codeatlas/core';
import type { AnalysisProgress, StageProgress } from '@codeatlas/core';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RunAnalysisOptions {
  /** Absolute path to the project root to analyse. */
  projectPath: string;
  /** Called after every meaningful state change during analysis. */
  onProgress: (progress: AnalysisProgress) => void;
  /** Optional signal to cancel the analysis. */
  signal?: AbortSignal;
  /** Extra directories to ignore during scanning. */
  ignoreDirs?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pendingStage(): StageProgress {
  return { status: 'pending', progress: 0 };
}

function makeProgress(
  jobId: string,
  startedAt: string,
  overrides: Partial<AnalysisProgress>,
): AnalysisProgress {
  const base: AnalysisProgress = {
    jobId,
    status: 'queued',
    startedAt,
    stages: {
      scanning: pendingStage(),
      parsing: pendingStage(),
      building: pendingStage(),
    },
  };
  return { ...base, ...overrides, stages: { ...base.stages, ...overrides.stages } };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run the full analysis pipeline with progress reporting.
 *
 * Progress is reported at each major stage transition:
 *   queued → scanning → parsing → building → completed | failed
 *
 * @throws Re-throws any error from the underlying analyze() call after
 *         reporting a `failed` status to the `onProgress` callback.
 */
export async function runAnalysis(options: RunAnalysisOptions): Promise<AnalysisResult> {
  const { projectPath, onProgress, signal, ignoreDirs = [] } = options;

  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = new Date().toISOString();

  // --- Initial queued state ---
  let progress = makeProgress(jobId, startedAt, { status: 'queued' });
  onProgress(progress);

  // --- Guard: check for cancellation before starting ---
  if (signal?.aborted) {
    progress = {
      ...progress,
      status: 'failed',
      error: 'Analysis cancelled before start.',
      completedAt: new Date().toISOString(),
      stages: {
        ...progress.stages,
        scanning: { status: 'failed', progress: 0 },
      },
    };
    onProgress(progress);
    throw new Error('Analysis cancelled before start.');
  }

  try {
    // -------------------------------------------------------------------------
    // Stage 1: Scanning (file discovery)
    // -------------------------------------------------------------------------
    progress = {
      ...progress,
      status: 'scanning',
      stages: {
        ...progress.stages,
        scanning: { status: 'running', progress: 0 },
      },
    };
    onProgress(progress);

    if (signal?.aborted) {
      throw new Error('Analysis cancelled during scanning.');
    }

    // Run a fast pre-scan to count files and detect languages for UI reporting.
    // This is a lightweight pass; the full analyze() call below does the real work.
    let fileCount = 0;
    const detectedLanguages = new Set<string>();

    try {
      const preScan = await scanDirectory(projectPath, { ignoreDirs });
      const fileNodes = preScan.nodes.filter((n) => n.type === 'file');
      fileCount = fileNodes.length;

      for (const node of fileNodes) {
        const ext = path.extname(node.filePath).toLowerCase();
        if (ext === '.ts' || ext === '.tsx') detectedLanguages.add('typescript');
        else if (ext === '.py' || ext === '.pyw') detectedLanguages.add('python');
        else if (ext === '.java') detectedLanguages.add('java');
        else if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.cjs') detectedLanguages.add('javascript');
      }
    } catch {
      // Pre-scan failure is non-fatal — proceed without counts
    }

    progress = {
      ...progress,
      status: 'scanning',
      stages: {
        ...progress.stages,
        scanning: {
          status: 'completed',
          progress: 100,
          total: fileCount,
          done: fileCount,
        },
      },
    };
    onProgress(progress);

    // -------------------------------------------------------------------------
    // Stage 2: Parsing (imports / dependency resolution)
    // -------------------------------------------------------------------------
    if (signal?.aborted) {
      throw new Error('Analysis cancelled before parsing.');
    }

    progress = {
      ...progress,
      status: 'parsing',
      stages: {
        ...progress.stages,
        parsing: { status: 'running', progress: 0, total: fileCount, done: 0 },
      },
    };
    onProgress(progress);

    // -------------------------------------------------------------------------
    // Stage 3 + Parsing: Run the full analyze() pipeline
    //
    // The core analyze() function is a monolithic call that covers both parsing
    // and graph-building internally. We report parsing at 50% and building at
    // the end to give the user meaningful feedback.
    // -------------------------------------------------------------------------
    if (signal?.aborted) {
      throw new Error('Analysis cancelled before building.');
    }

    // Report mid-way parsing progress
    progress = {
      ...progress,
      status: 'parsing',
      stages: {
        ...progress.stages,
        parsing: {
          status: 'running',
          progress: 40,
          total: fileCount,
          done: Math.floor(fileCount * 0.4),
        },
      },
    };
    onProgress(progress);

    const result = await analyze(projectPath, { ignoreDirs });

    if (signal?.aborted) {
      throw new Error('Analysis cancelled after completion.');
    }

    // Mark parsing complete
    progress = {
      ...progress,
      status: 'parsing',
      stages: {
        ...progress.stages,
        parsing: {
          status: 'completed',
          progress: 100,
          total: fileCount,
          done: fileCount,
        },
      },
    };
    onProgress(progress);

    // -------------------------------------------------------------------------
    // Stage 3: Building (graph assembly)
    // -------------------------------------------------------------------------
    progress = {
      ...progress,
      status: 'building',
      stages: {
        ...progress.stages,
        building: {
          status: 'running',
          progress: 50,
          total: result.stats.totalNodes,
          done: Math.floor(result.stats.totalNodes / 2),
        },
      },
    };
    onProgress(progress);

    // Building is already complete at this point (part of analyze()), so
    // immediately report 100%.
    progress = {
      ...progress,
      status: 'building',
      stages: {
        ...progress.stages,
        building: {
          status: 'completed',
          progress: 100,
          total: result.stats.totalNodes,
          done: result.stats.totalNodes,
        },
      },
    };
    onProgress(progress);

    // -------------------------------------------------------------------------
    // Complete
    // -------------------------------------------------------------------------
    progress = {
      ...progress,
      status: 'completed',
      completedAt: new Date().toISOString(),
    };
    onProgress(progress);

    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    progress = {
      ...progress,
      status: 'failed',
      error: errorMessage,
      completedAt: new Date().toISOString(),
      stages: {
        scanning: progress.stages.scanning.status === 'running'
          ? { ...progress.stages.scanning, status: 'failed' }
          : progress.stages.scanning,
        parsing: progress.stages.parsing.status === 'running'
          ? { ...progress.stages.parsing, status: 'failed' }
          : progress.stages.parsing,
        building: progress.stages.building.status === 'running'
          ? { ...progress.stages.building, status: 'failed' }
          : progress.stages.building,
      },
    };
    onProgress(progress);
    throw err;
  }
}
