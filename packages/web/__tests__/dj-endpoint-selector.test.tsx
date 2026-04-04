/**
 * DJEndpointSelector component unit tests
 *
 * Coverage:
 *   - Categorizes endpoints by URL prefix (videos, auth, billing, api)
 *   - Renders endpoint cards with correct HTTP method + path
 *   - Calls onEndpointClick when an endpoint card is clicked
 *   - Shows fallback message when no endpoints exist
 *   - Groups multiple endpoints under same category
 *   - Handles endpoints with non-versioned paths
 *
 * Sprint 13 — T8
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DJEndpointSelector } from '../src/components/DJEndpointSelector';
import type { EndpointGraph } from '../src/types/graph';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEndpointGraph(
  nodes: Array<{
    id: string;
    label: string;
    method?: string;
    path?: string;
    filePath?: string;
    kind?: 'endpoint' | 'method' | 'handler';
  }>,
  edges: Array<{ source: string; target: string; weight: number }> = [],
): EndpointGraph {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      label: n.label,
      method: n.method,
      path: n.path,
      filePath: n.filePath ?? 'src/routes/api.ts',
      kind: n.kind ?? 'endpoint',
    })),
    edges,
  };
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('DJEndpointSelector — empty state', () => {
  it('shows fallback message when no endpoints exist', () => {
    const graph = makeEndpointGraph([]);
    render(
      React.createElement(DJEndpointSelector, {
        endpointGraph: graph,
        onEndpointClick: vi.fn(),
      }),
    );
    expect(screen.getByText(/未偵測到 API 端點/)).toBeTruthy();
  });

  it('does not render category groups when graph has no endpoint-kind nodes', () => {
    const graph = makeEndpointGraph([
      { id: 'm1', label: 'getUser', kind: 'method' },
    ]);
    const { container } = render(
      React.createElement(DJEndpointSelector, {
        endpointGraph: graph,
        onEndpointClick: vi.fn(),
      }),
    );
    expect(container.textContent).toContain('未偵測到 API 端點');
  });
});

// ---------------------------------------------------------------------------
// Endpoint rendering
// ---------------------------------------------------------------------------

describe('DJEndpointSelector — endpoint rendering', () => {
  it('renders an endpoint card with the correct HTTP method', () => {
    const graph = makeEndpointGraph([
      { id: 'ep1', label: 'GET /api/v1/videos', method: 'GET', path: '/api/v1/videos' },
    ]);
    render(
      React.createElement(DJEndpointSelector, {
        endpointGraph: graph,
        onEndpointClick: vi.fn(),
      }),
    );
    expect(screen.getByText('GET')).toBeTruthy();
  });

  it('renders an endpoint card with the correct path', () => {
    const graph = makeEndpointGraph([
      { id: 'ep1', label: 'POST endpoint', method: 'POST', path: '/api/v1/videos/upload' },
    ]);
    render(
      React.createElement(DJEndpointSelector, {
        endpointGraph: graph,
        onEndpointClick: vi.fn(),
      }),
    );
    expect(screen.getByText('/api/v1/videos/upload')).toBeTruthy();
  });

  it('renders the main title header', () => {
    const graph = makeEndpointGraph([
      { id: 'ep1', label: 'GET /items', method: 'GET', path: '/items' },
    ]);
    render(
      React.createElement(DJEndpointSelector, {
        endpointGraph: graph,
        onEndpointClick: vi.fn(),
      }),
    );
    expect(screen.getByText('選擇 API 端點 — 資料旅程')).toBeTruthy();
  });

  it('renders the subtitle text', () => {
    const graph = makeEndpointGraph([
      { id: 'ep1', label: 'GET /items', method: 'GET', path: '/items' },
    ]);
    render(
      React.createElement(DJEndpointSelector, {
        endpointGraph: graph,
        onEndpointClick: vi.fn(),
      }),
    );
    expect(screen.getByText(/stagger 動畫/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// URL prefix categorization
// ---------------------------------------------------------------------------

describe('DJEndpointSelector — URL prefix categorization', () => {
  it('categorizes /api/v1/videos/* as Videos group', () => {
    const graph = makeEndpointGraph([
      { id: 'ep1', label: 'GET /api/v1/videos', method: 'GET', path: '/api/v1/videos' },
    ]);
    render(
      React.createElement(DJEndpointSelector, {
        endpointGraph: graph,
        onEndpointClick: vi.fn(),
      }),
    );
    expect(screen.getByText('Videos')).toBeTruthy();
  });

  it('categorizes /api/v1/auth/* as Auth group', () => {
    const graph = makeEndpointGraph([
      { id: 'ep1', label: 'POST /api/v1/auth/login', method: 'POST', path: '/api/v1/auth/login' },
    ]);
    render(
      React.createElement(DJEndpointSelector, {
        endpointGraph: graph,
        onEndpointClick: vi.fn(),
      }),
    );
    expect(screen.getByText('Auth')).toBeTruthy();
  });

  it('categorizes /api/v1/billing/* as Billing group', () => {
    const graph = makeEndpointGraph([
      { id: 'ep1', label: 'POST /api/v1/billing/subscribe', method: 'POST', path: '/api/v1/billing/subscribe' },
    ]);
    render(
      React.createElement(DJEndpointSelector, {
        endpointGraph: graph,
        onEndpointClick: vi.fn(),
      }),
    );
    expect(screen.getByText('Billing')).toBeTruthy();
  });

  it('categorizes unrecognized prefix as API group', () => {
    const graph = makeEndpointGraph([
      { id: 'ep1', label: 'GET /api/v1/reports', method: 'GET', path: '/api/v1/reports' },
    ]);
    render(
      React.createElement(DJEndpointSelector, {
        endpointGraph: graph,
        onEndpointClick: vi.fn(),
      }),
    );
    expect(screen.getByText('API')).toBeTruthy();
  });

  it('groups multiple endpoints under same category', () => {
    const graph = makeEndpointGraph([
      { id: 'ep1', label: 'GET /api/v1/videos', method: 'GET', path: '/api/v1/videos' },
      { id: 'ep2', label: 'POST /api/v1/videos/upload', method: 'POST', path: '/api/v1/videos/upload' },
    ]);
    render(
      React.createElement(DJEndpointSelector, {
        endpointGraph: graph,
        onEndpointClick: vi.fn(),
      }),
    );
    // Only one "Videos" heading should appear (grouped)
    const videosElements = screen.getAllByText('Videos');
    expect(videosElements).toHaveLength(1);
    // Both endpoints rendered
    expect(screen.getByText('/api/v1/videos')).toBeTruthy();
    expect(screen.getByText('/api/v1/videos/upload')).toBeTruthy();
  });

  it('renders separate category groups for different prefixes', () => {
    const graph = makeEndpointGraph([
      { id: 'ep1', label: 'GET /api/v1/videos', method: 'GET', path: '/api/v1/videos' },
      { id: 'ep2', label: 'POST /api/v1/auth/login', method: 'POST', path: '/api/v1/auth/login' },
    ]);
    render(
      React.createElement(DJEndpointSelector, {
        endpointGraph: graph,
        onEndpointClick: vi.fn(),
      }),
    );
    expect(screen.getByText('Videos')).toBeTruthy();
    expect(screen.getByText('Auth')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Click interaction
// ---------------------------------------------------------------------------

describe('DJEndpointSelector — click interaction', () => {
  it('calls onEndpointClick when an endpoint card is clicked', () => {
    const onEndpointClick = vi.fn();
    const graph = makeEndpointGraph([
      { id: 'ep1', label: 'GET /api/v1/videos', method: 'GET', path: '/api/v1/videos' },
    ]);
    render(
      React.createElement(DJEndpointSelector, {
        endpointGraph: graph,
        onEndpointClick,
      }),
    );
    // Click the card via its role="button"
    const button = screen.getByRole('button', { name: /選擇端點/ });
    fireEvent.click(button);
    expect(onEndpointClick).toHaveBeenCalledTimes(1);
  });

  it('calls onEndpointClick with the endpoint node id', () => {
    const onEndpointClick = vi.fn();
    const graph = makeEndpointGraph([
      { id: 'ep-test-123', label: 'GET /api/v1/auth/me', method: 'GET', path: '/api/v1/auth/me' },
    ]);
    render(
      React.createElement(DJEndpointSelector, {
        endpointGraph: graph,
        onEndpointClick,
      }),
    );
    const button = screen.getByRole('button', { name: /選擇端點/ });
    fireEvent.click(button);
    expect(onEndpointClick).toHaveBeenCalledWith('ep-test-123', expect.any(Object));
  });

  it('calls onEndpointClick with a chain object as second argument', () => {
    const onEndpointClick = vi.fn();
    const graph = makeEndpointGraph([
      { id: 'ep1', label: 'POST /api/v1/billing/pay', method: 'POST', path: '/api/v1/billing/pay' },
    ]);
    render(
      React.createElement(DJEndpointSelector, {
        endpointGraph: graph,
        onEndpointClick,
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /選擇端點/ }));
    const [, chain] = onEndpointClick.mock.calls[0];
    expect(chain).toHaveProperty('id');
    expect(chain).toHaveProperty('steps');
    expect(Array.isArray(chain.steps)).toBe(true);
  });

  it('shows step count badge on endpoint card', () => {
    const onEndpointClick = vi.fn();
    const graph = makeEndpointGraph([
      { id: 'ep1', label: 'GET /api/v1/videos', method: 'GET', path: '/api/v1/videos' },
    ]);
    render(
      React.createElement(DJEndpointSelector, {
        endpointGraph: graph,
        onEndpointClick,
      }),
    );
    // The card should show "N steps" badge
    expect(screen.getByText(/steps/)).toBeTruthy();
  });
});
