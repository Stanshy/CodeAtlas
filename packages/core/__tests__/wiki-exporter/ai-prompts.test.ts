/**
 * Unit tests for wiki-exporter/ai-prompts.ts (Knowledge Node Edition)
 *
 * Coverage:
 *   - buildConceptExtractionPrompt returns non-empty string with key instructions
 *   - parseConceptExtractionResponse with valid JSON
 *   - parseConceptExtractionResponse with JSON wrapped in markdown code fence
 *   - parseConceptExtractionResponse with empty/invalid input returns []
 *   - parseConceptExtractionResponse validates required fields
 *   - parseConceptExtractionResponse defaults invalid type to 'concept'
 *   - buildConceptDeepAnalysisPrompt returns non-empty string with concept name
 *   - parseConceptDeepAnalysisResponse strips AI preamble
 *   - parseConceptDeepAnalysisResponse returns "" for empty input
 *   - buildProjectContext assembles a ProjectContext from AnalysisResult
 *
 * Sprint 19 — T17: Testing and Regression
 */

import { describe, it, expect } from 'vitest';
import {
  buildConceptExtractionPrompt,
  parseConceptExtractionResponse,
  buildConceptDeepAnalysisPrompt,
  parseConceptDeepAnalysisResponse,
  buildProjectContext,
} from '../../src/wiki-exporter/ai-prompts.js';
import type { ProjectContext } from '../../src/wiki-exporter/types.js';
import type { AnalysisResult } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeProjectContext(overrides: Partial<ProjectContext> = {}): ProjectContext {
  return {
    fileTree: '專案結構（部分）：\nsrc/\n  index.ts',
    signatures: '主要匯出函式與類別：\n  async login(username, password) — src/auth.ts',
    importGraph: '主要 import 關係：\n  src/index.ts → src/auth.ts',
    aiSummaries: '（無 AI 摘要）',
    totalFiles: 10,
    totalFunctions: 5,
    ...overrides,
  };
}

function makeAnalysisResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    version: '1.0.0',
    projectPath: '/project',
    analyzedAt: '2026-04-08T00:00:00.000Z',
    graph: { nodes: [], edges: [] },
    stats: {
      totalFiles: 10,
      analyzedFiles: 10,
      skippedFiles: 0,
      failedFiles: 0,
      totalNodes: 0,
      totalEdges: 0,
      analysisDurationMs: 0,
      totalFunctions: 50,
    },
    errors: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// buildConceptExtractionPrompt
// ---------------------------------------------------------------------------

describe('buildConceptExtractionPrompt', () => {
  it('returns a non-empty string', () => {
    const context = makeProjectContext();
    const prompt = buildConceptExtractionPrompt(context);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('contains JSON format instructions', () => {
    const context = makeProjectContext();
    const prompt = buildConceptExtractionPrompt(context);
    expect(prompt).toContain('"concepts"');
  });

  it('contains valid edge type constraint listing', () => {
    const context = makeProjectContext();
    const prompt = buildConceptExtractionPrompt(context);
    expect(prompt).toContain('relates');
    expect(prompt).toContain('depends');
    expect(prompt).toContain('implements');
  });

  it('includes the project context sections', () => {
    const context = makeProjectContext({
      fileTree: '專案結構（部分）：\nsrc/auth.ts',
      totalFiles: 42,
    });
    const prompt = buildConceptExtractionPrompt(context);
    expect(prompt).toContain('src/auth.ts');
    expect(prompt).toContain('42');
  });

  it('instructs AI to output strict JSON without preamble', () => {
    const context = makeProjectContext();
    const prompt = buildConceptExtractionPrompt(context);
    // The instruction not to add prefix text should be present
    expect(prompt).toContain('JSON');
  });
});

// ---------------------------------------------------------------------------
// parseConceptExtractionResponse — valid input
// ---------------------------------------------------------------------------

describe('parseConceptExtractionResponse — valid JSON', () => {
  it('parses a valid JSON response with one concept', () => {
    const raw = JSON.stringify({
      concepts: [
        {
          name: '認證機制',
          slug: 'authentication-system',
          type: 'feature',
          summary: '處理使用者認證',
          sourceFiles: ['src/auth/service.ts'],
          relatedConcepts: [],
          edges: [],
        },
      ],
    });

    const result = parseConceptExtractionResponse(raw);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('認證機制');
    expect(result[0].slug).toBe('authentication-system');
    expect(result[0].type).toBe('feature');
  });

  it('parses a response with multiple concepts', () => {
    const raw = JSON.stringify({
      concepts: [
        {
          name: '認證機制',
          slug: 'auth',
          type: 'feature',
          summary: '認證',
          sourceFiles: ['src/auth.ts'],
          relatedConcepts: [],
          edges: [],
        },
        {
          name: 'JWT Token',
          slug: 'jwt-token',
          type: 'pattern',
          summary: 'JWT 驗證',
          sourceFiles: ['src/jwt.ts'],
          relatedConcepts: ['auth'],
          edges: [{ target: 'auth', type: 'implements', label: '實作認證' }],
        },
      ],
    });

    const result = parseConceptExtractionResponse(raw);
    expect(result).toHaveLength(2);
    expect(result[1].edges).toHaveLength(1);
    expect(result[1].edges[0].type).toBe('implements');
    expect(result[1].edges[0].label).toBe('實作認證');
  });

  it('parses JSON wrapped in markdown code fence', () => {
    const inner = JSON.stringify({
      concepts: [
        {
          name: '認證機制',
          slug: 'authentication-system',
          type: 'feature',
          summary: '處理使用者認證',
          sourceFiles: ['src/auth/service.ts'],
          relatedConcepts: [],
          edges: [],
        },
      ],
    });
    const raw = `\`\`\`json\n${inner}\n\`\`\``;

    const result = parseConceptExtractionResponse(raw);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe('authentication-system');
  });

  it('parses JSON with surrounding whitespace', () => {
    const raw =
      '   \n' +
      JSON.stringify({
        concepts: [
          {
            name: '測試',
            slug: 'test',
            type: 'concept',
            summary: '測試概念',
            sourceFiles: ['src/test.ts'],
            relatedConcepts: [],
            edges: [],
          },
        ],
      }) +
      '   \n';

    const result = parseConceptExtractionResponse(raw);
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// parseConceptExtractionResponse — invalid / empty input
// ---------------------------------------------------------------------------

describe('parseConceptExtractionResponse — invalid input returns []', () => {
  it('returns [] for empty string', () => {
    expect(parseConceptExtractionResponse('')).toEqual([]);
  });

  it('returns [] for whitespace-only string', () => {
    expect(parseConceptExtractionResponse('   \n\n  ')).toEqual([]);
  });

  it('returns [] for non-JSON text', () => {
    expect(parseConceptExtractionResponse('這不是 JSON')).toEqual([]);
  });

  it('returns [] for JSON array instead of object', () => {
    expect(parseConceptExtractionResponse('[]')).toEqual([]);
  });

  it('returns [] when "concepts" key is missing', () => {
    const raw = JSON.stringify({ data: [] });
    expect(parseConceptExtractionResponse(raw)).toEqual([]);
  });

  it('returns [] for completely malformed JSON', () => {
    expect(parseConceptExtractionResponse('{not valid json')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// parseConceptExtractionResponse — field validation
// ---------------------------------------------------------------------------

describe('parseConceptExtractionResponse — field validation', () => {
  it('skips concepts missing required name field', () => {
    const raw = JSON.stringify({
      concepts: [
        {
          slug: 'auth',
          type: 'feature',
          summary: '認證',
          sourceFiles: ['src/auth.ts'],
          relatedConcepts: [],
          edges: [],
        },
      ],
    });
    expect(parseConceptExtractionResponse(raw)).toEqual([]);
  });

  it('skips concepts missing required slug field', () => {
    const raw = JSON.stringify({
      concepts: [
        {
          name: '認證機制',
          type: 'feature',
          summary: '認證',
          sourceFiles: ['src/auth.ts'],
          relatedConcepts: [],
          edges: [],
        },
      ],
    });
    expect(parseConceptExtractionResponse(raw)).toEqual([]);
  });

  it('skips concepts missing required summary field', () => {
    const raw = JSON.stringify({
      concepts: [
        {
          name: '認證機制',
          slug: 'auth',
          type: 'feature',
          sourceFiles: ['src/auth.ts'],
          relatedConcepts: [],
          edges: [],
        },
      ],
    });
    expect(parseConceptExtractionResponse(raw)).toEqual([]);
  });

  it('skips concepts missing sourceFiles', () => {
    const raw = JSON.stringify({
      concepts: [
        {
          name: '認證機制',
          slug: 'auth',
          type: 'feature',
          summary: '認證',
          relatedConcepts: [],
          edges: [],
        },
      ],
    });
    expect(parseConceptExtractionResponse(raw)).toEqual([]);
  });

  it('skips concepts with empty sourceFiles array', () => {
    const raw = JSON.stringify({
      concepts: [
        {
          name: '認證機制',
          slug: 'auth',
          type: 'feature',
          summary: '認證',
          sourceFiles: [],
          relatedConcepts: [],
          edges: [],
        },
      ],
    });
    expect(parseConceptExtractionResponse(raw)).toEqual([]);
  });

  it('defaults invalid type to "concept"', () => {
    const raw = JSON.stringify({
      concepts: [
        {
          name: '認證機制',
          slug: 'auth',
          type: 'invalid-type-value',
          summary: '認證',
          sourceFiles: ['src/auth.ts'],
          relatedConcepts: [],
          edges: [],
        },
      ],
    });
    const result = parseConceptExtractionResponse(raw);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('concept');
  });

  it('defaults missing type to "concept"', () => {
    const raw = JSON.stringify({
      concepts: [
        {
          name: '認證機制',
          slug: 'auth',
          summary: '認證',
          sourceFiles: ['src/auth.ts'],
          relatedConcepts: [],
          edges: [],
        },
      ],
    });
    const result = parseConceptExtractionResponse(raw);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('concept');
  });

  it('accepts all valid WikiNodeType values', () => {
    const validTypes = ['architecture', 'pattern', 'feature', 'integration', 'concept'];
    for (const type of validTypes) {
      const raw = JSON.stringify({
        concepts: [
          {
            name: '測試',
            slug: 'test',
            type,
            summary: '測試',
            sourceFiles: ['src/test.ts'],
            relatedConcepts: [],
            edges: [],
          },
        ],
      });
      const result = parseConceptExtractionResponse(raw);
      expect(result[0].type).toBe(type);
    }
  });
});

// ---------------------------------------------------------------------------
// buildConceptDeepAnalysisPrompt
// ---------------------------------------------------------------------------

describe('buildConceptDeepAnalysisPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = buildConceptDeepAnalysisPrompt(
      { name: '認證機制', type: 'feature', summary: '處理認證', sourceFiles: ['src/auth.ts'] },
      [],
    );
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('includes the concept name in the prompt', () => {
    const prompt = buildConceptDeepAnalysisPrompt(
      { name: '認證機制', type: 'feature', summary: '處理認證', sourceFiles: ['src/auth.ts'] },
      [],
    );
    expect(prompt).toContain('認證機制');
  });

  it('includes the concept type in the prompt', () => {
    const prompt = buildConceptDeepAnalysisPrompt(
      { name: '認證機制', type: 'architecture', summary: '架構', sourceFiles: ['src/auth.ts'] },
      [],
    );
    expect(prompt).toContain('architecture');
  });

  it('includes source code sections when provided', () => {
    const prompt = buildConceptDeepAnalysisPrompt(
      { name: '認證機制', type: 'feature', summary: '認證', sourceFiles: ['src/auth.ts'] },
      [{ path: 'src/auth.ts', content: 'export function login() {}' }],
    );
    expect(prompt).toContain('src/auth.ts');
    expect(prompt).toContain('export function login()');
  });

  it('uses placeholder when no source code is provided', () => {
    const prompt = buildConceptDeepAnalysisPrompt(
      { name: '認證機制', type: 'feature', summary: '認證', sourceFiles: [] },
      [],
    );
    expect(prompt).toContain('無原始碼提供');
  });
});

// ---------------------------------------------------------------------------
// parseConceptDeepAnalysisResponse
// ---------------------------------------------------------------------------

describe('parseConceptDeepAnalysisResponse', () => {
  it('returns empty string for empty input', () => {
    expect(parseConceptDeepAnalysisResponse('')).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(parseConceptDeepAnalysisResponse('   \n\n  ')).toBe('');
  });

  it('strips AI preamble before the first markdown header', () => {
    const raw = '好的，以下是關於認證機制的詳細說明：\n\n## 概述\n\n認證機制負責驗證使用者身份。';
    const result = parseConceptDeepAnalysisResponse(raw);
    expect(result).not.toContain('好的');
    expect(result).toContain('## 概述');
    expect(result).toContain('認證機制負責驗證使用者身份');
  });

  it('strips "以下是" preamble patterns', () => {
    const raw = '以下是詳細分析：\n\n## 運作流程\n\n步驟一、步驟二。';
    const result = parseConceptDeepAnalysisResponse(raw);
    expect(result.startsWith('## 運作流程')).toBe(true);
  });

  it('preserves markdown structure (headers, lists)', () => {
    const raw = '## 概述\n\n概念摘要。\n\n## 運作流程\n\n- 步驟一\n- 步驟二';
    const result = parseConceptDeepAnalysisResponse(raw);
    expect(result).toContain('## 概述');
    expect(result).toContain('## 運作流程');
    expect(result).toContain('- 步驟一');
  });

  it('collapses 3+ blank lines to 2', () => {
    const raw = '## 概述\n\n\n\n\n內容。';
    const result = parseConceptDeepAnalysisResponse(raw);
    expect(result).not.toContain('\n\n\n');
  });

  it('returns clean Markdown when response has no preamble', () => {
    const raw = '## 概述\n\n這是概述內容。';
    const result = parseConceptDeepAnalysisResponse(raw);
    expect(result).toBe('## 概述\n\n這是概述內容。');
  });
});

// ---------------------------------------------------------------------------
// buildProjectContext
// ---------------------------------------------------------------------------

describe('buildProjectContext', () => {
  it('returns a ProjectContext with all required fields', () => {
    const analysisResult = makeAnalysisResult();
    const context = buildProjectContext(analysisResult, null, null);

    expect(context).toHaveProperty('fileTree');
    expect(context).toHaveProperty('signatures');
    expect(context).toHaveProperty('importGraph');
    expect(context).toHaveProperty('aiSummaries');
    expect(context).toHaveProperty('totalFiles');
    expect(context).toHaveProperty('totalFunctions');
  });

  it('sets totalFiles from analysisResult.stats.totalFiles', () => {
    const analysisResult = makeAnalysisResult({
      stats: {
        totalFiles: 42,
        analyzedFiles: 42,
        skippedFiles: 0,
        failedFiles: 0,
        totalNodes: 0,
        totalEdges: 0,
        analysisDurationMs: 0,
        totalFunctions: 10,
      },
    });
    const context = buildProjectContext(analysisResult, null, null);
    expect(context.totalFiles).toBe(42);
  });
});
