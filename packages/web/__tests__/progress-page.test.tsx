/**
 * ProgressPage component unit tests (Sprint 20 T11)
 *
 * Coverage:
 *   - Renders project name and path in header
 *   - Renders stage bars via ProgressStages mock
 *   - Shows cancel button while running
 *   - Shows completed footer when status is completed
 *   - Shows failed block with retry button when status is failed
 *   - Shows error message in failed block
 *   - Does not show cancel button when completed
 *   - Does not show cancel button when failed
 *
 * External deps mocked:
 *   - ../src/contexts/AppStateContext: useAppState
 *   - ../src/hooks/useAnalysisProgress: useAnalysisProgress
 *   - ../src/components/ProgressStages: stub
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import type { AnalysisProgress } from '../src/hooks/useAnalysisProgress';

// ---------------------------------------------------------------------------
// Mocks must be declared before component imports
// ---------------------------------------------------------------------------

const mockSetPage = vi.fn();
const mockReturnToWelcome = vi.fn();
const mockStartAnalysis = vi.fn();

vi.mock('../src/contexts/AppStateContext', () => ({
  useAppState: vi.fn(() => ({
    page: 'progress',
    projectPath: '/projects/my-app',
    projectName: 'my-app',
    jobId: 'job-123',
    setPage: mockSetPage,
    startAnalysis: mockStartAnalysis,
    returnToWelcome: mockReturnToWelcome,
  })),
}));

const mockUseAnalysisProgress = vi.fn();

vi.mock('../src/hooks/useAnalysisProgress', () => ({
  useAnalysisProgress: (...args: unknown[]) => mockUseAnalysisProgress(...args),
}));

vi.mock('../src/components/ProgressStages', () => ({
  ProgressStages: ({ progress }: { progress: AnalysisProgress | null }) =>
    React.createElement(
      'div',
      { 'data-testid': 'progress-stages', 'data-status': progress?.status ?? 'null' },
      'Stage bars',
    ),
}));

import { ProgressPage } from '../src/pages/ProgressPage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeScanningProgress(): AnalysisProgress {
  return {
    jobId: 'job-123',
    status: 'scanning',
    startedAt: new Date().toISOString(),
    stages: {
      scanning: { status: 'running', progress: 50 },
      parsing: { status: 'pending', progress: 0 },
      building: { status: 'pending', progress: 0 },
    },
  };
}

function makeCompletedProgress(): AnalysisProgress {
  return {
    jobId: 'job-123',
    status: 'completed',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    stages: {
      scanning: { status: 'completed', progress: 100, total: 42, done: 42 },
      parsing: { status: 'completed', progress: 100, total: 42, done: 42 },
      building: { status: 'completed', progress: 100, total: 20, done: 20 },
    },
  };
}

function makeFailedProgress(error = 'Disk write error'): AnalysisProgress {
  return {
    jobId: 'job-123',
    status: 'failed',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    error,
    stages: {
      scanning: { status: 'completed', progress: 100 },
      parsing: { status: 'failed', progress: 20 },
      building: { status: 'pending', progress: 0 },
    },
  };
}

function renderProgressPage(props?: Partial<{ jobId: string; projectPath: string; projectName: string }>) {
  const defaultProps = {
    jobId: 'job-123',
    projectPath: '/projects/my-app',
    projectName: 'my-app',
    ...props,
  };
  return render(React.createElement(ProgressPage, defaultProps));
}

// ---------------------------------------------------------------------------
// beforeEach
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  // Default: running state
  mockUseAnalysisProgress.mockReturnValue({
    progress: makeScanningProgress(),
    error: null,
  });
  // Silence fetch for cancel/retry handlers
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
});

// ---------------------------------------------------------------------------
// Header rendering
// ---------------------------------------------------------------------------

describe('ProgressPage — project header', () => {
  it('renders without crashing', () => {
    const { container } = renderProgressPage();
    expect(container).toBeDefined();
  });

  it('displays the project name in the header', () => {
    const { container } = renderProgressPage({ projectName: 'my-cool-project' });
    expect(container.textContent).toContain('my-cool-project');
  });

  it('displays the project path in the header', () => {
    const { container } = renderProgressPage({ projectPath: '/projects/my-app' });
    expect(container.textContent).toContain('/projects/my-app');
  });

  it('passes jobId to useAnalysisProgress hook', () => {
    renderProgressPage({ jobId: 'job-xyz-456' });
    expect(mockUseAnalysisProgress).toHaveBeenCalledWith('job-xyz-456');
  });
});

// ---------------------------------------------------------------------------
// Stage bars
// ---------------------------------------------------------------------------

describe('ProgressPage — stage bars', () => {
  it('renders the ProgressStages component', () => {
    const { container } = renderProgressPage();
    const stages = container.querySelector('[data-testid="progress-stages"]');
    expect(stages).not.toBeNull();
  });

  it('passes current progress to ProgressStages', () => {
    const { container } = renderProgressPage();
    const stages = container.querySelector('[data-testid="progress-stages"]');
    expect(stages?.getAttribute('data-status')).toBe('scanning');
  });

  it('passes null to ProgressStages when progress is null', () => {
    mockUseAnalysisProgress.mockReturnValue({ progress: null, error: null });
    const { container } = renderProgressPage();
    const stages = container.querySelector('[data-testid="progress-stages"]');
    expect(stages?.getAttribute('data-status')).toBe('null');
  });
});

// ---------------------------------------------------------------------------
// Running state — cancel button
// ---------------------------------------------------------------------------

describe('ProgressPage — running state', () => {
  it('shows cancel button while analysis is running', () => {
    const { container } = renderProgressPage();
    expect(container.textContent).toContain('Cancel analysis');
  });

  it('does not show completed footer while running', () => {
    const { container } = renderProgressPage();
    expect(container.textContent).not.toContain('Analysis complete!');
  });

  it('does not show failed block while running', () => {
    const { container } = renderProgressPage();
    expect(container.textContent).not.toContain('Analysis failed');
  });
});

// ---------------------------------------------------------------------------
// Completed state
// ---------------------------------------------------------------------------

describe('ProgressPage — completed state', () => {
  beforeEach(() => {
    mockUseAnalysisProgress.mockReturnValue({
      progress: makeCompletedProgress(),
      error: null,
    });
  });

  it('shows completion message when status is completed', () => {
    const { container } = renderProgressPage();
    expect(container.textContent).toContain('Analysis complete!');
  });

  it('shows View now button when completed', () => {
    const { container } = renderProgressPage();
    expect(container.textContent).toContain('View now');
  });

  it('does not show cancel button when completed', () => {
    const { container } = renderProgressPage();
    expect(container.textContent).not.toContain('Cancel analysis');
  });

  it('does not show failed block when completed', () => {
    const { container } = renderProgressPage();
    expect(container.textContent).not.toContain('Analysis failed');
  });

  it('ProgressStages receives completed status', () => {
    const { container } = renderProgressPage();
    const stages = container.querySelector('[data-testid="progress-stages"]');
    expect(stages?.getAttribute('data-status')).toBe('completed');
  });

  it('shows file count from scanning stage', () => {
    const { container } = renderProgressPage();
    // scanning.total = 42, so "42 個檔案" should appear
    expect(container.textContent).toContain('42');
  });
});

// ---------------------------------------------------------------------------
// Failed state
// ---------------------------------------------------------------------------

describe('ProgressPage — failed state', () => {
  beforeEach(() => {
    mockUseAnalysisProgress.mockReturnValue({
      progress: makeFailedProgress('Permission denied: /projects/my-app'),
      error: null,
    });
  });

  it('shows failure message when status is failed', () => {
    const { container } = renderProgressPage();
    expect(container.textContent).toContain('Analysis failed');
  });

  it('shows retry button when failed', () => {
    const { container } = renderProgressPage();
    expect(container.textContent).toContain('Retry');
  });

  it('shows Back to welcome button when failed', () => {
    const { container } = renderProgressPage();
    expect(container.textContent).toContain('Back to welcome');
  });

  it('shows the error message from progress', () => {
    const { container } = renderProgressPage();
    expect(container.textContent).toContain('Permission denied: /projects/my-app');
  });

  it('does not show cancel button when failed', () => {
    const { container } = renderProgressPage();
    expect(container.textContent).not.toContain('Cancel analysis');
  });

  it('does not show completed footer when failed', () => {
    const { container } = renderProgressPage();
    expect(container.textContent).not.toContain('Analysis complete!');
  });
});

// ---------------------------------------------------------------------------
// hookError fallback
// ---------------------------------------------------------------------------

describe('ProgressPage — hookError fallback', () => {
  it('shows hook error message in failed block when progress has no error', () => {
    const failedProgress = makeFailedProgress('');
    failedProgress.error = undefined;

    mockUseAnalysisProgress.mockReturnValue({
      progress: failedProgress,
      error: 'SSE connection dropped',
    });

    const { container } = renderProgressPage();
    expect(container.textContent).toContain('SSE connection dropped');
  });
});
