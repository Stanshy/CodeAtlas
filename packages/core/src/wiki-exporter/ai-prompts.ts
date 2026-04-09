/**
 * CodeAtlas — Wiki AI Prompt Builders (Knowledge Node Edition)
 *
 * Constructs prompts for AI-powered knowledge concept extraction and deep analysis.
 * This module implements the two-phase AI strategy for the wiki knowledge export:
 *
 *   Phase A (Global): Extract 15-50 knowledge concepts from the full project context.
 *   Phase B (Deep):   Generate a detailed technical knowledge page per concept.
 *
 * Design constraints:
 *   1. Concepts are semantic topics, NOT 1:1 file mappings.
 *   2. AI decides concept names and language (Chinese preferred for Chinese-oriented projects).
 *   3. Graceful degradation: parse failures return empty array / empty string.
 *   4. Token budget: ProjectContext must fit ~8000 tokens (~32000 chars) total.
 *
 * Used by: WikiExporter via packages/core/src/wiki-exporter/wiki-exporter.ts
 *
 * @module wiki-exporter/ai-prompts
 * @sprint Sprint 19 — Wiki 知識輸出 + Obsidian 知識圖
 */

import type {
  ProjectContext,
  ExtractedConcept,
  WikiNodeType,
} from './types.js';
import type { AnalysisResult, GraphNode, GraphEdge } from '../types.js';
import type { DirectoryGraph } from '../analyzers/directory-aggregator.js';
import type { EndpointGraph } from '../analyzers/endpoint-detector.js';

// ---------------------------------------------------------------------------
// Token / char budget constants
// ---------------------------------------------------------------------------

/** Total character budget for the assembled ProjectContext (~32000 chars ≈ 8000 tokens). */
const PROJECT_CONTEXT_CHAR_BUDGET = 32_000;

/** Max files to include in the file tree section. */
const FILE_TREE_MAX_FILES = 50;

/** Max function/class signatures to include. */
const SIGNATURES_MAX_COUNT = 100;

/** Max import relationships to surface. */
const IMPORT_GRAPH_MAX_ENTRIES = 30;

/** Each section's proportional share of the total budget. */
const BUDGET_FILE_TREE = Math.floor(PROJECT_CONTEXT_CHAR_BUDGET * 0.25);
const BUDGET_SIGNATURES = Math.floor(PROJECT_CONTEXT_CHAR_BUDGET * 0.30);
const BUDGET_IMPORT_GRAPH = Math.floor(PROJECT_CONTEXT_CHAR_BUDGET * 0.20);
const BUDGET_AI_SUMMARIES = Math.floor(PROJECT_CONTEXT_CHAR_BUDGET * 0.25);

// ---------------------------------------------------------------------------
// Valid WikiNodeType values for validation
// ---------------------------------------------------------------------------

const VALID_NODE_TYPES = new Set<WikiNodeType>([
  'architecture',
  'pattern',
  'feature',
  'integration',
  'concept',
]);

// ---------------------------------------------------------------------------
// Prompt A: Global Concept Extraction
// ---------------------------------------------------------------------------

/**
 * Build the full combined prompt (system + user) for global concept extraction.
 *
 * Instructs the AI to analyze the full project context and extract 15-50
 * knowledge concepts. Each concept is a semantic topic spanning multiple files,
 * not a 1:1 mapping to individual source files.
 *
 * @param context  Assembled ProjectContext from buildProjectContext().
 * @returns        Complete prompt string ready for rawPrompt().
 */
export function buildConceptExtractionPrompt(context: ProjectContext): string {
  const systemPart = `你是一位資深軟體架構師，負責分析程式碼專案並萃取知識概念。

任務：分析以下專案結構，萃取出 15-50 個重要的知識概念。

每個概念代表一個獨立的知識主題，例如：
- 認證機制（跨越 auth-service.ts, middleware.ts, jwt-utils.ts）
- 資料庫存取模式（跨越所有 repository, model 檔案）
- 錯誤處理策略（跨越 error-handler.ts, middleware, custom exceptions）

概念的粒度建議：
- 太粗：「後端」（太大，不具體）
- 太細：「generateToken 函式」（這是程式碼元素，不是知識概念）
- 適當：「JWT Token 驗證機制」（一個完整的知識主題）

type 分類：
- architecture: 系統架構層面（如「微服務架構」「事件驅動」）
- pattern: 設計模式/開發模式（如「Repository Pattern」「Middleware Chain」）
- feature: 功能/業務邏輯（如「認證機制」「影片處理」「計費系統」）
- integration: 整合/串接（如「第三方支付整合」「Google OAuth」）
- concept: 其他知識概念（如「錯誤處理策略」「快取機制」）

回傳格式（嚴格 JSON，不要加任何前綴說明文字）：
{
  "concepts": [
    {
      "name": "概念名稱（中文或英文，依專案語境）",
      "slug": "english-kebab-case-slug",
      "type": "feature",
      "summary": "1-3 句概述這個概念是什麼、為什麼重要",
      "sourceFiles": ["相對路徑/file1.ts", "相對路徑/file2.ts"],
      "relatedConcepts": ["other-concept-slug"],
      "edges": [
        { "target": "other-concept-slug", "type": "depends", "label": "描述關係" }
      ]
    }
  ]
}

重要限制：
1. sourceFiles 只能包含下面「專案結構」中實際存在的檔案路徑，不可憑空創造。
2. edges.type 只能是：relates | depends | implements | extends | uses
3. 每個概念的 sourceFiles 不能為空陣列。
4. slug 必須是 english-kebab-case（全小寫英文，以 - 分隔）。`;

  const userPart = buildProjectContextSection(context);

  return `${systemPart}\n\n${userPart}`;
}

/**
 * Parse raw AI response from concept extraction into ExtractedConcept[].
 *
 * Fallback strategy:
 *   1. Direct JSON.parse
 *   2. Regex-extract outermost `{...}` block and parse
 *   3. Return [] on total failure (caller handles graceful degradation)
 *
 * Per-concept validation:
 *   - Required fields: name, slug, type, summary, sourceFiles
 *   - Filters concepts with empty sourceFiles
 *   - Defaults invalid type to 'concept'
 *   - Normalizes edges.type to valid WikiEdgeType values
 *
 * @param raw  Raw string returned by the AI provider.
 * @returns    Validated ExtractedConcept array, or [] on failure.
 */
export function parseConceptExtractionResponse(raw: string): ExtractedConcept[] {
  if (!raw || raw.trim().length === 0) {
    return [];
  }

  let parsed: unknown;

  // Strip markdown code fences if present
  const stripped = raw.trim().replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  // Strategy 1: Direct parse (works for both {objects} and [arrays])
  try {
    parsed = JSON.parse(stripped);
  } catch {
    // Strategy 2: Try to repair truncated JSON (AI output cut off by max_tokens)
    const repaired = _repairTruncatedJson(stripped);
    if (repaired !== null) {
      try {
        parsed = JSON.parse(repaired);
      } catch {
        // Strategy 3: Extract outermost JSON object or array via regex
        parsed = _extractJsonFallback(stripped);
        if (parsed === null) return [];
      }
    } else {
      parsed = _extractJsonFallback(stripped);
      if (parsed === null) return [];
    }
  }

  // Find the concepts array — try multiple common AI response shapes
  const obj = parsed as Record<string, unknown>;
  let rawConcepts: unknown[];

  if (obj !== null && typeof obj === 'object') {
    if (Array.isArray(obj.concepts)) {
      rawConcepts = obj.concepts;
    } else if (Array.isArray(obj.knowledge_graph)) {
      rawConcepts = obj.knowledge_graph;
    } else if (Array.isArray(obj.nodes)) {
      rawConcepts = obj.nodes;
    } else if (Array.isArray(obj.topics)) {
      rawConcepts = obj.topics;
    } else if (Array.isArray(parsed)) {
      rawConcepts = parsed as unknown[];
    } else {
      // Last resort: collect ALL array properties and merge them
      const allArrays = Object.values(obj).filter((v) => Array.isArray(v));
      if (allArrays.length > 0) {
        rawConcepts = allArrays.flat() as unknown[];
      } else {
        return [];
      }
    }
  } else {
    return [];
  }

  const result: ExtractedConcept[] = [];

  for (const item of rawConcepts) {
    if (item === null || typeof item !== 'object') continue;
    const c = item as Record<string, unknown>;

    // Flexible name extraction: try many common AI field names
    const name = _firstNonEmptyString(
      c.name, c.node, c.title, c.label, c.concept,
      c.component_name, c.component, c.area, c.topic, c.subject,
      c.entity, c.feature, c.module, c.system,
    );
    if (name === undefined) continue;

    // Flexible summary extraction
    const summary = _firstNonEmptyString(
      c.summary, c.description, c.desc, c.content, c.details, c.overview,
    ) ?? name;

    // Flexible slug: slug > id, or auto-generate from name
    const slug = _firstNonEmptyString(c.slug, c.id) ?? _nameToSlug(name);

    // Validate and default type — accept broader range then map
    const rawType = typeof c.type === 'string' ? c.type : '';
    const type: WikiNodeType = _normalizeNodeType(rawType);

    // Flexible sourceFiles: sourceFiles > source_files > files > sources
    let sourceFiles: string[] = [];
    const rawSourceFiles = c.sourceFiles ?? c.source_files ?? c.files ?? c.sources;
    if (Array.isArray(rawSourceFiles)) {
      sourceFiles = (rawSourceFiles as unknown[])
        .filter((f): f is string => typeof f === 'string' && f.trim().length > 0);
    }
    // If no source files, create a placeholder — don't skip the concept
    if (sourceFiles.length === 0) {
      sourceFiles = [`(inferred from: ${name})`];
    }

    // Flexible relatedConcepts: relatedConcepts > related_concepts > related > related_nodes > related_modules
    const rawRelated = c.relatedConcepts ?? c.related_concepts ?? c.related ?? c.related_nodes ?? c.related_modules ?? c.dependencies;
    const relatedConcepts: string[] = Array.isArray(rawRelated)
      ? (rawRelated as unknown[]).filter((r): r is string => typeof r === 'string')
      : [];

    // Normalize edges from explicit edges array
    const validEdgeTypes = new Set(['relates', 'depends', 'implements', 'extends', 'uses']);
    const edges: ExtractedConcept['edges'] = Array.isArray(c.edges)
      ? (c.edges as unknown[]).reduce<ExtractedConcept['edges']>((acc, e) => {
          if (e === null || typeof e !== 'object') return acc;
          const edge = e as Record<string, unknown>;
          if (typeof edge.target !== 'string' || edge.target.trim().length === 0) return acc;
          const edgeType = typeof edge.type === 'string' && validEdgeTypes.has(edge.type)
            ? (edge.type as ExtractedConcept['edges'][number]['type'])
            : 'relates';
          const entry: ExtractedConcept['edges'][number] = {
            target: edge.target.trim(),
            type: edgeType,
          };
          if (typeof edge.label === 'string' && edge.label.trim().length > 0) {
            entry.label = edge.label.trim();
          }
          acc.push(entry);
          return acc;
        }, [])
      : [];

    // Synthesize edges from relatedConcepts if no explicit edges
    if (edges.length === 0 && relatedConcepts.length > 0) {
      for (const related of relatedConcepts) {
        edges.push({ target: _nameToSlug(related), type: 'relates' });
      }
    }

    result.push({
      name: name.trim(),
      slug: slug.trim(),
      type,
      summary: summary.trim(),
      sourceFiles,
      relatedConcepts,
      edges,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Prompt B: Per-Concept Deep Analysis
// ---------------------------------------------------------------------------

/**
 * Build the prompt for deep analysis of a single knowledge concept.
 *
 * Instructs the AI to produce a structured Markdown knowledge page covering:
 * overview, operation flow, design decisions, and related code.
 *
 * @param concept     The concept to analyze (name, type, summary, sourceFiles).
 * @param sourceCode  Relevant source file contents (truncated to fit token budget).
 * @returns           Complete prompt string ready for rawPrompt().
 */
export function buildConceptDeepAnalysisPrompt(
  concept: { name: string; type: string; summary: string; sourceFiles: string[] },
  sourceCode: Array<{ path: string; content: string }>,
): string {
  const sourceCodeSection = sourceCode.length > 0
    ? sourceCode.map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n')
    : '（無原始碼提供）';

  return `你是一位技術文件撰寫專家。請為以下知識概念撰寫完整的技術知識頁面。

概念：${concept.name}
類型：${concept.type}
概述：${concept.summary}
涉及檔案：${concept.sourceFiles.join(', ')}

以下是相關原始碼：

---
${sourceCodeSection}
---

請產出 Markdown 格式的知識頁面，包含以下各節（直接輸出內容，不要加任何前言）：

## 概述
（2-5 句說明這個概念是什麼、解決什麼問題）

## 運作流程
（說明這個概念如何運作，用條列式或流程描述）

## 設計決策
（為什麼這樣設計、有什麼取捨）

## 相關程式碼
（列出關鍵程式碼檔案及其在此概念中的角色）

注意：
- 只描述概念知識，不要逐行解釋程式碼
- 用技術人員能理解的語言
- 不要重複 frontmatter 中的資訊
- 不要在輸出中加入「注意」或「請注意」等引導語`;
}

/**
 * Parse deep analysis AI response into clean Markdown content.
 *
 * Stripping strategy:
 *   - Remove AI preamble lines (e.g. "好的，以下是..." / "以下是...")
 *   - Preserve all markdown structure (##, ###, lists, code blocks)
 *   - Collapse excessive blank lines to at most 2
 *   - Trim surrounding whitespace
 *
 * Graceful degradation: returns "" on empty response (caller uses placeholder).
 *
 * @param raw  Raw string returned by the AI provider.
 * @returns    Clean Markdown string, or "" for empty/failed responses.
 */
export function parseConceptDeepAnalysisResponse(raw: string): string {
  if (!raw || raw.trim().length === 0) {
    return '';
  }

  let cleaned = raw.trim();

  // Strip common AI preamble patterns before the first markdown header
  cleaned = cleaned.replace(/^[^#]*?(##\s)/s, '$1');

  // Strip HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // Collapse 3+ consecutive blank lines to 2
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

// ---------------------------------------------------------------------------
// Helper: Build ProjectContext from AnalysisResult
// ---------------------------------------------------------------------------

/**
 * Assemble a ProjectContext from AnalysisResult for AI consumption.
 *
 * Builds four sections within a ~32000 char (~8000 token) budget:
 *   1. fileTree    — directory tree of the most relevant files (≤50)
 *   2. signatures  — exported function/class signatures (≤100)
 *   3. importGraph — top 30 most-connected import relationships
 *   4. aiSummaries — existing AI one-line summaries per file node
 *
 * Each section is truncated proportionally if it exceeds its budget share.
 *
 * @param analysisResult  Full analysis result from the core analyzer.
 * @param directoryGraph  Optional aggregated directory graph (may be null for flat projects).
 * @param endpointGraph   Optional detected API endpoint graph (may be null for non-web projects).
 * @returns               Assembled ProjectContext ready for buildConceptExtractionPrompt().
 */
export function buildProjectContext(
  analysisResult: AnalysisResult,
  directoryGraph: DirectoryGraph | null,
  endpointGraph: EndpointGraph | null,
): ProjectContext {
  const { graph, stats } = analysisResult;

  const fileTree = _buildFileTree(graph.nodes, directoryGraph);
  const signatures = _buildSignatures(graph.nodes);
  const importGraph = _buildImportGraph(graph.nodes, graph.edges);
  const aiSummaries = _buildAiSummaries(graph.nodes, endpointGraph);

  return {
    fileTree: _truncate(fileTree, BUDGET_FILE_TREE),
    signatures: _truncate(signatures, BUDGET_SIGNATURES),
    importGraph: _truncate(importGraph, BUDGET_IMPORT_GRAPH),
    aiSummaries: _truncate(aiSummaries, BUDGET_AI_SUMMARIES),
    totalFiles: stats.totalFiles,
    totalFunctions: stats.totalFunctions ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Internal: Section builders
// ---------------------------------------------------------------------------

/**
 * Build a formatted file tree string from graph nodes.
 * Groups files by directory and limits to FILE_TREE_MAX_FILES most important files.
 * Importance heuristic: prefer non-test, non-generated files; sort by dependency count.
 */
function _buildFileTree(nodes: GraphNode[], directoryGraph: DirectoryGraph | null): string {
  const fileNodes = nodes
    .filter((n) => n.type === 'file')
    .sort((a, b) => {
      const depA = a.metadata.dependencyCount ?? 0;
      const depB = b.metadata.dependencyCount ?? 0;
      return depB - depA;
    });

  // Prioritize non-test, non-generated files
  const prioritized = [
    ...fileNodes.filter((n) => !_isTestOrGenerated(n.filePath)),
    ...fileNodes.filter((n) => _isTestOrGenerated(n.filePath)),
  ].slice(0, FILE_TREE_MAX_FILES);

  // Group by directory
  const byDir = new Map<string, string[]>();
  for (const node of prioritized) {
    const dir = _getDirectory(node.filePath);
    const existing = byDir.get(dir);
    if (existing) {
      existing.push(node.label);
    } else {
      byDir.set(dir, [node.label]);
    }
  }

  const lines: string[] = ['專案結構（部分）：'];

  // If we have directory graph with roles, annotate directories
  const dirRoles = new Map<string, string>();
  if (directoryGraph) {
    for (const dirNode of directoryGraph.nodes) {
      dirRoles.set(dirNode.id, dirNode.role ?? dirNode.type);
    }
  }

  for (const [dir, files] of byDir) {
    const role = dirRoles.get(dir);
    const roleAnnotation = role ? ` [${role}]` : '';
    lines.push(`${dir}/${roleAnnotation}`);
    for (const file of files) {
      lines.push(`  ${file}`);
    }
  }

  if (fileNodes.length > FILE_TREE_MAX_FILES) {
    lines.push(`  ... 以及其他 ${fileNodes.length - FILE_TREE_MAX_FILES} 個檔案`);
  }

  return lines.join('\n');
}

/**
 * Build a signatures string from exported function and class nodes.
 * Includes: name, kind, parameters, returnType, isAsync, filePath.
 * Limited to SIGNATURES_MAX_COUNT most important entries.
 */
function _buildSignatures(nodes: GraphNode[]): string {
  const funcAndClassNodes = nodes
    .filter(
      (n) =>
        (n.type === 'function' || n.type === 'class') &&
        n.metadata.isExported === true,
    )
    .sort((a, b) => {
      const depA = a.metadata.dependencyCount ?? 0;
      const depB = b.metadata.dependencyCount ?? 0;
      return depB - depA;
    })
    .slice(0, SIGNATURES_MAX_COUNT);

  if (funcAndClassNodes.length === 0) {
    return '（無匯出函式/類別資訊）';
  }

  const lines: string[] = ['主要匯出函式與類別：'];

  for (const node of funcAndClassNodes) {
    const kind = node.metadata.kind ?? node.type;
    const asyncPrefix = node.metadata.isAsync ? 'async ' : '';
    const params = node.metadata.parameters
      ? node.metadata.parameters
          .map((p) => (p.type ? `${p.name}: ${p.type}` : p.name))
          .join(', ')
      : '';
    const returnType = node.metadata.returnType ? `: ${node.metadata.returnType}` : '';
    const summary = node.metadata.aiSummary ? ` // ${node.metadata.aiSummary}` : '';

    if (kind === 'class') {
      const methodCount = node.metadata.methodCount ? ` (${node.metadata.methodCount} methods)` : '';
      lines.push(`  class ${node.label}${methodCount} — ${node.filePath}${summary}`);
    } else {
      lines.push(`  ${asyncPrefix}${node.label}(${params})${returnType} — ${node.filePath}${summary}`);
    }
  }

  return lines.join('\n');
}

/**
 * Build an import graph summary showing the top IMPORT_GRAPH_MAX_ENTRIES
 * most-connected source files and their import targets.
 */
function _buildImportGraph(nodes: GraphNode[], edges: GraphEdge[]): string {
  const importEdges = edges.filter((e) => e.type === 'import');

  if (importEdges.length === 0) {
    return '（無 import 關係資訊）';
  }

  // Count outgoing imports per source file
  const outgoingCount = new Map<string, number>();
  for (const edge of importEdges) {
    outgoingCount.set(edge.source, (outgoingCount.get(edge.source) ?? 0) + 1);
  }

  // Sort by most connections and take top N
  const topSources = [...outgoingCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, IMPORT_GRAPH_MAX_ENTRIES)
    .map(([id]) => id);

  const nodeById = new Map<string, GraphNode>(nodes.map((n) => [n.id, n]));

  const lines: string[] = ['主要 import 關係（依連結數排序）：'];

  for (const sourceId of topSources) {
    const sourceNode = nodeById.get(sourceId);
    const sourcePath = sourceNode?.filePath ?? sourceId;
    const targets = importEdges
      .filter((e) => e.source === sourceId)
      .map((e) => {
        const targetNode = nodeById.get(e.target);
        return targetNode?.filePath ?? e.target;
      })
      .slice(0, 5); // cap per-source targets to avoid verbosity

    const moreCount = (outgoingCount.get(sourceId) ?? 0) - targets.length;
    const targetStr = targets.join(', ') + (moreCount > 0 ? ` (+${moreCount} 更多)` : '');
    lines.push(`  ${sourcePath} → ${targetStr}`);
  }

  return lines.join('\n');
}

/**
 * Build a section of existing AI summaries from file nodes and endpoint descriptions.
 * Falls back to "（無 AI 摘要）" when no summaries are available.
 */
function _buildAiSummaries(nodes: GraphNode[], endpointGraph: EndpointGraph | null): string {
  const lines: string[] = [];

  // File-level AI summaries
  const filesWithSummaries = nodes.filter(
    (n) => n.type === 'file' && typeof n.metadata.aiSummary === 'string' && n.metadata.aiSummary.trim().length > 0,
  );

  if (filesWithSummaries.length > 0) {
    lines.push('AI 分析摘要（現有）：');
    for (const node of filesWithSummaries.slice(0, 40)) {
      lines.push(`  ${node.filePath}: ${node.metadata.aiSummary}`);
    }
    if (filesWithSummaries.length > 40) {
      lines.push(`  ... 以及其他 ${filesWithSummaries.length - 40} 個檔案`);
    }
  }

  // Endpoint summaries
  if (endpointGraph && endpointGraph.endpoints.length > 0) {
    lines.push('');
    lines.push('API 端點清單：');
    for (const ep of endpointGraph.endpoints.slice(0, 20)) {
      const desc = ep.description ? ` — ${ep.description}` : '';
      lines.push(`  ${ep.method} ${ep.path}${desc}`);
    }
    if (endpointGraph.endpoints.length > 20) {
      lines.push(`  ... 以及其他 ${endpointGraph.endpoints.length - 20} 個端點`);
    }
  }

  if (lines.length === 0) {
    return '（無 AI 摘要）';
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Internal: User prompt section builder
// ---------------------------------------------------------------------------

/**
 * Format ProjectContext into a structured user prompt section.
 */
function buildProjectContextSection(context: ProjectContext): string {
  return `專案統計：
- 總檔案數：${context.totalFiles}
- 總函式數：${context.totalFunctions}

${context.fileTree}

${context.signatures}

${context.importGraph}

${context.aiSummaries}

請根據以上專案資訊，萃取出 15-50 個重要的知識概念，以指定的 JSON 格式回傳。`;
}

// ---------------------------------------------------------------------------
// Internal: Utility helpers
// ---------------------------------------------------------------------------

/** Truncate a string to maxChars with an ellipsis notice if truncated. */
function _truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars - 50).trimEnd();
  return `${truncated}\n... （已截斷以符合 token 預算）`;
}

/** Extract the directory portion of a relative file path. */
function _getDirectory(filePath: string): string {
  const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  if (lastSlash === -1) return '.';
  return filePath.slice(0, lastSlash);
}

/** Return true when the file path looks like a test or generated file. */
function _isTestOrGenerated(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return (
    lower.includes('__test') ||
    lower.includes('.test.') ||
    lower.includes('.spec.') ||
    lower.includes('/test/') ||
    lower.includes('/tests/') ||
    lower.includes('/dist/') ||
    lower.includes('/generated/') ||
    lower.includes('.d.ts')
  );
}

/**
 * Attempt to repair truncated JSON by closing open brackets/braces.
 * Common when AI output is cut off by max_tokens.
 * Returns the repaired string, or null if it doesn't look like truncated JSON.
 */
function _repairTruncatedJson(text: string): string | null {
  // Must start with { or [ to look like JSON
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;

  // Count open vs close brackets
  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escape = false;

  for (const ch of trimmed) {
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    if (ch === '}') braces--;
    if (ch === '[') brackets++;
    if (ch === ']') brackets--;
  }

  // If balanced, no repair needed (but parse already failed, so probably not JSON)
  if (braces === 0 && brackets === 0) return null;

  // Truncated — try to close. First, trim any trailing incomplete entry
  let repaired = trimmed;
  // Remove trailing incomplete object/string (after last complete comma-separated entry)
  repaired = repaired.replace(/,\s*\{[^}]*$/s, '');
  repaired = repaired.replace(/,\s*"[^"]*$/s, '');
  // Remove trailing comma
  repaired = repaired.replace(/,\s*$/s, '');

  // Re-count after trimming
  braces = 0; brackets = 0; inString = false; escape = false;
  for (const ch of repaired) {
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    if (ch === '}') braces--;
    if (ch === '[') brackets++;
    if (ch === ']') brackets--;
  }

  // Close remaining open brackets/braces
  while (brackets > 0) { repaired += ']'; brackets--; }
  while (braces > 0) { repaired += '}'; braces--; }

  return repaired;
}

/**
 * Fallback: extract outermost JSON object or array via regex.
 */
function _extractJsonFallback(text: string): unknown | null {
  const objMatch = text.match(/\{[\s\S]*\}/);
  const arrMatch = text.match(/\[[\s\S]*\]/);
  const match = objMatch && arrMatch
    ? ((objMatch.index ?? Infinity) < (arrMatch.index ?? Infinity) ? objMatch : arrMatch)
    : (objMatch ?? arrMatch);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * Return the first non-empty string from a list of candidate values.
 * Used for flexible AI response parsing — different models use different field names.
 */
function _firstNonEmptyString(...candidates: unknown[]): string | undefined {
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) {
      return c.trim();
    }
  }
  return undefined;
}

/**
 * Convert a concept name to a kebab-case slug.
 * Handles Chinese characters by keeping them as-is and replacing spaces/special chars.
 */
function _nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff\u3400-\u4dbf]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'untitled';
}

/**
 * Normalize a raw type string to a valid WikiNodeType.
 * Maps common AI-generated type names to our canonical types.
 */
function _normalizeNodeType(rawType: string): WikiNodeType {
  if (VALID_NODE_TYPES.has(rawType as WikiNodeType)) {
    return rawType as WikiNodeType;
  }

  // Map common variants
  const lower = rawType.toLowerCase();
  const typeMap: Record<string, WikiNodeType> = {
    'module': 'architecture',
    'service': 'feature',
    'domain': 'concept',
    'library': 'integration',
    'framework': 'architecture',
    'utility': 'pattern',
    'middleware': 'pattern',
    'api': 'integration',
    'database': 'integration',
    'infrastructure': 'architecture',
    'security': 'feature',
    'testing': 'pattern',
    'config': 'concept',
    'configuration': 'concept',
  };

  return typeMap[lower] ?? 'concept';
}
