/**
 * BaseAnalysisProvider — Sprint 14
 *
 * Abstract base class providing default AIAnalysisProvider implementations.
 * Legacy providers extend this to gain analyzeMethodBatch/explainChain
 * support via their existing summarize() method.
 */

import type { SummaryContext } from '../types.js';
import type { AIAnalysisProvider, MethodContext, ChainContext, PromptBudget } from './types.js';
import type { BatchMethodSummary, ChainExplanation } from './contracts.js';
import { safeValidateBatchMethodSummary, safeValidateChainExplanation } from './contracts.js';
import { buildMethodBatchContext, buildChainContext } from './prompt-budget.js';
import { buildMethodSummaryPrompt, buildChainExplanationPrompt } from './prompt-templates.js';
import { sanitizeAIResponse } from './response-sanitizer.js';

export abstract class BaseAnalysisProvider implements AIAnalysisProvider {
  abstract name: string;
  abstract isConfigured(): boolean;
  abstract summarize(code: string, context: SummaryContext): Promise<string>;

  /**
   * Send a raw prompt directly to the AI model without wrapping via buildPrompt().
   * Subclasses should override this to call their API directly.
   * Default falls back to summarize() with a passthrough context.
   */
  async rawPrompt(prompt: string): Promise<string> {
    return this.summarize(prompt, { filePath: 'raw', language: 'text', imports: [], exports: [] });
  }

  supportsAnalysis(): boolean {
    return this.isConfigured();
  }

  async analyzeMethodBatch(methods: MethodContext[], budget: PromptBudget): Promise<BatchMethodSummary> {
    const context = buildMethodBatchContext(methods, budget);
    const prompt = buildMethodSummaryPrompt(context);
    const raw = await this.rawPrompt(prompt);
    return this.parseAndValidateBatch(raw);
  }

  async explainChain(chain: ChainContext, budget: PromptBudget): Promise<ChainExplanation> {
    const context = buildChainContext(chain, budget);
    const prompt = buildChainExplanationPrompt(context, chain.endpointId);
    const raw = await this.rawPrompt(prompt);
    return this.parseAndValidateChain(raw);
  }

  protected parseAndValidateBatch(raw: string): BatchMethodSummary {
    const parsed = this.extractJson(raw);
    // AI may return bare array [...] instead of { methods: [...] } — normalize
    const normalized = Array.isArray(parsed) ? { methods: parsed } : parsed;
    const result = safeValidateBatchMethodSummary(normalized);
    if (!result.success) {
      throw new Error(`AI batch response validation failed: ${result.error.message}`);
    }
    return result.data;
  }

  protected parseAndValidateChain(raw: string): ChainExplanation {
    const parsed = this.extractJson(raw);
    const result = safeValidateChainExplanation(parsed);
    if (!result.success) {
      throw new Error(`AI chain response validation failed: ${result.error.message}`);
    }
    return result.data;
  }

  private extractJson(text: string): unknown {
    return sanitizeAIResponse(text);
  }
}
