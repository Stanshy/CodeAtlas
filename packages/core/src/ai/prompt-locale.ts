/**
 * AI Prompt i18n Constants — Sprint 21
 *
 * Locale-specific strings used by prompt template builders.
 * Add new keys here as additional prompt templates are i18n-ified.
 *
 * @module ai/prompt-locale
 */

import type { Locale } from '../types.js';

// ---------------------------------------------------------------------------
// Reply rules block (appended to every prompt)
// ---------------------------------------------------------------------------

export const REPLY_RULES_LOCALE: Record<Locale, string> = {
  'zh-TW': `
回覆規則：
1. 使用繁體中文
2. 只輸出 JSON，不加 markdown 包裹
3. 嚴格遵循以下 JSON 結構
4. 字數上限見各欄位 maxLength
5. 不得虛構未觀察到的內容
6. 若無法判斷，confidence 設為 0.5 以下`,
  'en': `
Reply rules:
1. Reply in English
2. Output JSON only — no markdown wrapping
3. Follow the JSON schema strictly
4. Respect the maxLength limit per field
5. Do not fabricate unobserved information
6. If uncertain, set confidence to 0.5 or lower`,
};

// ---------------------------------------------------------------------------
// Method summary prompt strings
// ---------------------------------------------------------------------------

export const METHOD_SUMMARY_INTRO: Record<Locale, string> = {
  'zh-TW': '你是一位程式碼分析專家。請分析以下方法並對每個方法進行分類。',
  'en': 'You are a code analysis expert. Analyze the following methods and classify each one.',
};

export const METHOD_SUMMARY_INSTRUCTIONS: Record<Locale, string> = {
  'zh-TW': `針對每個方法，請提供：
- id：方法的識別符
- role：以下角色之一 [entrypoint, business_core, domain_rule, orchestration, io_adapter, validation, infra, utility, framework_glue]
- confidence：0-1 的信心分數
- oneLineSummary：最多 100 字的繁體中文摘要，說明此方法的用途
- businessRelevance：從業務角度說明此方法的重要性（選填）
- evidence：導致此分類結果的依據列表（選填）`,
  'en': `For each method, provide:
- id: the method identifier
- role: one of [entrypoint, business_core, domain_rule, orchestration, io_adapter, validation, infra, utility, framework_glue]
- confidence: a score from 0 to 1
- oneLineSummary: a summary of up to 100 characters describing what the method does
- businessRelevance: why this method matters from a business perspective (optional)
- evidence: list of signals that led to this classification (optional)`,
};

export const ROLE_DEFINITIONS: Record<Locale, string> = {
  'zh-TW': `角色定義：
- entrypoint：路由處理器或中間層入口
- business_core：核心業務邏輯
- domain_rule：業務規則驗證（計算、判斷、決策）
- orchestration：流程編排，呼叫多個服務
- io_adapter：資料庫、外部 API 或檔案 I/O
- validation：輸入驗證與資料清理
- infra：框架設定或中間層註冊
- utility：工具函式（格式化、解析、轉換）
- framework_glue：框架膠水程式碼（ORM 建構器、查詢鏈）`,
  'en': `Role definitions:
- entrypoint: route handler or middleware entry point
- business_core: core business logic
- domain_rule: business rule validation (calculation, decision, condition)
- orchestration: workflow orchestration calling multiple services
- io_adapter: database, external API, or file I/O
- validation: input validation and data sanitization
- infra: framework configuration or middleware registration
- utility: utility function (formatting, parsing, transformation)
- framework_glue: framework glue code (ORM builders, query chains)`,
};

// ---------------------------------------------------------------------------
// Role classification prompt strings
// ---------------------------------------------------------------------------

export const ROLE_CLASSIFICATION_INTRO: Record<Locale, string> = {
  'zh-TW': '你是一位程式碼分析專家。請對以下每個方法進行角色分類。',
  'en': 'You are a code analysis expert. Classify the role of each of the following methods.',
};

export const ROLE_CLASSIFICATION_INSTRUCTIONS: Record<Locale, string> = {
  'zh-TW': `針對每個方法，請提供：
- id：方法的識別符
- role：以下角色之一 [entrypoint, business_core, domain_rule, orchestration, io_adapter, validation, infra, utility, framework_glue]
- confidence：0-1 的信心分數
- sourceSignals：導致此分類結果的依據列表（選填）`,
  'en': `For each method, provide:
- id: the method identifier
- role: one of [entrypoint, business_core, domain_rule, orchestration, io_adapter, validation, infra, utility, framework_glue]
- confidence: a score from 0 to 1
- sourceSignals: list of signals that led to this classification (optional)`,
};

// ---------------------------------------------------------------------------
// Chain explanation prompt strings
// ---------------------------------------------------------------------------

export const CHAIN_EXPLANATION_INTRO: Record<Locale, string> = {
  'zh-TW': '你是一位程式碼分析專家。請解釋這條 API 呼叫鏈的用途。',
  'en': 'You are a code analysis expert. Explain the purpose of this API call chain.',
};

export const CHAIN_EXPLANATION_INSTRUCTIONS: Record<Locale, string> = {
  'zh-TW': `請提供：
- chainId：所提供的 chainId 值
- overallPurpose：從業務角度說明這條呼叫鏈完成了什麼（繁體中文）
- steps：針對每個步驟，提供 stepIndex、methodId 和 description（最多 60 字繁體中文）`,
  'en': `Provide:
- chainId: the provided chainId value
- overallPurpose: what this call chain accomplishes from a business perspective (in English)
- steps: for each step, provide stepIndex, methodId, and description (up to 60 characters)`,
};

// ---------------------------------------------------------------------------
// Directory summary prompt strings
// ---------------------------------------------------------------------------

export const DIRECTORY_SUMMARY_INTRO: Record<Locale, string> = {
  'zh-TW': '你是一位程式碼分析專家。請分析此目錄並判斷它在專案中的角色。',
  'en': 'You are a code analysis expert. Analyze this directory and determine its role in the project.',
};

export const DIRECTORY_SUMMARY_INSTRUCTIONS: Record<Locale, string> = {
  'zh-TW': `請提供：
- directoryPath：所提供的目錄路徑
- role：以下角色之一 ["路由層", "資料層", "服務層", "前端", "基礎設施", "工具", "測試", "設定"]
- oneLineSummary：最多 30 字的繁體中文摘要，簡述此目錄的用途
- keyResponsibilities：2-4 項主要職責（選填）
- confidence：0-1 的信心分數`,
  'en': `Provide:
- directoryPath: the provided directory path
- role: one of ["routing", "data", "service", "frontend", "infrastructure", "utility", "test", "config"]
- oneLineSummary: a summary of up to 30 characters describing this directory's purpose
- keyResponsibilities: 2-4 key responsibilities (optional)
- confidence: a score from 0 to 1`,
};

// ---------------------------------------------------------------------------
// Endpoint description prompt strings
// ---------------------------------------------------------------------------

export const ENDPOINT_DESCRIPTION_INTRO: Record<Locale, string> = {
  'zh-TW': '你是一位程式碼分析專家。請用簡潔的繁體中文描述這個 API 端點的用途。',
  'en': 'You are a code analysis expert. Describe the purpose of this API endpoint concisely.',
};

export const ENDPOINT_DESCRIPTION_INSTRUCTIONS: Record<Locale, string> = {
  'zh-TW': `請提供：
- endpointId：所提供的端點 ID
- method：HTTP 方法
- path：API 路徑
- chineseDescription：繁體中文描述，詳細說明此端點的功能、用途與業務場景（100-200 字）
- purpose：一句繁體中文說明此端點的核心功能
- confidence：0-1 的信心分數`,
  'en': `Provide:
- endpointId: the provided endpoint ID
- method: HTTP method
- path: API path
- chineseDescription: English description explaining this endpoint's function, purpose and business context (100-200 characters)
- purpose: one sentence describing the core function of this endpoint
- confidence: a score from 0 to 1`,
};

// ---------------------------------------------------------------------------
// Step detail prompt strings
// ---------------------------------------------------------------------------

export const STEP_DETAIL_INTRO: Record<Locale, string> = {
  'zh-TW': '你是一位程式碼分析專家。請分析這條 API 呼叫鏈中的每個步驟，並描述資料流向。',
  'en': 'You are a code analysis expert. Analyze each step in this API call chain and describe the data flow.',
};

export const STEP_DETAIL_INSTRUCTIONS: Record<Locale, string> = {
  'zh-TW': `針對每個步驟，請提供：
- stepIndex：步驟順序編號
- methodId：方法的識別符
- description：最多 30 字的繁體中文描述，說明此步驟的功能
- input：此步驟接收的資料（參數名稱與型別）
- output：此步驟回傳的資料
- transform：資料經過了什麼轉換`,
  'en': `For each step, provide:
- stepIndex: step sequence number
- methodId: the method identifier
- description: a description of up to 30 characters explaining what this step does
- input: data received by this step (parameter names and types)
- output: data returned by this step
- transform: what transformation the data undergoes`,
};

// ---------------------------------------------------------------------------
// JSON-only output instruction
// ---------------------------------------------------------------------------

export const JSON_ONLY_INSTRUCTION: Record<Locale, string> = {
  'zh-TW': '只回覆有效的 JSON，格式如下：',
  'en': 'Reply with valid JSON only, in the following format:',
};

export const JSON_ARRAY_ONLY_INSTRUCTION: Record<Locale, string> = {
  'zh-TW': '只回覆有效的 JSON 陣列，格式如下：',
  'en': 'Reply with a valid JSON array only, in the following format:',
};

// ---------------------------------------------------------------------------
// Trailing section labels
// ---------------------------------------------------------------------------

export const METHODS_TO_ANALYZE_LABEL: Record<Locale, string> = {
  'zh-TW': '待分析的方法：',
  'en': 'Methods to analyze:',
};

export const METHODS_TO_CLASSIFY_LABEL: Record<Locale, string> = {
  'zh-TW': '待分類的方法：',
  'en': 'Methods to classify:',
};

export const CHAIN_TO_ANALYZE_LABEL: Record<Locale, string> = {
  'zh-TW': '待分析的呼叫鏈：',
  'en': 'Call chain to analyze:',
};

export const DIRECTORY_TO_ANALYZE_LABEL: Record<Locale, string> = {
  'zh-TW': '待分析的目錄：',
  'en': 'Directory to analyze:',
};

export const ENDPOINT_TO_ANALYZE_LABEL: Record<Locale, string> = {
  'zh-TW': '待分析的端點：',
  'en': 'Endpoint to analyze:',
};
