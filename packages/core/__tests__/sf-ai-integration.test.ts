/**
 * Sprint 15 — SF + DJ AI Integration Tests (T10)
 *
 * Coverage targets:
 *   - DirectorySummarySchema: valid parse, missing fields, length limits, confidence bounds
 *   - EndpointDescriptionSchema: valid parse, missing fields, length limits
 *   - StepDetailSchema: valid parse, missing fields, length limits
 *   - validateDirectorySummary / validateEndpointDescription / validateStepDetail: throw on invalid
 *   - safeValidateDirectorySummary / safeValidateEndpointDescription / safeValidateStepDetail: safe results
 *   - buildLargeContext: directory structure, file list, function signatures, budget enforcement
 *   - buildDirectorySummaryPrompt / buildEndpointDescriptionPrompt / buildStepDetailPrompt: template content
 */

import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
  DirectorySummarySchema,
  EndpointDescriptionSchema,
  StepDetailSchema,
  validateDirectorySummary,
  validateEndpointDescription,
  validateStepDetail,
  safeValidateDirectorySummary,
  safeValidateEndpointDescription,
  safeValidateStepDetail,
} from '../src/ai/contracts.js';
import {
  buildLargeContext,
  estimateTokens,
  BUDGET_LIMITS,
} from '../src/ai/prompt-budget.js';
import type { DirectoryInfo } from '../src/ai/prompt-budget.js';
import {
  buildDirectorySummaryPrompt,
  buildEndpointDescriptionPrompt,
  buildStepDetailPrompt,
} from '../src/ai/prompt-templates.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDirectoryInfo(overrides: Partial<DirectoryInfo> = {}): DirectoryInfo {
  return {
    path: 'src/services',
    files: [
      {
        name: 'user-service.ts',
        exports: ['UserService', 'createUser'],
        lineCount: 120,
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// DirectorySummarySchema
// ---------------------------------------------------------------------------

describe('DirectorySummarySchema', () => {
  const valid = {
    directoryPath: 'src/services',
    role: '服務層',
    oneLineSummary: '處理核心業務邏輯',
    confidence: 0.85,
  };

  it('parses valid directory summary', () => {
    const result = DirectorySummarySchema.parse(valid);
    expect(result.directoryPath).toBe('src/services');
    expect(result.role).toBe('服務層');
    expect(result.oneLineSummary).toBe('處理核心業務邏輯');
    expect(result.confidence).toBe(0.85);
  });

  it('rejects missing directoryPath', () => {
    const { directoryPath: _dp, ...without } = valid;
    const result = DirectorySummarySchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it('rejects oneLineSummary exceeding 30 chars', () => {
    const tooLong = 'a'.repeat(31);
    const result = DirectorySummarySchema.safeParse({ ...valid, oneLineSummary: tooLong });
    expect(result.success).toBe(false);
  });

  it('accepts oneLineSummary of exactly 30 chars', () => {
    const exactly30 = 'a'.repeat(30);
    const result = DirectorySummarySchema.safeParse({ ...valid, oneLineSummary: exactly30 });
    expect(result.success).toBe(true);
  });

  it('accepts optional keyResponsibilities when provided', () => {
    const withResps = { ...valid, keyResponsibilities: ['用戶認證', '訂單處理'] };
    const result = DirectorySummarySchema.parse(withResps);
    expect(result.keyResponsibilities).toEqual(['用戶認證', '訂單處理']);
  });

  it('keyResponsibilities is absent when not provided', () => {
    const result = DirectorySummarySchema.parse(valid);
    expect(result.keyResponsibilities).toBeUndefined();
  });

  it('rejects confidence > 1', () => {
    const result = DirectorySummarySchema.safeParse({ ...valid, confidence: 1.1 });
    expect(result.success).toBe(false);
  });

  it('rejects confidence < 0', () => {
    const result = DirectorySummarySchema.safeParse({ ...valid, confidence: -0.1 });
    expect(result.success).toBe(false);
  });

  it('accepts confidence at boundary 0', () => {
    const result = DirectorySummarySchema.safeParse({ ...valid, confidence: 0 });
    expect(result.success).toBe(true);
  });

  it('accepts confidence at boundary 1', () => {
    const result = DirectorySummarySchema.safeParse({ ...valid, confidence: 1 });
    expect(result.success).toBe(true);
  });

  it('rejects missing role', () => {
    const { role: _r, ...without } = valid;
    const result = DirectorySummarySchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it('rejects missing confidence', () => {
    const { confidence: _c, ...without } = valid;
    const result = DirectorySummarySchema.safeParse(without);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// EndpointDescriptionSchema
// ---------------------------------------------------------------------------

describe('EndpointDescriptionSchema', () => {
  const valid = {
    endpointId: 'POST /api/v1/videos/upload',
    method: 'POST',
    path: '/api/v1/videos/upload',
    chineseDescription: '影片上傳',
    purpose: 'Upload a video file and create a video record',
    confidence: 0.9,
  };

  it('parses valid endpoint description', () => {
    const result = EndpointDescriptionSchema.parse(valid);
    expect(result.endpointId).toBe('POST /api/v1/videos/upload');
    expect(result.method).toBe('POST');
    expect(result.path).toBe('/api/v1/videos/upload');
    expect(result.chineseDescription).toBe('影片上傳');
    expect(result.purpose).toBe('Upload a video file and create a video record');
    expect(result.confidence).toBe(0.9);
  });

  it('rejects missing method', () => {
    const { method: _m, ...without } = valid;
    const result = EndpointDescriptionSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it('rejects missing path', () => {
    const { path: _p, ...without } = valid;
    const result = EndpointDescriptionSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it('rejects chineseDescription exceeding 20 chars', () => {
    const tooLong = '測'.repeat(21);
    const result = EndpointDescriptionSchema.safeParse({ ...valid, chineseDescription: tooLong });
    expect(result.success).toBe(false);
  });

  it('accepts chineseDescription of exactly 20 chars', () => {
    const exactly20 = 'a'.repeat(20);
    const result = EndpointDescriptionSchema.safeParse({ ...valid, chineseDescription: exactly20 });
    expect(result.success).toBe(true);
  });

  it('rejects missing purpose', () => {
    const { purpose: _p, ...without } = valid;
    const result = EndpointDescriptionSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it('rejects missing endpointId', () => {
    const { endpointId: _e, ...without } = valid;
    const result = EndpointDescriptionSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it('rejects confidence out of range', () => {
    expect(EndpointDescriptionSchema.safeParse({ ...valid, confidence: 1.5 }).success).toBe(false);
    expect(EndpointDescriptionSchema.safeParse({ ...valid, confidence: -0.1 }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// StepDetailSchema
// ---------------------------------------------------------------------------

describe('StepDetailSchema', () => {
  const valid = {
    stepIndex: 0,
    methodId: 'src/services/video.ts#createVideo',
    description: '建立影片記錄',
    input: 'videoFile: File, userId: string',
    output: 'Video record',
    transform: 'Saves file metadata to DB',
  };

  it('parses valid step detail', () => {
    const result = StepDetailSchema.parse(valid);
    expect(result.stepIndex).toBe(0);
    expect(result.methodId).toBe('src/services/video.ts#createVideo');
    expect(result.description).toBe('建立影片記錄');
    expect(result.input).toBe('videoFile: File, userId: string');
    expect(result.output).toBe('Video record');
    expect(result.transform).toBe('Saves file metadata to DB');
  });

  it('rejects missing input', () => {
    const { input: _i, ...without } = valid;
    const result = StepDetailSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it('rejects missing output', () => {
    const { output: _o, ...without } = valid;
    const result = StepDetailSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it('rejects missing transform', () => {
    const { transform: _t, ...without } = valid;
    const result = StepDetailSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it('rejects description exceeding 30 chars', () => {
    const tooLong = 'a'.repeat(31);
    const result = StepDetailSchema.safeParse({ ...valid, description: tooLong });
    expect(result.success).toBe(false);
  });

  it('accepts description of exactly 30 chars', () => {
    const exactly30 = 'a'.repeat(30);
    const result = StepDetailSchema.safeParse({ ...valid, description: exactly30 });
    expect(result.success).toBe(true);
  });

  it('rejects missing stepIndex', () => {
    const { stepIndex: _s, ...without } = valid;
    const result = StepDetailSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it('rejects missing methodId', () => {
    const { methodId: _m, ...without } = valid;
    const result = StepDetailSchema.safeParse(without);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Strict validators — throw on failure
// ---------------------------------------------------------------------------

describe('validators', () => {
  // validateDirectorySummary
  it('validateDirectorySummary returns parsed result for valid input', () => {
    const valid = {
      directoryPath: 'src/routes',
      role: '路由層',
      oneLineSummary: 'API 路由定義',
      confidence: 0.9,
    };
    const result = validateDirectorySummary(valid);
    expect(result.directoryPath).toBe('src/routes');
    expect(result.role).toBe('路由層');
  });

  it('validateDirectorySummary throws ZodError on invalid input', () => {
    expect(() => validateDirectorySummary({})).toThrow(ZodError);
  });

  it('validateDirectorySummary throws ZodError when oneLineSummary too long', () => {
    const invalid = {
      directoryPath: 'src/routes',
      role: '路由層',
      oneLineSummary: 'x'.repeat(31),
      confidence: 0.9,
    };
    expect(() => validateDirectorySummary(invalid)).toThrow(ZodError);
  });

  // validateEndpointDescription
  it('validateEndpointDescription returns parsed result for valid input', () => {
    const valid = {
      endpointId: 'GET /api/users',
      method: 'GET',
      path: '/api/users',
      chineseDescription: '取得用戶列表',
      purpose: 'Retrieves all users',
      confidence: 0.8,
    };
    const result = validateEndpointDescription(valid);
    expect(result.method).toBe('GET');
    expect(result.path).toBe('/api/users');
  });

  it('validateEndpointDescription throws ZodError on invalid input', () => {
    expect(() => validateEndpointDescription({ method: 'GET' })).toThrow(ZodError);
  });

  // validateStepDetail
  it('validateStepDetail returns parsed result for valid input', () => {
    const valid = {
      stepIndex: 1,
      methodId: 'src/db/user-repo.ts#findAll',
      description: '查詢資料庫',
      input: 'userId: string',
      output: 'User[]',
      transform: 'DB query result',
    };
    const result = validateStepDetail(valid);
    expect(result.stepIndex).toBe(1);
    expect(result.methodId).toBe('src/db/user-repo.ts#findAll');
  });

  it('validateStepDetail throws ZodError on invalid input', () => {
    expect(() => validateStepDetail({})).toThrow(ZodError);
  });

  // safeValidateDirectorySummary
  it('safeValidateDirectorySummary returns success:true for valid input', () => {
    const valid = {
      directoryPath: 'src/models',
      role: '資料層',
      oneLineSummary: '資料庫模型定義',
      confidence: 0.75,
    };
    const result = safeValidateDirectorySummary(valid);
    expect(result.success).toBe(true);
  });

  it('safeValidateDirectorySummary returns error on invalid input', () => {
    const result = safeValidateDirectorySummary({ role: '資料層' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it('safeValidateDirectorySummary does not throw for null input', () => {
    expect(() => safeValidateDirectorySummary(null)).not.toThrow();
  });

  // safeValidateEndpointDescription
  it('safeValidateEndpointDescription returns success:true for valid input', () => {
    const valid = {
      endpointId: 'DELETE /api/sessions/:id',
      method: 'DELETE',
      path: '/api/sessions/:id',
      chineseDescription: '刪除會話',
      purpose: 'Deletes a user session',
      confidence: 0.95,
    };
    const result = safeValidateEndpointDescription(valid);
    expect(result.success).toBe(true);
  });

  it('safeValidateEndpointDescription returns error on invalid input', () => {
    const result = safeValidateEndpointDescription({ method: 'POST' });
    expect(result.success).toBe(false);
  });

  it('safeValidateEndpointDescription does not throw for undefined input', () => {
    expect(() => safeValidateEndpointDescription(undefined)).not.toThrow();
  });

  // safeValidateStepDetail
  it('safeValidateStepDetail returns success:true for valid input', () => {
    const valid = {
      stepIndex: 2,
      methodId: 'src/services/auth.ts#verifyToken',
      description: '驗證 token',
      input: 'token: string',
      output: 'boolean',
      transform: 'JWT verification',
    };
    const result = safeValidateStepDetail(valid);
    expect(result.success).toBe(true);
  });

  it('safeValidateStepDetail returns error on invalid input', () => {
    const result = safeValidateStepDetail({ stepIndex: 0 });
    expect(result.success).toBe(false);
  });

  it('safeValidateStepDetail does not throw for null input', () => {
    expect(() => safeValidateStepDetail(null)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// buildLargeContext
// ---------------------------------------------------------------------------

describe('buildLargeContext', () => {
  it('builds context with directory structure and file list', () => {
    const dir = makeDirectoryInfo({
      path: 'src/services',
      files: [
        { name: 'user-service.ts', exports: ['UserService'], lineCount: 120 },
        { name: 'auth-service.ts', exports: ['AuthService', 'login'], lineCount: 80 },
      ],
    });
    const result = buildLargeContext(dir);
    expect(result).toContain('Directory: src/services');
    expect(result).toContain('user-service.ts');
    expect(result).toContain('auth-service.ts');
    expect(result).toContain('UserService');
    expect(result).toContain('Files (2)');
  });

  it('includes subdirectory listing when subdirectories are provided', () => {
    const dir = makeDirectoryInfo({
      path: 'src',
      subdirectories: ['services', 'routes', 'models'],
      files: [{ name: 'index.ts', exports: [], lineCount: 10 }],
    });
    const result = buildLargeContext(dir);
    expect(result).toContain('Subdirectories:');
    expect(result).toContain('services/');
    expect(result).toContain('routes/');
    expect(result).toContain('models/');
  });

  it('includes function signatures from largest files', () => {
    const dir = makeDirectoryInfo({
      path: 'src/services',
      files: [
        {
          name: 'big-service.ts',
          exports: ['BigService'],
          lineCount: 500,
          functions: [
            { name: 'processPayment', signature: 'async processPayment(amount: number): Promise<void>' },
            { name: 'refundOrder', signature: 'async refundOrder(orderId: string): Promise<boolean>' },
          ],
        },
        {
          name: 'small-util.ts',
          exports: ['formatDate'],
          lineCount: 20,
          functions: [
            { name: 'formatDate', signature: 'formatDate(date: Date): string' },
          ],
        },
      ],
    });
    const result = buildLargeContext(dir);
    expect(result).toContain('Function Signatures:');
    expect(result).toContain('processPayment');
    expect(result).toContain('refundOrder');
  });

  it('truncates to large budget limit', () => {
    // Create many files with long exports to stress the budget
    const manyFiles = Array.from({ length: 100 }, (_, i) => ({
      name: `module${i}.ts`,
      exports: Array.from({ length: 10 }, (__, j) => `export${i}_${j}`),
      lineCount: i * 10 + 1,
    }));
    const dir = makeDirectoryInfo({ path: 'src', files: manyFiles });
    const result = buildLargeContext(dir, 'large');
    expect(estimateTokens(result)).toBeLessThanOrEqual(BUDGET_LIMITS.large);
  });

  it('handles empty files array', () => {
    const dir = makeDirectoryInfo({ path: 'src/empty', files: [] });
    const result = buildLargeContext(dir);
    expect(result).toContain('Directory: src/empty');
    expect(result).toContain('Files (0)');
    expect(result).not.toContain('Function Signatures:');
  });

  it('limits to 5 files in phase 2 (function signatures)', () => {
    // Create 8 files all with functions — only top 5 by lineCount should appear
    const files = Array.from({ length: 8 }, (_, i) => ({
      name: `file${i}.ts`,
      exports: [`Export${i}`],
      lineCount: (i + 1) * 100,
      functions: [{ name: `fn${i}`, signature: `fn${i}(): void` }],
    }));
    const dir = makeDirectoryInfo({ path: 'src', files });
    const result = buildLargeContext(dir);
    // Count how many "--- file*.ts ---" headers appear in the signature section
    const signatureHeaders = (result.match(/---\s+file\d+\.ts\s+---/g) ?? []).length;
    expect(signatureHeaders).toBeLessThanOrEqual(5);
  });

  it('does not include function signatures when no files have functions', () => {
    const dir = makeDirectoryInfo({
      path: 'src/types',
      files: [
        { name: 'interfaces.ts', exports: ['UserInterface'], lineCount: 50 },
        { name: 'enums.ts', exports: ['Status'], lineCount: 30 },
      ],
    });
    const result = buildLargeContext(dir);
    expect(result).not.toContain('Function Signatures:');
  });

  it('uses small budget when specified', () => {
    const files = Array.from({ length: 10 }, (_, i) => ({
      name: `file${i}.ts`,
      exports: Array.from({ length: 5 }, (__, j) => `export${i}_${j}`),
      lineCount: 100,
    }));
    const dir = makeDirectoryInfo({ path: 'src', files });
    const result = buildLargeContext(dir, 'small');
    expect(estimateTokens(result)).toBeLessThanOrEqual(BUDGET_LIMITS.small);
  });
});

// ---------------------------------------------------------------------------
// Sprint 15 prompt templates
// ---------------------------------------------------------------------------

describe('Sprint 15 prompt templates', () => {
  // buildDirectorySummaryPrompt
  it('buildDirectorySummaryPrompt includes directoryPath in output', () => {
    const context = 'Directory: src/services\nFiles: user-service.ts';
    const result = buildDirectorySummaryPrompt(context, 'src/services');
    expect(result).toContain('src/services');
  });

  it('buildDirectorySummaryPrompt includes the directory context', () => {
    const context = 'Directory: src/routes\nFiles: api.ts (50 lines)';
    const result = buildDirectorySummaryPrompt(context, 'src/routes');
    expect(result).toContain('src/routes');
    expect(result).toContain(context);
  });

  it('buildDirectorySummaryPrompt mentions oneLineSummary constraint', () => {
    const result = buildDirectorySummaryPrompt('context', 'src/models');
    expect(result).toContain('30');
  });

  it('buildDirectorySummaryPrompt mentions confidence field', () => {
    const result = buildDirectorySummaryPrompt('context', 'src/utils');
    expect(result).toContain('confidence');
  });

  // buildEndpointDescriptionPrompt
  it('buildEndpointDescriptionPrompt includes method in output', () => {
    const result = buildEndpointDescriptionPrompt('handler code', 'POST /api/upload', 'POST', '/api/upload');
    expect(result).toContain('POST');
  });

  it('buildEndpointDescriptionPrompt includes path in output', () => {
    const result = buildEndpointDescriptionPrompt('handler code', 'GET /api/users', 'GET', '/api/users');
    expect(result).toContain('/api/users');
  });

  it('buildEndpointDescriptionPrompt includes endpointId in output', () => {
    const result = buildEndpointDescriptionPrompt('handler code', 'DELETE /api/sessions/:id', 'DELETE', '/api/sessions/:id');
    expect(result).toContain('DELETE /api/sessions/:id');
  });

  it('buildEndpointDescriptionPrompt mentions chineseDescription constraint', () => {
    const result = buildEndpointDescriptionPrompt('handler code', 'GET /api/data', 'GET', '/api/data');
    expect(result).toContain('20');
  });

  it('buildEndpointDescriptionPrompt includes the endpoint context', () => {
    const context = 'async function uploadHandler(req, res) { ... }';
    const result = buildEndpointDescriptionPrompt(context, 'POST /api/upload', 'POST', '/api/upload');
    expect(result).toContain(context);
  });

  // buildStepDetailPrompt
  it('buildStepDetailPrompt includes all step indices', () => {
    const steps = [
      { stepIndex: 0, methodId: 'routes/api.ts#handler' },
      { stepIndex: 1, methodId: 'services/user.ts#getUser' },
      { stepIndex: 2, methodId: 'db/repo.ts#findById' },
    ];
    const result = buildStepDetailPrompt('chain context', steps);
    expect(result).toContain('"stepIndex": 0');
    expect(result).toContain('"stepIndex": 1');
    expect(result).toContain('"stepIndex": 2');
  });

  it('buildStepDetailPrompt includes all methodIds', () => {
    const steps = [
      { stepIndex: 0, methodId: 'routes/api.ts#handler' },
      { stepIndex: 1, methodId: 'services/user.ts#getUser' },
    ];
    const result = buildStepDetailPrompt('chain context', steps);
    expect(result).toContain('routes/api.ts#handler');
    expect(result).toContain('services/user.ts#getUser');
  });

  it('buildStepDetailPrompt includes the chain context', () => {
    const chainContext = '[GET] /api/users\n  Step 1: listUsers — routes/users.ts';
    const result = buildStepDetailPrompt(chainContext, [{ stepIndex: 0, methodId: 'foo#bar' }]);
    expect(result).toContain(chainContext);
  });

  it('buildStepDetailPrompt mentions description length constraint', () => {
    const result = buildStepDetailPrompt('context', [{ stepIndex: 0, methodId: 'a#b' }]);
    expect(result).toContain('30');
  });

  it('buildStepDetailPrompt handles empty steps array', () => {
    const result = buildStepDetailPrompt('chain context', []);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
