# 開發計畫書: Sprint 6 — Ollama + 隱私強化

> **撰寫者**: Tech Lead（L1）
> **日期**: 2026-03-31
> **專案**: CodeAtlas
> **Sprint 提案書**: `proposal/sprint6-proposal.md`
> **狀態**: 待執行

---

> 本文件在 G0 通過後由 L1 撰寫，依據提案書中勾選的步驟展開技術細節。

## 1. 需求摘要

Sprint 5 讓使用者「看到資料怎麼流動」，Sprint 6 兌現 local-first 隱私承諾。核心目標：新增 Ollama 本地 AI（程式碼不出站）、環境變數金鑰管理、.codeatlas.json 設定檔、UI 隱私標示。從「AI 可用」升級到「AI 可信」。

**一句話驗收**：`codeatlas web --ai-provider ollama` → AI 摘要可用 → 程式碼完全不出站 → UI 顯示「✅ 本地模式」。

### 確認的流程

需求 → 設計 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）

> **無 G1**（無新視覺模式，UI 新增為輕量 badge/label）。
> **無額外阻斷規則**（G2 前完成實作即可）。
> **三層都有工作**：core（OllamaProvider）、cli（設定檔 + 環境變數 + 優先級）、web（PrivacyBadge + 模式顯示）。

---

## 2. 技術方案

### 整體架構：三層擴充

```
┌──────────────────────────────────────────────────────────────┐
│ core（AI Provider 層）                                        │
│ ┌─────────────────┐ ┌──────────────────┐ ┌───────────────┐   │
│ │ OpenAIProvider  │ │ AnthropicProvider │ │OllamaProvider │   │
│ │ (Sprint 3 既有)  │ │ (Sprint 3 既有)   │ │ (Sprint 6 新增)│   │
│ └───────┬─────────┘ └────────┬─────────┘ └──────┬────────┘   │
│         │                    │                   │            │
│ ┌───────┴────────────────────┴───────────────────┴─────────┐  │
│ │ SummaryProvider 介面（name, isConfigured, summarize）     │  │
│ └──────────────────────────────────────────────────────────┘  │
│         ▲                    ▲                   ▲            │
│ ┌───────┴────────────────────┴───────────────────┴─────────┐  │
│ │ createProvider() 工廠 — 新增 'ollama' case               │  │
│ └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
         │
┌────────┴─────────────────────────────────────────────────────┐
│ cli（設定 + 編排層）                                           │
│ ┌──────────────┐ ┌──────────────────┐ ┌───────────────────┐  │
│ │ 環境變數讀取  │ │ .codeatlas.json │ │ 設定優先級合併     │  │
│ │ CODEATLAS_*   │ │ 讀取 + 驗證      │ │ CLI > json > env  │  │
│ └──────┬───────┘ └───────┬──────────┘ └────────┬──────────┘  │
│        │                 │                      │             │
│ ┌──────┴─────────────────┴──────────────────────┴──────────┐  │
│ │ resolveConfig() — 統一合併 → ServerOptions               │  │
│ └──────────────────────────────────────────────────────────┘  │
│        │                                                      │
│ ┌──────┴──────────────────────────────────────────────────┐   │
│ │ server.ts — GET /api/ai/status 擴充（+mode+privacyLevel）│   │
│ └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
         │
┌────────┴─────────────────────────────────────────────────────┐
│ web（UI 隱私標示層）                                           │
│ ┌──────────────────┐ ┌────────────────────────┐              │
│ │ PrivacyBadge.tsx │ │ AiStatusResponse 擴充  │              │
│ │ 三模式標示        │ │ +mode +privacyLevel    │              │
│ └──────────────────┘ └────────────────────────┘              │
└──────────────────────────────────────────────────────────────┘
```

### OllamaProvider 設計

```typescript
// packages/core/src/ai/ollama.ts
export class OllamaProvider implements SummaryProvider {
  name = 'ollama';
  private baseUrl: string;   // 預設 'http://localhost:11434'
  private model: string;     // 預設 'codellama'

  constructor(options?: { baseUrl?: string; model?: string }) {
    this.baseUrl = options?.baseUrl ?? 'http://localhost:11434';
    this.model = options?.model ?? 'codellama';
  }

  isConfigured(): boolean {
    return true; // Ollama 不需要 API key，只要 daemon 在跑
  }

  async summarize(code: string, context: SummaryContext): Promise<string> {
    // POST http://localhost:11434/api/generate
    // { model, prompt, stream: false }
    // Response: { response: string }
  }
}
```

**Ollama API 格式**：
```
POST http://localhost:11434/api/generate
Content-Type: application/json

{
  "model": "codellama",
  "prompt": "<system+user prompt>",
  "stream": false
}

Response:
{
  "model": "codellama",
  "response": "This module provides..."
}
```

**錯誤處理**：
| 情境 | HTTP 狀態 | 處理方式 |
|------|-----------|---------|
| Ollama 未安裝/未啟動 | ECONNREFUSED | `Ollama is not running. Install: https://ollama.ai/download then run: ollama serve` |
| 模型不存在 | 404 | `Model "${model}" not found. Run: ollama pull ${model}` |
| 連線逾時 | Timeout | `Ollama request timed out (${timeout}s). Check if Ollama is running.` |
| 回應解析失敗 | — | `Failed to parse Ollama response.`（graceful fallback） |

### 設定優先級系統

```
┌─────────────────────────────────────────────────────────┐
│ AI Provider 優先級（高→低）：                              │
│   CLI flag --ai-provider > .codeatlas.json > 環境變數 > disabled │
│                                                         │
│ API Key 優先級（高→低）：                                  │
│   環境變數 > CLI flag --ai-key（環境變數更安全）            │
│                                                         │
│ Port 優先級（高→低）：                                    │
│   CLI flag --port > .codeatlas.json > 3000               │
│                                                         │
│ Ollama Model 優先級（高→低）：                             │
│   CLI flag --ollama-model > .codeatlas.json > 'codellama' │
└─────────────────────────────────────────────────────────┘
```

### .codeatlas.json 格式

```json
{
  "aiProvider": "ollama",
  "ollamaModel": "codellama",
  "port": 3000,
  "ignore": ["dist", "coverage"]
}
```

**驗證規則**：
- `aiProvider`: `'disabled' | 'ollama' | 'openai' | 'anthropic'`，其他值 → 錯誤訊息
- `ollamaModel`: 字串，預設 `'codellama'`
- `port`: 1~65535 整數
- `ignore`: 字串陣列
- **金鑰絕不存入**：若偵測到含 `key` / `secret` / `token` 欄位 → 警告

### 環境變數

| 變數名 | 用途 | 適用 Provider |
|--------|------|--------------|
| `CODEATLAS_AI_KEY` | 通用 AI key | openai / anthropic |
| `OPENAI_API_KEY` | OpenAI 專用 key | openai |
| `ANTHROPIC_API_KEY` | Anthropic 專用 key | anthropic |

**Key 解析優先級**：
1. Provider-specific 環境變數（`OPENAI_API_KEY` / `ANTHROPIC_API_KEY`）
2. 通用環境變數（`CODEATLAS_AI_KEY`）
3. CLI flag `--ai-key`

### API 擴充：GET /api/ai/status

```json
// 現有（Sprint 3）
{ "enabled": true, "provider": "openai" }

// Sprint 6 擴充
{
  "enabled": true,
  "provider": "ollama",
  "mode": "local",
  "privacyLevel": "full",
  "model": "codellama"
}
```

| 欄位 | 型別 | 說明 |
|------|------|------|
| `enabled` | boolean | AI 是否可用（既有） |
| `provider` | string | Provider 名稱（既有） |
| `mode` | string | `'disabled'` / `'local'` / `'cloud'` |
| `privacyLevel` | string | `'none'`(disabled) / `'full'`(ollama) / `'partial'`(cloud) |
| `model` | string \| null | 模型名稱（Ollama 有值，雲端可為 null） |

### PrivacyBadge UI 設計

| AI 模式 | mode | 圖示 + 文字 | 色彩 |
|---------|------|-----------|------|
| 離線 | disabled | `AI 已關閉` | `colors.text.muted` |
| 本地 | local | `✅ 本地模式 — 程式碼不出站` | `colors.primary.DEFAULT`（green 系） |
| 雲端 | cloud | `⚠️ 雲端模式 — 原始碼片段將傳送至 {provider}` | `colors.warning`（amber 系） |

> 放置位置：NodePanel 內 AiSummary 區塊上方。非 modal、非 toast，常駐顯示。

### createProvider 工廠擴充

```typescript
// packages/core/src/ai/index.ts — 修改 createProvider
export function createProvider(
  name: string,
  apiKey?: string,
  options?: { ollamaModel?: string; ollamaBaseUrl?: string },
): SummaryProvider {
  switch (name) {
    case 'openai':
      return new OpenAIProvider(apiKey);
    case 'anthropic':
      return new AnthropicProvider(apiKey);
    case 'ollama':
      return new OllamaProvider({
        model: options?.ollamaModel,
        baseUrl: options?.ollamaBaseUrl,
      });
    default:
      return new DisabledProvider();
  }
}
```

### 新增依賴分析

**零新依賴**。Ollama 通訊使用 Node.js 原生 `fetch`（Node 18+ 內建），HTTP call 即可。

---

## 3. UI 設計

Sprint 6 無 G1。新增 UI 元素為輕量 badge/label：

| 元素 | 說明 | 位置 |
|------|------|------|
| PrivacyBadge | AI 模式 + 隱私狀態標示 | NodePanel → AiSummary 區塊上方 |
| 模型名稱 label | 顯示當前 Ollama 模型名稱 | AiSummary header 旁 |
| 錯誤標記 | Ollama 未安裝/模型不存在的紅色錯誤 | AiSummary 區塊內 |

> 色彩嚴格引用 `theme.ts`，不硬編碼。

---

## 4. 檔案變更清單

### 新增

| 檔案/目錄 | 用途 |
|----------|------|
| `packages/core/src/ai/ollama.ts` | OllamaProvider 實作（HTTP fetch → localhost:11434） |
| `packages/cli/src/config.ts` | .codeatlas.json 讀取 + 驗證 + 環境變數讀取 + 優先級合併 |
| `packages/web/src/components/PrivacyBadge.tsx` | AI 模式 + 隱私狀態顯示元件 |
| `packages/core/__tests__/ollama-provider.test.ts` | OllamaProvider 單元測試 |
| `packages/core/__tests__/config.test.ts` | 設定檔 + 環境變數 + 優先級測試 |
| `packages/web/__tests__/privacy-badge.test.ts` | PrivacyBadge 元件測試 |
| `packages/web/__tests__/integration-s6.test.ts` | Sprint 6 整合測試 |

### 修改

| 檔案 | 變更內容 |
|------|---------|
| `packages/core/src/ai/index.ts` | createProvider 新增 `'ollama'` case + options 參數 |
| `packages/core/src/index.ts` | 匯出 OllamaProvider |
| `packages/cli/src/index.ts` | 新增 `--ollama-model` flag，`--ai-key` 顯示安全警告 |
| `packages/cli/src/commands/web.ts` | 使用 resolveConfig() 合併設定，傳遞 ollamaModel |
| `packages/cli/src/server.ts` | ServerOptions 新增 ollamaModel，GET /api/ai/status 擴充回應 |
| `packages/web/src/types/graph.ts` | AiStatusResponse 擴充 mode + privacyLevel + model |
| `packages/web/src/components/AiSummary.tsx` | 渲染 PrivacyBadge，傳遞 AI 狀態 |
| `packages/web/src/components/NodePanel.tsx` | 傳遞 AI 狀態給 AiSummary（若需要） |

### 不修改

| 檔案 | 原因 |
|------|------|
| `packages/core/src/ai/openai.ts` | 既有 Provider 不動 |
| `packages/core/src/ai/anthropic.ts` | 既有 Provider 不動 |
| `packages/web/src/contexts/ViewStateContext.tsx` | 不涉及 view state 變更 |
| 所有 Sprint 5 新增檔案 | 資料流功能獨立，不受影響 |

---

## 5. 規範文件索引

| 文件 | 層級 | 用途 |
|------|------|------|
| `.knowledge/specs/api-design.md` | 🔴 規範 | API 端點定義（GET /api/ai/status 擴充） |
| `.knowledge/specs/data-model.md` | 🔴 規範 | 資料模型（SummaryProvider 介面） |
| `.knowledge/specs/feature-spec.md` | 🟡 規格 | 功能規格 v6.0（F41~F49） |
| `.knowledge/architecture.md` | 🔵 參考 | 架構參考（AI Provider 層更新） |

---

## 6. 任務拆解

### 任務清單

| ID | 任務 | 負責 Agent | 優先級 | 預估 | 依賴 |
|----|------|-----------|--------|------|------|
| T1 | OllamaProvider 架構設計 + 設定優先級設計 | tech-lead | P0 | 1h | — |
| T2 | OllamaProvider 實作 | backend-architect | P0 | 2h | T1 |
| T3 | config.ts（.codeatlas.json + 環境變數 + 優先級合併） | backend-architect | P0 | 2h | T1 |
| T4 | CLI flag 擴充（--ollama-model + --ai-key 警告 + 環境變數整合） | backend-architect | P0 | 1.5h | T2, T3 |
| T5 | GET /api/ai/status 擴充（+mode+privacyLevel+model） | backend-architect | P0 | 1h | T2, T4 |
| T6 | web 型別擴充 + PrivacyBadge.tsx + AiSummary 整合 | frontend-developer | P0 | 2h | T5 |
| T7 | Ollama 錯誤處理強化（未安裝/模型不存在/逾時/解析失敗） | backend-architect | P0 | 1h | T2 |
| T8 | 金鑰安全（.gitignore 提示 + --ai-key 警告 + 設定檔 key 偵測） | backend-architect | P1 | 0.5h | T3 |
| T9 | 測試 + 回歸 | test-writer-fixer | P0 | 3h | T2~T8 |

### 依賴圖

```
T1（設計）
 ├── T2（OllamaProvider）── T7（錯誤處理強化）
 ├── T3（config.ts）────── T8（金鑰安全）
 │    │
 │    └── T4（CLI flag 擴充）← 也依賴 T2
 │         │
 │         └── T5（API 擴充）
 │              │
 │              └── T6（web PrivacyBadge）
 │
 └── T9（測試）← 依賴 T2~T8 全部
```

### 建議執行順序

| 階段 | 任務 | 條件 |
|------|------|------|
| 設計 | T1（tech-lead 自行完成） | — |
| 實作 組 1（平行） | T2 + T3 | T1 完成後可同時 |
| 實作 組 2（平行） | T7 + T8 | T2/T3 各自完成後 |
| 實作 組 3（依序） | T4 → T5 → T6 | T2+T3 完成後 |
| 測試 | T9 | T2~T8 全部完成 |

### L1 執行指令

> PM 產出此區塊，老闆複製貼入 tech-lead session 即可啟動。

```
請執行 Sprint 6 — Ollama + 隱私強化 的開發計畫。

📄 計畫書：proposal/sprint6-dev-plan.md
📋 確認的流程：需求 → 設計 → 實作 → G2 → 測試 → G3

⚠️ 無 G1 阻斷規則 — 設計（T1）完成後可直接進入實作。
⚠️ 三層都有工作：core（OllamaProvider）、cli（config + CLI flag）、web（PrivacyBadge）。

🖥️ 設計階段：
- tech-lead 自行完成 T1（OllamaProvider 架構 + 設定優先級設計）

🖥️ 實作階段：
- 委派 backend-architect：T2, T3, T4, T5, T7, T8（core + cli 層）
- 委派 frontend-developer：T6（web 層 PrivacyBadge）
- 執行順序：T2 + T3 並行 → T7 + T8 並行 → T4 → T5 → T6

🧪 測試階段：
- 委派 test-writer-fixer：T9（Provider 測試 + 設定測試 + 回歸）

📌 架構重點：
- OllamaProvider 實作 SummaryProvider 介面（name, isConfigured, summarize）
- Ollama API：POST http://localhost:11434/api/generate，stream: false
- createProvider() 新增 'ollama' case，加 options 參數
- 設定優先級：Provider = CLI > json > env > disabled，Key = env > CLI
- .codeatlas.json 不存金鑰（偵測到含 key/secret/token 欄位 → 警告）
- GET /api/ai/status 擴充：+mode +privacyLevel +model
- 零新依賴 — HTTP fetch 即可
- 現有 OpenAI/Anthropic Provider 不動

📌 Sprint 4/5 教訓：
- 所有 JSON.parse 必須包 try-catch
- 任務狀態必須完整流轉：created → in_progress → in_review → done
- 事件紀錄必須有 ISO 8601 timestamp
- pnpm --filter 語法：`pnpm --filter @codeatlas/core run test -- --run`
```

### 共用檔案（需協調）

| 檔案 | 涉及任務 | 風險等級 |
|------|---------|---------|
| `packages/core/src/ai/index.ts` | T2 | 低（新增 case + options 參數） |
| `packages/cli/src/server.ts` | T5 | 中（ServerOptions 擴充 + /api/ai/status 修改） |
| `packages/cli/src/commands/web.ts` | T4 | 中（使用 resolveConfig + 傳遞 options） |
| `packages/cli/src/index.ts` | T4 | 低（新增 --ollama-model flag） |
| `packages/web/src/types/graph.ts` | T6 | 低（AiStatusResponse 新增欄位） |
| `packages/web/src/components/AiSummary.tsx` | T6 | 中（新增 PrivacyBadge 渲染） |

---

## 7. 測試計畫

### 單元測試

| 測試檔案 | 測試案例 |
|---------|---------|
| `ollama-provider.test.ts` | 正常回應解析、Ollama 未啟動（ECONNREFUSED）、模型不存在（404）、連線逾時、空回應、JSON 解析失敗、isConfigured 恆為 true、自訂 model/baseUrl |
| `config.test.ts` | .codeatlas.json 讀取成功、檔案不存在（使用預設）、JSON 格式錯誤、無效 aiProvider 值、環境變數讀取（CODEATLAS_AI_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY）、優先級：CLI > json > env > disabled、Key 優先級：env > CLI、金鑰偵測警告 |
| `privacy-badge.test.ts` | 三模式渲染（disabled / local / cloud）、provider 名稱顯示、model 名稱顯示、null/undefined 安全 |

### 整合測試

| 測試檔案 | 測試案例 |
|---------|---------|
| `integration-s6.test.ts` | createProvider('ollama') 回傳 OllamaProvider、createProvider options 傳遞正確、resolveConfig 優先級驗證（mock env + mock json + mock CLI）、AiStatusResponse 新欄位正確 |

### 回歸測試

- 現有 435+ tests 全部重跑，零失敗
- 現有 OpenAI/Anthropic Provider 不受影響
- 2D/3D 模式所有 Sprint 1~5 功能不受影響
- `pnpm build` 三個 package 全通過

---

## 8. 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| Ollama 未安裝的使用者體驗 | 低 | 友善錯誤提示 + 安裝指引 URL |
| 本地模型回應品質不如雲端 | 低 | UI 顯示模型名稱，使用者自選。不影響功能正確性 |
| 本地模型回應慢（30s+）| 低 | timeout 設定（預設 30 秒）+ 前端 loading 提示（既有） |
| .codeatlas.json 格式錯誤 | 低 | JSON.parse try-catch + 友善錯誤訊息，fallback 使用預設值 |
| 設定優先級混淆 | 低 | CLI help 明確說明優先級順序 |
| createProvider 簽章變更 | 低 | options 為可選參數，既有呼叫方不受影響 |
| 環境變數讀取在 test 時 side effect | 低 | 測試用 vi.stubEnv / process.env mock |

---

## 9. 文件更新

完成後需同步更新的文件：

- [ ] `.knowledge/specs/feature-spec.md` — 更新至 v6.0，新增 F41~F49
- [ ] `.knowledge/specs/api-design.md` — 更新至 v3.0，GET /api/ai/status 擴充、新增 CLI flags
- [ ] `.knowledge/architecture.md` — 更新至 v4.0，新增 OllamaProvider、config.ts
- [ ] `CLAUDE.md` — 更新 Sprint 6 文件索引

---

## 10. 任務與審核紀錄（備查）

> 每個任務完成後記錄結果，每次 Review/Gate 通過後記錄決策。本區作為 Sprint 完整稽核軌跡。

### 任務完成紀錄

| 任務 | 完成日期 | 結果 | 備註 |
|------|---------|------|------|
| T1 | 2026-03-31 | ✅ 完成 | `.knowledge/sprint6-ollama-architecture.md`（9 章節）：OllamaProvider 介面、設定優先級、.codeatlas.json schema、API 擴充、PrivacyBadge 三模式、錯誤處理策略、向下相容性 |
| T2 | 2026-03-31 | ✅ 完成 | OllamaProvider 實作：SummaryProvider 介面、HTTP POST localhost:11434/api/generate、stream:false、30s timeout、isConfigured()=true、getModel()。tsc 通過，217+218 tests 零回歸 |
| T3 | 2026-03-31 | ✅ 完成 | config.ts：readConfigFile + readEnvVars + resolveConfig。優先級正確（Provider CLI>json>env, Key env>CLI），金鑰偵測警告，JSON 格式錯誤友善提示 |
| T4 | 2026-03-31 | ✅ 完成 | CLI flags：--ollama-model、--ai-provider 含 ollama、--ai-key 安全警告。resolveConfig 整合到 web command |
| T5 | 2026-03-31 | ✅ 完成 | GET /api/ai/status 擴充：mode/privacyLevel/model。三模式映射正確（disabled/local/cloud）。createProvider 傳遞 ollamaModel |
| T6 | 2026-03-31 | ✅ 完成 | PrivacyBadge.tsx 三模式（disabled 灰/local 綠/cloud 琥珀）、role="status" + aria-label、AiSummary 整合、model 名稱顯示。218 web tests 零回歸 |
| T7 | 2026-03-31 | ✅ 完成 | 5 種錯誤情境在 T2 ollama.ts 中同步實作：ECONNREFUSED→安裝指引、404→ollama pull、Timeout→30s 檢查、JSON 解析失敗、空回應 |
| T8 | 2026-03-31 | ✅ 完成 | 金鑰安全在 T3 config.ts 中同步實作：SENSITIVE_KEY_PATTERNS 偵測→console.warn、--ai-key help 含 shell history 警告 |
| T9 | 2026-03-31 | ✅ 完成 | 4 個測試檔案、81 個新測試：ai-ollama(16)+integration-s6(20)+config(30)+privacy-badge(15)。core 253 + web 233 + cli 37 = 523 tests 零回歸。pnpm build 全通過 |

### Review 紀錄

| Review 步驟 | 日期 | 結果 | Review 文件連結 |
|------------|------|------|---------------|
| 設計 Review（對規範） | 2026-03-31 | 通過 | Blocker:0 Major:0 Minor:0 — F41~F49 逐項覆蓋，OllamaProvider 介面相容 SummaryProvider，設定優先級完整（Provider CLI>json>env, Key env>CLI），API 擴充向下相容，錯誤處理含 5 情境 |
| 實作 Review（對程式碼 + 對規範） | 2026-03-31 | 通過 | Blocker:0 Major:0 Minor:1 — tsc 0 errors ×3 pkgs, 435 tests 零回歸。OllamaProvider 完整實作 SummaryProvider 介面，createProvider 向下相容。config.ts 優先級正確。GET /api/ai/status 三模式映射正確。PrivacyBadge 三模式含 a11y。Minor: PrivacyBadge cloud 色 #ffaa00 inline 非 theme，可接受 |
| 測試 Review（對功能 + 對規範） | 2026-03-31 | 通過 | Blocker:0 Major:0 Minor:0 — 81 新測試全通過（OllamaProvider 16+integration 20+config 30+PrivacyBadge 15）。523 tests 零回歸。pnpm build ×3 通過。T1-T9 全 done、驗收全勾、doc-integrity 合格 |

### Gate 紀錄

| Gate | 日期 | 決策 | 審核意見 |
|------|------|------|---------|
| G0 | 2026-03-31 | ✅ 通過 | 老闆核准 G0 |
| G2 | 2026-03-31 | ✅ 通過 | PM 審核通過（6 項 checklist ✅），老闆核准。0 Blocker / 0 Major / 1 Minor（PrivacyBadge inline 色碼，不阻擋） |
| G3 | 2026-03-31 | ✅ 通過 | PM 審核通過（6 項 checklist ✅），老闆核准。523 tests 零回歸，Phase 2 收官 |

---

**確認**: [x] L1 確認 / [x] Tech Lead 確認

---

**Sprint 6 完成**: ✅ 2026-03-31
**最終測試**: 523 tests, 0 failures
**Gate 紀錄**: G0 ✅ → G2 ✅ → G3 ✅
