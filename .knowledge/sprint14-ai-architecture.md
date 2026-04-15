# Sprint 14 — AI 智慧分析架構設計

> 版本: v1.0 | 最後更新: 2026-04-05

## 設計原則

**規則先分類、AI 後解釋** — 規則引擎（零延遲、零成本）先對方法做 9 角色分類，AI Provider 在啟用時提供摘要和更精確的分類。AI 關閉時規則結果仍然生效。

## 架構層次

```
┌─────────────────────────────────────────────────┐
│                    Web UI                        │
│  SettingsPopover (Provider 選擇 + 過濾設定)       │
│  LOCategoryCardNode (角色過濾 + AI 摘要)          │
│  LODetailPanel (AI 分析區塊)                      │
└──────────────────┬──────────────────────────────┘
                   │ ViewStateContext
                   │ (aiProvider, hiddenMethodRoles, etc.)
┌──────────────────┴──────────────────────────────┐
│                  Core AI Module                   │
│                                                   │
│  contracts.ts    ← Zod typed schema (所有 AI 輸出) │
│  types.ts        ← AIAnalysisProvider interface   │
│  method-role-classifier.ts ← 9-rule engine        │
│  prompt-budget.ts  ← Token 預算控制               │
│  prompt-templates.ts ← 結構化 prompt              │
│  base-analysis-provider.ts ← 抽象基底             │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │              AI Providers                    │ │
│  │  claude-code.ts  (CLI spawn)                │ │
│  │  gemini.ts       (REST API)                 │ │
│  │  ollama.ts       (local REST)               │ │
│  │  openai.ts       (REST API)                 │ │
│  │  anthropic.ts    (REST API)                 │ │
│  │  disabled.ts     (no-op)                    │ │
│  └─────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

## 核心模組說明

### 1. AI Contract Layer (`contracts.ts`)

用 zod 定義所有 AI 輸出的型別 schema，確保 runtime 驗證。

- **MethodRoleEnum**: 9 種角色分類
- **MethodSummarySchema**: 方法摘要（id, role, confidence, oneLineSummary）
- **ChainExplanationSchema**: 呼叫鏈解釋（chainId, overallPurpose, steps[]）
- **BatchMethodSummarySchema**: 批次方法摘要
- 6 個 validation helper（3 strict + 3 safe）

### 2. MethodRole 規則引擎 (`method-role-classifier.ts`)

9 條有序規則（first match wins），純函式，不依賴 AI：

| # | 規則 | 角色 | 信號來源 |
|---|------|------|---------|
| 1 | routes/controllers + exported/req-res params | entrypoint | path + params |
| 2 | io-prefix name 或 models/db dir | io_adapter | name + path |
| 3 | validate/check/assert prefix | validation | name pattern |
| 4 | calculate/compute prefix + boolean/number return | domain_rule | name + return |
| 5 | callOutDegree >= 3 + async + services dir | orchestration | degree + path |
| 6 | exported + services/features dir | business_core | export + path |
| 7 | config/infra dir 或 configure/register prefix | infra | path + name |
| 8 | ORM/builder pattern in code | framework_glue | code pattern |
| 9 | 其他 | utility | default |

Confidence: 1 signal → 0.6, 2 → 0.8, 3+ → 0.95

### 3. Prompt Budget (`prompt-budget.ts`)

Token 預算三級控制：

| 層級 | Token 上限 | 用途 |
|------|-----------|------|
| Small | 2,000 | 單一方法 signature + body |
| Medium | 8,000 | 呼叫鏈所有方法 + 關係 |
| Large | 20,000 | 目錄結構 + 關鍵檔案（Sprint 15） |

策略：先放全部 signature，再用剩餘空間填 code snippet（短優先）。

### 4. BaseAnalysisProvider (`base-analysis-provider.ts`)

抽象基底類別，提供 `analyzeMethodBatch()` 和 `explainChain()` 的預設實作（透過 `summarize()` 包裝）。舊 Provider 只需 extends 即可升級。

### 5. Provider 架構

```
SummaryProvider (Sprint 3 原始介面)
    │
AIAnalysisProvider (Sprint 14 擴展)
    │
BaseAnalysisProvider (抽象基底)
    ├── OpenAIProvider
    ├── AnthropicProvider
    ├── OllamaProvider (預設改為 gemma3:4b)
    └── DisabledProvider (supportsAnalysis=false)

直接實作 AIAnalysisProvider:
    ├── ClaudeCodeProvider (CLI spawn)
    └── GeminiProvider (REST API)
```

`isAnalysisProvider()` type guard 保持 `createProvider()` 回傳型別不變（SummaryProvider），消費端用 type guard 安全取得分析功能。

## ViewState AI 設定

```typescript
// Sprint 14 新增欄位
aiProvider: string;                    // 'claude-code' | 'gemini' | 'ollama' | 'openai' | 'anthropic' | 'disabled'
aiApiKey: string;                      // 雲端 Provider API key
enableAiSummary: boolean;              // AI 方法摘要開關
enableAiRoleClassification: boolean;   // AI 角色分類開關
hiddenMethodRoles: string[];           // 隱藏的角色（預設: ['utility', 'framework_glue']）
```

## LO 視角整合

1. 規則引擎對每個方法做 9 角色分類 → `methodRole` + `roleConfidence`
2. 依 `hiddenMethodRoles` 過濾：utility + framework_glue 預設隱藏
3. 隱藏方法顯示「+N 個工具方法」可展開（灰色字 + 角色 badge）
4. AI 啟用時方法旁顯示一句話摘要（灰色 9px）
5. LODetailPanel 顯示 AI 分析區塊（摘要 + 角色 badge + 信心度）
6. AI 關閉時：規則過濾仍生效，只是沒有摘要文字

## 檔案清單

| 檔案 | 動作 | 說明 |
|------|------|------|
| `packages/core/src/ai/contracts.ts` | 新建 | Zod typed schemas |
| `packages/core/src/ai/types.ts` | 擴展 | AIAnalysisProvider + MethodContext + ChainContext |
| `packages/core/src/ai/method-role-classifier.ts` | 新建 | 9-rule engine |
| `packages/core/src/ai/prompt-budget.ts` | 新建 | Token budget |
| `packages/core/src/ai/prompt-templates.ts` | 新建 | Prompt templates |
| `packages/core/src/ai/base-analysis-provider.ts` | 新建 | Abstract base |
| `packages/core/src/ai/claude-code.ts` | 新建 | CLI provider |
| `packages/core/src/ai/gemini.ts` | 新建 | Gemini provider |
| `packages/core/src/ai/ollama.ts` | 修改 | extends Base, model → gemma3:4b |
| `packages/core/src/ai/openai.ts` | 修改 | extends Base |
| `packages/core/src/ai/anthropic.ts` | 修改 | extends Base |
| `packages/core/src/ai/disabled.ts` | 修改 | extends Base, supportsAnalysis=false |
| `packages/core/src/ai/index.ts` | 擴展 | 新 exports + factory cases |
| `packages/core/src/types.ts` | 擴展 | NodeMetadata +methodRole/roleConfidence/aiSummary |
| `packages/core/src/analyzer/role-classifier.ts` | 修改 | export 4 dir constants |
| `packages/web/src/contexts/ViewStateContext.tsx` | 擴展 | AI state + actions |
| `packages/web/src/components/SettingsPopover.tsx` | 重做 | AI 區塊完整實作 |
| `packages/web/src/components/LOCategoryCardNode.tsx` | 擴展 | 角色過濾 + AI 摘要 |
| `packages/web/src/components/LODetailPanel.tsx` | 擴展 | AI 分析區塊 |
| `packages/web/src/types/graph.ts` | 擴展 | NodeMetadata AI 欄位 |
