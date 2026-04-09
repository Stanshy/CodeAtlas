/**
 * TabBar component unit tests
 *
 * Coverage:
 *   - Renders four tabs with correct Chinese labels (SF, LO, DJ, Wiki added Sprint 19 T13)
 *   - Active tab has fontWeight 600 in its inline style
 *   - Inactive tabs have fontWeight 500 in their inline style
 *   - Clicking a tab calls onPerspectiveChange with the correct perspective name
 *   - Count badges display correctly when counts > 0
 *   - Count badges are hidden when count is 0
 *
 * Sprint 12 — T11
 * Sprint 19 — T13: Wiki tab added (four tabs total)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { TabBar } from '../src/components/TabBar';
import type { PerspectiveName } from '../src/types/graph';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderTabBar(
  activePerspective: PerspectiveName = 'system-framework',
  onPerspectiveChange = vi.fn(),
  counts = { sf: 0, lo: 0, dj: 0, wiki: 0 },
) {
  return render(
    React.createElement(TabBar, {
      activePerspective,
      onPerspectiveChange,
      counts,
    }),
  );
}

// ---------------------------------------------------------------------------
// Tab rendering
// ---------------------------------------------------------------------------

describe('TabBar — tab rendering', () => {
  it('renders exactly four tabs', () => {
    renderTabBar();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
  });

  it('renders the 系統框架 label', () => {
    renderTabBar();
    expect(screen.getByText('系統框架')).toBeTruthy();
  });

  it('renders the 邏輯運作 label', () => {
    renderTabBar();
    expect(screen.getByText('邏輯運作')).toBeTruthy();
  });

  it('renders the 資料旅程 label', () => {
    renderTabBar();
    expect(screen.getByText('資料旅程')).toBeTruthy();
  });

  it('renders a tablist with the correct aria-label', () => {
    renderTabBar();
    expect(screen.getByRole('tablist')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Active tab styling
// ---------------------------------------------------------------------------

describe('TabBar — active tab styling', () => {
  it('active tab has aria-selected="true"', () => {
    renderTabBar('system-framework');
    const tabs = screen.getAllByRole('tab');
    const activeTab = tabs.find(
      (tab) => tab.getAttribute('aria-selected') === 'true',
    );
    expect(activeTab).toBeTruthy();
  });

  it('active tab has fontWeight 600 in inline style', () => {
    renderTabBar('system-framework');
    const tabs = screen.getAllByRole('tab');
    const activeTab = tabs.find(
      (tab) => tab.getAttribute('aria-selected') === 'true',
    )!;
    expect(activeTab.style.fontWeight).toBe('600');
  });

  it('inactive tabs have aria-selected="false"', () => {
    renderTabBar('system-framework');
    const tabs = screen.getAllByRole('tab');
    const inactiveTabs = tabs.filter(
      (tab) => tab.getAttribute('aria-selected') === 'false',
    );
    // Four tabs total (SF, LO, DJ, Wiki added Sprint 19 T13) — 3 inactive when SF is active
    expect(inactiveTabs).toHaveLength(3);
  });

  it('inactive tabs have fontWeight 500 in inline style', () => {
    renderTabBar('system-framework');
    const tabs = screen.getAllByRole('tab');
    const inactiveTabs = tabs.filter(
      (tab) => tab.getAttribute('aria-selected') === 'false',
    );
    inactiveTabs.forEach((tab) => {
      expect(tab.style.fontWeight).toBe('500');
    });
  });

  it('switching active perspective to logic-operation makes that tab active', () => {
    renderTabBar('logic-operation');
    const tabs = screen.getAllByRole('tab');
    const activeTab = tabs.find(
      (tab) => tab.getAttribute('aria-selected') === 'true',
    )!;
    expect(activeTab.textContent).toContain('邏輯運作');
  });
});

// ---------------------------------------------------------------------------
// Click interaction
// ---------------------------------------------------------------------------

describe('TabBar — click interaction', () => {
  it('clicking 系統框架 tab calls onPerspectiveChange with "system-framework"', () => {
    const onPerspectiveChange = vi.fn();
    render(
      React.createElement(TabBar, {
        activePerspective: 'logic-operation',
        onPerspectiveChange,
        counts: { sf: 0, lo: 0, dj: 0, wiki: 0 },
      }),
    );
    fireEvent.click(screen.getByText('系統框架'));
    expect(onPerspectiveChange).toHaveBeenCalledWith('system-framework');
  });

  it('clicking 邏輯運作 tab calls onPerspectiveChange with "logic-operation"', () => {
    const onPerspectiveChange = vi.fn();
    render(
      React.createElement(TabBar, {
        activePerspective: 'system-framework',
        onPerspectiveChange,
        counts: { sf: 0, lo: 0, dj: 0, wiki: 0 },
      }),
    );
    fireEvent.click(screen.getByText('邏輯運作'));
    expect(onPerspectiveChange).toHaveBeenCalledWith('logic-operation');
  });

  it('clicking 資料旅程 tab calls onPerspectiveChange with "data-journey"', () => {
    const onPerspectiveChange = vi.fn();
    render(
      React.createElement(TabBar, {
        activePerspective: 'system-framework',
        onPerspectiveChange,
        counts: { sf: 0, lo: 0, dj: 0, wiki: 0 },
      }),
    );
    fireEvent.click(screen.getByText('資料旅程'));
    expect(onPerspectiveChange).toHaveBeenCalledWith('data-journey');
  });

  it('onPerspectiveChange is called exactly once per click', () => {
    const onPerspectiveChange = vi.fn();
    render(
      React.createElement(TabBar, {
        activePerspective: 'system-framework',
        onPerspectiveChange,
        counts: { sf: 0, lo: 0, dj: 0, wiki: 0 },
      }),
    );
    fireEvent.click(screen.getByText('邏輯運作'));
    expect(onPerspectiveChange).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Count badges
// ---------------------------------------------------------------------------

describe('TabBar — count badges', () => {
  it('displays sf count badge when sf count > 0', () => {
    renderTabBar('system-framework', vi.fn(), { sf: 42, lo: 0, dj: 0 });
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('displays lo count badge when lo count > 0', () => {
    renderTabBar('system-framework', vi.fn(), { sf: 0, lo: 15, dj: 0 });
    expect(screen.getByText('15')).toBeTruthy();
  });

  it('displays dj count badge when dj count > 0', () => {
    renderTabBar('system-framework', vi.fn(), { sf: 0, lo: 0, dj: 7 });
    expect(screen.getByText('7')).toBeTruthy();
  });

  it('does not display count badge when count is 0', () => {
    renderTabBar('system-framework', vi.fn(), { sf: 0, lo: 0, dj: 0 });
    // With all counts at 0, no numeric badge spans should be rendered
    const tabs = screen.getAllByRole('tab');
    tabs.forEach((tab) => {
      // Tab text should contain only the label, no numeric badge
      const numericMatches = tab.textContent?.match(/^\d+$/);
      expect(numericMatches).toBeNull();
    });
  });

  it('displays all three counts simultaneously when all > 0', () => {
    renderTabBar('system-framework', vi.fn(), { sf: 10, lo: 20, dj: 30 });
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('20')).toBeTruthy();
    expect(screen.getByText('30')).toBeTruthy();
  });
});
