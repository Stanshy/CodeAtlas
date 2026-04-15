# AdapterRegistry

| 欄位 | 值 |
|------|-----|
| ID | T3 |
| 專案 | CodeAtlas |
| Sprint | Sprint 24 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T1 |
| 預估 | 1.5h |
| 建立時間 | 2026-04-14T05:24:59.365Z |
| 開始時間 | 2026-04-14T05:37:17.046Z |

---

## 任務描述

建立 `packages/core/src/analyzers/adapters/registry.ts`，實作 AdapterRegistry：

1. **register(adapter: FrameworkAdapter)**：註冊 adapter
2. **detectFrameworks(analysis: AnalysisResult)**：遍歷所有已註冊 adapter，呼叫 detect()，返回 FrameworkDetection[]
3. **getMatchedAdapters(analysis: AnalysisResult)**：返回 detect 命中的 adapter，按 confidence 降序排列
4. **createDefaultRegistry()**：工廠函式，註冊 9 個框架 adapter + AI fallback（最後）

依賴 T1 的 FrameworkAdapter interface 和 FrameworkDetection 型別。

參考技術方案第 2.4 節。

## 驗收標準

- [x] register/detectFrameworks/getMatchedAdapters 方法正確實作
- [x] createDefaultRegistry() 可建立含所有預設 adapter 的 registry
- [x] 按 confidence 排序（高 → 低）
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-04-14T05:24:59.365Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-14T05:37:17.046Z — 狀態變更 → in_progress
開始執行任務（T1 依賴已解鎖）

### 2026-04-14T05:37:17.046Z — 狀態變更 → done
L1 審核通過。AdapterRegistry + createDefaultRegistry 完成，含 size getter、getAdapterByName、detect error handling。
