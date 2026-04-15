# 2D 適配：GraphCanvas 視圖模式 + e2eTracing + displayPrefs

| 欄位 | 值 |
|------|-----|
| ID | T11 |
| 專案 | CodeAtlas |
| Sprint | Sprint 9 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T6,T7,T10 |
| 預估 | 2.5h |
| 建立時間 | 2026-03-31T22:00:00.000Z |

---

## 任務描述

修改 `GraphCanvas.tsx`：

1. **視圖模式過濾整合**：
   - 讀取 ViewState activeViewMode
   - 在 styledNodes/styledEdges 計算前，先用 applyViewMode 過濾
   - 視圖過濾 → 手動 filter 疊加（雙層過濾）

2. **端到端追蹤高亮**：
   - 讀取 ViewState e2eTracing
   - e2eTracing.active 時：path 上節點 glow + opacity 1.0，其他 dim opacity 0.1
   - e2eTracing.edges 上的邊高亮（粗線 + glow color）
   - 優先順序：filter → viewMode → searchFocus → e2eTracing → impact → tracing → hover

3. **顯示偏好響應**：
   - showEdgeLabels → 控制 NeonEdge label 渲染（已在 T10 NeonEdge 處理）
   - showParticles → 控制 CSS 粒子動畫 class toggle
   - labelDensity → 控制 NeonNode label opacity / visibility

4. **呼叫鏈視圖 expandFiles**：
   - 當 activeViewMode === 'callchain' 時，自動 dispatch ZOOM_INTO_FILE（只展開含 function/class 的檔案）

## 驗收標準

- [x] 視圖模式過濾在 2D 正確生效
- [x] 端到端追蹤高亮在 2D 正確渲染（glow + dim）
- [x] 顯示偏好 toggle 在 2D 正確響應
- [x] 呼叫鏈視圖 expandFiles 正確
- [x] 優先順序堆疊正確
- [x] tsc 編譯通過

---

## 事件紀錄

### 2026-03-31T22:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
