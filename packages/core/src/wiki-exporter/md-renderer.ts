/**
 * CodeAtlas — Wiki Exporter: Markdown Renderer
 *
 * Converts a WikiNode + its resolved NodeLinks into a complete `.md` file
 * string, including:
 *   - YAML frontmatter (concept, type, related, sources, generated)
 *   - H1 title
 *   - 概述 section (AI summary or placeholder)
 *   - 詳細說明 section (static Phase 2 placeholder)
 *   - 相關程式碼 section (sourceFiles list)
 *   - 相關概念 section (all NodeLinks grouped by relationship type)
 *   - HTML comment metadata block at the bottom
 *
 * This function is intentionally pure — it performs no file I/O and has no
 * side effects. All output is returned as a string.
 *
 * Sprint 19: Wiki Knowledge Export + Obsidian Knowledge Graph
 */

import type { WikiNode } from './types.js';
import type { NodeLinks, ResolvedLink } from './link-resolver.js';
import type { Locale } from '../types.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Options for controlling rendering behaviour. */
export interface RenderOptions {
  /**
   * ISO 8601 timestamp written to the `generated` frontmatter field.
   * Defaults to `new Date().toISOString()` when omitted.
   */
  generatedAt?: string;
  /**
   * Output locale for section headings and labels.
   * Defaults to 'en'.
   */
  locale?: Locale;
}

// ---------------------------------------------------------------------------
// Locale strings
// ---------------------------------------------------------------------------

interface LocaleStrings {
  overview: string;
  overviewPlaceholder: string;
  details: string;
  detailsPlaceholder: string;
  sourceCode: string;
  relatedConcepts: string;
  bucketLabels: Record<'relates' | 'depends' | 'implements' | 'extends' | 'uses', string>;
}

const LOCALE_STRINGS: Record<Locale, LocaleStrings> = {
  en: {
    overview: 'Overview',
    overviewPlaceholder: '(Pending analysis)',
    details: 'Details',
    detailsPlaceholder: 'Run AI deep analysis to generate detailed content.',
    sourceCode: 'Source Code',
    relatedConcepts: 'Related Concepts',
    bucketLabels: {
      relates: 'related',
      depends: 'depends',
      implements: 'implements',
      extends: 'extends',
      uses: 'uses',
    },
  },
  'zh-TW': {
    overview: '概述',
    overviewPlaceholder: '（待分析）',
    details: '詳細說明',
    detailsPlaceholder: '執行 AI 深度分析以生成詳細內容。',
    sourceCode: '相關程式碼',
    relatedConcepts: '相關概念',
    bucketLabels: {
      relates: '相關',
      depends: '依賴',
      implements: '實作',
      extends: '延伸',
      uses: '使用',
    },
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render a single WikiNode as a complete Markdown file string.
 *
 * @param node    The WikiNode to render.
 * @param links   Resolved links for this node, produced by link-resolver.
 * @param options Optional render configuration.
 * @returns       Full Markdown file content ready to be written to disk.
 */
export function renderMarkdown(
  node: WikiNode,
  links: NodeLinks,
  options?: RenderOptions,
): string {
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const locale: Locale = options?.locale ?? 'en';
  const strings = LOCALE_STRINGS[locale];

  const parts: string[] = [];

  // 1. YAML frontmatter
  parts.push(renderFrontmatter(node, links, generatedAt));

  // 2. Title
  parts.push(`# ${node.displayName}`);
  parts.push('');

  // 3. Overview / 概述
  parts.push(`## ${strings.overview}`);
  parts.push('');
  parts.push(
    node.summary !== undefined && node.summary.trim().length > 0
      ? node.summary.trim()
      : strings.overviewPlaceholder,
  );
  parts.push('');

  // 4. Details / 詳細說明 (Phase 2 placeholder — replaced by AI deep analysis)
  parts.push(`## ${strings.details}`);
  parts.push('');
  parts.push(strings.detailsPlaceholder);
  parts.push('');

  // 5. Source code / 相關程式碼
  const sourceSection = renderSourceFiles(node.sourceFiles, strings.sourceCode);
  if (sourceSection.length > 0) {
    parts.push(sourceSection);
    parts.push('');
  }

  // 6. Related concepts / 相關概念
  const conceptSection = renderRelatedConcepts(links, strings.relatedConcepts, strings.bucketLabels);
  if (conceptSection.length > 0) {
    parts.push(conceptSection);
    parts.push('');
  }

  // 7. HTML comment metadata
  parts.push(`<!-- @codeatlas:id=${node.id} -->`);

  return parts.join('\n').trimEnd() + '\n';
}

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------

/**
 * Render the YAML frontmatter block.
 *
 * Fields:
 *   concept   — node.displayName (quoted)
 *   type      — node.type (unquoted enum value)
 *   related   — deduplicated display names from ALL link buckets
 *   sources   — node.sourceFiles as a YAML list
 *   generated — ISO timestamp (quoted)
 */
function renderFrontmatter(
  node: WikiNode,
  links: NodeLinks,
  generatedAt: string,
): string {
  const relatedNames = collectRelatedNames(links);

  const lines: string[] = ['---', `concept: ${yamlString(node.displayName)}`, `type: ${node.type}`];

  // related array
  if (relatedNames.length > 0) {
    lines.push(`related: [${relatedNames.map(yamlString).join(', ')}]`);
  } else {
    lines.push('related: []');
  }

  // sources YAML list
  lines.push('sources:');
  for (const src of node.sourceFiles) {
    lines.push(`  - ${src}`);
  }

  lines.push(`generated: ${yamlString(generatedAt)}`);
  lines.push('---');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Source files section
// ---------------------------------------------------------------------------

/**
 * Render the source files section (heading controlled by caller).
 *
 * Each entry uses the basename as the label and the original path as the
 * inline description:
 *   - `basename` — relativePath
 *
 * Returns an empty string when sourceFiles is empty.
 */
function renderSourceFiles(sourceFiles: string[], heading: string): string {
  if (sourceFiles.length === 0) return '';

  const lines: string[] = [`## ${heading}`, ''];
  for (const filePath of sourceFiles) {
    const base = basename(filePath);
    lines.push(`- \`${base}\` — ${filePath}`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Related concepts section
// ---------------------------------------------------------------------------

/**
 * Render the related concepts section (heading and labels controlled by caller).
 *
 * All five relationship buckets are rendered in order. Each non-empty bucket
 * contributes items of the form:
 *   - [[slug|displayName]] — {label}
 *
 * Returns an empty string when all buckets are empty.
 */
function renderRelatedConcepts(
  links: NodeLinks,
  heading: string,
  bucketLabels: Record<'relates' | 'depends' | 'implements' | 'extends' | 'uses', string>,
): string {
  const BUCKET_ORDER: Array<{ key: keyof NodeLinks; labelKey: 'relates' | 'depends' | 'implements' | 'extends' | 'uses' }> = [
    { key: 'relates', labelKey: 'relates' },
    { key: 'depends', labelKey: 'depends' },
    { key: 'implements', labelKey: 'implements' },
    { key: 'extends', labelKey: 'extends' },
    { key: 'uses', labelKey: 'uses' },
  ];

  const items: string[] = [];

  for (const { key, labelKey } of BUCKET_ORDER) {
    const bucket = links[key] as ResolvedLink[] | undefined;
    if (bucket === undefined || bucket.length === 0) continue;
    const label = bucketLabels[labelKey];
    for (const link of bucket) {
      items.push(`- ${link.wikiLink} — (${label})`);
    }
  }

  if (items.length === 0) return '';

  return [`## ${heading}`, '', ...items].join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Collect deduplicated displayName strings from all NodeLinks buckets.
 * Used to populate the `related` frontmatter field.
 */
function collectRelatedNames(links: NodeLinks): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const buckets: Array<ResolvedLink[] | undefined> = [
    links.relates,
    links.depends,
    links.implements,
    links.extends,
    links.uses,
  ];

  for (const bucket of buckets) {
    if (bucket === undefined) continue;
    for (const link of bucket) {
      if (!seen.has(link.displayName)) {
        seen.add(link.displayName);
        result.push(link.displayName);
      }
    }
  }

  return result;
}

/**
 * Return the final path segment (basename) of a POSIX-style or Windows-style
 * file path string. No Node.js `path` module import required.
 */
function basename(filePath: string): string {
  // Normalise both slash styles then take the last segment.
  const normalised = filePath.replace(/\\/g, '/');
  const parts = normalised.split('/');
  return parts[parts.length - 1] ?? filePath;
}

// ---------------------------------------------------------------------------
// YAML helpers
// ---------------------------------------------------------------------------

/**
 * Wrap a string value in YAML double-quotes.
 *
 * Escapes existing backslash and double-quote characters to keep the YAML
 * document valid. All string frontmatter values use this to safely handle
 * display names and timestamps that may contain colons or other special chars.
 */
export function yamlString(value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}
