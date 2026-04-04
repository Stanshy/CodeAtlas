# 測試 + 全面回歸

| 欄位 | 值 |
|------|-----|
| ID | T11 |
| 專案 | CodeAtlas |
| Sprint | Sprint 12 |
| 指派給 | test-writer-fixer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T8 |
| 預估 | 3h |
| 建立時間 | 2026-04-01T19:10:00.000Z |
| 開始時間 | 2026-04-01T21:05:00.000Z |
| 完工時間 | 2026-04-01T21:15:00.000Z |

---

## 任務描述

### 新增測試
- 目錄聚合（core 層）：aggregateByDirectory 正確性
- 主題測試：CSS 變數正確性、design tokens 值與圖稿一致
- 三種呈現邏輯：
  - 系統框架目錄卡片渲染
  - 邏輯運作 click 聚焦（useBfsClickFocus）
  - 資料旅程 stagger 出現（useStaggerAnimation v2）
- Tab 切換測試
- 策展整合測試

### 回歸測試
- 1092+ 既有 tests 零回歸
- pnpm build 全通過

## 驗收標準

- [x] 1092+ tests 零回歸
- [x] 新增測試覆蓋所有 Sprint 12 新增功能
- [x] pnpm build 全通過
- [x] 無 Critical/High bug

---

## 事件紀錄

### 2026-04-01T19:10:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
