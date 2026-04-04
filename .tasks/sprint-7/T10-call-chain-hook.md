# useCallChain hook + 呼叫鏈追蹤（復用 Sprint 5 BFS）

| 欄位 | 值 |
|------|-----|
| ID | T10 |
| 專案 | CodeAtlas |
| Sprint | Sprint 7 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T7 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T12:00:00.000Z |
| 開始時間 | 2026-03-31T14:00:00.000Z |
| 結束時間 | 2026-03-31T14:10:00.000Z |

---

## 任務描述

1. 新增 `packages/web/src/hooks/useCallChain.ts`：
   - BFS 演算法追蹤呼叫鏈（復用 Sprint 5 traceSymbolPath 模式）
   - 支援雙向：向上追溯 callers、向下追蹤 callees
   - 深度上限 5 層
   - visited set 防循環
   - low confidence 邊可選過濾
   - 結果 dispatch START_CALL_TRACING（復用 tracingPath/tracingEdges 高亮）

2. 呼叫鏈啟動：點選函式節點 → 自動追蹤
3. 呼叫鏈停止：點選非函式節點或 Escape

## 驗收標準

- [x] BFS 追蹤呼叫鏈正確
- [x] 深度上限 5 層
- [x] 循環防護（visited set）
- [x] low confidence 邊過濾選項
- [x] 復用 tracingPath/tracingEdges 高亮機制
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T12:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T14:00:00.000Z — in_progress
由 frontend-developer 開始執行

### 2026-03-31T14:10:00.000Z — done
traceCallChain() pure function + useCallChain() React hook. BFS with direction (callers/callees/both), maxDepth=5, visited set for cycles, low-confidence filter option. Reuses tracingPath/tracingEdges highlight. tsc clean
