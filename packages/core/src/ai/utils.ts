/**
 * AI Provider — Shared Utilities
 *
 * Common prompt building and code truncation logic shared across
 * all AI providers.  Keeps provider implementations DRY.
 */

import type { SummaryContext } from '../types.js';

/** Maximum lines of source code to include in the prompt */
const MAX_CODE_LINES = 200;

/** Default timeout for external AI API calls (ms) */
export const AI_TIMEOUT_MS = 120_000;

/**
 * Truncate source code to prevent token overflow.
 *
 * @param code      - Full source code string
 * @param maxLines  - Maximum number of lines to keep (default 200)
 * @returns Truncated code with a note if trimmed
 */
export function truncateCode(code: string, maxLines: number = MAX_CODE_LINES): string {
  if (!code) return '';

  const lines = code.split('\n');
  if (lines.length <= maxLines) return code;

  const truncated = lines.slice(0, maxLines).join('\n');
  return `${truncated}\n\n// ... (${lines.length - maxLines} more lines truncated)`;
}

/**
 * Build a standardised prompt for AI summarization.
 *
 * @param code    - Source code (will be truncated)
 * @param context - File path, language, imports, exports
 * @returns `{ system, user }` message pair
 */
export function buildPrompt(
  code: string,
  context: SummaryContext,
): { system: string; user: string } {
  const system = [
    '你是 CodeAtlas 程式碼視覺化工具的程式碼分析專家。',
    '根據原始碼及其 import/export 關係，用繁體中文提供簡潔的 2-3 句摘要，',
    '說明此模組的用途，用非工程師也能理解的語言。',
    '聚焦於模組在專案中的角色與用途。',
    '不要逐一列出函式或變數，描述整體功能。',
  ].join(' ');

  const importsList = context.imports.length > 0 ? context.imports.join(', ') : 'none';
  const exportsList = context.exports.length > 0 ? context.exports.join(', ') : 'none';

  const user = [
    `File: ${context.filePath} (${context.language})`,
    `Imports from: ${importsList}`,
    `Imported by: ${exportsList}`,
    '',
    'Source Code:',
    '```',
    truncateCode(code),
    '```',
  ].join('\n');

  return { system, user };
}
