/**
 * @file BaseAdapter — FrameworkAdapter 抽象基類
 * @description Sprint 24 T2 — 從 endpoint-detector.ts 抽出共用邏輯，
 *   提供 BFS chain building、handler 解析、source code 讀取等 protected 方法，
 *   子類只需實作 `detect()` 與 `extractEndpoints()` 即可。
 */

import fs from 'node:fs';
import path from 'node:path';

import type { AnalysisResult, GraphNode, SupportedLanguage } from '../../types.js';
import type {
  ApiEndpoint,
  ChainStep,
  EndpointChain,
  HttpMethod,
} from '../endpoint-detector.js';
import type {
  FrameworkAdapter,
  AdapterContext,
  FrameworkDetection,
  MiddlewareDescriptor,
} from './types.js';
import { classifyMethodRole } from '../../ai/method-role-classifier.js';

// ---------------------------------------------------------------------------
// BaseAdapter
// ---------------------------------------------------------------------------

/**
 * 框架 Adapter 抽象基類。
 *
 * 封裝從 `endpoint-detector.ts` 抽出的共用邏輯（HTTP method 正規化、
 * handler 參數解析、source code 讀取、BFS call-chain 建構等），
 * 子類僅需實作框架特定的 `detect()` 與 `extractEndpoints()`。
 *
 * 預設提供：
 * - `buildChains()` — BFS 呼叫鏈建構（可 override）
 * - `extractMiddleware()` — 回傳空陣列（可 override）
 */
export abstract class BaseAdapter implements FrameworkAdapter {
  // -------------------------------------------------------------------------
  // Abstract properties — 子類必須提供
  // -------------------------------------------------------------------------

  /** 機器可讀的 adapter 名稱，須全域唯一 */
  abstract readonly name: string;

  /** 人類可讀的顯示名稱，用於 UI 呈現 */
  abstract readonly displayName: string;

  /** 此 adapter 支援的程式語言 */
  abstract readonly language: SupportedLanguage;

  // -------------------------------------------------------------------------
  // Constants
  // -------------------------------------------------------------------------

  /**
   * BFS 呼叫鏈最大追蹤深度。
   * Sprint 13 spec: truncate at depth 10.
   */
  protected static readonly MAX_CHAIN_DEPTH = 10;

  // -------------------------------------------------------------------------
  // Abstract methods — 子類必須實作
  // -------------------------------------------------------------------------

  /**
   * 偵測目標專案是否使用此框架。
   * @param analysis 分析結果
   * @returns 偵測結果，若不符合則回傳 `null`
   */
  abstract detect(analysis: AnalysisResult): FrameworkDetection | null;

  /**
   * 從分析結果中萃取 API 端點。
   * @param ctx 預處理的分析上下文
   * @returns 端點清單
   */
  abstract extractEndpoints(ctx: AdapterContext): ApiEndpoint[];

  // -------------------------------------------------------------------------
  // Default implementations (overridable)
  // -------------------------------------------------------------------------

  /**
   * 為每個端點建立呼叫鏈（handler -> service -> repository 等）。
   *
   * 預設實作使用 BFS 追蹤 `call` 邊，子類可 override 以實作框架特定邏輯。
   *
   * @param endpoints `extractEndpoints` 回傳的端點清單
   * @param ctx 預處理的分析上下文
   * @returns 端點呼叫鏈清單
   */
  buildChains(endpoints: ApiEndpoint[], ctx: AdapterContext): EndpointChain[] {
    const { nodeMap, callAdjacency } = ctx;

    const chains: EndpointChain[] = [];

    for (const ep of endpoints) {
      // Resolve handler node id
      const handlerNodeId = this.resolveHandlerNodeId(ep, ctx);
      if (!handlerNodeId) continue;

      const steps = this.buildChainSteps(handlerNodeId, nodeMap, callAdjacency);
      if (steps.length > 0) {
        chains.push({ endpointId: ep.id, steps });
      }
    }

    return chains;
  }

  /**
   * 萃取 middleware 資訊。
   *
   * 預設回傳空陣列，子類可 override 以提供框架特定的 middleware 偵測。
   *
   * @param _ctx 預處理的分析上下文
   * @returns middleware 描述子清單
   */
  extractMiddleware(_ctx: AdapterContext): MiddlewareDescriptor[] {
    return [];
  }

  // -------------------------------------------------------------------------
  // Protected helpers — 子類可直接呼叫
  // -------------------------------------------------------------------------

  /**
   * 正規化 HTTP method 字串為大寫標準形式。
   * 僅接受 GET / POST / PUT / DELETE / PATCH，其餘回傳 `null`。
   *
   * @param raw 原始 HTTP method 字串（大小寫不拘）
   * @returns 正規化後的 HttpMethod，或 `null`
   */
  protected normaliseMethod(raw: string): HttpMethod | null {
    const upper = raw.toUpperCase();
    const valid: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    return valid.includes(upper as HttpMethod) ? (upper as HttpMethod) : null;
  }

  /**
   * 解析路由定義中 handler / middleware 名稱。
   *
   * 從路由呼叫的參數列表中辨識具名函式引用與匿名函式：
   * - 具名引用按順序排列，最後一個視為 handler，其餘為 middleware
   * - 遇到 arrow function 或 `function` 關鍵字時，handler 標記為 `<anonymous>`
   *
   * @param argList 逗號分隔的參數字串（路徑之後的部分）
   * @returns handler 名稱與 middleware 名稱陣列
   *
   * @example
   * ```
   * parseHandlerArgs('authMiddleware, validateBody, uploadHandler')
   * // => { handler: 'uploadHandler', middlewares: ['authMiddleware', 'validateBody'] }
   *
   * parseHandlerArgs('authMiddleware, (req, res) => { ... }')
   * // => { handler: '<anonymous>', middlewares: ['authMiddleware'] }
   * ```
   */
  protected parseHandlerArgs(argList: string): { handler: string; middlewares: string[] } {
    const hasInlineHandler = /=>|function\s*\(/.test(argList);

    const tokens = argList
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((t) => t.replace(/\)+$/, '').trim())
      .filter((t) => t.length > 0);

    const names: string[] = [];
    for (const token of tokens) {
      if (/^[A-Za-z_$][\w$.]*$/.test(token)) {
        names.push(token);
      } else if (/function|=>/.test(token)) {
        break;
      }
    }

    if (hasInlineHandler) {
      return { handler: '<anonymous>', middlewares: names };
    }

    if (names.length === 0) {
      return { handler: '<anonymous>', middlewares: [] };
    }

    const handler = names[names.length - 1]!;
    const middlewares = names.slice(0, -1);
    return { handler, middlewares };
  }

  /**
   * 讀取指定檔案節點的原始碼。
   *
   * 使用 `analysis.projectPath` + `node.filePath` 組合絕對路徑後同步讀取。
   * 讀取失敗時靜默回傳空字串，不拋出例外。
   *
   * @param analysis 分析結果（提供 projectPath）
   * @param node 檔案對應的 GraphNode（提供 filePath）
   * @returns 檔案原始碼，讀取失敗時為空字串
   */
  protected readSourceCode(analysis: AnalysisResult, node: GraphNode): string {
    try {
      const absolutePath = path.join(analysis.projectPath, node.filePath);
      return fs.readFileSync(absolutePath, 'utf-8');
    } catch {
      return '';
    }
  }

  /**
   * 從磁碟直接讀取專案根目錄下的指定檔案。
   *
   * 用於 detect() 階段讀取設定檔（package.json, requirements.txt, pom.xml 等），
   * 這些檔案不一定存在於 analysis.graph.nodes 中（scanner 只收程式碼檔案）。
   *
   * @param analysis 分析結果（提供 projectPath）
   * @param relativePath 相對於專案根的檔案路徑
   * @returns 檔案內容，讀取失敗時為空字串
   */
  protected readProjectFile(analysis: AnalysisResult, relativePath: string): string {
    try {
      const absolutePath = path.join(analysis.projectPath, relativePath);
      return fs.readFileSync(absolutePath, 'utf-8');
    } catch {
      return '';
    }
  }

  /**
   * 在指定檔案中尋找包含給定行號的最小範圍具名函式節點。
   *
   * 用於匿名 inline handler 的場景：當 handler 為匿名函式時，
   * 透過行號定位其所在的最窄具名函式作為 chain 起點。
   *
   * @param fileId 檔案節點 ID
   * @param line 目標行號（1-based）
   * @param fnNodes 所有 function 類型的 GraphNode
   * @returns 最窄的包含函式節點，找不到時為 `null`
   */
  protected findEnclosingFunction(
    fileId: string,
    line: number | undefined,
    fnNodes: GraphNode[],
  ): GraphNode | null {
    if (line === undefined) return null;

    let best: GraphNode | null = null;
    let bestRange = Infinity;

    for (const fn of fnNodes) {
      if (fn.metadata.parentFileId !== fileId) continue;

      const startLine = fn.metadata.startLine as number | undefined;
      const endLine = fn.metadata.endLine as number | undefined;
      if (startLine === undefined || endLine === undefined) continue;
      if (line < startLine || line > endLine) continue;

      const range = endLine - startLine;
      if (range < bestRange) {
        bestRange = range;
        best = fn;
      }
    }

    return best;
  }

  /**
   * BFS 追蹤呼叫鏈，從 handler 節點出發沿 `call` 邊展開。
   *
   * handler 本身不包含在回傳的 steps 中（由端點條目表示）。
   * 終止條件：所有可達節點已訪問，或深度達到 `MAX_CHAIN_DEPTH`。
   *
   * 每個 step 會透過 `classifyStepRole()` 標註 MethodRole。
   *
   * @param handlerNodeId handler 函式的 node ID
   * @param nodeMap node ID -> GraphNode 查表
   * @param callAdjacency caller node ID -> callee node ID[] 鄰接表
   * @returns 呼叫鏈步驟陣列（不含 handler 自身）
   */
  protected buildChainSteps(
    handlerNodeId: string,
    nodeMap: Map<string, GraphNode>,
    callAdjacency: Map<string, string[]>,
  ): ChainStep[] {
    const steps: ChainStep[] = [];
    const visited = new Set<string>([handlerNodeId]);
    const queue: [string, number][] = [[handlerNodeId, 0]];

    while (queue.length > 0) {
      const entry = queue.shift();
      if (!entry) break;
      const [currentId, depth] = entry;

      if (depth >= BaseAdapter.MAX_CHAIN_DEPTH) continue;

      const callees = callAdjacency.get(currentId) ?? [];
      for (const calleeId of callees) {
        if (visited.has(calleeId)) continue;
        visited.add(calleeId);

        const calleeNode = nodeMap.get(calleeId);
        if (!calleeNode) continue;

        steps.push(this.nodeToChainStep(calleeNode));
        queue.push([calleeId, depth + 1]);
      }
    }

    // Enrich each step with MethodRole classification
    return steps.map((step) => {
      const roleInfo = this.classifyStepRole(step);
      return { ...step, role: roleInfo.role, roleConfidence: roleInfo.roleConfidence };
    });
  }

  /**
   * 使用 MethodRole rule engine 分類 chain step 的角色。
   *
   * 分類失敗時回退為 `{ role: 'utility', roleConfidence: 0.5 }`。
   *
   * @param step 待分類的 ChainStep
   * @returns role 名稱與信心度
   */
  protected classifyStepRole(step: ChainStep): { role: string; roleConfidence: number } {
    try {
      const result = classifyMethodRole({
        name: step.method || step.name,
        filePath: step.fileId,
      });
      return { role: result.role, roleConfidence: result.confidence };
    } catch {
      return { role: 'utility', roleConfidence: 0.5 };
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * 將 GraphNode 轉換為 ChainStep。
   *
   * @param node function/class GraphNode
   * @returns 對應的 ChainStep（不含 role，由呼叫端補充）
   */
  private nodeToChainStep(node: GraphNode): ChainStep {
    const methodName = node.label.replace(/\(\)$/, '');
    const fileId = node.metadata.parentFileId ?? node.filePath;

    return {
      name: `${methodName}()`,
      method: methodName,
      fileId,
    };
  }

  /**
   * 解析端點的 handler node ID。
   *
   * 查找策略：
   * 1. 以 handler 名稱在 functionsByLabel 中查找同檔案的函式節點
   * 2. 若 handler 為 `<anonymous>`，使用 `findEnclosingFunction` 定位
   * 3. 找不到時回傳 `undefined`
   *
   * @param ep API 端點
   * @param ctx adapter 上下文
   * @returns handler 節點 ID，或 `undefined`
   */
  private resolveHandlerNodeId(
    ep: ApiEndpoint,
    ctx: AdapterContext,
  ): string | undefined {
    const { functionsByLabel, functionNodes } = ctx;

    if (ep.handler !== '<anonymous>') {
      // Look up by handler name, prefer same-file match
      const candidates = functionsByLabel.get(ep.handler) ?? [];
      const sameFile = candidates.find(
        (n) => n.metadata.parentFileId === ep.handlerFileId || n.filePath === ep.handlerFileId,
      );
      if (sameFile) return sameFile.id;
      if (candidates.length > 0) return candidates[0]!.id;
    }

    // Anonymous handler: find enclosing function by line number
    if (ep.line !== undefined) {
      const enclosing = this.findEnclosingFunction(ep.handlerFileId, ep.line, functionNodes);
      if (enclosing) return enclosing.id;
    }

    return undefined;
  }
}
