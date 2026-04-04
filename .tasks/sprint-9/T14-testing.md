# 測試 + 回歸：Sprint 9 新增功能測試 + 755 既有測試零回歸

| 欄位 | 值 |
|------|-----|
| ID | T14 |
| 專案 | CodeAtlas |
| Sprint | Sprint 9 |
| 指派給 | test-writer-fixer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T11,T12 |
| 預估 | 4h |
| 建立時間 | 2026-03-31T22:00:00.000Z |

---

## 任務描述

Sprint 9 新增功能的單元測試 + 整合測試 + 755 既有測試零回歸。

### 測試範圍

1. **traceE2E 純函式**（`packages/web/src/hooks/useE2ETracing.ts`）
   - 正向 BFS：線性路徑 A→B→C
   - 混合 edge type：import + call + data-flow
   - depth limit：設 depth=2，確認深度截斷
   - 循環防護：A→B→A，visited set 正確
   - 截斷：超過 30 節點 truncated=true
   - steps 記錄：每步 E2EStep 結構正確（nodeId, nodeLabel, edgeId, edgeType, symbols, depth）
   - symbol 收集：edge 上 symbols 正確收集
   - 空圖 / 起點不存在：回傳空 path
   - 分支 BFS：A→B, A→C 均被追蹤

2. **applyViewMode**（`packages/web/src/adapters/graph-adapter.ts`）
   - panorama：不過濾任何 node/edge
   - dependency：只保留 import+export edges
   - dataflow：只保留 data-flow+export edges
   - callchain：只保留 function+class+file nodes，call edges
   - 空 nodes/edges 輸入

3. **VIEW_MODE_PRESETS**（`packages/web/src/adapters/view-modes.ts`）
   - 4 種預設都有 label, filter, display
   - filter.nodeTypes / edgeTypes 正確

4. **ViewState reducer 7 新 action**（`packages/web/src/contexts/ViewStateContext.tsx`）
   - SET_VIEW_MODE：切換 mode + 清除 impactAnalysis/searchFocus/e2eTracing/filter
   - TOGGLE_CONTROL_PANEL：isControlPanelOpen toggle
   - SET_DISPLAY_PREFS：部分更新 displayPrefs
   - START_E2E_TRACING：設定 e2eTracing + 清除 impactAnalysis/tracingSymbol
   - UPDATE_E2E_DEPTH：更新 maxDepth
   - CLEAR_E2E_TRACING：清除 e2eTracing
   - SET_E2E_SELECTING：設定 isE2ESelecting

5. **整合測試**
   - 視圖模式 + 手動過濾疊加
   - 端到端追蹤 + 視圖切換清除

6. **回歸測試**
   - 755 既有 tests（core 343 + web 375 + cli 37）全部通過
   - `pnpm build` 全通過

## 驗收標準

- [x] traceE2E 單元測試 >= 9 cases（實際 41 cases）
- [x] applyViewMode 單元測試 >= 5 cases（實際含 VIEW_MODE_PRESETS 共 51 cases）
- [x] VIEW_MODE_PRESETS 驗證測試
- [x] ViewState reducer 7 新 action 各至少 1 case（實際 46 cases）
- [x] 整合測試 >= 2 cases（含在 view-modes + view-state-s9 中）
- [x] 755 既有測試零回歸（893 total 全過）
- [x] pnpm build 通過
- [x] tsc 編譯通過

---

## 事件紀錄

### 2026-03-31T22:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T23:55:00.000Z — 開始執行
由 L1 委派給 test-writer-fixer

### 2026-04-01T00:30:00.000Z — 完成
3 新測試檔：e2e-tracing.test.ts（41）、view-modes.test.ts（51）、view-state-s9.test.ts（46）。共新增 138 tests。全部 893 tests 通過（web 513 + core 343 + cli 37），pnpm build clean。零回歸。
