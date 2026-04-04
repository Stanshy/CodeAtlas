# 邊上 symbol 標籤（2D）

| 欄位 | 值 |
|------|-----|
| ID | T3 |
| 專案 | CodeAtlas |
| Sprint | Sprint 5 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T2 |
| 預估 | 3h |
| 建立時間 | 2026-03-31T12:00:00.000Z |
| 開始時間 | 2026-03-31T01:36:47.624Z |
| 完工時間 | 2026-03-31T01:44:47.382Z |

---

## 任務描述

1. 實作 `useEdgeSymbols` hook：格式化 symbol 名稱，超過 3 個顯示 +N more
2. 實作 `EdgeSymbolLabel.tsx`：React Flow custom edge label component
3. 整合到 `NeonEdge.tsx` / `GraphCanvas.tsx`：hover 邊線時顯示標籤
4. 無 importedSymbols（空陣列）→ 不顯示標籤

## 驗收標準

- [x] 2D hover 邊線顯示 symbol 名稱
- [x] 超過 3 個 symbol 顯示前 3 個 + "+N more"
- [x] 無 symbol 不顯示標籤
- [x] 標籤背景半透明深色，文字白色
- [x] 色碼引用 theme.ts

---

## 事件紀錄

### 2026-03-31T12:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T01:36:47.624Z — 狀態變更 → in_progress
T2 完成，委派 frontend-developer 與 T4 並行執行

### 2026-03-31T01:44:47.382Z — 狀態變更 → in_review
提交審查。useEdgeSymbols hook + EdgeSymbolLabel 元件 + NeonEdge 整合（hover 條件渲染）+ GraphCanvas onEdgeMouseEnter/Leave。

### 2026-03-31T01:44:47.382Z — 狀態變更 → done
L1 審核通過。0 Blocker / 0 Major / 1 Minor（START_TRACING placeholder，T5 修正）。
