/**
 * CodeAtlas Web — AI Summary API
 *
 * Fetch wrappers for /api/ai/summary and /api/ai/status endpoints.
 * All JSON.parse wrapped in try-catch per coding standards.
 */

import type { AiSummaryResponse, AiStatusResponse, AiOverviewResponse, AiSearchKeywordsResponse } from '../types/graph';

/** Typed API error */
export interface ApiError {
  code: string;
  message: string;
}

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/**
 * GET /api/ai/status — Check if AI is enabled.
 */
export async function fetchAiStatus(): Promise<ApiResult<AiStatusResponse>> {
  let response: Response;
  try {
    response = await fetch('/api/ai/status');
  } catch (err: unknown) {
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Network request failed',
      },
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: { code: `HTTP_${response.status}`, message: `HTTP ${response.status}` },
    };
  }

  let text: string;
  try {
    text = await response.text();
  } catch {
    return { ok: false, error: { code: 'READ_ERROR', message: 'Failed to read response' } };
  }

  try {
    return { ok: true, data: JSON.parse(text) as AiStatusResponse };
  } catch {
    return { ok: false, error: { code: 'PARSE_ERROR', message: 'Failed to parse JSON' } };
  }
}

/**
 * POST /api/ai/summary — Get AI summary for a node.
 */
export async function fetchAiSummary(nodeId: string): Promise<ApiResult<AiSummaryResponse>> {
  let response: Response;
  try {
    response = await fetch('/api/ai/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId }),
    });
  } catch (err: unknown) {
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Network request failed',
      },
    };
  }

  if (!response.ok) {
    let errorBody: string;
    try {
      errorBody = await response.text();
    } catch {
      errorBody = `HTTP ${response.status}`;
    }

    let parsed: { error?: string; message?: string } | undefined;
    try {
      parsed = JSON.parse(errorBody) as { error?: string; message?: string };
    } catch {
      // Not JSON
    }

    return {
      ok: false,
      error: {
        code: parsed?.error ?? `HTTP_${response.status}`,
        message: parsed?.message ?? errorBody,
      },
    };
  }

  let text: string;
  try {
    text = await response.text();
  } catch {
    return { ok: false, error: { code: 'READ_ERROR', message: 'Failed to read response' } };
  }

  try {
    return { ok: true, data: JSON.parse(text) as AiSummaryResponse };
  } catch {
    return { ok: false, error: { code: 'PARSE_ERROR', message: 'Failed to parse JSON' } };
  }
}

/**
 * POST /api/ai/overview — Get AI project overview (Sprint 8).
 */
export async function fetchAiOverview(provider?: string): Promise<ApiResult<AiOverviewResponse>> {
  let response: Response;
  try {
    response = await fetch('/api/ai/overview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    });
  } catch (err: unknown) {
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Network request failed',
      },
    };
  }

  if (!response.ok) {
    let errorBody: string;
    try {
      errorBody = await response.text();
    } catch {
      errorBody = `HTTP ${response.status}`;
    }

    let parsed: { error?: string; message?: string } | undefined;
    try {
      parsed = JSON.parse(errorBody) as { error?: string; message?: string };
    } catch {
      // Not JSON
    }

    return {
      ok: false,
      error: {
        code: parsed?.error ?? `HTTP_${response.status}`,
        message: parsed?.message ?? errorBody,
      },
    };
  }

  let text: string;
  try {
    text = await response.text();
  } catch {
    return { ok: false, error: { code: 'READ_ERROR', message: 'Failed to read response' } };
  }

  try {
    return { ok: true, data: JSON.parse(text) as AiOverviewResponse };
  } catch {
    return { ok: false, error: { code: 'PARSE_ERROR', message: 'Failed to parse JSON' } };
  }
}

/**
 * POST /api/ai/search-keywords — AI natural language search (Sprint 8 P1).
 */
export async function fetchSearchKeywords(query: string, provider?: string): Promise<ApiResult<AiSearchKeywordsResponse>> {
  let response: Response;
  try {
    response = await fetch('/api/ai/search-keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, provider }),
    });
  } catch (err: unknown) {
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Network request failed',
      },
    };
  }

  if (!response.ok) {
    let errorBody: string;
    try {
      errorBody = await response.text();
    } catch {
      errorBody = `HTTP ${response.status}`;
    }

    let parsed: { error?: string; message?: string } | undefined;
    try {
      parsed = JSON.parse(errorBody) as { error?: string; message?: string };
    } catch {
      // Not JSON
    }

    return {
      ok: false,
      error: {
        code: parsed?.error ?? `HTTP_${response.status}`,
        message: parsed?.message ?? errorBody,
      },
    };
  }

  let text: string;
  try {
    text = await response.text();
  } catch {
    return { ok: false, error: { code: 'READ_ERROR', message: 'Failed to read response' } };
  }

  try {
    return { ok: true, data: JSON.parse(text) as AiSearchKeywordsResponse };
  } catch {
    return { ok: false, error: { code: 'PARSE_ERROR', message: 'Failed to parse JSON' } };
  }
}
