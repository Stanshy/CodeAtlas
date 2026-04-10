/**
 * Unit tests for wiki-exporter/md-renderer.ts (Knowledge Node Edition)
 *
 * Coverage:
 *   - Frontmatter: concept, type, related, sources, generated fields
 *   - 概述 section with summary content or placeholder
 *   - 詳細說明 section (static Phase 2 placeholder)
 *   - 相關程式碼 section with sourceFiles
 *   - 相關概念 section with wiki-links grouped by relationship type
 *   - HTML comment metadata at end of file
 *   - Output is valid Markdown string ending with newline
 *
 * Sprint 19 — T17: Testing and Regression
 */

import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../../src/wiki-exporter/md-renderer.js';
import type { WikiNode } from '../../src/wiki-exporter/types.js';
import type { NodeLinks, ResolvedLink } from '../../src/wiki-exporter/link-resolver.js';

// ---------------------------------------------------------------------------
// Fixture factories
// ---------------------------------------------------------------------------

function makeWikiNode(overrides: Partial<WikiNode> = {}): WikiNode {
  return {
    id: 'concept:authentication-system',
    slug: 'authentication-system',
    type: 'feature',
    displayName: '認證機制',
    summary: '處理使用者認證的核心機制',
    sourceFiles: ['src/auth/service.ts'],
    edges: [],
    mdPath: 'concepts/authentication-system.md',
    ...overrides,
  };
}

function makeNodeLinks(overrides: Partial<NodeLinks> = {}): NodeLinks {
  return {
    nodeId: 'concept:authentication-system',
    relates: [],
    depends: [],
    implements: [],
    extends: [],
    uses: [],
    all: [],
    ...overrides,
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

// ---------------------------------------------------------------------------
// Frontmatter tests
// ---------------------------------------------------------------------------

describe('renderMarkdown — frontmatter', () => {
  it('renders YAML frontmatter block with --- delimiters', () => {
    const node = makeWikiNode();
    const links = makeNodeLinks();

    const md = renderMarkdown(node, links, { generatedAt: '2026-04-08T00:00:00.000Z' });

    expect(md.startsWith('---\n')).toBe(true);
    const lines = md.split('\n');
    const closingIdx = lines.indexOf('---', 1);
    expect(closingIdx).toBeGreaterThan(1);
  });

  it('includes concept field with displayName in frontmatter', () => {
    const node = makeWikiNode({ displayName: '認證機制' });
    const links = makeNodeLinks();

    const md = renderMarkdown(node, links, { generatedAt: '2026-04-08T00:00:00.000Z' });

    expect(md).toContain('concept:');
    expect(md).toContain('認證機制');
  });

  it('includes type field in frontmatter', () => {
    const node = makeWikiNode({ type: 'pattern' });
    const links = makeNodeLinks();

    const md = renderMarkdown(node, links, { generatedAt: '2026-04-08T00:00:00.000Z' });

    expect(md).toContain('type: pattern');
  });

  it('includes generated field with ISO timestamp in frontmatter', () => {
    const node = makeWikiNode();
    const links = makeNodeLinks();

    const md = renderMarkdown(node, links, { generatedAt: '2026-04-08T00:00:00.000Z' });

    expect(md).toContain('generated:');
    expect(md).toContain('2026-04-08T00:00:00.000Z');
  });

  it('includes sources field in frontmatter', () => {
    const node = makeWikiNode({ sourceFiles: ['src/auth/service.ts', 'src/auth/jwt.ts'] });
    const links = makeNodeLinks();

    const md = renderMarkdown(node, links, { generatedAt: '2026-04-08T00:00:00.000Z' });

    expect(md).toContain('sources:');
    expect(md).toContain('src/auth/service.ts');
    expect(md).toContain('src/auth/jwt.ts');
  });

  it('includes related field (empty array) when no links', () => {
    const node = makeWikiNode();
    const links = makeNodeLinks();

    const md = renderMarkdown(node, links, { generatedAt: '2026-04-08T00:00:00.000Z' });

    expect(md).toContain('related: []');
  });

  it('includes related field with link display names when links are present', () => {
    const relatesLink = makeResolvedLink('jwt-token', 'JWT Token', 'relates');
    const links = makeNodeLinks({
      relates: [relatesLink],
      all: [relatesLink],
    });
    const node = makeWikiNode();

    const md = renderMarkdown(node, links, { generatedAt: '2026-04-08T00:00:00.000Z' });

    expect(md).toContain('JWT Token');
    expect(md).toContain('related:');
  });
});

// ---------------------------------------------------------------------------
// 概述 section tests
// ---------------------------------------------------------------------------

describe('renderMarkdown — 概述 section', () => {
  it('renders ## 概述 header', () => {
    const node = makeWikiNode();
    const links = makeNodeLinks();

    const md = renderMarkdown(node, links, { locale: 'zh-TW' });

    expect(md).toContain('## 概述');
  });

  it('renders summary content in 概述 section', () => {
    const node = makeWikiNode({ summary: '處理使用者認證的核心機制，支援 JWT 和 Session。' });
    const links = makeNodeLinks();

    const md = renderMarkdown(node, links, { locale: 'zh-TW' });

    expect(md).toContain('處理使用者認證的核心機制，支援 JWT 和 Session。');
  });

  it('renders placeholder when summary is empty string', () => {
    const node = makeWikiNode({ summary: '' });
    const links = makeNodeLinks();

    const md = renderMarkdown(node, links, { locale: 'zh-TW' });

    expect(md).toContain('（待分析）');
  });

  it('renders placeholder when summary is whitespace only', () => {
    const node = makeWikiNode({ summary: '   ' });
    const links = makeNodeLinks();

    const md = renderMarkdown(node, links, { locale: 'zh-TW' });

    expect(md).toContain('（待分析）');
  });
});

// ---------------------------------------------------------------------------
// 詳細說明 section tests
// ---------------------------------------------------------------------------

describe('renderMarkdown — 詳細說明 section', () => {
  it('renders ## 詳細說明 header', () => {
    const node = makeWikiNode();
    const links = makeNodeLinks();

    const md = renderMarkdown(node, links, { locale: 'zh-TW' });

    expect(md).toContain('## 詳細說明');
  });

  it('renders Phase 2 placeholder text', () => {
    const node = makeWikiNode();
    const links = makeNodeLinks();

    const md = renderMarkdown(node, links, { locale: 'zh-TW' });

    expect(md).toContain('執行 AI 深度分析以生成詳細內容');
  });
});

// ---------------------------------------------------------------------------
// 相關程式碼 section tests
// ---------------------------------------------------------------------------

describe('renderMarkdown — 相關程式碼 section', () => {
  it('renders ## 相關程式碼 section when sourceFiles is non-empty', () => {
    const node = makeWikiNode({ sourceFiles: ['src/auth/service.ts'] });
    const links = makeNodeLinks();

    const md = renderMarkdown(node, links, { locale: 'zh-TW' });

    expect(md).toContain('## 相關程式碼');
  });

  it('lists each source file with backtick-wrapped basename', () => {
    const node = makeWikiNode({ sourceFiles: ['src/auth/service.ts'] });
    const links = makeNodeLinks();

    const md = renderMarkdown(node, links, { locale: 'zh-TW' });

    expect(md).toContain('`service.ts`');
    expect(md).toContain('src/auth/service.ts');
  });

  it('does not render 相關程式碼 section when sourceFiles is empty', () => {
    const node = makeWikiNode({ sourceFiles: [] });
    const links = makeNodeLinks();

    const md = renderMarkdown(node, links, { locale: 'zh-TW' });

    expect(md).not.toContain('## 相關程式碼');
  });

  it('renders multiple sourceFiles as a list', () => {
    const node = makeWikiNode({
      sourceFiles: ['src/auth/service.ts', 'src/auth/jwt.ts', 'src/middleware/auth.ts'],
    });
    const links = makeNodeLinks();

    const md = renderMarkdown(node, links, { locale: 'zh-TW' });

    expect(md).toContain('`service.ts`');
    expect(md).toContain('`jwt.ts`');
    expect(md).toContain('`auth.ts`');
  });
});

// ---------------------------------------------------------------------------
// 相關概念 section tests
// ---------------------------------------------------------------------------

describe('renderMarkdown — 相關概念 section', () => {
  it('renders ## 相關概念 section when links are present', () => {
    const relatesLink = makeResolvedLink('jwt-token', 'JWT Token', 'relates');
    const links = makeNodeLinks({
      relates: [relatesLink],
      all: [relatesLink],
    });
    const node = makeWikiNode();

    const md = renderMarkdown(node, links, { locale: 'zh-TW' });

    expect(md).toContain('## 相關概念');
  });

  it('renders wiki-link in 相關概念 section', () => {
    const relatesLink = makeResolvedLink('jwt-token', 'JWT Token', 'relates');
    const links = makeNodeLinks({
      relates: [relatesLink],
      all: [relatesLink],
    });
    const node = makeWikiNode();

    const md = renderMarkdown(node, links, { locale: 'zh-TW' });

    expect(md).toContain('[[jwt-token|JWT Token]]');
  });

  it('renders each wiki-link as a list item prefixed with -', () => {
    const relatesLink = makeResolvedLink('jwt-token', 'JWT Token', 'relates');
    const links = makeNodeLinks({
      relates: [relatesLink],
      all: [relatesLink],
    });
    const node = makeWikiNode();

    const md = renderMarkdown(node, links, { locale: 'zh-TW' });

    expect(md).toContain('- [[jwt-token|JWT Token]]');
  });

  it('omits ## 相關概念 section when there are no links', () => {
    const node = makeWikiNode();
    const links = makeNodeLinks();

    const md = renderMarkdown(node, links, { locale: 'zh-TW' });

    expect(md).not.toContain('## 相關概念');
  });

  it('renders depends links with 依賴 annotation', () => {
    const dependsLink = makeResolvedLink('session-management', 'Session管理', 'depends');
    const links = makeNodeLinks({
      depends: [dependsLink],
      all: [dependsLink],
    });
    const node = makeWikiNode();

    const md = renderMarkdown(node, links, { locale: 'zh-TW' });

    expect(md).toContain('[[session-management|Session管理]]');
    expect(md).toContain('依賴');
  });

  it('renders implements links with 實作 annotation', () => {
    const implementsLink = makeResolvedLink('auth-pattern', 'AuthPattern', 'implements');
    const links = makeNodeLinks({
      implements: [implementsLink],
      all: [implementsLink],
    });
    const node = makeWikiNode();

    const md = renderMarkdown(node, links, { locale: 'zh-TW' });

    expect(md).toContain('實作');
  });

  it('renders extends and uses links', () => {
    const extendsLink = makeResolvedLink('base-auth', 'BaseAuth', 'extends');
    const usesLink = makeResolvedLink('jwt-util', 'JwtUtil', 'uses');
    const links = makeNodeLinks({
      extends: [extendsLink],
      uses: [usesLink],
      all: [extendsLink, usesLink],
    });
    const node = makeWikiNode();

    const md = renderMarkdown(node, links, { locale: 'zh-TW' });

    expect(md).toContain('延伸');
    expect(md).toContain('使用');
  });
});

// ---------------------------------------------------------------------------
// Metadata comment tests
// ---------------------------------------------------------------------------

describe('renderMarkdown — metadata comment', () => {
  it('always includes the @codeatlas:id metadata comment', () => {
    const node = makeWikiNode({ id: 'concept:authentication-system' });
    const links = makeNodeLinks();

    const md = renderMarkdown(node, links);

    expect(md).toContain('<!-- @codeatlas:id=concept:authentication-system -->');
  });

  it('places the metadata comment at the end of the file', () => {
    const node = makeWikiNode({ id: 'concept:authentication-system' });
    const links = makeNodeLinks();

    const md = renderMarkdown(node, links);

    // The metadata comment should appear near the end
    const commentIdx = md.indexOf('<!-- @codeatlas:id=concept:authentication-system -->');
    expect(commentIdx).toBeGreaterThan(md.length / 2);
  });
});

// ---------------------------------------------------------------------------
// Output validity tests
// ---------------------------------------------------------------------------

describe('renderMarkdown — output validity', () => {
  it('output is a non-empty string ending with a newline', () => {
    const node = makeWikiNode();
    const links = makeNodeLinks();

    const md = renderMarkdown(node, links);

    expect(typeof md).toBe('string');
    expect(md.length).toBeGreaterThan(0);
    expect(md.endsWith('\n')).toBe(true);
  });

  it('output includes H1 title matching displayName', () => {
    const node = makeWikiNode({ displayName: '認證機制' });
    const links = makeNodeLinks();

    const md = renderMarkdown(node, links);

    expect(md).toContain('# 認證機制');
  });

  it('uses generatedAt option if provided', () => {
    const node = makeWikiNode();
    const links = makeNodeLinks();
    const ts = '2026-12-31T23:59:59.000Z';

    const md = renderMarkdown(node, links, { generatedAt: ts });

    expect(md).toContain(ts);
  });

  it('uses current timestamp when generatedAt is not provided', () => {
    const node = makeWikiNode();
    const links = makeNodeLinks();

    const md = renderMarkdown(node, links);

    // The timestamp should be a valid ISO string — just check "generated:" is present
    expect(md).toContain('generated:');
  });
});
