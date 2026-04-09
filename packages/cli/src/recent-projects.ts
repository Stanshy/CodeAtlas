/**
 * @codeatlas/cli — Recent Projects
 *
 * Reads and writes ~/.codeatlas/recent.json.
 * Maintains a list of the 10 most recently opened projects, newest first.
 * All file operations are wrapped in try-catch and never throw — returns
 * empty arrays and logs warnings on any I/O failure.
 *
 * Sprint 20 T4: recent-projects.ts
 */

import fs from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { RecentProject } from '@codeatlas/core';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RECENT_PROJECTS = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRecentFilePath(): string {
  return path.join(os.homedir(), '.codeatlas', 'recent.json');
}

/**
 * Ensure the ~/.codeatlas directory exists.
 * Silently returns false if creation fails.
 */
function ensureConfigDir(): boolean {
  const dir = path.join(os.homedir(), '.codeatlas');
  try {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Read and parse recent.json.
 * Returns an empty array on any failure (file not found, parse error, etc.).
 */
async function readRecentFile(): Promise<RecentProject[]> {
  const filePath = getRecentFilePath();
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch {
    // File does not exist — normal on first launch
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Validate each entry has the required shape
    return (parsed as unknown[]).filter(
      (item): item is RecentProject =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).path === 'string' &&
        typeof (item as Record<string, unknown>).name === 'string' &&
        typeof (item as Record<string, unknown>).lastOpened === 'string',
    );
  } catch {
    // Malformed JSON — treat as empty
    return [];
  }
}

/**
 * Write projects list to recent.json.
 * Silently swallows any write errors.
 */
async function writeRecentFile(projects: RecentProject[]): Promise<void> {
  if (!ensureConfigDir()) return;
  const filePath = getRecentFilePath();
  try {
    await fs.writeFile(filePath, JSON.stringify(projects, null, 2), 'utf-8');
  } catch (err) {
    console.warn(
      '[recent-projects] Failed to write recent.json:',
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return the list of recently opened projects (newest first, max 10).
 * Never throws — returns [] on any error.
 */
export async function getRecentProjects(): Promise<RecentProject[]> {
  return readRecentFile();
}

/**
 * Add or update a project in the recent list.
 *
 * - If the path already exists, updates `lastOpened` and moves to the top.
 * - If the path is new, prepends it.
 * - Trims the list to MAX_RECENT_PROJECTS (oldest entries dropped).
 *
 * Never throws — silently handles all I/O errors.
 */
export async function addRecentProject(project: RecentProject): Promise<void> {
  let projects = await readRecentFile();

  // Remove existing entry with the same path (case-sensitive)
  projects = projects.filter((p) => p.path !== project.path);

  // Prepend the updated/new entry
  projects.unshift({
    ...project,
    lastOpened: new Date().toISOString(),
  });

  // Enforce maximum list size
  if (projects.length > MAX_RECENT_PROJECTS) {
    projects = projects.slice(0, MAX_RECENT_PROJECTS);
  }

  await writeRecentFile(projects);
}

/**
 * Remove the project at the given index from the recent list.
 * No-ops silently if the index is out of range.
 *
 * Never throws.
 */
export async function removeRecentProject(index: number): Promise<void> {
  const projects = await readRecentFile();

  if (index < 0 || index >= projects.length) return;

  projects.splice(index, 1);
  await writeRecentFile(projects);
}

/**
 * Clear all recent projects.
 * Never throws.
 */
export async function clearRecentProjects(): Promise<void> {
  await writeRecentFile([]);
}
