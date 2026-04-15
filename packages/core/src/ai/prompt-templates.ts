/**
 * AI Prompt Templates — Sprint 14-16, i18n Sprint 21
 * Structured prompts for AI providers, output format matches contracts.ts schemas.
 * Sprint 16: All prompts fully in Traditional Chinese for better local model compliance.
 * Sprint 21: i18n support — locale parameter selects Chinese or English output.
 * @module ai/prompt-templates
 */

import type { Locale } from '../types.js';
import {
  REPLY_RULES_LOCALE,
  METHOD_SUMMARY_INTRO,
  METHOD_SUMMARY_INSTRUCTIONS,
  ROLE_DEFINITIONS,
  ROLE_CLASSIFICATION_INTRO,
  ROLE_CLASSIFICATION_INSTRUCTIONS,
  CHAIN_EXPLANATION_INTRO,
  CHAIN_EXPLANATION_INSTRUCTIONS,
  DIRECTORY_SUMMARY_INTRO,
  DIRECTORY_SUMMARY_INSTRUCTIONS,
  ENDPOINT_DESCRIPTION_INTRO,
  STEP_DETAIL_INTRO,
  STEP_DETAIL_INSTRUCTIONS,
  JSON_ONLY_INSTRUCTION,
  JSON_ARRAY_ONLY_INSTRUCTION,
  METHODS_TO_ANALYZE_LABEL,
  METHODS_TO_CLASSIFY_LABEL,
  CHAIN_TO_ANALYZE_LABEL,
  DIRECTORY_TO_ANALYZE_LABEL,
  ENDPOINT_TO_ANALYZE_LABEL,
} from './prompt-locale.js';

export const PROMPT_VERSION = 'v16.1';

// ---------------------------------------------------------------------------
// Method Summary Prompt
// ---------------------------------------------------------------------------

/**
 * Build a prompt asking the AI to analyze a batch of methods and return JSON
 * matching BatchMethodSummarySchema.
 *
 * @param methodsContext - Formatted string produced by buildMethodBatchContext()
 * @param locale         - Output language locale (default: 'zh-TW')
 */
export function buildMethodSummaryPrompt(methodsContext: string, locale: Locale = 'zh-TW'): string {
  if (locale === 'zh-TW') {
    // Original Chinese prompt — kept exactly as-is
    const REPLY_RULES = REPLY_RULES_LOCALE['zh-TW'];
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

  // English prompt
  const REPLY_RULES = REPLY_RULES_LOCALE['en'];
  return `${METHOD_SUMMARY_INTRO['en']}

${METHOD_SUMMARY_INSTRUCTIONS['en']}

${ROLE_DEFINITIONS['en']}

${JSON_ONLY_INSTRUCTION['en']}
{"methods": [{"id": "...", "role": "...", "confidence": 0.8, "oneLineSummary": "...", "businessRelevance": "...", "evidence": ["signal1"]}]}
${REPLY_RULES}

${METHODS_TO_ANALYZE_LABEL['en']}
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
 * @param locale         - Output language locale (default: 'zh-TW')
 */
export function buildRoleClassificationPrompt(methodsContext: string, locale: Locale = 'zh-TW'): string {
  if (locale === 'zh-TW') {
    // Original Chinese prompt — kept exactly as-is
    const REPLY_RULES = REPLY_RULES_LOCALE['zh-TW'];
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

  // English prompt
  const REPLY_RULES = REPLY_RULES_LOCALE['en'];
  return `${ROLE_CLASSIFICATION_INTRO['en']}

${ROLE_CLASSIFICATION_INSTRUCTIONS['en']}

${ROLE_DEFINITIONS['en']}

${JSON_ONLY_INSTRUCTION['en']}
{"methods": [{"id": "...", "role": "...", "confidence": 0.9, "sourceSignals": ["signal1", "signal2"]}]}
${REPLY_RULES}

${METHODS_TO_CLASSIFY_LABEL['en']}
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
 * @param locale      - Output language locale (default: 'zh-TW')
 */
export function buildChainExplanationPrompt(chainContext: string, chainId: string, locale: Locale = 'zh-TW'): string {
  if (locale === 'zh-TW') {
    // Original Chinese prompt — kept exactly as-is
    const REPLY_RULES = REPLY_RULES_LOCALE['zh-TW'];
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

  // English prompt
  const REPLY_RULES = REPLY_RULES_LOCALE['en'];
  return `${CHAIN_EXPLANATION_INTRO['en']}

${CHAIN_EXPLANATION_INSTRUCTIONS['en'].replace('the provided chainId value', `"${chainId}"`)}

${JSON_ONLY_INSTRUCTION['en']}
{"chainId": "...", "overallPurpose": "...", "steps": [{"stepIndex": 0, "methodId": "...", "description": "..."}]}
${REPLY_RULES}

${CHAIN_TO_ANALYZE_LABEL['en']}
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
 * @param locale          - Output language locale (default: 'zh-TW')
 */
export function buildDirectorySummaryPrompt(
  directoryContext: string,
  directoryPath: string,
  locale: Locale = 'zh-TW',
): string {
  if (locale === 'zh-TW') {
    // Original Chinese prompt — kept exactly as-is
    const REPLY_RULES = REPLY_RULES_LOCALE['zh-TW'];
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

  // English prompt
  const REPLY_RULES = REPLY_RULES_LOCALE['en'];
  return `${DIRECTORY_SUMMARY_INTRO['en']}

${DIRECTORY_SUMMARY_INSTRUCTIONS['en'].replace('the provided directory path', `"${directoryPath}"`)}

${JSON_ONLY_INSTRUCTION['en']}
{"directoryPath": "${directoryPath}", "role": "service", "oneLineSummary": "Handles core business logic", "keyResponsibilities": ["user authentication", "order processing"], "confidence": 0.85}
${REPLY_RULES}

${DIRECTORY_TO_ANALYZE_LABEL['en']}
${directoryContext}`;
}

// ---------------------------------------------------------------------------
// Sprint 15: DJ Endpoint Description Prompt
// ---------------------------------------------------------------------------

/**
 * Build a prompt asking the AI to describe an API endpoint.
 * Output matches EndpointDescriptionSchema.
 *
 * @param endpointContext - Method + path + handler signature
 * @param endpointId     - The endpoint ID to embed in the response
 * @param method         - HTTP method (GET/POST/etc.)
 * @param path           - API path
 * @param locale         - Output language locale (default: 'zh-TW')
 */
export function buildEndpointDescriptionPrompt(
  endpointContext: string,
  endpointId: string,
  method: string,
  path: string,
  locale: Locale = 'zh-TW',
): string {
  if (locale === 'zh-TW') {
    // Original Chinese prompt — kept exactly as-is
    const REPLY_RULES = REPLY_RULES_LOCALE['zh-TW'];
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

  // English prompt
  const REPLY_RULES = REPLY_RULES_LOCALE['en'];
  return `${ENDPOINT_DESCRIPTION_INTRO['en']}

Provide:
- endpointId: "${endpointId}"
- method: "${method}"
- path: "${path}"
- chineseDescription: English description explaining this endpoint's function, purpose and business context (100-200 characters)
- purpose: one sentence describing the core function of this endpoint
- confidence: a score from 0 to 1

${JSON_ONLY_INSTRUCTION['en']}
{"endpointId": "${endpointId}", "method": "${method}", "path": "${path}", "chineseDescription": "Handles video upload flow — receives the uploaded file, validates format and size, stores it in cloud storage, creates a database record, and triggers a transcoding job", "purpose": "Upload a video file and create a video record", "confidence": 0.9}
${REPLY_RULES}

${ENDPOINT_TO_ANALYZE_LABEL['en']}
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
 * @param locale      - Output language locale (default: 'zh-TW')
 */
export function buildStepDetailPrompt(
  chainContext: string,
  steps: Array<{ stepIndex: number; methodId: string }>,
  locale: Locale = 'zh-TW',
): string {
  const stepsHint = steps.map(s =>
    `{"stepIndex": ${s.stepIndex}, "methodId": "${s.methodId}", "description": "...", "input": "...", "output": "...", "transform": "..."}`
  ).join(',\n  ');

  if (locale === 'zh-TW') {
    // Original Chinese prompt — kept exactly as-is
    const REPLY_RULES = REPLY_RULES_LOCALE['zh-TW'];
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

  // English prompt
  const REPLY_RULES = REPLY_RULES_LOCALE['en'];
  return `${STEP_DETAIL_INTRO['en']}

${STEP_DETAIL_INSTRUCTIONS['en']}

${JSON_ARRAY_ONLY_INSTRUCTION['en']}
[
  ${stepsHint}
]
${REPLY_RULES}

${CHAIN_TO_ANALYZE_LABEL['en']}
${chainContext}`;
}

// ---------------------------------------------------------------------------
// AI Endpoint Detection — Sprint 24
// ---------------------------------------------------------------------------

/**
 * Build a prompt for AI endpoint detection.
 * Used by AIFallbackAdapter when rule-based adapters find no endpoints.
 *
 * @param sourceFiles - Array of source file objects with path and content
 */
export function buildEndpointDetectionPrompt(sourceFiles: Array<{ path: string; content: string }>): string {
  const fileList = sourceFiles.map(f =>
    `### File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``
  ).join('\n\n');

  return `Analyze the following source code files and identify all API endpoints (HTTP routes/handlers).

For each endpoint, provide:
- method: HTTP method (GET, POST, PUT, DELETE, PATCH)
- path: The URL path/route pattern
- handler: The function/method name that handles this endpoint
- filePath: The file where it's defined
- line: Line number if identifiable
- framework: The web framework being used (if identifiable)
- confidence: Your confidence level (0-1) in this detection

Look for common patterns across all web frameworks:
- Route decorators (@app.route, @Get, @RequestMapping, etc.)
- Router method calls (router.get, app.post, etc.)
- URL configuration patterns (urlpatterns, etc.)
- Controller/handler class definitions
- Middleware registrations that define routes

Return a JSON object matching this structure:
{
  "endpoints": [...],
  "framework": "detected framework name or null",
  "language": "detected language"
}

Source files to analyze:

${fileList}`;
}
