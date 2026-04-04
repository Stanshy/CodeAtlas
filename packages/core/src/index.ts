/**
 * @codeatlas/core
 *
 * Core library for CodeAtlas — codebase parsing, dependency analysis,
 * and knowledge graph construction.
 *
 * Tree-sitter integration will be added in Sprint 1 / T3.
 */

// Placeholder exports — populated incrementally by downstream tasks.
export * from './types.js';
export * from './parser/index.js';
export * from './scanner/index.js';
export * from './ai/index.js';
export * from './analyzer/index.js';

// Sprint 7 / T5 — explicit re-exports for function-level types
export type { ParsedFunction, ParsedClass } from './parser/function-extractor.js';
export type { CallRelation } from './analyzer/call-analyzer.js';

// Sprint 12 / T2 — directory aggregator
export { aggregateByDirectory } from './analyzers/directory-aggregator.js';
export type {
  DirectoryGraph,
  DirectoryNode,
  DirectoryEdge,
  DirectoryType,
} from './analyzers/directory-aggregator.js';

// Sprint 13 / T2 — API endpoint detector
export { detectEndpoints } from './analyzers/endpoint-detector.js';
export type {
  ApiEndpoint,
  EndpointGraph,
  EndpointChain,
  ChainStep,
  HttpMethod,
} from './analyzers/endpoint-detector.js';
