# web 型別 + ViewState 擴充 + graph-adapter 函式節點支援

| 欄位 | 值 |
|------|-----|
| ID | T7 |
| 專案 | CodeAtlas |
| Sprint | Sprint 7 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T6 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T12:00:00.000Z |
| 開始時間 | 2026-03-31T13:30:00.000Z |
| 結束時間 | 2026-03-31T13:45:00.000Z |

---

## 任務描述

1. 修改 `packages/web/src/types/graph.ts`：同步 core 型別擴充（NodeMetadata, EdgeMetadata, FunctionParam）
2. 修改 `packages/web/src/contexts/ViewStateContext.tsx`：新增 expandedFileId、expandedNodes、expandedEdges、ZOOM_INTO_FILE / ZOOM_OUT_FILE / START_CALL_TRACING / STOP_CALL_TRACING action
3. 修改 `packages/web/src/adapters/graph-adapter.ts`：function/class node → React Flow node 轉換
4. 新增 `packages/web/src/api/graph.ts` 的 fetchFunctionNodes(fileId) 函式

## 驗收標準

- [x] web 型別與 core 同步
- [x] ViewState 新增 expandedFileId 欄位
- [x] 4 個新 Action 正確處理
- [x] graph-adapter 支援 function/class node
- [x] fetchFunctionNodes API 呼叫正確
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T12:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T13:30:00.000Z — in_progress
由 frontend-developer 開始執行

### 2026-03-31T13:45:00.000Z — done
Web types synced with core (FunctionParam, NodeMetadata, EdgeMetadata), ViewState extended (expandedFileId, expandedNodes, expandedEdges, 4 new actions), graph-adapter supports function/class nodes, fetchFunctionNodes API added. tsc clean
