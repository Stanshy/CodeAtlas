/**
 * Unit tests for ai/response-sanitizer.ts (Sprint 16 T11)
 *
 * Coverage targets:
 *   - sanitizeAIResponse: valid JSON, markdown fences, prose extraction, error cases
 *   - sanitizeAndValidate: schema validation, error propagation, never-throws guarantee
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { sanitizeAIResponse, sanitizeAndValidate } from '../src/ai/response-sanitizer.js';

// ---------------------------------------------------------------------------
// sanitizeAIResponse
// ---------------------------------------------------------------------------

describe('sanitizeAIResponse', () => {
  it('parses valid JSON object directly', () => {
    const result = sanitizeAIResponse('{"name":"atlas","version":1}');
    expect(result).toEqual({ name: 'atlas', version: 1 });
  });

  it('parses valid JSON array directly', () => {
    const result = sanitizeAIResponse('[1,2,3]');
    expect(result).toEqual([1, 2, 3]);
  });

  it('strips ```json ... ``` markdown fences', () => {
    const raw = '```json\n{"key":"value"}\n```';
    const result = sanitizeAIResponse(raw);
    expect(result).toEqual({ key: 'value' });
  });

  it('strips ``` ... ``` plain fences without language tag', () => {
    const raw = '```\n{"plain":true}\n```';
    const result = sanitizeAIResponse(raw);
    expect(result).toEqual({ plain: true });
  });

  it('strips ```typescript fences', () => {
    const raw = '```typescript\n{"type":"ts"}\n```';
    const result = sanitizeAIResponse(raw);
    expect(result).toEqual({ type: 'ts' });
  });

  it('extracts JSON object from surrounding prose text', () => {
    const raw = 'Here is the result: {"score":42} as requested.';
    const result = sanitizeAIResponse(raw);
    expect(result).toEqual({ score: 42 });
  });

  it('extracts JSON array from surrounding prose text', () => {
    const raw = 'The keywords are: ["foo","bar","baz"]';
    const result = sanitizeAIResponse(raw);
    expect(result).toEqual(['foo', 'bar', 'baz']);
  });

  it('throws on empty string input', () => {
    expect(() => sanitizeAIResponse('')).toThrow('empty or non-string input');
  });

  it('throws on whitespace-only input', () => {
    expect(() => sanitizeAIResponse('   ')).toThrow('empty or non-string input');
  });

  it('throws on non-string input (number)', () => {
    // Cast to string to satisfy TypeScript; runtime check inside function
    expect(() => sanitizeAIResponse(42 as unknown as string)).toThrow('empty or non-string input');
  });

  it('throws on completely invalid text with no JSON', () => {
    expect(() => sanitizeAIResponse('This is just plain prose with no JSON at all!')).toThrow(
      'failed to extract valid JSON',
    );
  });

  it('handles nested JSON with special characters', () => {
    const raw = '{"message":"hello \\"world\\"","items":[1,2]}';
    const result = sanitizeAIResponse(raw);
    expect(result).toEqual({ message: 'hello "world"', items: [1, 2] });
  });

  it('handles JSON number at top level after stripping fence', () => {
    const raw = '```json\n42\n```';
    const result = sanitizeAIResponse(raw);
    expect(result).toBe(42);
  });

  it('handles JSON boolean true directly', () => {
    const result = sanitizeAIResponse('true');
    expect(result).toBe(true);
  });

  it('handles JSON null directly', () => {
    const result = sanitizeAIResponse('null');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// sanitizeAndValidate
// ---------------------------------------------------------------------------

describe('sanitizeAndValidate', () => {
  const SimpleSchema = z.object({
    name: z.string(),
    count: z.number(),
  });

  it('returns success with valid data matching schema', () => {
    const raw = '{"name":"test","count":5}';
    const result = sanitizeAndValidate(raw, SimpleSchema);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: 'test', count: 5 });
    expect(result.error).toBeUndefined();
  });

  it('returns error when JSON is valid but schema validation fails', () => {
    const raw = '{"name":"test","count":"not-a-number"}';
    const result = sanitizeAndValidate(raw, SimpleSchema);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Schema validation failed/);
    expect(result.data).toBeUndefined();
  });

  it('returns error when JSON extraction fails', () => {
    const raw = 'no json here at all';
    const result = sanitizeAndValidate(raw, SimpleSchema);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/JSON extraction failed/);
  });

  it('never throws even with completely invalid input', () => {
    expect(() => sanitizeAndValidate('!!!', SimpleSchema)).not.toThrow();
  });

  it('never throws on empty string input', () => {
    expect(() => sanitizeAndValidate('', SimpleSchema)).not.toThrow();
  });

  it('works with an array schema', () => {
    const ArraySchema = z.array(z.string());
    const raw = '["a","b","c"]';
    const result = sanitizeAndValidate(raw, ArraySchema);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(['a', 'b', 'c']);
  });

  it('returns error with array schema when value is an object', () => {
    const ArraySchema = z.array(z.string());
    const raw = '{"key":"value"}';
    const result = sanitizeAndValidate(raw, ArraySchema);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Schema validation failed/);
  });
});
