/**
 * @file FlaskAdapter — Flask 框架端點偵測 Adapter
 * @description Sprint 24 T13 — 偵測 Flask 專案並從 Python 原始碼中
 *   解析 @app.route / @blueprint.route decorator 及 Flask 2.0+ method shortcuts。
 *
 * 支援的路由模式：
 *   - `@app.route('/path', methods=['GET', 'POST'])`
 *   - `@blueprint.route('/path')` / `@bp.route('/path')`
 *   - Flask 2.0+ shortcuts: `@app.get('/path')`, `@bp.post('/path')`, etc.
 */

import { PythonBaseAdapter } from './python-base-adapter.js';
import type { AdapterContext, FrameworkDetection } from './types.js';
import type { AnalysisResult, GraphNode } from '../../types.js';
import type { ApiEndpoint, HttpMethod } from '../endpoint-detector.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Flask/Blueprint receiver prefixes. */
const FLASK_PREFIXES = ['app', 'blueprint', 'bp'];

/** HTTP methods (lowercase) for method shortcuts. */
const HTTP_METHODS_LC = 'get|post|put|delete|patch';

/** Regex for Python function definition after a decorator. */
const PYTHON_DEF_RE = /(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/;

/** File extensions for Python source files. */
const PY_EXTENSION_RE = /\.py$/i;

// ---------------------------------------------------------------------------
// FlaskAdapter
// ---------------------------------------------------------------------------

/**
 * Flask 框架 Adapter。
 *
 * - `detect()`: 檢查 requirements.txt / pyproject.toml / setup.py 中是否有 flask
 * - `extractEndpoints()`: 解析 @app.route + @blueprint.route + Flask 2.0+ method shortcuts
 * - `buildChains()`: 繼承 PythonBaseAdapter 的 heuristic chain building
 */
export class FlaskAdapter extends PythonBaseAdapter {
  readonly name = 'flask';
  readonly displayName = 'Flask';
  readonly language = 'python' as const;

  // -------------------------------------------------------------------------
  // detect
  // -------------------------------------------------------------------------

  /**
   * 偵測目標專案是否使用 Flask。
   *
   * @param analysis 分析結果
   * @returns 偵測結果（confidence 1.0），若未偵測到則回傳 `null`
   */
  detect(analysis: AnalysisResult): FrameworkDetection | null {
    const result = this.detectPythonDependency(analysis, 'flask');
    if (!result.found) return null;

    const evidence = [`found flask in ${result.source}`];
    if (result.version) evidence[0] += ` (version ${result.version})`;

    return {
      adapterName: this.name,
      confidence: 1.0,
      evidence,
    };
  }

  // -------------------------------------------------------------------------
  // extractEndpoints
  // -------------------------------------------------------------------------

  /**
   * 從分析結果中萃取 Flask API 端點。
   *
   * 遍歷所有 .py 檔案節點，解析三類模式：
   * 1. @app.route('/path', methods=['GET', 'POST'])
   * 2. @blueprint.route('/path')
   * 3. Flask 2.0+ method shortcuts (@app.get, @bp.post, etc.)
   *
   * @param ctx 預處理的分析上下文
   * @returns 端點清單
   */
  extractEndpoints(ctx: AdapterContext): ApiEndpoint[] {
    const { analysis } = ctx;
    const results: ApiEndpoint[] = [];

    // Filter Python file nodes
    const pyFiles = analysis.graph.nodes.filter(
      (n: GraphNode) => n.type === 'file' && PY_EXTENSION_RE.test(n.filePath),
    );

    for (const fileNode of pyFiles) {
      const source = this.readSourceCode(analysis, fileNode);
      if (!source) continue;

      this.extractRouteDecorators(source, fileNode, results);
      this.extractMethodShortcuts(source, fileNode, results);
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * 萃取 @app.route / @blueprint.route decorator 端點。
   *
   * 解析 methods=['GET', 'POST'] 參數，若無指定則預設 GET。
   * 每個 HTTP method 建立一個獨立端點。
   */
  private extractRouteDecorators(
    source: string,
    fileNode: GraphNode,
    results: ApiEndpoint[],
  ): void {
    const prefixPattern = FLASK_PREFIXES.join('|');
    const routeRe = new RegExp(
      `@(?:${prefixPattern})\\.route\\(\\s*['"]([^'"]+)['"]([^)]*?)\\)`,
      'gi',
    );

    const sourceLines = source.split('\n');
    let match: RegExpExecArray | null;

    while ((match = routeRe.exec(source)) !== null) {
      const routePath = match[1];
      const argsRest = match[2] ?? '';
      if (!routePath) continue;

      const handlerName = this.findDefName(source, match.index, sourceLines);
      const methods = this.parseMethodsArg(argsRest);

      for (const method of methods) {
        const id = `${method} ${routePath}`;
        if (!results.some((e) => e.id === id)) {
          results.push({
            id,
            method,
            path: routePath,
            handler: handlerName,
            handlerFileId: fileNode.id,
          });
        }
      }
    }
  }

  /**
   * 萃取 Flask 2.0+ method shortcut decorator 端點。
   *
   * 匹配 @app.get('/path'), @bp.post('/path') 等模式。
   */
  private extractMethodShortcuts(
    source: string,
    fileNode: GraphNode,
    results: ApiEndpoint[],
  ): void {
    const prefixPattern = FLASK_PREFIXES.join('|');
    const shortcutRe = new RegExp(
      `@(?:${prefixPattern})\\.(${HTTP_METHODS_LC})\\(\\s*['"]([^'"]+)['"]`,
      'gi',
    );

    const sourceLines = source.split('\n');
    let match: RegExpExecArray | null;

    while ((match = shortcutRe.exec(source)) !== null) {
      const rawMethod = match[1];
      const routePath = match[2];
      if (!rawMethod || !routePath) continue;

      const method = this.normaliseMethod(rawMethod);
      if (!method) continue;

      const handlerName = this.findDefName(source, match.index, sourceLines);
      const id = `${method} ${routePath}`;

      if (!results.some((e) => e.id === id)) {
        results.push({
          id,
          method,
          path: routePath,
          handler: handlerName,
          handlerFileId: fileNode.id,
        });
      }
    }
  }

  /**
   * 從 decorator 位置往下搜尋最近的 def 函式名稱。
   */
  private findDefName(
    source: string,
    matchIndex: number,
    sourceLines: string[],
  ): string {
    const lineIdx = source.substring(0, matchIndex).split('\n').length;

    for (let i = lineIdx; i < Math.min(lineIdx + 5, sourceLines.length); i++) {
      const defMatch = PYTHON_DEF_RE.exec(sourceLines[i] ?? '');
      if (defMatch) {
        return defMatch[1] ?? '<anonymous>';
      }
    }

    return '<anonymous>';
  }

  /**
   * 從 route() decorator 的額外參數中解析 methods=['GET', 'POST']。
   * 若無 methods 參數，回傳 ['GET'] 作為預設。
   */
  private parseMethodsArg(argsRest: string): HttpMethod[] {
    const methodsMatch = argsRest.match(/methods\s*=\s*\[([^\]]+)\]/i);
    if (!methodsMatch) return ['GET'];

    const methodsStr = methodsMatch[1] ?? '';
    const methods: HttpMethod[] = [];
    const tokenRe = /['"]([A-Za-z]+)['"]/g;
    let tokenMatch: RegExpExecArray | null;

    while ((tokenMatch = tokenRe.exec(methodsStr)) !== null) {
      const m = this.normaliseMethod(tokenMatch[1] ?? '');
      if (m) methods.push(m);
    }

    return methods.length > 0 ? methods : ['GET'];
  }
}
