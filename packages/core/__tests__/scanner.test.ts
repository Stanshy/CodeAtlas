/**
 * Scanner unit tests
 *
 * Tests for packages/core/src/scanner/index.ts
 * Uses real fixture directories under __tests__/fixtures/
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { scanDirectory } from '../src/scanner/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturesDir = resolve(__dirname, 'fixtures');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fixturePath(name: string): string {
  return resolve(fixturesDir, name);
}

// ---------------------------------------------------------------------------
// simple-project
// ---------------------------------------------------------------------------

describe('scanDirectory — simple-project', () => {
  it('returns nodes for all JS files in the project', async () => {
    const result = await scanDirectory(fixturePath('simple-project'));
    const fileNodes = result.nodes.filter((n) => n.type === 'file');
    const filePaths = fileNodes.map((n) => n.filePath);

    expect(filePaths).toContain('index.js');
    expect(filePaths).toContain('utils/helper.js');
    expect(filePaths).toContain('utils/math.js');
  });

  it('returns a directory node for the utils subdirectory', async () => {
    const result = await scanDirectory(fixturePath('simple-project'));
    const dirNodes = result.nodes.filter((n) => n.type === 'directory');
    const dirPaths = dirNodes.map((n) => n.filePath);

    expect(dirPaths).toContain('utils');
  });

  it('returns no errors for a clean project', async () => {
    const result = await scanDirectory(fixturePath('simple-project'));
    expect(result.errors).toHaveLength(0);
  });

  it('emits exactly 4 nodes total (1 dir + 3 files)', async () => {
    const result = await scanDirectory(fixturePath('simple-project'));
    expect(result.nodes).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Node ID format
// ---------------------------------------------------------------------------

describe('scanDirectory — node IDs use forward slashes', () => {
  it('all node IDs contain only forward slashes, not backslashes', async () => {
    const result = await scanDirectory(fixturePath('simple-project'));
    for (const node of result.nodes) {
      expect(node.id).not.toContain('\\');
      expect(node.filePath).not.toContain('\\');
    }
  });

  it('node id equals filePath', async () => {
    const result = await scanDirectory(fixturePath('simple-project'));
    for (const node of result.nodes) {
      expect(node.id).toBe(node.filePath);
    }
  });
});

// ---------------------------------------------------------------------------
// node_modules ignored
// ---------------------------------------------------------------------------

describe('scanDirectory — ignore-project', () => {
  it('does not include files inside node_modules', async () => {
    const result = await scanDirectory(fixturePath('ignore-project'));
    const allPaths = result.nodes.map((n) => n.filePath);
    for (const p of allPaths) {
      expect(p).not.toContain('node_modules');
    }
  });

  it('does not produce a node_modules directory node', async () => {
    const result = await scanDirectory(fixturePath('ignore-project'));
    const dirNodes = result.nodes.filter((n) => n.type === 'directory');
    for (const dir of dirNodes) {
      expect(dir.label).not.toBe('node_modules');
    }
  });
});

// ---------------------------------------------------------------------------
// Non-JS/TS files ignored
// ---------------------------------------------------------------------------

describe('scanDirectory — non-JS/TS files are ignored', () => {
  it('does not include .json files', async () => {
    const result = await scanDirectory(fixturePath('ignore-project'));
    const fileNodes = result.nodes.filter((n) => n.type === 'file');
    for (const f of fileNodes) {
      expect(f.filePath).not.toMatch(/\.json$/);
    }
  });

  it('does not include .md files', async () => {
    const result = await scanDirectory(fixturePath('ignore-project'));
    const fileNodes = result.nodes.filter((n) => n.type === 'file');
    for (const f of fileNodes) {
      expect(f.filePath).not.toMatch(/\.md$/);
    }
  });

  it('only the index.js file node is returned from ignore-project', async () => {
    const result = await scanDirectory(fixturePath('ignore-project'));
    const fileNodes = result.nodes.filter((n) => n.type === 'file');
    expect(fileNodes).toHaveLength(1);
    expect(fileNodes[0].filePath).toBe('index.js');
  });
});

// ---------------------------------------------------------------------------
// Empty directory — no JS/TS files
// ---------------------------------------------------------------------------

describe('scanDirectory — directory with no JS/TS files', () => {
  it('returns no nodes when no matching files exist', async () => {
    // The node_modules/some-pkg folder has no TS files when scanned in isolation,
    // but it does have a JS file. We scan a directory that only has non-JS files
    // by passing restrictive extensions.
    const result = await scanDirectory(fixturePath('ignore-project'), {
      extensions: ['.ts'], // only TypeScript — ignore-project has no .ts files
    });
    expect(result.nodes).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('empty directory emits no nodes', async () => {
    // We scan the node_modules/some-pkg directory but ignore .js so nothing matches
    const result = await scanDirectory(
      resolve(fixturesDir, 'ignore-project/node_modules/some-pkg'),
      { extensions: ['.ts'] },
    );
    expect(result.nodes).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Node metadata
// ---------------------------------------------------------------------------

describe('scanDirectory — file node metadata', () => {
  it('sets language to "javascript" for .js files', async () => {
    const result = await scanDirectory(fixturePath('simple-project'));
    const indexNode = result.nodes.find((n) => n.filePath === 'index.js');
    expect(indexNode).toBeDefined();
    expect(indexNode!.metadata.language).toBe('javascript');
  });

  it('sets language to "typescript" for .ts files', async () => {
    const result = await scanDirectory(fixturePath('ts-project'));
    const indexNode = result.nodes.find((n) => n.filePath === 'index.ts');
    expect(indexNode).toBeDefined();
    expect(indexNode!.metadata.language).toBe('typescript');
  });

  it('sets fileSize as a positive number', async () => {
    const result = await scanDirectory(fixturePath('simple-project'));
    const fileNodes = result.nodes.filter((n) => n.type === 'file');
    for (const node of fileNodes) {
      expect(typeof node.metadata.fileSize).toBe('number');
      expect(node.metadata.fileSize!).toBeGreaterThan(0);
    }
  });

  it('sets lastModified as an ISO 8601 string', async () => {
    const result = await scanDirectory(fixturePath('simple-project'));
    const fileNodes = result.nodes.filter((n) => n.type === 'file');
    for (const node of fileNodes) {
      expect(node.metadata.lastModified).toBeDefined();
      expect(() => new Date(node.metadata.lastModified!)).not.toThrow();
      // Should be parseable as a valid date
      expect(isNaN(new Date(node.metadata.lastModified!).getTime())).toBe(false);
    }
  });

  it('sets node label to the file basename', async () => {
    const result = await scanDirectory(fixturePath('simple-project'));
    const indexNode = result.nodes.find((n) => n.filePath === 'index.js');
    expect(indexNode!.label).toBe('index.js');
  });
});

// ---------------------------------------------------------------------------
// TypeScript project
// ---------------------------------------------------------------------------

describe('scanDirectory — ts-project', () => {
  it('discovers all 5 TS files', async () => {
    const result = await scanDirectory(fixturePath('ts-project'));
    const fileNodes = result.nodes.filter((n) => n.type === 'file');
    expect(fileNodes).toHaveLength(5);
  });

  it('produces directory nodes for services and utils', async () => {
    const result = await scanDirectory(fixturePath('ts-project'));
    const dirNodes = result.nodes.filter((n) => n.type === 'directory');
    const labels = dirNodes.map((d) => d.label);
    expect(labels).toContain('services');
    expect(labels).toContain('utils');
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('scanDirectory — error handling', () => {
  it('returns an error when targetPath does not exist', async () => {
    const result = await scanDirectory(fixturePath('non-existent-dir'));
    expect(result.nodes).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].phase).toBe('scan');
  });

  it('returns an error when targetPath is a file, not a directory', async () => {
    const result = await scanDirectory(
      fixturePath('simple-project/index.js'),
    );
    expect(result.nodes).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toMatch(/not a directory/i);
  });
});

// ---------------------------------------------------------------------------
// Custom extensions
// ---------------------------------------------------------------------------

describe('scanDirectory — custom extensions option', () => {
  it('respects custom extensions list', async () => {
    const result = await scanDirectory(fixturePath('simple-project'), {
      extensions: ['.js'],
    });
    const fileNodes = result.nodes.filter((n) => n.type === 'file');
    for (const node of fileNodes) {
      expect(node.filePath).toMatch(/\.js$/);
    }
  });
});
