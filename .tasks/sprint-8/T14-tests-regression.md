# 測試 + 回歸

| 欄位 | 值 |
|------|-----|
| ID | T14 |
| 專案 | CodeAtlas |
| Sprint | Sprint 8 |
| 指派給 | test-writer-fixer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T2,T3,T4,T5,T6,T7,T8,T9,T10,T11,T12 |
| 預估 | 4h |
| 建立時間 | 2026-03-31T16:00:00.000Z |

---

## 任務描述

1. 測試 Fixture：新增 `impact-graph.json` + `filter-graph.json`（復用 Sprint 7 fixture 目錄）
2. 單元測試：
   - `impact-analysis.test.ts`：BFS 正向/反向、depth limit、循環防護、截斷、混合 edge type、孤立節點
   - `filter-panel.test.ts`：目錄過濾、節點類型、邊類型、組合過濾、空陣列全選、空狀態
   - `context-menu.test.ts`：選單渲染、定位、項目點擊、Escape 關閉、click outside
   - `search-focus.test.ts`：聚焦啟動/退出、opacity 計算、直接連接 edge 高亮
   - `overview-builder.test.ts`：結構提取、prompt 組裝、隱私驗證、大型專案截斷
3. 整合測試：
   - `integration-s8.test.ts`：完整影響分析流程、過濾 + 搜尋組合、AI 概述 mock
   - `view-state-s8.test.ts`：9 個新 action 全部測試
4. 回歸測試：605+ 既有 tests 零回歸 + `pnpm build` 全通過

## 驗收標準

- [x] 測試 fixture 建立（2 個 JSON）
- [x] 新增單元測試全部通過
- [x] 新增整合測試全部通過
- [x] 605+ 既有 tests 零回歸（718 total）
- [x] pnpm build 全通過

---

## 事件紀錄

### 2026-03-31T16:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T20:00:00.000Z — 狀態變更 → in_progress
開始執行測試任務

### 2026-03-31T21:00:00.000Z — done
+113 新測試（core +24, web +89），總計 718 tests 全部通過。impact-analysis 30, graph-adapter-filter 21, view-state-s8 38, overview-builder 24。fixtures: impact-graph.json + filter-graph.json。pnpm build clean。零回歸。
