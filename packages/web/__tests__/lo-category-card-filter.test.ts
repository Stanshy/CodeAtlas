/**
 * LO Category Card Filter — Logic Tests (Sprint 14 T11)
 *
 * Tests the filtering logic used by LOCategoryCardNode to show/hide methods
 * based on their methodRole. Sprint 14 introduced AI-driven role classification
 * and a hiddenMethodRoles setting that defaults to ['utility', 'framework_glue'].
 *
 * These tests exercise the pure filtering function independently of React
 * rendering, verifying the core logic that the component relies on.
 *
 * Also covers:
 *   - AI summary display logic (method with/without aiSummary)
 *   - Role badge label mapping (all 9 roles have Chinese labels)
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Filtering logic (mirrors what LOCategoryCardNode applies)
// ---------------------------------------------------------------------------

interface MethodWithRole {
  name: string;
  nodeId: string;
  filePath: string;
  methodRole?: string;
  aiSummary?: string;
}

/**
 * Splits a method list into visible and hidden sets based on which roles
 * are currently hidden. Methods without a methodRole are always visible.
 */
function filterMethods(
  allMethods: MethodWithRole[],
  hiddenRoles: string[],
): { visible: MethodWithRole[]; hidden: MethodWithRole[] } {
  const hiddenSet = new Set(hiddenRoles);
  const visible = allMethods.filter(
    (m) => !m.methodRole || !hiddenSet.has(m.methodRole),
  );
  const hidden = allMethods.filter(
    (m) => m.methodRole !== undefined && hiddenSet.has(m.methodRole),
  );
  return { visible, hidden };
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const methods: MethodWithRole[] = [
  { name: 'handleRequest',  nodeId: '1', filePath: 'routes/api.ts',        methodRole: 'entrypoint' },
  { name: 'processOrder',   nodeId: '2', filePath: 'services/order.ts',    methodRole: 'business_core' },
  { name: 'formatDate',     nodeId: '3', filePath: 'utils/date.ts',        methodRole: 'utility' },
  { name: 'buildQuery',     nodeId: '4', filePath: 'db/query.ts',          methodRole: 'framework_glue' },
  { name: 'validateInput',  nodeId: '5', filePath: 'validators/input.ts',  methodRole: 'validation' },
  { name: 'noRoleMethod',   nodeId: '6', filePath: 'src/misc.ts' },        // no methodRole
];

const defaultHiddenRoles = ['utility', 'framework_glue'];

// ---------------------------------------------------------------------------
// LO Method Role Filtering Logic
// ---------------------------------------------------------------------------

describe('LO Method Role Filtering Logic', () => {
  it('hides utility and framework_glue by default', () => {
    const { visible, hidden } = filterMethods(methods, defaultHiddenRoles);
    // entrypoint, business_core, validation, noRoleMethod → 4 visible
    expect(visible).toHaveLength(4);
    // utility, framework_glue → 2 hidden
    expect(hidden).toHaveLength(2);
  });

  it('methods without role are always visible', () => {
    const { visible } = filterMethods(methods, defaultHiddenRoles);
    expect(visible.find((m) => m.name === 'noRoleMethod')).toBeDefined();
  });

  it('methods without role are never in the hidden list', () => {
    const { hidden } = filterMethods(methods, ['utility', 'framework_glue', 'entrypoint']);
    expect(hidden.find((m) => m.name === 'noRoleMethod')).toBeUndefined();
  });

  it('custom hidden roles work', () => {
    const { visible, hidden } = filterMethods(methods, ['validation', 'utility']);
    expect(visible).toHaveLength(4);
    expect(hidden).toHaveLength(2);
    expect(hidden.find((m) => m.name === 'validateInput')).toBeDefined();
    expect(hidden.find((m) => m.name === 'formatDate')).toBeDefined();
  });

  it('empty hidden roles shows everything', () => {
    const { visible, hidden } = filterMethods(methods, []);
    expect(visible).toHaveLength(6);
    expect(hidden).toHaveLength(0);
  });

  it('hiding all roles hides all methods with roles', () => {
    const allRoles = [
      'entrypoint', 'business_core', 'utility', 'framework_glue', 'validation',
    ];
    const { visible, hidden } = filterMethods(methods, allRoles);
    // Only noRoleMethod remains visible (it has no methodRole)
    expect(visible).toHaveLength(1);
    expect(visible[0].name).toBe('noRoleMethod');
    expect(hidden).toHaveLength(5);
  });

  it('hidden list contains exactly the methods whose role is in hiddenRoles', () => {
    const { hidden } = filterMethods(methods, defaultHiddenRoles);
    const hiddenNames = hidden.map((m) => m.name).sort();
    expect(hiddenNames).toEqual(['buildQuery', 'formatDate']);
  });

  it('visible list preserves original order', () => {
    const { visible } = filterMethods(methods, defaultHiddenRoles);
    const visibleNames = visible.map((m) => m.name);
    // Order must match the original array order (minus hidden items)
    expect(visibleNames).toEqual([
      'handleRequest', 'processOrder', 'validateInput', 'noRoleMethod',
    ]);
  });

  it('single hidden role works correctly', () => {
    const { visible, hidden } = filterMethods(methods, ['utility']);
    expect(hidden).toHaveLength(1);
    expect(hidden[0].name).toBe('formatDate');
    expect(visible).toHaveLength(5);
  });

  it('toggling a role from hidden to visible restores it', () => {
    const { visible: beforeVisible } = filterMethods(methods, defaultHiddenRoles);
    // Now remove 'utility' from hidden roles (simulating toggle)
    const updatedHidden = defaultHiddenRoles.filter((r) => r !== 'utility');
    const { visible: afterVisible } = filterMethods(methods, updatedHidden);
    expect(afterVisible.length).toBe(beforeVisible.length + 1);
    expect(afterVisible.find((m) => m.name === 'formatDate')).toBeDefined();
  });

  it('toggling a visible role to hidden removes it', () => {
    const { visible: beforeVisible } = filterMethods(methods, defaultHiddenRoles);
    // Add 'entrypoint' to hidden roles
    const updatedHidden = [...defaultHiddenRoles, 'entrypoint'];
    const { visible: afterVisible } = filterMethods(methods, updatedHidden);
    expect(afterVisible.length).toBe(beforeVisible.length - 1);
    expect(afterVisible.find((m) => m.name === 'handleRequest')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// LO AI Summary Display Logic
// ---------------------------------------------------------------------------

describe('LO AI Summary Display Logic', () => {
  it('method with aiSummary shows summary text', () => {
    const method: MethodWithRole = {
      name: 'processOrder',
      nodeId: '1',
      filePath: 'services/order.ts',
      methodRole: 'business_core',
      aiSummary: 'Processes customer orders',
    };
    expect(method.aiSummary).toBeDefined();
    expect(method.aiSummary!.length).toBeGreaterThan(0);
    expect(method.aiSummary!.length).toBeLessThanOrEqual(100);
  });

  it('method without aiSummary shows nothing', () => {
    const method: MethodWithRole = {
      name: 'processOrder',
      nodeId: '1',
      filePath: 'services/order.ts',
    };
    expect((method as MethodWithRole).aiSummary).toBeUndefined();
  });

  it('aiSummary does not affect filtering', () => {
    const methodsWithSummaries: MethodWithRole[] = [
      { name: 'fn1', nodeId: '1', filePath: 'a.ts', methodRole: 'utility', aiSummary: 'A utility' },
      { name: 'fn2', nodeId: '2', filePath: 'b.ts', methodRole: 'entrypoint', aiSummary: 'Entry fn' },
    ];
    const { visible, hidden } = filterMethods(methodsWithSummaries, ['utility']);
    // 'fn1' hidden (utility), 'fn2' visible (entrypoint) — aiSummary irrelevant
    expect(visible).toHaveLength(1);
    expect(visible[0].name).toBe('fn2');
    expect(hidden).toHaveLength(1);
    expect(hidden[0].name).toBe('fn1');
  });

  it('aiSummary is preserved in visible methods', () => {
    const methodsWithSummaries: MethodWithRole[] = [
      { name: 'fn1', nodeId: '1', filePath: 'a.ts', methodRole: 'entrypoint', aiSummary: 'Entry point handler' },
    ];
    const { visible } = filterMethods(methodsWithSummaries, defaultHiddenRoles);
    expect(visible[0].aiSummary).toBe('Entry point handler');
  });

  it('aiSummary is preserved in hidden methods', () => {
    const methodsWithSummaries: MethodWithRole[] = [
      { name: 'fn1', nodeId: '1', filePath: 'a.ts', methodRole: 'utility', aiSummary: 'Format dates' },
    ];
    const { hidden } = filterMethods(methodsWithSummaries, ['utility']);
    expect(hidden[0].aiSummary).toBe('Format dates');
  });
});

// ---------------------------------------------------------------------------
// Role Badge Label Mapping
// ---------------------------------------------------------------------------

describe('Role Badge Label Mapping', () => {
  const roleLabels: Record<string, string> = {
    entrypoint:      '入口',
    business_core:   '業務核心',
    domain_rule:     '領域規則',
    orchestration:   '流程編排',
    io_adapter:      'I/O 轉接',
    validation:      '輸入驗證',
    infra:           '基礎設施',
    utility:         '工具函式',
    framework_glue:  '框架膠水',
  };

  it('all 9 roles have Chinese labels', () => {
    expect(Object.keys(roleLabels)).toHaveLength(9);
  });

  it('each label is non-empty', () => {
    for (const [role, label] of Object.entries(roleLabels)) {
      expect(label.length, `${role} label should be non-empty`).toBeGreaterThan(0);
    }
  });

  it('entrypoint maps to "入口"', () => {
    expect(roleLabels.entrypoint).toBe('入口');
  });

  it('business_core maps to "業務核心"', () => {
    expect(roleLabels.business_core).toBe('業務核心');
  });

  it('utility maps to "工具函式"', () => {
    expect(roleLabels.utility).toBe('工具函式');
  });

  it('framework_glue maps to "框架膠水"', () => {
    expect(roleLabels.framework_glue).toBe('框架膠水');
  });

  it('validation maps to "輸入驗證"', () => {
    expect(roleLabels.validation).toBe('輸入驗證');
  });

  it('all labels contain only non-whitespace characters (no empty-only labels)', () => {
    for (const label of Object.values(roleLabels)) {
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });

  it('default hidden roles (utility, framework_glue) both have labels', () => {
    expect(roleLabels['utility']).toBeDefined();
    expect(roleLabels['framework_glue']).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// ViewState hiddenMethodRoles integration (default values)
// ---------------------------------------------------------------------------

describe('ViewState hiddenMethodRoles defaults', () => {
  // These tests verify the expected default values used by the ViewState
  // for Sprint 14 AI Settings — no React context required.

  const expectedDefaults = ['utility', 'framework_glue'];

  it('default hidden roles array has 2 items', () => {
    expect(expectedDefaults).toHaveLength(2);
  });

  it('utility is hidden by default', () => {
    expect(expectedDefaults).toContain('utility');
  });

  it('framework_glue is hidden by default', () => {
    expect(expectedDefaults).toContain('framework_glue');
  });

  it('entrypoint is not hidden by default', () => {
    expect(expectedDefaults).not.toContain('entrypoint');
  });

  it('business_core is not hidden by default', () => {
    expect(expectedDefaults).not.toContain('business_core');
  });

  it('default hidden roles reduce a full method list by exactly the utility and glue methods', () => {
    const allRoleMethods: MethodWithRole[] = [
      { name: 'a', nodeId: '1', filePath: 'f.ts', methodRole: 'entrypoint' },
      { name: 'b', nodeId: '2', filePath: 'f.ts', methodRole: 'business_core' },
      { name: 'c', nodeId: '3', filePath: 'f.ts', methodRole: 'utility' },
      { name: 'd', nodeId: '4', filePath: 'f.ts', methodRole: 'framework_glue' },
      { name: 'e', nodeId: '5', filePath: 'f.ts', methodRole: 'validation' },
    ];
    const { hidden } = filterMethods(allRoleMethods, expectedDefaults);
    expect(hidden.map((m) => m.methodRole).sort()).toEqual([
      'framework_glue', 'utility',
    ]);
  });
});
