/**
 * Unit tests for role-classifier.ts (Sprint 10 / T2)
 *
 * Coverage targets:
 *   - noise:          test/spec directories, dist/build paths, *.test.* filenames
 *   - infrastructure: config files, tsconfig, .env, config/ and database/ dirs
 *   - business-logic: routes/, controllers/, services/, models/ dirs; high inDegree
 *   - cross-cutting:  middleware/, auth/, guards/ dirs
 *   - utility:        utils/, helpers/ dirs; types.ts, constants.ts filenames
 *   - fallback:       unrecognised path → infrastructure
 *   - computeDependencyStats: p75 and median; edge cases (empty, < 3)
 */

import { describe, it, expect } from 'vitest';
import {
  classifyNodeRole,
  computeDependencyStats,
  type DependencyStats,
} from '../src/analyzer/role-classifier.js';
import type { GraphNode } from '../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal GraphNode for testing.  Only the fields exercised by the
 * classifier are populated; everything else uses safe defaults.
 */
function makeNode(
  filePath: string,
  opts: {
    type?: GraphNode['type'];
    dependencyCount?: number;
    importCount?: number;
  } = {},
): GraphNode {
  return {
    id: filePath,
    type: opts.type ?? 'file',
    label: filePath.split(/[/\\]/).pop() ?? filePath,
    filePath,
    metadata: {
      dependencyCount: opts.dependencyCount,
      importCount: opts.importCount,
    },
  };
}

// A depStats object that effectively disables Step 4 influence (all zeros).
const zeroStats: DependencyStats = { inDegreeP75: 0, outDegreeMedian: 0 };

// A depStats object useful for Step 4 tests.
const typicalStats: DependencyStats = { inDegreeP75: 5, outDegreeMedian: 3 };

// ---------------------------------------------------------------------------
// noise
// ---------------------------------------------------------------------------

describe('classifyNodeRole — noise', () => {
  it('returns noise for a file inside __tests__/', () => {
    expect(classifyNodeRole(makeNode('src/__tests__/foo.ts'), null)).toBe('noise');
  });

  it('returns noise for a file inside a nested tests/ directory', () => {
    expect(classifyNodeRole(makeNode('packages/core/tests/unit/bar.ts'), null)).toBe('noise');
  });

  it('returns noise for a file inside dist/', () => {
    expect(classifyNodeRole(makeNode('dist/index.js'), null)).toBe('noise');
  });

  it('returns noise for a file inside build/', () => {
    expect(classifyNodeRole(makeNode('build/bundle.js'), null)).toBe('noise');
  });

  it('returns noise for a *.test.ts filename', () => {
    expect(classifyNodeRole(makeNode('src/services/auth.test.ts'), null)).toBe('noise');
  });

  it('returns noise for a *.spec.js filename', () => {
    expect(classifyNodeRole(makeNode('src/utils/helper.spec.js'), null)).toBe('noise');
  });

  it('returns noise for a *.e2e.ts filename', () => {
    expect(classifyNodeRole(makeNode('e2e/login.e2e.ts'), null)).toBe('noise');
  });

  it('returns noise for a file inside coverage/', () => {
    expect(classifyNodeRole(makeNode('coverage/lcov-report/index.html'), null)).toBe('noise');
  });
});

// ---------------------------------------------------------------------------
// infrastructure
// ---------------------------------------------------------------------------

describe('classifyNodeRole — infrastructure', () => {
  it('returns infrastructure for vite.config.ts', () => {
    expect(classifyNodeRole(makeNode('vite.config.ts'), null)).toBe('infrastructure');
  });

  it('returns infrastructure for tsconfig.json', () => {
    expect(classifyNodeRole(makeNode('tsconfig.json'), null)).toBe('infrastructure');
  });

  it('returns infrastructure for .env', () => {
    expect(classifyNodeRole(makeNode('.env'), null)).toBe('infrastructure');
  });

  it('returns infrastructure for .env.production', () => {
    expect(classifyNodeRole(makeNode('.env.production'), null)).toBe('infrastructure');
  });

  it('returns infrastructure for a file inside config/', () => {
    expect(classifyNodeRole(makeNode('src/config/app.ts'), zeroStats)).toBe('infrastructure');
  });

  it('returns infrastructure for a file inside database/', () => {
    expect(classifyNodeRole(makeNode('src/database/connection.ts'), zeroStats)).toBe('infrastructure');
  });

  it('returns infrastructure for a *.setup.ts file', () => {
    expect(classifyNodeRole(makeNode('jest.setup.ts'), null)).toBe('infrastructure');
  });

  it('returns infrastructure for package.json', () => {
    expect(classifyNodeRole(makeNode('package.json'), null)).toBe('infrastructure');
  });
});

// ---------------------------------------------------------------------------
// business-logic
// ---------------------------------------------------------------------------

describe('classifyNodeRole — business-logic', () => {
  it('returns business-logic for a file inside routes/', () => {
    expect(classifyNodeRole(makeNode('src/routes/user.ts'), zeroStats)).toBe('business-logic');
  });

  it('returns business-logic for a file inside controllers/', () => {
    expect(classifyNodeRole(makeNode('src/controllers/auth-controller.ts'), zeroStats)).toBe('business-logic');
  });

  it('returns business-logic for a file inside services/', () => {
    expect(classifyNodeRole(makeNode('src/services/payment-service.ts'), zeroStats)).toBe('business-logic');
  });

  it('returns business-logic for a file inside models/', () => {
    expect(classifyNodeRole(makeNode('src/models/user-model.ts'), zeroStats)).toBe('business-logic');
  });

  it('returns business-logic for a file inside pages/', () => {
    expect(classifyNodeRole(makeNode('src/pages/home.tsx'), zeroStats)).toBe('business-logic');
  });

  it('returns business-logic via Step 4 high inDegree', () => {
    // inDegree=10 > p75=5, outDegree=1 <= median=3 → business-logic
    const node = makeNode('src/core/orchestrator.ts', { dependencyCount: 10, importCount: 1 });
    expect(classifyNodeRole(node, typicalStats)).toBe('business-logic');
  });
});

// ---------------------------------------------------------------------------
// cross-cutting
// ---------------------------------------------------------------------------

describe('classifyNodeRole — cross-cutting', () => {
  it('returns cross-cutting for a file inside middleware/', () => {
    expect(classifyNodeRole(makeNode('src/middleware/error-handler.ts'), zeroStats)).toBe('cross-cutting');
  });

  it('returns cross-cutting for a file inside middlewares/', () => {
    expect(classifyNodeRole(makeNode('src/middlewares/rate-limiter.ts'), zeroStats)).toBe('cross-cutting');
  });

  it('returns cross-cutting for a file inside auth/', () => {
    expect(classifyNodeRole(makeNode('src/auth/jwt.ts'), zeroStats)).toBe('cross-cutting');
  });

  it('returns cross-cutting for a file inside guards/', () => {
    expect(classifyNodeRole(makeNode('src/guards/role-guard.ts'), zeroStats)).toBe('cross-cutting');
  });

  it('returns cross-cutting for a file inside interceptors/', () => {
    expect(classifyNodeRole(makeNode('src/interceptors/logging.ts'), zeroStats)).toBe('cross-cutting');
  });

  it('returns cross-cutting for a file inside validation/', () => {
    expect(classifyNodeRole(makeNode('src/validation/schema.ts'), zeroStats)).toBe('cross-cutting');
  });
});

// ---------------------------------------------------------------------------
// utility
// ---------------------------------------------------------------------------

describe('classifyNodeRole — utility', () => {
  it('returns utility for a file inside utils/', () => {
    expect(classifyNodeRole(makeNode('src/utils/date-formatter.ts'), zeroStats)).toBe('utility');
  });

  it('returns utility for a file inside helpers/', () => {
    expect(classifyNodeRole(makeNode('src/helpers/string-utils.ts'), zeroStats)).toBe('utility');
  });

  it('returns utility for types.ts basename', () => {
    expect(classifyNodeRole(makeNode('src/types.ts'), null)).toBe('utility');
  });

  it('returns utility for constants.ts basename', () => {
    expect(classifyNodeRole(makeNode('src/constants.ts'), null)).toBe('utility');
  });

  it('returns utility for *.d.ts files', () => {
    expect(classifyNodeRole(makeNode('src/global.d.ts'), null)).toBe('utility');
  });

  it('returns utility for interfaces.ts basename', () => {
    expect(classifyNodeRole(makeNode('src/interfaces.ts'), null)).toBe('utility');
  });

  it('returns utility via Step 4 low inDegree + high outDegree', () => {
    // inDegree=0 <= 1, outDegree=8 > median=3 → utility
    const node = makeNode('src/core/shared-deps.ts', { dependencyCount: 0, importCount: 8 });
    expect(classifyNodeRole(node, typicalStats)).toBe('utility');
  });
});

// ---------------------------------------------------------------------------
// fallback → infrastructure
// ---------------------------------------------------------------------------

describe('classifyNodeRole — fallback', () => {
  it('returns infrastructure for an unrecognised path with no depStats', () => {
    expect(classifyNodeRole(makeNode('src/some-random-file.ts'), null)).toBe('infrastructure');
  });

  it('returns infrastructure for an unrecognised path when Step 4 also does not match', () => {
    // inDegree=2 not > p75=5, outDegree=2 not > median=3 → falls through to infrastructure
    const node = makeNode('src/some-other-file.ts', { dependencyCount: 2, importCount: 2 });
    expect(classifyNodeRole(node, typicalStats)).toBe('infrastructure');
  });

  it('returns infrastructure for a directory node with an unrecognised path', () => {
    const node = makeNode('src/unknown-dir', { type: 'directory' });
    expect(classifyNodeRole(node, null)).toBe('infrastructure');
  });
});

// ---------------------------------------------------------------------------
// Step 4 edge cases
// ---------------------------------------------------------------------------

describe('classifyNodeRole — Step 4 boundary conditions', () => {
  it('does NOT classify as business-logic when inDegree equals p75 (not strictly greater)', () => {
    // inDegree=5 is NOT > p75=5
    const node = makeNode('src/foo.ts', { dependencyCount: 5, importCount: 1 });
    expect(classifyNodeRole(node, typicalStats)).toBe('infrastructure');
  });

  it('classifies as utility when inDegree is exactly 1 and outDegree exceeds median', () => {
    const node = makeNode('src/foo.ts', { dependencyCount: 1, importCount: 4 });
    expect(classifyNodeRole(node, typicalStats)).toBe('utility');
  });

  it('does NOT classify as utility when inDegree is 2 (> 1) even with high outDegree', () => {
    // inDegree=2 > 1 → not utility via that branch; not business-logic (2 <= p75=5) → infrastructure
    const node = makeNode('src/foo.ts', { dependencyCount: 2, importCount: 10 });
    expect(classifyNodeRole(node, typicalStats)).toBe('infrastructure');
  });
});

// ---------------------------------------------------------------------------
// computeDependencyStats
// ---------------------------------------------------------------------------

describe('computeDependencyStats', () => {
  it('returns zeros when given an empty array', () => {
    expect(computeDependencyStats([])).toEqual({ inDegreeP75: 0, outDegreeMedian: 0 });
  });

  it('returns zeros when given fewer than 3 file nodes', () => {
    const nodes = [
      makeNode('a.ts', { dependencyCount: 10, importCount: 5 }),
      makeNode('b.ts', { dependencyCount: 20, importCount: 8 }),
    ];
    expect(computeDependencyStats(nodes)).toEqual({ inDegreeP75: 0, outDegreeMedian: 0 });
  });

  it('ignores non-file nodes when computing stats', () => {
    // 2 file nodes + 1 directory node → still < 3 file nodes → zeros
    const nodes = [
      makeNode('a.ts', { dependencyCount: 10, importCount: 5 }),
      makeNode('b.ts', { dependencyCount: 20, importCount: 8 }),
      makeNode('src', { type: 'directory', dependencyCount: 99, importCount: 99 }),
    ];
    expect(computeDependencyStats(nodes)).toEqual({ inDegreeP75: 0, outDegreeMedian: 0 });
  });

  it('computes correct p75 and median for an odd-count dataset', () => {
    // inDegrees (sorted): [1, 2, 3, 5, 8]  → p75 index = floor(0.75*5)=3 → value=5
    // outDegrees (sorted): [2, 3, 4, 6, 7]  → median index=2 → value=4
    const nodes = [
      makeNode('a.ts', { dependencyCount: 3, importCount: 4 }),
      makeNode('b.ts', { dependencyCount: 1, importCount: 2 }),
      makeNode('c.ts', { dependencyCount: 5, importCount: 7 }),
      makeNode('d.ts', { dependencyCount: 8, importCount: 3 }),
      makeNode('e.ts', { dependencyCount: 2, importCount: 6 }),
    ];
    const stats = computeDependencyStats(nodes);
    expect(stats.inDegreeP75).toBe(5);
    expect(stats.outDegreeMedian).toBe(4);
  });

  it('computes correct p75 and median for an even-count dataset', () => {
    // inDegrees (sorted): [1, 2, 4, 8]  → p75 index = floor(0.75*4)=3 → value=8
    // outDegrees (sorted): [1, 3, 5, 6]  → median = (3+5)/2 = 4
    const nodes = [
      makeNode('a.ts', { dependencyCount: 2, importCount: 3 }),
      makeNode('b.ts', { dependencyCount: 1, importCount: 1 }),
      makeNode('c.ts', { dependencyCount: 8, importCount: 6 }),
      makeNode('d.ts', { dependencyCount: 4, importCount: 5 }),
    ];
    const stats = computeDependencyStats(nodes);
    expect(stats.inDegreeP75).toBe(8);
    expect(stats.outDegreeMedian).toBe(4);
  });

  it('treats missing dependencyCount and importCount as zero', () => {
    // All metadata fields absent → all values 0
    const nodes = [
      makeNode('a.ts'),
      makeNode('b.ts'),
      makeNode('c.ts'),
    ];
    const stats = computeDependencyStats(nodes);
    expect(stats.inDegreeP75).toBe(0);
    expect(stats.outDegreeMedian).toBe(0);
  });

  it('handles a large uniform dataset', () => {
    // 100 nodes each with dependencyCount=10, importCount=5
    const nodes = Array.from({ length: 100 }, (_, i) =>
      makeNode(`file${i}.ts`, { dependencyCount: 10, importCount: 5 }),
    );
    const stats = computeDependencyStats(nodes);
    expect(stats.inDegreeP75).toBe(10);
    expect(stats.outDegreeMedian).toBe(5);
  });
});
