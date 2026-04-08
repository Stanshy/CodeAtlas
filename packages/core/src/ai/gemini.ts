/**
 * AI Provider — GeminiProvider
 *
 * Calls Google Gemini API via native fetch (no SDK).
 * Uses gemini-2.0-flash for fast, cost-effective analysis.
 * Sprint 14 — T5
 */

import type { SummaryContext } from '../types.js';
import type { AIAnalysisProvider, MethodContext, ChainContext, PromptBudget } from './types.js';
import type { BatchMethodSummary, ChainExplanation } from './contracts.js';
import { validateBatchMethodSummary, validateChainExplanation } from './contracts.js';
import { buildPrompt, AI_TIMEOUT_MS } from './utils.js';
import { buildMethodBatchContext, buildChainContext } from './prompt-budget.js';
import { buildMethodSummaryPrompt, buildChainExplanationPrompt } from './prompt-templates.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_DEFAULT_MODEL = 'gemini-2.0-flash';
const MAX_OUTPUT_TOKENS = 2048;

// ---------------------------------------------------------------------------
// Response shape from Gemini REST API
// ---------------------------------------------------------------------------

interface GeminiResponseBody {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

// ---------------------------------------------------------------------------
// GeminiProvider
// ---------------------------------------------------------------------------

export class GeminiProvider implements AIAnalysisProvider {
  name = 'gemini';

  private readonly model: string;

  constructor(
    private readonly apiKey?: string,
    model?: string,
  ) {
    this.model = model ?? GEMINI_DEFAULT_MODEL;
  }

  // ── SummaryProvider contract ──────────────────────────────────────────────

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async summarize(code: string, context: SummaryContext): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured.');
    }

    const { system, user } = buildPrompt(code, context);
    const prompt = `${system}\n\n${user}`;

    return this.callGemini(prompt);
  }

  // ── AIAnalysisProvider contract ───────────────────────────────────────────

  supportsAnalysis(): boolean {
    return true;
  }

  async analyzeMethodBatch(
    methods: MethodContext[],
    budget: PromptBudget,
  ): Promise<BatchMethodSummary> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured.');
    }

    const methodsContext = buildMethodBatchContext(methods, budget);
    const prompt = buildMethodSummaryPrompt(methodsContext);

    const responseText = await this.callGemini(prompt);
    const parsed = this.parseJsonFromResponse(responseText);
    return validateBatchMethodSummary(parsed);
  }

  async explainChain(chain: ChainContext, budget: PromptBudget): Promise<ChainExplanation> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured.');
    }

    const chainContext = buildChainContext(chain, budget);
    const prompt = buildChainExplanationPrompt(chainContext, chain.endpointId);

    const responseText = await this.callGemini(prompt);
    const parsed = this.parseJsonFromResponse(responseText);
    return validateChainExplanation(parsed);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Send a prompt to the Gemini REST API and return the response text.
   *
   * Handles:
   *  - AbortController-based timeout
   *  - HTTP error codes (401 → auth, 429 → rate limit, 5xx → server)
   *  - Response extraction: candidates[0].content.parts[0].text
   */
  private async callGemini(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured.');
    }

    const url = `${GEMINI_API_BASE}/${this.model}:generateContent?key=${this.apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
          },
        }),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(`Gemini request timed out after ${AI_TIMEOUT_MS / 1000}s.`);
      }
      throw new Error(
        `Gemini network error: ${err instanceof Error ? err.message : 'Request failed'}`,
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      let errorMessage: string;
      try {
        const errorText = await response.text();
        let errorBody: GeminiResponseBody;
        try {
          errorBody = JSON.parse(errorText) as GeminiResponseBody;
          errorMessage = errorBody?.error?.message ?? errorText;
        } catch {
          errorMessage = errorText;
        }
      } catch {
        errorMessage = `HTTP ${response.status}`;
      }

      if (response.status === 401) {
        throw new Error(`Gemini authentication failed: Invalid API key.`);
      }
      if (response.status === 429) {
        throw new Error(`Gemini rate limit exceeded. Please try again later.`);
      }
      throw new Error(`Gemini API error (${response.status}): ${errorMessage}`);
    }

    let rawText: string;
    try {
      rawText = await response.text();
    } catch {
      throw new Error('Failed to read Gemini response body.');
    }

    let body: GeminiResponseBody;
    try {
      body = JSON.parse(rawText) as GeminiResponseBody;
    } catch {
      throw new Error('Failed to parse Gemini response JSON.');
    }

    const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini returned an empty response.');
    }

    return text.trim();
  }

  /**
   * Extract a JSON object from an AI response string.
   *
   * Strategy:
   *  1. Try JSON.parse directly (model returned pure JSON).
   *  2. Regex extraction: find the first {...} block (model wrapped JSON in prose
   *     or markdown code fences).
   *  3. Throw if neither succeeds.
   */
  private parseJsonFromResponse(text: string): unknown {
    // Attempt 1 — direct parse
    try {
      return JSON.parse(text);
    } catch {
      // fall through
    }

    // Attempt 2 — extract first {...} block (handles markdown fences and prose)
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // fall through
      }
    }

    throw new Error(
      `Gemini response did not contain valid JSON. Raw response: ${text.slice(0, 200)}`,
    );
  }
}
