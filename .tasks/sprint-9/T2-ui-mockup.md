# UI 圖稿：控制面板 + Toolbar + 視圖模式 HTML mockup

| 欄位 | 值 |
|------|-----|
| ID | T2 |
| 專案 | CodeAtlas |
| Sprint | Sprint 9 |
| 指派給 | design-director |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T1 |
| 預估 | 3h |
| 建立時間 | 2026-03-31T22:00:00.000Z |
| 開始時間 | 2026-03-31T23:30:00.000Z |
| 完工時間 | 2026-03-31T23:55:00.000Z |

---

## 任務描述

建立 HTML mockup 圖稿，供 G1 審核：
1. `mockups/sprint9-controlpanel-mockup.html` — 控制面板完整佈局：5 個區段（視圖模式/顯示偏好/分析工具/過濾器/AI 設定）、展開/收合狀態、icon 快捷列
2. `mockups/sprint9-toolbar-mockup.html` — Toolbar 三區段佈局：左（ControlPanel toggle）+ 中（SearchBar）+ 右（ViewMode indicator + 2D/3D toggle）
3. 視圖模式切換互動：四種視圖 radio group + 每種視圖的過濾效果預覽
4. 延續深色霓虹主題色彩系統

## 驗收標準

- [x] controlpanel-mockup.html 完成（5 個區段、展開/收合）
- [x] toolbar-mockup.html 完成（三區段佈局）
- [x] 視圖模式切換互動呈現
- [x] 深色霓虹主題一致
- [x] 收合狀態 icon 列呈現

---

## 事件紀錄

### 2026-03-31T22:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T23:00:00.000Z — done（作廢）
舊版放錯位置（packages/web/src/components/mockup/），由 frontend-developer 完成。老闆要求重做到正確路徑。

### 2026-03-31T23:30:00.000Z — 狀態變更 → in_progress（重做）
design-director 接手。老闆要求圖稿放在 proposal/mockups/ 下。委派 ui-designer 製作新版。

### 2026-03-31T23:55:00.000Z — 狀態變更 → done
ui-designer 完成兩份圖稿：
1. `mockups/sprint9-controlpanel-mockup.html`（2204 行，75KB）
   - 5 個區段全部可互動（視圖模式/顯示偏好/分析工具/過濾器/AI 設定）
   - 4 種視圖模式 radio + 主圖效果同步變化
   - Toggle 開關/滑桿/三段選擇器全部可操作
   - 端到端追蹤：選取模式 → 點擊節點 → 右側 E2EPanel 路徑面板
   - 收合 44px icon 列 + 點擊展開對應區段
   - Hamburger ↔ X 動畫 + Toast 通知
2. `mockups/sprint9-toolbar-mockup.html`（1852 行，53KB）
   - 三區段佈局（左 hamburger+logo / 中搜尋 / 右 ViewMode+2D/3D）
   - 搜尋 dropdown + 結果高亮 + Ctrl+K 快捷鍵
   - ViewMode badge 雙向同步 ControlPanel
   - 頂部霓虹漸變線 + backdrop-filter 毛玻璃
深色霓虹色碼嚴格引用 Sprint 2 色彩系統。design-director L1 審核通過。
