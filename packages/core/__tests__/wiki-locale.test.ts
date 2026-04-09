/**
 * Wiki MD-Renderer Locale Tests
 *
 * Verifies that the md-renderer's LOCALE_STRINGS constants cover both 'en' and
 * 'zh-TW', and that the renderMarkdown() function produces locale-appropriate
 * section headings and content.
 *
 * Coverage:
 *   - renderMarkdown() with locale='en' uses English headings
 *   - renderMarkdown() with locale='zh-TW' uses Traditional Chinese headings
 *   - Default locale is 'en' (when options are omitted)
 *   - Overview placeholder differs by locale
 *   - Details placeholder differs by locale
 *   - Source files section heading differs by locale
 *   - Related concepts section heading differs by locale (when links exist)
 *   - yamlString() helper handles special characters correctly
 *
 * Sprint 21: i18n Test Coverage (T11)
 */

import { describe, it, expect } from 'vitest';
import { renderMarkdown, yamlString } from '../src/wiki-exporter/md-renderer.js';
import type { WikiNode } from '../src/wiki-exporter/types.js';
import type { NodeLinks, ResolvedLink } from '../src/wiki-exporter/link-resolver.js';

// ---------------------------------------------------------------------------
// Fixture factories
// ---------------------------------------------------------------------------

function makeWikiNode(overrides: Partial<WikiNode> = {}): WikiNode {
  return {
    id: 'concept:auth-service',
    slug: 'auth-service',
    type: 'feature',
    displayName: 'Auth Service',
    summary: 'Handles user authentication.',
    sourceFiles: ['src/auth/service.ts'],
    edges: [],
    mdPath: 'concepts/auth-service.md',
    ...overrides,
  };
}

function makeEmptyLinks(nodeId = 'concept:auth-service'): NodeLinks {
  return {
    nodeId,
    relates: [],
    depends: [],
    implements: [],
    extends: [],
    uses: [],
    all: [],
  };
}

function makeResolvedLink(slug: string, displayName: string, edgeType: ResolvedLink['edgeType']): ResolvedLink {
  return {
    wikiLink: `[[${slug}|${displayName}]]`,
    edgeType,
    targetSlug: slug,
    displayName,
  };
}

function makeLinksWithRelates(slugs: string[]): NodeLinks {
  const links = makeEmptyLinks();
  links.relates = slugs.map(s => makeResolvedLink(s, s, 'relates'));
  links.all = [...links.relates];
  return links;
}

// Fixed timestamp to keep snapshot comparisons stable.
const FIXED_TIMESTAMP = '2026-04-09T00:00:00.000Z';

// ---------------------------------------------------------------------------
// English locale
// ---------------------------------------------------------------------------

describe('renderMarkdown() — locale="en"', () => {
  it('uses "Overview" as the overview section heading', () => {
    const node = makeWikiNode();
    const links = makeEmptyLinks();
    const output = renderMarkdown(node, links, { locale: 'en', generatedAt: FIXED_TIMESTAMP });
    expect(output).toContain('## Overview');
  });

  it('uses "Details" as the details section heading', () => {
    const node = makeWikiNode();
    const links = makeEmptyLinks();
    const output = renderMarkdown(node, links, { locale: 'en', generatedAt: FIXED_TIMESTAMP });
    expect(output).toContain('## Details');
  });

  it('uses "Source Code" as the source files section heading', () => {
    const node = makeWikiNode({ sourceFiles: ['src/auth/service.ts'] });
    const links = makeEmptyLinks();
    const output = renderMarkdown(node, links, { locale: 'en', generatedAt: FIXED_TIMESTAMP });
    expect(output).toContain('## Source Code');
  });

  it('uses "Related Concepts" as the related section heading when links exist', () => {
    const node = makeWikiNode();
    const links = makeLinksWithRelates(['jwt-utils', 'user-model']);
    const output = renderMarkdown(node, links, { locale: 'en', generatedAt: FIXED_TIMESTAMP });
    expect(output).toContain('## Related Concepts');
  });

  it('uses English overview placeholder when node has no summary', () => {
    const node = makeWikiNode({ summary: undefined });
    const links = makeEmptyLinks();
    const output = renderMarkdown(node, links, { locale: 'en', generatedAt: FIXED_TIMESTAMP });
    expect(output).toContain('(Pending analysis)');
  });

  it('uses English details placeholder', () => {
    const node = makeWikiNode();
    const links = makeEmptyLinks();
    const output = renderMarkdown(node, links, { locale: 'en', generatedAt: FIXED_TIMESTAMP });
    expect(output).toContain('Run AI deep analysis to generate detailed content.');
  });

  it('does not contain Chinese overview heading', () => {
    const node = makeWikiNode();
    const links = makeEmptyLinks();
    const output = renderMarkdown(node, links, { locale: 'en', generatedAt: FIXED_TIMESTAMP });
    expect(output).not.toContain('## 概述');
  });

  it('uses English bucket label "related" in related concepts section', () => {
    const node = makeWikiNode();
    const links = makeLinksWithRelates(['jwt-utils']);
    const output = renderMarkdown(node, links, { locale: 'en', generatedAt: FIXED_TIMESTAMP });
    // Bucket labels appear as "(related)" in the related concepts list
    expect(output).toContain('related');
  });
});

// ---------------------------------------------------------------------------
// Traditional Chinese locale
// ---------------------------------------------------------------------------

describe('renderMarkdown() — locale="zh-TW"', () => {
  it('uses "概述" as the overview section heading', () => {
    const node = makeWikiNode();
    const links = makeEmptyLinks();
    const output = renderMarkdown(node, links, { locale: 'zh-TW', generatedAt: FIXED_TIMESTAMP });
    expect(output).toContain('## 概述');
  });

  it('uses "詳細說明" as the details section heading', () => {
    const node = makeWikiNode();
    const links = makeEmptyLinks();
    const output = renderMarkdown(node, links, { locale: 'zh-TW', generatedAt: FIXED_TIMESTAMP });
    expect(output).toContain('## 詳細說明');
  });

  it('uses "相關程式碼" as the source files section heading', () => {
    const node = makeWikiNode({ sourceFiles: ['src/auth/service.ts'] });
    const links = makeEmptyLinks();
    const output = renderMarkdown(node, links, { locale: 'zh-TW', generatedAt: FIXED_TIMESTAMP });
    expect(output).toContain('## 相關程式碼');
  });

  it('uses "相關概念" as the related section heading when links exist', () => {
    const node = makeWikiNode();
    const links = makeLinksWithRelates(['jwt-utils']);
    const output = renderMarkdown(node, links, { locale: 'zh-TW', generatedAt: FIXED_TIMESTAMP });
    expect(output).toContain('## 相關概念');
  });

  it('uses Chinese overview placeholder when node has no summary', () => {
    const node = makeWikiNode({ summary: undefined });
    const links = makeEmptyLinks();
    const output = renderMarkdown(node, links, { locale: 'zh-TW', generatedAt: FIXED_TIMESTAMP });
    expect(output).toContain('（待分析）');
  });

  it('uses Chinese details placeholder', () => {
    const node = makeWikiNode();
    const links = makeEmptyLinks();
    const output = renderMarkdown(node, links, { locale: 'zh-TW', generatedAt: FIXED_TIMESTAMP });
    expect(output).toContain('執行 AI 深度分析以生成詳細內容。');
  });

  it('does not contain English overview heading', () => {
    const node = makeWikiNode();
    const links = makeEmptyLinks();
    const output = renderMarkdown(node, links, { locale: 'zh-TW', generatedAt: FIXED_TIMESTAMP });
    expect(output).not.toContain('## Overview');
  });

  it('uses Chinese bucket label "相關" in related concepts section', () => {
    const node = makeWikiNode();
    const links = makeLinksWithRelates(['jwt-utils']);
    const output = renderMarkdown(node, links, { locale: 'zh-TW', generatedAt: FIXED_TIMESTAMP });
    expect(output).toContain('(相關)');
  });
});

// ---------------------------------------------------------------------------
// Default locale
// ---------------------------------------------------------------------------

describe('renderMarkdown() — default locale', () => {
  it('defaults to "en" when no options are provided', () => {
    const node = makeWikiNode();
    const links = makeEmptyLinks();
    const output = renderMarkdown(node, links);
    expect(output).toContain('## Overview');
    expect(output).not.toContain('## 概述');
  });

  it('defaults to "en" when options object omits locale field', () => {
    const node = makeWikiNode();
    const links = makeEmptyLinks();
    const output = renderMarkdown(node, links, { generatedAt: FIXED_TIMESTAMP });
    expect(output).toContain('## Overview');
  });
});

// ---------------------------------------------------------------------------
// Locale output differs
// ---------------------------------------------------------------------------

describe('renderMarkdown() — en vs zh-TW output comparison', () => {
  it('en and zh-TW outputs are different', () => {
    const node = makeWikiNode();
    const links = makeEmptyLinks();
    const enOutput = renderMarkdown(node, links, { locale: 'en', generatedAt: FIXED_TIMESTAMP });
    const zhOutput = renderMarkdown(node, links, { locale: 'zh-TW', generatedAt: FIXED_TIMESTAMP });
    expect(enOutput).not.toBe(zhOutput);
  });

  it('YAML frontmatter (concept, type, sources) is identical between locales', () => {
    const node = makeWikiNode();
    const links = makeEmptyLinks();
    const enOutput = renderMarkdown(node, links, { locale: 'en', generatedAt: FIXED_TIMESTAMP });
    const zhOutput = renderMarkdown(node, links, { locale: 'zh-TW', generatedAt: FIXED_TIMESTAMP });

    // Both should have same frontmatter opening
    expect(enOutput).toContain('concept: "Auth Service"');
    expect(zhOutput).toContain('concept: "Auth Service"');
    expect(enOutput).toContain('type: feature');
    expect(zhOutput).toContain('type: feature');
  });

  it('node displayName appears in H1 title in both locales', () => {
    const node = makeWikiNode({ displayName: 'Payment Gateway' });
    const links = makeEmptyLinks();
    const enOutput = renderMarkdown(node, links, { locale: 'en', generatedAt: FIXED_TIMESTAMP });
    const zhOutput = renderMarkdown(node, links, { locale: 'zh-TW', generatedAt: FIXED_TIMESTAMP });
    expect(enOutput).toContain('# Payment Gateway');
    expect(zhOutput).toContain('# Payment Gateway');
  });
});

// ---------------------------------------------------------------------------
// yamlString helper
// ---------------------------------------------------------------------------

describe('yamlString()', () => {
  it('wraps a simple string in double quotes', () => {
    expect(yamlString('hello')).toBe('"hello"');
  });

  it('escapes double quotes inside the value', () => {
    expect(yamlString('say "hi"')).toBe('"say \\"hi\\""');
  });

  it('escapes backslashes inside the value', () => {
    expect(yamlString('C:\\path')).toBe('"C:\\\\path"');
  });

  it('handles empty string', () => {
    expect(yamlString('')).toBe('""');
  });

  it('handles strings with colons (common in frontmatter)', () => {
    const result = yamlString('Auth: Service');
    expect(result).toBe('"Auth: Service"');
  });

  it('handles Traditional Chinese characters', () => {
    const result = yamlString('認證機制');
    expect(result).toBe('"認證機制"');
  });
});
