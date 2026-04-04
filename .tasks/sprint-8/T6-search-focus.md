# 搜尋聚焦模式：SearchBar 強化 + ENTER/EXIT_SEARCH_FOCUS + dim/highlight

| 欄位 | 值 |
|------|-----|
| ID | T6 |
| 專案 | CodeAtlas |
| Sprint | Sprint 8 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-03-31T16:40:00.000Z |
| 結束時間 | 2026-03-31T16:55:00.000Z |
| 依賴 | T2 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T16:00:00.000Z |

---

## 任務描述

1. 強化既有 `packages/web/src/components/SearchBar.tsx`：
   - 搜尋有結果時 → 計算 matching nodes + 直接連接的 edges
   - dispatch `ENTER_SEARCH_FOCUS { nodeIds, edgeIds }`
   - Escape 鍵 / 清空搜尋框 → dispatch `EXIT_SEARCH_FOCUS`
2. 渲染整合（準備 state，實際渲染在 T11/T12 整合）：
   - `isSearchFocused === true` 時：不在 `searchFocusNodes` 的節點 opacity 0.1
   - 在 `searchFocusNodes` 的節點 opacity 1.0
   - 在 `searchFocusEdges` 的邊 opacity 1.0，其他 opacity 0.1
3. 「直接連接的 edges」定義：
   - edge.source 或 edge.target 在 matching nodes 中

## 驗收標準

- [x] SearchBar 搜尋有結果時 dispatch ENTER_SEARCH_FOCUS
- [x] 正確計算 matching nodeIds 和 edgeIds
- [x] Escape 鍵退出聚焦模式
- [x] 清空搜尋框退出聚焦模式
- [x] 直接連接 edges 計算正確
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T16:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T16:40:00.000Z — in_progress
由 frontend-developer 開始執行

### 2026-03-31T16:55:00.000Z — done
useSearch 擴充：+allEdges optional param、+useViewState dispatch、+search focus useEffect（ENTER/EXIT_SEARCH_FOCUS）、close() 加 EXIT dispatch。tsc clean。
