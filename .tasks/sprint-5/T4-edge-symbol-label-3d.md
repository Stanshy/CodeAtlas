# 邊上 symbol 標籤（3D）

| 欄位 | 值 |
|------|-----|
| ID | T4 |
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

1. 整合 Three.js sprite text 到 `Graph3DCanvas.tsx`
2. hover 邊線時渲染 symbol 標籤（SpriteText）
3. 超過 50 條邊只渲染 hover 的那條邊的標籤，不預渲染全部
4. 複用 `useEdgeSymbols` hook（T3 產出）

## 驗收標準

- [x] 3D hover 邊線顯示 sprite text 標籤
- [x] 超過 3 個 symbol 顯示 +N more
- [x] 效能策略：>50 邊不預渲染
- [x] 色碼引用 theme.ts

---

## 事件紀錄

### 2026-03-31T12:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T01:36:47.624Z — 狀態變更 → in_progress
T2 完成，委派 frontend-developer 與 T3 並行執行

### 2026-03-31T01:44:47.382Z — 狀態變更 → in_review
提交審查。Graph3DCanvas: createTextSprite Canvas API、onLinkHover sprite 管理、FG3DLink 擴充 importedSymbols。GraphContainer 傳遞 hoveredEdgeId/onEdgeHover。

### 2026-03-31T01:44:47.382Z — 狀態變更 → done
L1 審核通過。0 Blocker / 0 Major / 0 Minor。
