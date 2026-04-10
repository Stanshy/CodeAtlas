/**
 * PrivacyBadge component unit tests
 *
 * Tests rendering behaviour of the PrivacyBadge component:
 *   - disabled mode: renders 'AI disabled' text
 *   - local mode: renders 'Local mode' text, shows model name
 *   - cloud mode: renders 'Cloud mode' text with provider name, shows warning
 *   - has role="status" attribute
 *   - has aria-label containing privacy info
 *   - local mode without model: renders without model parenthetical
 *
 * Sprint 6 — T9: Tests + Regression
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { PrivacyBadge } from '../src/components/PrivacyBadge';

// ---------------------------------------------------------------------------
// disabled mode
// ---------------------------------------------------------------------------

describe('PrivacyBadge — disabled mode', () => {
  it('renders "AI disabled" text', () => {
    const { container } = render(
      React.createElement(PrivacyBadge, { mode: 'disabled', provider: 'disabled' }),
    );
    expect(container.textContent).toContain('AI disabled');
  });

  it('has role="status"', () => {
    const { container } = render(
      React.createElement(PrivacyBadge, { mode: 'disabled', provider: 'disabled' }),
    );
    const el = container.querySelector('[role="status"]');
    expect(el).not.toBeNull();
  });

  it('has aria-label containing privacy info', () => {
    const { container } = render(
      React.createElement(PrivacyBadge, { mode: 'disabled', provider: 'disabled' }),
    );
    const el = container.querySelector('[aria-label]');
    expect(el).not.toBeNull();
    expect(el!.getAttribute('aria-label')).toContain('AI privacy');
  });
});

// ---------------------------------------------------------------------------
// local mode
// ---------------------------------------------------------------------------

describe('PrivacyBadge — local mode', () => {
  it('renders "Local mode" text', () => {
    const { container } = render(
      React.createElement(PrivacyBadge, { mode: 'local', provider: 'ollama', model: 'codellama' }),
    );
    expect(container.textContent).toContain('Local mode');
  });

  it('shows the model name in parentheses', () => {
    const { container } = render(
      React.createElement(PrivacyBadge, { mode: 'local', provider: 'ollama', model: 'codellama' }),
    );
    expect(container.textContent).toContain('codellama');
  });

  it('has role="status"', () => {
    const { container } = render(
      React.createElement(PrivacyBadge, { mode: 'local', provider: 'ollama', model: 'codellama' }),
    );
    const el = container.querySelector('[role="status"]');
    expect(el).not.toBeNull();
  });

  it('has aria-label containing privacy info', () => {
    const { container } = render(
      React.createElement(PrivacyBadge, { mode: 'local', provider: 'ollama', model: 'codellama' }),
    );
    const el = container.querySelector('[aria-label]');
    expect(el!.getAttribute('aria-label')).toContain('AI privacy');
  });
});

// ---------------------------------------------------------------------------
// local mode without model
// ---------------------------------------------------------------------------

describe('PrivacyBadge — local mode without model', () => {
  it('renders "Local mode" text without model parenthetical', () => {
    const { container } = render(
      React.createElement(PrivacyBadge, { mode: 'local', provider: 'ollama' }),
    );
    expect(container.textContent).toContain('Local mode');
    expect(container.textContent).not.toContain('(');
  });

  it('renders without crashing when model is null', () => {
    const { container } = render(
      React.createElement(PrivacyBadge, { mode: 'local', provider: 'ollama', model: null }),
    );
    expect(container.textContent).toContain('Local mode');
    expect(container.textContent).not.toContain('(null)');
  });
});

// ---------------------------------------------------------------------------
// cloud mode
// ---------------------------------------------------------------------------

describe('PrivacyBadge — cloud mode', () => {
  it('renders "Cloud mode" text', () => {
    const { container } = render(
      React.createElement(PrivacyBadge, { mode: 'cloud', provider: 'openai' }),
    );
    expect(container.textContent).toContain('Cloud mode');
  });

  it('shows the provider name in text', () => {
    const { container } = render(
      React.createElement(PrivacyBadge, { mode: 'cloud', provider: 'openai' }),
    );
    expect(container.textContent).toContain('openai');
  });

  it('has role="status"', () => {
    const { container } = render(
      React.createElement(PrivacyBadge, { mode: 'cloud', provider: 'openai' }),
    );
    const el = container.querySelector('[role="status"]');
    expect(el).not.toBeNull();
  });

  it('has aria-label containing privacy info', () => {
    const { container } = render(
      React.createElement(PrivacyBadge, { mode: 'cloud', provider: 'openai' }),
    );
    const el = container.querySelector('[aria-label]');
    expect(el!.getAttribute('aria-label')).toContain('AI privacy');
  });

  it('shows warning icon for cloud mode', () => {
    const { container } = render(
      React.createElement(PrivacyBadge, { mode: 'cloud', provider: 'anthropic' }),
    );
    // ⚠️ warning emoji indicates cloud mode
    expect(container.textContent).toContain('\u26A0');
  });
});

// ---------------------------------------------------------------------------
// undefined mode (treated as disabled)
// ---------------------------------------------------------------------------

describe('PrivacyBadge — undefined mode', () => {
  it('renders "AI disabled" text when mode is undefined', () => {
    const { container } = render(
      React.createElement(PrivacyBadge, { mode: undefined, provider: 'disabled' }),
    );
    expect(container.textContent).toContain('AI disabled');
  });
});
