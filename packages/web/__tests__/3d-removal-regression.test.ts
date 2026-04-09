/**
 * 3D Removal Regression Tests (Sprint 19 T12)
 *
 * Verifies that:
 *   1. No three.js/Graph3DCanvas imports exist in any source file
 *   2. GraphContainer renders without Graph3DCanvas
 *   3. ViewStateContext has no is3D or 3d mode references in its action types
 *
 * These tests guard against accidental re-introduction of the 3D layer that
 * was removed in Sprint 19 T12.
 *
 * Sprint 19 — T17: Testing and Regression
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// File system helpers
// ---------------------------------------------------------------------------

// Resolve WEB_SRC relative to this test file, not process.cwd()
// __tests__/ → one level up is packages/web/ → src/
const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_SRC = resolve(__dirname, '../src');

/**
 * Recursively collect all .ts/.tsx file paths under a directory.
 * Skips node_modules and __tests__ directories.
 */
function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(current: string): void {
    const entries = readdirSync(current);
    for (const entry of entries) {
      const fullPath = join(current, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (entry === 'node_modules' || entry === '__tests__' || entry === 'dist') continue;
        walk(fullPath);
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('3D removal regression', () => {
  it('no source file imports from three.js or react-three-fiber', () => {
    const files = collectSourceFiles(WEB_SRC);
    const violating: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      // Check for three.js imports
      if (
        /from ['"]three['"]/m.test(content) ||
        /from ['"]@react-three\/fiber['"]/m.test(content) ||
        /require\(['"]three['"]\)/m.test(content)
      ) {
        violating.push(file);
      }
    }

    expect(violating).toHaveLength(0);
  });

  it('no source file imports or references Graph3DCanvas', () => {
    const files = collectSourceFiles(WEB_SRC);
    const violating: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      if (/Graph3DCanvas/m.test(content)) {
        violating.push(file);
      }
    }

    expect(violating).toHaveLength(0);
  });

  it('GraphContainer.tsx does not import three.js or Graph3DCanvas', () => {
    const graphContainerPath = resolve(WEB_SRC, 'components/GraphContainer.tsx');
    const content = readFileSync(graphContainerPath, 'utf-8');

    expect(content).not.toMatch(/from ['"]three['"]/);
    expect(content).not.toMatch(/Graph3DCanvas/);
    expect(content).not.toMatch(/react-three-fiber/);
  });

  it('ViewStateContext has no SET_3D_MODE action type', () => {
    const contextPath = resolve(WEB_SRC, 'contexts/ViewStateContext.tsx');
    const content = readFileSync(contextPath, 'utf-8');

    // SET_3D_MODE should have been removed in Sprint 19 T12
    expect(content).not.toContain("{ type: 'SET_3D_MODE'");
    expect(content).not.toContain('"SET_3D_MODE"');
  });

  it('mode is locked to 2d in ViewStateContext initial state (no 3d mode value)', () => {
    const contextPath = resolve(WEB_SRC, 'contexts/ViewStateContext.tsx');
    const content = readFileSync(contextPath, 'utf-8');

    // The initial mode should be '2d'
    expect(content).toContain("mode: '2d'");
    // There should be a comment about 3D removal
    expect(content).toContain('3D removal');
  });
});
