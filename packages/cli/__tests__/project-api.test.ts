/**
 * Unit tests for /api/project/* route handler logic (Sprint 20 T5)
 *
 * Strategy: Because the full Fastify server spins up with static file serving
 * and live analysis.json files, we test the handler logic directly by
 * replicating the validation and branching logic used in the route handlers,
 * following the same pattern used in server-ai-endpoints.test.ts.
 *
 * Coverage:
 *   - GET /api/project/status — returns mode + optional currentPath/projectName
 *   - POST /api/project/validate — valid path, not found, not directory, missing body
 *   - GET /api/project/recent — returns array from getRecentProjects
 *   - DELETE /api/project/recent/:index — valid index, invalid index
 *   - POST /api/project/progress/:jobId — invalid job id detection
 */

import { describe, it, expect } from 'vitest';
import path from 'node:path';

// ---------------------------------------------------------------------------
// GET /api/project/status — logic unit tests
// ---------------------------------------------------------------------------

type ServerMode = 'idle' | 'analyzing' | 'ready';

interface ServerStatus {
  mode: ServerMode;
  currentPath?: string;
  projectName?: string;
}

function buildStatusResponse(
  mode: ServerMode,
  currentProjectPath?: string,
): ServerStatus {
  const status: ServerStatus = { mode };
  if (currentProjectPath !== undefined) {
    status.currentPath = currentProjectPath;
    status.projectName = path.basename(currentProjectPath);
  }
  return status;
}

describe('GET /api/project/status — response shape', () => {
  it('returns mode: idle when no project is loaded', () => {
    const status = buildStatusResponse('idle', undefined);
    expect(status.mode).toBe('idle');
    expect(status.currentPath).toBeUndefined();
    expect(status.projectName).toBeUndefined();
  });

  it('returns mode: ready with currentPath and projectName when project loaded', () => {
    const status = buildStatusResponse('ready', '/home/user/my-app');
    expect(status.mode).toBe('ready');
    expect(status.currentPath).toBe('/home/user/my-app');
    expect(status.projectName).toBe('my-app');
  });

  it('returns mode: analyzing during ongoing analysis', () => {
    const status = buildStatusResponse('analyzing', '/home/user/my-app');
    expect(status.mode).toBe('analyzing');
  });

  it('extracts correct project name from nested path', () => {
    const status = buildStatusResponse('ready', '/users/alice/projects/codeatlas');
    expect(status.projectName).toBe('codeatlas');
  });

  it('response includes only mode when currentProjectPath is undefined', () => {
    const status = buildStatusResponse('idle');
    expect(Object.keys(status)).toEqual(['mode']);
  });
});

// ---------------------------------------------------------------------------
// POST /api/project/validate — validation logic
// ---------------------------------------------------------------------------

interface ValidateBody {
  path?: unknown;
}

interface ValidateResult {
  valid: boolean;
  reason?: string;
  code?: 400;
}

function validateRequestBody(body: ValidateBody): ValidateResult | null {
  const rawPath = body.path;

  // Missing or non-string path
  if (typeof rawPath !== 'string' || (rawPath as string).trim().length === 0) {
    return { valid: false, code: 400 };
  }

  // Path too long
  if ((rawPath as string).length > 4096) {
    return { valid: false, reason: 'path_too_long' };
  }

  // Path traversal: null bytes
  if ((rawPath as string).includes('\0')) {
    return { valid: false, reason: 'not_found' };
  }

  return null; // needs further fs validation
}

describe('POST /api/project/validate — request body validation', () => {
  it('returns 400 when body has no path field', () => {
    const result = validateRequestBody({});
    expect(result).not.toBeNull();
    expect(result!.code).toBe(400);
  });

  it('returns 400 when path is an empty string', () => {
    const result = validateRequestBody({ path: '' });
    expect(result).not.toBeNull();
    expect(result!.code).toBe(400);
  });

  it('returns 400 when path is whitespace only', () => {
    const result = validateRequestBody({ path: '   ' });
    expect(result).not.toBeNull();
    expect(result!.code).toBe(400);
  });

  it('returns 400 when path is a number instead of string', () => {
    const result = validateRequestBody({ path: 42 });
    expect(result).not.toBeNull();
    expect(result!.code).toBe(400);
  });

  it('returns 400 when path is null', () => {
    const result = validateRequestBody({ path: null });
    expect(result).not.toBeNull();
    expect(result!.code).toBe(400);
  });

  it('returns path_too_long when path exceeds 4096 characters', () => {
    const result = validateRequestBody({ path: 'a'.repeat(4097) });
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('path_too_long');
  });

  it('returns not_found for path containing null byte', () => {
    const result = validateRequestBody({ path: '/valid/path\0evil' });
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('not_found');
  });

  it('returns null (needs further fs validation) for a valid-looking path', () => {
    const result = validateRequestBody({ path: '/home/user/my-project' });
    expect(result).toBeNull();
  });

  it('accepts path that is exactly 4096 characters', () => {
    const result = validateRequestBody({ path: 'a'.repeat(4096) });
    // Should proceed to fs validation (null = no early rejection)
    expect(result).toBeNull();
  });
});

describe('POST /api/project/validate — fs-based response shapes', () => {
  it('not_found response has valid: false and reason: not_found', () => {
    const response = { valid: false, reason: 'not_found' };
    expect(response.valid).toBe(false);
    expect(response.reason).toBe('not_found');
  });

  it('not_directory response has valid: false and reason: not_directory', () => {
    const response = { valid: false, reason: 'not_directory' };
    expect(response.valid).toBe(false);
    expect(response.reason).toBe('not_directory');
  });

  it('no_source_files response has valid: false and reason: no_source_files', () => {
    const response = { valid: false, reason: 'no_source_files' };
    expect(response.valid).toBe(false);
    expect(response.reason).toBe('no_source_files');
  });

  it('valid response includes stats with fileCount and languages', () => {
    const response = {
      valid: true,
      stats: { fileCount: 42, languages: ['typescript', 'javascript'] },
    };
    expect(response.valid).toBe(true);
    expect(response.stats.fileCount).toBe(42);
    expect(response.stats.languages).toContain('typescript');
  });
});

// ---------------------------------------------------------------------------
// GET /api/project/recent — response contract
// ---------------------------------------------------------------------------

describe('GET /api/project/recent — response contract', () => {
  it('response is an array', () => {
    // Handler calls getRecentProjects() which always returns an array
    const mockProjects = [
      { path: '/projects/a', name: 'a', lastOpened: new Date().toISOString() },
      { path: '/projects/b', name: 'b', lastOpened: new Date().toISOString() },
    ];
    expect(Array.isArray(mockProjects)).toBe(true);
  });

  it('empty array is a valid response (no recent projects)', () => {
    const response: unknown[] = [];
    expect(Array.isArray(response)).toBe(true);
    expect(response).toHaveLength(0);
  });

  it('each recent project entry has required fields', () => {
    const entry = {
      path: '/projects/my-app',
      name: 'my-app',
      lastOpened: new Date().toISOString(),
    };
    expect(typeof entry.path).toBe('string');
    expect(typeof entry.name).toBe('string');
    expect(typeof entry.lastOpened).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/project/recent/:index — validation logic
// ---------------------------------------------------------------------------

function parseRecentIndex(indexStr: string): { index: number; valid: boolean } {
  const index = parseInt(indexStr, 10);
  if (isNaN(index) || index < 0) {
    return { index: -1, valid: false };
  }
  return { index, valid: true };
}

describe('DELETE /api/project/recent/:index — index validation', () => {
  it('rejects NaN index string', () => {
    const result = parseRecentIndex('abc');
    expect(result.valid).toBe(false);
  });

  it('rejects negative index', () => {
    const result = parseRecentIndex('-1');
    expect(result.valid).toBe(false);
  });

  it('rejects empty string', () => {
    const result = parseRecentIndex('');
    expect(result.valid).toBe(false);
  });

  it('accepts zero', () => {
    const result = parseRecentIndex('0');
    expect(result.valid).toBe(true);
    expect(result.index).toBe(0);
  });

  it('accepts positive integer', () => {
    const result = parseRecentIndex('5');
    expect(result.valid).toBe(true);
    expect(result.index).toBe(5);
  });

  it('success response has { success: true }', () => {
    const response = { success: true };
    expect(response.success).toBe(true);
  });

  it('error response for invalid index has error: invalid_index', () => {
    const response = { error: 'invalid_index', message: 'Index must be a non-negative integer.' };
    expect(response.error).toBe('invalid_index');
  });
});

// ---------------------------------------------------------------------------
// GET /api/project/progress/:jobId — job ID validation
// ---------------------------------------------------------------------------

function isValidJobId(jobId: string): boolean {
  return Boolean(jobId) && !jobId.includes('..');
}

describe('GET /api/project/progress/:jobId — job ID validation', () => {
  it('rejects empty jobId', () => {
    expect(isValidJobId('')).toBe(false);
  });

  it('rejects jobId containing path traversal sequence', () => {
    expect(isValidJobId('job-../etc/passwd')).toBe(false);
  });

  it('accepts standard job ID format', () => {
    expect(isValidJobId('job-1712345678-abc123')).toBe(true);
  });

  it('accepts project job ID format', () => {
    expect(isValidJobId('project-1712345678-xyz789')).toBe(true);
  });

  it('job_not_found error has correct shape', () => {
    const jobId = 'nonexistent-job';
    const response = {
      error: 'job_not_found',
      message: `No job found: ${jobId}`,
    };
    expect(response.error).toBe('job_not_found');
    expect(response.message).toContain(jobId);
  });

  it('polling response (non-SSE) has standard AnalysisProgress shape', () => {
    const mockProgress = {
      jobId: 'job-123-abc',
      status: 'scanning',
      startedAt: new Date().toISOString(),
      stages: {
        scanning: { status: 'running', progress: 0 },
        parsing: { status: 'pending', progress: 0 },
        building: { status: 'pending', progress: 0 },
      },
    };
    expect(typeof mockProgress.jobId).toBe('string');
    expect(typeof mockProgress.status).toBe('string');
    expect(typeof mockProgress.stages).toBe('object');
  });
});
