# 測試 + 回歸

| 欄位 | 值 |
|------|-----|
| ID | T13 |
| 專案 | CodeAtlas |
| Sprint | Sprint 7 |
| 指派給 | test-writer-fixer |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-03-31T15:00:00.000Z |
| 結束時間 | 2026-03-31T15:30:00.000Z |
| 依賴 | T2,T3,T4,T5,T6,T7,T8,T9,T10,T11,T12 |
| 預估 | 4h |
| 建立時間 | 2026-03-31T12:00:00.000Z |

---

## 任務描述

1. 建立測試 fixture（`packages/core/__tests__/fixtures/function-level/`）
2. 單元測試：function-extractor, call-analyzer, function-node, zoom-into, call-chain
3. 整合測試：buildFunctionGraph 流程、API 端點、ViewState action
4. 回歸測試：523+ 既有 tests 零回歸 + pnpm build 全通過

## 驗收標準

- [x] 測試 fixture 建立（7 個檔案）
- [x] 新增單元測試全部通過
- [x] 新增整合測試全部通過
- [x] 523+ 既有 tests 零回歸
- [x] pnpm build 全通過

---

## 事件紀錄

### 2026-03-31T12:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T15:00:00.000Z — in_progress
由 test-writer-fixer 開始執行

### 2026-03-31T15:30:00.000Z — done
7 fixture files created. Core: 253→319 (66 new: function-extractor 29, call-analyzer 15, integration-s7 22). Web: 233→286 (53 new: call-chain 17, view-state-s7 16, function-node 20). tsc ×3 clean, pnpm build ×3 success. Zero regression.
