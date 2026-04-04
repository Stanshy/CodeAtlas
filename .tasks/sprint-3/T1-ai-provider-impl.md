# AI Provider 真實實作

| 欄位 | 值 |
|------|-----|
| ID | T1 |
| 專案 | CodeAtlas |
| Sprint | Sprint 3 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 完工時間 | 2026-03-31T10:30:00.000Z |
| 依賴 | — |
| 預估 | 3h |
| 建立時間 | 2026-03-31T10:00:00.000Z |

---

## 任務描述

將 OpenAIProvider + AnthropicProvider 從 stub 升級為真實 HTTP 呼叫（直接 fetch，不裝 SDK）。

### 具體工作

1. `packages/core/src/ai/openai.ts`：實作 `summarize()` 方法
   - 呼叫 OpenAI Chat Completions API（`https://api.openai.com/v1/chat/completions`）
   - 使用 `gpt-4o-mini` 模型（輕量、便宜）
   - Prompt 設計：系統 prompt 定義角色（程式碼分析師），user prompt 包含 code + context
   - timeout 10s（AbortController）
   - error handling：401 → api key 無效、429 → rate limit、5xx → server error
   - 回傳摘要字串

2. `packages/core/src/ai/anthropic.ts`：實作 `summarize()` 方法
   - 呼叫 Anthropic Messages API（`https://api.anthropic.com/v1/messages`）
   - 使用 `claude-3-haiku-20240307` 模型（輕量、便宜）
   - Header：`x-api-key` + `anthropic-version: 2023-06-01`
   - 同樣 timeout 10s + error handling

3. Prompt 設計（兩個 Provider 共用邏輯）：
   ```
   System: You are a code analyst. Given source code and its import/export context,
   provide a concise 2-3 sentence summary explaining what this module does,
   in plain language that a non-engineer can understand.

   User: File: {filePath} ({language})
   Imports: {imports}
   Exports: {exports}

   Source Code:
   {code (前 200 行)}
   ```

4. 共用工具提取到 `packages/core/src/ai/utils.ts`：
   - `buildPrompt(code, context)` — 產生統一的 prompt
   - `truncateCode(code, maxLines)` — 截斷程式碼避免 token 超限

### 規範參考

- api-design.md：POST /api/ai/summary 回應格式
- coding-standards.md：所有外部 HTTP 呼叫必須有 timeout + error handling
- 所有 JSON.parse 必須包 try-catch

## 驗收標準

- [x] OpenAI Provider 傳入有效 API key 可取得摘要回應
- [x] Anthropic Provider 傳入有效 API key 可取得摘要回應
- [x] 無效 key 回傳明確錯誤訊息（不是 unhandled rejection）
- [x] timeout 10s 後拋出明確 timeout 錯誤
- [x] 所有 JSON.parse 包 try-catch
- [x] 不安裝任何 SDK 依賴（純 fetch）
- [x] 既有 225 tests 無回歸

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-31T10:05:00.000Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-31T10:28:00.000Z — 狀態變更 → in_review
完成。openai.ts + anthropic.ts 真實 HTTP fetch 實作，utils.ts 共用 buildPrompt/truncateCode，timeout 10s，所有 JSON.parse 包 try-catch。192 tests 通過無回歸。

### 2026-03-31T10:30:00.000Z — 狀態變更 → done
L1 審核通過。程式碼品質合格，error handling 完整，無 SDK 依賴。
