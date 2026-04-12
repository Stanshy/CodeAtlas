/**
 * @codeatlas/cli — web command
 *
 * Starts a local Fastify server that serves the web UI and the analysis JSON
 * API.  If `.codeatlas/analysis.json` does not yet exist the command
 * automatically runs `analyze` first so the user gets a fully populated UI
 * on first launch.
 */

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { analyzeCommand } from './analyze.js';
import { startServer } from '../server.js';
import { resolveConfig } from '../config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Open a URL in the default system browser.
 * Uses platform-specific commands; falls back silently on failure.
 */
function openBrowser(url: string): void {
  try {
    // Windows
    if (process.platform === 'win32') {
      execSync(`start "" "${url}"`, { stdio: 'ignore' });
      return;
    }
    // macOS
    if (process.platform === 'darwin') {
      execSync(`open "${url}"`, { stdio: 'ignore' });
      return;
    }
    // Linux / others
    execSync(`xdg-open "${url}"`, { stdio: 'ignore' });
  } catch {
    // Opening the browser is best-effort; swallow errors.
  }
}

/**
 * Resolve the `packages/web/` directory that contains `index.html`.
 *
 * When the CLI is built with tsup the compiled JS lands in
 * `packages/cli/dist/commands/web.js`.  The web package lives two directories
 * up from `cli/` at `packages/web/`.
 *
 * Development layout (ts-node / tsx):
 *   __dirname → packages/cli/src/commands
 *   web dir   → packages/web
 *
 * Production layout (after tsup build — tsup flattens output):
 *   __dirname → packages/cli/dist
 *   web dir   → packages/web
 */
function resolveWebDir(): string {
  // Walk up from __dirname to find the monorepo root, then resolve packages/web/dist.
  //   Development (tsx):  __dirname = packages/cli/src/commands → 4 levels up
  //   Production (tsup):  __dirname = packages/cli/dist         → 3 levels up
  // Strategy: walk up until we find pnpm-workspace.yaml (monorepo root marker).
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return path.join(dir, 'packages', 'web', 'dist');
    }
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  // Fallback: original heuristic (3 levels up)
  return path.join(path.resolve(__dirname, '..', '..', '..'), 'packages', 'web', 'dist');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface WebCommandOptions {
  port?: number;
  aiKey?: string | undefined;
  aiProvider?: string | undefined;
  ollamaModel?: string | undefined;
}

/**
 * Implementation of the `codeatlas web [path]` CLI sub-command.
 *
 * When `targetPath` is undefined the server starts in `mode='idle'` —
 * the web UI shows the welcome page and the user picks a project there.
 *
 * When `targetPath` is provided the existing behaviour is preserved:
 * auto-analyze if needed, then start in `mode='ready'`.
 *
 * @param targetPath  Directory to serve. Omit for idle (welcome page) mode.
 * @param options     CLI flag values.
 */
export async function webCommand(
  targetPath: string | undefined,
  options: WebCommandOptions,
): Promise<void> {
  // --- Idle mode: no path provided ---
  if (targetPath === undefined) {
    return webCommandIdle(options);
  }

  // --- Path mode: existing behaviour ---
  return webCommandWithPath(targetPath, options);
}

/**
 * Start server in idle mode (welcome page, no project pre-loaded).
 */
async function webCommandIdle(options: WebCommandOptions): Promise<void> {
  const cliOptions: import('../config.js').CliOptions = {};
  if (options.port !== undefined) cliOptions.port = options.port;
  if (options.aiKey !== undefined) cliOptions.aiKey = options.aiKey;
  if (options.aiProvider !== undefined) cliOptions.aiProvider = options.aiProvider;
  if (options.ollamaModel !== undefined) cliOptions.ollamaModel = options.ollamaModel;

  // Resolve config without a project path (use cwd as a placeholder for port resolution)
  const config = resolveConfig(cliOptions, process.cwd());
  const port = config.port;

  // --- Resolve static directory ---
  const staticDir = resolveWebDir();

  try {
    await fs.access(staticDir);
  } catch {
    console.error(
      `Error: Web UI directory not found at "${staticDir}".\n` +
        `Make sure packages/web/ exists in the repository.`,
    );
    process.exit(1);
  }

  // Use a placeholder analysisPath — it will be overridden when the user
  // triggers POST /api/project/analyze from the welcome page.
  const placeholderAnalysisPath = path.join(process.cwd(), '.codeatlas', 'analysis.json');

  try {
    const serverOpts: import('../server.js').ServerOptions = {
      port,
      analysisPath: placeholderAnalysisPath,
      staticDir,
      mode: 'idle',
    };
    if (config.aiKey !== undefined) serverOpts.aiKey = config.aiKey;
    if (config.aiProvider !== undefined) serverOpts.aiProvider = config.aiProvider;
    if (config.ollamaModel !== undefined) serverOpts.ollamaModel = config.ollamaModel;
    await startServer(serverOpts);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: Failed to start server — ${message}`);
    process.exit(1);
  }

  const url = `http://localhost:${port}`;

  console.log('CodeAtlas v0.1.0');
  console.log('');
  console.log(`Server  : ${url}`);
  console.log('');
  console.log('Select a project in the browser to get started.');
  console.log('Press Ctrl+C to stop.');

  openBrowser(url);

  process.on('SIGINT', () => {
    console.log('');
    console.log('Shutting down...');
    process.exit(0);
  });

  await new Promise<never>(() => {
    // intentionally left empty — process lives until SIGINT
  });
}

/**
 * Start server with a specific project path (original behaviour).
 */
async function webCommandWithPath(
  targetPath: string,
  options: WebCommandOptions,
): Promise<void> {
  const resolvedPath = path.resolve(targetPath);
  const cliOptions: import('../config.js').CliOptions = {};
  if (options.port !== undefined) cliOptions.port = options.port;
  if (options.aiKey !== undefined) cliOptions.aiKey = options.aiKey;
  if (options.aiProvider !== undefined) cliOptions.aiProvider = options.aiProvider;
  if (options.ollamaModel !== undefined) cliOptions.ollamaModel = options.ollamaModel;
  const config = resolveConfig(cliOptions, resolvedPath);
  const port = config.port;
  const aiKey = config.aiKey;
  const aiProvider = config.aiProvider;
  const ollamaModel = config.ollamaModel;

  // --- Guard: target must exist ---
  try {
    const stat = await fs.stat(resolvedPath);
    if (!stat.isDirectory()) {
      console.error(`Error: "${resolvedPath}" is not a directory.`);
      process.exit(1);
    }
  } catch {
    console.error(`Error: Path does not exist — "${resolvedPath}"`);
    process.exit(1);
  }

  const analysisPath = path.join(resolvedPath, '.codeatlas', 'analysis.json');

  // --- Auto-analyze if analysis.json is missing ---
  let analysisExists = false;
  try {
    await fs.access(analysisPath);
    analysisExists = true;
  } catch {
    analysisExists = false;
  }

  if (!analysisExists) {
    console.log('No analysis found. Running analyze first...');
    console.log('');
    await analyzeCommand(resolvedPath, { verbose: false, ignore: [] });
    console.log('');
  }

  // --- Resolve static directory ---
  const staticDir = resolveWebDir();

  // Verify the web directory exists (it should always be present in the repo)
  try {
    await fs.access(staticDir);
  } catch {
    console.error(
      `Error: Web UI directory not found at "${staticDir}".\n` +
        `Make sure packages/web/ exists in the repository.`,
    );
    process.exit(1);
  }

  // --- Start Fastify server ---
  try {
    const serverOpts: import('../server.js').ServerOptions = { port, analysisPath, staticDir, mode: 'ready' };
    if (aiKey !== undefined) serverOpts.aiKey = aiKey;
    if (aiProvider !== undefined) serverOpts.aiProvider = aiProvider;
    if (ollamaModel !== undefined) serverOpts.ollamaModel = ollamaModel;
    await startServer(serverOpts);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: Failed to start server — ${message}`);
    process.exit(1);
  }

  const url = `http://localhost:${port}`;

  console.log('CodeAtlas v0.1.0');
  console.log('');
  console.log(`Project : ${resolvedPath}`);
  console.log(`Server  : ${url}`);
  console.log('');
  console.log('Press Ctrl+C to stop.');

  // --- Open browser ---
  openBrowser(url);

  // --- Graceful shutdown on SIGINT (Ctrl+C) ---
  process.on('SIGINT', () => {
    console.log('');
    console.log('Shutting down...');
    process.exit(0);
  });

  // Keep the process alive (the Fastify server libuv handles remain active,
  // but we guard with an explicit wait loop so the promise never resolves).
  await new Promise<never>(() => {
    // intentionally left empty — process lives until SIGINT
  });
}
