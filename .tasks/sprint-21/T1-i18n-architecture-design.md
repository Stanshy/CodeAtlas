# i18n 架構設計

| 欄位 | 值 |
|------|-----|
| ID | T1 |
| 專案 | CodeAtlas |
| Sprint | Sprint 21 |
| 指派給 | tech-lead |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 1h |
| 建立時間 | 2026-04-09T08:56:57.895Z |

---

## 任務描述

建立 i18n 架構設計文件 `.knowledge/specs/i18n-design.md`，定義：

1. **Key 命名規範**：`{區域}.{子區域}.{元素}`，全小寫 camelCase
   - 範例：`toolbar.switchProject`, `settings.language`, `panel.sf.title`
2. **Locale 傳遞鏈**（兩條路徑）：
   - Web：`localStorage('codeatlas-locale') > navigator.language > 'en'` → API body `locale` → server 補齊 → core
   - CLI：`--lang flag > .codeatlas.json locale > CODEATLAS_LANG env > 'en'` → core
3. **各層 i18n 策略**：
   - Web：react-i18next + useTranslation hook
   - Core AI：prompt-templates 模板函式吃 locale 參數
   - Core Wiki：WikiExporter 接受 locale，md-renderer 根據 locale 切換標題/分類
   - CLI：輕量 JSON 載入器，不引 i18next
4. **關鍵規則**：
   - core 不猜 locale — 所有 AI/Wiki 函式要求呼叫方明確傳入
   - API 層 locale optional，server 層補齊（undefined → 'en'）
   - config > env（.codeatlas.json 優先於 CODEATLAS_LANG）

## 驗收標準

- [x] `.knowledge/specs/i18n-design.md` 文件完成
- [x] locale 傳遞鏈清楚定義 Web / CLI 兩條路徑
- [x] key 命名規範含範例
- [x] 各層策略明確（web / core-ai / core-wiki / cli）

---

## 事件紀錄

### 2026-04-09T08:56:57.895Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-09T09:00:00.000Z — 完成（done）
產出 `.knowledge/specs/i18n-design.md` v1.0，含 key 命名規範、locale 傳遞鏈（Web/CLI）、4 層策略定義。
