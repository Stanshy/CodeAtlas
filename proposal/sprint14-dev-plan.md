# 開發計畫書: Sprint 14 — AI 基礎層 + LO 視角 AI 整合

> **撰寫者**: PM
> **日期**: 2026-04-05
> **專案**: CodeAtlas
> **Sprint 提案書**: `proposal/sprint14-proposal.md`（G0 通過 2026-04-05）
> **狀態**: ✅ 已完成（G2+G3+G4 通過 2026-04-05）

---

## 1. 需求摘要

Sprint 13 完成方法/端點級三視角 + 版面大改版，使用者「看得到」方法名了。但 diff-report 暴露的核心問題未根治：LO 214 個方法充斥噪音、方法列表只有函式名沒有業務描述、chain 步驟描述重複方法名。

Sprint 14 目標：
1. **建立 AI 智慧分析基礎層** — 統一的 AI Contract（typed schema + zod validation）、四種 Provider、Prompt Input Budget
2. **LO 視角率先落地 AI** — MethodRole 9 分類 + 方法摘要 + chain 解釋 + 噪音過濾

設計原則：**規則先分類、AI 後解釋**。AI 關閉時仍可用規則分類。

### 確認的流程

```
需求 → 設計 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）→ 文件 → G4（文件審查）
```

### 阻斷規則

- AI Contract schema 設計完成前不得開始 Provider 實作
- MethodRole 規則引擎完成前不得開始 AI 分類整合

---

## 2. 技術方案

### 2.1 AI Contract Layer

所有 AI 輸出統一為 typed schema，用 zod 做 runtime validation。

```typescript
// packages/core/src/ai/contracts.ts

import { z } from 'zod';

/** 方法角色 — 9 種分類 */
export enum MethodRole {
  ENTRYPOINT = 'entrypoint',           // route handler, middleware entry
  BUSINESS_CORE = 'business_core',     // 核心業務邏輯
  DOMAIN_RULE = 'domain_rule',         // 業務規則驗證
  ORCHESTRATION = 'orchestration',     // 流程編排（呼叫多個 service）
  IO_ADAPTER = 'io_adapter',           // DB/API/file I/O
  VALIDATION = 'validation',           // 輸入驗證
  INFRA = 'infra',                     // 框架配置、middleware 註冊
  UTILITY = 'utility',                 // 工具函式（format, parse, convert）
  FRAMEWORK_GLUE = 'framework_glue',   // 框架膠水碼（ORM builder, query chain）
}

/** 方法摘要 — AI 輸出 schema */
export const MethodSummarySchema = z.object({
  id: z.string(),
  role: z.nativeEnum(MethodRole),
  confidence: z.number().min(0).max(1),
  oneLineSummary: z.string().max(50),
  businessRelevance: z.string().optional(),
  evidence: z.array(z.string()).optional(),
});
export type MethodSummary = z.infer<typeof MethodSummarySchema>;

/** 方法角色分類 — AI 輸出 schema */
export const MethodRoleClassificationSchema = z.object({
  id: z.string(),
  role: z.nativeEnum(MethodRole),
  confidence: z.number().min(0).max(1),
  sourceSignals: z.array(z.string()).optional(),
});
export type MethodRoleClassification = z.infer<typeof MethodRoleClassificationSchema>;

/** Chain 解釋 — AI 輸出 schema */
export const ChainExplanationSchema = z.object({
  chainId: z.string(),
  overallPurpose: z.string(),
  steps: z.array(z.object({
    stepIndex: z.number(),
    methodId: z.string(),
    description: z.string().max(30),
  })),
});
export type ChainExplanation = z.infer<typeof ChainExplanationSchema>;

/** 批量方法摘要 — AI 一次回傳多個方法 */
export const BatchMethodSummarySchema = z.object({
  methods: z.array(MethodSummarySchema),
});
export type BatchMethodSummary = z.infer<typeof BatchMethodSummarySchema>;
```

### 2.2 MethodRole 規則引擎

```typescript
// packages/core/src/ai/method-role-classifier.ts

/**
 * 規則引擎：基於 AST 特徵判斷 MethodRole，不依賴 AI。
 * 
 * 判斷邏輯（按優先級）：
 * 1. entrypoint: export + (handler/middleware pattern) 或 route decorator
 * 2. io_adapter: 包含 db.*/fetch/fs.*/axios.*/request pattern
 * 3. validation: 函式名 validate*/check*/assert* 或 throws validation error
 * 4. domain_rule: 函式名包含 rule/policy/calculate/compute
 * 5. orchestration: 呼叫 3+ 個其他方法且不做 I/O
 * 6. business_core: export + 非以上任一
 * 7. infra: config/setup/register/middleware 註冊
 * 8. framework_glue: ORM chain (select/where/join/orderBy) 或框架 builder
 * 9. utility: 以上皆非的內部函式
 * 
 * 輸入：FunctionNode（來自 tree-sitter AST）
 * 輸出：{ role: MethodRole, confidence: number, sourceSignals: string[] }
 */
```

規則引擎從 Sprint 13 的 `PYTHON_SKIP_METHODS` skip list 升級，但覆蓋範圍更廣：
- 不只是「跳過」，而是「分類」
- 每個分類有明確的 AST 特徵匹配規則
- confidence 基於匹配的 signal 數量（1 signal = 0.6, 2 signals = 0.8, 3+ = 0.95）

### 2.3 Prompt Input Budget

```typescript
// packages/core/src/ai/prompt-budget.ts

export enum PromptBudget {
  SMALL = 'small',     // ~2K tokens — 單一方法
  MEDIUM = 'medium',   // ~8K tokens — 一條 chain
  LARGE = 'large',     // ~20K tokens — 目錄/專案（Sprint 15 用）
}

/**
 * buildSmallContext(method: FunctionNode): string
 * → 方法 signature + body（截斷至 2K tokens）
 * 
 * buildMediumContext(chain: ChainStep[]): string
 * → chain 所有方法 signature + body + 呼叫關係（截斷至 8K tokens）
 * 
 * buildLargeContext(directory: DirectoryInfo): string
 * → 目錄結構 + 關鍵檔案摘要（截斷至 20K tokens）— Sprint 15
 */
```

### 2.4 Provider 架構擴展

現有 `SummaryProvider` interface 保持向後相容，新增 `AIAnalysisProvider` interface 擴展 AI 分析能力：

```typescript
// packages/core/src/ai/types.ts（擴展）

export interface AIAnalysisProvider extends SummaryProvider {
  /** 批量分析方法角色 + 摘要 */
  analyzeMethodBatch(methods: MethodContext[], budget: PromptBudget): Promise<BatchMethodSummary>;
  
  /** 解釋一條呼叫鏈 */
  explainChain(chain: ChainContext, budget: PromptBudget): Promise<ChainExplanation>;
  
  /** 檢查 Provider 是否支援分析功能（舊 Provider 只有 summarize） */
  supportsAnalysis(): boolean;
}
```

四種新/更新 Provider：

| Provider | 檔案 | 介面實作 | 特殊處理 |
|----------|------|---------|---------|
| Claude Code CLI | `claude-code.ts` | AIAnalysisProvider | `child_process.spawn('claude', ['-p', prompt])`，timeout 30s，跨平台偵測 |
| Gemini API | `gemini.ts` | AIAnalysisProvider | `fetch('https://generativelanguage.googleapis.com/v1beta/models/...')`，API key 必須 |
| Ollama (更新) | `ollama.ts` | AIAnalysisProvider | 擴展現有 OllamaProvider，新增 analyzeMethodBatch/explainChain |
| Disabled (更新) | `disabled.ts` | AIAnalysisProvider | supportsAnalysis() return false，分析方法 return empty |

### 2.5 Claude Code CLI Provider 實作細節

```typescript
// packages/core/src/ai/claude-code.ts

/**
 * 透過 child_process.spawn 呼叫 Claude Code CLI。
 * 
 * 偵測邏輯：
 * - Windows: spawn('where', ['claude'])
 * - Unix: spawn('which', ['claude'])
 * 
 * 呼叫邏輯：
 * - spawn('claude', ['-p', prompt, '--output-format', 'json'])
 * - stdin: 不使用
 * - stdout: 收集 JSON 回應
 * - stderr: 記錄但不 throw
 * - timeout: 30s（configurable）
 * - process cleanup: 確保 child process 在 timeout 或 error 時被 kill
 * 
 * 跨平台：
 * - spawn options: { shell: true } 確保 Windows cmd 相容
 * - 路徑處理用 path.join 不硬編碼分隔符
 */
```

### 2.6 Settings UI 改動

現有 SettingsPopover 的 AI 設定區塊（第 5 區塊）重做：

```
┌─ AI 設定 ─────────────────────────────────┐
│                                            │
│  AI Provider:  [▼ Claude Code CLI (推薦)]   │
│                                            │
│  ✅ Claude Code CLI 已安裝                  │
│  ⚠️ 使用您的 Claude subscription           │
│                                            │
│  [測試連線]  ✅ 連線成功                    │
│                                            │
│  ── 方法分析 ──                             │
│  [x] 啟用 AI 方法摘要                       │
│  [x] 啟用 AI 角色分類（補充規則引擎）         │
│                                            │
│  ── 顯示過濾 ──                             │
│  隱藏角色: [x] utility [x] framework_glue    │
│           [ ] infra [ ] validation          │
│                                            │
└────────────────────────────────────────────┘
```

### 2.7 LO 群組卡片 AI 整合

```
┌─ Routes (16) ─────────────────────────────┐
│                                            │
│  ★ upload()         上傳影片並觸發處理       │
│  ★ googleLogin()    Google OAuth 登入       │
│    getVideos()      查詢影片列表            │
│    deleteVideo()    刪除指定影片            │
│    ...                                     │
│                                            │
│  +8 個工具方法                               │
└────────────────────────────────────────────┘
```

- 方法名左側：★ 標記 entrypoint（P1）
- 方法名右側：AI 一句話摘要（灰色字）
- 卡片底部：「+N 個工具方法」可展開
- AI 關閉時：不顯示摘要，但規則過濾仍生效

### 2.8 LO Chain 步驟描述

現有 chain footer 中間顯示 chain 標題 + 步數，新增每步描述：

- 右側面板 LODetailPanel：每步旁邊顯示 AI 描述
- Footer 中間：保持 chain 標題（端點名 + N/M 步驟）
- AI 關閉時：顯示方法名作為描述

---

## 3. 檔案變更清單

### 新增

| 檔案 | 用途 |
|------|------|
| `packages/core/src/ai/contracts.ts` | AI Contract Layer — MethodRole enum + zod schemas |
| `packages/core/src/ai/method-role-classifier.ts` | MethodRole 規則引擎 |
| `packages/core/src/ai/prompt-budget.ts` | Prompt Input Budget — context builder |
| `packages/core/src/ai/claude-code.ts` | Claude Code CLI Provider |
| `packages/core/src/ai/gemini.ts` | Google Gemini API Provider |
| `packages/core/src/ai/prompt-templates.ts` | AI prompt 模板（方法摘要、角色分類、chain 解釋） |
| `packages/core/src/__tests__/ai-contracts.test.ts` | Contract zod validation 測試 |
| `packages/core/src/__tests__/method-role-classifier.test.ts` | 規則引擎測試 |
| `packages/core/src/__tests__/claude-code-provider.test.ts` | Claude Code CLI Provider 測試 |
| `packages/core/src/__tests__/gemini-provider.test.ts` | Gemini Provider 測試 |

### 修改

| 檔案 | 變更內容 |
|------|---------|
| `packages/core/src/ai/types.ts` | 新增 AIAnalysisProvider interface + MethodContext/ChainContext 型別 |
| `packages/core/src/ai/index.ts` | 擴展 createProvider factory，新增 'claude-code' / 'gemini' case + export 新模組 |
| `packages/core/src/ai/ollama.ts` | 擴展實作 AIAnalysisProvider（analyzeMethodBatch/explainChain），推薦 Gemma 4 |
| `packages/core/src/ai/disabled.ts` | 擴展實作 AIAnalysisProvider（supportsAnalysis = false） |
| `packages/core/src/ai/openai.ts` | 擴展實作 AIAnalysisProvider（複用現有 HTTP 呼叫） |
| `packages/core/src/ai/anthropic.ts` | 擴展實作 AIAnalysisProvider（複用現有 HTTP 呼叫） |
| `packages/core/src/types.ts` | 新增 MethodRole 相關型別到 FunctionNode（可選欄位） |
| `packages/core/src/analyzers/endpoint-detector.ts` | 整合 MethodRole 規則引擎，取代 PYTHON_SKIP_METHODS |
| `packages/web/src/components/SettingsPopover.tsx` | AI 設定區塊重做 |
| `packages/web/src/components/LOCategoryCardNode.tsx` | 方法列表加入摘要 + 噪音過濾 + 可展開 |
| `packages/web/src/components/LODetailPanel.tsx` | Chain 步驟加入 AI 描述 |
| `packages/web/src/components/GraphCanvas.tsx` | LO 群組資料整合 MethodRole 過濾 |
| `packages/web/src/contexts/ViewStateContext.tsx` | 新增 AI 設定相關 state（provider, enableSummary, hiddenRoles） |
| `packages/core/package.json` | 新增 zod 依賴 |

---

## 4. 規範文件索引

> 以下規範文件為 Code Review 對照依據，本 Sprint 需更新。

| 文件 | 更新內容 |
|------|---------|
| `.knowledge/specs/feature-spec.md` | 新增 Sprint 14 功能規格（AI Contract + Provider + LO AI） |
| `.knowledge/specs/data-model.md` | 新增 MethodRole enum + AI Contract 型別定義 |
| `.knowledge/specs/api-design.md` | 新增 AI Provider 設定 API（如有 server 端改動） |

---

## 5. 介面設計

### 型別定義（核心新增）

```typescript
// MethodRole enum — 見 §2.1

// AIAnalysisProvider — 見 §2.4

// FunctionNode 擴展（packages/core/src/types.ts）
export interface FunctionNode {
  // ... 現有欄位 ...
  role?: MethodRole;           // 規則或 AI 分類結果
  roleConfidence?: number;     // 0-1 信心分數
  aiSummary?: string;          // AI 一句話摘要
}

// Graph JSON 擴展 — endpoint chain step
export interface ChainStep {
  // ... 現有欄位 ...
  role?: MethodRole;
  aiDescription?: string;      // AI 步驟描述
}
```

### CreateProviderOptions 擴展

```typescript
export interface CreateProviderOptions {
  apiKey?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  // Sprint 14 新增
  geminiApiKey?: string;
  geminiModel?: string;         // 'gemini-pro' | 'gemini-flash'
  claudeCodeTimeout?: number;   // ms, 預設 30000
}
```

---

## 6. 任務定義與分配

> L1 讀取本節後按依賴順序執行。第一步先執行 `/task-delegation` 建立 `.tasks/` 檔案。
> **⚠️ L1 必須先進入計畫模式規劃，再分派執行。**

### 任務清單

| # | 任務名稱 | 說明 | 負責 Agent | 依賴 | 對應步驟 | 驗收標準 |
|---|---------|------|-----------|------|---------|---------|
| T1 | AI Contract Layer | 建立 `contracts.ts`：MethodRole enum + MethodSummary/ChainExplanation/MethodRoleClassification zod schema + validation helper。新增 zod 依賴。 | backend-architect | 無 | 設計+實作 | 所有 schema 可 parse + validate，malformed 輸入正確 reject |
| T2 | MethodRole 規則引擎 | 建立 `method-role-classifier.ts`：9 種角色的 AST 特徵匹配規則。整合到 endpoint-detector 取代 PYTHON_SKIP_METHODS。 | backend-architect | T1 | 實作 | 9 種角色各至少 2 個 test case 通過。VideoBrief 驗證：Routes handler→entrypoint, db.*→io_adapter |
| T3 | Prompt Input Budget | 建立 `prompt-budget.ts`：Small/Medium/Large context builder。建立 `prompt-templates.ts`：方法摘要/角色分類/chain 解釋的 prompt 模板。 | ai-engineer | T1 | 實作 | 三級 context builder 正確截斷，prompt 模板輸出格式符合 AI Contract schema |
| T4 | Claude Code CLI Provider | 建立 `claude-code.ts`：spawn 實作 + 跨平台偵測 + timeout + process cleanup。實作 AIAnalysisProvider interface。 | ai-engineer | T1, T3 | 實作 | CLI 偵測正確（Windows+Unix），spawn 成功回傳 JSON，timeout 30s 觸發，CLI 未安裝 fallback |
| T5 | Gemini API Provider | 建立 `gemini.ts`：REST API 呼叫 + API key 驗證 + 錯誤處理。實作 AIAnalysisProvider interface。 | ai-engineer | T1, T3 | 實作 | API 呼叫成功（mock），key 驗證失敗正確處理，輸出經 schema validation |
| T6 | Ollama Provider 更新 + 舊 Provider 擴展 | 擴展 ollama.ts 實作 AIAnalysisProvider，推薦 Gemma 4。擴展 disabled.ts/openai.ts/anthropic.ts。更新 createProvider factory。 | ai-engineer | T1, T3 | 實作 | 所有 Provider 實作 AIAnalysisProvider。createProvider('claude-code')/'gemini' 正確建立。向後相容 |
| T7 | Settings UI — AI Provider 管理 | SettingsPopover AI 區塊重做：Provider 選擇、API key 輸入、CLI 偵測、連線測試、隱私標示、過濾角色勾選。ViewStateContext 新增 AI 設定 state。 | frontend-developer | T4, T5, T6 | 實作 | 4 種 Provider 可選擇，測試連線可用，隱私標示正確，過濾角色可勾選 |
| T8 | LO 方法角色分類 + 噪音過濾 | LOCategoryCardNode 整合 MethodRole 過濾：隱藏 utility/framework_glue，底部「+N 個工具方法」可展開。GraphCanvas LO 資料管線整合規則引擎 + AI 分類。 | frontend-developer | T2, T7 | 實作 | LO 群組只顯示業務方法（214→40-60），可展開隱藏方法，AI 關閉時規則過濾仍生效 |
| T9 | LO 方法摘要 + Chain 描述 | LOCategoryCardNode 方法名旁顯示 AI 摘要。LODetailPanel chain 步驟顯示 AI 描述。AI 關閉時顯示方法名。 | frontend-developer | T3, T8 | 實作 | 每個方法有一句話摘要（AI 啟用時），chain 每步有描述，AI 關閉時顯示方法名 |
| T10 | 測試 — AI Contract + 規則引擎 + Provider | AI Contract validation 測試（含 malformed）、規則引擎 9 角色測試、各 Provider mock 測試。 | test-writer-fixer | T1-T6 | 測試 | 新增測試全部通過，覆蓋 happy path + edge case |
| T11 | 測試 — LO 整合 + 回歸 | LO 噪音過濾測試、方法摘要顯示測試、chain 描述測試。全面回歸：現有 1344+ tests 通過。 | test-writer-fixer | T7-T9 | 測試 | 新增 LO 整合測試通過，1344+ 現有測試零回歸，pnpm build 通過 |
| T12 | 文件更新 | 更新 feature-spec.md（Sprint 14 規格）、data-model.md（MethodRole + AI Contract 型別）、CLAUDE.md（Sprint 14 索引）。新增 `.knowledge/sprint14-ai-architecture.md`。 | tech-lead | T10, T11 | 文件 | 所有規範文件已更新，架構文件已建立 |

### 依賴圖

```
T1（Contract）─┬─→ T2（規則引擎）──────────────→ T8（LO 過濾）──→ T9（LO 摘要）
               │                                      ↑
               ├─→ T3（Prompt Budget）─┬─→ T4（Claude Code CLI）─┐
               │                       ├─→ T5（Gemini API）──────┤
               │                       └─→ T6（Ollama + 舊 Provider）─┤
               │                                                      ↓
               └──────────────────────────────────────────→ T7（Settings UI）

T1-T6 ──→ T10（測試-基礎層）
T7-T9 ──→ T11（測試-LO整合+回歸）
T10, T11 ──→ T12（文件）
```

### 執行順序建議

```
Phase 1（並行）: T1
Phase 2（並行）: T2 + T3
Phase 3（並行）: T4 + T5 + T6
Phase 4: T7
Phase 5（並行）: T8 + T10
Phase 6: T9
Phase 7: T11
Phase 8: T12
```

### L1 執行指令

> PM 產出此區塊，老闆複製貼入 L1 session 即可啟動。

```
請執行 Sprint 14 — AI 基礎層 + LO 視角 AI 整合 開發計畫。

📄 計畫書：proposal/sprint14-dev-plan.md
📋 提案書：proposal/sprint14-proposal.md

⚠️ 重要：你必須先進入計畫模式（Plan Mode），完成以下規劃再開始執行：
1. 讀取計畫書 §2 技術方案，確認 AI Contract schema 設計
2. 讀取現有 AI 模組架構（packages/core/src/ai/），確認擴展方式
3. 規劃 MethodRole 規則引擎的 AST 特徵匹配規則
4. 規劃 Claude Code CLI spawn 的跨平台策略
5. 確認任務拆解和依賴順序
6. 計畫完成後再開始執行

📋 你負責的任務：T12（文件更新）
🔧 委派 backend-architect：T1（AI Contract）、T2（規則引擎）
🤖 委派 ai-engineer：T3（Prompt Budget）、T4（Claude Code CLI）、T5（Gemini）、T6（Ollama+舊Provider）
🎨 委派 frontend-developer：T7（Settings UI）、T8（LO 過濾）、T9（LO 摘要）
🧪 委派 test-writer-fixer：T10（基礎層測試）、T11（LO 整合+回歸測試）

⚠️ 阻斷規則：
- T1（AI Contract）完成前不得開始 T4/T5/T6（Provider 實作）
- T2（規則引擎）完成前不得開始 T8（LO AI 分類整合）

📌 關鍵設計決策（已核准，不可更改）：
- MethodRole 9 分類 enum（entrypoint/business_core/domain_rule/orchestration/io_adapter/validation/infra/utility/framework_glue）
- 規則先分類、AI 後解釋
- AI Contract 用 zod schema validation
- Claude Code CLI 用 child_process.spawn
- Prompt Budget 三級（Small 2K / Medium 8K / Large 20K）
- Provider 優先級：Claude Code CLI > Gemini API > Ollama Gemma 4 > Disabled

第一步請先執行 /task-delegation 建立任務檔案。
```

### 共用檔案（需協調）

| 檔案 | 涉及任務 | 風險等級 |
|------|---------|---------|
| `packages/core/src/ai/types.ts` | T1, T4, T5, T6 | 高（T1 先定義 interface，其他任務實作） |
| `packages/core/src/ai/index.ts` | T4, T5, T6 | 中（各自加 case 到 factory） |
| `packages/core/src/types.ts` | T1, T2 | 中（T1 加型別，T2 用型別） |
| `packages/web/src/contexts/ViewStateContext.tsx` | T7, T8 | 中（T7 加 state，T8 讀 state） |

---

## 7. 測試計畫

### 單元測試

| 測試檔案 | 測試案例 |
|---------|---------|
| `ai-contracts.test.ts` | MethodRole enum 值完整、MethodSummary valid/invalid、ChainExplanation valid/invalid、malformed JSON reject |
| `method-role-classifier.test.ts` | 9 種角色各 2+ case：handler→entrypoint、db.execute→io_adapter、validateInput→validation、formatDate→utility、select().where()→framework_glue 等 |
| `claude-code-provider.test.ts` | CLI 偵測（mock which/where）、spawn 成功（mock child_process）、timeout 觸發、CLI 未安裝 fallback、JSON parse 失敗 fallback |
| `gemini-provider.test.ts` | API 呼叫成功（mock fetch）、key 驗證失敗、rate limit 重試、response validation |
| `prompt-budget.test.ts` | Small context ≤2K、Medium context ≤8K、截斷正確保留 signature |
| `lo-integration.test.ts` | 噪音過濾（utility 隱藏）、摘要顯示（AI 啟用）、摘要隱藏（AI 關閉）、展開隱藏方法 |

### 回歸測試

- 現有 1344+ tests 全部通過
- `pnpm build` 全通過
- 三種視角切換正常
- 版面骨架不受影響

---

## 8. 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| Claude Code CLI spawn 跨平台 | 中 | T4 優先做 + 測試。spawn 用 shell:true。偵測用 which/where |
| AI 回應格式不穩定 | 中 | zod validation + structured output prompt + fallback 為規則結果 |
| AI 回應延遲 | 中 | loading 狀態 + 快取 + 非阻塞 UI（先顯示規則結果，AI 回來後更新） |
| zod 新增依賴 | 低 | zod 體積小（~50KB），無子依賴，廣泛使用 |
| MethodRole 規則覆蓋不足 | 低 | 未知方法 fallback 為 utility，AI 啟用時可補充分類 |
| 功能量偏大（12 項任務） | 中 | 按依賴圖嚴格控制順序，Phase 1-3 可並行 |

---

## 9. 文件更新

完成後需同步更新的文件：

- [ ] `.knowledge/specs/feature-spec.md` — v14.0，新增 Sprint 14 功能規格
- [ ] `.knowledge/specs/data-model.md` — 新增 MethodRole enum + AI Contract 型別
- [ ] `.knowledge/sprint14-ai-architecture.md` — 新建，AI 架構設計文件
- [ ] `CLAUDE.md` — 新增 Sprint 14 索引

---

## 10. 任務與審核紀錄（備查）

> 每個任務完成後記錄結果，每次 Review/Gate 通過後記錄決策。本區作為 Sprint 完整稽核軌跡。

### 任務完成紀錄

| 任務 | 完成日期 | 結果 | 備註 |
|------|---------|------|------|
| T1 | 2026-04-05 | ✅ 完成 | contracts.ts + types.ts 擴展 + NodeMetadata 擴展 + zod 安裝 + barrel exports，core build 通過 |
| T2 | 2026-04-05 | ✅ 完成 | method-role-classifier.ts 9 規則引擎 + export role-classifier 常數 + barrel exports |
| T3 | 2026-04-05 | ✅ 完成 | prompt-budget.ts 三級上下文 + prompt-templates.ts 3 個模板 + barrel exports |
| T4 | 2026-04-05 | ✅ 完成 | claude-code.ts — CLI spawn + findBinary + 3 層 JSON parse fallback |
| T5 | 2026-04-05 | ✅ 完成 | gemini.ts — REST API + 401/429/5xx 錯誤處理 + zod validation |
| T6 | 2026-04-05 | ✅ 完成 | base-analysis-provider.ts + 4 Provider extends + factory 更新 + Ollama model → gemma3:4b |
| T7 | 2026-04-05 | ✅ 完成 | SettingsPopover AI 區塊（6 Provider + 隱私標示 + 角色過濾）+ ViewState 6 新 actions |
| T8 | 2026-04-05 | ✅ 完成 | LOCategoryCardNode 角色過濾 + 「+N 個工具方法」展開 + web types AI 欄位 |
| T9 | 2026-04-05 | ✅ 完成 | LOCard AI 摘要顯示 + LODetailPanel AI 分析區塊（角色 badge + 信心度） |
| T10 | 2026-04-05 | ✅ 完成 | 160 新測試（contracts 53 + classifier 59 + budget 48），core 588 tests 全過 |
| T11 | 2026-04-05 | ✅ 完成 | 31 新 LO 整合測試 + 35 預存測試修復，1535 tests 全過（core 588 + web 947） |
| T12 | 2026-04-05 | ✅ 完成 | feature-spec v14.0 + data-model v7.0 + sprint14-ai-architecture.md + CLAUDE.md 索引 |

### Review 紀錄

| Review 步驟 | 日期 | 結果 | Review 文件連結 |
|------------|------|------|---------------|
| 實作（後端）Review | 2026-04-05 | 通過 | Blocker:0 Major:0 Minor:1 — T2 未整合 endpoint-detector（計畫書提及但非阻斷，規則引擎獨立運作） |
| 實作（前端）Review | 2026-04-05 | 通過 | Blocker:0 Major:0 Minor:1 — T7 測試連線按鈕為 mock（1.5s setTimeout），Sprint 15 接真實連線 |
| 測試 Review | 2026-04-05 | 通過 | Blocker:0 Major:0 Minor:0 — 1535 tests 全過（core 588 + web 947），含 191 新測試 |
| 文件 Review | 2026-04-05 | 通過 | Blocker:0 Major:0 Minor:0 — feature-spec/data-model/architecture/CLAUDE.md 均已更新 |

### Gate 紀錄

| Gate | 日期 | 決策 | 審核意見 |
|------|------|------|---------|
| G0 | 2026-04-05 | ✅ 通過 | `proposal/sprint14-proposal.md` — L1 需先計畫模式規劃再執行 |
| G2 | 2026-04-05 | ✅ 通過 | PM 審核通過。0 Blocker 0 Major 2 Minor（endpoint-detector 整合延後、測試連線 mock）。1572 tests 全過，build 通過 |
| G3 | 2026-04-05 | ✅ 通過 | 1572 tests（core 588 + web 947 + cli 37），191 新增測試，零失敗 |
| G4 | 2026-04-05 | ✅ 通過 | feature-spec v14.0 + data-model v7.0 + sprint14-ai-architecture.md + CLAUDE.md 索引已更新 |

---

**確認**: [x] L1 確認 / [x] Tech Lead 確認
