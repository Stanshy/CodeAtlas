/**
 * @codeatlas/core — API Endpoint Detector
 *
 * Sprint 13 / T2: Identifies API endpoint definitions (Express / Fastify) from
 * file source code using regex-based pattern matching, and builds request-chain
 * graphs by BFS-traversing `call` edges from each endpoint handler.
 *
 * Supported patterns:
 *   • Express Router: `router.(get|post|…)('/path', ...)`
 *   • Express App:    `app.(get|post|…)('/path', ...)`
 *   • Fastify shorthand: `fastify.(get|post|…)('/path', ...)`
 *   • Fastify route: `fastify.route({ method: …, url: …, handler: … })`
 *
 * Non-web projects (no routes detected) return null from `detectEndpoints`.
 */

import fs from 'node:fs';
import path from 'node:path';

import type { GraphNode, AnalysisResult } from '../types.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ApiEndpoint {
  /** Composite ID — e.g. `POST /api/v1/videos/upload` */
  id: string;
  method: HttpMethod;
  /** URL path — e.g. `/api/v1/videos/upload` */
  path: string;
  /** Name of the handler function extracted from source */
  handler: string;
  /** File node ID where the handler is defined */
  handlerFileId: string;
  middlewares?: string[];
  description?: string;
}

export interface ChainStep {
  /** Display name — e.g. `check_upload_quota()` */
  name: string;
  description?: string;
  /** Method/function name without parentheses */
  method: string;
  /** Parent class name, if available */
  className?: string;
  /** File node ID where this function lives */
  fileId: string;
  input?: string;
  output?: string;
  transform?: string;
}

export interface EndpointChain {
  endpointId: string;
  steps: ChainStep[];
}

export interface EndpointGraph {
  endpoints: ApiEndpoint[];
  chains: EndpointChain[];
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/** HTTP methods we recognise (lower-case, as they appear in source). */
const HTTP_METHODS_RE = 'get|post|put|delete|patch';

/**
 * Maximum BFS depth when tracing a handler's call chain.
 * Sprint 13 spec: truncate at depth 10.
 */
const MAX_CHAIN_DEPTH = 10;

// ---------------------------------------------------------------------------
// Regex patterns
// ---------------------------------------------------------------------------

/**
 * Matches shorthand route registrations for Express and Fastify:
 *   router.get('/path', handler)
 *   app.post('/path', mw1, mw2, handler)
 *   fastify.delete('/path', opts, handler)
 *
 * Capture groups:
 *   [1] HTTP method (lower-case)
 *   [2] URL path string (single or double-quoted)
 *   [3] Remaining argument list (handlers / middleware names)
 */
const SHORTHAND_ROUTE_RE = new RegExp(
  `(?:router|app|fastify)\\.(${HTTP_METHODS_RE})\\(\\s*['"\`]([^'"\`]+)['"\`]\\s*,([^)]+)`,
  'gi',
);

/**
 * Matches Python decorator-based route registrations (FastAPI / Flask / Sanic):
 *   @router.get("/path")
 *   @app.post("/path")
 *   @router.api_route("/path", methods=["POST"])
 *
 * Capture groups:
 *   [1] HTTP method (lower-case)
 *   [2] URL path string
 * The handler function name is extracted from the next `def` or `async def` line.
 */
const PYTHON_DECORATOR_RE = new RegExp(
  `@(?:router|app|blueprint|bp)\\.(${HTTP_METHODS_RE})\\(\\s*['"]([^'"]+)['"]`,
  'gi',
);

/**
 * Matches the function definition following a Python decorator.
 * Captures the function name from `def funcName(` or `async def funcName(`.
 */
const PYTHON_DEF_RE = /(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/;

/**
 * Matches `fastify.route({ … })` blocks.
 * We capture the entire options object then extract method/url/handler separately.
 *
 * This regex captures the first brace-delimited object after `.route(`.
 * Note: handles objects that span up to ~30 lines.
 */
const FASTIFY_ROUTE_BLOCK_RE = /fastify\.route\(\s*\{([^}]+)\}/gi;

/** Extract `method: 'POST'` or `method: "POST"` from a route block. */
const ROUTE_BLOCK_METHOD_RE = /method\s*:\s*['"`]([A-Za-z]+)['"`]/i;

/** Extract `url: '/path'` or `url: "/path"` from a route block. */
const ROUTE_BLOCK_URL_RE = /url\s*:\s*['"`]([^'"`]+)['"`]/i;

/** Extract `handler: functionName` from a route block. */
const ROUTE_BLOCK_HANDLER_RE = /handler\s*:\s*([A-Za-z_$][\w$]*)/i;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Normalise an HTTP method string to the canonical upper-case form.
 * Returns `null` for unrecognised methods.
 */
function normaliseMethod(raw: string): HttpMethod | null {
  const upper = raw.toUpperCase();
  const valid: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  return valid.includes(upper as HttpMethod) ? (upper as HttpMethod) : null;
}

/**
 * Parse handler / middleware names from the argument list that follows the
 * path string in a shorthand route call.
 *
 * e.g. `authMiddleware, validateBody, uploadHandler`
 *   → middlewares: ['authMiddleware', 'validateBody']
 *   → handler:     'uploadHandler'
 *
 * Anonymous functions (`function(…)`, `async (…) =>`, `(req, res) =>`)
 * are represented as `<anonymous>`.
 */
function parseHandlerArgs(argList: string): { handler: string; middlewares: string[] } {
  // Split by comma, trim whitespace around each token
  const tokens = argList
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    // Strip trailing closing-paren artefacts from the regex capture
    .map((t) => t.replace(/\)+$/, '').trim())
    .filter((t) => t.length > 0);

  const names: string[] = [];
  for (const token of tokens) {
    if (/^[A-Za-z_$][\w$.]*$/.test(token)) {
      names.push(token);
    } else if (/function|=>/.test(token)) {
      names.push('<anonymous>');
    }
    // Skip object literals, options objects, etc.
  }

  if (names.length === 0) {
    return { handler: '<anonymous>', middlewares: [] };
  }

  const handler = names[names.length - 1]!;
  const middlewares = names.slice(0, -1);
  return { handler, middlewares };
}

/**
 * Read the source code for a file node.
 *
 * Strategy:
 *   1. Attempt to read the file from disk using `analysis.projectPath + node.filePath`.
 *   2. On any error return an empty string (the detector skips the file gracefully).
 */
function readSourceCode(analysis: AnalysisResult, node: GraphNode): string {
  try {
    const absolutePath = path.join(analysis.projectPath, node.filePath);
    return fs.readFileSync(absolutePath, 'utf-8');
  } catch {
    return '';
  }
}

/**
 * Extract all endpoints defined in a single source file.
 *
 * Returns an array of partial ApiEndpoint objects (without `id`).
 */
function extractEndpointsFromSource(
  source: string,
  fileNode: GraphNode,
): Omit<ApiEndpoint, 'id'>[] {
  const results: Omit<ApiEndpoint, 'id'>[] = [];

  // --- Pattern 1: shorthand router/app/fastify.{method}(path, ...) ---
  const shorthandRe = new RegExp(SHORTHAND_ROUTE_RE.source, 'gi');
  let match: RegExpExecArray | null;

  while ((match = shorthandRe.exec(source)) !== null) {
    const rawMethod = match[1];
    const routePath = match[2];
    const argList = match[3] ?? '';

    if (!rawMethod || !routePath) continue;

    const method = normaliseMethod(rawMethod);
    if (!method) continue;

    const { handler, middlewares } = parseHandlerArgs(argList);

    const partialEndpoint: Omit<ApiEndpoint, 'id'> = {
      method,
      path: routePath,
      handler,
      handlerFileId: fileNode.id,
    };
    if (middlewares.length > 0) {
      partialEndpoint.middlewares = middlewares;
    }
    results.push(partialEndpoint);
  }

  // --- Pattern 2: Python decorator @router.get("/path") / @app.post("/path") ---
  const pyDecoratorRe = new RegExp(PYTHON_DECORATOR_RE.source, 'gi');
  const sourceLines = source.split('\n');

  while ((match = pyDecoratorRe.exec(source)) !== null) {
    const rawMethod = match[1];
    const routePath = match[2];

    if (!rawMethod || !routePath) continue;

    const method = normaliseMethod(rawMethod);
    if (!method) continue;

    // Find the handler function name: scan lines after the decorator
    const decoratorOffset = match.index;
    let lineIdx = source.substring(0, decoratorOffset).split('\n').length; // 1-based
    let handlerName = '<anonymous>';

    // Look at next 5 lines for a `def` or `async def`
    for (let i = lineIdx; i < Math.min(lineIdx + 5, sourceLines.length); i++) {
      const defMatch = PYTHON_DEF_RE.exec(sourceLines[i] ?? '');
      if (defMatch) {
        handlerName = defMatch[1] ?? '<anonymous>';
        break;
      }
    }

    // Extract description from docstring (first """ block after def)
    let description: string | undefined;
    for (let i = lineIdx; i < Math.min(lineIdx + 10, sourceLines.length); i++) {
      const line = sourceLines[i] ?? '';
      if (line.includes('"""')) {
        const docContent = line.replace(/.*"""/, '').replace(/""".*/, '').trim();
        if (docContent) {
          description = docContent;
        }
        break;
      }
    }

    const partialEndpoint: Omit<ApiEndpoint, 'id'> = {
      method,
      path: routePath,
      handler: handlerName,
      handlerFileId: fileNode.id,
    };
    if (description) {
      partialEndpoint.description = description;
    }
    results.push(partialEndpoint);
  }

  // --- Pattern 3: fastify.route({ method, url, handler }) ---
  const routeBlockRe = new RegExp(FASTIFY_ROUTE_BLOCK_RE.source, 'gi');
  while ((match = routeBlockRe.exec(source)) !== null) {
    const block = match[1] ?? '';

    const methodMatch = ROUTE_BLOCK_METHOD_RE.exec(block);
    const urlMatch = ROUTE_BLOCK_URL_RE.exec(block);
    const handlerMatch = ROUTE_BLOCK_HANDLER_RE.exec(block);

    if (!methodMatch || !urlMatch) continue;

    const method = normaliseMethod(methodMatch[1] ?? '');
    if (!method) continue;

    const routePath = urlMatch[1] ?? '';
    const handler = handlerMatch ? (handlerMatch[1] ?? '<anonymous>') : '<anonymous>';

    results.push({
      method,
      path: routePath,
      handler,
      handlerFileId: fileNode.id,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Chain building
// ---------------------------------------------------------------------------

/**
 * Build a ChainStep from a function/class graph node.
 */
function nodeToChainStep(node: GraphNode): ChainStep {
  // Derive method name: strip trailing `()` artefacts from label if present
  const methodName = node.label.replace(/\(\)$/, '');

  // className: try metadata.kind === 'method' parent, or derive from label
  const fileId = node.metadata.parentFileId ?? node.filePath;

  return {
    name: `${methodName}()`,
    method: methodName,
    fileId,
  };
}

/**
 * BFS from a handler function node, following `call` edges.
 *
 * Returns an ordered array of ChainSteps (the handler itself is NOT included
 * — it is already represented by the endpoint entry).
 *
 * Stops when:
 *   • All reachable nodes have been visited
 *   • Depth reaches MAX_CHAIN_DEPTH
 */
function buildChainSteps(
  handlerNodeId: string,
  nodeMap: Map<string, GraphNode>,
  callAdjacency: Map<string, string[]>,
): ChainStep[] {
  const steps: ChainStep[] = [];
  const visited = new Set<string>([handlerNodeId]);
  // Queue entries: [nodeId, depth]
  const queue: [string, number][] = [[handlerNodeId, 0]];

  while (queue.length > 0) {
    const entry = queue.shift();
    if (!entry) break;
    const [currentId, depth] = entry;

    if (depth >= MAX_CHAIN_DEPTH) continue;

    const callees = callAdjacency.get(currentId) ?? [];
    for (const calleeId of callees) {
      if (visited.has(calleeId)) continue;
      visited.add(calleeId);

      const calleeNode = nodeMap.get(calleeId);
      if (!calleeNode) continue;

      steps.push(nodeToChainStep(calleeNode));
      queue.push([calleeId, depth + 1]);
    }
  }

  return steps;
}

// ---------------------------------------------------------------------------
// Python chain-step filter — skip sets for noise suppression
// ---------------------------------------------------------------------------

/**
 * Comprehensive set of names that should never appear as chain steps.
 * Built once at module load for O(1) lookup everywhere.
 *
 * Categories (keep sections in sync with task spec):
 *   1. Python builtins
 *   2. Python exceptions
 *   3. SQLAlchemy core / ORM keywords
 *   4. SQLAlchemy result-accessor methods
 *   5. Pydantic / FastAPI primitives
 *   6. datetime / uuid / logging
 *   7. typing helpers
 *   8. Generic single-word method noise
 *   9. ORM session management
 *  10. Python dunder methods
 *  11. Test / assert helpers
 */
const PYTHON_SKIP_NAMES = new Set<string>([
  // 1. Python builtins
  'print', 'len', 'range', 'int', 'str', 'float', 'bool', 'dict', 'list',
  'set', 'tuple', 'type', 'isinstance', 'issubclass', 'hasattr', 'getattr',
  'setattr', 'delattr', 'super', 'enumerate', 'zip', 'map', 'filter',
  'sorted', 'reversed', 'any', 'all', 'min', 'max', 'sum', 'abs', 'round',
  'id', 'hash', 'repr', 'format', 'open', 'next', 'iter', 'vars', 'dir',
  'globals', 'locals', 'callable', 'property', 'staticmethod', 'classmethod',
  'object', 'bytes', 'bytearray', 'memoryview', 'complex',

  // 2. Python exceptions
  'Exception', 'ValueError', 'TypeError', 'KeyError', 'AttributeError',
  'RuntimeError', 'NotImplementedError', 'StopIteration', 'IndexError',
  'IOError', 'OSError', 'FileNotFoundError', 'ImportError', 'PermissionError',
  'OverflowError', 'ZeroDivisionError', 'NameError', 'UnicodeDecodeError',
  'UnicodeEncodeError', 'AssertionError', 'SystemExit', 'GeneratorExit',
  'BufferError', 'ArithmeticError', 'LookupError',

  // 3. SQLAlchemy core / ORM keywords
  'select', 'where', 'join', 'outerjoin', 'order_by', 'limit', 'offset',
  'scalar_one', 'scalar_one_or_none', 'scalars', 'execute', 'subquery',
  'desc', 'asc', 'func', 'and_', 'or_', 'not_', 'column', 'table', 'text',
  'literal', 'case', 'cast', 'distinct', 'exists', 'union', 'intersect',
  'except_', 'alias', 'label', 'group_by', 'having', 'between', 'in_',
  'like', 'ilike', 'contains', 'startswith', 'endswith', 'nulls_first',
  'nulls_last', 'collate', 'over', 'within_group', 'returning', 'values',
  'insert', 'update', 'delete', 'create_engine', 'sessionmaker',
  'relationship', 'backref', 'mapped_column', 'ForeignKey', 'Column',
  'Integer', 'String', 'Boolean', 'DateTime', 'Float', 'Text', 'JSON',
  'Enum', 'Index', 'UniqueConstraint', 'PrimaryKeyConstraint',
  'CheckConstraint', 'declarative_base', 'DeclarativeBase',

  // 4. SQLAlchemy result-accessor methods
  'all', 'first', 'one', 'one_or_none', 'fetchone', 'fetchall', 'fetchmany',
  'rowcount', 'close', 'scalar', 'unique', 'partitions', 'columns', 'mappings',

  // 5. Pydantic / FastAPI primitives
  'BaseModel', 'Field', 'Depends', 'HTTPException', 'status', 'Query',
  'Path', 'Body', 'Header', 'Cookie', 'Form', 'File', 'UploadFile',
  'Request', 'Response', 'JSONResponse', 'HTMLResponse', 'RedirectResponse',
  'StreamingResponse', 'BackgroundTasks', 'APIRouter', 'FastAPI',
  'FileResponse', 'PlainTextResponse', 'ORJSONResponse', 'UJSONResponse',
  'model_validate', 'model_dump', 'model_dump_json', 'model_fields',
  'model_config', 'validator', 'field_validator', 'model_validator',

  // 6. datetime / uuid / logging
  'datetime', 'date', 'time', 'timedelta', 'timezone',
  'now', 'today', 'utcnow', 'fromtimestamp', 'strftime', 'strptime',
  'combine', 'isoformat', 'timestamp', 'total_seconds', 'astimezone',
  'uuid4', 'uuid1', 'UUID',
  'logger', 'log', 'debug', 'info', 'warning', 'error', 'critical',
  'exception', 'getLogger', 'basicConfig', 'setLevel',

  // 7. typing helpers
  'Optional', 'Union', 'List', 'Dict', 'Set', 'Tuple', 'Any', 'Type',
  'Callable', 'Generator', 'AsyncGenerator', 'Iterator', 'AsyncIterator',
  'Sequence', 'Mapping', 'MutableMapping', 'Iterable', 'ClassVar',
  'TypeVar', 'Generic', 'Protocol', 'Literal', 'Final', 'Annotated',
  'cast', 'overload', 'dataclass',

  // 8. Generic single-word method noise (CRUD / string / IO / dict ops)
  'get', 'put', 'post', 'patch', 'add', 'remove', 'pop', 'append',
  'extend', 'clear', 'copy', 'keys', 'items', 'encode', 'decode',
  'strip', 'lstrip', 'rstrip', 'split', 'rsplit', 'join', 'replace',
  'lower', 'upper', 'title', 'capitalize', 'find', 'rfind', 'index',
  'rindex', 'count', 'read', 'write', 'flush', 'seek', 'tell', 'readline',
  'readlines', 'writelines', 'truncate', 'fileno', 'isatty',
  'json', 'text', 'content', 'status_code', 'headers', 'raise_for_status',
  'request', 'response', 'value', 'name', 'data', 'result', 'output',

  // 9. ORM session / transaction management
  'commit', 'rollback', 'begin', 'begin_nested', 'refresh', 'expire',
  'merge', 'expunge', 'expunge_all', 'identity_map', 'bind', 'connection',
  'transaction', 'savepoint', 'in_transaction', 'get_bind',

  // 10. Python dunder methods (bare names that can leak through)
  '__init__', '__str__', '__repr__', '__eq__', '__hash__', '__len__',
  '__iter__', '__next__', '__enter__', '__exit__', '__getitem__',
  '__setitem__', '__delitem__', '__contains__', '__call__', '__new__',
  '__del__', '__bool__', '__int__', '__float__', '__add__', '__sub__',
  '__mul__', '__truediv__', '__floordiv__', '__mod__', '__pow__',
  '__lt__', '__le__', '__gt__', '__ge__', '__ne__',

  // 11. Test / assert helpers
  'assert', 'assertEqual', 'assertTrue', 'assertFalse', 'assertRaises',
  'assertIn', 'assertNotIn', 'assertIsNone', 'assertIsNotNone',
  'assertAlmostEqual', 'mock', 'patch', 'fixture', 'setup', 'teardown',
  'setUp', 'tearDown', 'MagicMock', 'Mock', 'call', 'ANY',
]);

/**
 * Method names that are noise regardless of the object they are called on.
 * These cover the dotted-call pattern `obj.method()` — if the method portion
 * is in this set, the entire call is suppressed.
 *
 * This is intentionally a superset of common SQLAlchemy chained methods,
 * ORM accessors, string helpers, and HTTP result accessors.
 */
const PYTHON_SKIP_METHODS = new Set<string>([
  // SQLAlchemy chaining
  'where', 'filter', 'order_by', 'limit', 'offset', 'join', 'outerjoin',
  'having', 'group_by', 'distinct', 'subquery', 'alias', 'label',
  'scalar_one', 'scalar_one_or_none', 'scalars', 'execute', 'fetchone',
  'fetchall', 'fetchmany', 'all', 'first', 'one', 'one_or_none', 'scalar',
  'unique', 'partitions', 'mappings', 'rowcount',
  'desc', 'asc', 'nulls_first', 'nulls_last', 'over', 'within_group',
  'returning', 'values', 'ilike', 'like', 'in_', 'notin_', 'between',
  'contains', 'startswith', 'endswith', 'is_', 'is_not', 'any_', 'has',
  // Session / transaction
  'commit', 'rollback', 'flush', 'refresh', 'expire', 'merge', 'begin',
  'begin_nested', 'expunge', 'close', 'add',
  // Logging
  'debug', 'info', 'warning', 'error', 'critical', 'exception', 'log',
  // HTTP / response
  'json', 'text', 'content', 'status_code', 'headers', 'raise_for_status',
  'iter_content', 'iter_lines',
  // datetime / time
  'now', 'today', 'utcnow', 'fromtimestamp', 'strftime', 'strptime',
  'combine', 'isoformat', 'timestamp', 'total_seconds', 'astimezone',
  'replace', 'date', 'time', 'weekday', 'isocalendar',
  // String
  'strip', 'lstrip', 'rstrip', 'split', 'rsplit', 'join', 'lower', 'upper',
  'title', 'capitalize', 'find', 'rfind', 'index', 'count', 'encode',
  'decode', 'format', 'format_map', 'zfill', 'ljust', 'rjust', 'center',
  // Dict / list / set / generic
  'get', 'set', 'put', 'pop', 'append', 'extend', 'clear', 'copy',
  'keys', 'values', 'items', 'update', 'remove', 'discard', 'add',
  'sort', 'reverse',
  // File / stream IO
  'read', 'write', 'readline', 'readlines', 'writelines', 'flush',
  'seek', 'tell', 'close', 'fileno', 'truncate',
  // Pydantic model helpers
  'model_dump', 'model_dump_json', 'model_validate', 'dict', 'json',
  'schema', 'schema_json', 'parse_obj', 'parse_raw',
  // Generic noise
  'value', 'name', 'data', 'result', 'output', 'reset',
]);

/**
 * Object (receiver) names whose method calls are unconditionally noise.
 * e.g. `stmt.where(...)`, `db.execute(...)`, `session.commit(...)`.
 */
const PYTHON_SKIP_RECEIVERS = new Set<string>([
  // SQLAlchemy query objects
  'stmt', 'query', 'subq', 'subquery', 'q', 'sq',
  // Session / engine / connection
  'db', 'session', 'conn', 'connection', 'engine', 'cursor',
  // Logging
  'logger', 'log',
  // HTTP clients / responses
  'response', 'resp', 'res', 'req', 'request',
  'client', 'async_client', 'http',
  // datetime constructors used as receivers
  'datetime', 'date', 'time', 'timedelta', 'timezone',
  // uuid
  'uuid',
  // Pydantic / validation
  'model', 'schema',
  // Email / column fragments commonly seen in SQLAlchemy filters
  'email', 'username', 'user_id', 'created_at', 'updated_at', 'id',
  'status', 'role', 'name', 'title', 'slug',
]);

// ---------------------------------------------------------------------------
// Python file scanner (disk-based, for projects not in the JS/TS graph)
// ---------------------------------------------------------------------------

/**
 * Recursively find all .py files under a directory, skipping common
 * non-source directories.
 */
function findPythonFiles(dir: string, maxDepth = 8, depth = 0): string[] {
  if (depth >= maxDepth) return [];
  const SKIP = new Set([
    'node_modules', '.venv', 'venv', '__pycache__', '.git', 'dist',
    'build', '.next', 'coverage', '.cache', '.tox', '.eggs', 'egg-info',
  ]);

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const result: string[] = [];
  for (const entry of entries) {
    if (SKIP.has(entry.name) || entry.name.endsWith('.egg-info')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...findPythonFiles(fullPath, maxDepth, depth + 1));
    } else if (entry.isFile() && entry.name.endsWith('.py')) {
      result.push(fullPath);
    }
  }
  return result;
}

/**
 * Build synthetic chain steps from a Python handler function body.
 *
 * Heuristic: look for function calls in the handler body (lines between
 * the `def` line and the next `def` / `@` / end-of-file). Extract
 * `await some_function(...)` and `some_function(...)` patterns.
 *
 * Filtering strategy (applied in order, cheapest checks first):
 *   1. Skip lines that are comments or string literals.
 *   2. Skip anything whose function name starts with `_` (private/dunder).
 *   3. Skip when the function name is in PYTHON_SKIP_NAMES (O(1) set lookup).
 *   4. Skip when the receiver object is in PYTHON_SKIP_RECEIVERS (always noise).
 *   5. Skip when the method name is in PYTHON_SKIP_METHODS (dotted-call noise).
 *   6. Skip single-character identifiers (loop variables, etc.).
 *   7. Skip ALL-CAPS identifiers (constants, not calls).
 *
 * Target: ≤10 steps per chain for a typical FastAPI endpoint.
 */
function buildPythonChainSteps(
  source: string,
  handlerName: string,
  relativeFilePath: string,
  _projectPath: string,
): ChainStep[] {
  const lines = source.split('\n');
  const steps: ChainStep[] = [];

  // Find the handler def line
  let startLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const defMatch = /(?:async\s+)?def\s+(\w+)\s*\(/.exec(lines[i] ?? '');
    if (defMatch && defMatch[1] === handlerName) {
      startLine = i + 1;
      break;
    }
  }
  if (startLine === -1) return steps;

  // Collect function body lines (indented lines until next top-level def/decorator)
  const bodyLines: string[] = [];
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i] ?? '';
    // Stop at next top-level def or decorator
    if (/^(?:@|(?:async\s+)?def\s)/.test(line)) break;
    bodyLines.push(line);
  }

  // Regex: capture optional receiver (`obj.`) and the function/method name
  const callRe = /(?:await\s+)?(?:(\w+)\.)?(\w+)\s*\(/g;
  const seen = new Set<string>();

  for (const line of bodyLines) {
    // Skip comment lines and lines that are clearly string literals / docstrings
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) continue;
    if (trimmed.startsWith('"') || trimmed.startsWith("'")) continue;

    const localCallRe = new RegExp(callRe.source, 'g');
    let callMatch: RegExpExecArray | null;

    while ((callMatch = localCallRe.exec(line)) !== null) {
      const obj = callMatch[1];       // receiver object, may be undefined
      const funcName = callMatch[2]!; // always present due to regex

      // --- Filter 1: private / dunder names ---
      if (funcName.startsWith('_')) continue;
      if (obj && obj.startsWith('_')) continue;

      // --- Filter 2: single-character noise (loop vars, slice indices, etc.) ---
      if (funcName.length <= 1) continue;

      // --- Filter 3: ALL_CAPS constants (e.g. MAX_RETRIES, HTTP_OK) ---
      if (/^[A-Z][A-Z0-9_]+$/.test(funcName)) continue;

      // --- Filter 4: funcName is a known-noise name ---
      if (PYTHON_SKIP_NAMES.has(funcName)) continue;

      // --- Filter 5: receiver object is unconditional noise ---
      if (obj && PYTHON_SKIP_RECEIVERS.has(obj)) continue;

      // --- Filter 6: the method (right-hand side of dot) is method-level noise ---
      // Applies to dotted calls like `stmt.where(...)`, `result.scalar_one(...)`,
      // `session.commit(...)`, `email.ilike(...)`, `created_at.desc()`.
      if (obj && PYTHON_SKIP_METHODS.has(funcName)) continue;

      // --- Filter 7: receiver is a known-noise name (same as funcName check but for obj) ---
      if (obj && PYTHON_SKIP_NAMES.has(obj)) continue;

      // --- Filter 8: PascalCase class instantiation without receiver (Pydantic models, exceptions) ---
      // Matches names like VideoUploadData, HTTPException, UserModel — bare PascalCase constructors
      // that are data transfer objects or exception classes, not business logic.
      if (!obj && /^[A-Z]/.test(funcName)) continue;

      // --- Filter 9: two-character or fewer funcName without receiver ---
      // Catches `in()`, `id()` etc. that leak through single-char filter
      if (!obj && funcName.length <= 2) continue;

      // --- Filter 10: generic single-word noise not in skip list ---
      if (!obj && /^(page|quota|body|user|plan|videos|article|parameters|resolve|downloaded|import|success_response|id_token)$/.test(funcName)) continue;

      const key = obj ? `${obj}.${funcName}` : funcName;
      if (seen.has(key)) continue;
      seen.add(key);

      // Try to resolve the file where this function is defined via import analysis
      let fileId = relativeFilePath;
      const importRe = new RegExp(`from\\s+([\\w.]+)\\s+import\\s+.*\\b${funcName}\\b`);
      const importMatch = importRe.exec(source);
      if (importMatch) {
        const modulePath = (importMatch[1] ?? '').replace(/\./g, '/');
        fileId = `${modulePath}.py`;
      }

      steps.push({
        name: `${key}()`,
        method: funcName,
        className: obj,
        fileId,
      });
    }
  }

  return steps;
}

/**
 * Scan Python files directly from disk for API endpoint definitions.
 * Used when JS/TS scanning finds no endpoints.
 */
function scanPythonEndpoints(projectPath: string): ApiEndpoint[] {
  const pyFiles = findPythonFiles(projectPath);
  const results: ApiEndpoint[] = [];

  for (const fullPath of pyFiles) {
    let source: string;
    try {
      source = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      continue;
    }

    // Only scan files that look like route files
    if (!/@(?:router|app|blueprint|bp)\.(get|post|put|delete|patch)\(/i.test(source)) continue;

    const relativePath = path.relative(projectPath, fullPath).replace(/\\/g, '/');

    const pyRe = new RegExp(PYTHON_DECORATOR_RE.source, 'gi');
    const sourceLines = source.split('\n');
    let match: RegExpExecArray | null;

    while ((match = pyRe.exec(source)) !== null) {
      const rawMethod = match[1];
      const routePath = match[2];
      if (!rawMethod || !routePath) continue;

      const method = normaliseMethod(rawMethod);
      if (!method) continue;

      // Find handler function name from next def line
      const decoratorOffset = match.index;
      const lineIdx = source.substring(0, decoratorOffset).split('\n').length;
      let handlerName = '<anonymous>';

      for (let i = lineIdx; i < Math.min(lineIdx + 5, sourceLines.length); i++) {
        const defMatch = PYTHON_DEF_RE.exec(sourceLines[i] ?? '');
        if (defMatch) {
          handlerName = defMatch[1] ?? '<anonymous>';
          break;
        }
      }

      const id = `${method} ${routePath}`;
      if (results.some((e) => e.id === id)) continue;

      results.push({
        id,
        method,
        path: routePath,
        handler: handlerName,
        handlerFileId: relativePath,
      });
    }
  }

  return results;
}

/**
 * Build synthetic chains for Python endpoints (no graph call edges available).
 * Uses heuristic function-call extraction from handler body.
 */
function buildPythonChains(
  endpoints: ApiEndpoint[],
  projectPath: string,
): EndpointChain[] {
  const chains: EndpointChain[] = [];

  for (const endpoint of endpoints) {
    if (endpoint.handler === '<anonymous>') {
      chains.push({ endpointId: endpoint.id, steps: [] });
      continue;
    }

    const fullPath = path.join(projectPath, endpoint.handlerFileId);
    let source: string;
    try {
      source = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      chains.push({ endpointId: endpoint.id, steps: [] });
      continue;
    }

    const steps = buildPythonChainSteps(
      source,
      endpoint.handler,
      endpoint.handlerFileId,
      projectPath,
    );
    chains.push({ endpointId: endpoint.id, steps });
  }

  return chains;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect API endpoints across all file nodes in the analysis result and
 * build a request-chain graph.
 *
 * Returns `null` when no endpoints are found (non-web / non-API projects).
 */
export function detectEndpoints(analysis: AnalysisResult): EndpointGraph | null {
  const { nodes, edges } = analysis.graph;

  // --- Build fast-lookup maps ---
  const nodeMap = new Map<string, GraphNode>(nodes.map((n) => [n.id, n]));

  // Build call adjacency: caller node id → [callee node id, ...]
  const callAdjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.type !== 'call') continue;
    const existing = callAdjacency.get(edge.source);
    if (existing !== undefined) {
      existing.push(edge.target);
    } else {
      callAdjacency.set(edge.source, [edge.target]);
    }
  }

  // --- Detect endpoints by scanning file source code ---
  const fileNodes = nodes.filter(
    (n) => n.type === 'file' && n.metadata.parentFileId === undefined,
  );

  const endpoints: ApiEndpoint[] = [];

  for (const fileNode of fileNodes) {
    const source = readSourceCode(analysis, fileNode);
    if (!source) continue;

    const detected = extractEndpointsFromSource(source, fileNode);
    for (const partial of detected) {
      const id = `${partial.method} ${partial.path}`;
      // Deduplicate by id — keep first occurrence
      if (endpoints.some((e) => e.id === id)) continue;
      endpoints.push({ ...partial, id });
    }
  }

  // --- If no JS/TS endpoints found, try scanning Python files from disk ---
  if (endpoints.length === 0) {
    const pyEndpoints = scanPythonEndpoints(analysis.projectPath);
    for (const ep of pyEndpoints) {
      endpoints.push(ep);
    }
  }

  // Non-web projects: return null when no endpoints found
  if (endpoints.length === 0) return null;

  // --- Build endpoint chains ---
  // Build a map of function/class node id → node for quick handler lookup
  const functionNodes = nodes.filter(
    (n) => (n.type === 'function' || n.type === 'class') && n.metadata.parentFileId !== undefined,
  );
  // Index by label (function name) for handler matching
  const functionsByLabel = new Map<string, GraphNode[]>();
  for (const fn of functionNodes) {
    const key = fn.label.replace(/\(\)$/, '');
    const existing = functionsByLabel.get(key);
    if (existing !== undefined) {
      existing.push(fn);
    } else {
      functionsByLabel.set(key, [fn]);
    }
  }

  // --- Split endpoints into Python vs JS/TS and build chains accordingly ---
  const pyEndpoints = endpoints.filter((ep) => ep.handlerFileId.endsWith('.py'));
  const jsEndpoints = endpoints.filter((ep) => !ep.handlerFileId.endsWith('.py'));

  const chains: EndpointChain[] = [];

  // Python endpoints: use heuristic chain builder (no graph call edges)
  if (pyEndpoints.length > 0) {
    const pyChains = buildPythonChains(pyEndpoints, analysis.projectPath);
    chains.push(...pyChains);
  }

  // JS/TS endpoints: use graph-based BFS chain builder
  for (const endpoint of jsEndpoints) {
    const handlerName = endpoint.handler;
    if (handlerName === '<anonymous>') {
      chains.push({ endpointId: endpoint.id, steps: [] });
      continue;
    }

    // Find the handler node — prefer one in the same file, otherwise any match
    const candidates = functionsByLabel.get(handlerName) ?? [];
    const handlerNode =
      candidates.find((n) => n.metadata.parentFileId === endpoint.handlerFileId) ??
      candidates[0];

    if (!handlerNode) {
      chains.push({ endpointId: endpoint.id, steps: [] });
      continue;
    }

    const steps = buildChainSteps(handlerNode.id, nodeMap, callAdjacency);
    chains.push({ endpointId: endpoint.id, steps });
  }

  return { endpoints, chains };
}
