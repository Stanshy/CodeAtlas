# Orchestrator 重構

| 欄位 | 值 |
|------|-----|
| ID | T7 |
| 專案 | CodeAtlas |
| Sprint | Sprint 24 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T3,T4,T5,T6 |
| 預估 | 3h |
| 建立時間 | 2026-04-14T05:24:59.365Z |

---

## 任務描述

重構 `packages/core/src/analyzers/endpoint-detector.ts` 為薄 orchestrator：

1. 移除所有框架特定 regex 和解析邏輯（已移到各 adapter）
2. 引入 AdapterRegistry，呼叫 `createDefaultRegistry()`
3. 實作 `buildAdapterContext(analysis)` 建構 AdapterContext
4. orchestrator 邏輯：遍歷 matched adapters → extractEndpoints → dedup → buildChains
5. 保留 `detectEndpoints(analysis): EndpointGraph | null` 公開 API 簽名不變
6. 加入 rollback flag：`LEGACY_ENDPOINT_DETECTION=true` env var 走舊路徑

參考技術方案第 2.5 節。

**關鍵約束**：公開 API 簽名不變，確保零回歸。

## 驗收標準

- [x] `detectEndpoints()` 簽名不變
- [x] 使用 AdapterRegistry 和 AdapterContext
- [x] 框架特定邏輯移到 adapter（legacy 保留作 rollback）
- [x] rollback flag 可用（LEGACY_ENDPOINT_DETECTION=true）
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-04-14T05:24:59.365Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
