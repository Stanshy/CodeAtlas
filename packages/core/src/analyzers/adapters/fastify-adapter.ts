/**
 * @file FastifyAdapter — Fastify 框架端點偵測 Adapter
 * @description Sprint 24 T5 — 從 endpoint-detector.ts 的 Fastify 邏輯抽出，
 *   實作 `detect()` 與 `extractEndpoints()`，chain building 沿用 BaseAdapter 預設 BFS。
 *
 * 支援的路由模式：
 *   - Pattern 1 (shorthand): `fastify.get('/path', handler)`
 *   - Pattern 1 (shorthand): `server.post('/path', mw1, handler)`
 *   - Pattern 1 (shorthand): `app.delete('/path', (req, reply) => { ... })`
 *   - Pattern 2 (route block): `fastify.route({ method: 'GET', url: '/path', handler: fn })`
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
 * Fastify shorthand route pattern.
 *
 * Matches:
 *   - `fastify.get('/path', handler)`
 *   - `server.post('/path', mw, handler)`
 *   - `app.delete('/path', handler)`
 *
 * Capture groups:
 *   1. HTTP method (get|post|...)
 *   2. Route path string
 *   3. Argument list after the path (handler + optional middlewares)
 */
const SHORTHAND_ROUTE_RE = new RegExp(
  `(?:fastify|server|app)\\.(${HTTP_METHODS_RE})\\(\\s*['"\`]([^'"\`]+)['"\`]\\s*,([^)]+)`,
  'gi',
);

/**
 * Fastify `.route({ method, url, handler })` block pattern.
 *
 * Capture groups:
 *   1. The content inside the braces `{ ... }`
 */
const ROUTE_BLOCK_RE = /(?:fastify|server|app)\.route\(\s*\{([^}]+)\}/gi;

/** Extracts `method: 'GET'` from a route block. */
const ROUTE_BLOCK_METHOD_RE = /method\s*:\s*['"`]([A-Za-z]+)['"`]/i;

/** Extracts `url: '/path'` from a route block. */
const ROUTE_BLOCK_URL_RE = /url\s*:\s*['"`]([^'"`]+)['"`]/i;

/** Extracts `handler: functionName` from a route block. */
const ROUTE_BLOCK_HANDLER_RE = /handler\s*:\s*([A-Za-z_$][\w$]*)/i;

/** File extensions considered as JS/TS source files. */
const JS_TS_EXTENSIONS_RE = /\.(js|ts|mjs|cjs|jsx|tsx)$/i;

// ---------------------------------------------------------------------------
// FastifyAdapter
// ---------------------------------------------------------------------------

/**
 * Fastify 框架 Adapter。
 *
 * - `detect()`: 檢查 package.json 是否包含 `fastify` 依賴
 * - `extractEndpoints()`: 使用 shorthand route + route block regex 從 JS/TS 檔案中萃取端點
 * - `buildChains()`: 沿用 BaseAdapter 預設 BFS 實作
 */
export class FastifyAdapter extends BaseAdapter {
  readonly name = 'fastify';
  readonly displayName = 'Fastify';
  readonly language = 'javascript' as const;

  // -------------------------------------------------------------------------
  // detect
  // -------------------------------------------------------------------------

  /**
   * 偵測目標專案是否使用 Fastify。
   *
   * 在 analysis graph nodes 中尋找 `package.json` 檔案節點，
   * 讀取並解析其內容，檢查 `dependencies` 或 `devDependencies` 中是否包含 `fastify`。
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

    const fastifyVersion = deps?.['fastify'] ?? devDeps?.['fastify'];
    if (!fastifyVersion) return null;

    return {
      adapterName: this.name,
      confidence: 1.0,
      evidence: [`found fastify@${fastifyVersion} in package.json dependencies`],
    };
  }

  // -------------------------------------------------------------------------
  // extractEndpoints
  // -------------------------------------------------------------------------

  /**
   * 從分析結果中萃取 Fastify API 端點。
   *
   * 遍歷所有 JS/TS 檔案節點，使用兩種 regex 模式匹配端點定義：
   *   1. Shorthand routes: `fastify.get('/path', handler)`
   *   2. Route blocks: `fastify.route({ method: 'GET', url: '/path', handler: fn })`
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
      this.extractRouteBlocks(source, fileNode, results);
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * 從單一檔案的原始碼中萃取 Fastify shorthand 路由端點。
   *
   * Pattern: `(fastify|server|app).(get|post|...)('/path', handler)`
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

      const { handler, middlewares } = isInlineHandler
        ? { handler: '<anonymous>' as string, middlewares: this.parseHandlerArgs(argList).middlewares }
        : this.parseHandlerArgs(argList);

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
   * 從單一檔案的原始碼中萃取 Fastify `.route()` block 端點。
   *
   * Pattern: `fastify.route({ method: 'GET', url: '/path', handler: fn })`
   *
   * @param source 檔案原始碼
   * @param fileNode 檔案對應的 GraphNode
   * @param results 收集端點的目標陣列（就地修改）
   */
  private extractRouteBlocks(
    source: string,
    fileNode: GraphNode,
    results: ApiEndpoint[],
  ): void {
    const routeBlockRe = new RegExp(ROUTE_BLOCK_RE.source, ROUTE_BLOCK_RE.flags);

    let match: RegExpExecArray | null;
    while ((match = routeBlockRe.exec(source)) !== null) {
      const block = match[1] ?? '';

      const methodMatch = ROUTE_BLOCK_METHOD_RE.exec(block);
      const urlMatch = ROUTE_BLOCK_URL_RE.exec(block);
      const handlerMatch = ROUTE_BLOCK_HANDLER_RE.exec(block);

      if (!methodMatch || !urlMatch) continue;

      const method: HttpMethod | null = this.normaliseMethod(methodMatch[1] ?? '');
      if (!method) continue;

      const routePath = urlMatch[1] ?? '';
      const handler = handlerMatch ? (handlerMatch[1] ?? '<anonymous>') : '<anonymous>';

      // Calculate 1-based line number
      const line = source.substring(0, match.index).split('\n').length;

      const endpoint: ApiEndpoint = {
        id: `${method} ${routePath}`,
        method,
        path: routePath,
        handler,
        handlerFileId: fileNode.id,
        line,
      };

      results.push(endpoint);
    }
  }
}
