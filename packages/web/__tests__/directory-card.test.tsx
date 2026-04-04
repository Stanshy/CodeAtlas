/**
 * DirectoryCard component unit tests
 *
 * Coverage:
 *   - Renders directory label text
 *   - Renders file count badge with correct pluralization
 *   - Correct type colors for entry, logic, data, and support directory types
 *   - Hover state changes border width and background styles
 *
 * @xyflow/react is mocked so Handle/Position can render without the internal
 * React Flow store context. ReactFlowProvider is NOT required with the mock.
 *
 * Sprint 12 — T11
 */

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mock @xyflow/react — Handle renders as a span, Position is plain enum
// ---------------------------------------------------------------------------

vi.mock('@xyflow/react', () => ({
  Handle: ({ type }: { type: string }) =>
    React.createElement('span', { 'data-handle-type': type }),
  Position: {
    Left: 'left',
    Right: 'right',
    Top: 'top',
    Bottom: 'bottom',
  },
}));

// Import component AFTER the mock is declared
import { DirectoryCard } from '../src/components/DirectoryCard';
import type { DirectoryType } from '../src/types/graph';

// ---------------------------------------------------------------------------
// Helpers to build NodeProps-compatible data
// ---------------------------------------------------------------------------

function makeDirectoryCardProps(overrides: {
  label?: string;
  role?: DirectoryType;
  fileCount?: number;
  selected?: boolean;
}) {
  return {
    id: 'test-dir-node',
    type: 'directoryCard',
    selected: overrides.selected ?? false,
    zIndex: 0,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
    data: {
      label: overrides.label ?? 'src',
      filePath: overrides.label ?? 'src',
      nodeType: 'directory' as const,
      metadata: {
        role: overrides.role ?? 'logic',
        fileSize: overrides.fileCount ?? 0,
      },
    },
  };
}

// Type-color constants from the component (DirectoryCard.tsx TYPE_COLORS).
// jsdom normalizes hex values to rgb() format when reading computed styles,
// so these use the equivalent rgb() representations.
const TYPE_BORDERS_RGB: Record<DirectoryType, string> = {
  entry: 'rgb(21, 101, 192)',   // #1565c0
  logic: 'rgb(21, 101, 192)',   // #1565c0
  data: 'rgb(13, 71, 161)',     // #0d47a1
  support: 'rgb(84, 110, 122)', // #546e7a
};

// Badge background colors in rgb() (jsdom normalizes hex → rgb)
const BADGE_BACKGROUNDS_RGB: Record<DirectoryType, string> = {
  entry: 'rgb(187, 222, 251)',  // #bbdefb
  logic: 'rgb(187, 222, 251)',  // #bbdefb
  data: 'rgb(197, 202, 233)',   // #c5cae9
  support: 'rgb(207, 216, 220)', // #cfd8dc
};

// ---------------------------------------------------------------------------
// Label rendering
// ---------------------------------------------------------------------------

describe('DirectoryCard — label rendering', () => {
  it('renders the directory label text', () => {
    const props = makeDirectoryCardProps({ label: 'controllers' });
    const { container } = render(React.createElement(DirectoryCard, props as any));
    expect(container.textContent).toContain('controllers');
  });

  it('renders a different directory label correctly', () => {
    const props = makeDirectoryCardProps({ label: 'services' });
    const { container } = render(React.createElement(DirectoryCard, props as any));
    expect(container.textContent).toContain('services');
  });
});

// ---------------------------------------------------------------------------
// File count badge
// ---------------------------------------------------------------------------

describe('DirectoryCard — file count badge', () => {
  it('renders "0 files" when fileCount is 0', () => {
    const props = makeDirectoryCardProps({ fileCount: 0 });
    const { container } = render(React.createElement(DirectoryCard, props as any));
    expect(container.textContent).toContain('0 files');
  });

  it('renders singular "1 file" when fileCount is 1', () => {
    const props = makeDirectoryCardProps({ fileCount: 1 });
    const { container } = render(React.createElement(DirectoryCard, props as any));
    expect(container.textContent).toContain('1 file');
    expect(container.textContent).not.toContain('1 files');
  });

  it('renders plural "files" when fileCount is greater than 1', () => {
    const props = makeDirectoryCardProps({ fileCount: 5 });
    const { container } = render(React.createElement(DirectoryCard, props as any));
    expect(container.textContent).toContain('5 files');
  });

  it('renders the exact file count number', () => {
    const props = makeDirectoryCardProps({ fileCount: 12 });
    const { container } = render(React.createElement(DirectoryCard, props as any));
    expect(container.textContent).toContain('12');
  });
});

// ---------------------------------------------------------------------------
// Type colors — border
// The card body (el[1]) is the absolute-positioned div with the border.
// jsdom normalizes hex colors to rgb() in style.borderColor.
// ---------------------------------------------------------------------------

describe('DirectoryCard — type colors (border)', () => {
  it('entry type card body has border color rgb(21, 101, 192)', () => {
    const props = makeDirectoryCardProps({ role: 'entry' });
    const { container } = render(React.createElement(DirectoryCard, props as any));
    const outerDiv = container.firstChild as HTMLElement;
    const cardBody = outerDiv?.firstChild as HTMLElement;
    expect(cardBody.style.borderColor).toBe(TYPE_BORDERS_RGB.entry);
  });

  it('data type card body has border color rgb(13, 71, 161)', () => {
    const props = makeDirectoryCardProps({ role: 'data' });
    const { container } = render(React.createElement(DirectoryCard, props as any));
    const outerDiv = container.firstChild as HTMLElement;
    const cardBody = outerDiv?.firstChild as HTMLElement;
    expect(cardBody.style.borderColor).toBe(TYPE_BORDERS_RGB.data);
  });

  it('support type card body has border color rgb(84, 110, 122)', () => {
    const props = makeDirectoryCardProps({ role: 'support' });
    const { container } = render(React.createElement(DirectoryCard, props as any));
    const outerDiv = container.firstChild as HTMLElement;
    const cardBody = outerDiv?.firstChild as HTMLElement;
    expect(cardBody.style.borderColor).toBe(TYPE_BORDERS_RGB.support);
  });

  it('logic type card body has border color rgb(21, 101, 192)', () => {
    const props = makeDirectoryCardProps({ role: 'logic' });
    const { container } = render(React.createElement(DirectoryCard, props as any));
    const outerDiv = container.firstChild as HTMLElement;
    const cardBody = outerDiv?.firstChild as HTMLElement;
    expect(cardBody.style.borderColor).toBe(TYPE_BORDERS_RGB.logic);
  });
});

// ---------------------------------------------------------------------------
// Type colors — badge background
// The file-count badge div is el[7] (position: absolute; top: 40px).
// jsdom normalizes hex colors to rgb() in style.background.
// ---------------------------------------------------------------------------

describe('DirectoryCard — type colors (badge background)', () => {
  it('data type badge has background rgb(197, 202, 233)', () => {
    const props = makeDirectoryCardProps({ role: 'data', fileCount: 3 });
    const { container } = render(React.createElement(DirectoryCard, props as any));
    const allElements = Array.from(container.querySelectorAll('[style]'));
    // The badge is the last styled div before Handle spans
    const badgeEl = allElements.find(
      (el) => (el as HTMLElement).style.cssText.includes('top: 40px'),
    ) as HTMLElement | undefined;
    expect(badgeEl).toBeTruthy();
    expect(badgeEl!.style.background).toBe(BADGE_BACKGROUNDS_RGB.data);
  });

  it('support type badge has background rgb(207, 216, 220)', () => {
    const props = makeDirectoryCardProps({ role: 'support', fileCount: 3 });
    const { container } = render(React.createElement(DirectoryCard, props as any));
    const allElements = Array.from(container.querySelectorAll('[style]'));
    const badgeEl = allElements.find(
      (el) => (el as HTMLElement).style.cssText.includes('top: 40px'),
    ) as HTMLElement | undefined;
    expect(badgeEl).toBeTruthy();
    expect(badgeEl!.style.background).toBe(BADGE_BACKGROUNDS_RGB.support);
  });
});

// ---------------------------------------------------------------------------
// Hover state
// ---------------------------------------------------------------------------

describe('DirectoryCard — hover state', () => {
  it('card body has border-width 1.5px before hover', () => {
    const props = makeDirectoryCardProps({ role: 'logic' });
    const { container } = render(React.createElement(DirectoryCard, props as any));
    // The card body div is the first child (position: absolute, inset: 0)
    // find it by checking for the inset style
    const outerDiv = container.firstChild as HTMLElement;
    const cardBody = outerDiv?.firstChild as HTMLElement;
    expect(cardBody?.style.borderWidth).toBe('1.5px');
  });

  it('card body border-width increases to 2.5px on hover', () => {
    const props = makeDirectoryCardProps({ role: 'logic' });
    const { container } = render(React.createElement(DirectoryCard, props as any));
    const outerDiv = container.firstChild as HTMLElement;
    // Simulate mouseenter on the outer container
    fireEvent.mouseEnter(outerDiv);
    const cardBody = outerDiv?.firstChild as HTMLElement;
    expect(cardBody?.style.borderWidth).toBe('2px');
  });

  it('card body border-width resets to 1.5px after mouse leave', () => {
    const props = makeDirectoryCardProps({ role: 'logic' });
    const { container } = render(React.createElement(DirectoryCard, props as any));
    const outerDiv = container.firstChild as HTMLElement;
    fireEvent.mouseEnter(outerDiv);
    fireEvent.mouseLeave(outerDiv);
    const cardBody = outerDiv?.firstChild as HTMLElement;
    expect(cardBody?.style.borderWidth).toBe('1.5px');
  });

  it('hovered card has non-white background on card body', () => {
    const props = makeDirectoryCardProps({ role: 'logic' });
    const { container } = render(React.createElement(DirectoryCard, props as any));
    const outerDiv = container.firstChild as HTMLElement;
    fireEvent.mouseEnter(outerDiv);
    const cardBody = outerDiv?.firstChild as HTMLElement;
    // On hover, background should be c.bg (e3f2fd → rgb(227, 242, 253)), not white
    // jsdom normalizes #ffffff to rgb(255, 255, 255)
    expect(cardBody?.style.background).not.toBe('rgb(255, 255, 255)');
  });
});

// ---------------------------------------------------------------------------
// React Flow handles
// ---------------------------------------------------------------------------

describe('DirectoryCard — React Flow handles', () => {
  it('renders a target handle', () => {
    const props = makeDirectoryCardProps({});
    const { container } = render(React.createElement(DirectoryCard, props as any));
    const targetHandle = container.querySelector('[data-handle-type="target"]');
    expect(targetHandle).not.toBeNull();
  });

  it('renders a source handle', () => {
    const props = makeDirectoryCardProps({});
    const { container } = render(React.createElement(DirectoryCard, props as any));
    const sourceHandle = container.querySelector('[data-handle-type="source"]');
    expect(sourceHandle).not.toBeNull();
  });
});
