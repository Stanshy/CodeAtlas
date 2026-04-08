/**
 * CodeAtlas Web — API Fetch Layer
 *
 * Fetch wrappers for local server endpoints.
 * All JSON.parse wrapped in try-catch per coding standards.
 * No Content-Type header on GET requests (Fastify returns 400 otherwise).
 */

import type { AnalysisResult, AnalysisStats, NodeDetailResponse, FunctionNodesResponse } from '../types/graph';
import type { AIAnalyzeResponse, AIJobResponse, AIConfigureResult, AIJobScope } from '../types/graph';

/** Typed API error returned by fetch helpers */
export interface ApiError {
  code: string;
  message: string;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/**
 * Generic fetch helper with error handling + JSON.parse try-catch.
 */
async function apiFetch<T>(url: string, options?: RequestInit): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, options);
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
      // Not JSON — use raw text
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

  let data: T;
  try {
    data = JSON.parse(text) as T;
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

/**
 * GET /api/graph — Full analysis result
 */
export function fetchGraph(): Promise<ApiResult<AnalysisResult>> {
  // Sprint 15.1: include function nodes so LO view can display methodRole + aiSummary
  return apiFetch<AnalysisResult>('/api/graph?include=functions');
}

/**
 * GET /api/graph/stats — Analysis statistics only
 */
export function fetchStats(): Promise<ApiResult<AnalysisStats>> {
  return apiFetch<AnalysisStats>('/api/graph/stats');
}

/**
 * GET /api/node/:id — Single node detail with edges and source code
 */
export function fetchNode(id: string): Promise<ApiResult<NodeDetailResponse>> {
  return apiFetch<NodeDetailResponse>(`/api/node/${encodeURIComponent(id)}`);
}

/**
 * GET /api/graph/functions/:fileId — Function/class nodes for a specific file (Sprint 7)
 */
export function fetchFunctionNodes(fileId: string): Promise<ApiResult<FunctionNodesResponse>> {
  return apiFetch<FunctionNodesResponse>(`/api/graph/functions/${encodeURIComponent(fileId)}`);
}

/**
 * POST /api/ai/analyze — 觸發 AI 分析 job
 */
export async function postAIAnalyze(
  scope: AIJobScope,
  target?: string,
  force = false,
): Promise<AIAnalyzeResponse> {
  const res = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope, target, force }),
  });
  if (!res.ok) {
    throw new Error(`POST /api/ai/analyze failed: ${res.status}`);
  }
  return res.json() as Promise<AIAnalyzeResponse>;
}

/**
 * GET /api/ai/jobs/:jobId — 查詢 job 狀態
 */
export async function getAIJob(jobId: string): Promise<AIJobResponse> {
  const res = await fetch(`/api/ai/jobs/${encodeURIComponent(jobId)}`);
  if (!res.ok) {
    throw new Error(`GET /api/ai/jobs/${jobId} failed: ${res.status}`);
  }
  return res.json() as Promise<AIJobResponse>;
}

/**
 * POST /api/ai/configure — 切換 AI Provider
 */
export async function postAIConfigure(
  provider: string,
  apiKey?: string,
): Promise<AIConfigureResult> {
  const body: Record<string, string> = { provider };
  if (apiKey !== undefined) {
    body.apiKey = apiKey;
  }
  const res = await fetch('/api/ai/configure', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`POST /api/ai/configure failed: ${res.status}`);
  }
  return res.json() as Promise<AIConfigureResult>;
}
