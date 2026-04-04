# 路徑追蹤面板 + 熱力圖 Toggle + 粒子 symbol 類型

| 欄位 | 值 |
|------|-----|
| ID | T8 |
| 專案 | CodeAtlas |
| Sprint | Sprint 5 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T5,T7 |
| 預估 | 4h |
| 建立時間 | 2026-03-31T12:00:00.000Z |
| 開始時間 | 2026-03-31T01:53:27.728Z |
| 完工時間 | 2026-03-31T01:59:38.517Z |

---

## 任務描述

1. **TracingPanel.tsx**：
   - 追蹤模式時替換 NodePanel 內容
   - 顯示每一跳：symbol 名稱 + 檔案路徑 + import 類型
   - 可點擊任一跳 → FOCUS_NODE
   - 頂部顯示追蹤 symbol + 總跳數
   - Escape / 結束追蹤按鈕 → STOP_TRACING

2. **HeatmapToggle.tsx**：
   - Toolbar 按鈕（火焰 icon）
   - dispatch TOGGLE_HEATMAP
   - 與 ViewToggle 同列

3. **粒子 symbol 類型**（P1）：
   - function → 綠色大粒子（PascalCase 排除後的 camelCase）
   - class → 青色中粒子（PascalCase）
   - variable/其他 → 白色小粒子
   - 僅 3D 模式

4. 整合到 App.tsx

## 驗收標準

- [x] 追蹤面板顯示完整路徑列表
- [x] 可點擊跳轉到任一節點
- [x] 熱力圖 Toggle 可即時開關
- [x] 粒子依 symbol 類型著色/大小
- [x] Toolbar 排版合理

---

## 事件紀錄

### 2026-03-31T12:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T01:53:27.728Z — 狀態變更 → in_progress
T5+T7 完成，委派 frontend-developer 執行

### 2026-03-31T01:59:38.517Z — 狀態變更 → in_review
提交審查。TracingPanel.tsx + HeatmapToggle.tsx + Graph3DCanvas 粒子 symbol 類型 + App.tsx 整合。129 tests 零回歸。

### 2026-03-31T01:59:38.517Z — 狀態變更 → done
L1 審核通過。0 Blocker / 0 Major / 0 Minor。
