# LOC 全面盤點

| 欄位 | 值 |
|------|-----|
| ID | T4 |
| 專案 | CodeAtlas |
| Sprint | Sprint 17 |
| 指派給 | tech-lead |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 1h |
| 建立時間 | 2026-04-07T15:42:57.386Z |

---

## 任務描述

產出 `proposal/sprint17-loc-report.md`，內容：

1. 各層（core/cli/web）LOC 統計 + 檔案數
2. 大檔案 TOP 20
3. 死碼候選清單（需老闆確認後才執行刪除）：
   - ControlPanel.tsx (609 行) — 已被 SettingsPopover 取代，App.tsx 零引用
   - ControlPanelSection.tsx (133 行) — 僅被 ControlPanel.tsx 引用
4. 重複邏輯候選（GraphCanvas vs Graph3DCanvas 共用邏輯）
5. 拆分方案預覽（GraphCanvas/Graph3DCanvas/SettingsPopover）

**⚠️ T4 報告送老闆確認後才執行 T5**

## 驗收標準

- [x] proposal/sprint17-loc-report.md 產出
- [x] 包含各層 LOC 統計（web 25,711 + core 7,860 + cli 2,920 = 36,491）
- [x] 包含 TOP 20 大檔案
- [x] 包含死碼候選清單（ControlPanel 609 + ControlPanelSection 133 = 742）
- [x] 老闆確認刪除清單 — 2026-04-07 老闆已核准刪除 ControlPanel 系列

---

## 事件紀錄

### 2026-04-07T15:42:57.386Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
