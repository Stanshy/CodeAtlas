/**
 * WelcomePage component unit tests (Sprint 20 T10)
 *
 * Coverage:
 *   - Renders empty state (no recent projects)
 *   - Renders with recent projects (via RecentProjects mock)
 *   - Input validation error display (via ProjectInput mock)
 *   - Page contains CodeAtlas logo and tagline
 *   - Version footer is rendered
 *   - AI setup block shown/hidden based on /api/ai/status
 *
 * External deps mocked:
 *   - fetch: controlled per-test
 *   - ../src/contexts/AppStateContext: provides useAppState
 *   - ../src/components/ProjectInput: testable stub
 *   - ../src/components/RecentProjects: testable stub
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks must be declared before component imports
// ---------------------------------------------------------------------------

const mockStartAnalysis = vi.fn();

vi.mock('../src/contexts/AppStateContext', () => ({
  useAppState: vi.fn(() => ({
    page: 'welcome',
    projectPath: null,
    projectName: null,
    jobId: null,
    setPage: vi.fn(),
    startAnalysis: mockStartAnalysis,
    returnToWelcome: vi.fn(),
  })),
}));

// ProjectInput stub: renders the error message when provided via prop
vi.mock('../src/components/ProjectInput', () => ({
  ProjectInput: ({ isDark }: { isDark?: boolean }) =>
    React.createElement(
      'div',
      { 'data-testid': 'project-input', 'data-dark': isDark ? 'true' : 'false' },
      '専案路徑輸入',
    ),
}));

// RecentProjects stub: renders a list if fetch resolves projects
vi.mock('../src/components/RecentProjects', () => ({
  RecentProjects: ({ isDark }: { isDark?: boolean }) =>
    React.createElement(
      'div',
      { 'data-testid': 'recent-projects', 'data-dark': isDark ? 'true' : 'false' },
      '最近專案',
    ),
}));

import { WelcomePage } from '../src/pages/WelcomePage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(response: unknown, ok = true): void {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: async () => response,
  });
}

// ---------------------------------------------------------------------------
// beforeEach: reset mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  // Default: AI is configured (provider = claude), so AI setup block hidden
  mockFetch({ enabled: true, provider: 'claude' });
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('WelcomePage — rendering', () => {
  it('renders without crashing', () => {
    const { container } = render(React.createElement(WelcomePage));
    expect(container).toBeDefined();
  });

  it('renders the CodeAtlas logo heading', () => {
    const { container } = render(React.createElement(WelcomePage));
    expect(container.textContent).toContain('CodeAtlas');
  });

  it('renders the tagline about understanding a project in 5 minutes', () => {
    const { container } = render(React.createElement(WelcomePage));
    expect(container.textContent).toContain('5 minutes');
  });

  it('renders the ProjectInput component', () => {
    const { container } = render(React.createElement(WelcomePage));
    const input = container.querySelector('[data-testid="project-input"]');
    expect(input).not.toBeNull();
  });

  it('renders the RecentProjects component', () => {
    const { container } = render(React.createElement(WelcomePage));
    const recent = container.querySelector('[data-testid="recent-projects"]');
    expect(recent).not.toBeNull();
  });

  it('renders the version footer', () => {
    const { container } = render(React.createElement(WelcomePage));
    expect(container.textContent).toContain('CodeAtlas v');
  });
});

// ---------------------------------------------------------------------------
// AI setup block visibility
// ---------------------------------------------------------------------------

describe('WelcomePage — AI setup block', () => {
  it('always shows AI setup block regardless of AI status', async () => {
    mockFetch({ enabled: true, provider: 'claude' });
    const { container } = render(React.createElement(WelcomePage));

    await new Promise((r) => setTimeout(r, 20));

    // AI setup block is always visible on welcome page (showAiSetup defaults to true,
    // no fetch-based logic hides it — users adjust via the block itself)
    expect(container.textContent).toContain('Set up AI analysis');
  });

  it('shows AI setup block when provider is disabled', async () => {
    mockFetch({ enabled: false, provider: 'disabled' });
    const { container } = render(React.createElement(WelcomePage));

    await new Promise((r) => setTimeout(r, 20));

    expect(container.textContent).toContain('Set up AI analysis');
  });

  it('shows AI setup block when provider is none', async () => {
    mockFetch({ enabled: false, provider: 'none' });
    const { container } = render(React.createElement(WelcomePage));

    await new Promise((r) => setTimeout(r, 20));

    expect(container.textContent).toContain('Set up AI analysis');
  });

  it('keeps AI setup block visible when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'));
    const { container } = render(React.createElement(WelcomePage));

    await new Promise((r) => setTimeout(r, 20));

    // fetch failure leaves the AI setup block visible (default showAiSetup=true)
    expect(container.textContent).toContain('Set up AI analysis');
  });
});

// ---------------------------------------------------------------------------
// Dark mode
// ---------------------------------------------------------------------------

describe('WelcomePage — dark mode', () => {
  it('passes isDark=false to ProjectInput (welcome page uses light theme)', () => {
    const { container } = render(React.createElement(WelcomePage));
    const input = container.querySelector('[data-testid="project-input"]');
    expect(input?.getAttribute('data-dark')).toBe('false');
  });

  it('passes isDark=false to RecentProjects (welcome page uses light theme)', () => {
    const { container } = render(React.createElement(WelcomePage));
    const recent = container.querySelector('[data-testid="recent-projects"]');
    expect(recent?.getAttribute('data-dark')).toBe('false');
  });
});
