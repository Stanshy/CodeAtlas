# 2D 適配：GraphCanvas 影響分析高亮 + 搜尋聚焦 + 過濾整合

| 欄位 | 值 |
|------|-----|
| ID | T11 |
| 專案 | CodeAtlas |
| Sprint | Sprint 8 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T3,T5,T6,T7 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T16:00:00.000Z |
| 開始時間 | 2026-03-31T08:53:09.670Z |
| 結束時間 | 2026-03-31T17:45:00.000Z |

---

## 任務描述

1. 修改 `packages/web/src/components/GraphCanvas.tsx`：
   - 註冊 `onNodeContextMenu` → dispatch `SHOW_CONTEXT_MENU`
   - 渲染 ContextMenu 元件
   - 影響分析高亮：impactAnalysis.active 時，impactedNodes/impactedEdges 用亮色，其他 dim
   - 搜尋聚焦：isSearchFocused 時，searchFocusNodes/searchFocusEdges opacity 1.0，其他 0.1
   - 過濾後節點/邊：從 graph-adapter 取得已過濾的 nodes/edges
2. 優先級疊加規則：
   - Filter 先應用（決定哪些節點存在）
   - SearchFocus 在過濾結果內生效（dim 非匹配）
   - ImpactAnalysis 在過濾結果內高亮（overlay）
3. 修改 `packages/web/src/components/NodePanel.tsx`：
   - impactAnalysis.active 時渲染 ImpactPanel 替換面板內容

## 驗收標準

- [x] 2D 模式右鍵節點 → ContextMenu 出現
- [x] 影響分析啟動時 impactedNodes/edges 高亮
- [x] 搜尋聚焦啟動時 dim 非匹配節點
- [x] graph-adapter 過濾邏輯正確整合
- [x] 三層優先級疊加正確（filter → search → impact）
- [x] NodePanel 整合 ImpactPanel
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T16:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T08:53:09.670Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-31T17:45:00.000Z — done
GraphCanvas: +filter(filteredInitialNodes/Edges) +contextMenu(onNodeContextMenu+ContextMenu render) +impact highlight(styledNodes/styledEdges priority: tracing>impact>search>hover) +useImpactAnalysis hook。NodePanel: +ImpactPanel 條件渲染（impactAnalysis.active 時替換 body）。tsc clean。
