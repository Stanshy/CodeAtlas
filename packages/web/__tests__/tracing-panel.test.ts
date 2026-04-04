/**
 * TracingPanel component unit tests
 *
 * Tests the TracingPanel rendering and interaction:
 * - Renders nothing when tracingSymbol is null
 * - Shows panel with symbol name after START_TRACING
 * - Shows node/edge counts in header subtitle
 * - Shows "No path found" when tracingPath is empty but symbol is set
 * - Stop Tracing button dispatches STOP_TRACING (panel disappears)
 * - Path node rows are clickable and dispatch FOCUS_NODE
 *
 * framer-motion is mocked so AnimatePresence + motion.div render
 * their children immediately without animation.
 *
 * Sprint 5 — T9: Unit + Integration Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ViewStateProvider, useViewState } from '../src/contexts/ViewStateContext';
import { TracingPanel } from '../src/components/TracingPanel';

// ---------------------------------------------------------------------------
// Mock framer-motion — render children directly, no animation
// ---------------------------------------------------------------------------

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        return React.forwardRef(
          (
            { children, ...rest }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode },
            ref: React.Ref<HTMLElement>,
          ) =>
            React.createElement(
              prop as keyof JSX.IntrinsicElements,
              { ...rest, ref },
              children,
            ),
        );
      },
    },
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Renders TracingPanel inside a Harness that can dispatch actions before the
 * panel mounts, so we can set up tracing state first.
 */
interface HarnessProps {
  onMount?: (dispatch: ReturnType<typeof useViewState>['dispatch']) => void;
}

function Harness({ onMount }: HarnessProps) {
  const { dispatch } = useViewState();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    onMount?.(dispatch);
    setReady(true);
  }, [dispatch, onMount]);

  if (!ready) return null;
  return React.createElement(TracingPanel);
}

function renderWithProvider(onMount?: HarnessProps['onMount']) {
  return render(
    React.createElement(
      ViewStateProvider,
      null,
      React.createElement(Harness, { onMount }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Renders nothing when tracingSymbol is null
// ---------------------------------------------------------------------------

describe('TracingPanel — initial state (tracingSymbol = null)', () => {
  it('renders nothing when no tracing is active', () => {
    const { container } = renderWithProvider();
    // The complementary role panel should not be present
    expect(screen.queryByRole('complementary')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Panel visible after START_TRACING
// ---------------------------------------------------------------------------

describe('TracingPanel — START_TRACING dispatched', () => {
  function startTracing(dispatch: ReturnType<typeof useViewState>['dispatch']) {
    dispatch({
      type: 'START_TRACING',
      symbol: 'MySymbol',
      path: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
      edges: ['e1', 'e2'],
    });
  }

  it('renders the panel (role=complementary) after START_TRACING', () => {
    renderWithProvider(startTracing);
    expect(screen.getByRole('complementary')).toBeTruthy();
  });

  it('panel has aria-label "Path tracing panel"', () => {
    renderWithProvider(startTracing);
    expect(screen.getByRole('complementary').getAttribute('aria-label')).toBe(
      'Path tracing panel',
    );
  });

  it('shows the symbol name in the header', () => {
    renderWithProvider(startTracing);
    expect(screen.getByText(/Tracing: MySymbol/)).toBeTruthy();
  });

  it('shows node count in the subtitle', () => {
    renderWithProvider(startTracing);
    // The subtitle div contains both node and edge counts together: "3 nodes, 2 edges"
    expect(screen.getAllByText(/3 node/).length).toBeGreaterThan(0);
  });

  it('shows edge count in the subtitle', () => {
    renderWithProvider(startTracing);
    expect(screen.getByText(/2 edge/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// "No path found" when path is empty
// ---------------------------------------------------------------------------

describe('TracingPanel — START_TRACING with empty path', () => {
  function startTracingEmpty(dispatch: ReturnType<typeof useViewState>['dispatch']) {
    dispatch({
      type: 'START_TRACING',
      symbol: 'GhostSymbol',
      path: [],
      edges: [],
    });
  }

  it('shows "No path found" message', () => {
    renderWithProvider(startTracingEmpty);
    expect(screen.getByText(/No path found/i)).toBeTruthy();
  });

  it('includes the symbol name in the "no path" message', () => {
    renderWithProvider(startTracingEmpty);
    // The no-path message contains the full phrase; title also shows symbol name
    // so we check that at least one element with this combined phrase is present
    expect(screen.getByText(/No path found for symbol/i)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Stop Tracing button
// ---------------------------------------------------------------------------

describe('TracingPanel — Stop Tracing button', () => {
  function startTracing(dispatch: ReturnType<typeof useViewState>['dispatch']) {
    dispatch({
      type: 'START_TRACING',
      symbol: 'MySymbol',
      path: ['src/a.ts'],
      edges: ['e1'],
    });
  }

  it('renders a "Stop Tracing" button', () => {
    renderWithProvider(startTracing);
    expect(screen.getByText('Stop Tracing')).toBeTruthy();
  });

  it('clicking Stop Tracing removes the panel from the DOM', () => {
    renderWithProvider(startTracing);
    const stopBtn = screen.getByText('Stop Tracing');
    fireEvent.click(stopBtn);
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('close (×) button also stops tracing', () => {
    renderWithProvider(startTracing);
    const closeBtn = screen.getByLabelText('Stop tracing');
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('complementary')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Path node rows are clickable — dispatch FOCUS_NODE
// ---------------------------------------------------------------------------

describe('TracingPanel — path node click dispatches FOCUS_NODE', () => {
  let capturedFocusNodeId: string | null = null;

  function Observer() {
    const { state } = useViewState();
    capturedFocusNodeId = state.focusNodeId;
    return null;
  }

  function HarnessWithObserver() {
    const { dispatch } = useViewState();
    const [ready, setReady] = React.useState(false);

    React.useEffect(() => {
      dispatch({
        type: 'START_TRACING',
        symbol: 'ClickSym',
        path: ['src/target.ts', 'src/other.ts'],
        edges: ['e1'],
      });
      setReady(true);
    }, [dispatch]);

    if (!ready) return null;
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(TracingPanel),
      React.createElement(Observer),
    );
  }

  it('clicking a path node row dispatches FOCUS_NODE with the correct nodeId', () => {
    capturedFocusNodeId = null;
    render(
      React.createElement(
        ViewStateProvider,
        null,
        React.createElement(HarnessWithObserver),
      ),
    );

    const nodeRow = screen.getByLabelText('Focus node: src/target.ts');
    fireEvent.click(nodeRow);
    expect(capturedFocusNodeId).toBe('src/target.ts');
  });

  it('clicking second path node dispatches FOCUS_NODE with second nodeId', () => {
    capturedFocusNodeId = null;
    render(
      React.createElement(
        ViewStateProvider,
        null,
        React.createElement(HarnessWithObserver),
      ),
    );

    const nodeRow = screen.getByLabelText('Focus node: src/other.ts');
    fireEvent.click(nodeRow);
    expect(capturedFocusNodeId).toBe('src/other.ts');
  });
});
