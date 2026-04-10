/**
 * @codeatlas/cli — wiki command
 *
 * Orchestrates the wiki export pipeline:
 *   1. Resolves and validates the target project directory
 *   2. Runs `analyze()` to obtain an AnalysisResult (or reads a cached analysis.json)
 *   3. Runs `aggregateByDirectory()` and `detectEndpoints()` for additional graphs
 *   4. Calls `exportWiki()` (pure function from @codeatlas/core) to produce in-memory pages
 *   5. Writes all .md files and wiki-manifest.json to the output directory
 *   6. Prints summary stats to stdout
 *
 * Output structure:
 *   .codeatlas/wiki/
 *   ├── wiki-manifest.json
 *   └── concepts/     *.md
 *
 * Sprint 19: Wiki Knowledge Export + Obsidian Knowledge Graph
 */

import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  analyze,
  aggregateByDirectory,
  detectEndpoints,
  exportWiki,
  createProvider,
} from '@codeatlas/core';
import type {
  AnalysisResult,
  WikiExportOptions,
  WikiExporterInput,
  Locale,
} from '@codeatlas/core';
import { setLocale, t } from '../i18n.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface WikiCommandOptions {
  /** Override output directory. Defaults to `<target>/.codeatlas/wiki`. */
  output?: string;
  /** Output locale. Priority: --lang flag > .codeatlas.json locale > CODEATLAS_LANG env > 'en' */
  lang?: string;
}

/**
 * Implementation of the `codeatlas wiki [path]` CLI sub-command.
 *
 * @param targetPath  Directory to analyse. Defaults to `process.cwd()`.
 * @param options     CLI flag values.
 */
export async function wikiCommand(
  targetPath: string | undefined,
  options: WikiCommandOptions,
): Promise<void> {
  const resolvedPath = path.resolve(targetPath ?? process.cwd());

  // --- Guard: target must exist and be a directory ---
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

  // --- Resolve locale: --lang flag > .codeatlas.json locale > CODEATLAS_LANG env > 'en' ---
  const locale: Locale = resolveLocaleForWiki(options.lang, resolvedPath);
  setLocale(locale);

  console.log(t('cli.version'));
  console.log('');
  console.log(t('cli.wiki.heading'));
  console.log(t('cli.wiki.separator'));

  // --- Step 1: Obtain AnalysisResult ---
  // Try reading a cached analysis.json first to avoid re-scanning large projects.
  // If absent, fall back to running a full analysis.
  let analysisResult: AnalysisResult;

  const cachedAnalysisPath = path.join(resolvedPath, '.codeatlas', 'analysis.json');
  let usedCache = false;

  try {
    const raw = await fs.readFile(cachedAnalysisPath, 'utf-8');
    try {
      analysisResult = JSON.parse(raw) as AnalysisResult;
      usedCache = true;
    } catch {
      console.error('Warning: .codeatlas/analysis.json is malformed — re-running analysis.');
      analysisResult = await runAnalysis(resolvedPath);
    }
  } catch {
    // File not found — run a fresh analysis.
    analysisResult = await runAnalysis(resolvedPath);
  }

  if (usedCache) {
    console.log(t('cli.wiki.usingCache'));
  }

  // --- Step 2: Build directory graph and endpoint graph ---
  const fileNodes = analysisResult.graph.nodes.filter((n) => n.type === 'file');
  const allEdges = analysisResult.graph.edges;

  const directoryGraph = aggregateByDirectory(fileNodes, allEdges);
  const endpointGraph = detectEndpoints(analysisResult);

  // --- Step 3: Configure AI provider (required for wiki export) ---
  const configPath = path.join(resolvedPath, '.codeatlas.json');
  let aiProviderName = 'disabled';
  let aiKey: string | undefined;
  let ollamaModel: string | undefined;

  try {
    const configRaw = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configRaw) as Record<string, unknown>;
    if (typeof config.aiProvider === 'string') aiProviderName = config.aiProvider;
    if (typeof config.aiKey === 'string') aiKey = config.aiKey;
    if (typeof config.ollamaModel === 'string') ollamaModel = config.ollamaModel;
  } catch {
    // No config file — will use defaults
  }

  const aiProvider = createProvider(
    aiProviderName,
    aiKey,
    aiProviderName === 'ollama' ? { ollamaModel: ollamaModel ?? 'gemma3:4b' } : undefined,
  );

  if (!aiProvider.isConfigured()) {
    console.error(t('cli.wiki.noAiProvider'));
    console.error(t('cli.wiki.noAiProviderDetail'));
    console.error(t('cli.wiki.noAiProviderHint'));
    process.exit(1);
  }

  // --- Step 4: Run the wiki export pipeline (pure, no I/O) ---
  const exporterInput: WikiExporterInput = {
    analysisResult,
    directoryGraph,
    endpointGraph,
  };

  const wikiOutputDir = options.output
    ? path.resolve(options.output)
    : path.join(resolvedPath, '.codeatlas', 'wiki');

  const exportOptions: WikiExportOptions = {
    outputDir: wikiOutputDir,
    locale,
  };

  let exportResult;
  try {
    exportResult = await exportWiki(exporterInput, aiProvider, exportOptions);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: Wiki export failed — ${message}`);
    process.exit(1);
  }

  const { manifest, mdFiles, stats } = exportResult;

  // --- Step 5: Write .md files to disk ---
  try {
    await fs.mkdir(wikiOutputDir, { recursive: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: Could not create output directory "${wikiOutputDir}" — ${message}`);
    process.exit(1);
  }

  for (const mdFile of mdFiles) {
    const absFilePath = path.join(wikiOutputDir, mdFile.path);
    const absFileDir = path.dirname(absFilePath);

    try {
      await fs.mkdir(absFileDir, { recursive: true });
      await fs.writeFile(absFilePath, mdFile.content, 'utf-8');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error: Could not write "${absFilePath}" — ${message}`);
      process.exit(1);
    }
  }

  // --- Step 6: Write wiki-manifest.json ---
  const manifestPath = path.join(wikiOutputDir, 'wiki-manifest.json');

  try {
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: Could not write wiki-manifest.json — ${message}`);
    process.exit(1);
  }

  // --- Step 7: Print summary stats ---
  const coveragePct = (stats.coverage * 100).toFixed(1);
  const relativeOutput = path.relative(process.cwd(), wikiOutputDir) || wikiOutputDir;

  console.log(`${t('cli.wiki.pages')}     ${stats.pageCount}`);
  console.log(`${t('cli.wiki.links')}     ${stats.linkCount}`);
  console.log(`${t('cli.wiki.deadLinks')} ${stats.deadLinks}`);
  console.log(`${t('cli.wiki.coverage')}  ${coveragePct}%`);
  console.log('');
  console.log(`${t('cli.wiki.output')} ${relativeOutput}/`);
  console.log(t('cli.wiki.complete'));
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Runs the core `analyze()` function and returns the AnalysisResult.
 * Wraps errors with a descriptive message and exits on failure.
 */
async function runAnalysis(projectPath: string): Promise<AnalysisResult> {
  try {
    return await analyze(projectPath, {});
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: Analysis failed — ${message}`);
    process.exit(1);
  }
}

/**
 * Resolve output locale with the priority chain:
 *   --lang flag > .codeatlas.json locale field > CODEATLAS_LANG env > 'en'
 */
function resolveLocaleForWiki(langFlag: string | undefined, projectPath: string): Locale {
  // 1. --lang flag
  if (langFlag === 'zh-TW' || langFlag === 'en') return langFlag;

  // 2. .codeatlas.json locale field
  const configPath = path.join(projectPath, '.codeatlas.json');
  try {
    const raw = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw) as Record<string, unknown>;
    if (config.locale === 'zh-TW' || config.locale === 'en') return config.locale;
  } catch {
    // File missing or malformed — continue to next priority
  }

  // 3. CODEATLAS_LANG env var
  const envLang = process.env.CODEATLAS_LANG;
  if (envLang === 'zh-TW' || envLang === 'en') return envLang;

  // 4. Default
  return 'en';
}
