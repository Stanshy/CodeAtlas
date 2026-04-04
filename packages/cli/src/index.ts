/**
 * @codeatlas/cli
 *
 * Entry point for the CodeAtlas command-line interface.
 */

import { Command } from 'commander';
import { analyzeCommand } from './commands/analyze.js';
import { webCommand } from './commands/web.js';

const program = new Command();

program
  .name('codeatlas')
  .description('CodeAtlas — codebase analysis and navigation tool')
  .version('0.1.0');

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

program.parse(process.argv);
