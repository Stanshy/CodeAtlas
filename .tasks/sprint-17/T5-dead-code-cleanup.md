# 死碼清理

| 欄位 | 值 |
|------|-----|
| ID | T5 |
| 專案 | CodeAtlas |
| Sprint | Sprint 17 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T4 |
| 預估 | 1h |
| 建立時間 | 2026-04-07T15:42:57.386Z |

---

## 任務描述

根據 T4 盤點結果 + 老闆確認的清單，執行死碼清理：

**已確認刪除項目**（老闆 2026-04-07 確認）：
- `packages/web/src/components/ControlPanel.tsx` (609 行)
- `packages/web/src/components/ControlPanelSection.tsx` (133 行)

**附帶清理**：
- DisplayPrefsSection.tsx 中引用 ControlPanel 的過時 JSDoc 註解
- FilterPanel.tsx 中引用 ControlPanel 的過時 JSDoc 註解
- SettingsPopover.tsx header 中引用 ControlPanel 的過時註解

## 驗收標準

- [x] ControlPanel.tsx 已刪除
- [x] ControlPanelSection.tsx 已刪除
- [x] 過時 JSDoc 註解已清理
- [x] pnpm build 通過
- [x] pnpm test 無新增失敗

---

## 事件紀錄

### 2026-04-07T15:42:57.386Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
