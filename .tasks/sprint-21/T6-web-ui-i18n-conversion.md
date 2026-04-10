# Web UI i18n 改造

| 欄位 | 值 |
|------|-----|
| ID | T6 |
| 專案 | CodeAtlas |
| Sprint | Sprint 21 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T5 |
| 預估 | 4h |
| 建立時間 | 2026-04-09T08:56:57.895Z |
| 完工時間 | 2026-04-09T09:30:00.000Z |

---

## 任務描述

~60 個元件硬編碼字串替換為 `t('key')`。

**改造方式**：
1. 在每個元件頂部加入 `const { t } = useTranslation();`
2. 將所有硬編碼中文/英文 UI 字串替換為 `t('對應key')`
3. 對於含變數的字串，使用 i18next interpolation：`t('key', { count: n })`

**範圍（產品內建 UI 字串）**：
- 按鈕文字、標題、副標題
- Placeholder、空狀態文字
- Toast 通知訊息
- 面板標題、標籤、圖例文字
- Tab 名稱、右鍵選單項目

**不改**：
- AI 回傳的分析結果內容
- 使用者輸入的資料
- console.log / 開發者除錯訊息
- 第三方元件內部文字

**優先順序**：先改共用元件（Toolbar/TabBar/Settings）→ 再改頁面級（Welcome/Progress）→ 最後改面板（各 Panel）

**完整元件清單**（見 dev-plan 第 4 節修改列表）

## 驗收標準

- [x] 全部元件使用 `t()`，無遺漏硬編碼中文
- [x] 切換語言後所有 UI 文字即時更新
- [x] 全域搜尋中文字元（排除 locales/、AI 回傳、console）零殘留
- [x] `pnpm build` 零錯誤

---

## 事件紀錄

### 2026-04-09T08:56:57.895Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-09T09:30:00.000Z — 狀態變更 → done（補登）
Sprint 21 i18n 全部完成。L1 補登任務完成狀態。
