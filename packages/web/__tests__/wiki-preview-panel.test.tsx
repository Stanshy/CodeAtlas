/**
 * WikiPreviewPanel component unit tests
 *
 * Coverage:
 *   - Shows "select a node" message when no node selected
 *   - Renders markdown content when node is selected
 *   - Shows AI analysis button
 *
 * External deps mocked:
 *   - ../src/api/wiki: fetchWikiPage returns null by default
 *   - ../src/api/graph: getAIJob
 *   - ../src/contexts/ViewStateContext: useViewStateDispatch returns a vi.fn()
 *
 * Sprint 19 — T17: Testing and Regression
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks must be declared before component imports
// ---------------------------------------------------------------------------

vi.mock('../src/api/wiki', () => ({
  fetchWikiPage: vi.fn().mockResolvedValue(null),
}));

vi.mock('../src/api/graph', () => ({
  getAIJob: vi.fn().mockResolvedValue({ job: { status: 'pending' } }),
}));

const mockDispatch = vi.fn();

vi.mock('../src/contexts/ViewStateContext', () => ({
  useViewStateDispatch: vi.fn(() => mockDispatch),
}));

import { WikiPreviewPanel } from '../src/components/WikiPreviewPanel';
import type { WikiPreviewPanelProps } from '../src/components/WikiPreviewPanel';
import type { WikiSimNode } from '../src/types/wiki';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSimNode(overrides: Partial<WikiSimNode> = {}): WikiSimNode {
  return {
    slug: 'concept--authentication',
    displayName: 'Authentication',
    type: 'concept',
    mdPath: 'concepts/concept--authentication.md',
    sourceFiles: ['src/auth/login.ts'],
    radius: 8,
    hasAiContent: false,
    ...overrides,
  };
}

function makeProps(overrides: Partial<WikiPreviewPanelProps> = {}): WikiPreviewPanelProps {
  return {
    selectedNode: null,
    allNodes: [],
    onSelectNode: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

describe('WikiPreviewPanel — empty state', () => {
  it('renders without crashing when no node is selected', () => {
    const { container } = render(
      React.createElement(WikiPreviewPanel, makeProps()),
    );
    expect(container).toBeDefined();
  });

  it('shows "select a node" guidance when selectedNode is null', () => {
    const { container } = render(
      React.createElement(WikiPreviewPanel, makeProps({ selectedNode: null })),
    );
    expect(container.textContent).toContain('Select a node to preview');
  });

  it('has the Wiki 預覽面板 aria-label', () => {
    const { container } = render(
      React.createElement(WikiPreviewPanel, makeProps({ selectedNode: null })),
    );
    const panel = container.querySelector('[aria-label="Wiki 預覽面板"]');
    expect(panel).not.toBeNull();
  });
});

describe('WikiPreviewPanel — node selected', () => {
  it('renders the node displayName when a node is selected', () => {
    const selectedNode = makeSimNode({ displayName: 'Authentication Flow' });
    const { container } = render(
      React.createElement(WikiPreviewPanel, makeProps({ selectedNode })),
    );
    expect(container.textContent).toContain('Authentication Flow');
  });

  it('shows the AI analysis button when a node is selected', () => {
    const selectedNode = makeSimNode();
    const { container } = render(
      React.createElement(WikiPreviewPanel, makeProps({ selectedNode })),
    );
    expect(container.textContent).toContain('AI Deep Analysis');
  });

  it('renders the type badge for the selected node', () => {
    const selectedNode = makeSimNode({ type: 'architecture' });
    const { container } = render(
      React.createElement(WikiPreviewPanel, makeProps({ selectedNode })),
    );
    // Type is shown as a badge
    expect(container.textContent).toContain('architecture');
  });
});
