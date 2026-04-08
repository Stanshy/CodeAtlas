# AI Contract Layer

| 欄位 | 值 |
|------|-----|
| ID | T1 |
| 專案 | CodeAtlas |
| Sprint | Sprint 14 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 2h |
| 建立時間 | 2026-04-05T10:00:00.000Z |
| 開始時間 | 2026-04-05T12:00:00.000Z |
| 完工時間 | 2026-04-05T12:30:00.000Z |

---

## 任務描述

建立 `packages/core/src/ai/contracts.ts`：

1. MethodRole enum（9 種分類：entrypoint/business_core/domain_rule/orchestration/io_adapter/validation/infra/utility/framework_glue）
2. MethodSummarySchema（zod）— id, role, confidence, oneLineSummary, businessRelevance, evidence
3. MethodRoleClassificationSchema（zod）— id, role, confidence, sourceSignals
4. ChainExplanationSchema（zod）— chainId, overallPurpose, steps[{stepIndex, methodId, description}]
5. BatchMethodSummarySchema（zod）— methods[]
6. Validation helper 函式
7. 新增 zod 到 core package.json 依賴
8. 擴展 `packages/core/src/ai/types.ts`：新增 AIAnalysisProvider interface + MethodContext/ChainContext 型別

參照：計畫書 §2.1 + §2.4 + §5

## 驗收標準

- [x] MethodRole enum 包含 9 種分類
- [x] 所有 zod schema 可 parse valid 輸入
- [x] malformed 輸入正確 reject（返回 ZodError）
- [x] AIAnalysisProvider interface 定義完整（analyzeMethodBatch, explainChain, supportsAnalysis）
- [x] zod 已加入 core/package.json dependencies
- [x] TypeScript 編譯無錯誤

---

## 事件紀錄

### 2026-04-05T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-05T05:37:03.998Z — 批次補正紀錄
⚠️ 本任務執行期間未依規範呼叫 /task-start 與 /task-done，導致開始/完工時間為估計值、事件紀錄缺失。
以下為補正：
- 狀態變更 → in_progress：由 backend-architect 執行，建立 contracts.ts + 擴展 types.ts
- 狀態變更 → in_review：AI Contract Layer 完成，zod schema + AIAnalysisProvider interface 就緒
- 狀態變更 → done：L1 Review 通過
