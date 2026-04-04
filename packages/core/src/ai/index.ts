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
export type { OllamaProviderOptions } from './ollama.js';
export { buildPrompt, truncateCode, AI_TIMEOUT_MS } from './utils.js';
export type { SummaryProvider, SummaryContext } from '../types.js';
export { extractStructureInfo, buildOverviewPrompt } from './overview-builder.js';
export type { StructureInfo } from './overview-builder.js';

import { DisabledProvider } from './disabled.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { OllamaProvider } from './ollama.js';
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
 * @param name    - 'openai' | 'anthropic' | 'ollama' | any other string → disabled
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
    default:
      return new DisabledProvider();
  }
}
