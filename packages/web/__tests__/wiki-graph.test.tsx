/**
 * WikiGraph component unit tests
 *
 * Coverage:
 *   - WikiGraph renders without crash
 *   - Shows "not generated" message when manifest status is not_generated
 *   - Shows loading state initially
 *   - Renders SVG element when data is available
 *
 * The useWikiGraph hook is mocked to control manifest status.
 * D3-force is mocked to avoid simulation side effects in tests.
 *
 * Sprint 19 — T17: Testing and Regression
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mock D3 force simulation (prevents requestAnimationFrame/timer issues)
// ---------------------------------------------------------------------------

vi.mock('d3-force', () => ({
  forceSimulation: vi.fn(() => ({
    nodes: vi.fn().mockReturnThis(),
    force: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    alpha: vi.fn().mockReturnThis(),
    restart: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    alphaTarget: vi.fn().mockReturnThis(),
    fix: vi.fn().mockReturnThis(),
  })),
  forceLink: vi.fn(() => ({
    id: vi.fn().mockReturnThis(),
    distance: vi.fn().mockReturnThis(),
  })),
  forceManyBody: vi.fn(() => ({
    strength: vi.fn().mockReturnThis(),
  })),
  forceCenter: vi.fn(() => ({})),
  forceCollide: vi.fn(() => ({
    radius: vi.fn().mockReturnThis(),
  })),
}));

// ---------------------------------------------------------------------------
// Mock useWikiGraph hook
// ---------------------------------------------------------------------------

const mockGraphDefault = {
  isLoading: true,
  manifestStatus: 'loading' as const,
  visibleNodes: [],
  visibleLinks: [],
  allNodes: [],
  totalCount: 0,
  selectedSlug: null,
  hoveredSlug: null,
  levelFilter: { L1: true, L2: true, L3: false },
  selectNode: vi.fn(),
  hoverNode: vi.fn(),
  toggleLevel: vi.fn(),
  reheat: vi.fn(),
  fixNode: vi.fn(),
  releaseNode: vi.fn(),
};

const mockGraphState = { ...mockGraphDefault };

vi.mock('../src/hooks/useWikiGraph', () => ({
  useWikiGraph: vi.fn(() => mockGraphState),
}));

// ---------------------------------------------------------------------------
// Mock WikiPreviewPanel to avoid context dependencies
// ---------------------------------------------------------------------------

vi.mock('../src/components/WikiPreviewPanel', () => ({
  WikiPreviewPanel: () => React.createElement('div', { 'data-testid': 'wiki-preview-panel' }),
}));

// ---------------------------------------------------------------------------
// Mock WikiNodeCircle
// ---------------------------------------------------------------------------

vi.mock('../src/components/WikiNodeCircle', () => ({
  WikiNodeCircle: ({ node }: { node: { slug: string; title: string } }) =>
    React.createElement('g', { 'data-testid': `node-${node.slug}` }),
}));

// ---------------------------------------------------------------------------
// Mock ResizeObserver (not available in jsdom)
// ---------------------------------------------------------------------------

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import { WikiGraph } from '../src/components/WikiGraph';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  Object.assign(mockGraphState, mockGraphDefault);
  vi.clearAllMocks();
});

describe('WikiGraph', () => {
  it('renders without crashing', () => {
    const { container } = render(React.createElement(WikiGraph));
    expect(container).toBeDefined();
  });

  it('shows loading state initially when isLoading is true', () => {
    mockGraphState.isLoading = true;
    mockGraphState.manifestStatus = 'loading' as any;

    const { container } = render(React.createElement(WikiGraph));

    // Loading state renders a loading indicator, not an SVG
    const svgs = container.querySelectorAll('svg');
    // In loading state, no main SVG canvas is rendered
    expect(container.textContent).toContain('Loading knowledge graph');
  });

  it('shows not-generated message when manifestStatus is not_generated', () => {
    mockGraphState.isLoading = false;
    mockGraphState.manifestStatus = 'not_generated' as any;

    const { container } = render(React.createElement(WikiGraph));

    // Should show the "not generated" guidance text
    expect(container.textContent).toContain('codeatlas wiki');
  });

  it('renders SVG canvas when data is available', () => {
    mockGraphState.isLoading = false;
    mockGraphState.manifestStatus = 'ready' as any;
    mockGraphState.visibleNodes = [];
    mockGraphState.visibleLinks = [];
    mockGraphState.totalCount = 0;

    const { container } = render(React.createElement(WikiGraph));

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });
});
