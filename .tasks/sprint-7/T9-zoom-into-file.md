# ZoomIntoFile：雙擊展開/收合 + useZoomIntoFile hook + 2D subflow

| 欄位 | 值 |
|------|-----|
| ID | T9 |
| 專案 | CodeAtlas |
| Sprint | Sprint 7 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T7,T8 |
| 預估 | 3h |
| 建立時間 | 2026-03-31T12:00:00.000Z |
| 開始時間 | 2026-03-31T14:10:00.000Z |
| 結束時間 | 2026-03-31T14:25:00.000Z |

---

## 任務描述

1. 新增 `packages/web/src/hooks/useZoomIntoFile.ts`：
   - 雙擊檔案節點 → fetchFunctionNodes(fileId) → dispatch ZOOM_INTO_FILE
   - Escape 或再次雙擊 → dispatch ZOOM_OUT_FILE
   - 快取已載入的函式節點（避免重複 fetch）
   - 無函式時顯示提示

2. 修改 GraphCanvas.tsx：
   - 2D：展開時將函式節點作為 subflow 子節點，fitView 動畫
   - onNodeDoubleClick handler 呼叫 useZoomIntoFile
   - Escape keydown handler

3. 只展開一個檔案（展開新檔案自動收合舊的）

## 驗收標準

- [x] 雙擊檔案 → 展開函式子節點
- [x] Escape → 收合
- [x] 再次雙擊 → 收合
- [x] 只展開一個檔案
- [x] 無函式時顯示提示
- [x] 2D subflow + fitView 動畫
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T12:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T14:10:00.000Z — in_progress
由 frontend-developer 開始執行

### 2026-03-31T14:25:00.000Z — done
useZoomIntoFile hook with module-level cache, double-click expands/collapses, Escape handler, single-file-only expansion, empty-functions toast. GraphCanvas wired with onNodeDoubleClick + Escape keydown. tsc clean
