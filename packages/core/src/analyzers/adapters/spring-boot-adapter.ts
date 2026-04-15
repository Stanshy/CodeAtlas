/**
 * @file SpringBootAdapter — Spring Boot 框架端點偵測 Adapter
 * @description Sprint 24 T15 — 偵測 Spring Boot 專案並從 Java 原始碼中
 *   解析 @RestController + @GetMapping/@PostMapping 等 annotation 模式。
 *
 * 支援的路由模式：
 *   - `@RestController` / `@Controller` class-level annotations
 *   - `@RequestMapping("/prefix")` class-level prefix
 *   - `@GetMapping("/path")`, `@PostMapping("/path")`, `@PutMapping`, `@DeleteMapping`, `@PatchMapping`
 *   - `@RequestMapping(value = "/path", method = RequestMethod.GET)`
 */

import { BaseAdapter } from './base-adapter.js';
import type { AdapterContext, FrameworkDetection } from './types.js';
import type { AnalysisResult, GraphNode } from '../../types.js';
import type { ApiEndpoint } from '../endpoint-detector.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Matches @RestController or @Controller annotation. */
const CONTROLLER_ANNOTATION_RE = /@(?:RestController|Controller)\b/;

/** Matches class-level @RequestMapping prefix. */
const CLASS_REQUEST_MAPPING_RE = /@RequestMapping\(\s*(?:value\s*=\s*)?["']([^"']+)["']\s*\)/;

/** Matches shorthand mapping annotations with path argument. */
const METHOD_MAPPING_RE = /@(Get|Post|Put|Delete|Patch)Mapping\(\s*(?:value\s*=\s*)?["']([^"']*?)["']\s*\)/g;

/** Matches shorthand mapping annotations with no arguments. */
const METHOD_MAPPING_NO_ARG_RE = /@(Get|Post|Put|Delete|Patch)Mapping(?:\(\s*\))?(?=\s)/g;

/** Matches @RequestMapping with attributes. */
const REQUEST_MAPPING_WITH_METHOD_RE = /@RequestMapping\(([^)]*)\)/g;

/** Extract path from @RequestMapping attributes. */
const RM_VALUE_RE = /(?:value\s*=\s*)?["']([^"']+)["']/;

/** Extract method from @RequestMapping attributes. */
const RM_METHOD_RE = /method\s*=\s*RequestMethod\.(\w+)/;

/** Matches Java method declaration. */
const JAVA_METHOD_NAME_RE = /(?:public|protected|private)?\s*(?:[\w<>[\],\s]+)\s+(\w+)\s*\(/;

/** File extension for Java source files. */
const JAVA_EXTENSION_RE = /\.java$/i;

// ---------------------------------------------------------------------------
// SpringBootAdapter
// ---------------------------------------------------------------------------

/**
 * Spring Boot 框架 Adapter。
 *
 * - `detect()`: 檢查 pom.xml / build.gradle 中是否有 spring-boot-starter-web
 * - `extractEndpoints()`: 解析 @RestController + @GetMapping 等 annotation
 * - `buildChains()`: 沿用 BaseAdapter 預設 BFS 實作
 */
export class SpringBootAdapter extends BaseAdapter {
  readonly name = 'spring-boot';
  readonly displayName = 'Spring Boot';
  readonly language = 'java' as const;

  // -------------------------------------------------------------------------
  // detect
  // -------------------------------------------------------------------------

  /**
   * 偵測目標專案是否使用 Spring Boot。
   *
   * 在 analysis graph nodes 中搜尋 pom.xml 或 build.gradle，
   * 檢查是否包含 spring-boot-starter-web 依賴。
   *
   * @param analysis 分析結果
   * @returns 偵測結果（confidence 1.0），若未偵測到則回傳 `null`
   */
  detect(analysis: AnalysisResult): FrameworkDetection | null {
    // Try pom.xml first (Maven)
    const pomSource = this.readProjectFile(analysis, 'pom.xml');
    if (pomSource && /<artifactId>\s*spring-boot-starter-web\s*<\/artifactId>/.test(pomSource)) {
      return {
        adapterName: this.name,
        confidence: 1.0,
        evidence: ['found spring-boot-starter-web in pom.xml'],
      };
    }

    // Try build.gradle (Gradle)
    const gradleSource = this.readProjectFile(analysis, 'build.gradle');
    if (gradleSource && /spring-boot-starter-web/.test(gradleSource)) {
      return {
        adapterName: this.name,
        confidence: 1.0,
        evidence: ['found spring-boot-starter-web in build.gradle'],
      };
    }

    return null;
  }

  // -------------------------------------------------------------------------
  // extractEndpoints
  // -------------------------------------------------------------------------

  /**
   * 從分析結果中萃取 Spring Boot API 端點。
   *
   * 遍歷所有 .java 檔案節點，搜尋 @RestController / @Controller annotation，
   * 再解析 @GetMapping / @PostMapping / @RequestMapping 等 method-level annotation。
   *
   * @param ctx 預處理的分析上下文
   * @returns 端點清單
   */
  extractEndpoints(ctx: AdapterContext): ApiEndpoint[] {
    const { analysis } = ctx;
    const results: ApiEndpoint[] = [];
    const seenIds = new Set<string>();

    const javaFiles = analysis.graph.nodes.filter(
      (n: GraphNode) => n.type === 'file' && JAVA_EXTENSION_RE.test(n.filePath),
    );

    for (const fileNode of javaFiles) {
      const source = this.readSourceCode(analysis, fileNode);
      if (!source) continue;

      // Only process controller classes
      if (!CONTROLLER_ANNOTATION_RE.test(source)) continue;

      const extracted = this.extractFromController(source, fileNode);
      for (const ep of extracted) {
        if (seenIds.has(ep.id)) continue;
        seenIds.add(ep.id);
        results.push(ep);
      }
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * 從單一 Spring controller 原始碼中萃取端點。
   */
  private extractFromController(source: string, fileNode: GraphNode): ApiEndpoint[] {
    const results: ApiEndpoint[] = [];
    const classPrefix = this.extractClassPrefix(source);

    this.extractShorthandMappings(source, classPrefix, fileNode, results);
    this.extractRequestMappingWithMethod(source, classPrefix, fileNode, results);

    return results;
  }

  /**
   * 提取 class-level @RequestMapping prefix。
   */
  private extractClassPrefix(source: string): string {
    const match = CLASS_REQUEST_MAPPING_RE.exec(source);
    return match ? (match[1] ?? '') : '';
  }

  /**
   * 萃取 @GetMapping / @PostMapping 等 shorthand mapping 端點。
   */
  private extractShorthandMappings(
    source: string,
    classPrefix: string,
    fileNode: GraphNode,
    results: ApiEndpoint[],
  ): void {
    // With path argument
    const withArgRe = new RegExp(METHOD_MAPPING_RE.source, 'g');
    let match: RegExpExecArray | null;

    while ((match = withArgRe.exec(source)) !== null) {
      const methodPrefix = match[1];
      const methodPath = match[2] ?? '';
      if (!methodPrefix) continue;

      const httpMethod = this.normaliseMethod(methodPrefix);
      if (!httpMethod) continue;

      const fullPath = this.composePath(classPrefix, methodPath);
      const handler = this.findHandlerName(source, match.index);

      results.push({
        id: `${httpMethod} ${fullPath}`,
        method: httpMethod,
        path: fullPath,
        handler,
        handlerFileId: fileNode.id,
      });
    }

    // No arguments (maps to root or class prefix)
    const noArgRe = new RegExp(METHOD_MAPPING_NO_ARG_RE.source, 'g');
    while ((match = noArgRe.exec(source)) !== null) {
      const methodPrefix = match[1];
      if (!methodPrefix) continue;

      // Avoid double-counting annotations that have path arguments
      const surroundingText = source.substring(match.index, match.index + match[0].length + 5);
      if (/\(\s*["']/.test(surroundingText)) continue;

      const httpMethod = this.normaliseMethod(methodPrefix);
      if (!httpMethod) continue;

      const fullPath = classPrefix || '/';
      const handler = this.findHandlerName(source, match.index);

      results.push({
        id: `${httpMethod} ${fullPath}`,
        method: httpMethod,
        path: fullPath,
        handler,
        handlerFileId: fileNode.id,
      });
    }
  }

  /**
   * 萃取 @RequestMapping(method = RequestMethod.XXX) 端點。
   */
  private extractRequestMappingWithMethod(
    source: string,
    classPrefix: string,
    fileNode: GraphNode,
    results: ApiEndpoint[],
  ): void {
    const rmRe = new RegExp(REQUEST_MAPPING_WITH_METHOD_RE.source, 'g');
    let match: RegExpExecArray | null;

    while ((match = rmRe.exec(source)) !== null) {
      const attrs = match[1] ?? '';

      const methodMatch = RM_METHOD_RE.exec(attrs);
      if (!methodMatch) continue;

      const httpMethod = this.normaliseMethod(methodMatch[1] ?? '');
      if (!httpMethod) continue;

      const valueMatch = RM_VALUE_RE.exec(attrs);
      const methodPath = valueMatch ? (valueMatch[1] ?? '') : '';

      const fullPath = this.composePath(classPrefix, methodPath);
      const handler = this.findHandlerName(source, match.index);

      results.push({
        id: `${httpMethod} ${fullPath}`,
        method: httpMethod,
        path: fullPath,
        handler,
        handlerFileId: fileNode.id,
      });
    }
  }

  /**
   * 組合 class prefix 和 method path。
   */
  private composePath(classPrefix: string, methodPath: string): string {
    const prefix = classPrefix.replace(/\/+$/, '');
    const suffix = methodPath.replace(/^\/+/, '');

    if (!prefix && !suffix) return '/';
    if (!prefix) return `/${suffix}`;
    if (!suffix) return prefix.startsWith('/') ? prefix : `/${prefix}`;

    const combined = `${prefix}/${suffix}`;
    return combined.startsWith('/') ? combined : `/${combined}`;
  }

  /**
   * 在 annotation 後找到 Java method 名稱。
   */
  private findHandlerName(source: string, annotationOffset: number): string {
    const remaining = source.substring(annotationOffset, annotationOffset + 500);
    const lines = remaining.split('\n');

    for (let i = 1; i < Math.min(lines.length, 8); i++) {
      const line = lines[i] ?? '';
      const methodMatch = JAVA_METHOD_NAME_RE.exec(line);
      if (methodMatch && methodMatch[1]) {
        return methodMatch[1];
      }
    }

    return '<anonymous>';
  }
}
