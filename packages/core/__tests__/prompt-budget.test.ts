/**
 * Unit tests for ai/prompt-budget.ts (Sprint 14 / T10)
 *
 * Coverage targets:
 *   - estimateTokens: character-to-token ratio heuristic
 *   - truncateToTokens: short text passthrough, long text truncation with suffix
 *   - BUDGET_LIMITS: small / medium / large tiers exist with positive values
 *   - buildMethodSignature: name, params, return type, async prefix, filePath
 *   - buildMethodBatchContext: budget enforcement, signatures always included
 *   - buildChainContext: header format, step format, budget enforcement
 */

import { describe, it, expect } from 'vitest';
import {
  estimateTokens,
  truncateToTokens,
  buildMethodSignature,
  buildMethodBatchContext,
  buildChainContext,
  BUDGET_LIMITS,
} from '../src/ai/prompt-budget.js';
import type { MethodContext, ChainContext } from '../src/ai/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMethod(overrides: Partial<MethodContext> = {}): MethodContext {
  return {
    nodeId: 'src/services/user.ts#createUser',
    name: 'createUser',
    filePath: 'src/services/user.ts',
    ...overrides,
  };
}

function makeChain(overrides: Partial<ChainContext> = {}): ChainContext {
  return {
    endpointId: 'GET:/api/users',
    method: 'GET',
    path: '/api/users',
    steps: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// estimateTokens
// ---------------------------------------------------------------------------

describe('estimateTokens', () => {
  it('returns 100 tokens for 400 characters', () => {
    const text = 'a'.repeat(400);
    expect(estimateTokens(text)).toBe(100);
  });

  it('returns 1 for a 4-character string (ceil(4/4))', () => {
    expect(estimateTokens('abcd')).toBe(1);
  });

  it('returns 0 for an empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('rounds up (ceil) for non-divisible lengths', () => {
    // 5 chars / 4 = 1.25 → ceil → 2
    expect(estimateTokens('abcde')).toBe(2);
  });

  it('returns a positive integer for any non-empty string', () => {
    expect(estimateTokens('hello world')).toBeGreaterThan(0);
    expect(Number.isInteger(estimateTokens('hello world'))).toBe(true);
  });

  it('scales linearly with text length', () => {
    const short = estimateTokens('a'.repeat(100));
    const long = estimateTokens('a'.repeat(200));
    expect(long).toBe(short * 2);
  });
});

// ---------------------------------------------------------------------------
// truncateToTokens
// ---------------------------------------------------------------------------

describe('truncateToTokens', () => {
  it('returns the original text when it fits within maxTokens', () => {
    const text = 'Short text';
    const result = truncateToTokens(text, 100);
    expect(result).toBe(text);
  });

  it('does not truncate text of exactly the token limit', () => {
    // 100 tokens = 400 chars; create text of exactly 400 chars
    const text = 'a'.repeat(400);
    const result = truncateToTokens(text, 100);
    expect(result).toBe(text);
  });

  it('truncates long text and appends "...[truncated]" suffix', () => {
    // maxTokens = 10 → maxChars = 40; text is 200 chars → should truncate
    const text = 'a'.repeat(200);
    const result = truncateToTokens(text, 10);
    expect(result.endsWith('...[truncated]')).toBe(true);
  });

  it('truncated result fits within the token limit', () => {
    const text = 'x'.repeat(1000);
    const maxTokens = 20;
    const result = truncateToTokens(text, maxTokens);
    expect(estimateTokens(result)).toBeLessThanOrEqual(maxTokens);
  });

  it('does not add the truncated suffix for short text', () => {
    const text = 'Just a short string';
    const result = truncateToTokens(text, 50);
    expect(result).not.toContain('...[truncated]');
  });

  it('handles an empty string without error', () => {
    expect(truncateToTokens('', 10)).toBe('');
  });

  it('handles maxTokens of 1 without crashing', () => {
    const text = 'x'.repeat(100);
    const result = truncateToTokens(text, 1);
    // Should not throw and result should end with truncated suffix or be empty/short
    expect(typeof result).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// BUDGET_LIMITS
// ---------------------------------------------------------------------------

describe('BUDGET_LIMITS', () => {
  it('has a "small" tier', () => {
    expect(BUDGET_LIMITS).toHaveProperty('small');
  });

  it('has a "medium" tier', () => {
    expect(BUDGET_LIMITS).toHaveProperty('medium');
  });

  it('has a "large" tier', () => {
    expect(BUDGET_LIMITS).toHaveProperty('large');
  });

  it('small tier is a positive integer', () => {
    expect(BUDGET_LIMITS.small).toBeGreaterThan(0);
    expect(Number.isInteger(BUDGET_LIMITS.small)).toBe(true);
  });

  it('medium tier is greater than small tier', () => {
    expect(BUDGET_LIMITS.medium).toBeGreaterThan(BUDGET_LIMITS.small);
  });

  it('large tier is greater than medium tier', () => {
    expect(BUDGET_LIMITS.large).toBeGreaterThan(BUDGET_LIMITS.medium);
  });
});

// ---------------------------------------------------------------------------
// buildMethodSignature
// ---------------------------------------------------------------------------

describe('buildMethodSignature', () => {
  it('includes the function name', () => {
    const sig = buildMethodSignature(makeMethod({ name: 'createUser' }));
    expect(sig).toContain('createUser');
  });

  it('includes the file path as a comment', () => {
    const sig = buildMethodSignature(makeMethod({ filePath: 'src/services/user.ts' }));
    expect(sig).toContain('src/services/user.ts');
  });

  it('prefixes with "async" when isAsync is true', () => {
    const sig = buildMethodSignature(makeMethod({ name: 'fetchData', isAsync: true }));
    expect(sig).toMatch(/^async /);
  });

  it('does not prefix with "async" when isAsync is false', () => {
    const sig = buildMethodSignature(makeMethod({ name: 'formatDate', isAsync: false }));
    expect(sig).not.toMatch(/^async /);
  });

  it('does not prefix with "async" when isAsync is undefined', () => {
    const sig = buildMethodSignature(makeMethod({ name: 'helper', isAsync: undefined }));
    expect(sig).not.toMatch(/^async /);
  });

  it('includes parameter names when provided', () => {
    const sig = buildMethodSignature(makeMethod({
      name: 'createUser',
      parameters: [{ name: 'email' }, { name: 'password' }],
    }));
    expect(sig).toContain('email');
    expect(sig).toContain('password');
  });

  it('includes parameter types when provided', () => {
    const sig = buildMethodSignature(makeMethod({
      name: 'createUser',
      parameters: [{ name: 'email', type: 'string' }, { name: 'age', type: 'number' }],
    }));
    expect(sig).toContain('email: string');
    expect(sig).toContain('age: number');
  });

  it('includes return type when provided', () => {
    const sig = buildMethodSignature(makeMethod({
      name: 'getCount',
      returnType: 'Promise<number>',
    }));
    expect(sig).toContain('Promise<number>');
  });

  it('omits return type suffix when returnType is undefined', () => {
    const sig = buildMethodSignature(makeMethod({ name: 'doSomething', returnType: undefined }));
    // Should not contain a colon before the comment separator
    expect(sig).not.toMatch(/:\s+\/\//);
  });

  it('produces an empty params section when no parameters provided', () => {
    const sig = buildMethodSignature(makeMethod({ name: 'noParams', parameters: [] }));
    expect(sig).toContain('noParams()');
  });

  it('produces a full signature with all fields', () => {
    const sig = buildMethodSignature(makeMethod({
      name: 'processPayment',
      filePath: 'src/services/payment.ts',
      isAsync: true,
      parameters: [{ name: 'amount', type: 'number' }, { name: 'currency', type: 'string' }],
      returnType: 'Promise<void>',
    }));
    expect(sig).toContain('async processPayment');
    expect(sig).toContain('amount: number');
    expect(sig).toContain('currency: string');
    expect(sig).toContain('Promise<void>');
    expect(sig).toContain('src/services/payment.ts');
  });
});

// ---------------------------------------------------------------------------
// buildMethodBatchContext
// ---------------------------------------------------------------------------

describe('buildMethodBatchContext', () => {
  it('returns a non-empty string for a single method', () => {
    const result = buildMethodBatchContext([makeMethod()], 'small');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes the method name in the output', () => {
    const result = buildMethodBatchContext([makeMethod({ name: 'createUser' })], 'small');
    expect(result).toContain('createUser');
  });

  it('includes the nodeId in bracket notation', () => {
    const result = buildMethodBatchContext(
      [makeMethod({ nodeId: 'src/services/user.ts#createUser' })],
      'small',
    );
    expect(result).toContain('[src/services/user.ts#createUser]');
  });

  it('numbers methods starting from 1', () => {
    const methods = [
      makeMethod({ name: 'methodA', nodeId: 'a#methodA' }),
      makeMethod({ name: 'methodB', nodeId: 'b#methodB' }),
    ];
    const result = buildMethodBatchContext(methods, 'small');
    expect(result).toContain('1.');
    expect(result).toContain('2.');
  });

  it('output fits within the small budget token limit', () => {
    // Create many methods to stress test budget enforcement
    const methods = Array.from({ length: 5 }, (_, i) =>
      makeMethod({ name: `method${i}`, nodeId: `src/file${i}.ts#method${i}`, filePath: `src/file${i}.ts` }),
    );
    const result = buildMethodBatchContext(methods, 'small');
    expect(estimateTokens(result)).toBeLessThanOrEqual(BUDGET_LIMITS.small);
  });

  it('returns just signatures block when no codeSnippets provided', () => {
    const methods = [
      makeMethod({ name: 'alpha', nodeId: 'a#alpha', codeSnippet: undefined }),
      makeMethod({ name: 'beta', nodeId: 'b#beta', codeSnippet: undefined }),
    ];
    const result = buildMethodBatchContext(methods, 'medium');
    expect(result).toContain('alpha');
    expect(result).toContain('beta');
    // No "Code Snippets:" section
    expect(result).not.toContain('Code Snippets:');
  });

  it('includes code snippets section when codeSnippets are provided', () => {
    const methods = [
      makeMethod({
        name: 'doQuery',
        nodeId: 'src/db/query.ts#doQuery',
        codeSnippet: 'return db.select("*").from("users");',
      }),
    ];
    const result = buildMethodBatchContext(methods, 'medium');
    expect(result).toContain('Code Snippets:');
  });

  it('handles an empty methods array without error', () => {
    const result = buildMethodBatchContext([], 'small');
    expect(typeof result).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// buildChainContext
// ---------------------------------------------------------------------------

describe('buildChainContext', () => {
  it('includes the HTTP method in the output', () => {
    const chain = makeChain({ method: 'POST', path: '/api/orders' });
    const result = buildChainContext(chain, 'small');
    expect(result).toContain('POST');
  });

  it('includes the API path in the output', () => {
    const chain = makeChain({ method: 'GET', path: '/api/users' });
    const result = buildChainContext(chain, 'small');
    expect(result).toContain('/api/users');
  });

  it('formats header as "[METHOD] /path"', () => {
    const chain = makeChain({ method: 'GET', path: '/api/health' });
    const result = buildChainContext(chain, 'small');
    expect(result).toMatch(/\[GET\] \/api\/health/);
  });

  it('includes step method names', () => {
    const chain = makeChain({
      method: 'GET',
      path: '/api/users',
      steps: [
        { name: 'listUsers', fileId: 'routes/users.ts' },
        { name: 'getUsers', fileId: 'services/user-service.ts' },
      ],
    });
    const result = buildChainContext(chain, 'small');
    expect(result).toContain('listUsers');
    expect(result).toContain('getUsers');
  });

  it('includes step fileId', () => {
    const chain = makeChain({
      method: 'GET',
      path: '/api/users',
      steps: [
        { name: 'listUsers', fileId: 'routes/users.ts' },
      ],
    });
    const result = buildChainContext(chain, 'small');
    expect(result).toContain('routes/users.ts');
  });

  it('includes class name when step has className', () => {
    const chain = makeChain({
      method: 'GET',
      path: '/api/users',
      steps: [
        { name: 'listUsers', className: 'UserController', fileId: 'controllers/user.ts' },
      ],
    });
    const result = buildChainContext(chain, 'small');
    expect(result).toContain('UserController');
  });

  it('includes role when step has a role', () => {
    const chain = makeChain({
      method: 'GET',
      path: '/api/users',
      steps: [
        { name: 'listUsers', fileId: 'routes/users.ts', role: 'entrypoint' },
      ],
    });
    const result = buildChainContext(chain, 'small');
    expect(result).toContain('[entrypoint]');
  });

  it('numbers steps starting from 1', () => {
    const chain = makeChain({
      method: 'GET',
      path: '/api/data',
      steps: [
        { name: 'stepOne', fileId: 'a.ts' },
        { name: 'stepTwo', fileId: 'b.ts' },
        { name: 'stepThree', fileId: 'c.ts' },
      ],
    });
    const result = buildChainContext(chain, 'medium');
    expect(result).toContain('Step 1:');
    expect(result).toContain('Step 2:');
    expect(result).toContain('Step 3:');
  });

  it('returns non-empty string for a chain with no steps', () => {
    const chain = makeChain({ method: 'DELETE', path: '/api/resource', steps: [] });
    const result = buildChainContext(chain, 'small');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('output fits within the specified budget', () => {
    // Build a chain with many steps and verify it stays within medium budget
    const steps = Array.from({ length: 20 }, (_, i) => ({
      name: `step${i}`,
      fileId: `src/service${i}.ts`,
      role: 'utility' as const,
    }));
    const chain = makeChain({ method: 'POST', path: '/api/complex-chain', steps });
    const result = buildChainContext(chain, 'medium');
    expect(estimateTokens(result)).toBeLessThanOrEqual(BUDGET_LIMITS.medium);
  });
});
