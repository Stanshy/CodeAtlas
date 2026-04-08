/**
 * AI Provider — OpenAIProvider
 *
 * Calls OpenAI Chat Completions API via native fetch (no SDK).
 * Uses gpt-4o-mini for lightweight, cost-effective summaries.
 */

import type { SummaryContext } from '../types.js';
import { BaseAnalysisProvider } from './base-analysis-provider.js';
import { buildPrompt, AI_TIMEOUT_MS } from './utils.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 300;

export class OpenAIProvider extends BaseAnalysisProvider {
  name = 'openai';

  constructor(private apiKey?: string) { super(); }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async summarize(code: string, context: SummaryContext): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured.');
    }

    const { system, user } = buildPrompt(code, context);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          max_tokens: MAX_TOKENS,
          temperature: 0.3,
        }),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(`OpenAI request timed out after ${AI_TIMEOUT_MS / 1000}s.`);
      }
      throw new Error(
        `OpenAI network error: ${err instanceof Error ? err.message : 'Request failed'}`,
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
        throw new Error(`OpenAI authentication failed: Invalid API key.`);
      }
      if (response.status === 429) {
        throw new Error(`OpenAI rate limit exceeded. Please try again later.`);
      }
      throw new Error(`OpenAI API error (${response.status}): ${errorMessage}`);
    }

    let text: string;
    try {
      text = await response.text();
    } catch {
      throw new Error('Failed to read OpenAI response body.');
    }

    let body: {
      choices?: Array<{ message?: { content?: string } }>;
    };
    try {
      body = JSON.parse(text) as typeof body;
    } catch {
      throw new Error('Failed to parse OpenAI response JSON.');
    }

    const content = body?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response.');
    }

    return content.trim();
  }
}
