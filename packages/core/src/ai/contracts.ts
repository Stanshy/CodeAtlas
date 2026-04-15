/**
 * AI Contract Layer — Sprint 14-15
 *
 * Typed schemas for all AI outputs using zod runtime validation.
 * Every AI provider must return data that conforms to these schemas.
 *
 * @module contracts
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// MethodRole — 9 classification categories
// ---------------------------------------------------------------------------

/** Method role enum — 9 categories for classifying function/method purpose */
export const MethodRoleEnum = z.enum([
  'entrypoint',        // route handler, middleware entry
  'business_core',     // core business logic
  'domain_rule',       // business rule validation (calculate, compute, determine)
  'orchestration',     // flow orchestration (calls multiple services)
  'io_adapter',        // DB/API/file I/O
  'validation',        // input validation
  'infra',             // framework config, middleware registration
  'utility',           // helper functions (format, parse, convert)
  'framework_glue',    // framework glue code (ORM builder, query chain)
]);

/** TypeScript type for MethodRole */
export type MethodRole = z.infer<typeof MethodRoleEnum>;

/** All valid MethodRole values as a readonly array */
export const METHOD_ROLES = MethodRoleEnum.options;

// ---------------------------------------------------------------------------
// AI Output Schemas
// ---------------------------------------------------------------------------

/** Method summary — AI output schema for a single method analysis */
export const MethodSummarySchema = z.object({
  /** Node ID matching the GraphNode.id */
  id: z.string(),
  /** Classified role — accept any string for local model flexibility */
  role: z.string().optional().default('utility'),
  /** Confidence score 0-1 */
  confidence: z.number().min(0).max(1).optional().default(0.5),
  /** One-line summary (max 200 chars — relaxed for local models) */
  oneLineSummary: z.string().max(200).optional().default(''),
  /** Business relevance explanation */
  businessRelevance: z.string().nullable().optional(),
  /** Evidence signals used for classification */
  evidence: z.array(z.string()).nullable().optional(),
});
export type MethodSummary = z.infer<typeof MethodSummarySchema>;

/** Method role classification — lighter schema for rule-engine output */
export const MethodRoleClassificationSchema = z.object({
  /** Node ID matching the GraphNode.id */
  id: z.string(),
  /** Classified role */
  role: MethodRoleEnum,
  /** Confidence score 0-1 */
  confidence: z.number().min(0).max(1),
  /** Source signals that led to this classification */
  sourceSignals: z.array(z.string()).optional(),
});
export type MethodRoleClassification = z.infer<typeof MethodRoleClassificationSchema>;

/** Chain explanation — AI output schema for a call chain */
export const ChainExplanationSchema = z.object({
  /** Chain/endpoint identifier */
  chainId: z.string(),
  /** Overall purpose of this call chain */
  overallPurpose: z.string(),
  /** Per-step annotations */
  steps: z.array(z.object({
    /** Step position in chain */
    stepIndex: z.number(),
    /** Method identifier */
    methodId: z.string(),
    /** Human-readable step description (max 60 chars) */
    description: z.string().max(60),
  })),
});
export type ChainExplanation = z.infer<typeof ChainExplanationSchema>;

/** Batch method summary — AI returns multiple method analyses at once */
export const BatchMethodSummarySchema = z.object({
  /** Array of individual method summaries */
  methods: z.array(MethodSummarySchema),
});
export type BatchMethodSummary = z.infer<typeof BatchMethodSummarySchema>;

// ---------------------------------------------------------------------------
// Sprint 15: SF + DJ AI Schemas
// ---------------------------------------------------------------------------

/** Directory summary — SF perspective */
export const DirectorySummarySchema = z.object({
  directoryPath: z.string(),
  role: z.string(),
  oneLineSummary: z.string().max(200),
  keyResponsibilities: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1),
});
export type DirectorySummary = z.infer<typeof DirectorySummarySchema>;

/** Endpoint description — DJ perspective */
export const EndpointDescriptionSchema = z.object({
  endpointId: z.string(),
  method: z.string(),
  path: z.string(),
  chineseDescription: z.string().max(500),
  purpose: z.string().max(200),
  confidence: z.number().min(0).max(1),
});
export type EndpointDescription = z.infer<typeof EndpointDescriptionSchema>;

/** Step detail — DJ right panel */
export const StepDetailSchema = z.object({
  stepIndex: z.number(),
  methodId: z.string(),
  description: z.string().max(200),
  input: z.string().max(200),
  output: z.string().max(200),
  transform: z.string().max(300),
});
export type StepDetail = z.infer<typeof StepDetailSchema>;

// ---------------------------------------------------------------------------
// Validation Helpers — strict (throw on failure)
// ---------------------------------------------------------------------------

/** Parse and validate a MethodSummary, throws ZodError on failure */
export function validateMethodSummary(data: unknown): MethodSummary {
  return MethodSummarySchema.parse(data);
}

/** Parse and validate a BatchMethodSummary, throws ZodError on failure */
export function validateBatchMethodSummary(data: unknown): BatchMethodSummary {
  return BatchMethodSummarySchema.parse(data);
}

/** Parse and validate a ChainExplanation, throws ZodError on failure */
export function validateChainExplanation(data: unknown): ChainExplanation {
  return ChainExplanationSchema.parse(data);
}

// ---------------------------------------------------------------------------
// Validation Helpers — safe (return result object, never throws)
// ---------------------------------------------------------------------------

/** Safely parse a MethodSummary, returns { success, data?, error? } */
export function safeValidateMethodSummary(data: unknown) {
  return MethodSummarySchema.safeParse(data);
}

/** Safely parse a BatchMethodSummary, returns { success, data?, error? } */
export function safeValidateBatchMethodSummary(data: unknown) {
  return BatchMethodSummarySchema.safeParse(data);
}

/** Safely parse a ChainExplanation, returns { success, data?, error? } */
export function safeValidateChainExplanation(data: unknown) {
  return ChainExplanationSchema.safeParse(data);
}

// Strict validators
export function validateDirectorySummary(data: unknown): DirectorySummary {
  return DirectorySummarySchema.parse(data);
}
export function validateEndpointDescription(data: unknown): EndpointDescription {
  return EndpointDescriptionSchema.parse(data);
}
export function validateStepDetail(data: unknown): StepDetail {
  return StepDetailSchema.parse(data);
}

// Safe validators
export function safeValidateDirectorySummary(data: unknown) {
  return DirectorySummarySchema.safeParse(data);
}
export function safeValidateEndpointDescription(data: unknown) {
  return EndpointDescriptionSchema.safeParse(data);
}
export function safeValidateStepDetail(data: unknown) {
  return StepDetailSchema.safeParse(data);
}

// ---------------------------------------------------------------------------
// AI Endpoint Detection — Sprint 24
// ---------------------------------------------------------------------------

/**
 * AI Endpoint Detection Result Schema.
 * Used by AI Fallback Adapter when rule-based adapters find no endpoints.
 * AI analyzes source code to detect API endpoints across any framework.
 */
export const AIEndpointDetectionSchema = z.object({
  endpoints: z.array(z.object({
    /** HTTP method */
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    /** API endpoint path, e.g. /api/users/:id */
    path: z.string(),
    /** Handler function or method name */
    handler: z.string(),
    /** File where the endpoint is defined */
    filePath: z.string(),
    /** Line number of the endpoint definition */
    line: z.number().optional(),
    /** Detected framework name */
    framework: z.string().optional(),
    /** AI confidence in this detection (0-1) */
    confidence: z.number().min(0).max(1),
  })),
  /** Overall detected framework */
  framework: z.string().optional(),
  /** Programming language */
  language: z.string().optional(),
});
export type AIEndpointDetectionResult = z.infer<typeof AIEndpointDetectionSchema>;

/** Parse and validate an AIEndpointDetectionResult, throws ZodError on failure */
export function validateAIEndpointDetection(data: unknown): AIEndpointDetectionResult {
  return AIEndpointDetectionSchema.parse(data);
}

/** Safely parse an AIEndpointDetectionResult, returns { success, data?, error? } */
export function safeValidateAIEndpointDetection(data: unknown) {
  return AIEndpointDetectionSchema.safeParse(data);
}
