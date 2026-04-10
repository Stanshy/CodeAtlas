/**
 * AI Utils unit tests
 *
 * Tests for buildPrompt() and truncateCode() shared utilities.
 */

import { describe, it, expect } from 'vitest';
import { buildPrompt, truncateCode, AI_TIMEOUT_MS } from '../src/ai/utils.js';
import type { SummaryContext } from '../src/types.js';

const context: SummaryContext = {
  filePath: 'src/index.ts',
  language: 'typescript',
  imports: ['react', 'lodash'],
  exports: ['App'],
};

describe('truncateCode', () => {
  it('returns code as-is when within limit', () => {
    const code = 'const x = 1;\nconst y = 2;';
    expect(truncateCode(code, 10)).toBe(code);
  });

  it('truncates code exceeding limit', () => {
    const lines = Array.from({ length: 250 }, (_, i) => `line ${i + 1}`);
    const code = lines.join('\n');
    const result = truncateCode(code, 200);
    expect(result).toContain('line 200');
    expect(result).not.toContain('line 201');
    expect(result).toContain('50 more lines truncated');
  });

  it('returns empty string for empty input', () => {
    expect(truncateCode('')).toBe('');
  });

  it('returns empty string for null-like input', () => {
    expect(truncateCode(undefined as unknown as string)).toBe('');
  });
});

describe('buildPrompt', () => {
  it('returns system and user messages', () => {
    const { system, user } = buildPrompt('const x = 1;', context);
    expect(typeof system).toBe('string');
    expect(system.length).toBeGreaterThan(0);
    expect(typeof user).toBe('string');
    expect(user).toContain('src/index.ts');
    expect(user).toContain('typescript');
  });

  it('includes imports and exports in user prompt', () => {
    const { user } = buildPrompt('const x = 1;', context);
    expect(user).toContain('react, lodash');
    expect(user).toContain('App');
  });

  it('handles empty imports/exports', () => {
    const emptyContext: SummaryContext = {
      filePath: 'test.js',
      language: 'javascript',
      imports: [],
      exports: [],
    };
    const { user } = buildPrompt('var x;', emptyContext);
    expect(user).toContain('none');
  });

  it('includes source code in user prompt', () => {
    const { user } = buildPrompt('export default App;', context);
    expect(user).toContain('export default App;');
  });
});

describe('AI_TIMEOUT_MS', () => {
  it('is 120 seconds', () => {
    expect(AI_TIMEOUT_MS).toBe(120_000);
  });
});
