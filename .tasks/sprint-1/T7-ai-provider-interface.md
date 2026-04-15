# AI Provider Interface

| 欄位 | 值 |
|------|-----|
| ID | T7 |
| 專案 | CodeAtlas |
| Sprint | Sprint 1 |
| 指派給 | backend-architect |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T2 |
| 預估 | 1h |
| 建立時間 | 2026-03-30T10:00:00.000Z |

---

## 任務描述

定義 AI Summary Provider 接口，實作 DisabledProvider 和 OpenAI/Anthropic stub。

### 具體工作

1. 在 `packages/core/src/ai/types.ts` 定義 `SummaryProvider` interface
2. 實作 `packages/core/src/ai/disabled.ts`：`DisabledProvider`（回傳預設訊息）
3. 實作 `packages/core/src/ai/openai.ts`：`OpenAIProvider` stub（拋出 not implemented）
4. 實作 `packages/core/src/ai/anthropic.ts`：`AnthropicProvider` stub（拋出 not implemented）
5. 實作 `packages/core/src/ai/index.ts`：統一 export

### 規範參考

- `.knowledge/specs/feature-spec.md` AI Provider 區段（如有）
- `packages/core/src/types.ts`（T2 產出）

## 驗收標準

- [x] SummaryProvider interface 定義完整
- [x] DisabledProvider 實作正確，回傳預設訊息
- [x] OpenAI/Anthropic stub 可實例化，呼叫方法時拋出 NotImplemented
- [x] 所有 provider 從 `ai/index.ts` 統一 export + createProvider factory
- [x] TypeScript 編譯無錯誤

---

## 事件紀錄

### 2026-03-30T10:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-30T11:20:00.000Z — 狀態變更 → in_review
backend-architect 完成。DisabledProvider + OpenAI/Anthropic stub + createProvider factory。type-check 通過。

### 2026-03-30T11:21:00.000Z — 狀態變更 → done
L1 審核通過。ai/types.ts 僅 re-export（SSoT 在 types.ts），factory fallback 設計合理。
