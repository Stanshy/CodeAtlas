/**
 * Anthropic Provider unit tests
 *
 * Tests real HTTP logic with mocked fetch.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnthropicProvider } from '../src/ai/anthropic.js';
import type { SummaryContext } from '../src/types.js';

const context: SummaryContext = {
  filePath: 'src/utils/helper.ts',
  language: 'typescript',
  imports: ['lodash'],
  exports: ['formatDate'],
};

const code = 'export function formatDate(d: Date) { return d.toISOString(); }';

describe('AnthropicProvider', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns summary on successful API call', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            content: [{ type: 'text', text: 'This module formats dates.' }],
          }),
        ),
    });

    const provider = new AnthropicProvider('sk-ant-valid');
    const result = await provider.summarize(code, context);
    expect(result).toBe('This module formats dates.');
  });

  it('sends correct request to Anthropic API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            content: [{ type: 'text', text: 'Summary' }],
          }),
        ),
    });
    globalThis.fetch = mockFetch;

    const provider = new AnthropicProvider('sk-ant-test');
    await provider.summarize(code, context);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(options.method).toBe('POST');
    expect(options.headers['x-api-key']).toBe('sk-ant-test');
    expect(options.headers['anthropic-version']).toBe('2023-06-01');

    const body = JSON.parse(options.body);
    expect(body.model).toBe('claude-haiku-4-5-20251001');
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe('user');
    expect(typeof body.system).toBe('string');
  });

  it('throws on 401 authentication error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve(JSON.stringify({ error: { message: 'Invalid key' } })),
    });

    const provider = new AnthropicProvider('sk-ant-bad');
    await expect(provider.summarize(code, context)).rejects.toThrow(/authentication failed/i);
  });

  it('throws on 429 rate limit', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate limited'),
    });

    const provider = new AnthropicProvider('sk-ant-key');
    await expect(provider.summarize(code, context)).rejects.toThrow(/rate limit/i);
  });

  it('throws when API returns empty content', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ content: [] })),
    });

    const provider = new AnthropicProvider('sk-ant-key');
    await expect(provider.summarize(code, context)).rejects.toThrow(/empty response/i);
  });

  it('throws when no API key configured', async () => {
    const provider = new AnthropicProvider();
    await expect(provider.summarize(code, context)).rejects.toThrow(/not configured/i);
  });

  it('throws on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network unreachable'));

    const provider = new AnthropicProvider('sk-ant-key');
    await expect(provider.summarize(code, context)).rejects.toThrow(/network/i);
  });

  it('throws on malformed JSON response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('not json'),
    });

    const provider = new AnthropicProvider('sk-ant-key');
    await expect(provider.summarize(code, context)).rejects.toThrow(/parse/i);
  });
});
