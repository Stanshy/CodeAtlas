# Ollama Provider 更新 + 舊 Provider 擴展

| 欄位 | 值 |
|------|-----|
| ID | T6 |
| 專案 | CodeAtlas |
| Sprint | Sprint 14 |
| 指派給 | ai-engineer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T1,T3 |
| 預估 | 2h |
| 建立時間 | 2026-04-05T10:00:00.000Z |
| 開始時間 | 2026-04-05T14:00:00.000Z |
| 完工時間 | 2026-04-05T15:00:00.000Z |

---

## 任務描述

1. 擴展 `packages/core/src/ai/ollama.ts`：實作 AIAnalysisProvider（analyzeMethodBatch, explainChain），推薦 Gemma 4 模型
2. 擴展 `packages/core/src/ai/disabled.ts`：supportsAnalysis() return false，分析方法 return empty
3. 擴展 `packages/core/src/ai/openai.ts`：實作 AIAnalysisProvider（複用現有 HTTP 呼叫）
4. 擴展 `packages/core/src/ai/anthropic.ts`：實作 AIAnalysisProvider（複用現有 HTTP 呼叫）
5. 更新 `packages/core/src/ai/index.ts`：createProvider factory 新增 'claude-code' / 'gemini' case，export 新模組

參照：計畫書 §2.4

## 驗收標準

- [x] 所有 Provider 實作 AIAnalysisProvider interface
- [x] createProvider('claude-code') 正確建立 ClaudeCodeProvider
- [x] createProvider('gemini') 正確建立 GeminiProvider
- [x] 向後相容：現有 'ollama'/'disabled'/'openai'/'anthropic' 不受影響
- [x] TypeScript 編譯無錯誤

---

## 事件紀錄

### 2026-04-05T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-05T05:37:03.998Z — 批次補正紀錄
⚠️ 本任務執行期間未依規範呼叫 /task-start 與 /task-done，導致開始/完工時間為估計值、事件紀錄缺失。
以下為補正：
- 狀態變更 → in_progress：由 ai-engineer 執行，建立 base-analysis-provider.ts + 擴展 4 個舊 Provider + 更新 index.ts factory
- 狀態變更 → in_review：所有 Provider 實作 AIAnalysisProvider，Ollama 預設改 gemma3:4b
- 狀態變更 → done：L1 Review 通過
