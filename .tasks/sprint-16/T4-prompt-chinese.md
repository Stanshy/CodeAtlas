# Prompt 中文化 + 結構化輸出

| 欄位 | 值 |
|------|-----|
| ID | T4 |
| 專案 | CodeAtlas |
| Sprint | Sprint 16 |
| 指派給 | ai-engineer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 3h |
| 建立時間 | 2026-04-07T18:00:00.000Z |
| 開始時間 | 2026-04-07T18:30:00.000Z |
| 完工時間 | 2026-04-07T19:00:00.000Z |

---

## 任務描述

修改 `packages/core/src/ai/prompt-templates.ts`：頂部新增 `export const PROMPT_VERSION = 'v16.0'`。6 個 Prompt 模板結尾全部追加中文+JSON+字數限制指令區塊（見提案書附錄 D）。

新增 `packages/core/src/ai/response-sanitizer.ts`：sanitizeAIResponse() strip markdown → JSON.parse → regex extract fallback。sanitizeAndValidate() 搭配 zod .partial() 容許缺欄位。

取代 base-analysis-provider.ts 的 private extractJson() 方法，改用 sanitizeAIResponse()。

規格對照：提案書附錄 D。

## 驗收標準

- [x] PROMPT_VERSION = 'v16.0' 已匯出
- [x] 6 個 Prompt 模板結尾有中文指令區塊
- [x] sanitizeAIResponse 可處理：clean JSON / markdown wrapped / natural language with embedded JSON
- [x] sanitizeAndValidate 搭配 zod partial 容許缺欄位
- [x] base-analysis-provider.ts 改用 sanitizeAIResponse
- [x] pnpm build 通過

---

## 事件紀錄

### 2026-04-07T18:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-07T18:30:00.000Z — 開始執行
ai-engineer 開始執行

### 2026-04-07T19:00:00.000Z — 完成交付
PROMPT_VERSION v16.0 + REPLY_RULES 繁體中文 + response-sanitizer.ts 新增 + base-analysis-provider 整合

### 2026-04-07T19:05:00.000Z — L1 Review 通過
0 Blocker / 0 Major / 0 Minor
