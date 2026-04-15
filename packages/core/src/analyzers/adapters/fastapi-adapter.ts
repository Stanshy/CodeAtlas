/**
 * @file FastAPIAdapter — FastAPI 框架端點偵測 Adapter
 * @description Sprint 24 T14 — 偵測 FastAPI 專案並從 Python 原始碼中
 *   解析 @app.get / @router.post 等 decorator 模式。
 *
 * 支援的路由模式：
 *   - `@app.get('/users')` / `@app.post('/users')`
 *   - `@router.get('/items/{item_id}')` / `@router.delete('/items/{item_id}')`
 *   - `APIRouter(prefix="/api/v1")` prefix 組合
 *   - Path parameters: `/items/{item_id}` 保留原樣
 */

import { PythonBaseAdapter } from './python-base-adapter.js';
import type { AdapterContext, FrameworkDetection } from './types.js';
import type { AnalysisResult, GraphNode } from '../../types.js';
import type { ApiEndpoint } from '../endpoint-detector.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** HTTP methods recognised by FastAPI decorators (lowercase for regex). */
const HTTP_METHODS_LC = 'get|post|put|delete|patch';

/**
 * Matches FastAPI decorator-based route registrations:
 *   @app.get("/users")
 *   @router.post('/items/{item_id}')
 *
 * Capture groups:
 *   [1] HTTP method (lowercase)
 *   [2] URL path string
 */
const FASTAPI_DECORATOR_RE = new RegExp(
  `@(?:app|router)\\.(${HTTP_METHODS_LC})\\(\\s*['"]([^'"]+)['"]`,
  'gi',
);

/**
 * Matches APIRouter instantiation with a prefix:
 *   router = APIRouter(prefix="/api/v1")
 *
 * Capture groups:
 *   [1] Variable name
 *   [2] Prefix path string
 */
const API_ROUTER_PREFIX_RE = /(\w+)\s*=\s*APIRouter\s*\([^)]*prefix\s*=\s*['"]([^'"]+)['"]/gi;

/** Regex for Python function definition after a decorator. */
const PYTHON_DEF_RE = /(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/;

/** File extension for Python source files. */
const PY_EXTENSION_RE = /\.py$/i;

// ---------------------------------------------------------------------------
// FastAPIAdapter
// ---------------------------------------------------------------------------

/**
 * FastAPI 框架 Adapter。
 *
 * - `detect()`: 檢查 requirements.txt / pyproject.toml / setup.py 中是否有 fastapi
 * - `extractEndpoints()`: 解析 @app.get / @router.post 等 decorator
 * - `buildChains()`: 繼承 PythonBaseAdapter 的 heuristic chain building
 */
export class FastAPIAdapter extends PythonBaseAdapter {
  readonly name = 'fastapi';
  readonly displayName = 'FastAPI';
  readonly language = 'python' as const;

  // -------------------------------------------------------------------------
  // detect
  // -------------------------------------------------------------------------

  /**
   * 偵測目標專案是否使用 FastAPI。
   *
   * @param analysis 分析結果
   * @returns 偵測結果（confidence 1.0），若未偵測到則回傳 `null`
   */
  detect(analysis: AnalysisResult): FrameworkDetection | null {
    const result = this.detectPythonDependency(analysis, 'fastapi');
    if (!result.found) return null;

    const evidence = [`found fastapi in ${result.source}`];
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
   * 從分析結果中萃取 FastAPI API 端點。
   *
   * 遍歷所有 .py 檔案節點，解析：
   * 1. APIRouter(prefix=...) prefix 宣告
   * 2. @app.get / @router.post 等 decorator 端點
   * 3. 組合 prefix + path 產生完整路徑
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

      // Step 1: Detect APIRouter prefixes
      const prefixMap = this.extractRouterPrefixes(source);

      // Step 2: Extract decorator endpoints
      this.extractDecoratorRoutes(source, fileNode, prefixMap, results);
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * 從 source 中提取 APIRouter(prefix=...) 宣告。
   */
  private extractRouterPrefixes(source: string): Map<string, string> {
    const prefixes = new Map<string, string>();
    const re = new RegExp(API_ROUTER_PREFIX_RE.source, 'gi');
    let match: RegExpExecArray | null;

    while ((match = re.exec(source)) !== null) {
      const varName = match[1];
      const prefix = match[2];
      if (varName && prefix) {
        prefixes.set(varName, prefix);
      }
    }

    return prefixes;
  }

  /**
   * 從 source 中提取 @app.get / @router.post 等 decorator 端點。
   */
  private extractDecoratorRoutes(
    source: string,
    fileNode: GraphNode,
    prefixMap: Map<string, string>,
    results: ApiEndpoint[],
  ): void {
    const decoratorRe = new RegExp(FASTAPI_DECORATOR_RE.source, 'gi');
    const sourceLines = source.split('\n');
    let match: RegExpExecArray | null;

    while ((match = decoratorRe.exec(source)) !== null) {
      const rawMethod = match[1];
      const routePath = match[2];
      if (!rawMethod || !routePath) continue;

      const method = this.normaliseMethod(rawMethod);
      if (!method) continue;

      // Find handler name
      const handlerName = this.findDefName(source, match.index, sourceLines);

      // Compose path with APIRouter prefix if applicable
      const fullPath = this.composeWithPrefix(routePath, match[0], prefixMap);

      const id = `${method} ${fullPath}`;
      if (!results.some((e) => e.id === id)) {
        results.push({
          id,
          method,
          path: fullPath,
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
   * 組合 endpoint 路徑和 APIRouter prefix（如有）。
   */
  private composeWithPrefix(
    routePath: string,
    decoratorText: string,
    prefixMap: Map<string, string>,
  ): string {
    if (prefixMap.size === 0) return routePath;

    // Check which router variable is used in this decorator
    for (const [varName, prefix] of prefixMap) {
      if (decoratorText.includes(`@${varName}.`)) {
        const cleanPrefix = prefix.replace(/\/+$/, '');
        const cleanPath = routePath.startsWith('/') ? routePath : `/${routePath}`;
        return `${cleanPrefix}${cleanPath}`;
      }
    }

    return routePath;
  }
}
