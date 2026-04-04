/**
 * NodeIOBadge component unit tests
 *
 * Tests rendering behaviour of the NodeIOBadge overlay component:
 * - Both counts zero → renders nothing (null)
 * - importCount=5, exportCount=3 → shows ↓5 and ↑3
 * - importCount > 99 → displays "99+"
 * - Only importCount shown when exportCount=0
 * - Only exportCount shown when importCount=0
 *
 * Sprint 5 — T9: Unit + Integration Tests
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { NodeIOBadge } from '../src/components/NodeIOBadge';

describe('NodeIOBadge — both counts zero', () => {
  it('renders nothing when importCount=0 and exportCount=0', () => {
    const { container } = render(
      React.createElement(NodeIOBadge, { importCount: 0, exportCount: 0 }),
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('NodeIOBadge — importCount=5 and exportCount=3', () => {
  it('renders the import badge with ↓5', () => {
    const { container } = render(
      React.createElement(NodeIOBadge, { importCount: 5, exportCount: 3 }),
    );
    expect(container.textContent).toContain('\u21935');
  });

  it('renders the export badge with ↑3', () => {
    const { container } = render(
      React.createElement(NodeIOBadge, { importCount: 5, exportCount: 3 }),
    );
    expect(container.textContent).toContain('\u21913');
  });
});

describe('NodeIOBadge — count cap at 99+', () => {
  it('renders "↓99+" when importCount=100', () => {
    const { container } = render(
      React.createElement(NodeIOBadge, { importCount: 100, exportCount: 0 }),
    );
    expect(container.textContent).toContain('\u219399+');
  });

  it('renders "↑99+" when exportCount=200', () => {
    const { container } = render(
      React.createElement(NodeIOBadge, { importCount: 0, exportCount: 200 }),
    );
    expect(container.textContent).toContain('\u219199+');
  });

  it('renders "↓99+" at exactly 100', () => {
    const { container } = render(
      React.createElement(NodeIOBadge, { importCount: 100, exportCount: 0 }),
    );
    expect(container.textContent).toContain('99+');
    expect(container.textContent).not.toContain('100');
  });

  it('still shows exact value at count=99', () => {
    const { container } = render(
      React.createElement(NodeIOBadge, { importCount: 99, exportCount: 0 }),
    );
    expect(container.textContent).toContain('99');
    expect(container.textContent).not.toContain('99+');
  });
});

describe('NodeIOBadge — only import badge shown', () => {
  it('shows ↓5 but no export badge when exportCount=0', () => {
    const { container } = render(
      React.createElement(NodeIOBadge, { importCount: 5, exportCount: 0 }),
    );
    expect(container.textContent).toContain('\u21935');
    expect(container.textContent).not.toContain('\u2191');
  });
});

describe('NodeIOBadge — only export badge shown', () => {
  it('shows ↑7 but no import badge when importCount=0', () => {
    const { container } = render(
      React.createElement(NodeIOBadge, { importCount: 0, exportCount: 7 }),
    );
    expect(container.textContent).toContain('\u21917');
    expect(container.textContent).not.toContain('\u2193');
  });
});
