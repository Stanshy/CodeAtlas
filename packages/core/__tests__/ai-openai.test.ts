/**
 * OpenAI Provider unit tests
 *
 * Tests real HTTP logic with mocked fetch.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIProvider } from '../src/ai/openai.js';
import type { SummaryContext } from '../src/types.js';

const context: SummaryContext = {
  filePath: 'src/utils/helper.ts',
  language: 'typescript',
  imports: ['lodash'],
  exports: ['formatDate'],
};

const code = 'export function formatDate(d: Date) { return d.toISOString(); }';

describe('OpenAIProvider', () => {
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
            choices: [{ message: { content: 'This module formats dates.' } }],
          }),
        ),
    });

    const provider = new OpenAIProvider('sk-valid-key');
    const result = await provider.summarize(code, context);
    expect(result).toBe('This module formats dates.');
  });

  it('sends correct request to OpenAI API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            choices: [{ message: { content: 'Summary' } }],
          }),
        ),
    });
    globalThis.fetch = mockFetch;

    const provider = new OpenAIProvider('sk-test-key');
    await provider.summarize(code, context);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe('Bearer sk-test-key');
    expect(options.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(options.body);
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].role).toBe('user');
  });

  it('throws on 401 authentication error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve(JSON.stringify({ error: { message: 'Invalid key' } })),
    });

    const provider = new OpenAIProvider('sk-bad-key');
    await expect(provider.summarize(code, context)).rejects.toThrow(/authentication failed/i);
  });

  it('throws on 429 rate limit', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate limited'),
    });

    const provider = new OpenAIProvider('sk-key');
    await expect(provider.summarize(code, context)).rejects.toThrow(/rate limit/i);
  });

  it('throws when API returns empty choices', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ choices: [] })),
    });

    const provider = new OpenAIProvider('sk-key');
    await expect(provider.summarize(code, context)).rejects.toThrow(/empty response/i);
  });

  it('throws when no API key configured', async () => {
    const provider = new OpenAIProvider();
    await expect(provider.summarize(code, context)).rejects.toThrow(/not configured/i);
  });

  it('throws on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network unreachable'));

    const provider = new OpenAIProvider('sk-key');
    await expect(provider.summarize(code, context)).rejects.toThrow(/network/i);
  });

  it('throws on malformed JSON response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('not json'),
    });

    const provider = new OpenAIProvider('sk-key');
    await expect(provider.summarize(code, context)).rejects.toThrow(/parse/i);
  });
});
