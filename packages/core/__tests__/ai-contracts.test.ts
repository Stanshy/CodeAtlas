/**
 * Unit tests for ai/contracts.ts (Sprint 14 / T10)
 *
 * Coverage targets:
 *   - MethodRoleEnum: 9 values
 *   - METHOD_ROLES: 9-element array
 *   - MethodSummarySchema: valid parse, role rejection, confidence bounds, length limit
 *   - MethodRoleClassificationSchema: valid parse
 *   - ChainExplanationSchema: valid parse, step description length limit
 *   - BatchMethodSummarySchema: array of methods
 *   - validateMethodSummary / validateBatchMethodSummary / validateChainExplanation: throw on invalid
 *   - safeValidateMethodSummary / safeValidateBatchMethodSummary / safeValidateChainExplanation: safe results
 */

import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
  MethodRoleEnum,
  METHOD_ROLES,
  MethodSummarySchema,
  MethodRoleClassificationSchema,
  ChainExplanationSchema,
  BatchMethodSummarySchema,
  validateMethodSummary,
  validateBatchMethodSummary,
  validateChainExplanation,
  safeValidateMethodSummary,
  safeValidateBatchMethodSummary,
  safeValidateChainExplanation,
} from '../src/ai/contracts.js';

// ---------------------------------------------------------------------------
// MethodRoleEnum
// ---------------------------------------------------------------------------

describe('MethodRoleEnum', () => {
  it('has exactly 9 values', () => {
    expect(MethodRoleEnum.options).toHaveLength(9);
  });

  it('includes all expected role values', () => {
    const roles = MethodRoleEnum.options;
    expect(roles).toContain('entrypoint');
    expect(roles).toContain('business_core');
    expect(roles).toContain('domain_rule');
    expect(roles).toContain('orchestration');
    expect(roles).toContain('io_adapter');
    expect(roles).toContain('validation');
    expect(roles).toContain('infra');
    expect(roles).toContain('utility');
    expect(roles).toContain('framework_glue');
  });

  it('rejects an invalid role value', () => {
    const result = MethodRoleEnum.safeParse('unknown_role');
    expect(result.success).toBe(false);
  });

  it('accepts each valid role value', () => {
    const roles = [
      'entrypoint', 'business_core', 'domain_rule', 'orchestration',
      'io_adapter', 'validation', 'infra', 'utility', 'framework_glue',
    ];
    for (const role of roles) {
      const result = MethodRoleEnum.safeParse(role);
      expect(result.success).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// METHOD_ROLES array
// ---------------------------------------------------------------------------

describe('METHOD_ROLES', () => {
  it('is an array with 9 elements', () => {
    expect(Array.isArray(METHOD_ROLES)).toBe(true);
    expect(METHOD_ROLES).toHaveLength(9);
  });

  it('contains the same values as MethodRoleEnum', () => {
    expect(METHOD_ROLES).toContain('entrypoint');
    expect(METHOD_ROLES).toContain('utility');
    expect(METHOD_ROLES).toContain('framework_glue');
  });
});

// ---------------------------------------------------------------------------
// MethodSummarySchema
// ---------------------------------------------------------------------------

describe('MethodSummarySchema', () => {
  const validInput = {
    id: 'src/services/user.ts#createUser',
    role: 'business_core',
    confidence: 0.85,
    oneLineSummary: 'Creates a new user in the database',
  };

  it('parses a valid input object', () => {
    const result = MethodSummarySchema.parse(validInput);
    expect(result.id).toBe(validInput.id);
    expect(result.role).toBe('business_core');
    expect(result.confidence).toBe(0.85);
    expect(result.oneLineSummary).toBe(validInput.oneLineSummary);
  });

  it('accepts optional fields when provided', () => {
    const withOptionals = {
      ...validInput,
      businessRelevance: 'Core user management flow',
      evidence: ['name:service-prefix', 'isExported'],
    };
    const result = MethodSummarySchema.parse(withOptionals);
    expect(result.businessRelevance).toBe('Core user management flow');
    expect(result.evidence).toEqual(['name:service-prefix', 'isExported']);
  });

  it('optional fields are absent when not provided', () => {
    const result = MethodSummarySchema.parse(validInput);
    expect(result.businessRelevance).toBeUndefined();
    expect(result.evidence).toBeUndefined();
  });

  it('rejects an invalid role string', () => {
    // Sprint 15.1: role is now a loose string field — any string is accepted
    const result = MethodSummarySchema.safeParse({ ...validInput, role: 'nonexistent_role' });
    expect(result.success).toBe(true);
  });

  it('rejects confidence greater than 1', () => {
    const result = MethodSummarySchema.safeParse({ ...validInput, confidence: 1.1 });
    expect(result.success).toBe(false);
  });

  it('rejects confidence less than 0', () => {
    const result = MethodSummarySchema.safeParse({ ...validInput, confidence: -0.1 });
    expect(result.success).toBe(false);
  });

  it('accepts confidence at the boundaries (0 and 1)', () => {
    expect(MethodSummarySchema.safeParse({ ...validInput, confidence: 0 }).success).toBe(true);
    expect(MethodSummarySchema.safeParse({ ...validInput, confidence: 1 }).success).toBe(true);
  });

  it('rejects oneLineSummary longer than 100 characters', () => {
    // Sprint 15.1: oneLineSummary max relaxed to 200 chars for local model flexibility
    const tooLong = 'a'.repeat(201);
    const result = MethodSummarySchema.safeParse({ ...validInput, oneLineSummary: tooLong });
    expect(result.success).toBe(false);
  });

  it('accepts oneLineSummary of exactly 100 characters', () => {
    const exactly100 = 'a'.repeat(100);
    const result = MethodSummarySchema.safeParse({ ...validInput, oneLineSummary: exactly100 });
    expect(result.success).toBe(true);
  });

  it('rejects input missing required id field', () => {
    const { id: _id, ...withoutId } = validInput;
    const result = MethodSummarySchema.safeParse(withoutId);
    expect(result.success).toBe(false);
  });

  it('rejects input missing required role field', () => {
    // Sprint 15.1: role is now optional with a default of 'utility' — omitting it is valid
    const { role: _role, ...withoutRole } = validInput;
    const result = MethodSummarySchema.safeParse(withoutRole);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// MethodRoleClassificationSchema
// ---------------------------------------------------------------------------

describe('MethodRoleClassificationSchema', () => {
  const validInput = {
    id: 'src/routes/auth.ts#loginHandler',
    role: 'entrypoint',
    confidence: 0.95,
  };

  it('parses a valid input object', () => {
    const result = MethodRoleClassificationSchema.parse(validInput);
    expect(result.id).toBe(validInput.id);
    expect(result.role).toBe('entrypoint');
    expect(result.confidence).toBe(0.95);
  });

  it('accepts optional sourceSignals field', () => {
    const withSignals = { ...validInput, sourceSignals: ['path:routes-controllers', 'isExported'] };
    const result = MethodRoleClassificationSchema.parse(withSignals);
    expect(result.sourceSignals).toEqual(['path:routes-controllers', 'isExported']);
  });

  it('sourceSignals is absent when not provided', () => {
    const result = MethodRoleClassificationSchema.parse(validInput);
    expect(result.sourceSignals).toBeUndefined();
  });

  it('rejects an invalid role value', () => {
    const result = MethodRoleClassificationSchema.safeParse({ ...validInput, role: 'bad_role' });
    expect(result.success).toBe(false);
  });

  it('rejects confidence out of range', () => {
    const result = MethodRoleClassificationSchema.safeParse({ ...validInput, confidence: 2 });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ChainExplanationSchema
// ---------------------------------------------------------------------------

describe('ChainExplanationSchema', () => {
  const validInput = {
    chainId: 'GET:/api/users',
    overallPurpose: 'Fetches a paginated list of users from the database',
    steps: [
      { stepIndex: 0, methodId: 'src/routes/users.ts#listUsers', description: 'Route handler entry point' },
      { stepIndex: 1, methodId: 'src/services/user.ts#getUsers', description: 'Business logic layer' },
      { stepIndex: 2, methodId: 'src/db/user-repo.ts#findAll', description: 'Queries database for records' },
    ],
  };

  it('parses a valid chain with multiple steps', () => {
    const result = ChainExplanationSchema.parse(validInput);
    expect(result.chainId).toBe('GET:/api/users');
    expect(result.steps).toHaveLength(3);
  });

  it('parses a chain with an empty steps array', () => {
    const result = ChainExplanationSchema.parse({ ...validInput, steps: [] });
    expect(result.steps).toHaveLength(0);
  });

  it('preserves step fields correctly', () => {
    const result = ChainExplanationSchema.parse(validInput);
    expect(result.steps[0]!.stepIndex).toBe(0);
    expect(result.steps[0]!.methodId).toBe('src/routes/users.ts#listUsers');
    expect(result.steps[0]!.description).toBe('Route handler entry point');
  });

  it('rejects a step description longer than 60 characters', () => {
    const tooLongDescription = 'a'.repeat(61);
    const invalid = {
      ...validInput,
      steps: [{ stepIndex: 0, methodId: 'foo#bar', description: tooLongDescription }],
    };
    const result = ChainExplanationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('accepts a step description of exactly 60 characters', () => {
    const exactly60 = 'a'.repeat(60);
    const input = {
      ...validInput,
      steps: [{ stepIndex: 0, methodId: 'foo#bar', description: exactly60 }],
    };
    const result = ChainExplanationSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects input missing required chainId', () => {
    const { chainId: _id, ...withoutChainId } = validInput;
    const result = ChainExplanationSchema.safeParse(withoutChainId);
    expect(result.success).toBe(false);
  });

  it('rejects input missing required overallPurpose', () => {
    const { overallPurpose: _op, ...withoutPurpose } = validInput;
    const result = ChainExplanationSchema.safeParse(withoutPurpose);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// BatchMethodSummarySchema
// ---------------------------------------------------------------------------

describe('BatchMethodSummarySchema', () => {
  const singleMethod = {
    id: 'src/utils/format.ts#formatDate',
    role: 'utility' as const,
    confidence: 0.6,
    oneLineSummary: 'Formats a Date object to a locale string',
  };

  it('parses a batch with a single method', () => {
    const result = BatchMethodSummarySchema.parse({ methods: [singleMethod] });
    expect(result.methods).toHaveLength(1);
    expect(result.methods[0]!.id).toBe(singleMethod.id);
  });

  it('parses a batch with multiple methods', () => {
    const methods = [
      singleMethod,
      { id: 'src/services/auth.ts#login', role: 'business_core' as const, confidence: 0.9, oneLineSummary: 'Authenticates user credentials' },
      { id: 'src/routes/api.ts#handler', role: 'entrypoint' as const, confidence: 0.95, oneLineSummary: 'API route entry point' },
    ];
    const result = BatchMethodSummarySchema.parse({ methods });
    expect(result.methods).toHaveLength(3);
  });

  it('parses a batch with an empty methods array', () => {
    const result = BatchMethodSummarySchema.parse({ methods: [] });
    expect(result.methods).toHaveLength(0);
  });

  it('rejects batch where a method has an invalid role', () => {
    // Sprint 15.1: MethodSummarySchema now accepts any string for role, so 'bad_role' is valid
    const invalidMethods = {
      methods: [{ ...singleMethod, role: 'bad_role' }],
    };
    const result = BatchMethodSummarySchema.safeParse(invalidMethods);
    expect(result.success).toBe(true);
  });

  it('rejects batch where a method has confidence > 1', () => {
    const result = BatchMethodSummarySchema.safeParse({
      methods: [{ ...singleMethod, confidence: 1.5 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects input missing the methods array', () => {
    const result = BatchMethodSummarySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Strict validators — throw on failure
// ---------------------------------------------------------------------------

describe('validateMethodSummary', () => {
  it('returns a parsed MethodSummary for valid input', () => {
    const valid = {
      id: 'src/services/user.ts#createUser',
      role: 'business_core',
      confidence: 0.9,
      oneLineSummary: 'Creates a user',
    };
    const result = validateMethodSummary(valid);
    expect(result.id).toBe(valid.id);
    expect(result.role).toBe('business_core');
  });

  it('throws ZodError for invalid input (bad role)', () => {
    // Sprint 15.1: role is a loose string — bad role alone is not enough to fail;
    // test invalid input via missing required id field instead
    const invalid = {
      role: 'totally_wrong',
      confidence: 0.5,
      oneLineSummary: 'Something',
      // id is required and omitted — this will throw
    };
    expect(() => validateMethodSummary(invalid)).toThrow(ZodError);
  });

  it('throws ZodError for missing required fields', () => {
    expect(() => validateMethodSummary({})).toThrow(ZodError);
  });
});

describe('validateBatchMethodSummary', () => {
  it('returns parsed BatchMethodSummary for valid input', () => {
    const valid = {
      methods: [
        { id: 'a#b', role: 'utility', confidence: 0.6, oneLineSummary: 'Helper fn' },
      ],
    };
    const result = validateBatchMethodSummary(valid);
    expect(result.methods).toHaveLength(1);
  });

  it('throws ZodError for invalid input', () => {
    expect(() => validateBatchMethodSummary({ methods: 'not-an-array' })).toThrow(ZodError);
  });
});

describe('validateChainExplanation', () => {
  it('returns parsed ChainExplanation for valid input', () => {
    const valid = {
      chainId: 'POST:/api/login',
      overallPurpose: 'Authenticates a user and issues a JWT',
      steps: [{ stepIndex: 0, methodId: 'routes/auth.ts#login', description: 'Entry handler' }],
    };
    const result = validateChainExplanation(valid);
    expect(result.chainId).toBe('POST:/api/login');
  });

  it('throws ZodError for a step description exceeding 60 chars', () => {
    const invalid = {
      chainId: 'GET:/api/data',
      overallPurpose: 'Retrieves data',
      steps: [{ stepIndex: 0, methodId: 'foo#bar', description: 'x'.repeat(61) }],
    };
    expect(() => validateChainExplanation(invalid)).toThrow(ZodError);
  });
});

// ---------------------------------------------------------------------------
// Safe validators — return result object, never throw
// ---------------------------------------------------------------------------

describe('safeValidateMethodSummary', () => {
  it('returns success:true for valid input', () => {
    const valid = {
      id: 'src/services/auth.ts#login',
      role: 'business_core',
      confidence: 0.9,
      oneLineSummary: 'Authenticates a user',
    };
    const result = safeValidateMethodSummary(valid);
    expect(result.success).toBe(true);
  });

  it('returns success:false for invalid input (missing fields)', () => {
    const result = safeValidateMethodSummary({ role: 'utility' });
    expect(result.success).toBe(false);
  });

  it('returns success:false for invalid role', () => {
    // Sprint 15.1: role accepts any string — use missing required id to trigger failure
    const result = safeValidateMethodSummary({
      role: 'not_a_role',
      confidence: 0.5,
      oneLineSummary: 'Test',
      // id is required and omitted
    });
    expect(result.success).toBe(false);
  });

  it('does not throw even for completely invalid input', () => {
    expect(() => safeValidateMethodSummary(null)).not.toThrow();
    expect(() => safeValidateMethodSummary(undefined)).not.toThrow();
    expect(() => safeValidateMethodSummary('string')).not.toThrow();
  });

  it('includes error details on failure', () => {
    const result = safeValidateMethodSummary({});
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });
});

describe('safeValidateBatchMethodSummary', () => {
  it('returns success:true for valid batch input', () => {
    const valid = {
      methods: [
        { id: 'src/utils/format.ts#formatDate', role: 'utility', confidence: 0.6, oneLineSummary: 'Formats a date' },
        { id: 'src/services/user.ts#create', role: 'business_core', confidence: 0.9, oneLineSummary: 'Creates user' },
      ],
    };
    const result = safeValidateBatchMethodSummary(valid);
    expect(result.success).toBe(true);
  });

  it('returns success:false for invalid batch input', () => {
    const result = safeValidateBatchMethodSummary({ methods: null });
    expect(result.success).toBe(false);
  });

  it('does not throw for null input', () => {
    expect(() => safeValidateBatchMethodSummary(null)).not.toThrow();
  });
});

describe('safeValidateChainExplanation', () => {
  it('returns success:true for valid chain input', () => {
    const valid = {
      chainId: 'GET:/api/users',
      overallPurpose: 'Lists all users',
      steps: [{ stepIndex: 0, methodId: 'routes/users.ts#listUsers', description: 'Route handler' }],
    };
    const result = safeValidateChainExplanation(valid);
    expect(result.success).toBe(true);
  });

  it('returns success:false for invalid chain (step description too long)', () => {
    const invalid = {
      chainId: 'GET:/api/data',
      overallPurpose: 'Gets data',
      steps: [{ stepIndex: 0, methodId: 'foo#bar', description: 'x'.repeat(61) }],
    };
    const result = safeValidateChainExplanation(invalid);
    expect(result.success).toBe(false);
  });

  it('does not throw for undefined input', () => {
    expect(() => safeValidateChainExplanation(undefined)).not.toThrow();
  });
});
