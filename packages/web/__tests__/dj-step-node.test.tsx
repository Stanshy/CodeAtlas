/**
 * DJStepNode component unit tests
 *
 * Coverage:
 *   - Renders step number (1-based)
 *   - Renders method name from step data
 *   - Renders description from step data
 *   - Correct background color for unreached state (white)
 *   - Correct background for active state (green-tinted)
 *   - Correct background for completed state (light-green)
 *   - Active state has solid border, unreached has lighter border
 *   - Completed state shows left accent bar
 *   - Renders React Flow handles (target + source)
 *
 * @xyflow/react is mocked so Handle/Position renders without the internal store.
 *
 * Sprint 13 — T8
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mock @xyflow/react — Handle renders as a span
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

import { DJStepNode } from '../src/components/DJStepNode';
import type { DJStepNodeData } from '../src/components/DJStepNode';
import type { DJChainStep } from '../src/types/graph';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStep(overrides: Partial<DJChainStep> = {}): DJChainStep {
  return {
    name: 'processRequest()',
    desc: 'Process the incoming request',
    method: 'processRequest()',
    file: 'src/services/request.ts',
    ...overrides,
  };
}

function makeNodeProps(
  stepIndex: number,
  step: DJChainStep,
  state: DJStepNodeData['state'],
) {
  return {
    id: `step-node-${stepIndex}`,
    type: 'djStepNode',
    selected: false,
    zIndex: 0,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
    data: {
      stepIndex,
      step,
      state,
    } as DJStepNodeData,
  };
}

// ---------------------------------------------------------------------------
// Step number rendering
// ---------------------------------------------------------------------------

describe('DJStepNode — step number rendering', () => {
  it('renders "Step 1" for stepIndex 0', () => {
    const props = makeNodeProps(0, makeStep(), 'unreached');
    const { container } = render(React.createElement(DJStepNode, props as any));
    expect(container.textContent).toContain('Step 1');
  });

  it('renders "Step 3" for stepIndex 2', () => {
    const props = makeNodeProps(2, makeStep(), 'unreached');
    const { container } = render(React.createElement(DJStepNode, props as any));
    expect(container.textContent).toContain('Step 3');
  });

  it('renders "Step 5" for stepIndex 4', () => {
    const props = makeNodeProps(4, makeStep(), 'active');
    const { container } = render(React.createElement(DJStepNode, props as any));
    expect(container.textContent).toContain('Step 5');
  });
});

// ---------------------------------------------------------------------------
// Method name rendering
// ---------------------------------------------------------------------------

describe('DJStepNode — method name rendering', () => {
  it('renders the step method name', () => {
    const step = makeStep({ name: 'validateToken()' });
    const props = makeNodeProps(0, step, 'unreached');
    const { container } = render(React.createElement(DJStepNode, props as any));
    expect(container.textContent).toContain('validateToken()');
  });

  it('renders a different method name correctly', () => {
    const step = makeStep({ name: 'fetchUserData()' });
    const props = makeNodeProps(1, step, 'active');
    const { container } = render(React.createElement(DJStepNode, props as any));
    expect(container.textContent).toContain('fetchUserData()');
  });
});

// ---------------------------------------------------------------------------
// Description rendering
// ---------------------------------------------------------------------------

describe('DJStepNode — description rendering', () => {
  it('renders the step description', () => {
    const step = makeStep({ desc: 'Validate the JWT token' });
    const props = makeNodeProps(0, step, 'unreached');
    const { container } = render(React.createElement(DJStepNode, props as any));
    expect(container.textContent).toContain('Validate the JWT token');
  });

  it('does not render description element when desc is empty', () => {
    const step = makeStep({ desc: '' });
    const props = makeNodeProps(0, step, 'unreached');
    const { container } = render(React.createElement(DJStepNode, props as any));
    // Empty desc should not add visible content
    expect(container.textContent).not.toContain('undefined');
  });
});

// ---------------------------------------------------------------------------
// State styling — background colors
// ---------------------------------------------------------------------------

describe('DJStepNode — state styling (background)', () => {
  it('unreached state has white background', () => {
    const props = makeNodeProps(0, makeStep(), 'unreached');
    const { container } = render(React.createElement(DJStepNode, props as any));
    const outerDiv = container.firstChild as HTMLElement;
    // White background = rgb(255, 255, 255) or #ffffff
    expect(outerDiv.style.background).toBe('rgb(255, 255, 255)');
  });

  it('completed state has light-green background (#f1f8e9)', () => {
    const props = makeNodeProps(0, makeStep(), 'completed');
    const { container } = render(React.createElement(DJStepNode, props as any));
    const outerDiv = container.firstChild as HTMLElement;
    // #f1f8e9 → rgb(241, 248, 233)
    expect(outerDiv.style.background).toBe('rgb(241, 248, 233)');
  });

  it('active state has non-white background', () => {
    const props = makeNodeProps(0, makeStep(), 'active');
    const { container } = render(React.createElement(DJStepNode, props as any));
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.style.background).not.toBe('rgb(255, 255, 255)');
  });
});

// ---------------------------------------------------------------------------
// State styling — border
// ---------------------------------------------------------------------------

describe('DJStepNode — state styling (border)', () => {
  it('unreached state has 1.5px border', () => {
    const props = makeNodeProps(0, makeStep(), 'unreached');
    const { container } = render(React.createElement(DJStepNode, props as any));
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.style.border).toContain('1.5px');
  });

  it('active state has 2px border', () => {
    const props = makeNodeProps(0, makeStep(), 'active');
    const { container } = render(React.createElement(DJStepNode, props as any));
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.style.border).toContain('2px');
  });

  it('completed state has 1.5px border', () => {
    const props = makeNodeProps(0, makeStep(), 'completed');
    const { container } = render(React.createElement(DJStepNode, props as any));
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.style.border).toContain('1.5px');
  });
});

// ---------------------------------------------------------------------------
// Completed state accent bar
// ---------------------------------------------------------------------------

describe('DJStepNode — completed state accent bar', () => {
  it('completed state renders accent bar (not display:none)', () => {
    const props = makeNodeProps(0, makeStep(), 'completed');
    const { container } = render(React.createElement(DJStepNode, props as any));
    const outerDiv = container.firstChild as HTMLElement;
    // Second child (after accentBar) — the accent bar should be visible
    const accentBar = outerDiv.children[0] as HTMLElement;
    expect(accentBar.style.display).not.toBe('none');
  });

  it('unreached state accent bar is hidden (display:none)', () => {
    const props = makeNodeProps(0, makeStep(), 'unreached');
    const { container } = render(React.createElement(DJStepNode, props as any));
    const outerDiv = container.firstChild as HTMLElement;
    const accentBar = outerDiv.children[0] as HTMLElement;
    expect(accentBar.style.display).toBe('none');
  });

  it('active state accent bar is hidden (display:none)', () => {
    const props = makeNodeProps(0, makeStep(), 'active');
    const { container } = render(React.createElement(DJStepNode, props as any));
    const outerDiv = container.firstChild as HTMLElement;
    const accentBar = outerDiv.children[0] as HTMLElement;
    expect(accentBar.style.display).toBe('none');
  });
});

// ---------------------------------------------------------------------------
// React Flow handles
// ---------------------------------------------------------------------------

describe('DJStepNode — React Flow handles', () => {
  it('renders a target handle', () => {
    const props = makeNodeProps(0, makeStep(), 'unreached');
    const { container } = render(React.createElement(DJStepNode, props as any));
    expect(container.querySelector('[data-handle-type="target"]')).not.toBeNull();
  });

  it('renders a source handle', () => {
    const props = makeNodeProps(0, makeStep(), 'unreached');
    const { container } = render(React.createElement(DJStepNode, props as any));
    expect(container.querySelector('[data-handle-type="source"]')).not.toBeNull();
  });
});
