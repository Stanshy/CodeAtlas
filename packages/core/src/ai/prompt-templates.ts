/**
 * AI Prompt Templates — Sprint 14-16
 * Structured prompts for AI providers, output format matches contracts.ts schemas.
 * Sprint 16: All prompts fully in Traditional Chinese for better local model compliance.
 * Future: language switching via user settings.
 * @module ai/prompt-templates
 */

export const PROMPT_VERSION = 'v16.1';

/**
 * Standard reply rules appended to every prompt.
 * Improves JSON output success rate for local models (e.g. Gemma4).
 */
const REPLY_RULES = `
回覆規則：
1. 使用繁體中文
2. 只輸出 JSON，不加 markdown 包裹
3. 嚴格遵循以下 JSON 結構
4. 字數上限見各欄位 maxLength
5. 不得虛構未觀察到的內容
6. 若無法判斷，confidence 設為 0.5 以下`;

// ---------------------------------------------------------------------------
// Method Summary Prompt
// ---------------------------------------------------------------------------

/**
 * Build a prompt asking the AI to analyze a batch of methods and return JSON
 * matching BatchMethodSummarySchema.
 *
 * @param methodsContext - Formatted string produced by buildMethodBatchContext()
 */
export function buildMethodSummaryPrompt(methodsContext: string): string {
  return `你是一位程式碼分析專家。請分析以下方法並對每個方法進行分類。

針對每個方法，請提供：
- id：方法的識別符
- role：以下角色之一 [entrypoint, business_core, domain_rule, orchestration, io_adapter, validation, infra, utility, framework_glue]
- confidence：0-1 的信心分數
- oneLineSummary：最多 100 字的繁體中文摘要，說明此方法的用途
- businessRelevance：從業務角度說明此方法的重要性（選填）
- evidence：導致此分類結果的依據列表（選填）

角色定義：
- entrypoint：路由處理器或中間層入口
- business_core：核心業務邏輯
- domain_rule：業務規則驗證（計算、判斷、決策）
- orchestration：流程編排，呼叫多個服務
- io_adapter：資料庫、外部 API 或檔案 I/O
- validation：輸入驗證與資料清理
- infra：框架設定或中間層註冊
- utility：工具函式（格式化、解析、轉換）
- framework_glue：框架膠水程式碼（ORM 建構器、查詢鏈）

只回覆有效的 JSON，格式如下：
{"methods": [{"id": "...", "role": "...", "confidence": 0.8, "oneLineSummary": "...", "businessRelevance": "...", "evidence": ["依據1"]}]}
${REPLY_RULES}

待分析的方法：
${methodsContext}`;
}

// ---------------------------------------------------------------------------
// Role Classification Prompt
// ---------------------------------------------------------------------------

/**
 * Build a lighter prompt for role-only classification (no summary text).
 * Output matches MethodRoleClassificationSchema.
 *
 * @param methodsContext - Formatted string produced by buildMethodBatchContext()
 */
export function buildRoleClassificationPrompt(methodsContext: string): string {
  return `你是一位程式碼分析專家。請對以下每個方法進行角色分類。

針對每個方法，請提供：
- id：方法的識別符
- role：以下角色之一 [entrypoint, business_core, domain_rule, orchestration, io_adapter, validation, infra, utility, framework_glue]
- confidence：0-1 的信心分數
- sourceSignals：導致此分類結果的依據列表（選填）

角色定義：
- entrypoint：路由處理器或中間層入口
- business_core：核心業務邏輯
- domain_rule：業務規則驗證（計算、判斷、決策）
- orchestration：流程編排，呼叫多個服務
- io_adapter：資料庫、外部 API 或檔案 I/O
- validation：輸入驗證與資料清理
- infra：框架設定或中間層註冊
- utility：工具函式（格式化、解析、轉換）
- framework_glue：框架膠水程式碼（ORM 建構器、查詢鏈）

只回覆有效的 JSON，格式如下：
{"methods": [{"id": "...", "role": "...", "confidence": 0.9, "sourceSignals": ["依據1", "依據2"]}]}
${REPLY_RULES}

待分類的方法：
${methodsContext}`;
}

// ---------------------------------------------------------------------------
// Chain Explanation Prompt
// ---------------------------------------------------------------------------

/**
 * Build a prompt asking the AI to explain a call chain and annotate each step.
 * Output matches ChainExplanationSchema.
 *
 * @param chainContext - Formatted string produced by buildChainContext()
 * @param chainId     - The chain/endpoint identifier to embed in the response
 */
export function buildChainExplanationPrompt(chainContext: string, chainId: string): string {
  return `你是一位程式碼分析專家。請解釋這條 API 呼叫鏈的用途。

請提供：
- chainId："${chainId}"
- overallPurpose：從業務角度說明這條呼叫鏈完成了什麼（繁體中文）
- steps：針對每個步驟，提供 stepIndex、methodId 和 description（最多 60 字繁體中文）

只回覆有效的 JSON，格式如下：
{"chainId": "...", "overallPurpose": "...", "steps": [{"stepIndex": 0, "methodId": "...", "description": "..."}]}
${REPLY_RULES}

待分析的呼叫鏈：
${chainContext}`;
}

// ---------------------------------------------------------------------------
// Sprint 15: SF Directory Summary Prompt
// ---------------------------------------------------------------------------

/**
 * Build a prompt asking the AI to summarize a directory's role and purpose.
 * Output matches DirectorySummarySchema.
 *
 * @param directoryContext - Formatted string produced by buildLargeContext()
 * @param directoryPath   - The directory path to embed in the response
 */
export function buildDirectorySummaryPrompt(directoryContext: string, directoryPath: string): string {
  return `你是一位程式碼分析專家。請分析此目錄並判斷它在專案中的角色。

請提供：
- directoryPath："${directoryPath}"
- role：以下角色之一 ["路由層", "資料層", "服務層", "前端", "基礎設施", "工具", "測試", "設定"]
- oneLineSummary：最多 30 字的繁體中文摘要，簡述此目錄的用途
- keyResponsibilities：2-4 項主要職責（選填）
- confidence：0-1 的信心分數

只回覆有效的 JSON，格式如下：
{"directoryPath": "${directoryPath}", "role": "服務層", "oneLineSummary": "處理核心業務邏輯", "keyResponsibilities": ["用戶認證", "訂單處理"], "confidence": 0.85}
${REPLY_RULES}

待分析的目錄：
${directoryContext}`;
}

// ---------------------------------------------------------------------------
// Sprint 15: DJ Endpoint Description Prompt
// ---------------------------------------------------------------------------

/**
 * Build a prompt asking the AI to describe an API endpoint in Chinese.
 * Output matches EndpointDescriptionSchema.
 *
 * @param endpointContext - Method + path + handler signature
 * @param endpointId     - The endpoint ID to embed in the response
 * @param method         - HTTP method (GET/POST/etc.)
 * @param path           - API path
 */
export function buildEndpointDescriptionPrompt(
  endpointContext: string,
  endpointId: string,
  method: string,
  path: string,
): string {
  return `你是一位程式碼分析專家。請用簡潔的繁體中文描述這個 API 端點的用途。

請提供：
- endpointId："${endpointId}"
- method："${method}"
- path："${path}"
- chineseDescription：繁體中文描述，詳細說明此端點的功能、用途與業務場景（100-200 字）
- purpose：一句繁體中文說明此端點的核心功能
- confidence：0-1 的信心分數

只回覆有效的 JSON，格式如下：
{"endpointId": "${endpointId}", "method": "${method}", "path": "${path}", "chineseDescription": "處理影片上傳流程，接收使用者上傳的影片檔案，進行格式驗證與大小檢查後儲存至雲端儲存空間，同時在資料庫建立影片記錄並觸發轉碼任務", "purpose": "上傳影片檔案並建立影片記錄", "confidence": 0.9}
${REPLY_RULES}

待分析的端點：
${endpointContext}`;
}

// ---------------------------------------------------------------------------
// Sprint 15: DJ Step Detail Prompt
// ---------------------------------------------------------------------------

/**
 * Build a prompt asking the AI to describe each step in a call chain with
 * input/output/transform details. Output matches StepDetailSchema[].
 *
 * @param chainContext - Formatted string produced by buildChainContext()
 * @param steps       - Array of { stepIndex, methodId } for the response structure
 */
export function buildStepDetailPrompt(
  chainContext: string,
  steps: Array<{ stepIndex: number; methodId: string }>,
): string {
  const stepsHint = steps.map(s =>
    `{"stepIndex": ${s.stepIndex}, "methodId": "${s.methodId}", "description": "...", "input": "...", "output": "...", "transform": "..."}`
  ).join(',\n  ');

  return `你是一位程式碼分析專家。請分析這條 API 呼叫鏈中的每個步驟，並描述資料流向。

針對每個步驟，請提供：
- stepIndex：步驟順序編號
- methodId：方法的識別符
- description：最多 30 字的繁體中文描述，說明此步驟的功能
- input：此步驟接收的資料（參數名稱與型別）
- output：此步驟回傳的資料
- transform：資料經過了什麼轉換

只回覆有效的 JSON 陣列，格式如下：
[
  ${stepsHint}
]
${REPLY_RULES}

待分析的呼叫鏈：
${chainContext}`;
}
