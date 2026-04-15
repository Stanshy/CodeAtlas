# 節點 I/O 標記（2D + 3D）

| 欄位 | 值 |
|------|-----|
| ID | T6 |
| 專案 | CodeAtlas |
| Sprint | Sprint 5 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T1 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T12:00:00.000Z |
| 開始時間 | 2026-03-31T01:31:11.510Z |
| 完工時間 | 2026-03-31T01:36:47.624Z |

---

## 任務描述

1. 實作 `NodeIOBadge.tsx`：2D badge 顯示 ↓importCount / ↑exportCount
2. 整合到 `NeonNode.tsx` / `DirectoryNode.tsx`
3. 3D 模式：Graph3DCanvas 中用 sprite 或 HTML overlay 顯示
4. importCount=0 且 exportCount=0 → 不顯示
5. 數字 >99 顯示 99+

資料來源：`NodeMetadata.importCount` / `NodeMetadata.exportCount`

## 驗收標準

- [x] 2D 節點顯示 ↓importCount ↑exportCount
- [x] 3D 節點顯示 I/O 標記
- [x] 0 時不顯示
- [x] >99 顯示 99+
- [x] 色碼引用 theme.ts

---

## 事件紀錄

### 2026-03-31T12:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T01:31:11.510Z — 狀態變更 → in_progress
T1 完成，委派 frontend-developer 與 T2 並行執行

### 2026-03-31T01:36:47.624Z — 狀態變更 → in_review
提交審查。NodeIOBadge.tsx + NeonNode/DirectoryNode 整合 + theme.ts ioBadge/heatmap/tracing/edgeLabel 常數。tsc 通過，129 tests 零回歸。

### 2026-03-31T01:36:47.624Z — 狀態變更 → done
L1 審核通過。對程式碼+對規範 Review：0 Blocker / 0 Major / 0 Minor。
