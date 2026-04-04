/**
 * Sprint 11/12 — PERSPECTIVE_PRESETS unit tests
 *
 * Coverage:
 *   - All three perspectives exist with required shape fields
 *   - system-framework supports3D === false
 *   - logic-operation and data-journey supports3D === true
 *   - system-framework filter.edgeTypes = ['import', 'export']
 *   - logic-operation and data-journey filter is "select all" (empty arrays)
 */

import { describe, it, expect } from 'vitest';
import { PERSPECTIVE_PRESETS } from '../src/adapters/perspective-presets';
import type { PerspectiveName } from '../src/types/graph';

const PERSPECTIVE_NAMES: PerspectiveName[] = [
  'system-framework',
  'logic-operation',
  'data-journey',
];

// ---------------------------------------------------------------------------
// Shape — required fields on every preset
// ---------------------------------------------------------------------------

describe('PERSPECTIVE_PRESETS — shape', () => {
  for (const name of PERSPECTIVE_NAMES) {
    it(`${name} has name field matching key`, () => {
      expect(PERSPECTIVE_PRESETS[name].name).toBe(name);
    });

    it(`${name} has non-empty label`, () => {
      expect(typeof PERSPECTIVE_PRESETS[name].label).toBe('string');
      expect(PERSPECTIVE_PRESETS[name].label.length).toBeGreaterThan(0);
    });

    it(`${name} has layout field`, () => {
      expect(PERSPECTIVE_PRESETS[name].layout).toBeTruthy();
    });

    it(`${name} has colorScheme field`, () => {
      expect(PERSPECTIVE_PRESETS[name].colorScheme).toBeTruthy();
    });

    it(`${name} has interaction field`, () => {
      expect(PERSPECTIVE_PRESETS[name].interaction).toBeTruthy();
    });

    it(`${name} has supports3D boolean`, () => {
      expect(typeof PERSPECTIVE_PRESETS[name].supports3D).toBe('boolean');
    });

    it(`${name} has filter.nodeTypes array`, () => {
      expect(Array.isArray(PERSPECTIVE_PRESETS[name].filter.nodeTypes)).toBe(true);
    });

    it(`${name} has filter.edgeTypes array`, () => {
      expect(Array.isArray(PERSPECTIVE_PRESETS[name].filter.edgeTypes)).toBe(true);
    });

    it(`${name} has display object with required booleans`, () => {
      const { display } = PERSPECTIVE_PRESETS[name];
      expect(typeof display.showHeatmap).toBe('boolean');
      expect(typeof display.showEdgeLabels).toBe('boolean');
      expect(typeof display.showParticles).toBe('boolean');
      expect(typeof display.expandFiles).toBe('boolean');
    });

    it(`${name} has display.labelDensity string`, () => {
      const { labelDensity } = PERSPECTIVE_PRESETS[name].display;
      expect(['all', 'smart', 'none']).toContain(labelDensity);
    });
  }
});

// ---------------------------------------------------------------------------
// 3D support rules
// ---------------------------------------------------------------------------

describe('PERSPECTIVE_PRESETS — 3D support', () => {
  it('system-framework does not support 3D', () => {
    expect(PERSPECTIVE_PRESETS['system-framework'].supports3D).toBe(false);
  });

  it('logic-operation supports 3D', () => {
    expect(PERSPECTIVE_PRESETS['logic-operation'].supports3D).toBe(true);
  });

  it('data-journey supports 3D', () => {
    expect(PERSPECTIVE_PRESETS['data-journey'].supports3D).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Layout engines
// ---------------------------------------------------------------------------

describe('PERSPECTIVE_PRESETS — layouts', () => {
  it('system-framework uses dagre-hierarchical layout', () => {
    expect(PERSPECTIVE_PRESETS['system-framework'].layout).toBe('dagre-hierarchical');
  });

  it('logic-operation uses dagre-hierarchical layout', () => {
    expect(PERSPECTIVE_PRESETS['logic-operation'].layout).toBe('dagre-hierarchical');
  });

  it('data-journey uses path-tracing layout', () => {
    expect(PERSPECTIVE_PRESETS['data-journey'].layout).toBe('path-tracing');
  });
});

// ---------------------------------------------------------------------------
// Color schemes
// ---------------------------------------------------------------------------

describe('PERSPECTIVE_PRESETS — colorSchemes', () => {
  it('system-framework uses blue-paper', () => {
    expect(PERSPECTIVE_PRESETS['system-framework'].colorScheme).toBe('blue-paper');
  });

  it('logic-operation uses multi-paper', () => {
    expect(PERSPECTIVE_PRESETS['logic-operation'].colorScheme).toBe('multi-paper');
  });

  it('data-journey uses green-paper', () => {
    expect(PERSPECTIVE_PRESETS['data-journey'].colorScheme).toBe('green-paper');
  });
});

// ---------------------------------------------------------------------------
// Filter rules
// ---------------------------------------------------------------------------

describe('PERSPECTIVE_PRESETS — filter', () => {
  it('system-framework filter.edgeTypes contains import', () => {
    expect(PERSPECTIVE_PRESETS['system-framework'].filter.edgeTypes).toContain('import');
  });

  it('system-framework filter.edgeTypes contains export', () => {
    expect(PERSPECTIVE_PRESETS['system-framework'].filter.edgeTypes).toContain('export');
  });

  it('system-framework filter.edgeTypes has exactly 2 entries', () => {
    expect(PERSPECTIVE_PRESETS['system-framework'].filter.edgeTypes).toHaveLength(2);
  });

  it('system-framework filter.nodeTypes is empty (select all)', () => {
    expect(PERSPECTIVE_PRESETS['system-framework'].filter.nodeTypes).toHaveLength(0);
  });

  it('logic-operation filter.edgeTypes is empty (select all)', () => {
    expect(PERSPECTIVE_PRESETS['logic-operation'].filter.edgeTypes).toHaveLength(0);
  });

  it('logic-operation filter.nodeTypes is empty (select all)', () => {
    expect(PERSPECTIVE_PRESETS['logic-operation'].filter.nodeTypes).toHaveLength(0);
  });

  it('data-journey filter.edgeTypes is empty (select all)', () => {
    expect(PERSPECTIVE_PRESETS['data-journey'].filter.edgeTypes).toHaveLength(0);
  });

  it('data-journey filter.nodeTypes is empty (select all)', () => {
    expect(PERSPECTIVE_PRESETS['data-journey'].filter.nodeTypes).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Sprint 12 — dataSource field
// ---------------------------------------------------------------------------

describe('PERSPECTIVE_PRESETS — dataSource (Sprint 12/13)', () => {
  it('system-framework has dataSource "directory"', () => {
    expect(PERSPECTIVE_PRESETS['system-framework'].dataSource).toBe('directory');
  });

  it('logic-operation has dataSource "method" (Sprint 13)', () => {
    expect(PERSPECTIVE_PRESETS['logic-operation'].dataSource).toBe('method');
  });

  it('data-journey has dataSource "endpoint" (Sprint 13)', () => {
    expect(PERSPECTIVE_PRESETS['data-journey'].dataSource).toBe('endpoint');
  });
});

// ---------------------------------------------------------------------------
// Sprint 13 — interaction values (updated from Sprint 12)
// ---------------------------------------------------------------------------

describe('PERSPECTIVE_PRESETS — interaction modes (Sprint 13)', () => {
  it('system-framework interaction is "sf-click-select"', () => {
    expect(PERSPECTIVE_PRESETS['system-framework'].interaction).toBe('sf-click-select');
  });

  it('logic-operation interaction is "lo-category-drill"', () => {
    expect(PERSPECTIVE_PRESETS['logic-operation'].interaction).toBe('lo-category-drill');
  });

  it('data-journey interaction is "dj-endpoint-play"', () => {
    expect(PERSPECTIVE_PRESETS['data-journey'].interaction).toBe('dj-endpoint-play');
  });
});
