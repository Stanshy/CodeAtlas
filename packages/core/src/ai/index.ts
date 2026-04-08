/**
 * AI Provider — Barrel + Factory
 *
 * Exports all provider classes and the createProvider() factory function.
 * Callers should always go through createProvider() rather than
 * instantiating provider classes directly, so the binding point stays
 * in one place when real SDK integrations land in Sprint 3.
 */

export { DisabledProvider } from './disabled.js';
export { OpenAIProvider } from './openai.js';
export { AnthropicProvider } from './anthropic.js';
export { OllamaProvider } from './ollama.js';

// Sprint 14 T6: Base Analysis Provider + New Providers
export { BaseAnalysisProvider } from './base-analysis-provider.js';
export { ClaudeCodeProvider } from './claude-code.js';
export { GeminiProvider } from './gemini.js';
export type { OllamaProviderOptions } from './ollama.js';
export { buildPrompt, truncateCode, AI_TIMEOUT_MS } from './utils.js';
export type { SummaryProvider, SummaryContext } from '../types.js';
export { extractStructureInfo, buildOverviewPrompt } from './overview-builder.js';
export type { StructureInfo } from './overview-builder.js';

// Sprint 14: AI Contract Layer
export {
  MethodRoleEnum,
  METHOD_ROLES,
  MethodSummarySchema,
  MethodRoleClassificationSchema,
  ChainExplanationSchema,
  BatchMethodSummarySchema,
  validateMethodSummary,
  validateBatchMethodSummary,
  validateChainExplanation,
  safeValidateMethodSummary,
  safeValidateBatchMethodSummary,
  safeValidateChainExplanation,
} from './contracts.js';
export type {
  MethodRole,
  MethodSummary,
  MethodRoleClassification,
  ChainExplanation,
  BatchMethodSummary,
} from './contracts.js';

// Sprint 15: SF + DJ schemas
export {
  DirectorySummarySchema,
  EndpointDescriptionSchema,
  StepDetailSchema,
  validateDirectorySummary,
  validateEndpointDescription,
  validateStepDetail,
  safeValidateDirectorySummary,
  safeValidateEndpointDescription,
  safeValidateStepDetail,
} from './contracts.js';
export type {
  DirectorySummary,
  EndpointDescription,
  StepDetail,
} from './contracts.js';
export type {
  AIAnalysisProvider,
  PromptBudget,
  MethodContext,
  ChainContext,
} from './types.js';
export { isAnalysisProvider } from './types.js';

// Sprint 14 T2: Method Role Classifier (rule-engine, no AI required)
export { classifyMethodRole } from './method-role-classifier.js';
export type { MethodClassificationInput } from './method-role-classifier.js';

// Sprint 14-15: Prompt Budget & Templates
export {
  BUDGET_LIMITS,
  estimateTokens,
  truncateToTokens,
  buildMethodSignature,
  buildMethodBatchContext,
  buildChainContext,
  buildLargeContext,
} from './prompt-budget.js';
export type { DirectoryInfo } from './prompt-budget.js';
export {
  PROMPT_VERSION,
  buildMethodSummaryPrompt,
  buildRoleClassificationPrompt,
  buildChainExplanationPrompt,
  buildDirectorySummaryPrompt,
  buildEndpointDescriptionPrompt,
  buildStepDetailPrompt,
} from './prompt-templates.js';

// Sprint 16: AI Response Sanitizer
export { sanitizeAIResponse, sanitizeAndValidate } from './response-sanitizer.js';

import { DisabledProvider } from './disabled.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { OllamaProvider } from './ollama.js';
import { ClaudeCodeProvider } from './claude-code.js';
import { GeminiProvider } from './gemini.js';
import type { SummaryProvider } from '../types.js';

/**
 * Options for createProvider — extends the basic apiKey with
 * provider-specific settings (e.g. Ollama baseUrl / model).
 */
export interface CreateProviderOptions {
  apiKey?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
}

/**
 * createProvider
 *
 * Instantiates the requested AI provider.  Unknown names fall back to
 * DisabledProvider so the application never crashes due to a misconfigured
 * provider name.
 *
 * @param name    - 'openai' | 'anthropic' | 'ollama' | 'claude-code' | 'gemini' | any other string → disabled
 * @param apiKey  - Optional API key forwarded to cloud providers (backward compat)
 * @param options - Optional extended options (apiKey + Ollama-specific config)
 */
export function createProvider(
  name: string,
  apiKey?: string,
  options?: CreateProviderOptions,
): SummaryProvider {
  // options.apiKey takes precedence over the positional apiKey for forward-compat
  const resolvedKey = options?.apiKey ?? apiKey;

  switch (name) {
    case 'openai':
      return new OpenAIProvider(resolvedKey);
    case 'anthropic':
      return new AnthropicProvider(resolvedKey);
    case 'ollama': {
      const ollamaOpts: import('./ollama.js').OllamaProviderOptions = {};
      if (options?.ollamaBaseUrl !== undefined) ollamaOpts.baseUrl = options.ollamaBaseUrl;
      if (options?.ollamaModel !== undefined) ollamaOpts.model = options.ollamaModel;
      return new OllamaProvider(ollamaOpts);
    }
    case 'claude-code':
      return new ClaudeCodeProvider();
    case 'gemini':
      return new GeminiProvider(resolvedKey);
    default:
      return new DisabledProvider();
  }
}
