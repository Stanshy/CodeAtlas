# 3D 適配：Graph3DCanvas 影響分析 + 搜尋聚焦 + 右鍵選單 + 過濾整合

| 欄位 | 值 |
|------|-----|
| ID | T12 |
| 專案 | CodeAtlas |
| Sprint | Sprint 8 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T11 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T16:00:00.000Z |

---

## 任務描述

1. 修改 `packages/web/src/components/Graph3DCanvas.tsx`：
   - 右鍵選單：raycaster 命中節點 → `THREE.Vector3.project(camera)` → 螢幕座標 → dispatch `SHOW_CONTEXT_MENU`
   - 渲染 ContextMenu 元件（DOM overlay）
   - 影響分析高亮：3D node material + edge line 色彩/opacity 調整
   - 搜尋聚焦：3D node/edge opacity 調整（匹配 1.0 / 非匹配 0.1）
   - 過濾：從 graph-adapter 取得已過濾的 nodes/edges
2. 與 2D 共用邏輯：
   - ContextMenu 元件相同（DOM overlay）
   - 影響分析/搜尋聚焦 state 共用（ViewState）
   - 差異只在渲染層（material vs CSS）

## 驗收標準

- [x] 3D 模式右鍵命中節點 → ContextMenu 出現
- [x] raycaster → 螢幕投影正確
- [x] 3D 影響分析高亮正確（node material + edge line）
- [x] 3D 搜尋聚焦 dim/highlight 正確
- [x] 3D 過濾整合正確
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T16:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T18:00:00.000Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-31T18:30:00.000Z — done
Graph3DCanvas Sprint 8 整合完成：onNodeRightClick→onNodeContextMenu(event.clientX/clientY)、impact analysis useEffect(impactNodeSet dim 0.15/active)、search focus useEffect(focusNodeSet dim 0.1/active)、impact restore guard(isSearchFocused/tracingSymbol/hoveredNodeId)。過濾由父元件傳入已過濾的 graphNodes/graphEdges。tsc clean。
