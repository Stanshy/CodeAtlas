# 佈局引擎框架 + graph-adapter 整合

| 欄位 | 值 |
|------|-----|
| ID | T4 |
| 專案 | CodeAtlas |
| Sprint | Sprint 11 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T3 |
| 預估 | 3h |
| 建立時間 | 2026-04-01T14:00:00.000Z |

---

## 任務描述

建立可擴展的佈局引擎框架：

1. **新增 `layout-router.ts`**：
   - `LayoutInput` / `LayoutOutput` 統一介面
   - `LayoutProvider` 介面：`{ name, compute(input) }`
   - `computeLayout(engine, input)` 路由函式
   - `LAYOUT_PROVIDERS` 註冊表（Record<LayoutEngine, LayoutProvider>）
   - fallback：未知 engine → force-directed

2. **新增 `applyPerspective()`**：
   - 在 `graph-adapter.ts` 新增，替代 `applyViewMode()`
   - 根據 PerspectivePreset.filter 過濾 nodes/edges
   - `applyViewMode()` 保留但標記 deprecated

3. **GraphCanvas 整合**：
   - useMemo pipeline 中 `applyViewMode` → `applyPerspective`
   - 佈局計算透過 `computeLayout(preset.layout, ...)` 路由

4. **Graph3DCanvas 整合**：
   - 同步替換 applyViewMode → applyPerspective

## 驗收標準

- [ ] layout-router.ts LAYOUT_PROVIDERS 註冊表可擴展
- [ ] computeLayout 根據 engine 選擇 provider
- [ ] applyPerspective 過濾正確
- [ ] GraphCanvas/Graph3DCanvas 整合完成
- [ ] fallback 機制可用（未知 engine → force-directed）
- [ ] applyViewMode 標記 deprecated

---

## 事件紀錄

### 2026-04-01T14:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
