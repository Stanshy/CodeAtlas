# 2D/3D 共用邏輯抽取

| 欄位 | 值 |
|------|-----|
| ID | T9 |
| 專案 | CodeAtlas |
| Sprint | Sprint 17 |
| 指派給 | frontend-developer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T6,T7 |
| 預估 | 2h |
| 建立時間 | 2026-04-07T15:42:57.386Z |

---

## 任務描述

T6+T7 拆分後，抽取 GraphCanvas 與 Graph3DCanvas 的共用資料計算邏輯為 hooks。

### 共用 Hooks（3 個）

1. **`useFilteredGraphData`** → `hooks/useFilteredGraphData.ts` (~40 行)
   - applyPerspective + applyCuration pipeline（useMemo wrapper）
   - 2D 調用後再做額外 RF-specific 轉換，3D 直接使用

2. **`useGraphAdjacency`** → `hooks/useGraphAdjacency.ts` (~30 行)
   - 從 edges 建立鄰接表（connectedNodes Map）
   - 取代 2D 的 useHoverHighlight 內部邏輯 和 3D 的手動建表

3. **`useHighlightPriority`** → `hooks/useHighlightPriority.ts` (~60 行)
   - 統一高亮優先權判定：e2e > impact > search > tracing > hover > normal
   - 返回 ActiveHighlight discriminated union
   - 2D 用來簡化 styledNodes priority chain，3D 用來簡化 effect chain

**誠實評估**：共用 ~130 行新增，2D/3D 各省 ~65/80 行。主要價值是一致性。

## 驗收標準

- [x] 3 個共用 hook 建立
- [x] GraphCanvas 和 Graph3DCanvas 都引用至少 1 個共用 hook
- [x] pnpm build 通過
- [x] UI 行為不變

---

## 事件紀錄

### 2026-04-07T15:42:57.386Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
