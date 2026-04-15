# 顯示偏好 toggle + NeonEdge label 控制 + 標籤密度

| 欄位 | 值 |
|------|-----|
| ID | T10 |
| 專案 | CodeAtlas |
| Sprint | Sprint 9 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T5,T3 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T22:00:00.000Z |

---

## 任務描述

1. 新建 `DisplayPrefsSection.tsx`：控制面板「顯示偏好」區段內容
   - Heatmap toggle（復用既有 isHeatmapEnabled，dispatch TOGGLE_HEATMAP）
   - 邊 symbol 標籤 toggle（dispatch SET_DISPLAY_PREFS { showEdgeLabels }）
   - 粒子流動動畫 toggle（dispatch SET_DISPLAY_PREFS { showParticles }）
   - 節點標籤密度 3 段切換器（all / smart / none）
   - 影響分析預設 depth slider（1-10，dispatch SET_DISPLAY_PREFS { impactDefaultDepth }）

2. 修改 `NeonEdge.tsx`：
   - 讀取 displayPrefs.showEdgeLabels
   - showEdgeLabels=false 時不渲染 edge label（即使 hover）

3. 標籤密度 smart 模式邏輯（graph-adapter 或 hook 層）：
   - zoom > 0.8 → 顯示所有 label
   - zoom 0.4-0.8 → 只顯示 dependencyCount > median 的節點
   - zoom < 0.4 → 只顯示 directory label
   - useMemo 快取 median 值

## 驗收標準

- [x] DisplayPrefsSection.tsx 完成
- [x] Heatmap toggle 連接既有 TOGGLE_HEATMAP
- [x] 邊標籤 toggle 控制 NeonEdge label 顯示
- [x] 粒子動畫 toggle 生效
- [x] 標籤密度三段切換正確
- [x] smart 模式 median 快取（T11 GraphCanvas medianDependencyCount useMemo 已實作）
- [x] tsc 編譯通過

---

## 事件紀錄

### 2026-03-31T22:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
