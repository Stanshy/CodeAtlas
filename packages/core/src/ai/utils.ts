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
export const AI_TIMEOUT_MS = 10_000;

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
    'You are a code analyst for a codebase visualization tool called CodeAtlas.',
    'Given source code and its import/export context, provide a concise 2-3 sentence summary',
    'explaining what this module does, in plain language that a non-engineer can understand.',
    'Focus on the purpose and role of the module within the project.',
    'Do NOT list individual functions or variables — describe the big picture.',
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
