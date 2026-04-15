# 3D 互動 + Hover 高亮

| 欄位 | 值 |
|------|-----|
| ID | T6 |
| 專案 | CodeAtlas |
| Sprint | Sprint 4 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T3 |
| 預估 | 4h |
| 建立時間 | 2026-03-31T10:00:00.000Z |
| 開始時間 | 2026-03-31T13:00:00.000Z |
| 完工時間 | 2026-03-30T23:03:18.108Z |

---

## 任務描述

實作 3D 互動操作和 Hover 高亮功能：

1. **旋轉/縮放/平移**：3d-force-graph 內建 OrbitControls（確認啟用）
2. **點擊節點飛入**：onNodeClick callback → 相機飛到節點前方（cameraPosition + lookAt，500ms tween）
3. **Hover 高亮**：onNodeHover callback
   - Hover 節點球體放大 1.5x + 亮度提高
   - 相關入邊/出邊亮起（opacity 1.0）
   - 上下游節點高亮
   - 無關節點/邊暗淡（opacity 0.1）
4. **hover → ViewStateContext**：更新 hoveredNodeId
5. **click → ViewStateContext**：更新 selectedNodeId + isPanelOpen
6. **three-helpers.ts**：camera tween 工具函式

使用 3d-force-graph 內建 API（onNodeClick、onNodeHover），不自己寫 raycaster。

## 驗收標準

- [x] 旋轉、縮放、平移操作平滑
- [x] 點擊節點時相機飛入聚焦（≈500ms 動畫）
- [x] Hover 節點時相關依賴路徑全部亮起
- [x] 無關節點/邊暗淡（opacity ≤ 0.1）
- [x] hover/click 正確更新 ViewStateContext

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T13:00:00.000Z — 狀態變更 → in_progress
與 T3 一同由 frontend-developer 執行

### 2026-03-30T22:42:08.187Z — 狀態變更 → in_review
與 T3 一同提交審查。交付物：Graph3DCanvas.tsx 內 onNodeClick/onNodeHover callback、adjacency useMemo 預計算、buildHighlightedNodeObject 四狀態（Normal/Hover/Active/Faded）、linkColor hover/faded rgba 編碼、cameraPosition 飛入 500ms。

### 2026-03-30T23:03:18.108Z — 狀態變更 → done
L1 審核通過（/task-approve）。全部驗收標準達成。hover/click 正確 dispatch ViewStateContext。
