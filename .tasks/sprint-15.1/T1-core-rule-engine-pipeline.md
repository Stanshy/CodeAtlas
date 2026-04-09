# Core 規則引擎管線

| 欄位 | 值 |
|------|-----|
| ID | T1 |
| 專案 | CodeAtlas |
| Sprint | Sprint 15.1 |
| 指派給 | ai-engineer |
| 優先級 | P0 |
| 狀態 | done |
| 完工時間 | 2026-04-05T07:17:37.624Z |
| 開始時間 | 2026-04-05T07:16:53.000Z |
| 依賴 | 無 |
| 預估 | 1h |
| 建立時間 | 2026-04-05T07:15:28.003Z |

---

## 任務描述

在 `packages/core/src/analyzer/graph-builder.ts` 的 `buildFunctionGraph()` return 前，遍歷 functionNodes 呼叫 `classifyMethodRole()` 寫入 `methodRole` + `roleConfidence`。

**修改檔案**: `packages/core/src/analyzer/graph-builder.ts`

## 驗收標準

- [x] buildFunctionGraph() 回傳的每個 function node 都有 `metadata.methodRole`
- [x] buildFunctionGraph() 回傳的每個 function node 都有 `metadata.roleConfidence`
- [x] class node 不分類（只分類 type='function'）
- [x] pnpm build 通過

---

## 事件紀錄

### 2026-04-05T07:15:28.003Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-05T07:16:53.000Z — 狀態變更 → in_progress
開始執行：在 graph-builder.ts 加入 classifyMethodRole() 整合

### 2026-04-05T07:17:37.624Z — 狀態變更 → done
完成：buildFunctionGraph() 所有 function node 均寫入 methodRole + roleConfidence，pnpm build 通過
