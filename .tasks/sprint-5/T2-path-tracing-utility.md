# 路徑追蹤 utility + ViewStateContext 擴充

| 欄位 | 值 |
|------|-----|
| ID | T2 |
| 專案 | CodeAtlas |
| Sprint | Sprint 5 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T1 |
| 預估 | 3h |
| 建立時間 | 2026-03-31T12:00:00.000Z |
| 開始時間 | 2026-03-31T01:31:11.510Z |
| 完工時間 | 2026-03-31T01:36:47.624Z |

---

## 任務描述

1. 實作 `packages/web/src/utils/path-tracer.ts` 純函式：
   - BFS 遍歷 graph，找出所有包含指定 symbol 的邊與節點
   - visited set 防循環依賴
   - depth ≤ 10 截斷
   - 輸入：symbol 名稱 + nodes[] + edges[]
   - 輸出：{ path: string[], edges: string[] }

2. 擴充 `ViewStateContext.tsx`：
   - 新增狀態欄位：tracingSymbol, tracingPath, tracingEdges, isHeatmapEnabled
   - 新增 action：START_TRACING, STOP_TRACING, TOGGLE_HEATMAP

## 驗收標準

- [x] path-tracer.ts 純函式可處理線性路徑
- [x] path-tracer.ts 可處理循環依賴（不無限展開）
- [x] path-tracer.ts 深度上限 10 層截斷
- [x] ViewStateContext 新增 4 個狀態欄位
- [x] ViewStateContext 新增 3 個 action
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T12:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T01:31:11.510Z — 狀態變更 → in_progress
T1 完成，委派 frontend-developer 執行

### 2026-03-31T01:36:47.624Z — 狀態變更 → in_review
提交審查。path-tracer.ts（BFS + visited + depth ≤ 10），ViewStateContext 擴充（+5 欄位 +4 action）。tsc --noEmit 通過，129 tests 零回歸。

### 2026-03-31T01:36:47.624Z — 狀態變更 → done
L1 審核通過。對程式碼+對規範 Review：0 Blocker / 0 Major / 0 Minor。
