/**
 * view-toggle component tests
 *
 * Tests the ViewToggle button rendering and interaction behaviour.
 * Wrapped in ViewStateProvider to supply context.
 *
 * Sprint 4 — T9: Unit + Integration Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ViewStateProvider } from '../src/contexts/ViewStateContext';
import { ViewToggle } from '../src/components/ViewToggle';

function renderWithProvider(ui: React.ReactElement) {
  return render(React.createElement(ViewStateProvider, null, ui));
}

describe('ViewToggle', () => {
  it('displays "3D" text when initial mode is 2d', () => {
    renderWithProvider(React.createElement(ViewToggle));
    expect(screen.getByRole('button').textContent).toBe('3D');
  });

  it('has an aria-label when in 2d mode', () => {
    renderWithProvider(React.createElement(ViewToggle));
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('Switch to 3D view');
  });

  it('displays "2D" text after clicking to switch to 3d mode', () => {
    renderWithProvider(React.createElement(ViewToggle));
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button').textContent).toBe('2D');
  });

  it('has aria-label "Switch to 2D view" after switching to 3d mode', () => {
    renderWithProvider(React.createElement(ViewToggle));
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('Switch to 2D view');
  });

  it('toggles back to "3D" text after two clicks', () => {
    renderWithProvider(React.createElement(ViewToggle));
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button').textContent).toBe('3D');
  });

  it('renders a single button element', () => {
    renderWithProvider(React.createElement(ViewToggle));
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
