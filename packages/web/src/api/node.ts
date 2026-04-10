/**
 * CodeAtlas Web — Node Detail API
 *
 * Fetch wrapper for /api/node/:id endpoint.
 * All JSON.parse wrapped in try-catch per coding standards.
 * No Content-Type header on GET requests.
 */

import type { NodeDetailResponse } from '../types/graph';

/** Typed API error */
export interface ApiError {
  code: string;
  message: string;
}

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/**
 * GET /api/node/:id — Fetch node detail including edges and source code.
 */
export async function fetchNodeDetail(id: string): Promise<ApiResult<NodeDetailResponse>> {
  let response: Response;
  try {
    response = await fetch(`/api/node/${encodeURIComponent(id)}`);
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
  } catch (err: unknown) {
    return {
      ok: false,
      error: {
        code: 'READ_ERROR',
        message: err instanceof Error ? err.message : 'Failed to read response body',
      },
    };
  }

  let data: NodeDetailResponse;
  try {
    data = JSON.parse(text) as NodeDetailResponse;
  } catch {
    return {
      ok: false,
      error: {
        code: 'PARSE_ERROR',
        message: 'Failed to parse JSON response',
      },
    };
  }

  return { ok: true, data };
}
