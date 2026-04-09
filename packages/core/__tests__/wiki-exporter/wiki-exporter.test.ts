/**
 * Unit tests for wiki-exporter/index.ts (exportWiki orchestrator)
 *
 * Coverage:
 *   - exportWiki returns valid WikiExportResult with manifest, mdFiles, and stats
 *   - Nodes have knowledge-concept IDs (concept:*)
 *   - mdFiles have concepts/ paths
 *   - Unconfigured provider throws
 *   - manifest.status is 'ready'
 *   - stats.pageCount > 0 when concepts are returned
 *   - stats.deadLinks = 0 when all edges resolve correctly
 *
 * Sprint 19 — T17: Testing and Regression
 */

import { describe, it, expect } from 'vitest';
import { exportWiki } from '../../src/wiki-exporter/index.js';
import type { WikiExporterInput } from '../../src/wiki-exporter/index.js';
import type { AnalysisResult } from '../../src/types.js';
import type { BaseAnalysisProvider } from '../../src/ai/base-analysis-provider.js';
import type { SummaryContext } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Mock AI Provider
// ---------------------------------------------------------------------------

/**
 * A minimal mock that satisfies BaseAnalysisProvider's abstract contract.
 * rawPrompt returns a valid concept extraction JSON response.
 */
const mockAiProvider = {
  name: 'mock',
  isConfigured: () => true,
  rawPrompt: async (_prompt: string) =>
    JSON.stringify({
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
        {
          name: 'JWT Token',
          slug: 'jwt-token',
          type: 'pattern',
          summary: 'JWT 驗證',
          sourceFiles: ['src/auth/jwt.ts'],
          relatedConcepts: ['authentication-system'],
          edges: [
            { target: 'authentication-system', type: 'implements', label: '實作認證' },
          ],
        },
      ],
    }),
  summarize: async (_code: string, _context: SummaryContext) => '',
  supportsAnalysis: () => true,
  analyzeMethodBatch: async () => ({ methods: [] }),
  explainChain: async () => ({ summary: '', steps: [] }),
} as unknown as BaseAnalysisProvider;

const unconfiguredProvider = {
  name: 'unconfigured',
  isConfigured: () => false,
  rawPrompt: async () => '',
  summarize: async () => '',
  supportsAnalysis: () => false,
  analyzeMethodBatch: async () => ({ methods: [] }),
  explainChain: async () => ({ summary: '', steps: [] }),
} as unknown as BaseAnalysisProvider;

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

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

function makeInput(overrides: Partial<WikiExporterInput> = {}): WikiExporterInput {
  return {
    analysisResult: makeAnalysisResult(),
    directoryGraph: null,
    endpointGraph: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests: result structure
// ---------------------------------------------------------------------------

describe('exportWiki — result structure', () => {
  it('returns a valid WikiExportResult with manifest, mdFiles, and stats', async () => {
    const result = await exportWiki(makeInput(), mockAiProvider, {
      generatedAt: '2026-04-08T00:00:00.000Z',
    });

    expect(result).toBeDefined();
    expect(result.manifest).toBeDefined();
    expect(result.mdFiles).toBeDefined();
    expect(result.stats).toBeDefined();
  });

  it('manifest.status is "ready"', async () => {
    const result = await exportWiki(makeInput(), mockAiProvider, {
      generatedAt: '2026-04-08T00:00:00.000Z',
    });

    expect(result.manifest.status).toBe('ready');
  });

  it('manifest.generatedAt matches the provided timestamp', async () => {
    const ts = '2026-04-08T12:00:00.000Z';
    const result = await exportWiki(makeInput(), mockAiProvider, { generatedAt: ts });

    expect(result.manifest.generatedAt).toBe(ts);
  });

  it('stats.pageCount equals the number of concepts returned by AI', async () => {
    const result = await exportWiki(makeInput(), mockAiProvider, {
      generatedAt: '2026-04-08T00:00:00.000Z',
    });

    // mockAiProvider returns 2 concepts
    expect(result.stats.pageCount).toBe(2);
  });

  it('stats.deadLinks is 0 (all edges resolve within the concept set)', async () => {
    const result = await exportWiki(makeInput(), mockAiProvider, {
      generatedAt: '2026-04-08T00:00:00.000Z',
    });

    expect(result.stats.deadLinks).toBe(0);
  });

  it('mdFiles array length matches pageCount', async () => {
    const result = await exportWiki(makeInput(), mockAiProvider, {
      generatedAt: '2026-04-08T00:00:00.000Z',
    });

    expect(result.mdFiles).toHaveLength(result.stats.pageCount);
  });
});

// ---------------------------------------------------------------------------
// Tests: knowledge-concept IDs
// ---------------------------------------------------------------------------

describe('exportWiki — knowledge-concept IDs', () => {
  it('all manifest nodes have concept: prefixed IDs', async () => {
    const result = await exportWiki(makeInput(), mockAiProvider, {
      generatedAt: '2026-04-08T00:00:00.000Z',
    });

    for (const node of result.manifest.nodes) {
      expect(node.id.startsWith('concept:')).toBe(true);
    }
  });

  it('manifest node IDs are all lowercase', async () => {
    const result = await exportWiki(makeInput(), mockAiProvider, {
      generatedAt: '2026-04-08T00:00:00.000Z',
    });

    for (const node of result.manifest.nodes) {
      expect(node.id).toBe(node.id.toLowerCase());
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: mdFiles paths
// ---------------------------------------------------------------------------

describe('exportWiki — mdFiles paths', () => {
  it('all mdFile paths are under concepts/ directory', async () => {
    const result = await exportWiki(makeInput(), mockAiProvider, {
      generatedAt: '2026-04-08T00:00:00.000Z',
    });

    for (const file of result.mdFiles) {
      expect(file.path.startsWith('concepts/')).toBe(true);
    }
  });

  it('all mdFile paths end with .md', async () => {
    const result = await exportWiki(makeInput(), mockAiProvider, {
      generatedAt: '2026-04-08T00:00:00.000Z',
    });

    for (const file of result.mdFiles) {
      expect(file.path.endsWith('.md')).toBe(true);
    }
  });

  it('mdFiles paths match the node mdPaths in the manifest', async () => {
    const result = await exportWiki(makeInput(), mockAiProvider, {
      generatedAt: '2026-04-08T00:00:00.000Z',
    });

    const manifestPaths = result.manifest.nodes.map((n) => n.mdPath);
    const exportedPaths = result.mdFiles.map((f) => f.path);

    for (const expectedPath of manifestPaths) {
      expect(exportedPaths).toContain(expectedPath);
    }
  });

  it('mdFiles content is non-empty Markdown with frontmatter', async () => {
    const result = await exportWiki(makeInput(), mockAiProvider, {
      generatedAt: '2026-04-08T00:00:00.000Z',
    });

    for (const file of result.mdFiles) {
      expect(file.content.length).toBeGreaterThan(0);
      expect(file.content.startsWith('---')).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: AI provider pre-flight
// ---------------------------------------------------------------------------

describe('exportWiki — AI provider pre-flight', () => {
  it('throws when the AI provider is not configured', async () => {
    await expect(
      exportWiki(makeInput(), unconfiguredProvider, {
        generatedAt: '2026-04-08T00:00:00.000Z',
      }),
    ).rejects.toThrow();
  });

  it('throws with a message about AI provider configuration', async () => {
    await expect(
      exportWiki(makeInput(), unconfiguredProvider, {
        generatedAt: '2026-04-08T00:00:00.000Z',
      }),
    ).rejects.toThrow(/AI provider/i);
  });
});

// ---------------------------------------------------------------------------
// Tests: manifest pages metadata
// ---------------------------------------------------------------------------

describe('exportWiki — manifest pages metadata', () => {
  it('manifest.pages array has an entry for each node', async () => {
    const result = await exportWiki(makeInput(), mockAiProvider, {
      generatedAt: '2026-04-08T00:00:00.000Z',
    });

    expect(result.manifest.pages).toHaveLength(result.manifest.nodes.length);
  });

  it('manifest.pages entries have slug, mdPath, type, displayName, sourceFiles', async () => {
    const result = await exportWiki(makeInput(), mockAiProvider, {
      generatedAt: '2026-04-08T00:00:00.000Z',
    });

    for (const page of result.manifest.pages) {
      expect(page.slug).toBeDefined();
      expect(page.mdPath).toBeDefined();
      expect(page.type).toBeDefined();
      expect(page.displayName).toBeDefined();
      expect(Array.isArray(page.sourceFiles)).toBe(true);
    }
  });
});
