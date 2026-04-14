/**
 * @file HonoAdapter — Hono 框架端點偵測 Adapter
 * @description Sprint 24 — 從 Hono 路由定義中萃取 API 端點，
 *   實作 `detect()` 與 `extractEndpoints()`，chain building 沿用 BaseAdapter 預設 BFS。
 *
 * 支援的路由模式：
 *   - `app.get('/path', handler)`           — 標準 shorthand
 *   - `app.post('/path', middleware, handler)` — 含 middleware
 *   - `app.route('/prefix', subApp)`        — sub-app 掛載（偵測為 route group）
 *   - `hono.get('/path', handler)`          — 使用 hono 變數名
 *   - Inline arrow handlers: `app.get('/path', (c) => { ... })`
 */

import { BaseAdapter } from './base-adapter.js';
import type { AdapterContext, FrameworkDetection } from './types.js';
import type { AnalysisResult, GraphNode } from '../../types.js';
import type { ApiEndpoint, HttpMethod } from '../endpoint-detector.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** HTTP methods recognised in route definitions (lowercase for regex). */
const HTTP_METHODS_RE = 'get|post|put|delete|patch';

/**
 * Hono shorthand route pattern.
 *
 * Matches:
 *   - `app.get('/path', handler)`
 *   - `hono.post('/path', mw, handler)`
 *   - `app.delete('/path', (c) => { ... })`
 *
 * Capture groups:
 *   1. HTTP method (get|post|...)
 *   2. Route path string
 *   3. Argument list after the path (handler + optional middlewares)
 */
const SHORTHAND_ROUTE_RE = new RegExp(
  `(?:app|hono)\\.(${HTTP_METHODS_RE})\\(\\s*['"\`]([^'"\`]+)['"\`]\\s*,([^)]+)`,
  'gi',
);

/**
 * Hono sub-app mounting pattern.
 *
 * Matches:
 *   - `app.route('/prefix', subApp)`
 *   - `hono.route('/api', apiRouter)`
 *
 * Capture groups:
 *   1. Route prefix path
 *   2. Sub-app variable name
 */
const ROUTE_MOUNT_RE = new RegExp(
  `(?:app|hono)\\.route\\(\\s*['"\`]([^'"\`]+)['"\`]\\s*,\\s*([A-Za-z_$][\\w$]*)`,
  'gi',
);

/** File extensions considered as JS/TS source files. */
const JS_TS_EXTENSIONS_RE = /\.(js|ts|mjs|cjs|jsx|tsx)$/i;

// ---------------------------------------------------------------------------
// HonoAdapter
// ---------------------------------------------------------------------------

/**
 * Hono 框架 Adapter。
 *
 * - `detect()`: 檢查 package.json 是否包含 `hono` 依賴
 * - `extractEndpoints()`: 使用 shorthand route regex 從 JS/TS 檔案中萃取端點
 * - `buildChains()`: 沿用 BaseAdapter 預設 BFS 實作
 */
export class HonoAdapter extends BaseAdapter {
  readonly name = 'hono';
  readonly displayName = 'Hono';
  readonly language = 'javascript' as const;

  // -------------------------------------------------------------------------
  // detect
  // -------------------------------------------------------------------------

  /**
   * 偵測目標專案是否使用 Hono。
   *
   * 在 analysis graph nodes 中尋找 `package.json` 檔案節點，
   * 讀取並解析其內容，檢查 `dependencies` 或 `devDependencies` 中是否包含 `hono`。
   *
   * @param analysis 分析結果
   * @returns 偵測結果（confidence 1.0），若未偵測到則回傳 `null`
   */
  detect(analysis: AnalysisResult): FrameworkDetection | null {
    const pkgNode = analysis.graph.nodes.find(
      (n: GraphNode) =>
        n.type === 'file' &&
        (n.filePath === 'package.json' || n.filePath.endsWith('/package.json')),
    );
    if (!pkgNode) return null;

    const source = this.readSourceCode(analysis, pkgNode);
    if (!source) return null;

    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(source) as Record<string, unknown>;
    } catch {
      return null;
    }

    const deps = pkg['dependencies'] as Record<string, string> | undefined;
    const devDeps = pkg['devDependencies'] as Record<string, string> | undefined;

    const honoVersion = deps?.['hono'] ?? devDeps?.['hono'];
    if (!honoVersion) return null;

    return {
      adapterName: this.name,
      confidence: 1.0,
      evidence: [`found hono@${honoVersion} in package.json dependencies`],
    };
  }

  // -------------------------------------------------------------------------
  // extractEndpoints
  // -------------------------------------------------------------------------

  /**
   * 從分析結果中萃取 Hono API 端點。
   *
   * 遍歷所有 JS/TS 檔案節點，使用 shorthand route regex 匹配端點定義。
   * 支援 inline arrow handler 偵測（peek-ahead pattern）。
   * 同時偵測 `app.route()` sub-app 掛載作為描述性端點。
   *
   * @param ctx 預處理的分析上下文
   * @returns 端點清單，每個端點的 id 格式為 `${method} ${path}`
   */
  extractEndpoints(ctx: AdapterContext): ApiEndpoint[] {
    const { analysis } = ctx;
    const results: ApiEndpoint[] = [];

    // Filter JS/TS file nodes
    const fileNodes = analysis.graph.nodes.filter(
      (n: GraphNode) => n.type === 'file' && JS_TS_EXTENSIONS_RE.test(n.filePath),
    );

    for (const fileNode of fileNodes) {
      const source = this.readSourceCode(analysis, fileNode);
      if (!source) continue;

      this.extractShorthandRoutes(source, fileNode, results);
      this.extractRouteMounts(source, fileNode, results);
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * 從單一檔案的原始碼中萃取 Hono shorthand 路由端點。
   *
   * @param source 檔案原始碼
   * @param fileNode 檔案對應的 GraphNode
   * @param results 收集端點的目標陣列（就地修改）
   */
  private extractShorthandRoutes(
    source: string,
    fileNode: GraphNode,
    results: ApiEndpoint[],
  ): void {
    // Create a fresh regex instance per file (global flag + exec requires reset)
    const shorthandRe = new RegExp(SHORTHAND_ROUTE_RE.source, SHORTHAND_ROUTE_RE.flags);

    let match: RegExpExecArray | null;
    while ((match = shorthandRe.exec(source)) !== null) {
      const rawMethod = match[1];
      const routePath = match[2];
      const argList = match[3] ?? '';

      if (!rawMethod || !routePath) continue;

      const method: HttpMethod | null = this.normaliseMethod(rawMethod);
      if (!method) continue;

      // Calculate 1-based line number
      const line = source.substring(0, match.index).split('\n').length;

      // Peek-ahead for inline handlers: ') =>' or '=> {' within argList
      const afterMatch = source.substring(
        match.index + match[0].length,
        match.index + match[0].length + 20,
      );
      const isInlineHandler =
        /^\s*\)\s*=>/.test(afterMatch) || /=>\s*\{/.test(argList);

      let handler: string;
      let middlewares: string[];
      if (isInlineHandler) {
        // When inline handler detected via peek-ahead, all named tokens are middlewares
        const parsed = this.parseHandlerArgs(argList);
        const allNames = [...parsed.middlewares];
        if (parsed.handler !== '<anonymous>') allNames.push(parsed.handler);
        handler = '<anonymous>';
        middlewares = allNames;
      } else {
        ({ handler, middlewares } = this.parseHandlerArgs(argList));
      }

      const endpoint: ApiEndpoint = {
        id: `${method} ${routePath}`,
        method,
        path: routePath,
        handler,
        handlerFileId: fileNode.id,
        line,
      };

      if (middlewares.length > 0) {
        endpoint.middlewares = middlewares;
      }

      results.push(endpoint);
    }
  }

  /**
   * 從單一檔案的原始碼中萃取 Hono `app.route()` sub-app 掛載。
   *
   * sub-app 掛載以 route group 形式記錄，method 為 GET，
   * handler 為被掛載的子應用變數名，description 標示為 route group。
   *
   * @param source 檔案原始碼
   * @param fileNode 檔案對應的 GraphNode
   * @param results 收集端點的目標陣列（就地修改）
   */
  private extractRouteMounts(
    source: string,
    fileNode: GraphNode,
    results: ApiEndpoint[],
  ): void {
    const routeMountRe = new RegExp(ROUTE_MOUNT_RE.source, ROUTE_MOUNT_RE.flags);

    let match: RegExpExecArray | null;
    while ((match = routeMountRe.exec(source)) !== null) {
      const prefix = match[1];
      const subAppName = match[2];

      if (!prefix || !subAppName) continue;

      // Calculate 1-based line number
      const line = source.substring(0, match.index).split('\n').length;

      const endpoint: ApiEndpoint = {
        id: `GET ${prefix}`,
        method: 'GET',
        path: prefix,
        handler: subAppName,
        handlerFileId: fileNode.id,
        line,
        description: `route group mounted via app.route('${prefix}', ${subAppName})`,
      };

      results.push(endpoint);
    }
  }
}
