/**
 * @file KoaAdapter — Koa.js 框架端點偵測 Adapter
 * @description Sprint 24 — 從 Express Adapter 模式延伸，
 *   實作 `detect()` 與 `extractEndpoints()`，chain building 沿用 BaseAdapter 預設 BFS。
 *
 * 支援的路由模式（@koa/router）：
 *   - `router.get('/path', handler)`
 *   - `router.post('/path', mw1, mw2, handler)`
 *   - `router.all('/path', handler)`
 *   - Inline arrow handlers: `router.get('/path', (ctx) => { ... })`
 */

import { BaseAdapter } from './base-adapter.js';
import type { AdapterContext, FrameworkDetection } from './types.js';
import type { AnalysisResult, GraphNode } from '../../types.js';
import type { ApiEndpoint, HttpMethod } from '../endpoint-detector.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** HTTP methods recognised in route definitions (lowercase for regex). */
const HTTP_METHODS_RE = 'get|post|put|delete|patch|all';

/**
 * Koa router shorthand route pattern.
 *
 * Matches:
 *   - `router.get('/path', handler)`
 *   - `router.post('/path', mw, handler)`
 *   - `router.all('/path', handler)`
 *
 * Koa uses `@koa/router` (or `koa-router`), which always uses `router.*` prefix.
 *
 * Capture groups:
 *   1. HTTP method (get|post|put|delete|patch|all)
 *   2. Route path string
 *   3. Argument list after the path (handler + optional middlewares)
 */
const SHORTHAND_ROUTE_RE = new RegExp(
  `router\\.(${HTTP_METHODS_RE})\\(\\s*['"\`]([^'"\`]+)['"\`]\\s*,([^)]+)`,
  'gi',
);

/** File extensions considered as JS/TS source files. */
const JS_TS_EXTENSIONS_RE = /\.(js|ts|mjs|cjs|jsx|tsx)$/i;

// ---------------------------------------------------------------------------
// KoaAdapter
// ---------------------------------------------------------------------------

/**
 * Koa.js 框架 Adapter。
 *
 * - `detect()`: 檢查 package.json 是否包含 `koa` 或 `@koa/router` 依賴
 * - `extractEndpoints()`: 使用 shorthand route regex 從 JS/TS 檔案中萃取端點
 * - `buildChains()`: 沿用 BaseAdapter 預設 BFS 實作
 */
export class KoaAdapter extends BaseAdapter {
  readonly name = 'koa';
  readonly displayName = 'Koa.js';
  readonly language = 'javascript' as const;

  // -------------------------------------------------------------------------
  // detect
  // -------------------------------------------------------------------------

  /**
   * 偵測目標專案是否使用 Koa.js。
   *
   * 在 analysis graph nodes 中尋找 `package.json` 檔案節點，
   * 讀取並解析其內容，檢查 `dependencies` 或 `devDependencies` 中是否包含
   * `koa` 或 `@koa/router`。
   *
   * @param analysis 分析結果
   * @returns 偵測結果（confidence 1.0），若未偵測到則回傳 `null`
   */
  detect(analysis: AnalysisResult): FrameworkDetection | null {
    const source = this.readProjectFile(analysis, 'package.json');
    if (!source) return null;

    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(source) as Record<string, unknown>;
    } catch {
      return null;
    }

    const deps = pkg['dependencies'] as Record<string, string> | undefined;
    const devDeps = pkg['devDependencies'] as Record<string, string> | undefined;

    const koaVersion = deps?.['koa'] ?? devDeps?.['koa'];
    const koaRouterVersion = deps?.['@koa/router'] ?? devDeps?.['@koa/router'];

    if (!koaVersion && !koaRouterVersion) return null;

    const evidence: string[] = [];
    if (koaVersion) {
      evidence.push(`found koa@${koaVersion} in package.json dependencies`);
    }
    if (koaRouterVersion) {
      evidence.push(`found @koa/router@${koaRouterVersion} in package.json dependencies`);
    }

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
   * 從分析結果中萃取 Koa.js API 端點。
   *
   * 遍歷所有 JS/TS 檔案節點，使用 `@koa/router` shorthand route regex 匹配端點定義。
   * 支援 inline arrow handler 偵測（peek-ahead pattern）。
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

      this.extractFromSource(source, fileNode, results);
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * 從單一檔案的原始碼中萃取 Koa router shorthand 路由端點。
   *
   * @param source 檔案原始碼
   * @param fileNode 檔案對應的 GraphNode
   * @param results 收集端點的目標陣列（就地修改）
   */
  private extractFromSource(
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

      // Normalise method — 'all' maps to null via normaliseMethod, handle it separately
      let method: HttpMethod | null;
      if (rawMethod.toLowerCase() === 'all') {
        method = 'GET'; // Represent router.all() as GET (catch-all)
      } else {
        method = this.normaliseMethod(rawMethod);
      }
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
}
