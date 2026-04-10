/**
 * FunctionNode and ClassNode component tests
 *
 * Tests rendering behavior of custom React Flow nodes.
 * @xyflow/react is mocked so Handle components render without the internal
 * React Flow store context.
 *
 * Sprint 7 — T13
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
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

// Import components AFTER the mock is declared
import { FunctionNode } from '../src/components/FunctionNode';
import { ClassNode } from '../src/components/ClassNode';
import type { FunctionParam } from '../src/types/graph';

// ---------------------------------------------------------------------------
// Helpers to build NodeProps-compatible data
// ---------------------------------------------------------------------------

function makeFunctionNodeProps(overrides: {
  label?: string;
  parameters?: FunctionParam[];
  returnType?: string;
  isAsync?: boolean;
  isExported?: boolean;
  selected?: boolean;
}) {
  return {
    id: 'test-fn-node',
    type: 'functionNode',
    selected: overrides.selected ?? false,
    zIndex: 0,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
    data: {
      label: overrides.label ?? 'myFunction',
      filePath: 'src/utils.ts',
      nodeType: 'function' as const,
      metadata: {
        parentFileId: 'src/utils.ts',
        kind: 'function' as const,
        parameters: overrides.parameters,
        returnType: overrides.returnType,
        isAsync: overrides.isAsync,
        isExported: overrides.isExported,
      },
    },
  };
}

function makeClassNodeProps(overrides: {
  label?: string;
  methodCount?: number;
  isExported?: boolean;
  selected?: boolean;
}) {
  return {
    id: 'test-class-node',
    type: 'classNode',
    selected: overrides.selected ?? false,
    zIndex: 0,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
    data: {
      label: overrides.label ?? 'MyClass',
      filePath: 'src/service.ts',
      nodeType: 'class' as const,
      metadata: {
        parentFileId: 'src/service.ts',
        kind: 'class' as const,
        methodCount: overrides.methodCount,
        isExported: overrides.isExported,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// FunctionNode — function name
// ---------------------------------------------------------------------------

describe('FunctionNode — renders function name', () => {
  it('renders the function name in the node', () => {
    const props = makeFunctionNodeProps({ label: 'calculateTotal' });
    const { container } = render(React.createElement(FunctionNode, props as any));
    expect(container.textContent).toContain('calculateTotal');
  });

  it('renders a different function name correctly', () => {
    const props = makeFunctionNodeProps({ label: 'processOrder' });
    const { container } = render(React.createElement(FunctionNode, props as any));
    expect(container.textContent).toContain('processOrder');
  });
});

// ---------------------------------------------------------------------------
// FunctionNode — parameter display
// ---------------------------------------------------------------------------

describe('FunctionNode — parameter display', () => {
  it('shows "()" when no parameters', () => {
    const props = makeFunctionNodeProps({ label: 'noParams', parameters: [] });
    const { container } = render(React.createElement(FunctionNode, props as any));
    expect(container.textContent).toContain('()');
  });

  it('shows parameter names when <= 3 params', () => {
    const params: FunctionParam[] = [
      { name: 'name', type: 'string' },
      { name: 'age', type: 'number' },
    ];
    const props = makeFunctionNodeProps({ label: 'createUser', parameters: params });
    const { container } = render(React.createElement(FunctionNode, props as any));
    expect(container.textContent).toContain('name');
    expect(container.textContent).toContain('age');
  });

  it('shows parameter count when > 3 params', () => {
    const params: FunctionParam[] = [
      { name: 'a' },
      { name: 'b' },
      { name: 'c' },
      { name: 'd' },
    ];
    const props = makeFunctionNodeProps({ label: 'manyParams', parameters: params });
    const { container } = render(React.createElement(FunctionNode, props as any));
    // Should show "4 params" instead of individual names
    expect(container.textContent).toContain('4 params');
  });

  it('shows exactly 3 params by name when count is 3', () => {
    const params: FunctionParam[] = [
      { name: 'x' },
      { name: 'y' },
      { name: 'z' },
    ];
    const props = makeFunctionNodeProps({ label: 'threeParams', parameters: params });
    const { container } = render(React.createElement(FunctionNode, props as any));
    expect(container.textContent).toContain('x');
    expect(container.textContent).toContain('y');
    expect(container.textContent).toContain('z');
  });
});

// ---------------------------------------------------------------------------
// FunctionNode — return type
// ---------------------------------------------------------------------------

describe('FunctionNode — return type display', () => {
  it('shows return type when returnType is defined', () => {
    const props = makeFunctionNodeProps({ label: 'getUser', returnType: 'User' });
    const { container } = render(React.createElement(FunctionNode, props as any));
    expect(container.textContent).toContain('User');
  });

  it('does not show return type annotation when returnType is undefined', () => {
    const props = makeFunctionNodeProps({ label: 'voidFn', returnType: undefined });
    const { container } = render(React.createElement(FunctionNode, props as any));
    // Should not contain ": " return type indicator
    expect(container.textContent).not.toMatch(/:\s*(void|string|number|boolean)/);
  });
});

// ---------------------------------------------------------------------------
// FunctionNode — async badge
// ---------------------------------------------------------------------------

describe('FunctionNode — async badge', () => {
  it('shows async badge when isAsync is true', () => {
    const props = makeFunctionNodeProps({ label: 'fetchUser', isAsync: true });
    const { container } = render(React.createElement(FunctionNode, props as any));
    expect(container.textContent).toContain('async');
  });

  it('does not show async badge when isAsync is false', () => {
    const props = makeFunctionNodeProps({ label: 'syncFn', isAsync: false });
    const { container } = render(React.createElement(FunctionNode, props as any));
    // Text should not contain the "async" badge text (could appear in name, so check badge span)
    const asyncBadges = Array.from(container.querySelectorAll('span')).filter(
      (el) => el.textContent === 'async',
    );
    expect(asyncBadges).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// FunctionNode — has aria-label
// ---------------------------------------------------------------------------

describe('FunctionNode — accessibility', () => {
  it('has aria-label containing the function name', () => {
    const props = makeFunctionNodeProps({ label: 'myFunc' });
    const { container } = render(React.createElement(FunctionNode, props as any));
    const el = container.querySelector('[aria-label]');
    expect(el).not.toBeNull();
    expect(el!.getAttribute('aria-label')).toContain('myFunc');
  });

  it('has role="button"', () => {
    const props = makeFunctionNodeProps({ label: 'anyFunc' });
    const { container } = render(React.createElement(FunctionNode, props as any));
    const el = container.querySelector('[role="button"]');
    expect(el).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ClassNode — class name
// ---------------------------------------------------------------------------

describe('ClassNode — renders class name', () => {
  it('renders the class name in the node', () => {
    const props = makeClassNodeProps({ label: 'UserService' });
    const { container } = render(React.createElement(ClassNode, props as any));
    expect(container.textContent).toContain('UserService');
  });

  it('renders a different class name correctly', () => {
    const props = makeClassNodeProps({ label: 'DataRepository' });
    const { container } = render(React.createElement(ClassNode, props as any));
    expect(container.textContent).toContain('DataRepository');
  });
});

// ---------------------------------------------------------------------------
// ClassNode — method count
// ---------------------------------------------------------------------------

describe('ClassNode — method count display', () => {
  it('shows method count when methodCount > 0', () => {
    const props = makeClassNodeProps({ label: 'MyClass', methodCount: 5 });
    const { container } = render(React.createElement(ClassNode, props as any));
    expect(container.textContent).toContain('5');
  });

  it('shows "methods" label when methodCount > 1', () => {
    const props = makeClassNodeProps({ label: 'MyClass', methodCount: 3 });
    const { container } = render(React.createElement(ClassNode, props as any));
    expect(container.textContent).toContain('methods');
  });

  it('shows "method" singular label when methodCount is 1', () => {
    const props = makeClassNodeProps({ label: 'MyClass', methodCount: 1 });
    const { container } = render(React.createElement(ClassNode, props as any));
    expect(container.textContent).toContain('method');
  });

  it('does not show method count when methodCount is 0', () => {
    const props = makeClassNodeProps({ label: 'EmptyClass', methodCount: 0 });
    const { container } = render(React.createElement(ClassNode, props as any));
    // Should not show "0 methods"
    expect(container.textContent).not.toContain('0 method');
  });
});

// ---------------------------------------------------------------------------
// ClassNode — class badge
// ---------------------------------------------------------------------------

describe('ClassNode — class badge', () => {
  it('renders the "class" badge text', () => {
    const props = makeClassNodeProps({ label: 'AnyClass' });
    const { container } = render(React.createElement(ClassNode, props as any));
    // ClassNode always shows a "class" badge
    const classBadges = Array.from(container.querySelectorAll('span')).filter(
      (el) => el.textContent === 'class',
    );
    expect(classBadges.length).toBeGreaterThan(0);
  });

  it('has aria-label containing the class name', () => {
    const props = makeClassNodeProps({ label: 'TestClass' });
    const { container } = render(React.createElement(ClassNode, props as any));
    const el = container.querySelector('[aria-label]');
    expect(el).not.toBeNull();
    expect(el!.getAttribute('aria-label')).toContain('TestClass');
  });
});
