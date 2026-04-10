/**
 * Unit tests for ai/method-role-classifier.ts (Sprint 14 / T10)
 *
 * Coverage targets:
 *   - Rule 1  (entrypoint):    routes/controllers dir + isExported or req/res params
 *   - Rule 2  (io_adapter):    io-prefix name OR models/db dir
 *   - Rule 3  (validation):    validate/check/assert prefix name
 *   - Rule 4  (domain_rule):   calculate/compute prefix + boolean/number return type
 *   - Rule 5  (orchestration): callOutDegree >= 3 + isAsync + services dir
 *   - Rule 6  (business_core): isExported + services/features dir
 *   - Rule 7  (infra):         config/infra dir OR configure/register/setup name
 *   - Rule 8  (framework_glue): ORM/builder pattern in codeSnippet
 *   - Rule 9  (utility):       default fallback
 *   - Confidence: 1 signal → 0.6, 2 signals → 0.8, 3+ signals → 0.95
 *   - ID format: 'filePath#name'
 */

import { describe, it, expect } from 'vitest';
import { classifyMethodRole, type MethodClassificationInput } from '../src/ai/method-role-classifier.js';

// ---------------------------------------------------------------------------
// Helper — build a minimal input with sensible defaults
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<MethodClassificationInput>): MethodClassificationInput {
  return {
    name: 'myMethod',
    filePath: 'src/misc/helper.ts',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Rule 1 — entrypoint
// ---------------------------------------------------------------------------

describe('classifyMethodRole — Rule 1: entrypoint', () => {
  it('classifies as entrypoint when in routes/ dir and isExported', () => {
    const result = classifyMethodRole(makeInput({
      name: 'listUsers',
      filePath: 'src/routes/user-routes.ts',
      isExported: true,
    }));
    expect(result.role).toBe('entrypoint');
  });

  it('classifies as entrypoint when in controllers/ dir and isExported', () => {
    const result = classifyMethodRole(makeInput({
      name: 'createUser',
      filePath: 'src/controllers/user-controller.ts',
      isExported: true,
    }));
    expect(result.role).toBe('entrypoint');
  });

  it('classifies as entrypoint when in handlers/ dir with req parameter', () => {
    const result = classifyMethodRole(makeInput({
      name: 'handleRequest',
      filePath: 'src/handlers/auth-handler.ts',
      parameters: [{ name: 'req' }, { name: 'res' }],
    }));
    expect(result.role).toBe('entrypoint');
  });

  it('classifies as entrypoint when in api/ dir with ctx parameter', () => {
    const result = classifyMethodRole(makeInput({
      name: 'apiEndpoint',
      filePath: 'src/api/data-endpoint.ts',
      parameters: [{ name: 'ctx' }],
    }));
    expect(result.role).toBe('entrypoint');
  });

  it('does NOT classify as entrypoint in routes/ dir without isExported or req/res params', () => {
    // Only 1 signal (path), needs at least one qualifier signal
    const result = classifyMethodRole(makeInput({
      name: 'internalHelper',
      filePath: 'src/routes/helpers.ts',
      isExported: false,
    }));
    expect(result.role).not.toBe('entrypoint');
  });
});

// ---------------------------------------------------------------------------
// Rule 2 — io_adapter
// ---------------------------------------------------------------------------

describe('classifyMethodRole — Rule 2: io_adapter', () => {
  it('classifies as io_adapter when name starts with "fetch"', () => {
    const result = classifyMethodRole(makeInput({
      name: 'fetchUsers',
      filePath: 'src/services/user-service.ts',
    }));
    expect(result.role).toBe('io_adapter');
  });

  it('classifies as io_adapter when name starts with "db"', () => {
    const result = classifyMethodRole(makeInput({
      name: 'dbQuery',
      filePath: 'src/misc/helper.ts',
    }));
    expect(result.role).toBe('io_adapter');
  });

  it('classifies as io_adapter when name starts with "save"', () => {
    const result = classifyMethodRole(makeInput({
      name: 'saveRecord',
      filePath: 'src/misc/helper.ts',
    }));
    expect(result.role).toBe('io_adapter');
  });

  it('classifies as io_adapter when name starts with "find"', () => {
    const result = classifyMethodRole(makeInput({
      name: 'findById',
      filePath: 'src/misc/helper.ts',
    }));
    expect(result.role).toBe('io_adapter');
  });

  it('classifies as io_adapter when file is in models/ dir', () => {
    const result = classifyMethodRole(makeInput({
      name: 'getSchema',
      filePath: 'src/models/user-model.ts',
    }));
    expect(result.role).toBe('io_adapter');
  });

  it('classifies as io_adapter when file is in db/ dir', () => {
    const result = classifyMethodRole(makeInput({
      name: 'connect',
      filePath: 'src/db/connection.ts',
    }));
    expect(result.role).toBe('io_adapter');
  });

  it('classifies as io_adapter when file is in repositories/ dir', () => {
    const result = classifyMethodRole(makeInput({
      name: 'findAll',
      filePath: 'src/repositories/user-repository.ts',
    }));
    expect(result.role).toBe('io_adapter');
  });

  it('classifies as io_adapter for "get" prefix (common data access prefix)', () => {
    const result = classifyMethodRole(makeInput({
      name: 'getUser',
      filePath: 'src/misc/helper.ts',
    }));
    expect(result.role).toBe('io_adapter');
  });
});

// ---------------------------------------------------------------------------
// Rule 3 — validation
// ---------------------------------------------------------------------------

describe('classifyMethodRole — Rule 3: validation', () => {
  it('classifies as validation when name starts with "validate"', () => {
    const result = classifyMethodRole(makeInput({
      name: 'validateInput',
      filePath: 'src/misc/helper.ts',
    }));
    expect(result.role).toBe('validation');
  });

  it('classifies as validation when name starts with "check"', () => {
    const result = classifyMethodRole(makeInput({
      name: 'checkPermissions',
      filePath: 'src/misc/helper.ts',
    }));
    expect(result.role).toBe('validation');
  });

  it('classifies as validation when name starts with "assert"', () => {
    const result = classifyMethodRole(makeInput({
      name: 'assertNotNull',
      filePath: 'src/misc/helper.ts',
    }));
    expect(result.role).toBe('validation');
  });

  it('classifies as validation when name starts with "sanitize"', () => {
    const result = classifyMethodRole(makeInput({
      name: 'sanitizeEmail',
      filePath: 'src/misc/helper.ts',
    }));
    expect(result.role).toBe('validation');
  });

  it('classifies as validation when name starts with "verify"', () => {
    const result = classifyMethodRole(makeInput({
      name: 'verifyToken',
      filePath: 'src/misc/helper.ts',
    }));
    expect(result.role).toBe('validation');
  });

  it('classifies as validation when name is "isValid" prefix', () => {
    const result = classifyMethodRole(makeInput({
      name: 'isValidEmail',
      filePath: 'src/misc/helper.ts',
    }));
    expect(result.role).toBe('validation');
  });
});

// ---------------------------------------------------------------------------
// Rule 4 — domain_rule
// ---------------------------------------------------------------------------

describe('classifyMethodRole — Rule 4: domain_rule', () => {
  it('classifies as domain_rule for "calculateTotal" with return type "number"', () => {
    const result = classifyMethodRole(makeInput({
      name: 'calculateTotal',
      filePath: 'src/misc/helper.ts',
      returnType: 'number',
    }));
    expect(result.role).toBe('domain_rule');
  });

  it('classifies as domain_rule for "computeDiscount" with return type "boolean"', () => {
    const result = classifyMethodRole(makeInput({
      name: 'computeDiscount',
      filePath: 'src/misc/helper.ts',
      returnType: 'boolean',
    }));
    expect(result.role).toBe('domain_rule');
  });

  it('classifies as domain_rule for "determineEligibility" with return type "boolean"', () => {
    const result = classifyMethodRole(makeInput({
      name: 'determineEligibility',
      filePath: 'src/misc/helper.ts',
      returnType: 'boolean',
    }));
    expect(result.role).toBe('domain_rule');
  });

  it('classifies as domain_rule for "evaluate" prefix with return type "number"', () => {
    const result = classifyMethodRole(makeInput({
      name: 'evaluateScore',
      filePath: 'src/misc/helper.ts',
      returnType: 'number',
    }));
    expect(result.role).toBe('domain_rule');
  });

  it('does NOT classify as domain_rule when name matches but return type is string', () => {
    // Both signals are required for Rule 4 to fire — name + returnType
    const result = classifyMethodRole(makeInput({
      name: 'calculateLabel',
      filePath: 'src/misc/helper.ts',
      returnType: 'string',
    }));
    expect(result.role).not.toBe('domain_rule');
  });

  it('does NOT classify as domain_rule when return type matches but name does not', () => {
    const result = classifyMethodRole(makeInput({
      name: 'formatDate',
      filePath: 'src/misc/helper.ts',
      returnType: 'number',
    }));
    expect(result.role).not.toBe('domain_rule');
  });
});

// ---------------------------------------------------------------------------
// Rule 5 — orchestration
// ---------------------------------------------------------------------------

describe('classifyMethodRole — Rule 5: orchestration', () => {
  it('classifies as orchestration when async + callOutDegree >= 3 + in services/', () => {
    const result = classifyMethodRole(makeInput({
      name: 'processOrder',
      filePath: 'src/services/order-service.ts',
      isAsync: true,
      callOutDegree: 3,
    }));
    expect(result.role).toBe('orchestration');
  });

  it('classifies as orchestration with callOutDegree > 3', () => {
    const result = classifyMethodRole(makeInput({
      name: 'orchestrateFlow',
      filePath: 'src/services/flow-service.ts',
      isAsync: true,
      callOutDegree: 5,
    }));
    expect(result.role).toBe('orchestration');
  });

  it('does NOT classify as orchestration when not async', () => {
    // Missing isAsync signal — requires all 3 signals
    const result = classifyMethodRole(makeInput({
      name: 'processOrder',
      filePath: 'src/services/order-service.ts',
      isAsync: false,
      callOutDegree: 3,
    }));
    expect(result.role).not.toBe('orchestration');
  });

  it('does NOT classify as orchestration when callOutDegree < 3', () => {
    const result = classifyMethodRole(makeInput({
      name: 'processOrder',
      filePath: 'src/services/order-service.ts',
      isAsync: true,
      callOutDegree: 2,
    }));
    expect(result.role).not.toBe('orchestration');
  });

  it('does NOT classify as orchestration when not in services/ dir', () => {
    const result = classifyMethodRole(makeInput({
      name: 'processOrder',
      filePath: 'src/controllers/order-controller.ts',
      isAsync: true,
      callOutDegree: 3,
    }));
    expect(result.role).not.toBe('orchestration');
  });
});

// ---------------------------------------------------------------------------
// Rule 6 — business_core
// ---------------------------------------------------------------------------

describe('classifyMethodRole — Rule 6: business_core', () => {
  it('classifies as business_core when exported and in services/ dir', () => {
    const result = classifyMethodRole(makeInput({
      name: 'createInvoice',
      filePath: 'src/services/invoice-service.ts',
      isExported: true,
    }));
    expect(result.role).toBe('business_core');
  });

  it('classifies as business_core when exported and in features/ dir', () => {
    const result = classifyMethodRole(makeInput({
      name: 'applyPromoCode',
      filePath: 'src/features/promotions.ts',
      isExported: true,
    }));
    expect(result.role).toBe('business_core');
  });

  it('does NOT classify as business_core when not exported', () => {
    // isExported is false — only 1 signal fires, Rule 6 needs 2
    const result = classifyMethodRole(makeInput({
      name: 'internalHelper',
      filePath: 'src/services/invoice-service.ts',
      isExported: false,
    }));
    expect(result.role).not.toBe('business_core');
  });

  it('does NOT classify as business_core when not in services/features dirs', () => {
    const result = classifyMethodRole(makeInput({
      name: 'doWork',
      filePath: 'src/misc/helper.ts',
      isExported: true,
    }));
    expect(result.role).not.toBe('business_core');
  });
});

// ---------------------------------------------------------------------------
// Rule 7 — infra
// ---------------------------------------------------------------------------

describe('classifyMethodRole — Rule 7: infra', () => {
  it('classifies as infra when file is in config/ dir', () => {
    // Use a name that does not match io_adapter (Rule 2) or validation (Rule 3) prefixes
    const result = classifyMethodRole(makeInput({
      name: 'readAppSettings',
      filePath: 'src/config/app-config.ts',
    }));
    expect(result.role).toBe('infra');
  });

  it('classifies as infra when file is in infra/ dir', () => {
    // Use a name that does not match earlier rules to ensure infra rule fires via path signal
    const result = classifyMethodRole(makeInput({
      name: 'applyMiddleware',
      filePath: 'src/infra/server-setup.ts',
    }));
    expect(result.role).toBe('infra');
  });

  it('classifies as infra when name starts with "register"', () => {
    const result = classifyMethodRole(makeInput({
      name: 'registerPlugin',
      filePath: 'src/misc/helper.ts',
    }));
    expect(result.role).toBe('infra');
  });

  it('classifies as infra when name starts with "configure"', () => {
    const result = classifyMethodRole(makeInput({
      name: 'configureDatabasePool',
      filePath: 'src/misc/helper.ts',
    }));
    expect(result.role).toBe('infra');
  });

  it('classifies as infra when name starts with "setup"', () => {
    const result = classifyMethodRole(makeInput({
      name: 'setupRoutes',
      filePath: 'src/misc/helper.ts',
    }));
    expect(result.role).toBe('infra');
  });

  it('classifies as infra when name starts with "init"', () => {
    const result = classifyMethodRole(makeInput({
      name: 'initApp',
      filePath: 'src/misc/helper.ts',
    }));
    expect(result.role).toBe('infra');
  });

  it('classifies as infra when name starts with "bootstrap"', () => {
    const result = classifyMethodRole(makeInput({
      name: 'bootstrapServer',
      filePath: 'src/misc/helper.ts',
    }));
    expect(result.role).toBe('infra');
  });
});

// ---------------------------------------------------------------------------
// Rule 8 — framework_glue
// ---------------------------------------------------------------------------

describe('classifyMethodRole — Rule 8: framework_glue', () => {
  it('classifies as framework_glue when codeSnippet contains .select(', () => {
    const result = classifyMethodRole(makeInput({
      name: 'buildQuery',
      filePath: 'src/misc/helper.ts',
      codeSnippet: 'return db.select("*").from("users");',
    }));
    expect(result.role).toBe('framework_glue');
  });

  it('classifies as framework_glue when codeSnippet contains .where(', () => {
    const result = classifyMethodRole(makeInput({
      name: 'filterUsers',
      filePath: 'src/misc/helper.ts',
      codeSnippet: 'return qb.where("id = :id", { id }).getOne();',
    }));
    expect(result.role).toBe('framework_glue');
  });

  it('classifies as framework_glue when codeSnippet contains .join(', () => {
    const result = classifyMethodRole(makeInput({
      name: 'joinTables',
      filePath: 'src/misc/helper.ts',
      codeSnippet: 'return qb.join("orders", "o", "o.userId = u.id").getMany();',
    }));
    expect(result.role).toBe('framework_glue');
  });

  it('classifies as framework_glue when codeSnippet contains .createQueryBuilder(', () => {
    const result = classifyMethodRole(makeInput({
      name: 'buildUserQuery',
      filePath: 'src/misc/helper.ts',
      codeSnippet: 'const qb = repo.createQueryBuilder("user");',
    }));
    expect(result.role).toBe('framework_glue');
  });

  it('classifies as framework_glue when codeSnippet contains builder terminal .execute(', () => {
    const result = classifyMethodRole(makeInput({
      name: 'runMigration',
      filePath: 'src/misc/helper.ts',
      codeSnippet: 'await migration.execute();',
    }));
    expect(result.role).toBe('framework_glue');
  });

  it('does NOT classify as framework_glue when codeSnippet is absent', () => {
    const result = classifyMethodRole(makeInput({
      name: 'buildQuery',
      filePath: 'src/misc/helper.ts',
      // No codeSnippet — Rule 8 is skipped
    }));
    expect(result.role).not.toBe('framework_glue');
  });
});

// ---------------------------------------------------------------------------
// Rule 9 — utility (default fallback)
// ---------------------------------------------------------------------------

describe('classifyMethodRole — Rule 9: utility (default fallback)', () => {
  it('classifies as utility when no other rule matches', () => {
    const result = classifyMethodRole(makeInput({
      name: 'formatCurrency',
      filePath: 'src/misc/formatter.ts',
    }));
    expect(result.role).toBe('utility');
  });

  it('classifies as utility for a generic helper with no recognizable signals', () => {
    const result = classifyMethodRole(makeInput({
      name: 'doSomething',
      filePath: 'src/lib/unknown.ts',
    }));
    expect(result.role).toBe('utility');
  });

  it('utility fallback includes the default:fallback source signal', () => {
    const result = classifyMethodRole(makeInput({
      name: 'randomHelper',
      filePath: 'src/misc/rand.ts',
    }));
    expect(result.sourceSignals).toContain('default:fallback');
  });
});

// ---------------------------------------------------------------------------
// Confidence scoring
// ---------------------------------------------------------------------------

describe('classifyMethodRole — confidence scoring', () => {
  it('returns confidence 0.6 when only 1 signal fires', () => {
    // io_adapter with only 1 signal (io-prefix name, not in io dir)
    const result = classifyMethodRole(makeInput({
      name: 'fetchData',
      filePath: 'src/misc/helper.ts',
    }));
    expect(result.role).toBe('io_adapter');
    expect(result.confidence).toBe(0.6);
  });

  it('returns confidence 0.8 when 2 signals fire', () => {
    // io_adapter: name prefix + path in models/ = 2 signals
    const result = classifyMethodRole(makeInput({
      name: 'fetchUsers',
      filePath: 'src/models/user-model.ts',
    }));
    expect(result.role).toBe('io_adapter');
    expect(result.confidence).toBe(0.8);
  });

  it('returns confidence 0.95 when 3 signals fire', () => {
    // entrypoint: path:routes-controllers + isExported + params:req-res-ctx = 3 signals
    const result = classifyMethodRole(makeInput({
      name: 'handleLogin',
      filePath: 'src/routes/auth.ts',
      isExported: true,
      parameters: [{ name: 'req' }, { name: 'res' }],
    }));
    expect(result.role).toBe('entrypoint');
    expect(result.confidence).toBe(0.95);
  });
});

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

describe('classifyMethodRole — id generation', () => {
  it('returns id in filePath#name format', () => {
    const result = classifyMethodRole(makeInput({
      name: 'myFunction',
      filePath: 'src/utils/string-utils.ts',
    }));
    expect(result.id).toBe('src/utils/string-utils.ts#myFunction');
  });

  it('id is stable for the same input', () => {
    const input = makeInput({ name: 'compute', filePath: 'src/logic/calc.ts' });
    const r1 = classifyMethodRole(input);
    const r2 = classifyMethodRole(input);
    expect(r1.id).toBe(r2.id);
  });

  it('id differs when filePath differs', () => {
    const r1 = classifyMethodRole(makeInput({ name: 'helper', filePath: 'src/a/file.ts' }));
    const r2 = classifyMethodRole(makeInput({ name: 'helper', filePath: 'src/b/file.ts' }));
    expect(r1.id).not.toBe(r2.id);
  });

  it('id differs when name differs', () => {
    const r1 = classifyMethodRole(makeInput({ name: 'foo', filePath: 'src/utils/helper.ts' }));
    const r2 = classifyMethodRole(makeInput({ name: 'bar', filePath: 'src/utils/helper.ts' }));
    expect(r1.id).not.toBe(r2.id);
  });
});

// ---------------------------------------------------------------------------
// Return shape
// ---------------------------------------------------------------------------

describe('classifyMethodRole — return shape', () => {
  it('always returns a MethodRoleClassification with id, role, confidence, sourceSignals', () => {
    const result = classifyMethodRole(makeInput({ name: 'test', filePath: 'src/test.ts' }));
    expect(typeof result.id).toBe('string');
    expect(typeof result.role).toBe('string');
    expect(typeof result.confidence).toBe('number');
    expect(Array.isArray(result.sourceSignals)).toBe(true);
  });

  it('confidence is always between 0 and 1', () => {
    const inputs: MethodClassificationInput[] = [
      makeInput({ name: 'fetchData', filePath: 'src/misc/helper.ts' }),
      makeInput({ name: 'validateInput', filePath: 'src/misc/helper.ts' }),
      makeInput({ name: 'registerPlugin', filePath: 'src/misc/helper.ts' }),
    ];
    for (const input of inputs) {
      const result = classifyMethodRole(input);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }
  });
});
