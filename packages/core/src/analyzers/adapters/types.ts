/**
 * @file FrameworkAdapter Plugin 機制核心型別定義
 * @description Sprint 24 T1 — 定義 Adapter 介面、偵測結果、上下文與 Middleware 描述子
 */

import type { AnalysisResult, GraphNode, SupportedLanguage } from '../../types.js';
import type { ApiEndpoint, EndpointChain } from '../endpoint-detector.js';

// ---------------------------------------------------------------------------
// FrameworkDetection
// ---------------------------------------------------------------------------

/**
 * 框架偵測結果，由 adapter 的 `detect()` 回傳。
 * 若 adapter 認為此專案不屬於該框架，應回傳 `null` 而非 confidence=0。
 */
export interface FrameworkDetection {
  /** Adapter 辨識名稱，與 `FrameworkAdapter.name` 一致 */
  adapterName: string;

  /**
   * 偵測信心度，範圍 0–1。
   * - 1.0：確定（e.g. package.json 明確列出框架）
   * - 0.5–0.9：高度可能（e.g. 檔案結構符合慣例）
   * - < 0.5：低信心，僅供參考
   */
  confidence: number;

  /**
   * 偵測佐證清單，供 UI 或除錯時呈現。
   * @example ["found express@4.18 in package.json dependencies", "detected app.listen() call"]
   */
  evidence: string[];
}

// ---------------------------------------------------------------------------
// MiddlewareScope & MiddlewareDescriptor
// ---------------------------------------------------------------------------

/** Middleware 套用範圍 */
export type MiddlewareScope = 'global' | 'route' | 'endpoint';

/**
 * 描述一個 Middleware 的結構化資訊。
 * 由 adapter 的 `extractMiddleware()` 回傳（選用方法）。
 */
export interface MiddlewareDescriptor {
  /** Middleware 名稱（函式名或類別名） */
  name: string;

  /** Middleware 定義所在的檔案路徑（相對專案根目錄） */
  filePath: string;

  /** Middleware 定義所在行號（1-based），若無法確定可省略 */
  line?: number;

  /** 套用範圍：global（全域）、route（路由群組）、endpoint（單一端點） */
  scope: MiddlewareScope;

  /**
   * 當 scope 為 'route' 或 'endpoint' 時，關聯的路由前綴或端點路徑。
   * @example "/api/users"
   */
  appliedTo?: string;

  /** 執行順序索引（0-based），同一 scope 內的排序依據 */
  order?: number;
}

// ---------------------------------------------------------------------------
// AdapterContext
// ---------------------------------------------------------------------------

/**
 * Adapter 方法接收的共用上下文，由 AdapterRegistry 在呼叫前組裝。
 * 提供已預處理的索引結構，避免各 adapter 重複建立。
 */
export interface AdapterContext {
  /** 原始分析結果（來自 core 分析引擎） */
  analysis: AnalysisResult;

  /** node id → GraphNode 快速查表 */
  nodeMap: Map<string, GraphNode>;

  /**
   * 呼叫鄰接表：caller node id → callee node id[]。
   * 用於追蹤函式間的呼叫關係以建立 chain。
   */
  callAdjacency: Map<string, string[]>;

  /**
   * 函式/方法 label → 同名 GraphNode[]。
   * 同名函式可能出現在不同檔案，因此值為陣列。
   */
  functionsByLabel: Map<string, GraphNode[]>;

  /** 所有 type 為 'function' 的 GraphNode（已過濾） */
  functionNodes: GraphNode[];
}

// ---------------------------------------------------------------------------
// FrameworkAdapter
// ---------------------------------------------------------------------------

/**
 * 框架 Adapter 介面——所有框架特定的端點偵測邏輯都實作此介面。
 *
 * 生命週期：
 * 1. `detect()` — 判斷此專案是否使用該框架
 * 2. `extractEndpoints()` — 萃取 API 端點清單
 * 3. `buildChains()` — 為每個端點建立呼叫鏈
 * 4. `extractMiddleware()`（選用）— 萃取 middleware 資訊
 */
export interface FrameworkAdapter {
  /** 機器可讀的 adapter 名稱，須全域唯一 */
  readonly name: string;

  /** 人類可讀的顯示名稱，用於 UI 呈現 */
  readonly displayName: string;

  /** 此 adapter 支援的程式語言 */
  readonly language: SupportedLanguage;

  /**
   * 偵測目標專案是否使用此框架。
   * @returns 偵測結果，若不符合則回傳 `null`
   */
  detect(analysis: AnalysisResult): FrameworkDetection | null;

  /**
   * 從分析結果中萃取 API 端點。
   * @param ctx 預處理的分析上下文
   * @returns 端點清單
   */
  extractEndpoints(ctx: AdapterContext): ApiEndpoint[];

  /**
   * 為每個端點建立呼叫鏈（handler → service → repository 等）。
   * @param endpoints `extractEndpoints` 回傳的端點清單
   * @param ctx 預處理的分析上下文
   * @returns 端點呼叫鏈清單
   */
  buildChains(endpoints: ApiEndpoint[], ctx: AdapterContext): EndpointChain[];

  /**
   * （選用）萃取 middleware 資訊。
   * 未實作時，系統不會產出 middleware 描述子。
   */
  extractMiddleware?(ctx: AdapterContext): MiddlewareDescriptor[];
}

// ---------------------------------------------------------------------------
// AdapterRegistry 輔助型別
// ---------------------------------------------------------------------------

/**
 * Adapter 註冊表條目，包含 adapter 實例與其偵測結果（若已執行偵測）。
 * 供 AdapterRegistry 內部管理使用。
 */
export interface AdapterRegistryEntry {
  /** Adapter 實例 */
  adapter: FrameworkAdapter;

  /** 最近一次偵測結果，尚未偵測時為 `undefined` */
  lastDetection?: FrameworkDetection | null;
}
