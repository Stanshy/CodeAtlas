/**
 * RightPanel component unit tests
 *
 * Coverage:
 *   - Renders SFDetailPanel wrapper when perspective is 'system-framework'
 *   - Renders null when perspective is 'logic-operation' and loSelectedStep is null
 *   - Renders LODetailPanel wrapper when perspective is 'logic-operation' and loSelectedStep is set
 *   - Renders null when perspective is 'data-journey' and djEndpointId/djChain are null
 *   - Renders DJPanel wrapper when perspective is 'data-journey' with endpoint + chain
 *   - Renders null for unknown perspective
 *   - Switches cleanly between perspectives
 *
 * Sprint 13 — T8
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mock child panels so tests focus only on RightPanel switching logic
// ---------------------------------------------------------------------------

vi.mock('../src/components/SFDetailPanel', () => ({
  SFDetailPanel: ({ selectedNodeId }: { selectedNodeId: string | null }) =>
    React.createElement('div', { 'data-testid': 'sf-detail-panel', 'data-selected': selectedNodeId }),
}));

vi.mock('../src/components/LODetailPanel', () => ({
  LODetailPanel: ({ selectedStep }: { selectedStep: unknown }) =>
    React.createElement('div', { 'data-testid': 'lo-detail-panel', 'data-has-step': selectedStep ? 'true' : 'false' }),
}));

vi.mock('../src/components/DJPanel', () => ({
  DJPanel: ({ endpointId }: { endpointId: string }) =>
    React.createElement('div', { 'data-testid': 'dj-panel', 'data-endpoint': endpointId }),
}));

import { RightPanel } from '../src/components/RightPanel';
import type { RightPanelProps } from '../src/components/RightPanel';
import type { ChainStep, EndpointChain, DirectoryGraph } from '../src/types/graph';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const emptyDirectoryGraph: DirectoryGraph = { nodes: [], edges: [] };

const mockChainStep: ChainStep = {
  id: 'step-1',
  methodName: 'handleRequest',
  category: 'routes',
  filePath: 'src/routes/api.ts',
  depth: 0,
};

const mockEndpointChain: EndpointChain = {
  id: 'ep-1',
  method: 'GET',
  path: '/api/v1/items',
  desc: 'Get items',
  steps: [
    { name: 'getItems()', desc: 'Fetch items', file: 'src/services/item.ts' },
  ],
};

function makeProps(overrides: Partial<RightPanelProps> = {}): RightPanelProps {
  return {
    perspective: 'system-framework',
    sfSelectedNodeId: null,
    sfDirectoryGraph: emptyDirectoryGraph,
    sfGraphNodes: [],
    sfGraphEdges: [],
    loSelectedStep: null,
    loGraphNodes: [],
    loGraphEdges: [],
    djEndpointId: null,
    djChain: null,
    djCurrentStep: -1,
    djIsPlaying: false,
    onDjReplay: vi.fn(),
    onDjClear: vi.fn(),
    onDjStepClick: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// system-framework perspective
// ---------------------------------------------------------------------------

describe('RightPanel — system-framework perspective', () => {
  it('renders SFDetailPanel when perspective is system-framework', () => {
    const { getByTestId } = render(React.createElement(RightPanel, makeProps({ perspective: 'system-framework' })));
    expect(getByTestId('sf-detail-panel')).toBeTruthy();
  });

  it('renders SFDetailPanel even when sfSelectedNodeId is null', () => {
    const { getByTestId } = render(
      React.createElement(RightPanel, makeProps({ perspective: 'system-framework', sfSelectedNodeId: null })),
    );
    expect(getByTestId('sf-detail-panel')).toBeTruthy();
  });

  it('passes sfSelectedNodeId to SFDetailPanel', () => {
    const { getByTestId } = render(
      React.createElement(RightPanel, makeProps({ perspective: 'system-framework', sfSelectedNodeId: 'src/controllers' })),
    );
    expect(getByTestId('sf-detail-panel').getAttribute('data-selected')).toBe('src/controllers');
  });
});

// ---------------------------------------------------------------------------
// logic-operation perspective
// ---------------------------------------------------------------------------

describe('RightPanel — logic-operation perspective', () => {
  it('renders null when perspective is logic-operation and loSelectedStep is null', () => {
    const { container } = render(
      React.createElement(RightPanel, makeProps({ perspective: 'logic-operation', loSelectedStep: null })),
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders LODetailPanel when perspective is logic-operation and loSelectedStep is set', () => {
    const { getByTestId } = render(
      React.createElement(RightPanel, makeProps({ perspective: 'logic-operation', loSelectedStep: mockChainStep })),
    );
    expect(getByTestId('lo-detail-panel')).toBeTruthy();
  });

  it('LODetailPanel has step data when loSelectedStep is provided', () => {
    const { getByTestId } = render(
      React.createElement(RightPanel, makeProps({ perspective: 'logic-operation', loSelectedStep: mockChainStep })),
    );
    expect(getByTestId('lo-detail-panel').getAttribute('data-has-step')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// data-journey perspective
// ---------------------------------------------------------------------------

describe('RightPanel — data-journey perspective', () => {
  it('renders null when perspective is data-journey and djEndpointId is null', () => {
    const { container } = render(
      React.createElement(RightPanel, makeProps({ perspective: 'data-journey', djEndpointId: null, djChain: null })),
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders null when perspective is data-journey and djChain is null', () => {
    const { container } = render(
      React.createElement(RightPanel, makeProps({ perspective: 'data-journey', djEndpointId: 'ep-1', djChain: null })),
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders DJPanel when perspective is data-journey with endpointId and chain', () => {
    const { getByTestId } = render(
      React.createElement(
        RightPanel,
        makeProps({ perspective: 'data-journey', djEndpointId: 'ep-1', djChain: mockEndpointChain }),
      ),
    );
    expect(getByTestId('dj-panel')).toBeTruthy();
  });

  it('DJPanel receives correct endpointId', () => {
    const { getByTestId } = render(
      React.createElement(
        RightPanel,
        makeProps({ perspective: 'data-journey', djEndpointId: 'endpoint-abc', djChain: mockEndpointChain }),
      ),
    );
    expect(getByTestId('dj-panel').getAttribute('data-endpoint')).toBe('endpoint-abc');
  });
});

// ---------------------------------------------------------------------------
// Default / unknown perspective
// ---------------------------------------------------------------------------

describe('RightPanel — unknown perspective', () => {
  it('renders null for an unrecognized perspective string', () => {
    const { container } = render(
      React.createElement(RightPanel, makeProps({ perspective: 'unknown-perspective' })),
    );
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Perspective switching
// ---------------------------------------------------------------------------

describe('RightPanel — perspective switching', () => {
  it('shows only SFDetailPanel when switching from dj to sf perspective', () => {
    const props = makeProps({ perspective: 'data-journey', djEndpointId: 'ep-1', djChain: mockEndpointChain });
    const { rerender, queryByTestId } = render(React.createElement(RightPanel, props));
    expect(queryByTestId('dj-panel')).toBeTruthy();

    rerender(React.createElement(RightPanel, makeProps({ perspective: 'system-framework' })));
    expect(queryByTestId('sf-detail-panel')).toBeTruthy();
    expect(queryByTestId('dj-panel')).toBeNull();
  });

  it('shows only LODetailPanel when switching from sf to lo perspective with selection', () => {
    const sfProps = makeProps({ perspective: 'system-framework', sfSelectedNodeId: 'src' });
    const { rerender, queryByTestId } = render(React.createElement(RightPanel, sfProps));
    expect(queryByTestId('sf-detail-panel')).toBeTruthy();

    const loProps = makeProps({ perspective: 'logic-operation', loSelectedStep: mockChainStep });
    rerender(React.createElement(RightPanel, loProps));
    expect(queryByTestId('lo-detail-panel')).toBeTruthy();
    expect(queryByTestId('sf-detail-panel')).toBeNull();
  });

  it('hides LODetailPanel when switching lo→sf and lo had no selection', () => {
    const loProps = makeProps({ perspective: 'logic-operation', loSelectedStep: null });
    const { rerender, container, queryByTestId } = render(React.createElement(RightPanel, loProps));
    expect(container.firstChild).toBeNull();

    rerender(React.createElement(RightPanel, makeProps({ perspective: 'system-framework' })));
    expect(queryByTestId('sf-detail-panel')).toBeTruthy();
  });
});
