# 資料流熱力圖（2D + 3D）

| 欄位 | 值 |
|------|-----|
| ID | T7 |
| 專案 | CodeAtlas |
| Sprint | Sprint 5 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T2 |
| 預估 | 3h |
| 建立時間 | 2026-03-31T12:00:00.000Z |
| 開始時間 | 2026-03-31T01:44:47.382Z |
| 完工時間 | 2026-03-31T01:53:27.728Z |

---

## 任務描述

1. 實作 `useHeatmap` hook：
   - symbolCount → 邊粗細映射（1-2→1px, 3-5→2px, 6-10→3px, 11+→4px）
   - symbolCount → 邊亮度映射（線性插值 opacity 0.3~1.0）
   - 開關狀態讀取 ViewStateContext.isHeatmapEnabled
2. 2D 適配：NeonEdge strokeWidth + opacity
3. 3D 適配：Graph3DCanvas line width + material opacity
4. 粒子速度依 symbol 數量調整（多=快）
5. 追蹤模式優先：追蹤中不套用熱力圖

## 驗收標準

- [x] 邊粗細反映 symbol 數量
- [x] 邊亮度反映 symbol 數量
- [x] 2D + 3D 皆生效
- [x] 預設關閉
- [x] 追蹤模式覆蓋熱力圖

---

## 事件紀錄

### 2026-03-31T12:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T01:44:47.382Z — 狀態變更 → in_progress
T2 完成，委派 frontend-developer 與 T5 並行執行

### 2026-03-31T01:53:27.728Z — 狀態變更 → in_review
提交審查。useHeatmap hook + NeonEdge 2D 熱力圖 style + Graph3DCanvas 3D heatmap useEffect + GraphContainer 傳遞 props。129 tests 零回歸。

### 2026-03-31T01:53:27.728Z — 狀態變更 → done
L1 審核通過。0 Blocker / 0 Major / 0 Minor。映射表符合設計、追蹤覆蓋熱力圖正確。
