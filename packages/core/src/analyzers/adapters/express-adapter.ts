/**
 * @file ExpressAdapter — Express.js 框架端點偵測 Adapter
 * @description Sprint 24 T4 — 從 endpoint-detector.ts 的 Express 邏輯抽出，
 *   實作 `detect()` 與 `extractEndpoints()`，chain building 沿用 BaseAdapter 預設 BFS。
 *
 * 支援的路由模式：
 *   - `router.get('/path', handler)`
 *   - `app.post('/path', mw1, mw2, handler)`
 *   - `express.delete('/path', handler)`
 *   - Inline arrow handlers: `router.get('/path', (req, res) => { ... })`
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
 * Express shorthand route pattern.
 *
 * Matches:
 *   - `router.get('/path', handler)`
 *   - `app.post('/path', mw, handler)`
 *   - `express.delete('/path', handler)`
 *
 * Capture groups:
 *   1. HTTP method (get|post|…)
 *   2. Route path string
 *   3. Argument list after the path (handler + optional middlewares)
 */
const SHORTHAND_ROUTE_RE = new RegExp(
  `(?:router|app|express)\\.(${HTTP_METHODS_RE})\\(\\s*['"\`]([^'"\`]+)['"\`]\\s*,([^)]+)`,
  'gi',
);

/** File extensions considered as JS/TS source files. */
const JS_TS_EXTENSIONS_RE = /\.(js|ts|mjs|cjs|jsx|tsx)$/i;

// ---------------------------------------------------------------------------
// ExpressAdapter
// ---------------------------------------------------------------------------

/**
 * Express.js 框架 Adapter。
 *
 * - `detect()`: 檢查 package.json 是否包含 `express` 依賴
 * - `extractEndpoints()`: 使用 shorthand route regex 從 JS/TS 檔案中萃取端點
 * - `buildChains()`: 沿用 BaseAdapter 預設 BFS 實作
 */
export class ExpressAdapter extends BaseAdapter {
  readonly name = 'express';
  readonly displayName = 'Express.js';
  readonly language = 'javascript' as const;

  // -------------------------------------------------------------------------
  // detect
  // -------------------------------------------------------------------------

  /**
   * 偵測目標專案是否使用 Express.js。
   *
   * 在 analysis graph nodes 中尋找 `package.json` 檔案節點，
   * 讀取並解析其內容，檢查 `dependencies` 或 `devDependencies` 中是否包含 `express`。
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

    const expressVersion = deps?.['express'] ?? devDeps?.['express'];
    if (!expressVersion) return null;

    return {
      adapterName: this.name,
      confidence: 1.0,
      evidence: [`found express@${expressVersion} in package.json dependencies`],
    };
  }

  // -------------------------------------------------------------------------
  // extractEndpoints
  // -------------------------------------------------------------------------

  /**
   * 從分析結果中萃取 Express.js API 端點。
   *
   * 遍歷所有 JS/TS 檔案節點，使用 shorthand route regex 匹配端點定義。
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
   * 從單一檔案的原始碼中萃取 Express shorthand 路由端點。
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
}
