# AI Prompt 模板化

| 欄位 | 值 |
|------|-----|
| ID | T8 |
| 專案 | CodeAtlas |
| Sprint | Sprint 21 |
| 指派給 | backend-architect |
| 優先級 | P1 |
| 狀態 | assigned |
| 依賴 | T2 |
| 並行組 | A |
| 預估 | 3h |
| 建立時間 | 2026-04-09T08:56:57.895Z |

---

## 任務描述

將 AI Prompt 從硬編碼中文改為模板函式吃 `locale` 參數：

1. **`packages/core/src/ai/prompt-templates.ts`**：
   - 6 個 prompt 模板函式加入 `locale: Locale` 參數
   - 中英雙版本：中文 Prompt 品質不退化，英文 Prompt 產出正確英文結果
   - import `Locale` type from `../types`

2. **新增 `packages/core/src/ai/prompt-locale.ts`**：
   - locale 相關常數（語言指令、回覆規則）
   - 例：`REPLY_LANGUAGE[locale]`、`ANALYSIS_INSTRUCTION[locale]`

3. **`packages/cli/src/ai-pipeline.ts`**：
   - pipeline 接受 locale 參數並傳遞給 prompt 模板函式

4. **`packages/cli/src/server.ts`**：
   - API 路由接收 `locale` 參數（body.locale, optional）
   - server 層補齊：`const locale = body.locale ?? 'en'`
   - 傳遞給 core AI 函式

**Git 分支**：`task/s21-T8-ai-prompt-i18n`（並行組 A，需開獨立分支）

## 驗收標準

- [ ] 6 個 prompt 模板函式支援 `locale` 參數
- [ ] `prompt-locale.ts` 常數檔建立
- [ ] 中文 Prompt 輸出品質不退化
- [ ] 英文 Prompt 可產出正確英文摘要/分析
- [ ] `ai-pipeline.ts` 正確傳遞 locale
- [ ] `server.ts` API 路由接收並補齊 locale
- [ ] `pnpm build` 零錯誤

---

## 事件紀錄

### 2026-04-09T08:56:57.895Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
