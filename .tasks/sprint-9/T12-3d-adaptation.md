# 3D 適配：Graph3DCanvas 視圖模式 + e2eTracing + displayPrefs

| 欄位 | 值 |
|------|-----|
| ID | T12 |
| 專案 | CodeAtlas |
| Sprint | Sprint 9 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T11 |
| 預估 | 2.5h |
| 建立時間 | 2026-03-31T22:00:00.000Z |

---

## 任務描述

修改 `Graph3DCanvas.tsx`：

1. **視圖模式過濾整合**：
   - 讀取 ViewState activeViewMode
   - graph data 傳入前用 applyViewMode 過濾
   - 與手動 filter 疊加

2. **端到端追蹤高亮**：
   - 讀取 ViewState e2eTracing
   - e2eTracing.active 時：
     - path 上節點：material emissive intensity 提高 + 球體放大
     - path 上邊：color alpha 1.0 + 加粗
     - 其他節點/邊：opacity 降低（dim）
   - 新增 useEffect（e2eTracing 依賴），與既有 impact/tracing/searchFocus highlight 同架構

3. **顯示偏好響應**：
   - showEdgeLabels → 控制 3D edge label sprite 建立/銷毀
   - showParticles → 控制 linkDirectionalParticles(showParticles ? count : 0)
   - labelDensity → 控制 node label sprite visibility

4. **呼叫鏈視圖 expandFiles**：同 T11 邏輯

## 驗收標準

- [x] 視圖模式過濾在 3D 正確生效
- [x] 端到端追蹤高亮在 3D 正確渲染
- [x] 顯示偏好 toggle 在 3D 正確響應
- [x] 呼叫鏈視圖 expandFiles 正確
- [x] tsc 編譯通過

---

## 事件紀錄

### 2026-03-31T22:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T23:50:00.000Z — 完成
由 frontend-developer 完成。Graph3DCanvas.tsx：viewFilteredData useMemo（applyViewMode）+ e2eTracing highlight 4 新 useEffect（nodeThreeObject + linkColor/linkWidth + restore）+ showParticles toggle（linkDirectionalParticles）+ labelDensity（nodeLabel callback）。GraphContainer.tsx 同步修補 Sprint 8 缺漏 props。tsc clean。
