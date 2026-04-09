/**
 * CodeAtlas Web — Wiki API Client
 *
 * Fetch wrappers for the /api/wiki and /api/wiki/page/:slug endpoints.
 * All JSON.parse operations are wrapped in try-catch per coding standards.
 *
 * Sprint 19 — T13: Wiki Knowledge Graph Tab
 */

import type { WikiApiResponse, WikiPageDetail } from '../types/wiki';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface ApiError {
  code: string;
  message: string;
}

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

async function getJson<T>(url: string): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(url);
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
      error: {
        code: `HTTP_${response.status}`,
        message: `HTTP ${response.status}`,
      },
    };
  }

  let text: string;
  try {
    text = await response.text();
  } catch {
    return { ok: false, error: { code: 'READ_ERROR', message: 'Failed to read response body' } };
  }

  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, error: { code: 'PARSE_ERROR', message: 'Failed to parse JSON response' } };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * GET /api/wiki — fetch the wiki manifest.
 *
 * Returns `null` on any network or parse failure.
 * Returns `{ status: 'not_generated' }` when the wiki has never been built.
 * Returns the full `WikiManifest` when the wiki exists.
 */
export async function fetchWikiManifest(): Promise<WikiApiResponse | null> {
  const result = await getJson<WikiApiResponse>('/api/wiki');
  if (!result.ok) {
    console.warn('[wiki] fetchWikiManifest failed:', result.error.message);
    return null;
  }
  return result.data;
}

/**
 * GET /api/wiki/page/:slug — lazy-load a single wiki page.
 *
 * Returns `null` on any failure (network, 404, parse error).
 */
export async function fetchWikiPage(slug: string): Promise<WikiPageDetail | null> {
  const safeSlug = encodeURIComponent(slug);
  const result = await getJson<WikiPageDetail>(`/api/wiki/page/${safeSlug}`);
  if (!result.ok) {
    console.warn(`[wiki] fetchWikiPage(${slug}) failed:`, result.error.message);
    return null;
  }
  return result.data;
}
