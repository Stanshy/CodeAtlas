/**
 * @file AIFallbackAdapter — AI 兜底端點偵測 Adapter
 * @description Sprint 24 T17 — 當所有規則引擎 adapter 無法識別端點時，
 *   使用 AI Provider 分析原始碼以識別 API 端點。
 *
 * 特性：
 *   - detect() 永遠回傳低 confidence（0.1）— 作為最後 fallback
 *   - extractEndpoints() 為同步空回傳，真正的 AI 路徑由 extractEndpointsAsync() 提供
 *   - AI 未設定或錯誤時優雅降級（返回空陣列，不 throw）
 */

import { BaseAdapter } from './base-adapter.js';
import type { AdapterContext, FrameworkDetection } from './types.js';
import type { AnalysisResult, GraphNode, SummaryProvider } from '../../types.js';
import type { ApiEndpoint, HttpMethod } from '../endpoint-detector.js';
import { AIEndpointDetectionSchema } from '../../ai/contracts.js';
import { buildEndpointDetectionPrompt } from '../../ai/prompt-templates.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of source files to send to AI for analysis. */
const MAX_FILES_FOR_AI = 20;

/** Maximum source file size (bytes) to include in AI prompt. */
const MAX_FILE_SIZE = 50_000;

/** File extensions to include for AI analysis. */
const SOURCE_EXTENSIONS_RE = /\.(js|ts|mjs|cjs|jsx|tsx|py|java|rb|go|rs|php)$/i;

// ---------------------------------------------------------------------------
// AIFallbackAdapter
// ---------------------------------------------------------------------------

/**
 * AI 兜底 Adapter — 使用 AI Provider 分析原始碼以識別 API 端點。
 *
 * - `detect()`: 永遠回傳低 confidence（0.1）
 * - `extractEndpoints()`: 同步版回傳空陣列（AI 需 async）
 * - `extractEndpointsAsync()`: 非同步版呼叫 AI Provider
 * - `buildChains()`: 繼承 BaseAdapter BFS 實作
 */
export class AIFallbackAdapter extends BaseAdapter {
  readonly name = 'ai-fallback';
  readonly displayName = 'AI Fallback';
  readonly language = 'javascript' as const;

  private provider: SummaryProvider | null = null;

  /**
   * 設定 AI Provider。
   * @param provider AI Provider 實例（null 表示停用）
   */
  setProvider(provider: SummaryProvider | null): void {
    this.provider = provider;
  }

  // -------------------------------------------------------------------------
  // detect
  // -------------------------------------------------------------------------

  /**
   * AI Fallback 永遠回傳低 confidence 偵測結果。
   *
   * 作為 AdapterRegistry 中最後一個 adapter，
   * 只在所有規則引擎 adapter 都未偵測到時才被使用。
   *
   * @param _analysis 分析結果（不使用）
   * @returns 固定低 confidence 偵測結果
   */
  detect(_analysis: AnalysisResult): FrameworkDetection | null {
    return {
      adapterName: this.name,
      confidence: 0.1,
      evidence: ['AI fallback — activated when no rule-based adapter matches'],
    };
  }

  // -------------------------------------------------------------------------
  // extractEndpoints (sync — returns empty)
  // -------------------------------------------------------------------------

  /**
   * 同步版端點萃取 — AI 需要非同步呼叫，同步版回傳空陣列。
   *
   * 請使用 `extractEndpointsAsync()` 取得 AI 識別的端點。
   *
   * @param _ctx adapter 上下文（不使用）
   * @returns 空陣列
   */
  extractEndpoints(_ctx: AdapterContext): ApiEndpoint[] {
    return [];
  }

  // -------------------------------------------------------------------------
  // extractEndpointsAsync
  // -------------------------------------------------------------------------

  /**
   * 非同步版端點萃取 — 呼叫 AI Provider 分析原始碼。
   *
   * 流程：
   * 1. 檢查 AI Provider 是否設定
   * 2. 收集原始碼檔案（最多 MAX_FILES_FOR_AI 個）
   * 3. 建構 prompt 並呼叫 AI Provider
   * 4. 驗證並轉換 AI 回應為 ApiEndpoint[]
   *
   * @param ctx adapter 上下文
   * @returns AI 識別的端點清單（AI 未設定或錯誤時回傳空陣列）
   */
  async extractEndpointsAsync(ctx: AdapterContext): Promise<ApiEndpoint[]> {
    if (!this.provider) {
      console.warn('[AIFallbackAdapter] No AI provider configured, returning empty endpoints');
      return [];
    }

    try {
      const sourceFiles = this.collectSourceFiles(ctx);
      if (sourceFiles.length === 0) return [];

      const prompt = buildEndpointDetectionPrompt(sourceFiles);

      // Call AI provider — use summarize() as it's the common interface
      const response = await this.provider.summarize({
        prompt,
        projectName: 'endpoint-detection',
        context: '',
      });

      if (!response) return [];

      // Parse the AI response as JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return [];

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        console.warn('[AIFallbackAdapter] Failed to parse AI response as JSON');
        return [];
      }

      // Validate against schema
      const result = AIEndpointDetectionSchema.safeParse(parsed);
      if (!result.success) {
        console.warn('[AIFallbackAdapter] AI response failed schema validation:', result.error.message);
        return [];
      }

      // Convert to ApiEndpoint[]
      return result.data.endpoints.map((ep) => ({
        id: `${ep.method} ${ep.path}`,
        method: ep.method as HttpMethod,
        path: ep.path,
        handler: ep.handler,
        handlerFileId: ep.filePath,
        line: ep.line,
        description: ep.framework ? `Detected by AI (${ep.framework})` : 'Detected by AI',
      }));
    } catch (error) {
      console.warn('[AIFallbackAdapter] AI endpoint detection failed:', error);
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * 收集要送給 AI 分析的原始碼檔案。
   */
  private collectSourceFiles(ctx: AdapterContext): Array<{ path: string; content: string }> {
    const { analysis } = ctx;
    const files: Array<{ path: string; content: string }> = [];

    const sourceNodes = analysis.graph.nodes.filter(
      (n: GraphNode) => n.type === 'file' && SOURCE_EXTENSIONS_RE.test(n.filePath),
    );

    // Take up to MAX_FILES_FOR_AI files, preferring shorter files
    const sorted = sourceNodes.slice(0, MAX_FILES_FOR_AI * 2);

    for (const node of sorted) {
      if (files.length >= MAX_FILES_FOR_AI) break;

      const content = this.readSourceCode(analysis, node);
      if (!content || content.length > MAX_FILE_SIZE) continue;

      files.push({ path: node.filePath, content });
    }

    return files;
  }
}
