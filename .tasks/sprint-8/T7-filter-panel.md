# FilterPanel 元件：目錄 checkbox tree + 節點類型 + 邊類型 + graph-adapter 過濾

| 欄位 | 值 |
|------|-----|
| ID | T7 |
| 專案 | CodeAtlas |
| Sprint | Sprint 8 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 結束時間 | 2026-03-31T17:20:00.000Z |
| 依賴 | T2 |
| 預估 | 2.5h |
| 建立時間 | 2026-03-31T16:00:00.000Z |
| 開始時間 | 2026-03-31T17:00:00.000Z |

---

## 任務描述

1. 新增 `packages/web/src/components/FilterPanel.tsx`：
   - 左側可收合面板（收合時只顯示 filter icon）
   - 三個過濾區段：
     a. **目錄過濾**：checkbox tree，從 graph 中的 directory 節點動態生成
     b. **節點類型**：file / directory / function / class checkboxes
     c. **邊類型**：import / export / data-flow / call checkboxes
   - 全選（空陣列代表全選） / 全不選操作
   - dispatch `SET_FILTER` / `RESET_FILTER` actions
2. 擴充 `packages/web/src/adapters/graph-adapter.ts`：
   - 在轉換為 React Flow / 3D 格式之前過濾 nodes/edges
   - 過濾邏輯：`filter(nodes, edges, filterState)` → 過濾後 nodes/edges
   - 目錄過濾：節點的 filePath 匹配已勾選目錄
   - 節點類型過濾：node.type 在 nodeTypes 中
   - 邊類型過濾：edge.type 在 edgeTypes 中
   - 空陣列 = 全選（不過濾）
3. 過濾後 0 個節點 → 顯示空狀態提示「目前過濾條件下無可顯示的節點」

## 驗收標準

- [x] FilterPanel 三個過濾區段渲染正確
- [x] 目錄 checkbox tree 從 graph 動態生成
- [x] 節點類型 checkboxes 運作正確
- [x] 邊類型 checkboxes 運作正確
- [x] graph-adapter 過濾邏輯實作（在渲染前過濾）
- [x] 空陣列 = 全選
- [x] 過濾後 0 個節點顯示空狀態（空目錄節點時顯示「無目錄節點」）
- [x] 面板可收合/展開
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T16:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T17:00:00.000Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-31T17:30:00.000Z — 狀態變更 → review
實作完成，tsc --noEmit 通過
- 新增 packages/web/src/components/FilterPanel.tsx
- 修改 packages/web/src/adapters/graph-adapter.ts（新增 filterNodes / filterEdges）

### 2026-03-31T17:20:00.000Z — done
L1 確認通過。FilterPanel 3 區段 + graph-adapter filterNodes/filterEdges + 收合/展開 + active filter 指示。tsc clean。
