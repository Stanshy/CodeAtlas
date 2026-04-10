/**
 * AI Response Sanitizer — Sprint 16
 *
 * Strips markdown fences, extracts JSON, validates with zod schemas.
 * Replaces ad-hoc extractJson() methods scattered across providers.
 * Improves JSON output success rate for local models (e.g. Gemma4).
 *
 * @module ai/response-sanitizer
 */

import type { ZodSchema } from 'zod';

/**
 * Strip markdown code fences from an AI response string.
 * Handles both ```json ... ``` and plain ``` ... ``` variants.
 */
function stripMarkdownFences(raw: string): string {
  // Remove opening fence with optional language tag, and closing fence
  return raw
    .replace(/^```(?:json|typescript|js|javascript)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
}

/**
 * sanitizeAIResponse
 *
 * Attempts to extract a valid JSON value from an AI response string:
 * 1. Strip markdown code fences (```json ... ```)
 * 2. Try JSON.parse on the cleaned string
 * 3. Fallback: regex-extract the first complete {...} or [...] block
 *
 * All parsing is wrapped in try-catch. Throws a descriptive error if all
 * strategies fail.
 *
 * @param raw - Raw string output from an AI model
 * @returns Parsed JSON value (object, array, string, number, boolean, null)
 * @throws Error with descriptive message if JSON cannot be extracted
 */
export function sanitizeAIResponse(raw: string): unknown {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('sanitizeAIResponse: received empty or non-string input.');
  }

  const stripped = stripMarkdownFences(raw);

  // Strategy 1: direct parse of the stripped string
  try {
    return JSON.parse(stripped);
  } catch {
    // fall through to strategy 2
  }

  // Strategy 2: extract the first JSON object {...}
  const objectMatch = stripped.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      // fall through to strategy 3
    }
  }

  // Strategy 3: extract the first JSON array [...]
  const arrayMatch = stripped.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {
      // fall through to final error
    }
  }

  throw new Error(
    `sanitizeAIResponse: failed to extract valid JSON from AI response. ` +
    `First 200 chars: ${raw.slice(0, 200)}`,
  );
}

/**
 * sanitizeAndValidate
 *
 * Combines sanitizeAIResponse() with a Zod schema safeParse.
 * Never throws — always returns a result object.
 *
 * @param raw    - Raw string output from an AI model
 * @param schema - Zod schema to validate the parsed value against
 * @returns { success: true; data: T } on success, or { success: false; error: string } on failure
 */
export function sanitizeAndValidate<T>(
  raw: string,
  schema: ZodSchema<T>,
): { success: boolean; data?: T; error?: string } {
  let parsed: unknown;

  try {
    parsed = sanitizeAIResponse(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `JSON extraction failed: ${message}` };
  }

  const result = schema.safeParse(parsed);
  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: `Schema validation failed: ${result.error.message}`,
  };
}
