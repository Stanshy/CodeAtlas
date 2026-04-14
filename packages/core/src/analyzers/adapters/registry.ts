/**
 * @file AdapterRegistry — 框架 Adapter 註冊與偵測中心
 * @description Sprint 24 T3 — 管理所有 FrameworkAdapter 的註冊、框架偵測與匹配查詢
 */

import type { AnalysisResult } from '../../types.js';
import type {
  FrameworkAdapter,
  FrameworkDetection,
  AdapterRegistryEntry,
} from './types.js';

// ---------------------------------------------------------------------------
// AdapterRegistry
// ---------------------------------------------------------------------------

/**
 * 框架 Adapter 註冊表。
 *
 * 負責：
 * 1. 管理已註冊的 FrameworkAdapter 實例
 * 2. 對目標專案執行所有 adapter 的 `detect()`，收集偵測結果
 * 3. 依 confidence 降序回傳匹配的 adapter
 */
export class AdapterRegistry {
  private adapters: AdapterRegistryEntry[] = [];

  /**
   * 註冊一個 adapter。
   * 若已存在同名 adapter（`name` 重複），會跳過並印出警告。
   * @param adapter 要註冊的 FrameworkAdapter 實例
   */
  register(adapter: FrameworkAdapter): void {
    const existing = this.adapters.find(
      (entry) => entry.adapter.name === adapter.name,
    );

    if (existing) {
      console.warn(
        `[AdapterRegistry] Adapter "${adapter.name}" is already registered, skipping.`,
      );
      return;
    }

    this.adapters.push({ adapter });
  }

  /**
   * 對所有已註冊 adapter 執行 `detect()`，回傳非 null 的偵測結果。
   * 同時將偵測結果快取至對應的 registry entry。
   * @param analysis 來自 core 分析引擎的分析結果
   * @returns 所有偵測命中的 FrameworkDetection 陣列
   */
  detectFrameworks(analysis: AnalysisResult): FrameworkDetection[] {
    const detections: FrameworkDetection[] = [];

    for (const entry of this.adapters) {
      try {
        const result = entry.adapter.detect(analysis);
        entry.lastDetection = result;

        if (result !== null) {
          detections.push(result);
        }
      } catch (error) {
        console.warn(
          `[AdapterRegistry] detect() failed for adapter "${entry.adapter.name}":`,
          error,
        );
        entry.lastDetection = null;
      }
    }

    return detections;
  }

  /**
   * 回傳所有 `detect()` 命中的 adapter，按 confidence 降序排列。
   * 內部呼叫 `detectFrameworks()` 取得偵測結果後，依 confidence 排序
   * 並映射回對應的 adapter 實例。
   * @param analysis 來自 core 分析引擎的分析結果
   * @returns 匹配的 FrameworkAdapter 陣列（confidence 高者在前）
   */
  getMatchedAdapters(analysis: AnalysisResult): FrameworkAdapter[] {
    const detections = this.detectFrameworks(analysis);

    // 按 confidence 降序排列
    detections.sort((a, b) => b.confidence - a.confidence);

    // 將 detection 映射回對應的 adapter 實例
    return detections
      .map((detection) => {
        const entry = this.adapters.find(
          (e) => e.adapter.name === detection.adapterName,
        );
        return entry?.adapter ?? null;
      })
      .filter((adapter): adapter is FrameworkAdapter => adapter !== null);
  }

  /**
   * 取得所有已註冊的 adapter 數量（供測試與除錯使用）。
   */
  get size(): number {
    return this.adapters.length;
  }

  /**
   * 依名稱查詢已註冊的 adapter。
   * @param name adapter 的機器可讀名稱
   * @returns 對應的 FrameworkAdapter，若未找到則回傳 `undefined`
   */
  getAdapterByName(name: string): FrameworkAdapter | undefined {
    const entry = this.adapters.find((e) => e.adapter.name === name);
    return entry?.adapter;
  }
}

// ---------------------------------------------------------------------------
// createDefaultRegistry
// ---------------------------------------------------------------------------

/**
 * 建立預設 registry，註冊所有內建 adapter。
 *
 * 目前先回傳空的 registry，待各 adapter 實作完成後（T4–T6）再補上註冊邏輯。
 * 最終預計註冊：Express, Fastify, NestJS, Koa, Hono,
 * Django, Flask, FastAPI, Spring Boot, AI Fallback。
 *
 * @returns 已註冊內建 adapter 的 AdapterRegistry 實例
 */
export function createDefaultRegistry(): AdapterRegistry {
  const registry = new AdapterRegistry();

  // TODO: T4–T6 完成後依序補上內建 adapter 註冊
  // registry.register(new ExpressAdapter());
  // registry.register(new FastifyAdapter());
  // registry.register(new NestJSAdapter());
  // registry.register(new KoaAdapter());
  // registry.register(new HonoAdapter());
  // registry.register(new DjangoAdapter());
  // registry.register(new FlaskAdapter());
  // registry.register(new FastAPIAdapter());
  // registry.register(new SpringBootAdapter());
  // registry.register(new AIFallbackAdapter());

  return registry;
}
