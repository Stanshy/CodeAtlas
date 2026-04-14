/**
 * @file PythonBaseAdapter — Python 框架共用基類
 * @description Sprint 24 T6 — 從 endpoint-detector.ts 抽出 Python 共用邏輯，
 *   作為 Flask / FastAPI / Django adapter 的基類。
 *
 *   提供：
 *   - Python decorator regex（HTTP method 匹配）
 *   - Skip sets（PYTHON_SKIP_NAMES / PYTHON_SKIP_METHODS / PYTHON_SKIP_RECEIVERS）
 *   - findPythonFiles()（遞迴磁碟掃描 .py 檔案）
 *   - extractDecoratorEndpoints()（從 source 提取 decorator 端點）
 *   - buildPythonChainSteps()（啟發式建構呼叫鏈步驟）
 *   - scanPythonEndpoints()（磁碟掃描模式的端點偵測）
 *   - buildChains()（覆寫 BaseAdapter 的 BFS，改用 heuristic）
 *   - detectPythonDependency()（偵測 requirements.txt / pyproject.toml / setup.py 依賴）
 */

import fs from 'node:fs';
import path from 'node:path';

import { BaseAdapter } from './base-adapter.js';
import type { AdapterContext } from './types.js';
import type { AnalysisResult } from '../../types.js';
import type {
  ApiEndpoint,
  ChainStep,
  EndpointChain,
} from '../endpoint-detector.js';

// ---------------------------------------------------------------------------
// Python dependency detection result
// ---------------------------------------------------------------------------

/** detectPythonDependency 的回傳型別 */
export interface PythonDependencyResult {
  /** 是否找到該套件 */
  found: boolean;
  /** 套件版本（若可解析） */
  version?: string | undefined;
  /** 偵測來源（requirements.txt / pyproject.toml / setup.py） */
  source: string;
}

// ---------------------------------------------------------------------------
// Skip Sets — 從 endpoint-detector.ts 原封不動搬移
// ---------------------------------------------------------------------------

/**
 * Function names that should be skipped when building Python call chains.
 *
 * Categories:
 *   1. Python builtins
 *   2. Python exceptions
 *   3. SQLAlchemy core / ORM keywords
 *   4. SQLAlchemy result-accessor methods
 *   5. Pydantic / FastAPI primitives
 *   6. datetime / uuid / logging
 *   7. typing helpers
 *   8. Generic single-word method noise (CRUD / string / IO / dict ops)
 *   9. ORM session / transaction management
 *  10. Python dunder methods (bare names that can leak through)
 *  11. Test / assert helpers
 */
const PYTHON_SKIP_NAMES: ReadonlySet<string> = new Set<string>([
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
 * These cover the dotted-call pattern `obj.method()` -- if the method portion
 * is in this set, the entire call is suppressed.
 *
 * This is intentionally a superset of common SQLAlchemy chained methods,
 * ORM accessors, string helpers, and HTTP result accessors.
 */
const PYTHON_SKIP_METHODS: ReadonlySet<string> = new Set<string>([
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
const PYTHON_SKIP_RECEIVERS: ReadonlySet<string> = new Set<string>([
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
// Directory skip set for findPythonFiles
// ---------------------------------------------------------------------------

/** Directories to skip when recursively scanning for .py files */
const PYTHON_DIR_SKIP: ReadonlySet<string> = new Set([
  'node_modules', '.venv', 'venv', '__pycache__', '.git', 'dist',
  'build', '.next', 'coverage', '.cache', '.tox', '.eggs', 'egg-info',
  'test', 'tests', 'e2e', '__tests__', 'fixtures', '.pytest_cache', 'test-results',
]);

// ---------------------------------------------------------------------------
// PythonBaseAdapter
// ---------------------------------------------------------------------------

/**
 * Python 框架共用基類。
 *
 * 封裝從 `endpoint-detector.ts` 抽出的 Python 特有邏輯：
 * - Decorator-based 端點匹配
 * - 啟發式呼叫鏈建構（非 BFS，因 Python 專案沒有 JS/TS call graph）
 * - 磁碟掃描 .py 檔案
 * - Python 依賴偵測（requirements.txt / pyproject.toml / setup.py）
 *
 * Flask / FastAPI / Django adapter 繼承此類，只需覆寫 `detect()` 和可能的
 * `extractEndpoints()`。
 */
export abstract class PythonBaseAdapter extends BaseAdapter {
  readonly language = 'python' as const;

  // -------------------------------------------------------------------------
  // Constants — Python regex patterns
  // -------------------------------------------------------------------------

  /** HTTP method 匹配 pattern（小寫，用於組合 regex） */
  protected static readonly HTTP_METHODS_RE = 'get|post|put|delete|patch';

  /** Python function definition regex */
  protected static readonly PYTHON_DEF_RE = /(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/;

  // -------------------------------------------------------------------------
  // Protected: Skip sets (exposed for subclass access)
  // -------------------------------------------------------------------------

  /** Function names to skip in chain building */
  protected static readonly PYTHON_SKIP_NAMES: ReadonlySet<string> = PYTHON_SKIP_NAMES;

  /** Method names to skip in dotted-call chain building */
  protected static readonly PYTHON_SKIP_METHODS: ReadonlySet<string> = PYTHON_SKIP_METHODS;

  /** Receiver object names to skip unconditionally */
  protected static readonly PYTHON_SKIP_RECEIVERS: ReadonlySet<string> = PYTHON_SKIP_RECEIVERS;

  // -------------------------------------------------------------------------
  // buildChains override — heuristic (not BFS)
  // -------------------------------------------------------------------------

  /**
   * 為每個 Python 端點建立呼叫鏈。
   *
   * 覆寫 BaseAdapter 的 BFS 實作，改用啟發式 function-call 提取，
   * 因為 Python 專案沒有 JS/TS 語法樹產生的 call graph。
   *
   * @param endpoints extractEndpoints 回傳的端點清單
   * @param ctx 預處理的分析上下文
   * @returns 端點呼叫鏈清單
   */
  buildChains(endpoints: ApiEndpoint[], ctx: AdapterContext): EndpointChain[] {
    const projectPath = ctx.analysis.projectPath;
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

      const steps = this.buildPythonChainSteps(
        source,
        endpoint.handler,
        endpoint.handlerFileId,
      );
      chains.push({ endpointId: endpoint.id, steps });
    }

    return chains;
  }

  // -------------------------------------------------------------------------
  // Protected helpers
  // -------------------------------------------------------------------------

  /**
   * 遞迴掃描磁碟，找出所有 .py 檔案。
   *
   * 跳過 node_modules / .venv / __pycache__ 等非原始碼目錄。
   *
   * @param dir 起始目錄（絕對路徑）
   * @param maxDepth 最大遞迴深度（預設 8）
   * @param depth 當前深度（內部遞迴用）
   * @returns .py 檔案的絕對路徑陣列
   */
  protected findPythonFiles(dir: string, maxDepth = 8, depth = 0): string[] {
    if (depth >= maxDepth) return [];

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return [];
    }

    const result: string[] = [];
    for (const entry of entries) {
      if (PYTHON_DIR_SKIP.has(entry.name) || entry.name.endsWith('.egg-info')) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        result.push(...this.findPythonFiles(fullPath, maxDepth, depth + 1));
      } else if (entry.isFile() && entry.name.endsWith('.py')) {
        result.push(fullPath);
      }
    }
    return result;
  }

  /**
   * 從 source code 中用 decorator regex 提取 API 端點。
   *
   * 匹配 `@{prefix}.{method}('/path')` 形式的 decorator，
   * 然後在下方 5 行內尋找 `def` 定義以取得 handler 名稱。
   *
   * @param source 檔案原始碼
   * @param filePath 相對專案根目錄的檔案路徑
   * @param decoratorPrefixes decorator 前綴清單（如 `['router', 'app', 'blueprint', 'bp']`）
   * @returns 提取到的 ApiEndpoint 陣列
   */
  protected extractDecoratorEndpoints(
    source: string,
    filePath: string,
    decoratorPrefixes: string[],
  ): ApiEndpoint[] {
    const results: ApiEndpoint[] = [];
    if (decoratorPrefixes.length === 0) return results;

    const prefixPattern = decoratorPrefixes.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const decoratorRe = new RegExp(
      `@(?:${prefixPattern})\\.(${PythonBaseAdapter.HTTP_METHODS_RE})\\(\\s*['"]([^'"]+)['"]`,
      'gi',
    );

    const sourceLines = source.split('\n');
    let match: RegExpExecArray | null;

    while ((match = decoratorRe.exec(source)) !== null) {
      const rawMethod = match[1];
      const routePath = match[2];
      if (!rawMethod || !routePath) continue;

      const method = this.normaliseMethod(rawMethod);
      if (!method) continue;

      // Find handler function name from next def line (within 5 lines)
      const decoratorOffset = match.index;
      const lineIdx = source.substring(0, decoratorOffset).split('\n').length;
      let handlerName = '<anonymous>';

      for (let i = lineIdx; i < Math.min(lineIdx + 5, sourceLines.length); i++) {
        const defMatch = PythonBaseAdapter.PYTHON_DEF_RE.exec(sourceLines[i] ?? '');
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
        handlerFileId: filePath,
      });
    }

    return results;
  }

  /**
   * 從 handler 函式 body 啟發式建構 chain steps。
   *
   * 策略：找到 handler 的 `def` 行 -> 收集 body lines（到下一個 top-level def/@ 為止）
   * -> 用 regex 擷取 function calls -> 依序套用 skip filters。
   *
   * Filtering 順序（cheapest first）：
   *   1. 跳過 comment / string literal 行
   *   2. 跳過 private / dunder names（`_` 開頭）
   *   3. 跳過 single-character identifiers
   *   4. 跳過 ALL_CAPS constants
   *   5. 跳過 PYTHON_SKIP_NAMES 中的名稱
   *   6. 跳過 PYTHON_SKIP_RECEIVERS 中的 receiver
   *   7. 跳過 PYTHON_SKIP_METHODS 中的 method
   *   8. 跳過 receiver 在 PYTHON_SKIP_NAMES 中的 dotted call
   *   9. 跳過 PascalCase 無 receiver 的 class instantiation
   *  10. 跳過 <=2 字元無 receiver 的名稱
   *  11. 跳過 generic single-word noise
   *
   * 目標：每個典型 FastAPI endpoint <= 10 steps。
   *
   * @param source 檔案完整原始碼
   * @param handlerName handler 函式名稱
   * @param relativeFilePath 相對專案根目錄的檔案路徑
   * @returns ChainStep 陣列（已附 MethodRole 分類）
   */
  protected buildPythonChainSteps(
    source: string,
    handlerName: string,
    relativeFilePath: string,
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
    const callReSource = /(?:await\s+)?(?:(\w+)\.)?(\w+)\s*\(/.source;
    const seen = new Set<string>();

    for (const line of bodyLines) {
      // Skip comment lines and lines that are clearly string literals / docstrings
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) continue;
      if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) continue;
      if (trimmed.startsWith('"') || trimmed.startsWith("'")) continue;

      const localCallRe = new RegExp(callReSource, 'g');
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
        if (obj && PYTHON_SKIP_METHODS.has(funcName)) continue;

        // --- Filter 7: receiver is a known-noise name (same as funcName check but for obj) ---
        if (obj && PYTHON_SKIP_NAMES.has(obj)) continue;

        // --- Filter 8: PascalCase class instantiation without receiver ---
        if (!obj && /^[A-Z]/.test(funcName)) continue;

        // --- Filter 9: two-character or fewer funcName without receiver ---
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

    // Enrich each step with MethodRole classification
    return steps.map((step) => {
      const roleInfo = this.classifyStepRole(step);
      return { ...step, role: roleInfo.role, roleConfidence: roleInfo.roleConfidence };
    });
  }

  /**
   * 從磁碟掃描 Python 端點（decorator-based）。
   *
   * 流程：findPythonFiles -> 讀取 source -> 快速過濾含 decorator 的檔案 ->
   * extractDecoratorEndpoints 提取端點。
   *
   * @param projectPath 專案根目錄（絕對路徑）
   * @param decoratorPrefixes decorator 前綴清單（如 `['router', 'app', 'blueprint', 'bp']`）
   * @returns 偵測到的 ApiEndpoint 陣列
   */
  protected scanPythonEndpoints(projectPath: string, decoratorPrefixes: string[]): ApiEndpoint[] {
    const pyFiles = this.findPythonFiles(projectPath);
    const results: ApiEndpoint[] = [];

    // Build quick-check regex for early filtering
    const prefixPattern = decoratorPrefixes.join('|');
    const quickCheckRe = new RegExp(
      `@(?:${prefixPattern})\\.(get|post|put|delete|patch)\\(`,
      'i',
    );

    for (const fullPath of pyFiles) {
      let source: string;
      try {
        source = fs.readFileSync(fullPath, 'utf-8');
      } catch {
        continue;
      }

      // Only scan files that look like route files
      if (!quickCheckRe.test(source)) continue;

      const relativePath = path.relative(projectPath, fullPath).replace(/\\/g, '/');
      const endpoints = this.extractDecoratorEndpoints(source, relativePath, decoratorPrefixes);

      // Deduplicate against already-found endpoints
      for (const ep of endpoints) {
        if (!results.some((e) => e.id === ep.id)) {
          results.push(ep);
        }
      }
    }

    return results;
  }

  /**
   * 偵測 Python 依賴套件是否存在於專案中。
   *
   * 搜尋順序：
   *   1. requirements.txt — 逐行匹配 `packageName==version` / `packageName>=version` / `packageName`
   *   2. pyproject.toml — 搜尋 `[project]` dependencies 或 `[tool.poetry.dependencies]`
   *   3. setup.py — 搜尋 `install_requires` 中的 packageName
   *
   * @param analysis 分析結果（提供 projectPath）
   * @param packageName 要偵測的套件名稱（如 `flask`, `fastapi`, `django`）
   * @returns 偵測結果，包含 found / version / source
   */
  protected detectPythonDependency(
    analysis: AnalysisResult,
    packageName: string,
  ): PythonDependencyResult {
    const projectPath = analysis.projectPath;
    const pkgLower = packageName.toLowerCase();

    // --- 1. requirements.txt ---
    const reqResult = this.searchRequirementsTxt(projectPath, pkgLower);
    if (reqResult.found) return reqResult;

    // --- 2. pyproject.toml ---
    const pyprojectResult = this.searchPyprojectToml(projectPath, pkgLower);
    if (pyprojectResult.found) return pyprojectResult;

    // --- 3. setup.py ---
    const setupResult = this.searchSetupPy(projectPath, pkgLower);
    if (setupResult.found) return setupResult;

    return { found: false, source: 'none' };
  }

  // -------------------------------------------------------------------------
  // Private: dependency detection helpers
  // -------------------------------------------------------------------------

  /**
   * 搜尋 requirements.txt 中的套件。
   * 支援 `pkg==1.0`, `pkg>=1.0`, `pkg~=1.0`, `pkg[extra]>=1.0`, 以及無版本的 `pkg`。
   */
  private searchRequirementsTxt(projectPath: string, pkgLower: string): PythonDependencyResult {
    const reqFiles = ['requirements.txt', 'requirements/base.txt', 'requirements/prod.txt'];

    for (const reqFile of reqFiles) {
      const reqPath = path.join(projectPath, reqFile);
      let content: string;
      try {
        content = fs.readFileSync(reqPath, 'utf-8');
      } catch {
        continue;
      }

      for (const rawLine of content.split('\n')) {
        const line = rawLine.trim();
        if (line.startsWith('#') || line.length === 0) continue;

        // Match: pkg, pkg==1.0, pkg>=1.0, pkg~=1.0, pkg[extra]>=1.0
        const match = /^([a-zA-Z0-9_-]+)(?:\[[\w,]+\])?\s*(?:([=~<>!]=?)\s*(.+))?$/.exec(line);
        if (!match) continue;

        const foundPkg = (match[1] ?? '').toLowerCase().replace(/-/g, '_');
        const normalizedTarget = pkgLower.replace(/-/g, '_');

        if (foundPkg === normalizedTarget) {
          return {
            found: true,
            version: match[3]?.trim(),
            source: reqFile,
          };
        }
      }
    }

    return { found: false, source: 'requirements.txt' };
  }

  /**
   * 搜尋 pyproject.toml 中的套件。
   * 使用簡單的字串匹配（不引入 TOML parser 依賴）。
   */
  private searchPyprojectToml(projectPath: string, pkgLower: string): PythonDependencyResult {
    const tomlPath = path.join(projectPath, 'pyproject.toml');
    let content: string;
    try {
      content = fs.readFileSync(tomlPath, 'utf-8');
    } catch {
      return { found: false, source: 'pyproject.toml' };
    }

    const normalizedTarget = pkgLower.replace(/-/g, '_');

    // Match patterns like: "flask>=2.0", 'flask', flask = "^2.0"
    // In both [project].dependencies and [tool.poetry.dependencies]
    const pkgRe = new RegExp(
      `['"]?${normalizedTarget}['"]?\\s*(?:[=~<>!]=?\\s*['"]?([\\d.]+))?`,
      'i',
    );
    const match = pkgRe.exec(content);

    if (match) {
      return {
        found: true,
        version: match[1],
        source: 'pyproject.toml',
      };
    }

    // Also check with hyphenated name
    const hyphenTarget = pkgLower.replace(/_/g, '-');
    if (hyphenTarget !== normalizedTarget) {
      const hyphenRe = new RegExp(
        `['"]?${hyphenTarget}['"]?\\s*(?:[=~<>!]=?\\s*['"]?([\\d.]+))?`,
        'i',
      );
      const hyphenMatch = hyphenRe.exec(content);
      if (hyphenMatch) {
        return {
          found: true,
          version: hyphenMatch[1],
          source: 'pyproject.toml',
        };
      }
    }

    return { found: false, source: 'pyproject.toml' };
  }

  /**
   * 搜尋 setup.py 中的 install_requires。
   */
  private searchSetupPy(projectPath: string, pkgLower: string): PythonDependencyResult {
    const setupPath = path.join(projectPath, 'setup.py');
    let content: string;
    try {
      content = fs.readFileSync(setupPath, 'utf-8');
    } catch {
      return { found: false, source: 'setup.py' };
    }

    const normalizedTarget = pkgLower.replace(/-/g, '_');

    // Look for packageName in install_requires list
    // Patterns: 'flask>=2.0', "flask==1.0", 'flask'
    const pkgRe = new RegExp(
      `['"]${normalizedTarget}(?:[=~<>!]=?[\\d.]*)?['"]`,
      'i',
    );
    const match = pkgRe.exec(content);

    if (match) {
      // Try to extract version
      const versionMatch = /[=~<>!]=?\s*([\d.]+)/.exec(match[0]);
      return {
        found: true,
        version: versionMatch?.[1],
        source: 'setup.py',
      };
    }

    // Also check with hyphenated name
    const hyphenTarget = pkgLower.replace(/_/g, '-');
    if (hyphenTarget !== normalizedTarget) {
      const hyphenRe = new RegExp(
        `['"]${hyphenTarget}(?:[=~<>!]=?[\\d.]*)?['"]`,
        'i',
      );
      const hyphenMatch = hyphenRe.exec(content);
      if (hyphenMatch) {
        const versionMatch = /[=~<>!]=?\s*([\d.]+)/.exec(hyphenMatch[0]);
        return {
          found: true,
          version: versionMatch?.[1],
          source: 'setup.py',
        };
      }
    }

    return { found: false, source: 'setup.py' };
  }
}
