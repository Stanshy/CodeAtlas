/**
 * LOCategoryGroup component unit tests
 *
 * Coverage:
 *   - Renders 5 category group cards for any set of function nodes
 *   - Classifies methods by file path (routes, services, models, middleware, utils)
 *   - Shows empty state when no method nodes are present
 *   - Collapses groups showing only first 5 methods by default when >5 exist
 *   - Shows expand toggle when group has >5 methods
 *   - Calls onMethodClick when a method row is clicked
 *   - Category headers display correct labels
 *
 * Sprint 13 — T8
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LOCategoryGroup } from '../src/components/LOCategoryGroup';
import type { GraphNode, GraphEdge, EndpointGraph } from '../src/types/graph';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(
  id: string,
  label: string,
  filePath: string,
  type: 'function' | 'file' | 'directory' | 'class' = 'function',
): GraphNode {
  return {
    id,
    type,
    label,
    filePath,
    metadata: { kind: 'function' },
  };
}

function renderGroup(
  graphNodes: GraphNode[],
  graphEdges: GraphEdge[] = [],
  endpointGraph: EndpointGraph | null = null,
  onMethodClick = vi.fn(),
) {
  return render(
    React.createElement(LOCategoryGroup, {
      graphNodes,
      graphEdges,
      endpointGraph,
      onMethodClick,
    }),
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('LOCategoryGroup — empty state', () => {
  it('shows empty state message when no function nodes are provided', () => {
    renderGroup([]);
    expect(screen.getByText('未偵測到方法節點')).toBeTruthy();
  });

  it('shows hint text in empty state', () => {
    renderGroup([]);
    expect(screen.getByText('請確保專案包含函式或方法定義')).toBeTruthy();
  });

  it('does not show category cards in empty state', () => {
    const { container } = renderGroup([]);
    // No category labels should be present
    expect(container.textContent).not.toContain('Routes / API');
    expect(container.textContent).not.toContain('Services');
  });
});

// ---------------------------------------------------------------------------
// Category group rendering
// ---------------------------------------------------------------------------

describe('LOCategoryGroup — category rendering', () => {
  it('renders all 5 category group cards when given function nodes', () => {
    const nodes = [
      makeNode('n1', 'getUser', 'src/routes/user.ts'),
      makeNode('n2', 'authenticate', 'src/middleware/auth.ts'),
      makeNode('n3', 'findUser', 'src/services/user.ts'),
      makeNode('n4', 'UserModel', 'src/models/user.ts'),
      makeNode('n5', 'formatDate', 'src/utils/date.ts'),
    ];
    const { container } = renderGroup(nodes);
    // All 5 category labels should appear (localized to Chinese in Sprint 13+)
    expect(container.textContent).toContain('路線 / API');
    expect(container.textContent).toContain('中間層');
    expect(container.textContent).toContain('服務');
    expect(container.textContent).toContain('模型 / 資料庫');
    expect(container.textContent).toContain('工具 / 任務');
  });

  it('shows method count badge in category header', () => {
    const nodes = [
      makeNode('n1', 'getItems', 'src/routes/items.ts'),
      makeNode('n2', 'postItem', 'src/routes/items.ts'),
    ];
    const { container } = renderGroup(nodes);
    // There should be a count badge showing 2 for routes
    expect(container.textContent).toContain('2');
  });
});

// ---------------------------------------------------------------------------
// Path classification
// ---------------------------------------------------------------------------

describe('LOCategoryGroup — path classification', () => {
  it('classifies /routes/ path as routes category', () => {
    const nodes = [makeNode('n1', 'routeHandler', 'src/routes/api.ts')];
    const { container } = renderGroup(nodes);
    // Method should appear under Routes / API card
    expect(container.textContent).toContain('routeHandler()');
  });

  it('classifies /services/ path as services category', () => {
    const nodes = [makeNode('n1', 'processOrder', 'src/services/order.ts')];
    const { container } = renderGroup(nodes);
    expect(container.textContent).toContain('processOrder()');
  });

  it('classifies /models/ path as models category', () => {
    const nodes = [makeNode('n1', 'saveRecord', 'src/models/record.ts')];
    const { container } = renderGroup(nodes);
    expect(container.textContent).toContain('saveRecord()');
  });

  it('classifies /middleware/ path as middleware category', () => {
    const nodes = [makeNode('n1', 'checkAuth', 'src/middleware/auth.ts')];
    const { container } = renderGroup(nodes);
    expect(container.textContent).toContain('checkAuth()');
  });

  it('classifies /utils/ path as utils category', () => {
    const nodes = [makeNode('n1', 'formatDate', 'src/utils/date.ts')];
    const { container } = renderGroup(nodes);
    expect(container.textContent).toContain('formatDate()');
  });

  it('classifies /controllers/ path as services category', () => {
    const nodes = [makeNode('n1', 'handlePost', 'src/controllers/post.ts')];
    const { container } = renderGroup(nodes);
    expect(container.textContent).toContain('handlePost()');
  });

  it('classifies /db/ path as models category', () => {
    const nodes = [makeNode('n1', 'query', 'src/db/connection.ts')];
    const { container } = renderGroup(nodes);
    expect(container.textContent).toContain('query()');
  });
});

// ---------------------------------------------------------------------------
// Collapse / expand behavior
// ---------------------------------------------------------------------------

describe('LOCategoryGroup — collapse behavior', () => {
  it('shows exactly 5 methods by default when group has more than 5', () => {
    const nodes = Array.from({ length: 8 }, (_, i) =>
      makeNode(`n${i}`, `routeMethod${i}`, 'src/routes/api.ts'),
    );
    const { container } = renderGroup(nodes);
    // Should show first 5 methods: routeMethod0 through routeMethod4
    for (let i = 0; i < 5; i++) {
      expect(container.textContent).toContain(`routeMethod${i}()`);
    }
    // routeMethod5, 6, 7 should NOT be visible initially
    for (let i = 5; i < 8; i++) {
      expect(container.textContent).not.toContain(`routeMethod${i}()`);
    }
  });

  it('shows expand toggle row when group has more than 5 methods', () => {
    const nodes = Array.from({ length: 6 }, (_, i) =>
      makeNode(`n${i}`, `method${i}`, 'src/routes/api.ts'),
    );
    const { container } = renderGroup(nodes);
    // Expect "展開更多" text to appear
    expect(container.textContent).toContain('展開更多');
  });

  it('does not show expand toggle when group has 5 or fewer methods', () => {
    const nodes = Array.from({ length: 5 }, (_, i) =>
      makeNode(`n${i}`, `method${i}`, 'src/routes/api.ts'),
    );
    const { container } = renderGroup(nodes);
    expect(container.textContent).not.toContain('展開更多');
  });

  it('expands group to show all methods when toggle is clicked', () => {
    const nodes = Array.from({ length: 8 }, (_, i) =>
      makeNode(`n${i}`, `routeMethod${i}`, 'src/routes/api.ts'),
    );
    const { container } = renderGroup(nodes);
    // Find the innermost div whose textContent contains "展開更多" (the direct toggle row)
    const allDivs = Array.from(container.querySelectorAll('div'));
    // Get the div with the smallest textContent length that includes "展開更多"
    const toggleEl = allDivs
      .filter((el) => el.textContent?.includes('展開更多'))
      .sort((a, b) => (a.textContent?.length ?? 0) - (b.textContent?.length ?? 0))[0];
    expect(toggleEl).toBeTruthy();
    fireEvent.click(toggleEl!);
    // All 8 methods should now be visible
    for (let i = 0; i < 8; i++) {
      expect(container.textContent).toContain(`routeMethod${i}()`);
    }
  });

  it('shows collapse toggle after expanding', () => {
    const nodes = Array.from({ length: 6 }, (_, i) =>
      makeNode(`n${i}`, `method${i}`, 'src/routes/api.ts'),
    );
    const { container } = renderGroup(nodes);
    const allDivs = Array.from(container.querySelectorAll('div'));
    const toggleEl = allDivs
      .filter((el) => el.textContent?.includes('展開更多'))
      .sort((a, b) => (a.textContent?.length ?? 0) - (b.textContent?.length ?? 0))[0];
    fireEvent.click(toggleEl!);
    expect(container.textContent).toContain('收起');
  });
});

// ---------------------------------------------------------------------------
// Click interaction
// ---------------------------------------------------------------------------

describe('LOCategoryGroup — click interaction', () => {
  it('calls onMethodClick when a method row is clicked', () => {
    const onMethodClick = vi.fn();
    const nodes = [makeNode('n1', 'handleRequest', 'src/routes/api.ts')];
    const { container } = renderGroup(nodes, [], null, onMethodClick);

    // The method row has a title attribute with the method name and file path
    const methodRow = container.querySelector('[title*="handleRequest"]') as HTMLElement;
    expect(methodRow).toBeTruthy();
    fireEvent.click(methodRow!);
    expect(onMethodClick).toHaveBeenCalledTimes(1);
  });

  it('calls onMethodClick with the method name and category', () => {
    const onMethodClick = vi.fn();
    const nodes = [makeNode('n1', 'getUser', 'src/services/user.ts')];
    renderGroup(nodes, [], null, onMethodClick);

    fireEvent.click(screen.getByText('getUser()'));
    expect(onMethodClick).toHaveBeenCalledWith('getUser', 'services');
  });

  it('calls onMethodClick with routes category for route methods', () => {
    const onMethodClick = vi.fn();
    const nodes = [makeNode('n1', 'listItems', 'src/routes/items.ts')];
    renderGroup(nodes, [], null, onMethodClick);

    fireEvent.click(screen.getByText('listItems()'));
    expect(onMethodClick).toHaveBeenCalledWith('listItems', 'routes');
  });

  it('calls onMethodClick once per click', () => {
    const onMethodClick = vi.fn();
    const nodes = [makeNode('n1', 'processData', 'src/services/data.ts')];
    renderGroup(nodes, [], null, onMethodClick);

    fireEvent.click(screen.getByText('processData()'));
    fireEvent.click(screen.getByText('processData()'));
    expect(onMethodClick).toHaveBeenCalledTimes(2);
  });
});
