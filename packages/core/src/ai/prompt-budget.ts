/**
 * AI Prompt Budget — Sprint 14-15
 * Controls context size sent to AI providers via token estimation and truncation.
 * @module ai/prompt-budget
 */

import type { MethodContext, ChainContext, PromptBudget } from './types.js';

/** Directory info for building large context (SF perspective) */
export interface DirectoryInfo {
  path: string;
  files: Array<{
    name: string;
    exports: string[];
    lineCount: number;
    functions?: Array<{ name: string; signature: string }>;
  }>;
  subdirectories?: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Approximate tokens per character (GPT/Claude tokenizer heuristic) */
const CHARS_PER_TOKEN = 4;

/** Token limits per budget tier */
export const BUDGET_LIMITS: Record<PromptBudget, number> = {
  small: 2_000,
  medium: 8_000,
  large: 20_000,
};

// ---------------------------------------------------------------------------
// Token Estimation
// ---------------------------------------------------------------------------

/**
 * Estimate token count for a string using a chars-per-token heuristic.
 * Not exact — suitable for budget gating, not billing.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

// ---------------------------------------------------------------------------
// Truncation
// ---------------------------------------------------------------------------

/**
 * Truncate text so it fits within maxTokens.
 * Appends '...[truncated]' when truncation occurs.
 */
export function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  if (text.length <= maxChars) {
    return text;
  }
  const suffix = '...[truncated]';
  return text.slice(0, maxChars - suffix.length) + suffix;
}

// ---------------------------------------------------------------------------
// Method Signature Builder
// ---------------------------------------------------------------------------

/**
 * Build a concise one-line method signature string.
 *
 * Format: `[async] name(param: Type, ...): ReturnType  // filePath`
 */
export function buildMethodSignature(method: MethodContext): string {
  const asyncPrefix = method.isAsync ? 'async ' : '';

  const params = method.parameters && method.parameters.length > 0
    ? method.parameters
        .map(p => (p.type ? `${p.name}: ${p.type}` : p.name))
        .join(', ')
    : '';

  const returnSuffix = method.returnType ? `: ${method.returnType}` : '';

  return `${asyncPrefix}${method.name}(${params})${returnSuffix}  // ${method.filePath}`;
}

// ---------------------------------------------------------------------------
// Batch Method Context Builder
// ---------------------------------------------------------------------------

/**
 * Build a context string for a batch of methods, constrained by budget.
 *
 * Strategy:
 *  1. First pass — include all method signatures (cheap, always fits).
 *  2. Second pass — fill remaining budget with code snippets, truncating
 *     longer snippets first so smaller methods get full representation.
 */
export function buildMethodBatchContext(methods: MethodContext[], budget: PromptBudget): string {
  const tokenLimit = BUDGET_LIMITS[budget];

  // ── Phase 1: build signatures section ──────────────────────────────────
  const signatureLines: string[] = methods.map((m, i) => {
    const idx = i + 1;
    const sig = buildMethodSignature(m);
    const id = `[${m.nodeId}]`;
    return `${idx}. ${id} ${sig}`;
  });

  const signaturesBlock = signatureLines.join('\n');
  let usedTokens = estimateTokens(signaturesBlock);

  // If even signatures exceed budget, truncate the whole block
  if (usedTokens >= tokenLimit) {
    return truncateToTokens(signaturesBlock, tokenLimit);
  }

  // ── Phase 2: append code snippets within remaining budget ───────────────
  const methodsWithSnippets = methods
    .filter(m => m.codeSnippet && m.codeSnippet.length > 0)
    .sort((a, b) => {
      // Shorter snippets first so we include as many as possible;
      // longer ones get truncated last.
      const lenA = a.codeSnippet?.length ?? 0;
      const lenB = b.codeSnippet?.length ?? 0;
      return lenA - lenB;
    });

  const snippetParts: string[] = [];

  for (const method of methodsWithSnippets) {
    const remaining = tokenLimit - usedTokens;
    if (remaining <= 0) break;

    // Reserve a small overhead for the header line
    const headerLine = `\n--- [${method.nodeId}] ${method.name} ---\n`;
    const headerTokens = estimateTokens(headerLine);
    const snippetBudget = remaining - headerTokens;

    if (snippetBudget <= 0) break;

    const snippet = truncateToTokens(method.codeSnippet!, snippetBudget);
    const block = `${headerLine}${snippet}`;
    snippetParts.push(block);
    usedTokens += estimateTokens(block);
  }

  if (snippetParts.length === 0) {
    return signaturesBlock;
  }

  return `${signaturesBlock}\n\nCode Snippets:${snippetParts.join('\n')}`;
}

// ---------------------------------------------------------------------------
// Chain Context Builder
// ---------------------------------------------------------------------------

/**
 * Build a context string for a call chain, constrained by budget.
 *
 * Format:
 * ```
 * [GET] /api/path
 *   Step 1: methodName (ClassName) — fileId  [role]
 *   Step 2: ...
 * ```
 */
export function buildChainContext(chain: ChainContext, budget: PromptBudget): string {
  const tokenLimit = BUDGET_LIMITS[budget];

  const headerLine = `[${chain.method}] ${chain.path}`;

  const stepLines = chain.steps.map((step, i) => {
    const stepNum = i + 1;
    const className = step.className ? ` (${step.className})` : '';
    const role = step.role ? `  [${step.role}]` : '';
    return `  Step ${stepNum}: ${step.name}${className} — ${step.fileId}${role}`;
  });

  const full = [headerLine, ...stepLines].join('\n');
  return truncateToTokens(full, tokenLimit);
}

// ---------------------------------------------------------------------------
// Large Context Builder (SF / directory-level)
// ---------------------------------------------------------------------------

/**
 * Build a context string for a directory, constrained by Large budget (~20K tokens).
 *
 * Strategy:
 *  1. Phase 1 — directory tree structure + file list with exports (always included)
 *  2. Phase 2 — fill remaining budget with function signatures from largest files first
 */
export function buildLargeContext(directory: DirectoryInfo, budget: PromptBudget = 'large'): string {
  const tokenLimit = BUDGET_LIMITS[budget];

  // ── Phase 1: directory structure + file exports ──────────────────────
  const lines: string[] = [];
  lines.push(`Directory: ${directory.path}`);

  if (directory.subdirectories && directory.subdirectories.length > 0) {
    lines.push('');
    lines.push('Subdirectories:');
    // Limit depth display to 3 levels
    for (const sub of directory.subdirectories.slice(0, 50)) {
      lines.push(`  ${sub}/`);
    }
    if (directory.subdirectories.length > 50) {
      lines.push(`  ...(${directory.subdirectories.length - 50} more)`);
    }
  }

  lines.push('');
  lines.push(`Files (${directory.files.length}):`);

  for (const file of directory.files) {
    const exportsList = file.exports.length > 0
      ? ` [exports: ${file.exports.join(', ')}]`
      : '';
    lines.push(`  ${file.name} (${file.lineCount} lines)${exportsList}`);
  }

  const phase1 = lines.join('\n');
  let usedTokens = estimateTokens(phase1);

  if (usedTokens >= tokenLimit) {
    return truncateToTokens(phase1, tokenLimit);
  }

  // ── Phase 2: function signatures from largest files first ───────────
  const filesWithFunctions = directory.files
    .filter(f => f.functions && f.functions.length > 0)
    .sort((a, b) => b.lineCount - a.lineCount); // Largest files first (most important)

  const signatureParts: string[] = [];
  let filesIncluded = 0;
  const maxFiles = 5; // Top 5 most important files

  for (const file of filesWithFunctions) {
    if (filesIncluded >= maxFiles) break;

    const remaining = tokenLimit - usedTokens;
    if (remaining <= 0) break;

    const header = `\n--- ${file.name} ---\n`;
    const sigs = file.functions!
      .map(fn => `  ${fn.signature}`)
      .join('\n');
    const block = `${header}${sigs}`;
    const blockTokens = estimateTokens(block);

    if (blockTokens > remaining) {
      // Try to fit partial
      const truncated = truncateToTokens(block, remaining);
      signatureParts.push(truncated);
      usedTokens += estimateTokens(truncated);
      break;
    }

    signatureParts.push(block);
    usedTokens += blockTokens;
    filesIncluded++;
  }

  if (signatureParts.length === 0) {
    return phase1;
  }

  return `${phase1}\n\nFunction Signatures:${signatureParts.join('')}`;
}
