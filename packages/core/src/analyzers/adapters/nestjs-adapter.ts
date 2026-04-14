/**
 * @file NestJSAdapter — NestJS 框架端點偵測 Adapter
 * @description Sprint 24 T9 — 偵測 NestJS 專案並從 TypeScript 原始碼中
 *   解析 @Controller + @Get/@Post/@Put/@Delete/@Patch decorator 模式。
 *
 * 支援的路由模式：
 *   - `@Controller('/prefix')` — class-level route prefix
 *   - `@Controller()` — root path (empty prefix)
 *   - `@Get('/:id')`, `@Post()`, `@Put('/path')`, `@Delete()`, `@Patch()` — method-level
 *   - Handler name extracted from the method declaration below the decorator
 *   - Handles access modifiers (public/private/protected) and async methods
 *
 * @example
 *   ```ts
 *   @Controller('/users')
 *   export class UsersController {
 *     @Get('/:id')
 *     async findOne(@Param('id') id: string) { ... }
 *   }
 *   ```
 *   Produces: `GET /users/:id` with handler `findOne`.
 */

import { BaseAdapter } from './base-adapter.js';
import type { AdapterContext, FrameworkDetection } from './types.js';
import type { AnalysisResult, GraphNode } from '../../types.js';
import type { ApiEndpoint, HttpMethod } from '../endpoint-detector.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Matches `@Controller('/prefix')` or `@Controller()` with no argument.
 * Capture groups:
 *   [1] Path string (may be undefined for `@Controller()`)
 */
const CONTROLLER_RE = /@Controller\(\s*(?:['"]([^'"]*)['"]\s*)?\)/;

/**
 * Matches NestJS HTTP method decorators:
 *   `@Get()`, `@Post('/path')`, `@Put()`, `@Delete()`, `@Patch()`
 * Capture groups:
 *   [1] HTTP method name (Get, Post, Put, Delete, Patch)
 *   [2] Path string (may be undefined for `@Get()`)
 */
const METHOD_DECORATOR_RE = /@(Get|Post|Put|Delete|Patch)\(\s*(?:['"]([^'"]*)['"]\s*)?\)/gi;

/**
 * Matches the method name on lines following a decorator.
 * Handles `async methodName(`, `methodName(`, access modifiers.
 * Capture groups:
 *   [1] Method name
 */
const HANDLER_NAME_RE = /(?:async\s+)?(\w+)\s*\(/;

/** File extensions considered as TypeScript source files. */
const TS_EXTENSIONS_RE = /\.(ts|tsx)$/i;

// ---------------------------------------------------------------------------
// NestJSAdapter
// ---------------------------------------------------------------------------

/**
 * NestJS 框架 Adapter。
 *
 * - `detect()`: 檢查 package.json 是否包含 `@nestjs/common` 或 `@nestjs/core`
 * - `extractEndpoints()`: 掃描 TS 檔案，解析 @Controller + @Get/@Post 等 decorator
 * - `buildChains()`: 沿用 BaseAdapter 預設 BFS 實作
 */
export class NestJSAdapter extends BaseAdapter {
  readonly name = 'nestjs';
  readonly displayName = 'NestJS';
  readonly language = 'javascript' as const;

  // -------------------------------------------------------------------------
  // detect
  // -------------------------------------------------------------------------

  /**
   * 偵測目標專案是否使用 NestJS。
   *
   * 在 analysis graph nodes 中尋找 `package.json` 檔案節點，
   * 檢查 `dependencies` 或 `devDependencies` 中是否包含 `@nestjs/common` 或 `@nestjs/core`。
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

    const commonVersion = deps?.['@nestjs/common'] ?? devDeps?.['@nestjs/common'];
    const coreVersion = deps?.['@nestjs/core'] ?? devDeps?.['@nestjs/core'];
    const version = commonVersion ?? coreVersion;

    if (!version) return null;

    return {
      adapterName: this.name,
      confidence: 1.0,
      evidence: [`found @nestjs/common@${version} in package.json dependencies`],
    };
  }

  // -------------------------------------------------------------------------
  // extractEndpoints
  // -------------------------------------------------------------------------

  /**
   * 從分析結果中萃取 NestJS API 端點。
   *
   * 遍歷所有 TS 檔案節點，搜尋 @Controller decorator 定義的 class-level prefix，
   * 再解析各 @Get/@Post/@Put/@Delete/@Patch decorator 組合完整路徑。
   *
   * @param ctx 預處理的分析上下文
   * @returns 端點清單
   */
  extractEndpoints(ctx: AdapterContext): ApiEndpoint[] {
    const { analysis } = ctx;
    const results: ApiEndpoint[] = [];

    // Filter TS file nodes
    const fileNodes = analysis.graph.nodes.filter(
      (n: GraphNode) => n.type === 'file' && TS_EXTENSIONS_RE.test(n.filePath),
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
   * 從單一檔案的原始碼中萃取 NestJS controller 端點。
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
    const lines = source.split('\n');

    // Find all controller declarations
    const controllers = this.findControllers(lines);
    if (controllers.length === 0) return;

    for (let ci = 0; ci < controllers.length; ci++) {
      const controller = controllers[ci]!;
      const nextControllerLine = controllers[ci + 1]?.lineIndex ?? lines.length;

      // Get the text scope for this controller
      const scopeLines = lines.slice(controller.lineIndex, nextControllerLine);
      const scopeText = scopeLines.join('\n');

      // Find all method decorators within this scope
      const methodRe = new RegExp(METHOD_DECORATOR_RE.source, 'gi');
      let match: RegExpExecArray | null;

      while ((match = methodRe.exec(scopeText)) !== null) {
        const rawMethod = match[1];
        const subPath = match[2] ?? '';

        if (!rawMethod) continue;

        const method: HttpMethod | null = this.normaliseMethod(rawMethod);
        if (!method) continue;

        // Calculate the decorator's line index within scope
        const textBefore = scopeText.substring(0, match.index);
        const decoratorLineInScope = textBefore.split('\n').length - 1;

        // Find handler name by scanning lines after decorator
        const handlerName = this.findHandlerName(scopeLines, decoratorLineInScope);

        // Combine controller prefix + method path
        const fullPath = this.combinePaths(controller.prefix, subPath);

        // Calculate absolute line number (1-based)
        const line = controller.lineIndex + decoratorLineInScope + 1;

        const endpoint: ApiEndpoint = {
          id: `${method} ${fullPath}`,
          method,
          path: fullPath,
          handler: handlerName,
          handlerFileId: fileNode.id,
          line,
        };

        results.push(endpoint);
      }
    }
  }

  /**
   * 在原始碼行中搜尋所有 @Controller 宣告。
   *
   * @param lines 原始碼按行分割
   * @returns controller 資訊陣列（含 prefix 和行號）
   */
  private findControllers(
    lines: string[],
  ): Array<{ prefix: string; lineIndex: number }> {
    const controllers: Array<{ prefix: string; lineIndex: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const match = CONTROLLER_RE.exec(line);
      if (match) {
        const rawPrefix = match[1] ?? '';
        const prefix = rawPrefix.startsWith('/') ? rawPrefix : `/${rawPrefix}`;
        controllers.push({ prefix, lineIndex: i });
      }
    }

    return controllers;
  }

  /**
   * 在 decorator 之後的數行中尋找 handler 方法名稱。
   *
   * @param lines scope 內的原始碼行
   * @param decoratorLineIdx decorator 所在行的 0-based 索引
   * @returns handler 方法名稱，找不到時為 `<anonymous>`
   */
  private findHandlerName(lines: string[], decoratorLineIdx: number): string {
    const searchEnd = Math.min(decoratorLineIdx + 6, lines.length);

    for (let i = decoratorLineIdx + 1; i < searchEnd; i++) {
      const line = lines[i] ?? '';
      const trimmed = line.trim();

      // Skip empty lines, other decorators, comments
      if (!trimmed || trimmed.startsWith('@') || trimmed.startsWith('//')) {
        continue;
      }

      // Strip access modifiers
      const cleaned = trimmed
        .replace(/^(public|private|protected)\s+/, '')
        .replace(/^static\s+/, '');

      const nameMatch = HANDLER_NAME_RE.exec(cleaned);
      if (nameMatch) {
        return nameMatch[1] ?? '<anonymous>';
      }
    }

    return '<anonymous>';
  }

  /**
   * 組合 controller prefix 和 method-level path。
   *
   * @param prefix controller-level 路徑前綴（如 `/users`）
   * @param subPath method-level 子路徑（如 `/:id`）
   * @returns 組合後的完整路徑
   */
  private combinePaths(prefix: string, subPath: string): string {
    // Normalize: remove trailing slashes
    const cleanPrefix = prefix.replace(/\/+$/, '');

    if (!subPath) return cleanPrefix || '/';

    const cleanSub = subPath.startsWith('/') ? subPath : `/${subPath}`;
    return `${cleanPrefix}${cleanSub}`;
  }
}
