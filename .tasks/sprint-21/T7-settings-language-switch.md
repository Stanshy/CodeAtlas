# Settings 語言切換

| 欄位 | 值 |
|------|-----|
| ID | T7 |
| 專案 | CodeAtlas |
| Sprint | Sprint 21 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T6 |
| 預估 | 1h |
| 建立時間 | 2026-04-09T08:56:57.895Z |
| 完工時間 | 2026-04-09T09:30:00.000Z |

---

## 任務描述

在 SettingsPopover 新增「語言」Section：

1. **UI**：下拉選單，選項為 `English` / `繁體中文`
2. **樣式**：與現有 AI Provider select 一致
3. **功能**：
   - 切換即時生效（`i18n.changeLanguage(locale)`）
   - 持久化到 `localStorage('codeatlas-locale')`
   - 重新整理後保持選擇
4. **位置**：Settings 面板頂部（語言優先於 AI Provider）

## 驗收標準

- [x] 切換語言即時生效（所有 UI 文字更新）
- [x] 重新整理後保持語言選擇
- [x] 樣式與現有 AI Provider select 一致
- [x] localStorage key 為 `codeatlas-locale`

---

## 事件紀錄

### 2026-04-09T08:56:57.895Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-09T09:30:00.000Z — 狀態變更 → done（補登）
Sprint 21 i18n 全部完成。L1 補登任務完成狀態。
