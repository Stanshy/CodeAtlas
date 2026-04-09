# 測試碼瘦身

| 欄位 | 值 |
|------|-----|
| ID | T10 |
| 專案 | CodeAtlas |
| Sprint | Sprint 17 |
| 指派給 | test-writer-fixer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T6,T7,T8 |
| 預估 | 2h |
| 建立時間 | 2026-04-07T15:42:57.386Z |

---

## 任務描述

T6-T8 拆分後，整理測試碼：

1. 識別跨測試檔案的重複 mock setup（ViewStateContext mock、graph data mock 等）
2. 合併為 `__tests__/helpers/` 共用 mock
3. 整理冗餘測試案例（相同邏輯的重複測試）
4. 更新因拆分而需調整的測試 import

**具體目標在 T6-T8 完成後由 L1 細化。**

## 驗收標準

- [x] 測試碼 LOC 有下降（前後對比）
- [x] pnpm test 全通過
- [x] 無新增測試失敗

---

## 事件紀錄

### 2026-04-07T15:42:57.386Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
