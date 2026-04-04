# 路徑追蹤模式（2D + 3D）

| 欄位 | 值 |
|------|-----|
| ID | T5 |
| 專案 | CodeAtlas |
| Sprint | Sprint 5 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T2,T3 |
| 預估 | 4h |
| 建立時間 | 2026-03-31T12:00:00.000Z |
| 開始時間 | 2026-03-31T01:44:47.382Z |
| 完工時間 | 2026-03-31T01:53:27.728Z |

---

## 任務描述

1. 實作 `usePathTracing` hook：
   - 呼叫 path-tracer.ts 計算路徑
   - 觸發 START_TRACING action
   - Escape / 點擊空白 → STOP_TRACING
2. 2D 高亮：追蹤路徑邊+節點亮起，無關節點 opacity 0.1
3. 3D 高亮：同上邏輯，Three.js material 適配
4. 切換 2D/3D 時追蹤狀態保留（ViewStateContext 不重置）

## 驗收標準

- [x] 點擊 symbol 追蹤整條路徑
- [x] 路徑高亮 + 無關節點暗淡
- [x] 10 層深度限制生效
- [x] Escape 退出追蹤模式
- [x] 2D 和 3D 模式皆可用
- [x] 切換模式保留追蹤狀態

---

## 事件紀錄

### 2026-03-31T12:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T01:44:47.382Z — 狀態變更 → in_progress
T2+T3 完成，委派 frontend-developer 與 T7 並行執行

### 2026-03-31T01:53:27.728Z — 狀態變更 → in_review
提交審查。usePathTracing hook + NeonEdge onStartTracing + GraphCanvas 2D 追蹤高亮 + Graph3DCanvas 3D 追蹤 useEffect + Escape 鍵退出。129 tests 零回歸。

### 2026-03-31T01:53:27.728Z — 狀態變更 → done
L1 審核通過。0 Blocker / 0 Major / 0 Minor。追蹤優先於 hover/熱力圖正確實作。
