# Sprint 6 — Ollama + 隱私強化 架構設計

> **撰寫者**: Tech Lead（L1）
> **日期**: 2026-03-31
> **對應任務**: T1
> **狀態**: 設計完成

---

## 1. 設計目標

兌現 local-first 隱私承諾：

1. 新增 OllamaProvider — 程式碼完全不出站
2. 環境變數金鑰管理 — 比 CLI flag 更安全
3. .codeatlas.json 設定檔 — 專案級持久設定
4. UI 隱私標示 — 使用者明確知道資料去向
5. 錯誤處理強化 — Ollama 未安裝/模型不存在的友善提示

**設計原則**：
- 不改現有 OpenAI/Anthropic Provider
- 零新依賴（HTTP fetch 即可）
- createProvider 工廠擴充為向下相容

---

## 2. OllamaProvider 介面設計

### SummaryProvider 介面（既有，不修改）

```typescript
// packages/core/src/types.ts（不變）
interface SummaryProvider {
  name: string;
  isConfigured(): boolean;
  summarize(code: string, context: SummaryContext): Promise<string>;
}
```

### OllamaProvider 實作

```typescript
// packages/core/src/ai/ollama.ts（新增）

export interface OllamaProviderOptions {
  /** Ollama server base URL (default: http://localhost:11434) */
  baseUrl?: string;
  /** Model name (default: codellama) */
  model?: string;
}

export class OllamaProvider implements SummaryProvider {
  name = 'ollama';
  private baseUrl: string;
  private model: string;

  constructor(options?: OllamaProviderOptions) {
    this.baseUrl = options?.baseUrl ?? 'http://localhost:11434';
    this.model = options?.model ?? 'codellama';
  }

  /** Ollama 不需 API key，只要 daemon 運行即可 */
  isConfigured(): boolean {
    return true;
  }

  async summarize(code: string, context: SummaryContext): Promise<string> {
    const { system, user } = buildPrompt(code, context);
    const prompt = `${system}\n\n${user}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
        }),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      // ECONNREFUSED → Ollama not running
      if (isConnectionError(err)) {
        throw new Error(
          'Ollama is not running. Install: https://ollama.ai/download then run: ollama serve'
        );
      }
      // AbortError → timeout
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(
          `Ollama request timed out after ${AI_TIMEOUT_MS / 1000}s. Check if Ollama is running.`
        );
      }
      throw new Error(
        `Ollama network error: ${err instanceof Error ? err.message : 'Request failed'}`
      );
    } finally {
      clearTimeout(timeoutId);
    }

    // HTTP 404 → model not found
    if (response.status === 404) {
      throw new Error(
        `Model "${this.model}" not found. Run: ollama pull ${this.model}`
      );
    }

    if (!response.ok) {
      throw new Error(`Ollama API error (${response.status})`);
    }

    // Parse response
    let text: string;
    try {
      text = await response.text();
    } catch {
      throw new Error('Failed to read Ollama response body.');
    }

    let body: { response?: string };
    try {
      body = JSON.parse(text) as { response?: string };
    } catch {
      throw new Error('Failed to parse Ollama response JSON.');
    }

    const content = body?.response;
    if (!content) {
      throw new Error('Ollama returned an empty response.');
    }

    return content.trim();
  }

  /** Expose model name for API status endpoint */
  getModel(): string {
    return this.model;
  }
}

function isConnectionError(err: unknown): boolean {
  if (err instanceof TypeError && err.message.includes('fetch failed')) return true;
  const code = (err as NodeJS.ErrnoException)?.code;
  return code === 'ECONNREFUSED' || code === 'ENOTFOUND';
}
```

### createProvider 工廠擴充

```typescript
// packages/core/src/ai/index.ts（修改）

export interface CreateProviderOptions {
  ollamaModel?: string;
  ollamaBaseUrl?: string;
}

export function createProvider(
  name: string,
  apiKey?: string,
  options?: CreateProviderOptions,
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

> **向下相容**：options 為可選參數，既有 `createProvider('openai', key)` 呼叫不受影響。

---

## 3. 設定優先級系統

### 三來源合併

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│ CLI Flags   │     │ .codeatlas.json  │     │ ENV Vars     │
│ --ai-provider│     │ aiProvider       │     │ (keys only)  │
│ --ai-key    │     │ ollamaModel      │     │ CODEATLAS_*  │
│ --port      │     │ port             │     │ OPENAI_*     │
│ --ollama-model│   │ ignore           │     │ ANTHROPIC_*  │
└──────┬──────┘     └────────┬─────────┘     └──────┬───────┘
       │                     │                       │
       └─────────┬───────────┘───────────────────────┘
                 │
         ┌───────┴────────┐
         │ resolveConfig() │
         └───────┬────────┘
                 │
         ┌───────┴────────────────────────┐
         │ ResolvedConfig                  │
         │  aiProvider: string             │
         │  aiKey: string | undefined      │
         │  ollamaModel: string            │
         │  port: number                   │
         │  ignore: string[]               │
         └────────────────────────────────┘
```

### 優先級規則

| 設定項 | 最高優先 | 中 | 最低 | 預設 |
|--------|---------|---|------|------|
| AI Provider | CLI `--ai-provider` | `.codeatlas.json` | — | `'disabled'` |
| AI Key | 環境變數 | CLI `--ai-key` | — | `undefined` |
| Port | CLI `--port` | `.codeatlas.json` | — | `3000` |
| Ollama Model | CLI `--ollama-model` | `.codeatlas.json` | — | `'codellama'` |
| Ignore | CLI `--ignore` | `.codeatlas.json` | — | `[]` |

> **Key 特例**：環境變數比 CLI flag 優先，因為環境變數不留在 shell history。

### resolveConfig 虛擬碼

```typescript
interface CliOptions {
  port?: number;
  aiKey?: string;
  aiProvider?: string;
  ollamaModel?: string;
  ignore?: string[];
}

interface ResolvedConfig {
  aiProvider: string;
  aiKey: string | undefined;
  ollamaModel: string;
  port: number;
  ignore: string[];
}

function resolveConfig(cli: CliOptions, projectPath: string): ResolvedConfig {
  const file = readConfigFile(projectPath);   // .codeatlas.json or defaults
  const env = readEnvVars();                  // CODEATLAS_AI_KEY etc.

  return {
    aiProvider: cli.aiProvider ?? file.aiProvider ?? 'disabled',
    aiKey: env.aiKey ?? cli.aiKey ?? undefined,  // env > CLI
    ollamaModel: cli.ollamaModel ?? file.ollamaModel ?? 'codellama',
    port: cli.port ?? file.port ?? 3000,
    ignore: cli.ignore ?? file.ignore ?? [],
  };
}
```

### 環境變數 Key 解析

```typescript
function readEnvVars(): { aiKey?: string } {
  // Provider-specific 優先
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const generalKey = process.env.CODEATLAS_AI_KEY;

  // 回傳最高優先的非空值
  return { aiKey: openaiKey || anthropicKey || generalKey || undefined };
}
```

> **注意**：provider-specific 變數名稱是通用慣例（OPENAI_API_KEY），使用者可能已設定過。`CODEATLAS_AI_KEY` 作為通用 fallback。

---

## 4. .codeatlas.json Schema

### 格式定義

```typescript
interface CodeAtlasConfig {
  /** AI provider: 'disabled' | 'ollama' | 'openai' | 'anthropic' */
  aiProvider?: string;
  /** Ollama model name (default: 'codellama') */
  ollamaModel?: string;
  /** Web server port (default: 3000) */
  port?: number;
  /** Additional ignore patterns */
  ignore?: string[];
}
```

### 合法值

| 欄位 | 型別 | 合法值 | 預設 |
|------|------|--------|------|
| aiProvider | string | `'disabled'` / `'ollama'` / `'openai'` / `'anthropic'` | `'disabled'` |
| ollamaModel | string | 任意（模型名） | `'codellama'` |
| port | number | 1~65535 | `3000` |
| ignore | string[] | glob patterns | `[]` |

### 驗證規則

1. JSON.parse 失敗 → `console.error('Invalid .codeatlas.json: ${message}. Using defaults.')` → 回傳全預設
2. aiProvider 非合法值 → `console.warn('Unknown aiProvider "${value}". Falling back to "disabled".')` → 該欄位用 disabled
3. port 非 1~65535 整數 → `console.warn('Invalid port. Using default 3000.')` → 該欄位用 3000
4. 偵測到含 `key`/`secret`/`token` 的欄位名 → `console.warn('Warning: .codeatlas.json should not contain API keys. Use environment variables instead.')`

### 範例

```json
{
  "aiProvider": "ollama",
  "ollamaModel": "codellama",
  "port": 3000,
  "ignore": ["dist", "coverage", ".next"]
}
```

---

## 5. API 擴充設計

### GET /api/ai/status（擴充）

**現有回應（Sprint 3）**：
```json
{ "enabled": true, "provider": "openai" }
```

**Sprint 6 擴充回應**：
```json
{
  "enabled": true,
  "provider": "ollama",
  "mode": "local",
  "privacyLevel": "full",
  "model": "codellama"
}
```

### 欄位對照表

| provider 值 | mode | privacyLevel | model |
|-------------|------|-------------|-------|
| `'disabled'` | `'disabled'` | `'none'` | `null` |
| `'ollama'` | `'local'` | `'full'` | `'{model name}'` |
| `'openai'` | `'cloud'` | `'partial'` | `null` |
| `'anthropic'` | `'cloud'` | `'partial'` | `null` |

### server.ts 實作

```typescript
fastify.get('/api/ai/status', async (_req, reply) => {
  const provider = createProvider(aiProvider, aiKey, { ollamaModel });
  const mode = aiProvider === 'ollama' ? 'local'
    : aiProvider === 'disabled' ? 'disabled'
    : 'cloud';
  const privacyLevel = mode === 'local' ? 'full'
    : mode === 'disabled' ? 'none'
    : 'partial';
  const model = aiProvider === 'ollama' ? ollamaModel : null;

  await reply.send({
    enabled: provider.isConfigured(),
    provider: aiProvider,
    mode,
    privacyLevel,
    model,
  });
});
```

---

## 6. PrivacyBadge UI 設計

### 三模式

| mode | 圖示 | 文字 | 色彩 | theme 引用 |
|------|------|------|------|-----------|
| disabled | — | `AI 已關閉` | 灰色 | `colors.text.muted` |
| local | ✅ | `本地模式 — 程式碼不出站` | 綠色 | `colors.primary.DEFAULT` |
| cloud | ⚠️ | `雲端模式 — 原始碼片段將傳送至 {provider}` | 琥珀色 | 新增 `colors.warning` 或 amber 系 |

### 放置位置

```
┌──────────── NodePanel ────────────┐
│ Node: src/utils/helper.ts         │
│ ...                               │
│ ┌──── AiSummary ───────────────┐  │
│ │ ┌── PrivacyBadge ─────────┐  │  │
│ │ │ ✅ 本地模式 (codellama)  │  │  │
│ │ └─────────────────────────┘  │  │
│ │ AI Summary                   │  │
│ │ This module provides...      │  │
│ └──────────────────────────────┘  │
└───────────────────────────────────┘
```

### 元件介面

```typescript
interface PrivacyBadgeProps {
  mode: 'disabled' | 'local' | 'cloud';
  provider: string;
  model: string | null;
}
```

---

## 7. 錯誤處理策略

### Ollama 錯誤分類

| 錯誤類型 | 偵測方式 | 錯誤訊息 |
|---------|---------|---------|
| 未安裝/未啟動 | `fetch failed` + ECONNREFUSED | `Ollama is not running. Install: https://ollama.ai/download then run: ollama serve` |
| 模型不存在 | HTTP 404 | `Model "${model}" not found. Run: ollama pull ${model}` |
| 逾時 | AbortController timeout | `Ollama request timed out after ${n}s. Check if Ollama is running.` |
| 回應格式錯誤 | JSON.parse 失敗 | `Failed to parse Ollama response JSON.` |
| 空回應 | `body.response` 為空 | `Ollama returned an empty response.` |
| 其他 HTTP 錯誤 | `!response.ok` | `Ollama API error (${status})` |

### 前端顯示

前端已有 AiSummary 的 error state（紅色 error message），Ollama 錯誤訊息會透過 `POST /api/ai/summary` → 500 → error.message 傳到前端，無需新增前端錯誤 UI。

### Timeout 設定

OllamaProvider 的 timeout 應比雲端 Provider 長（本地模型推理較慢）：
- 既有 `AI_TIMEOUT_MS = 10_000`（10 秒）
- Ollama 使用 `OLLAMA_TIMEOUT_MS = 30_000`（30 秒）

```typescript
export const OLLAMA_TIMEOUT_MS = 30_000;
```

---

## 8. 檔案結構影響

### 新增檔案

```
packages/
├── core/src/ai/
│   └── ollama.ts           ← OllamaProvider（~120 行）
├── cli/src/
│   └── config.ts           ← 設定讀取 + 合併（~150 行）
└── web/src/components/
    └── PrivacyBadge.tsx    ← 隱私標示元件（~80 行）
```

### 修改檔案

```
packages/
├── core/src/ai/index.ts    ← createProvider 加 'ollama' + options
├── core/src/index.ts        ← export OllamaProvider
├── cli/src/index.ts         ← --ollama-model flag
├── cli/src/commands/web.ts  ← resolveConfig 整合
├── cli/src/server.ts        ← ServerOptions + /api/ai/status 擴充
├── web/src/types/graph.ts   ← AiStatusResponse 擴充
└── web/src/components/
    └── AiSummary.tsx        ← 整合 PrivacyBadge
```

---

## 9. 向下相容性

| 項目 | 影響 | 處理 |
|------|------|------|
| createProvider 簽章 | options 為可選參數 | 既有呼叫 `createProvider('openai', key)` 不受影響 |
| GET /api/ai/status 回應 | 新增 3 個欄位 | 既有前端讀 `enabled`/`provider` 不受影響 |
| AiStatusResponse 型別 | 新增欄位設為 optional | 舊版前端不會因缺少欄位報錯 |
| CLI --ai-provider | 新增 'ollama' 合法值 | 既有 'openai'/'anthropic'/'disabled' 不變 |
| .codeatlas.json | 新增檔案 | 不存在 → 靜默使用預設值 |
