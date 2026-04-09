/**
 * AI Provider — Claude Code CLI
 *
 * Uses the locally installed `claude` CLI binary to run analysis.
 * Spawns: claude -p <prompt> --output-format json
 * Sprint 14 — T4
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { SummaryContext } from '../types.js';
import type { AIAnalysisProvider, MethodContext, ChainContext, PromptBudget } from './types.js';
import type { BatchMethodSummary, ChainExplanation } from './contracts.js';
import { validateBatchMethodSummary, validateChainExplanation } from './contracts.js';
import { buildPrompt } from './utils.js';
import { buildMethodBatchContext, buildChainContext } from './prompt-budget.js';
import { buildMethodSummaryPrompt, buildChainExplanationPrompt } from './prompt-templates.js';

const execFileAsync = promisify(execFile);
const CLAUDE_TIMEOUT_MS = 60_000; // 60s for CLI

export class ClaudeCodeProvider implements AIAnalysisProvider {
  name = 'claude-code';
  private binaryPath: string | null = null;

  isConfigured(): boolean {
    return true; // Claude CLI doesn't need API key, just binary
  }

  supportsAnalysis(): boolean {
    return true;
  }

  async summarize(code: string, context: SummaryContext): Promise<string> {
    const binary = await this.findBinary();
    const { system, user } = buildPrompt(code, context);
    const prompt = `${system}\n\n${user}`;
    return this.execClaude(binary, prompt);
  }

  async analyzeMethodBatch(methods: MethodContext[], budget: PromptBudget): Promise<BatchMethodSummary> {
    const binary = await this.findBinary();
    const context = buildMethodBatchContext(methods, budget);
    const prompt = buildMethodSummaryPrompt(context);
    const raw = await this.execClaude(binary, prompt);
    const parsed = this.parseJsonFromResponse(raw);
    return validateBatchMethodSummary(parsed);
  }

  async explainChain(chain: ChainContext, budget: PromptBudget): Promise<ChainExplanation> {
    const binary = await this.findBinary();
    const context = buildChainContext(chain, budget);
    const prompt = buildChainExplanationPrompt(context, chain.endpointId);
    const raw = await this.execClaude(binary, prompt);
    const parsed = this.parseJsonFromResponse(raw);
    return validateChainExplanation(parsed);
  }

  // --- internal ---

  private async findBinary(): Promise<string> {
    if (this.binaryPath) return this.binaryPath;

    // Windows: where claude / Unix: which claude
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    try {
      const { stdout } = await execFileAsync(cmd, ['claude'], { timeout: 5_000 });
      const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length === 0) throw new Error('claude binary not found');

      // On Windows, prefer .exe > .cmd > bare name (bare name causes ENOENT with execFile)
      if (process.platform === 'win32') {
        const exePath = lines.find((l) => l.endsWith('.exe'));
        if (exePath) { this.binaryPath = exePath; return exePath; }
        const cmdPath = lines.find((l) => l.endsWith('.cmd'));
        if (cmdPath) { this.binaryPath = cmdPath; return cmdPath; }
      }

      this.binaryPath = lines[0]!;
      return this.binaryPath;
    } catch {
      // PATH search failed — try Windows APPDATA fallback before giving up
      if (process.platform === 'win32') {
        const appData = process.env['APPDATA'];
        if (appData) {
          const fallbackPath = join(appData, 'npm', 'claude.cmd');
          if (existsSync(fallbackPath)) {
            this.binaryPath = fallbackPath;
            return fallbackPath;
          }
        }
      }

      throw new Error(
        'Claude Code CLI not found. Install: npm install -g @anthropic-ai/claude-code'
      );
    }
  }

  private async execClaude(binary: string, prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);

    try {
      const { stdout, stderr } = await execFileAsync(
        binary,
        ['-p', prompt, '--output-format', 'json'],
        {
          timeout: CLAUDE_TIMEOUT_MS,
          maxBuffer: 10 * 1024 * 1024, // 10MB
          signal: controller.signal,
        },
      );

      // Log stderr as warnings — it does not affect stdout parsing.
      // Only a non-zero exit code (caught below) promotes stderr to an error.
      if (stderr) {
        console.warn('Claude CLI stderr:', stderr.trim());
      }

      const raw = stdout.trim();

      // Empty stdout: degrade gracefully — callers will receive {} from zod validation.
      if (!raw) {
        console.warn('Claude CLI returned empty output');
        return '{}';
      }

      // Claude CLI --output-format json wraps the actual response:
      // { "type": "result", "result": "<actual content string>", ... }
      // Unwrap here so all callers get the actual content.
      try {
        const wrapper = JSON.parse(raw) as Record<string, unknown>;
        if (wrapper.type === 'result' && typeof wrapper.result === 'string') {
          return wrapper.result;
        }
      } catch {
        // Not a wrapper — return raw
      }

      return raw;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('TIMEOUT')) {
        throw new Error(`Claude Code CLI timed out after ${CLAUDE_TIMEOUT_MS / 1000}s.`);
      }
      throw new Error(
        `Claude Code CLI error: ${err instanceof Error ? err.message : 'Execution failed'}`
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Strip markdown code fences (```json ... ``` or ``` ... ```) from a string.
   */
  private stripMarkdownFences(text: string): string {
    return text
      .replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/m, '$1')
      .trim();
  }

  /**
   * Parse JSON from Claude CLI response.
   * The CLI with --output-format json wraps the result; we need to extract
   * the actual content and parse the JSON within.
   *
   * Handles:
   *  - Direct JSON (object or array)
   *  - Markdown code fences (```json ... ```)
   *  - CLI wrapper { type: "result", result: "..." }
   *  - Bare JSON object/array embedded in prose
   */
  private parseJsonFromResponse(raw: string): unknown {
    // 1. Try direct JSON parse first (object or array)
    try {
      return JSON.parse(raw);
    } catch {
      // noop — try further strategies
    }

    // 2. Strip markdown code fences and retry
    const stripped = this.stripMarkdownFences(raw);
    if (stripped !== raw) {
      try {
        return JSON.parse(stripped);
      } catch {
        // noop
      }
    }

    // 3. Claude CLI --output-format json returns { result: "..." }
    //    where result is the text content — unwrap and parse inner value
    try {
      const wrapper = JSON.parse(raw) as { result?: string };
      if (wrapper.result) {
        const inner = this.stripMarkdownFences(wrapper.result);
        return JSON.parse(inner);
      }
    } catch {
      // noop
    }

    // 4. Try to find an embedded JSON object {...} in the response
    const objectMatch = raw.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // noop
      }
    }

    // 5. Try to find an embedded JSON array [...] in the response
    const arrayMatch = raw.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {
        // noop
      }
    }

    throw new Error('Failed to parse JSON from Claude Code CLI response.');
  }
}
