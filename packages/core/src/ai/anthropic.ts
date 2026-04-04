/**
 * AI Provider — AnthropicProvider
 *
 * Calls Anthropic Messages API via native fetch (no SDK).
 * Uses claude-3-haiku for lightweight, cost-effective summaries.
 */

import type { SummaryProvider, SummaryContext } from '../types.js';
import { buildPrompt, AI_TIMEOUT_MS } from './utils.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-3-haiku-20240307';
const ANTHROPIC_VERSION = '2023-06-01';
const MAX_TOKENS = 300;

export class AnthropicProvider implements SummaryProvider {
  name = 'anthropic';

  constructor(private apiKey?: string) {}

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async summarize(code: string, context: SummaryContext): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured.');
    }

    const { system, user } = buildPrompt(code, context);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          system,
          messages: [{ role: 'user', content: user }],
          max_tokens: MAX_TOKENS,
          temperature: 0.3,
        }),
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
