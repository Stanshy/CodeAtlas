# 邏輯運作視角（BFS hover 多跳高亮）

| 欄位 | 值 |
|------|-----|
| ID | T6 |
| 專案 | CodeAtlas |
| Sprint | Sprint 11 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T4 |
| 預估 | 3h |
| 建立時間 | 2026-04-01T14:00:00.000Z |

---

## 任務描述

實作邏輯運作視角的完整功能：

1. **useBfsHoverHighlight.ts hook**：
   - BFS 雙向遍歷（forward + backward）
   - maxDepth 預設 5
   - 回傳 `{ highlightedNodes: Set<string>, highlightedEdges: Set<string> }`
   - useMemo 快取，hoveredNodeId 或 edges 變化時重算

2. **非相關節點淡化**：
   - 未在 highlightedNodes 中 → opacity 0.15
   - NeonNode / NeonEdge 根據 highlight 狀態調整 opacity
   - transition 動畫平滑（200ms ease-out）

3. **多色霓虹色調保留**：
   - 邏輯運作使用現有 Sprint 2 配色系統
   - 粒子流動保留

4. **2D + 3D 適配**：
   - 2D：React Flow node/edge style 控制 opacity
   - 3D：Graph3DCanvas material opacity 控制

## 驗收標準

- [ ] hover 節點 → 多跳呼叫鏈全亮（BFS 雙向）
- [ ] 非相關節點淡化至 opacity 0.15
- [ ] BFS 深度限制 maxDepth 5
- [ ] 粒子流動保留
- [ ] 2D + 3D 皆可用
- [ ] 孤立節點 BFS 不報錯

---

## 事件紀錄

### 2026-04-01T14:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
