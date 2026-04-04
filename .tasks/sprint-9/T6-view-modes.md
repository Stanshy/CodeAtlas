# 視圖模式預設定義 + applyViewMode + 切換邏輯

| 欄位 | 值 |
|------|-----|
| ID | T6 |
| 專案 | CodeAtlas |
| Sprint | Sprint 9 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T3,T4 |
| 預估 | 2.5h |
| 建立時間 | 2026-03-31T22:00:00.000Z |

---

## 任務描述

1. 新建 `packages/web/src/adapters/view-modes.ts`：
   - `ViewModePreset` 型別定義
   - `VIEW_MODE_PRESETS` 四種預設常數（panorama / dependency / dataflow / callchain）
   - 每種預設含 filter（nodeTypes/edgeTypes）+ display（showHeatmap/showEdgeLabels/showParticles/labelDensity/expandFiles）
2. 在 `graph-adapter.ts` 新增 `applyViewMode(nodes, edges, mode)` 函式：
   - 根據 VIEW_MODE_PRESETS[mode].filter 過濾 nodes/edges
   - 復用既有 filterNodes / filterEdges 函式
   - 回傳 filtered nodes + edges
3. ControlPanel 視圖模式區段：radio group 四個選項，dispatch SET_VIEW_MODE

### 視圖預設定義

| 視圖 | nodeTypes | edgeTypes | heatmap | edgeLabels | particles | labelDensity | expandFiles |
|------|-----------|-----------|---------|------------|-----------|-------------|-------------|
| panorama | [] (全選) | [] (全選) | false | false | true | smart | false |
| dependency | [] (全選) | import, export | false | false | true | smart | false |
| dataflow | [] (全選) | data-flow, export | true | true | true | all | false |
| callchain | function, class, file | call | false | true | false | all | true |

## 驗收標準

- [x] view-modes.ts 完成（ViewModePreset + VIEW_MODE_PRESETS）
- [x] applyViewMode() 函式完成（graph-adapter.ts）
- [x] 四種視圖預設過濾邏輯正確
- [x] ControlPanel 視圖區段 radio group 連接
- [x] SET_VIEW_MODE dispatch 清除衝突狀態
- [x] tsc 編譯通過

---

## 事件紀錄

### 2026-03-31T22:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
