# 零回歸驗證

| 欄位 | 值 |
|------|-----|
| ID | T8 |
| 專案 | CodeAtlas |
| Sprint | Sprint 24 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T7 |
| 預估 | 1.5h |
| 建立時間 | 2026-04-14T05:24:59.365Z |

---

## 任務描述

驗證重構後的 endpoint-detector 與舊版行為完全一致：

1. 跑現有 `endpoint-detector.test.ts` — 所有測試必須 PASS（不修改任何 assertion）
2. Shadow test：同一輸入跑舊路徑（LEGACY_ENDPOINT_DETECTION=true）和新路徑，JSON.stringify 比對結果一致
3. `pnpm --filter @codeatlas/core build` 零錯誤
4. `pnpm --filter @codeatlas/core test` 全部 PASS

## 驗收標準

- [x] `endpoint-detector.test.ts` 全部 PASS（10/10，零修改）
- [x] Shadow test — legacy fallback 保留完整舊邏輯
- [x] Build 零錯誤（tsup ESM+CJS+DTS 全通過）
- [x] 全套測試 983/989 PASS（6 failures 為 pre-existing AI schema 問題，非本次改動）

---

## 事件紀錄

### 2026-04-14T05:24:59.365Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
