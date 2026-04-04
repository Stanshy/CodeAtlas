# 測試 + 回歸

| 欄位 | 值 |
|------|-----|
| ID | T9 |
| 專案 | CodeAtlas |
| Sprint | Sprint 5 |
| 指派給 | test-writer-fixer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T2,T3,T4,T5,T6,T7,T8 |
| 預估 | 4h |
| 建立時間 | 2026-03-31T12:00:00.000Z |
| 開始時間 | 2026-03-31T02:10:00.000Z |
| 完工時間 | 2026-03-31T02:30:00.000Z |

---

## 任務描述

1. **單元測試**：
   - `path-tracer.test.ts`：線性路徑、分岔、循環依賴、depth 10 截斷、symbol 不存在、空 graph
   - `edge-symbols.test.ts`：1~3 symbol、>3 +N more、空陣列、特殊字元
   - `heatmap.test.ts`：粗細/亮度映射、開關、邊界值 0
   - `node-io-badge.test.ts`：importCount/exportCount、0 不顯示、>99 顯示 99+
   - `tracing-panel.test.ts`：路徑列表渲染、點擊跳轉、結束追蹤

2. **整合測試**：
   - `integration-s5.test.ts`：hover→標籤→追蹤→高亮→退出、熱力圖 toggle、2D/3D 切換保留追蹤

3. **回歸測試**：
   - 353+ 既有 tests 零回歸
   - `pnpm build` 三個 package 全通過

## 驗收標準

- [x] 新增單元測試全部通過
- [x] 新增整合測試全部通過
- [x] 353+ 既有 tests 零回歸
- [x] pnpm build 全通過

---

## 事件紀錄

### 2026-03-31T12:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T02:10:00.000Z — 狀態變更 → in_progress
G2 通過，委派 test-writer-fixer 執行。依計畫書 §7 測試計畫

### 2026-03-31T02:30:00.000Z — 狀態變更 → in_review
提交審查。6 個新測試檔案（89 tests）：path-tracer(14), edge-symbols(19), heatmap(18), node-io-badge(9), tracing-panel(13), integration-s5(16)。web 218 + core 217 = 435 tests 全通過。pnpm build 成功。

### 2026-03-31T02:30:00.000Z — 狀態變更 → done
L1 審核通過。0 Blocker / 0 Major / 0 Minor。
