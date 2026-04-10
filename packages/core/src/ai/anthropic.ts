/**
 * AI Provider — AnthropicProvider
 *
 * Calls Anthropic Messages API via native fetch (no SDK).
 * Uses claude-3-haiku for lightweight, cost-effective summaries.
 */

import type { SummaryContext } from '../types.js';
import { BaseAnalysisProvider } from './base-analysis-provider.js';
import { buildPrompt, AI_TIMEOUT_MS } from './utils.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const ANTHROPIC_VERSION = '2023-06-01';
const MAX_TOKENS = 16384;

export class AnthropicProvider extends BaseAnalysisProvider {
  name = 'anthropic';

  constructor(private apiKey?: string) { super(); }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Send a raw prompt directly — no system prompt wrapping.
   * Used by wiki concept extraction which provides its own full prompt.
   */
  async rawPrompt(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured.');
    }
    return this._callMessages(undefined, prompt, MAX_TOKENS);
  }

  async summarize(code: string, context: SummaryContext): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured.');
    }
    const { system, user } = buildPrompt(code, context);
    return this._callMessages(system, user, MAX_TOKENS);
  }

  // ---- Shared API call ----

  private async _callMessages(
    system: string | undefined,
    userContent: string,
    maxTokens: number,
  ): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    const payload: Record<string, unknown> = {
      model: ANTHROPIC_MODEL,
      messages: [{ role: 'user', content: userContent }],
      max_tokens: maxTokens,
      temperature: 0.3,
    };
    if (system !== undefined) {
      payload.system = system;
    }

    let response: Response;
    try {
      response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey!,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(`Anthropic request timed out after ${AI_TIMEOUT_MS / 1000}s.`);
      }
      throw new Error(
        `Anthropic network error: ${err instanceof Error ? err.message : 'Request failed'}`,
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      let errorMessage: string;
      try {
        const errorText = await response.text();
        let errorBody: { error?: { message?: string } };
        try {
          errorBody = JSON.parse(errorText) as { error?: { message?: string } };
          errorMessage = errorBody?.error?.message ?? errorText;
        } catch {
          errorMessage = errorText;
        }
      } catch {
        errorMessage = `HTTP ${response.status}`;
      }

      if (response.status === 401) {
        throw new Error(`Anthropic authentication failed: Invalid API key.`);
      }
      if (response.status === 429) {
        throw new Error(`Anthropic rate limit exceeded. Please try again later.`);
      }
      throw new Error(`Anthropic API error (${response.status}): ${errorMessage}`);
    }

    let text: string;
    try {
      text = await response.text();
    } catch {
      throw new Error('Failed to read Anthropic response body.');
    }

    let body: {
      content?: Array<{ type?: string; text?: string }>;
    };
    try {
      body = JSON.parse(text) as typeof body;
    } catch {
      throw new Error('Failed to parse Anthropic response JSON.');
    }

    const textBlock = body?.content?.find((block) => block.type === 'text');
    if (!textBlock?.text) {
      throw new Error('Anthropic returned an empty response.');
    }

    return textBlock.text.trim();
  }
}
