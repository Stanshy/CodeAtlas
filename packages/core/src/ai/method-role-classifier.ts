/**
 * @codeatlas/core — Method Role Classifier
 *
 * Sprint 14: Pure-function heuristic classifier that assigns a semantic
 * `MethodRole` to each method/function based on name patterns, file-path
 * patterns, parameter signatures, return types, and call-graph metrics.
 *
 * The algorithm has 9 ordered rules; the first rule that fires wins.
 * Confidence is derived from the number of matching signals:
 *   1 signal  → 0.6
 *   2 signals → 0.8
 *   3+ signals → 0.95
 */

import { INFRA_DIRS } from '../analyzer/role-classifier.js';
import type { MethodRole, MethodRoleClassification } from './contracts.js';

// ---------------------------------------------------------------------------
// Public input interface
// ---------------------------------------------------------------------------

/** Input descriptor for a single method/function to be classified. */
export interface MethodClassificationInput {
  /** Method or function name. */
  name: string;
  /** Relative file path (used for directory-pattern matching). */
  filePath: string;
  /** Whether the method is exported from its module. */
  isExported?: boolean;
  /** Whether the method is declared async. */
  isAsync?: boolean;
  /** Parameter list with optional type annotations. */
  parameters?: Array<{ name: string; type?: string }>;
  /** Return-type annotation string (e.g. "boolean", "Promise<number>"). */
  returnType?: string;
  /** Number of distinct functions/methods this method calls (out-degree). */
  callOutDegree?: number;
  /** Optional raw code snippet used for ORM/builder pattern detection. */
  codeSnippet?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Split a file path on `/` or `\`, lowercase every segment, and return the
 * array.  Cross-platform safe for both POSIX and Windows paths.
 */
function pathSegments(filePath: string): string[] {
  return filePath.split(/[/\\]/).map((s) => s.toLowerCase());
}

/**
 * Return true if any parameter name matches the classic HTTP context
 * conventions: req, res, ctx, request, response, context, next.
 */
function hasParamPattern(
  params: Array<{ name: string; type?: string }> | undefined,
): boolean {
  if (!params || params.length === 0) return false;
  const HTTP_PARAM_RE = /^(req|res|ctx|request|response|context|next)$/i;
  return params.some((p) => HTTP_PARAM_RE.test(p.name));
}

/**
 * Return true if any directory segment of the path is found in the given Set.
 */
function dirIn(segments: string[], set: Set<string>): boolean {
  // segments includes the filename as the last entry; skip it for dir checks
  const dirs = segments.slice(0, -1);
  return dirs.some((seg) => set.has(seg));
}

/**
 * Map a signal count to a confidence score.
 *   1 → 0.60
 *   2 → 0.80
 *   3+ → 0.95
 */
function signalsToConfidence(count: number): number {
  if (count >= 3) return 0.95;
  if (count >= 2) return 0.8;
  return 0.6;
}

/**
 * Build a stable-enough id from the file path and method name.
 * The id is intentionally cheap (no hashing) — it just needs to be unique
 * within a single analysis run.
 */
function buildId(filePath: string, name: string): string {
  return `${filePath}#${name}`;
}

// ---------------------------------------------------------------------------
// Directory sets specific to this classifier (reused from role-classifier)
// ---------------------------------------------------------------------------

/** Routes / controllers directory names — used in Rule 1. */
const ROUTE_CONTROLLER_DIRS = new Set(['routes', 'controllers', 'handlers', 'api']);

/** Services directory name — used in Rules 5 and 6. */
const SERVICES_DIRS = new Set(['services']);

/** Services + features directory names — used in Rule 6. */
const SERVICES_FEATURES_DIRS = new Set(['services', 'features']);

// ---------------------------------------------------------------------------
// ORM / builder pattern detector
// ---------------------------------------------------------------------------

/** Regex that matches common ORM/query-builder chained calls. */
const ORM_PATTERN_RE =
  /\.(select|where|join|leftJoin|rightJoin|innerJoin|orderBy|groupBy|having|limit|offset|from|insert|update|delete|find|findOne|findAll|findAndCount|createQueryBuilder|getRepository|query)\s*\(/i;

/** Regex that matches builder `.build()` or `.execute()` terminal calls. */
const BUILDER_TERMINAL_RE = /\.(build|execute|run|toSql|getRawMany|getMany|getOne)\s*\(/i;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Classify a single method/function into one of the 9 `MethodRole` categories
 * using a 9-rule heuristic algorithm.
 *
 * The function is pure (no I/O, no side effects).
 *
 * @param input  Descriptor for the method to classify.
 * @returns      A `MethodRoleClassification` with id, role, confidence, and
 *               the source signals that triggered the winning rule.
 */
export function classifyMethodRole(
  input: MethodClassificationInput,
): MethodRoleClassification {
  const { name, filePath, isExported, isAsync, parameters, returnType, callOutDegree, codeSnippet } = input;

  const segments = pathSegments(filePath);
  const lowerName = name.toLowerCase();

  // -------------------------------------------------------------------------
  // Rule 1 — entrypoint
  // filePath in routes/controllers dirs AND (isExported OR has req/res/ctx params)
  // -------------------------------------------------------------------------
  {
    const signals: string[] = [];
    if (dirIn(segments, ROUTE_CONTROLLER_DIRS)) signals.push('path:routes-controllers');
    if (isExported) signals.push('isExported');
    if (hasParamPattern(parameters)) signals.push('params:req-res-ctx');

    // Must have the path signal, plus at least one of the qualifier signals
    if (signals.includes('path:routes-controllers') && signals.length >= 2) {
      return result('entrypoint', signals, filePath, name);
    }
  }

  // -------------------------------------------------------------------------
  // Rule 2 — io_adapter
  // name matches db*/fetch*/save*/query*/find* OR filePath in models/db dirs
  // -------------------------------------------------------------------------
  {
    const IO_NAME_RE = /^(db|fetch|save|query|find|get|load|store|persist|retrieve|insert|update|delete|remove|upsert)/i;
    const IO_PATH_DIRS = new Set(['models', 'db', 'database', 'repositories', 'repository', 'dao']);

    const signals: string[] = [];
    if (IO_NAME_RE.test(lowerName)) signals.push('name:io-prefix');
    if (dirIn(segments, IO_PATH_DIRS)) signals.push('path:models-db');

    if (signals.length >= 1) {
      return result('io_adapter', signals, filePath, name);
    }
  }

  // -------------------------------------------------------------------------
  // Rule 3 — validation
  // name matches validate*/check*/assert*/sanitize*
  // -------------------------------------------------------------------------
  {
    const VALIDATION_NAME_RE = /^(validate|check|assert|sanitize|verify|ensure|isValid|canAccess)/i;
    if (VALIDATION_NAME_RE.test(lowerName)) {
      return result('validation', ['name:validation-prefix'], filePath, name);
    }
  }

  // -------------------------------------------------------------------------
  // Rule 4 — domain_rule
  // name matches calculate*/compute*/determine* AND returns boolean/number
  // -------------------------------------------------------------------------
  {
    const DOMAIN_NAME_RE = /^(calculate|compute|determine|derive|evaluate|resolve|transform|apply|process)/i;
    const BOOL_OR_NUM_RE = /^(boolean|bool|number|int|integer|float|double|decimal|bigint|Promise<boolean>|Promise<number>)/i;

    const signals: string[] = [];
    if (DOMAIN_NAME_RE.test(lowerName)) signals.push('name:domain-prefix');
    if (returnType && BOOL_OR_NUM_RE.test(returnType.trim())) signals.push('returnType:boolean-number');

    if (signals.includes('name:domain-prefix') && signals.includes('returnType:boolean-number')) {
      return result('domain_rule', signals, filePath, name);
    }
  }

  // -------------------------------------------------------------------------
  // Rule 5 — orchestration
  // callOutDegree >= 3 AND isAsync AND filePath in services dir
  // -------------------------------------------------------------------------
  {
    const signals: string[] = [];
    if (callOutDegree !== undefined && callOutDegree >= 3) signals.push('callOutDegree:>=3');
    if (isAsync) signals.push('isAsync');
    if (dirIn(segments, SERVICES_DIRS)) signals.push('path:services');

    if (signals.length === 3) {
      return result('orchestration', signals, filePath, name);
    }
  }

  // -------------------------------------------------------------------------
  // Rule 6 — business_core
  // isExported AND filePath in services/features dirs
  // -------------------------------------------------------------------------
  {
    const signals: string[] = [];
    if (isExported) signals.push('isExported');
    if (dirIn(segments, SERVICES_FEATURES_DIRS)) signals.push('path:services-features');

    if (signals.length === 2) {
      return result('business_core', signals, filePath, name);
    }
  }

  // -------------------------------------------------------------------------
  // Rule 7 — infra
  // filePath in config/infra/setup dirs OR name matches configure*/register*/setup*
  // -------------------------------------------------------------------------
  {
    const INFRA_NAME_RE = /^(configure|register|setup|init|initialize|bootstrap|mount|install|plug)/i;

    const signals: string[] = [];
    if (dirIn(segments, INFRA_DIRS)) signals.push('path:infra-config');
    if (INFRA_NAME_RE.test(lowerName)) signals.push('name:infra-prefix');

    if (signals.length >= 1) {
      return result('infra', signals, filePath, name);
    }
  }

  // -------------------------------------------------------------------------
  // Rule 8 — framework_glue
  // codeSnippet has ORM patterns OR builder pattern
  // -------------------------------------------------------------------------
  if (codeSnippet) {
    const signals: string[] = [];
    if (ORM_PATTERN_RE.test(codeSnippet)) signals.push('code:orm-chain');
    if (BUILDER_TERMINAL_RE.test(codeSnippet)) signals.push('code:builder-terminal');

    if (signals.length >= 1) {
      return result('framework_glue', signals, filePath, name);
    }
  }

  // -------------------------------------------------------------------------
  // Rule 9 — utility (default fallback)
  // -------------------------------------------------------------------------
  return result('utility', ['default:fallback'], filePath, name);
}

// ---------------------------------------------------------------------------
// Internal result factory
// ---------------------------------------------------------------------------

function result(
  role: MethodRole,
  sourceSignals: string[],
  filePath: string,
  name: string,
): MethodRoleClassification {
  return {
    id: buildId(filePath, name),
    role,
    confidence: signalsToConfidence(sourceSignals.length),
    sourceSignals,
  };
}
