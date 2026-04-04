/**
 * OllamaProvider unit tests
 *
 * Tests for packages/core/src/ai/ollama.ts — OllamaProvider class.
 *
 * Covers:
 *   - Basic properties (name, isConfigured, getModel)
 *   - Constructor options (custom model, custom baseUrl)
 *   - summarize() happy path (successful response)
 *   - summarize() error cases (ECONNREFUSED, 404, timeout, parse failure, empty, non-ok)
 *   - Custom model sent in request body
 *   - Custom baseUrl used in request URL
 *
 * Sprint 6 — T9: Tests + Regression
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaProvider } from '../src/ai/ollama.js';
import type { SummaryContext } from '../src/types.js';

// ---------------------------------------------------------------------------
// Shared test context
// ---------------------------------------------------------------------------

const dummyContext: SummaryContext = {
  filePath: 'src/example.ts',
  language: 'typescript',
  imports: ['react'],
  exports: ['MyComponent'],
};

const dummyCode = 'export const x = 1;';

// ---------------------------------------------------------------------------
// Helper: build a successful mock Response
// ---------------------------------------------------------------------------

function mockSuccessResponse(responseText = 'Mock summary'): Response {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ response: responseText }),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Basic properties
// ---------------------------------------------------------------------------

describe('OllamaProvider — basic properties', () => {
  it('name is "ollama"', () => {
    const provider = new OllamaProvider();
    expect(provider.name).toBe('ollama');
  });

  it('isConfigured() returns true', () => {
    const provider = new OllamaProvider();
    expect(provider.isConfigured()).toBe(true);
  });

  it('getModel() returns default "codellama"', () => {
    const provider = new OllamaProvider();
    expect(provider.getModel()).toBe('codellama');
  });

  it('constructor with custom model: getModel() returns the custom value', () => {
    const provider = new OllamaProvider({ model: 'llama2' });
    expect(provider.getModel()).toBe('llama2');
  });

  it('constructor with custom baseUrl: no error thrown', () => {
    expect(() => new OllamaProvider({ baseUrl: 'http://custom:8080' })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// summarize() — successful response
// ---------------------------------------------------------------------------

describe('OllamaProvider — summarize() successful response', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns trimmed content on successful response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockSuccessResponse('  Mock summary  '),
    );
    const provider = new OllamaProvider();
    const result = await provider.summarize(dummyCode, dummyContext);
    expect(result).toBe('Mock summary');
  });

  it('calls the correct URL http://localhost:11434/api/generate', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockSuccessResponse(),
    );
    const provider = new OllamaProvider();
    await provider.summarize(dummyCode, dummyContext);
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toBe('http://localhost:11434/api/generate');
  });

  it('sends correct body with model, prompt, and stream: false', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockSuccessResponse(),
    );
    const provider = new OllamaProvider();
    await provider.summarize(dummyCode, dummyContext);
    const requestInit = fetchSpy.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(requestInit.body as string) as Record<string, unknown>;
    expect(body.model).toBe('codellama');
    expect(typeof body.prompt).toBe('string');
    expect(body.stream).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// summarize() — error cases
// ---------------------------------------------------------------------------

describe('OllamaProvider — summarize() ECONNREFUSED error', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws error containing "not running" when fetch fails with TypeError', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new TypeError('fetch failed'));
    const provider = new OllamaProvider();
    await expect(provider.summarize(dummyCode, dummyContext)).rejects.toThrow(
      /not running/i,
    );
  });
});

describe('OllamaProvider — summarize() 404 response', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws error containing "not found" when status is 404', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Not Found',
    } as unknown as Response);
    const provider = new OllamaProvider();
    await expect(provider.summarize(dummyCode, dummyContext)).rejects.toThrow(
      /not found/i,
    );
  });
});

describe('OllamaProvider — summarize() AbortError timeout', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws error containing "timed out" when fetch throws DOMException AbortError', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(
      new DOMException('The operation was aborted', 'AbortError'),
    );
    const provider = new OllamaProvider();
    await expect(provider.summarize(dummyCode, dummyContext)).rejects.toThrow(
      /timed out/i,
    );
  });
});

describe('OllamaProvider — summarize() JSON parse failure', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws error containing "parse" when response body is not valid JSON', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => 'not json',
    } as unknown as Response);
    const provider = new OllamaProvider();
    await expect(provider.summarize(dummyCode, dummyContext)).rejects.toThrow(
      /parse/i,
    );
  });
});

describe('OllamaProvider — summarize() empty response field', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws error containing "empty" when response.response is empty string', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ response: '' }),
    } as unknown as Response);
    const provider = new OllamaProvider();
    await expect(provider.summarize(dummyCode, dummyContext)).rejects.toThrow(
      /empty/i,
    );
  });
});

describe('OllamaProvider — summarize() non-ok response', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws error containing the status code when response is not ok', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Server error',
    } as unknown as Response);
    const provider = new OllamaProvider();
    await expect(provider.summarize(dummyCode, dummyContext)).rejects.toThrow(
      /500/,
    );
  });
});

// ---------------------------------------------------------------------------
// Custom model in request body
// ---------------------------------------------------------------------------

describe('OllamaProvider — custom model in request body', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends custom model name in request body', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockSuccessResponse(),
    );
    const provider = new OllamaProvider({ model: 'llama2' });
    await provider.summarize(dummyCode, dummyContext);
    const requestInit = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(requestInit.body as string).toContain('"model":"llama2"');
  });
});

// ---------------------------------------------------------------------------
// Custom baseUrl in request URL
// ---------------------------------------------------------------------------

describe('OllamaProvider — custom baseUrl in request URL', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses custom baseUrl as the fetch URL prefix', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockSuccessResponse(),
    );
    const provider = new OllamaProvider({ baseUrl: 'http://custom:8080' });
    await provider.summarize(dummyCode, dummyContext);
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl.startsWith('http://custom:8080')).toBe(true);
  });
});
