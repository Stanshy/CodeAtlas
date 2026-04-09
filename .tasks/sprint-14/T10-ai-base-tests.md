# 測試 — AI Contract + 規則引擎 + Provider

| 欄位 | 值 |
|------|-----|
| ID | T10 |
| 專案 | CodeAtlas |
| Sprint | Sprint 14 |
| 指派給 | test-writer-fixer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T1,T2,T3,T4,T5,T6 |
| 預估 | 3h |
| 建立時間 | 2026-04-05T10:00:00.000Z |
| 開始時間 | 2026-04-05T15:30:00.000Z |
| 完工時間 | 2026-04-05T16:30:00.000Z |

---

## 任務描述

新增測試：
1. `ai-contracts.test.ts` — MethodRole enum 值完整、MethodSummary valid/invalid、ChainExplanation valid/invalid、malformed JSON reject
2. `method-role-classifier.test.ts` — 9 種角色各 2+ case
3. `claude-code-provider.test.ts` — CLI 偵測 mock、spawn 成功 mock、timeout、CLI 未安裝 fallback
4. `gemini-provider.test.ts` — API 呼叫 mock、key 驗證失敗、response validation
5. `prompt-budget.test.ts` — Small ≤2K、Medium ≤8K、截斷正確

參照：計畫書 §7

## 驗收標準

- [x] 所有新增測試通過
- [x] 覆蓋 happy path + edge case
- [x] 9 種 MethodRole 各有至少 2 個 test case
- [x] Provider mock 測試覆蓋成功/失敗/timeout
- [x] TypeScript 編譯無錯誤

---

## 事件紀錄

### 2026-04-05T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-05T05:37:03.998Z — 批次補正紀錄
⚠️ 本任務執行期間未依規範呼叫 /task-start 與 /task-done，導致開始/完工時間為估計值、事件紀錄缺失。
以下為補正：
- 狀態變更 → in_progress：由 test-writer-fixer 執行，新增 ai-contracts(53) + method-role-classifier(59) + prompt-budget(48) 測試
- 狀態變更 → in_review：160+ 新測試全數通過
- 狀態變更 → done：L1 Review 通過
