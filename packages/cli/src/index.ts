/**
 * @codeatlas/cli
 *
 * Entry point for the CodeAtlas command-line interface.
 */

import { Command } from 'commander';
import { analyzeCommand } from './commands/analyze.js';
import { webCommand } from './commands/web.js';
import { wikiCommand } from './commands/wiki.js';
import { setLocale, resolveLocale } from './i18n.js';

const program = new Command();

program
  .name('code-atlas')
  .description('CodeAtlas — codebase analysis and navigation tool')
  .version('0.0.1')
  .option('-l, --lang <locale>', 'Output language (en, zh-TW)', 'en');

program
  .command('analyze [path]')
  .description('Analyze a codebase and build the knowledge graph')
  .option('--verbose', 'show detailed scan logs', false)
  .option('--ignore <dirs...>', 'additional directories to ignore', [])
  .action(async (targetPath: string | undefined, options: { verbose: boolean; ignore: string[] }) => {
    await analyzeCommand(targetPath, options);
  });

program
  .command('web [path]')
  .description('Start a local server and open the web UI for a project')
  .option('--port <number>', 'port to listen on', '3004')
  .option('--ai-key <key>', 'API key for AI provider (not recommended — visible in shell history, prefer env vars)')
  .option('--ai-provider <name>', 'AI provider (ollama | openai | anthropic | disabled)', 'disabled')
  .option('--ollama-model <name>', 'Ollama model name', 'codellama')
  .action(async (
    targetPath: string | undefined,
    options: { port?: string; aiKey?: string; aiProvider?: string; ollamaModel?: string },
  ) => {
    const port = options.port !== undefined ? parseInt(options.port, 10) : 3000;
    if (isNaN(port) || port < 1 || port > 65535) {
      console.error(`Error: Invalid port "${options.port}". Must be a number between 1 and 65535.`);
      process.exit(1);
    }
    await webCommand(targetPath, {
      port,
      aiKey: options.aiKey,
      aiProvider: options.aiProvider,
      ollamaModel: options.ollamaModel,
    });
  });

program
  .command('wiki [path]')
  .description('Export a wiki knowledge base from the codebase to Markdown files')
  .option('--output <dir>', 'output directory for wiki files (default: .codeatlas/wiki)')
  .option('-l, --lang <locale>', 'Output language for wiki content (en, zh-TW)', 'en')
  .option('--ai', 'enable AI deep analysis (T10 integration)', false)
  .action(async (
    targetPath: string | undefined,
    options: { output?: string; lang?: string; ai?: boolean },
  ) => {
    await wikiCommand(targetPath, {
      ...(options.output !== undefined && { output: options.output }),
      ...(options.lang !== undefined && { lang: options.lang }),
    });
  });

// ---------------------------------------------------------------------------
// Sprint 20 T6: Zero-arg launch
//
// When `codeatlas` is invoked with no subcommand, behave like `codeatlas web`
// with no path — server starts in idle mode, browser auto-opens to welcome page.
// ---------------------------------------------------------------------------

program
  .action(async () => {
    // This action fires only when no sub-command is recognised.
    // Default port mirrors the `web` command default.
    await webCommand(undefined, { port: 3004 });
  });

// ---------------------------------------------------------------------------
// Global locale resolution
// Set locale from root --lang option before any command action runs.
// ---------------------------------------------------------------------------

program.hook('preAction', () => {
  const opts = program.opts<{ lang?: string }>();
  const localeOpts: { lang?: string } = opts.lang !== undefined ? { lang: opts.lang } : {};
  setLocale(resolveLocale(localeOpts));
});

program.parse(process.argv);
