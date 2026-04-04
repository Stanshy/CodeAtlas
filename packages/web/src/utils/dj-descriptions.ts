/**
 * CodeAtlas — DJ Description Utilities
 *
 * Heuristic functions for generating meaningful Chinese descriptions
 * for Data Journey endpoint cards (DJ-4) and step nodes (DJ-2/DJ-3).
 *
 * Used by:
 *   - GraphCanvas.tsx (chain step building + selector card desc)
 *   - DJPanel.tsx (StepDetail heuristic fill)
 *   - DJStepNode.tsx (step desc rendering)
 *
 * Sprint 13 — DJ-2, DJ-3, DJ-4 bug fixes
 */

// ---------------------------------------------------------------------------
// Endpoint-level: Chinese label for selector cards (DJ-4)
// ---------------------------------------------------------------------------

interface EndpointLabelRule {
  method?: string;
  pattern: RegExp;
  label: string;
}

/** Ordered list of URL pattern rules → Chinese label */
const ENDPOINT_LABEL_RULES: EndpointLabelRule[] = [
  // Videos
  { method: 'POST',   pattern: /\/videos\/[^/]+\/process/,  label: '觸發處理' },
  { method: 'POST',   pattern: /\/videos\/upload/,           label: '影片上傳' },
  { method: 'POST',   pattern: /\/videos/,                   label: '建立影片' },
  { method: 'GET',    pattern: /\/videos\/[^/]+\/result/,    label: '取得結果' },
  { method: 'GET',    pattern: /\/videos\/[^/]+\/transcript/,label: '取得逐字稿' },
  { method: 'GET',    pattern: /\/videos\/[^/]+/,            label: '影片詳情' },
  { method: 'GET',    pattern: /\/videos/,                   label: '影片列表' },
  { method: 'DELETE', pattern: /\/videos\/[^/]+/,            label: '刪除影片' },
  { method: 'PATCH',  pattern: /\/videos\/[^/]+/,            label: '更新影片' },
  // Auth
  { method: 'GET',    pattern: /\/auth\/google\/callback/,   label: 'Google 回調' },
  { method: 'GET',    pattern: /\/auth\/google/,             label: 'Google 登入' },
  { method: 'POST',   pattern: /\/auth\/logout/,             label: '登出' },
  { method: 'GET',    pattern: /\/auth\/me/,                 label: '取得用戶資料' },
  { method: 'POST',   pattern: /\/auth\/refresh/,            label: '更新 Token' },
  { pattern: /\/auth/,                                        label: '認證' },
  // Billing
  { method: 'POST',   pattern: /\/billing\/checkout/,        label: '建立付款' },
  { method: 'POST',   pattern: /\/billing\/webhook/,         label: '付款 Webhook' },
  { method: 'GET',    pattern: /\/billing\/plans/,           label: '方案列表' },
  { method: 'GET',    pattern: /\/billing\/subscription/,    label: '訂閱狀態' },
  { pattern: /\/billing/,                                     label: '付款相關' },
  // Users
  { method: 'GET',    pattern: /\/users\/me/,                label: '個人資料' },
  { method: 'PUT',    pattern: /\/users\/me/,                label: '更新資料' },
  { method: 'GET',    pattern: /\/users/,                    label: '用戶列表' },
  { method: 'POST',   pattern: /\/users/,                    label: '建立用戶' },
  // Health / system
  { pattern: /\/health/,                                      label: '健康檢查' },
  // Admin
  { pattern: /\/admin/,                                       label: '管理後台' },
  // Dashboard
  { pattern: /\/dashboard/,                                   label: '儀表板' },
  // Referral
  { pattern: /\/referral/,                                    label: '推薦計畫' },
  // Transcript
  { pattern: /\/transcript/,                                  label: '逐字稿' },
  // Relay
  { pattern: /\/relay/,                                       label: '轉發服務' },
];

/**
 * Derive a Chinese label for a DJ selector endpoint card.
 * Falls back to deriving from path segments if no rule matches.
 */
export function deriveEndpointLabel(method: string, path: string): string {
  const m = method.toUpperCase();
  const p = path.toLowerCase();

  for (const rule of ENDPOINT_LABEL_RULES) {
    if (rule.method && rule.method !== m) continue;
    if (rule.pattern.test(p)) return rule.label;
  }

  // Generic fallback: use last meaningful path segment
  const segments = path.split('/').filter((s) => s && !/^\{.*\}$/.test(s) && !/^v\d+$/.test(s) && s !== 'api');
  const last = segments[segments.length - 1];
  if (last) {
    return last.replace(/-/g, ' ').replace(/_/g, ' ');
  }
  return path;
}

// ---------------------------------------------------------------------------
// Step-level: meaningful description from file/label context (DJ-2)
// ---------------------------------------------------------------------------

interface StepDescRule {
  pattern: RegExp;
  label: string;
}

/** File path / method name patterns → Chinese step description */
const STEP_DESC_RULES: StepDescRule[] = [
  // Auth patterns
  { pattern: /jwt|token.*verif|verif.*token|decode.*token/i,  label: 'JWT Token 驗證' },
  { pattern: /auth.*middleware|middleware.*auth/i,             label: '認證中介層' },
  { pattern: /check.*permission|permission.*check|authorize/i, label: '權限確認' },
  { pattern: /session/i,                                       label: '建立 Session' },
  // Video patterns
  { pattern: /upload.*video|video.*upload/i,                   label: '影片上傳處理' },
  { pattern: /process.*video|video.*process/i,                 label: '觸發影片處理' },
  { pattern: /transcode/i,                                     label: '影片轉碼' },
  { pattern: /thumbnail/i,                                     label: '產生縮圖' },
  // Queue / async
  { pattern: /celery|enqueue|push.*queue|queue.*push/i,        label: '推入 Celery 佇列' },
  { pattern: /task.*dispatch|dispatch.*task/i,                 label: '派送背景任務' },
  { pattern: /redis/i,                                         label: '操作 Redis 快取' },
  // Database
  { pattern: /get.*video|video.*get|fetch.*video|video.*fetch/i, label: '查詢影片記錄' },
  { pattern: /save.*video|video.*save|create.*video|video.*create/i, label: '建立影片記錄' },
  { pattern: /delete.*video|video.*delete/i,                   label: '刪除影片記錄' },
  { pattern: /update.*video|video.*update/i,                   label: '更新影片記錄' },
  { pattern: /get.*user|user.*get|fetch.*user/i,               label: '查詢用戶資料' },
  { pattern: /create.*user|user.*create|save.*user/i,          label: '建立用戶' },
  { pattern: /\.save\b|\.create\b|db\.insert/i,                label: '寫入資料庫' },
  { pattern: /\.find\b|\.get\b|db\.query|db\.select/i,         label: '查詢資料庫' },
  // Billing
  { pattern: /stripe|payment.*intent|create.*checkout/i,       label: '建立 Stripe 付款' },
  { pattern: /webhook.*billing|billing.*webhook/i,             label: '處理付款 Webhook' },
  // Services directory
  { pattern: /services?\//i,                                   label: '呼叫服務層' },
  // Repository/model
  { pattern: /repositor|\.model\./i,                           label: '資料存取層' },
  // Serializer / response
  { pattern: /serializ|response.*build|format.*response/i,     label: '序列化回應' },
  // Validation
  { pattern: /validat/i,                                       label: '驗證輸入資料' },
  // Notification
  { pattern: /notif|email|send.*mail/i,                        label: '發送通知' },
  // Logging
  { pattern: /log\b|logger/i,                                  label: '記錄日誌' },
];

/**
 * Generate a meaningful description for a DJ chain step.
 *
 * Strategy (priority order):
 *  1. If step already has a non-empty desc that differs from name → use it
 *  2. Match against STEP_DESC_RULES using combined `name + filePath`
 *  3. Derive from file path (service/module name)
 *  4. Fallback: show file path or empty string
 */
export function deriveStepDesc(name: string, filePath: string): string {
  const combined = `${name} ${filePath}`;

  for (const rule of STEP_DESC_RULES) {
    if (rule.pattern.test(combined)) return rule.label;
  }

  // Derive from filePath: last meaningful path segment without extension
  if (filePath) {
    const segments = filePath.replace(/\\/g, '/').split('/').filter(Boolean);
    const lastSeg = segments[segments.length - 1];
    if (lastSeg) {
      // Remove extension
      const withoutExt = lastSeg.replace(/\.[^.]+$/, '');
      // Convert snake_case/kebab-case to readable
      const readable = withoutExt.replace(/[-_]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
      // Try to produce a meaningful Chinese fallback using path context
      const pathStr = filePath.toLowerCase();
      if (/service/i.test(readable)) return `${readable.replace(/service/i, '').trim()} 服務`;
      if (/controller/i.test(readable)) return `${readable.replace(/controller/i, '').trim()} 控制器`;
      if (/handler/i.test(readable)) return `${readable.replace(/handler/i, '').trim()} 處理器`;
      if (/repositor/i.test(readable)) return '資料存取';
      if (/model/i.test(pathStr)) return '資料模型';
      if (/util|helper/i.test(readable)) return '工具函式';
      if (/middleware/i.test(readable)) return '中介層';
      if (/schema/i.test(readable)) return '資料結構';
      return readable;
    }
  }

  return '';
}

// ---------------------------------------------------------------------------
// Step-level: heuristic INPUT / OUTPUT / TRANSFORM generation (DJ-3)
// ---------------------------------------------------------------------------

export interface HeuristicStepDetail {
  input?: string;
  output?: string;
  transform?: string;
}

/**
 * Generate heuristic INPUT/OUTPUT/TRANSFORM values for a step
 * when the core doesn't provide them.
 */
export function deriveStepDetail(name: string, filePath: string): HeuristicStepDetail {
  const combined = `${name} ${filePath}`.toLowerCase();

  // Auth / JWT
  if (/jwt|token.*verif|verif.*token/.test(combined)) {
    return { input: 'Authorization header (Bearer token)', output: 'decoded user payload', transform: '解碼並驗證 JWT 簽名' };
  }
  if (/auth.*middleware/.test(combined)) {
    return { input: 'HTTP Request headers', output: 'req.user 注入', transform: '解析並驗證認證狀態' };
  }
  // Video upload
  if (/upload.*video|video.*upload/.test(combined)) {
    return { input: 'multipart/form-data (file bytes)', output: 'S3 object key + metadata', transform: '串流上傳至物件儲存' };
  }
  // Video process
  if (/process.*video|video.*process/.test(combined)) {
    return { input: 'video_id', output: 'Celery task_id', transform: '觸發非同步處理管線' };
  }
  // Queue
  if (/celery|enqueue|push.*queue/.test(combined)) {
    return { input: 'task payload (JSON)', output: 'task_id', transform: '序列化並推入訊息佇列' };
  }
  // DB read
  if (/get.*video|fetch.*video|find.*video/.test(combined)) {
    return { input: 'video_id (UUID)', output: 'VideoRecord model', transform: 'SELECT FROM videos WHERE id=?' };
  }
  // DB write
  if (/save.*video|create.*video|\.save|\.create/.test(combined)) {
    return { input: 'VideoRecord 資料', output: '已儲存的 VideoRecord', transform: 'INSERT INTO videos' };
  }
  // Stripe / billing
  if (/stripe|payment.*intent|checkout/.test(combined)) {
    return { input: 'plan_id + user_id', output: 'Stripe checkout session URL', transform: '建立付款工作階段' };
  }
  // Redis
  if (/redis/.test(combined)) {
    return { input: 'cache key', output: 'cached value or null', transform: 'GET/SET Redis key-value' };
  }
  // Serializer
  if (/serializ|format.*response/.test(combined)) {
    return { input: 'model instance', output: 'JSON-serializable dict', transform: '將模型轉換為 API 回應格式' };
  }
  // Validation
  if (/validat/.test(combined)) {
    return { input: 'raw request body', output: 'validated data dict', transform: '欄位驗證與型別轉換' };
  }

  return {};
}
