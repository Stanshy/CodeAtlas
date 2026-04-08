/**
 * AI Provider — OllamaProvider
 *
 * Calls local Ollama API via native fetch (no SDK).
 * Supports any Ollama model (default: codellama).
 * Sprint 6 — T2: OllamaProvider
 */

import type { SummaryContext } from '../types.js';
import { BaseAnalysisProvider } from './base-analysis-provider.js';
import { buildPrompt } from './utils.js';

const OLLAMA_DEFAULT_BASE_URL = 'http://localhost:11434';
const OLLAMA_DEFAULT_MODEL = 'gemma3:4b';
const OLLAMA_TIMEOUT_MS = 300_000; // 300s — local 8B models need generous time for analysis prompts

export interface OllamaProviderOptions {
  baseUrl?: string;
  model?: string;
}

export class OllamaProvider extends BaseAnalysisProvider {
  name = 'ollama';
  private baseUrl: string;
  private model: string;

  constructor(options?: OllamaProviderOptions) {
    super();
    this.baseUrl = options?.baseUrl ?? OLLAMA_DEFAULT_BASE_URL;
    this.model = options?.model ?? OLLAMA_DEFAULT_MODEL;
  }

  /** Ollama doesn't require an API key — always configured if daemon runs */
  isConfigured(): boolean {
    return true;
  }

  /** Expose model name for status endpoint */
  getModel(): string {
    return this.model;
  }

  /**
   * Send a raw prompt directly — no buildPrompt wrapping.
   * Used by BaseAnalysisProvider for analyzeMethodBatch/explainChain.
   */
  async rawPrompt(prompt: string): Promise<string> {
    return this.callOllama(prompt);
  }

  async summarize(code: string, context: SummaryContext): Promise<string> {
    const { system, user } = buildPrompt(code, context);
    const prompt = `${system}\n\n${user}`;
    return this.callOllama(prompt);
  }

  private async callOllama(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
        }),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(
          `Ollama request timed out after ${OLLAMA_TIMEOUT_MS / 1000}s. Check if Ollama is running.`
        );
      }
      // ECONNREFUSED or fetch failed → Ollama not running
      if (isConnectionError(err)) {
        throw new Error(
          'Ollama is not running. Install: https://ollama.ai/download then run: ollama serve'
        );
      }
      throw new Error(
        `Ollama network error: ${err instanceof Error ? err.message : 'Request failed'}`
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 404) {
      throw new Error(
        `Model "${this.model}" not found. Run: ollama pull ${this.model}`
      );
    }

    if (!response.ok) {
      let errorMessage: string;
      try {
        errorMessage = await response.text();
      } catch {
        errorMessage = `HTTP ${response.status}`;
      }
      throw new Error(`Ollama API error (${response.status}): ${errorMessage}`);
    }

    let text: string;
    try {
      text = await response.text();
    } catch {
      throw new Error('Failed to read Ollama response body.');
    }

    let body: { response?: string };
    try {
      body = JSON.parse(text) as { response?: string };
    } catch {
      throw new Error('Failed to parse Ollama response JSON.');
    }

    const content = body?.response;
    if (!content) {
      throw new Error('Ollama returned an empty response.');
    }

    return content.trim();
  }
}

function isConnectionError(err: unknown): boolean {
  if (err instanceof TypeError && err.message.includes('fetch failed')) return true;
  const code = (err as NodeJS.ErrnoException)?.code;
  return code === 'ECONNREFUSED' || code === 'ENOTFOUND';
}
