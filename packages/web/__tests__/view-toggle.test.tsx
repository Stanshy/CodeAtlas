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

// Sprint 19 T12: 3D has been removed. ViewToggle is now a no-op placeholder that returns null.
// All 3D toggle interaction tests removed — the component renders nothing.
describe('ViewToggle', () => {
  it('renders nothing (3D removed in Sprint 19 T12)', () => {
    const { container } = renderWithProvider(React.createElement(ViewToggle));
    expect(container.firstChild).toBeNull();
  });
});
