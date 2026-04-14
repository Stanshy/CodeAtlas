# Adapter 型別定義

| 欄位 | 值 |
|------|-----|
| ID | T1 |
| 專案 | CodeAtlas |
| Sprint | Sprint 24 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | in_review |
| 依賴 | — |
| 預估 | 1h |
| 建立時間 | 2026-04-14T05:24:59.365Z |
| 開始時間 | 2026-04-14T05:30:51.551Z |
| 完工時間 | 2026-04-14T05:35:29.115Z |

---

## 任務描述

建立 `packages/core/src/analyzers/adapters/types.ts`，定義 FrameworkAdapter Plugin 機制的核心型別：

1. **FrameworkAdapter interface**：name, displayName, language, detect(), extractEndpoints(), buildChains(), extractMiddleware?()
2. **AdapterContext**：analysis, nodeMap, callAdjacency, functionsByLabel, functionNodes
3. **FrameworkDetection**：adapter name, confidence score, detection evidence
4. **MiddlewareDescriptor**：middleware 名稱、位置、套用範圍
5. **SupportedLanguage** type（如尚未存在）

參考技術方案第 2.2、2.3 節。所有型別需從此檔案 export。

## 驗收標準

- [x] TypeScript 編譯通過（`pnpm --filter @codeatlas/core build`）
- [x] FrameworkAdapter interface 包含 detect/extractEndpoints/buildChains/extractMiddleware 四個方法
- [x] AdapterContext 包含 analysis/nodeMap/callAdjacency/functionsByLabel/functionNodes
- [x] FrameworkDetection 包含 adapter name + confidence
- [x] 所有型別從 types.ts export

---

## 事件紀錄

### 2026-04-14T05:24:59.365Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-14T05:30:51.551Z — 狀態變更 → in_progress
開始執行任務

### 2026-04-14T05:35:29.115Z — 狀態變更 → in_review
型別定義完成。FrameworkAdapter/AdapterContext/FrameworkDetection/MiddlewareDescriptor/AdapterRegistryEntry 全部定義並 export，含完整 JSDoc。
