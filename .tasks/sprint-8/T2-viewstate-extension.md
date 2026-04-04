# ViewState 擴充 + 8 個新 action types + web 型別新增

| 欄位 | 值 |
|------|-----|
| ID | T2 |
| 專案 | CodeAtlas |
| Sprint | Sprint 8 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-03-31T16:20:00.000Z |
| 結束時間 | 2026-03-31T16:35:00.000Z |
| 依賴 | T1 |
| 預估 | 1.5h |
| 建立時間 | 2026-03-31T16:00:00.000Z |

---

## 任務描述

1. 擴充 `packages/web/src/contexts/ViewStateContext.tsx`：
   - 新增 `impactAnalysis` 狀態（active, direction, targetNodeId, impactedNodes, impactedEdges, depthMap, maxDepth）
   - 新增 `filter` 狀態（directories, nodeTypes, edgeTypes）— 空陣列 = 全選
   - 新增 `isSearchFocused`, `searchFocusNodes`, `searchFocusEdges` 狀態
   - 新增 `contextMenu` 狀態（visible, x, y, nodeId）
2. 新增 9 個 Action types：
   - `IMPACT_ANALYZE` / `UPDATE_IMPACT_DEPTH` / `CLEAR_IMPACT`
   - `SET_FILTER` / `RESET_FILTER`
   - `ENTER_SEARCH_FOCUS` / `EXIT_SEARCH_FOCUS`
   - `SHOW_CONTEXT_MENU` / `HIDE_CONTEXT_MENU`
3. 擴充 `packages/web/src/types/graph.ts`：
   - 新增 `ImpactAnalysisResult` 型別
   - 新增 `FilterState` 型別
   - 新增 `StructureInfo` 型別

## 驗收標準

- [x] ViewState 新增 4 個狀態區塊
- [x] 9 個 Action 的 reducer case 完整
- [x] initialState 預設值正確（impactAnalysis: null, filter: { directories: [], nodeTypes: [], edgeTypes: [] }, isSearchFocused: false, contextMenu: null）
- [x] types/graph.ts 新增 5 個型別（ImpactAnalysisResult, FilterState, StructureInfo, AiOverviewResponse, AiSearchKeywordsResponse）
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T16:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T16:20:00.000Z — in_progress
由 frontend-developer 開始執行

### 2026-03-31T16:35:00.000Z — done
ViewState +4 狀態區塊 +9 action types +9 reducer cases。types/graph.ts +5 型別。tsc clean。
