# 翻譯檔 — 英文

| 欄位 | 值 |
|------|-----|
| ID | T4 |
| 專案 | CodeAtlas |
| Sprint | Sprint 21 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | assigned |
| 依賴 | T3 |
| 預估 | 2h |
| 建立時間 | 2026-04-09T08:56:57.895Z |

---

## 任務描述

掃描所有 Web 元件（~60 個），提取產品內建 UI 字串，建立完整 `packages/web/src/locales/en.json`。

**範圍**：
- 產品內建 UI 字串（按鈕文字、標題、placeholder、空狀態、提示訊息等）
- **不含**：AI 回傳內容、使用者輸入、第三方元件內部文字

**Key 命名規範**：`{區域}.{子區域}.{元素}`
- `toolbar.switchProject`, `toolbar.settings`, `toolbar.search`
- `welcome.title`, `welcome.subtitle`, `welcome.apiKeyLabel`
- `settings.language`, `settings.aiProvider`, `settings.apiKey`
- `panel.sf.title`, `panel.lo.title`, `panel.dj.title`
- `tabBar.codeGraph`, `tabBar.wikiGraph`
- `contextMenu.expandAll`, `contextMenu.collapseAll`

**重點元件清單**（依 dev-plan 第 4 節）：
Toolbar, TabBar, SearchBar, NodePanel, LODetailPanel, SFDetailPanel, DJPanel, WikiPreviewPanel, WikiGraph, Toast, WelcomePage, ProgressPage, ProjectInput, RecentProjects, ContextMenu, E2EPanel, TracingPanel, FilterPanel, AIResultBlock, FunctionPanel, ImpactPanel, GraphContainer, SettingsPopover, AISettingsSection

## 驗收標準

- [ ] `en.json` 包含所有產品 UI 字串
- [ ] Key 命名遵循 `{區域}.{子區域}.{元素}` 規範
- [ ] 無遺漏的硬編碼中文（排除 AI 回傳/locales/）
- [ ] JSON 格式正確，無語法錯誤

---

## 事件紀錄

### 2026-04-09T08:56:57.895Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
