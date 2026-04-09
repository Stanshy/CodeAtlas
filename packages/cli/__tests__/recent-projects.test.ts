/**
 * Unit tests for recent-projects.ts (Sprint 20 T4)
 *
 * Coverage:
 *   - getRecentProjects: reads list from file
 *   - getRecentProjects: returns empty array when file not found
 *   - addRecentProject: prepends a new entry
 *   - addRecentProject: updates and moves existing path to top
 *   - addRecentProject: enforces max 10 entries (drops oldest)
 *   - removeRecentProject: removes entry at given index
 *   - removeRecentProject: no-ops on out-of-range index
 *   - clearRecentProjects: empties the list
 *   - getRecentProjects: returns empty array on malformed JSON
 *
 * File I/O is mocked via vi.mock('node:fs/promises') and
 * vi.mock('node:fs') to avoid writing to real ~/.codeatlas/.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RecentProject } from '@codeatlas/core';

// ---------------------------------------------------------------------------
// Mock fs modules
// ---------------------------------------------------------------------------

const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockExistsSync = vi.fn().mockReturnValue(true);
const mockMkdirSync = vi.fn();

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: (...args: unknown[]) => mockReadFile(...args),
    writeFile: (...args: unknown[]) => mockWriteFile(...args),
  },
}));

vi.mock('node:fs', () => ({
  default: {
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
  },
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
}));

import {
  getRecentProjects,
  addRecentProject,
  removeRecentProject,
  clearRecentProjects,
} from '../src/recent-projects.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProject(overrides: Partial<RecentProject> = {}): RecentProject {
  return {
    path: '/projects/my-app',
    name: 'my-app',
    lastOpened: new Date().toISOString(),
    ...overrides,
  };
}

function makeProjects(count: number): RecentProject[] {
  return Array.from({ length: count }, (_, i) => ({
    path: `/projects/project-${i}`,
    name: `project-${i}`,
    lastOpened: new Date(Date.now() - i * 60_000).toISOString(),
  }));
}

function setStoredProjects(projects: RecentProject[]): void {
  mockReadFile.mockResolvedValue(JSON.stringify(projects));
}

// ---------------------------------------------------------------------------
// beforeEach: reset mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockExistsSync.mockReturnValue(true);
  mockWriteFile.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// getRecentProjects
// ---------------------------------------------------------------------------

describe('getRecentProjects', () => {
  it('returns an empty array when file does not exist', async () => {
    mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    const result = await getRecentProjects();

    expect(result).toEqual([]);
  });

  it('returns parsed projects from file', async () => {
    const stored = makeProjects(3);
    setStoredProjects(stored);

    const result = await getRecentProjects();

    expect(result).toHaveLength(3);
    expect(result[0].path).toBe('/projects/project-0');
  });

  it('returns empty array when file contains malformed JSON', async () => {
    mockReadFile.mockResolvedValue('{ not valid json ');

    const result = await getRecentProjects();

    expect(result).toEqual([]);
  });

  it('returns empty array when file contains a non-array', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({ not: 'an array' }));

    const result = await getRecentProjects();

    expect(result).toEqual([]);
  });

  it('filters out entries missing required fields', async () => {
    const raw = JSON.stringify([
      { path: '/projects/good', name: 'good', lastOpened: new Date().toISOString() },
      { path: '/projects/missing-name', lastOpened: new Date().toISOString() },
      { name: 'missing-path', lastOpened: new Date().toISOString() },
    ]);
    mockReadFile.mockResolvedValue(raw);

    const result = await getRecentProjects();

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('/projects/good');
  });

  it('never throws even when readFile rejects with unknown error', async () => {
    mockReadFile.mockRejectedValue(new Error('unknown disk error'));

    await expect(getRecentProjects()).resolves.toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// addRecentProject
// ---------------------------------------------------------------------------

describe('addRecentProject', () => {
  it('prepends a new project to an empty list', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    await addRecentProject(makeProject({ path: '/projects/new', name: 'new' }));

    expect(mockWriteFile).toHaveBeenCalledOnce();
    const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string) as RecentProject[];
    expect(written).toHaveLength(1);
    expect(written[0].path).toBe('/projects/new');
  });

  it('prepends new entry to existing list', async () => {
    setStoredProjects(makeProjects(3));

    await addRecentProject(makeProject({ path: '/projects/brand-new', name: 'brand-new' }));

    const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string) as RecentProject[];
    expect(written[0].path).toBe('/projects/brand-new');
  });

  it('moves existing path to top instead of duplicating it', async () => {
    const existing = makeProjects(3);
    // existing[2] has path '/projects/project-2'
    setStoredProjects(existing);

    await addRecentProject(makeProject({ path: '/projects/project-2', name: 'project-2' }));

    const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string) as RecentProject[];
    expect(written[0].path).toBe('/projects/project-2');
    // Should not duplicate
    const count = written.filter((p) => p.path === '/projects/project-2').length;
    expect(count).toBe(1);
    // Total stays 3, not 4
    expect(written).toHaveLength(3);
  });

  it('updates lastOpened when moving existing entry to top', async () => {
    const before = new Date('2025-01-01T00:00:00.000Z').toISOString();
    setStoredProjects([{ path: '/projects/old', name: 'old', lastOpened: before }]);

    await addRecentProject(makeProject({ path: '/projects/old', name: 'old' }));

    const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string) as RecentProject[];
    expect(written[0].lastOpened).not.toBe(before);
  });

  it('enforces max 10 entries — drops the oldest entry', async () => {
    setStoredProjects(makeProjects(10));

    await addRecentProject(makeProject({ path: '/projects/eleventh', name: 'eleventh' }));

    const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string) as RecentProject[];
    expect(written).toHaveLength(10);
    expect(written[0].path).toBe('/projects/eleventh');
    // The 10th original entry (project-9, oldest) should be dropped
    expect(written.some((p) => p.path === '/projects/project-9')).toBe(false);
  });

  it('never exceeds 10 entries even with repeated additions', async () => {
    setStoredProjects(makeProjects(10));

    for (let i = 0; i < 5; i++) {
      mockReadFile.mockResolvedValue(mockWriteFile.mock.calls.at(-1)?.[1] ?? JSON.stringify(makeProjects(10)));
      await addRecentProject(makeProject({ path: `/projects/extra-${i}`, name: `extra-${i}` }));
    }

    const lastWrite = mockWriteFile.mock.calls.at(-1)?.[1] as string;
    const written = JSON.parse(lastWrite) as RecentProject[];
    expect(written.length).toBeLessThanOrEqual(10);
  });

  it('never throws — silently handles write failures', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockWriteFile.mockRejectedValue(new Error('write error'));

    await expect(addRecentProject(makeProject())).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// removeRecentProject
// ---------------------------------------------------------------------------

describe('removeRecentProject', () => {
  it('removes the entry at the given index', async () => {
    setStoredProjects(makeProjects(3));

    await removeRecentProject(1);

    const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string) as RecentProject[];
    expect(written).toHaveLength(2);
    expect(written.some((p) => p.path === '/projects/project-1')).toBe(false);
  });

  it('removes first entry (index 0)', async () => {
    setStoredProjects(makeProjects(3));

    await removeRecentProject(0);

    const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string) as RecentProject[];
    expect(written).toHaveLength(2);
    expect(written[0].path).toBe('/projects/project-1');
  });

  it('removes last entry', async () => {
    const projects = makeProjects(3);
    setStoredProjects(projects);

    await removeRecentProject(2);

    const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string) as RecentProject[];
    expect(written).toHaveLength(2);
    expect(written.some((p) => p.path === '/projects/project-2')).toBe(false);
  });

  it('no-ops when index is out of range (too large)', async () => {
    setStoredProjects(makeProjects(2));

    await removeRecentProject(99);

    // Early return: writeFile is not called for out-of-range index
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('no-ops when index is negative', async () => {
    setStoredProjects(makeProjects(2));

    await removeRecentProject(-1);

    // writeFile should not be called for invalid negative index
    // (per implementation: early return when index < 0)
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('never throws', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    await expect(removeRecentProject(0)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// clearRecentProjects
// ---------------------------------------------------------------------------

describe('clearRecentProjects', () => {
  it('writes an empty array to the file', async () => {
    setStoredProjects(makeProjects(5));

    await clearRecentProjects();

    expect(mockWriteFile).toHaveBeenCalledOnce();
    const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string) as RecentProject[];
    expect(written).toEqual([]);
  });

  it('never throws', async () => {
    mockWriteFile.mockRejectedValue(new Error('write error'));

    await expect(clearRecentProjects()).resolves.toBeUndefined();
  });
});
