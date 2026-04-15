/**
 * Unit tests for AI Endpoint Detection — Sprint 24
 *
 * Coverage targets:
 *   - AIEndpointDetectionSchema: valid parse, invalid method rejection, optional fields
 *   - buildEndpointDetectionPrompt: includes all source files, produces non-empty string
 */

import { describe, it, expect } from 'vitest';
import {
  AIEndpointDetectionSchema,
  validateAIEndpointDetection,
  safeValidateAIEndpointDetection,
} from '../src/ai/contracts.js';
import { buildEndpointDetectionPrompt } from '../src/ai/prompt-templates.js';

// ---------------------------------------------------------------------------
// AIEndpointDetectionSchema
// ---------------------------------------------------------------------------

describe('AIEndpointDetectionSchema', () => {
  const validInput = {
    endpoints: [
      {
        method: 'GET' as const,
        path: '/api/users',
        handler: 'listUsers',
        filePath: 'src/routes/users.ts',
        line: 15,
        framework: 'Express',
        confidence: 0.95,
      },
      {
        method: 'POST' as const,
        path: '/api/users',
        handler: 'createUser',
        filePath: 'src/routes/users.ts',
        line: 30,
        framework: 'Express',
        confidence: 0.9,
      },
    ],
    framework: 'Express',
    language: 'TypeScript',
  };

  it('validates a correct endpoint detection response', () => {
    const result = AIEndpointDetectionSchema.parse(validInput);
    expect(result.endpoints).toHaveLength(2);
    expect(result.endpoints[0]!.method).toBe('GET');
    expect(result.endpoints[0]!.path).toBe('/api/users');
    expect(result.endpoints[0]!.handler).toBe('listUsers');
    expect(result.endpoints[0]!.filePath).toBe('src/routes/users.ts');
    expect(result.endpoints[0]!.line).toBe(15);
    expect(result.endpoints[0]!.framework).toBe('Express');
    expect(result.endpoints[0]!.confidence).toBe(0.95);
    expect(result.framework).toBe('Express');
    expect(result.language).toBe('TypeScript');
  });

  it('rejects invalid HTTP methods', () => {
    const invalid = {
      endpoints: [
        {
          method: 'INVALID',
          path: '/api/users',
          handler: 'listUsers',
          filePath: 'src/routes/users.ts',
          confidence: 0.9,
        },
      ],
    };
    const result = AIEndpointDetectionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('handles optional fields correctly', () => {
    const minimal = {
      endpoints: [
        {
          method: 'DELETE' as const,
          path: '/api/users/:id',
          handler: 'deleteUser',
          filePath: 'src/routes/users.ts',
          confidence: 0.8,
          // line, framework omitted
        },
      ],
      // framework, language omitted
    };
    const result = AIEndpointDetectionSchema.parse(minimal);
    expect(result.endpoints).toHaveLength(1);
    expect(result.endpoints[0]!.line).toBeUndefined();
    expect(result.endpoints[0]!.framework).toBeUndefined();
    expect(result.framework).toBeUndefined();
    expect(result.language).toBeUndefined();
  });

  it('accepts all valid HTTP methods', () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
    for (const method of methods) {
      const input = {
        endpoints: [
          { method, path: '/test', handler: 'h', filePath: 'f.ts', confidence: 0.5 },
        ],
      };
      const result = AIEndpointDetectionSchema.safeParse(input);
      expect(result.success).toBe(true);
    }
  });

  it('rejects confidence greater than 1', () => {
    const invalid = {
      endpoints: [
        {
          method: 'GET' as const,
          path: '/api/test',
          handler: 'test',
          filePath: 'test.ts',
          confidence: 1.5,
        },
      ],
    };
    const result = AIEndpointDetectionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects confidence less than 0', () => {
    const invalid = {
      endpoints: [
        {
          method: 'GET' as const,
          path: '/api/test',
          handler: 'test',
          filePath: 'test.ts',
          confidence: -0.1,
        },
      ],
    };
    const result = AIEndpointDetectionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('accepts an empty endpoints array', () => {
    const result = AIEndpointDetectionSchema.parse({ endpoints: [] });
    expect(result.endpoints).toHaveLength(0);
  });

  it('rejects input missing required endpoints field', () => {
    const result = AIEndpointDetectionSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Strict / Safe validators
// ---------------------------------------------------------------------------

describe('validateAIEndpointDetection', () => {
  it('returns parsed result for valid input', () => {
    const valid = {
      endpoints: [
        { method: 'PUT', path: '/api/items/:id', handler: 'updateItem', filePath: 'items.ts', confidence: 0.85 },
      ],
      framework: 'Fastify',
    };
    const result = validateAIEndpointDetection(valid);
    expect(result.endpoints[0]!.method).toBe('PUT');
  });

  it('throws for invalid input', () => {
    expect(() => validateAIEndpointDetection({ endpoints: 'bad' })).toThrow();
  });
});

describe('safeValidateAIEndpointDetection', () => {
  it('returns success:true for valid input', () => {
    const valid = {
      endpoints: [
        { method: 'PATCH', path: '/api/users/:id', handler: 'patchUser', filePath: 'u.ts', confidence: 0.7 },
      ],
    };
    const result = safeValidateAIEndpointDetection(valid);
    expect(result.success).toBe(true);
  });

  it('returns success:false for invalid input', () => {
    const result = safeValidateAIEndpointDetection({ endpoints: null });
    expect(result.success).toBe(false);
  });

  it('does not throw for null input', () => {
    expect(() => safeValidateAIEndpointDetection(null)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// buildEndpointDetectionPrompt
// ---------------------------------------------------------------------------

describe('buildEndpointDetectionPrompt', () => {
  const sourceFiles = [
    { path: 'src/routes/users.ts', content: 'app.get("/api/users", listUsers);' },
    { path: 'src/routes/items.ts', content: 'app.post("/api/items", createItem);' },
  ];

  it('includes all source files in the output', () => {
    const prompt = buildEndpointDetectionPrompt(sourceFiles);
    expect(prompt).toContain('src/routes/users.ts');
    expect(prompt).toContain('src/routes/items.ts');
    expect(prompt).toContain('app.get("/api/users", listUsers);');
    expect(prompt).toContain('app.post("/api/items", createItem);');
  });

  it('produces a non-empty string', () => {
    const prompt = buildEndpointDetectionPrompt(sourceFiles);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('includes instruction keywords for AI guidance', () => {
    const prompt = buildEndpointDetectionPrompt(sourceFiles);
    expect(prompt).toContain('API endpoints');
    expect(prompt).toContain('HTTP method');
    expect(prompt).toContain('confidence');
    expect(prompt).toContain('framework');
  });

  it('handles an empty source files array', () => {
    const prompt = buildEndpointDetectionPrompt([]);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('wraps file content in code blocks', () => {
    const prompt = buildEndpointDetectionPrompt([
      { path: 'test.py', content: '@app.route("/hello")' },
    ]);
    expect(prompt).toContain('### File: test.py');
    expect(prompt).toContain('```');
    expect(prompt).toContain('@app.route("/hello")');
  });
});
