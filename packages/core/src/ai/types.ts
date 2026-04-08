/**
 * AI Provider — Type Definitions
 *
 * Re-exports the shared SummaryProvider contract and defines the
 * extended AIAnalysisProvider interface for Sprint 14+ AI features.
 *
 * @module ai/types
 */

export type { SummaryProvider, SummaryContext } from '../types.js';

import type { SummaryProvider } from '../types.js';
import type { BatchMethodSummary, ChainExplanation, MethodRole } from './contracts.js';

// ---------------------------------------------------------------------------
// Prompt Budget
// ---------------------------------------------------------------------------

/** AI prompt budget — controls context size sent to provider */
export type PromptBudget = 'small' | 'medium' | 'large';

// ---------------------------------------------------------------------------
// Input Contexts — passed to AI Provider methods
// ---------------------------------------------------------------------------

/** Method context for AI analysis — one method's metadata + optional code */
export interface MethodContext {
  /** GraphNode.id */
  nodeId: string;
  /** Method/function name */
  name: string;
  /** Relative file path */
  filePath: string;
  /** Function kind (function, method, getter, etc.) */
  kind?: string;
  /** Parameter list */
  parameters?: Array<{ name: string; type?: string }>;
  /** Return type annotation */
  returnType?: string;
  /** Whether the function is async */
  isAsync?: boolean;
  /** Whether the function is exported */
  isExported?: boolean;
  /** Line count of function body */
  lineCount?: number;
  /** Truncated code snippet (controlled by prompt budget) */
  codeSnippet?: string;
}

/** Chain context for AI chain explanation */
export interface ChainContext {
  /** Endpoint identifier */
  endpointId: string;
  /** HTTP method (GET/POST/etc.) */
  method: string;
  /** API path */
  path: string;
  /** Chain steps with optional pre-classified roles */
  steps: Array<{
    name: string;
    className?: string;
    fileId: string;
    role?: MethodRole;
  }>;
}

// ---------------------------------------------------------------------------
// AIAnalysisProvider — extends SummaryProvider (backward compatible)
// ---------------------------------------------------------------------------

/**
 * Extended AI provider interface for method/chain analysis.
 *
 * Extends the base SummaryProvider so existing summarize() calls still work.
 * New Sprint 14+ features use analyzeMethodBatch() and explainChain().
 */
export interface AIAnalysisProvider extends SummaryProvider {
  /** Batch-analyze method roles and generate summaries */
  analyzeMethodBatch(methods: MethodContext[], budget: PromptBudget): Promise<BatchMethodSummary>;

  /** Explain a call chain's purpose and annotate each step */
  explainChain(chain: ChainContext, budget: PromptBudget): Promise<ChainExplanation>;

  /** Whether this provider supports analysis (false for DisabledProvider) */
  supportsAnalysis(): boolean;
}

// ---------------------------------------------------------------------------
// Type Guard
// ---------------------------------------------------------------------------

/**
 * Type guard: check if a SummaryProvider is an AIAnalysisProvider.
 *
 * Use this to safely access analysis methods without changing createProvider()'s
 * return type (keeping backward compatibility).
 */
export function isAnalysisProvider(provider: SummaryProvider): provider is AIAnalysisProvider {
  return (
    'supportsAnalysis' in provider &&
    typeof (provider as AIAnalysisProvider).supportsAnalysis === 'function'
  );
}
