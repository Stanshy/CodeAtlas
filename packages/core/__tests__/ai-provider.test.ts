/**
 * AI Provider unit tests
 *
 * Tests for:
 *   - packages/core/src/ai/disabled.ts   (DisabledProvider)
 *   - packages/core/src/ai/openai.ts     (OpenAIProvider)
 *   - packages/core/src/ai/anthropic.ts  (AnthropicProvider)
 *   - packages/core/src/ai/index.ts      (createProvider)
 */

import { describe, it, expect } from 'vitest';
import { DisabledProvider } from '../src/ai/disabled.js';
import { OpenAIProvider } from '../src/ai/openai.js';
import { AnthropicProvider } from '../src/ai/anthropic.js';
import { createProvider } from '../src/ai/index.js';
import type { SummaryContext } from '../src/types.js';

// ---------------------------------------------------------------------------
// Shared test context
// ---------------------------------------------------------------------------

const dummyContext: SummaryContext = {
  filePath: 'src/example.ts',
  language: 'typescript',
  imports: ['react', 'lodash'],
  exports: ['MyComponent'],
};

const dummyCode = 'export const x = 1;';

// ---------------------------------------------------------------------------
// DisabledProvider
// ---------------------------------------------------------------------------

describe('DisabledProvider', () => {
  it('name is "disabled"', () => {
    const provider = new DisabledProvider();
    expect(provider.name).toBe('disabled');
  });

  it('isConfigured() returns false', () => {
    const provider = new DisabledProvider();
    expect(provider.isConfigured()).toBe(false);
  });

  it('summarize() resolves (does not throw)', async () => {
    const provider = new DisabledProvider();
    await expect(
      provider.summarize(dummyCode, dummyContext),
    ).resolves.toBeDefined();
  });

  it('summarize() returns a non-empty message string', async () => {
    const provider = new DisabledProvider();
    const result = await provider.summarize(dummyCode, dummyContext);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('summarize() returns the default "not configured" message', async () => {
    const provider = new DisabledProvider();
    const result = await provider.summarize(dummyCode, dummyContext);
    expect(result).toMatch(/not configured/i);
  });

  it('isConfigured() is always false regardless of constructor args', () => {
    // DisabledProvider takes no constructor args — just verifying it's stable
    const p1 = new DisabledProvider();
    const p2 = new DisabledProvider();
    expect(p1.isConfigured()).toBe(false);
    expect(p2.isConfigured()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// OpenAIProvider
// ---------------------------------------------------------------------------

describe('OpenAIProvider', () => {
  it('name is "openai"', () => {
    const provider = new OpenAIProvider('key-123');
    expect(provider.name).toBe('openai');
  });

  it('isConfigured() returns true when apiKey is provided', () => {
    const provider = new OpenAIProvider('sk-test-key');
    expect(provider.isConfigured()).toBe(true);
  });

  it('isConfigured() returns false when no apiKey is provided', () => {
    const provider = new OpenAIProvider();
    expect(provider.isConfigured()).toBe(false);
  });

  it('isConfigured() returns false when apiKey is empty string', () => {
    const provider = new OpenAIProvider('');
    expect(provider.isConfigured()).toBe(false);
  });

  it('summarize() throws an Error (not yet implemented)', async () => {
    const provider = new OpenAIProvider('sk-test-key');
    await expect(
      provider.summarize(dummyCode, dummyContext),
    ).rejects.toThrow(Error);
  });

  it('summarize() throws with auth or network error for invalid key', async () => {
    const provider = new OpenAIProvider('sk-test-key');
    await expect(
      provider.summarize(dummyCode, dummyContext),
    ).rejects.toThrow(/openai/i);
  });

  it('summarize() throws even when not configured (no key)', async () => {
    const provider = new OpenAIProvider();
    await expect(
      provider.summarize(dummyCode, dummyContext),
    ).rejects.toThrow(Error);
  });
});

// ---------------------------------------------------------------------------
// AnthropicProvider
// ---------------------------------------------------------------------------

describe('AnthropicProvider', () => {
  it('name is "anthropic"', () => {
    const provider = new AnthropicProvider('key-123');
    expect(provider.name).toBe('anthropic');
  });

  it('isConfigured() returns true when apiKey is provided', () => {
    const provider = new AnthropicProvider('sk-ant-test');
    expect(provider.isConfigured()).toBe(true);
  });

  it('isConfigured() returns false when no apiKey is provided', () => {
    const provider = new AnthropicProvider();
    expect(provider.isConfigured()).toBe(false);
  });

  it('isConfigured() returns false when apiKey is empty string', () => {
    const provider = new AnthropicProvider('');
    expect(provider.isConfigured()).toBe(false);
  });

  it('summarize() throws an Error (not yet implemented)', async () => {
    const provider = new AnthropicProvider('sk-ant-test');
    await expect(
      provider.summarize(dummyCode, dummyContext),
    ).rejects.toThrow(Error);
  });

  it('summarize() throws with auth or network error for invalid key', async () => {
    const provider = new AnthropicProvider('sk-ant-test');
    await expect(
      provider.summarize(dummyCode, dummyContext),
    ).rejects.toThrow(/anthropic/i);
  });

  it('summarize() throws even when not configured (no key)', async () => {
    const provider = new AnthropicProvider();
    await expect(
      provider.summarize(dummyCode, dummyContext),
    ).rejects.toThrow(Error);
  });
});

// ---------------------------------------------------------------------------
// createProvider factory
// ---------------------------------------------------------------------------

describe('createProvider factory', () => {
  it('createProvider("disabled") returns a DisabledProvider', () => {
    const provider = createProvider('disabled');
    expect(provider).toBeInstanceOf(DisabledProvider);
  });

  it('createProvider("openai", key) returns an OpenAIProvider', () => {
    const provider = createProvider('openai', 'sk-test');
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it('createProvider("anthropic", key) returns an AnthropicProvider', () => {
    const provider = createProvider('anthropic', 'sk-ant-test');
    expect(provider).toBeInstanceOf(AnthropicProvider);
  });

  it('createProvider("unknown") returns a DisabledProvider (fallback)', () => {
    const provider = createProvider('unknown-provider');
    expect(provider).toBeInstanceOf(DisabledProvider);
  });

  it('createProvider("") returns a DisabledProvider (empty name fallback)', () => {
    const provider = createProvider('');
    expect(provider).toBeInstanceOf(DisabledProvider);
  });

  it('createProvider("openai") without apiKey returns OpenAIProvider with isConfigured false', () => {
    const provider = createProvider('openai');
    expect(provider).toBeInstanceOf(OpenAIProvider);
    expect(provider.isConfigured()).toBe(false);
  });

  it('createProvider("anthropic") without apiKey returns AnthropicProvider with isConfigured false', () => {
    const provider = createProvider('anthropic');
    expect(provider).toBeInstanceOf(AnthropicProvider);
    expect(provider.isConfigured()).toBe(false);
  });

  it('createProvider("openai", apiKey).isConfigured() returns true', () => {
    const provider = createProvider('openai', 'sk-real-key');
    expect(provider.isConfigured()).toBe(true);
  });

  it('createProvider("anthropic", apiKey).isConfigured() returns true', () => {
    const provider = createProvider('anthropic', 'sk-ant-real');
    expect(provider.isConfigured()).toBe(true);
  });

  it('returned providers satisfy the SummaryProvider interface', () => {
    const provider = createProvider('disabled');
    expect(typeof provider.name).toBe('string');
    expect(typeof provider.isConfigured).toBe('function');
    expect(typeof provider.summarize).toBe('function');
  });
});
