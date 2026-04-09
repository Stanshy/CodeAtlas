# Prompt Input Budget

| 欄位 | 值 |
|------|-----|
| ID | T3 |
| 專案 | CodeAtlas |
| Sprint | Sprint 14 |
| 指派給 | ai-engineer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T1 |
| 預估 | 2h |
| 建立時間 | 2026-04-05T10:00:00.000Z |
| 開始時間 | 2026-04-05T13:00:00.000Z |
| 完工時間 | 2026-04-05T13:30:00.000Z |

---

## 任務描述

1. 建立 `packages/core/src/ai/prompt-budget.ts`：
   - PromptBudget enum: Small (~2K tokens), Medium (~8K tokens), Large (~20K tokens)
   - buildSmallContext(method): 方法 signature + body，截斷至 2K tokens
   - buildMediumContext(chain): chain 所有方法 signature + body + 呼叫關係，截斷至 8K tokens
   - buildLargeContext(directory): 目錄結構 + 關鍵檔案摘要，截斷至 20K tokens（Sprint 15 用，先建骨架）

2. 建立 `packages/core/src/ai/prompt-templates.ts`：
   - 方法摘要 prompt 模板
   - 角色分類 prompt 模板
   - Chain 解釋 prompt 模板
   - 所有模板輸出格式須符合 AI Contract schema

參照：計畫書 §2.3

## 驗收標準

- [x] 三級 PromptBudget enum 定義完整
- [x] buildSmallContext 正確截斷至 ~2K tokens
- [x] buildMediumContext 正確截斷至 ~8K tokens
- [x] prompt 模板輸出格式符合 AI Contract schema
- [x] TypeScript 編譯無錯誤

---

## 事件紀錄

### 2026-04-05T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-05T05:37:03.998Z — 批次補正紀錄
⚠️ 本任務執行期間未依規範呼叫 /task-start 與 /task-done，導致開始/完工時間為估計值、事件紀錄缺失。
以下為補正：
- 狀態變更 → in_progress：由 ai-engineer 執行，建立 prompt-budget.ts + prompt-templates.ts
- 狀態變更 → in_review：三級 Budget + 3 個 prompt 模板完成
- 狀態變更 → done：L1 Review 通過
