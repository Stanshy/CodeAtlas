# CodeAtlas API 設計

> 版本: v9.0 | Sprint 20 | 最後更新: 2026-04-09

## 概述

CodeAtlas 是 local-first 工具，所有 API 都是本地 HTTP server 提供。無雲端 API。

## 本地 Server API

### 基礎資訊

| 項目 | 值 |
|------|---|
| Host | `localhost` |
| Port | `3000`（預設，可設定） |
| 協議 | HTTP |
| 格式 | JSON |

### 端點清單

#### GET /api/health

健康檢查。

**Response:**
```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

#### GET /api/graph

取得分析結果的完整圖資料。

**Response:** `AnalysisResult` JSON（見 data-model.md）

> **Sprint 12 擴充**：回應新增 `directoryGraph` 欄位（`DirectoryGraph | null`）。
> 由 core 層 `aggregateByDirectory()` 產出，供系統框架視角使用。
> 扁平專案（≤2 個目錄）回傳 `null`，web 層回退為檔案視圖。
>
> **Sprint 13 擴充**：回應新增 `endpointGraph` 欄位（`EndpointGraph | null`）。
> 由 core 層 `detectEndpoints()` + `buildEndpointChains()` 產出，供資料旅程/邏輯運作視角使用。
> 非 web 框架專案（未偵測到 Express/Fastify 端點）回傳 `null`，web 層回退為檔案級。
>
> **Sprint 13 DirectoryGraph 升級**：DirectoryNode 新增 `sublabel`、`category`、`autoExpand` 欄位。
> 智慧聚合：占比 >70% 的目錄自動展開為子目錄卡片。

#### GET /api/graph/stats

取得分析統計資訊。

**Response:** `AnalysisStats` JSON

#### GET /api/node/:id

取得單一節點的詳細資訊。

**Parameters:**
- `id`: URL encoded node ID（相對路徑）

**Response:**
```json
{
  "node": { ... },
  "edges": [ ... ],
  "sourceCode": "..."
}
```

#### GET /api/ai/status

查詢 AI Provider 是否已設定。

**Response:**
```json
{
  "enabled": true,
  "provider": "openai"
}
```

> Sprint 3 新增。前端用於判斷是否顯示 AI 摘要區塊。

#### POST /api/ai/summary

呼叫 AI Provider 產生節點摘要。

**Request:**
```json
{
  "nodeId": "src/utils/helper.ts",
  "provider": "openai"
}
```

**Response:**
```json
{
  "nodeId": "src/utils/helper.ts",
  "summary": "這個模組提供字串處理的工具函式...",
  "provider": "openai",
  "cached": false
}
```

**錯誤（AI 未設定）:**
```json
{
  "error": "ai_not_configured",
  "message": "No API key configured. Set in .codeatlas.json or use --ai-key flag."
}
```

## CLI 指令介面

| 指令 | 說明 | Sprint |
|------|------|--------|
| `codeatlas analyze [path]` | 掃描專案並輸出分析結果 | 1 |
| `codeatlas web [path]` | 啟動本地 Web UI | 1 |
| `codeatlas --help` | 顯示說明 | 1 |
| `codeatlas --version` | 顯示版本 | 1 |
| `codeatlas export` | 匯出分析結果 | Phase 2+ |

### CLI Flags

| Flag | 說明 | 預設值 |
|------|------|--------|
| `--port` | Web server port | `3000` |
| `--verbose` | 顯示詳細掃描日誌 | `false` |
| `--ignore` | 額外忽略的目錄/檔案 pattern | `[]` |
| `--ai-key` | AI provider API key | 無 |
| `--ai-provider` | AI provider 名稱 | `disabled` |

## 錯誤碼

| 代碼 | HTTP Status | 說明 |
|------|-------------|------|
| `ai_not_configured` | 400 | AI Provider 未設定 |
| `node_not_found` | 404 | 指定的 node ID 不存在 |
| `analysis_not_ready` | 503 | 分析尚未完成 |
| `file_not_found` | 404 | 指定的檔案節點不存在（Sprint 7） |

## Sprint 7 新增端點

### GET /api/graph/functions/:fileId

> Sprint 7 新增。按需載入指定檔案的函式/class 子節點和 call 邊。

取得指定檔案內部的函式級節點與呼叫邊。

**Parameters:**
- `fileId`: URL encoded file node ID（相對路徑）

**Response:**
```json
{
  "fileId": "src/utils/helper.ts",
  "nodes": [
    {
      "id": "src/utils/helper.ts#formatDate",
      "type": "function",
      "label": "formatDate",
      "filePath": "src/utils/helper.ts",
      "metadata": {
        "parentFileId": "src/utils/helper.ts",
        "kind": "function",
        "parameters": [{ "name": "date", "type": "Date" }],
        "returnType": "string",
        "lineCount": 12,
        "isAsync": false,
        "isExported": true
      }
    }
  ],
  "edges": [
    {
      "id": "src/utils/helper.ts#formatDate--call--src/utils/format.ts#pad",
      "source": "src/utils/helper.ts#formatDate",
      "target": "src/utils/format.ts#pad",
      "type": "call",
      "metadata": {
        "callerName": "formatDate",
        "calleeName": "pad",
        "callType": "direct",
        "confidence": "high"
      }
    }
  ]
}
```

**錯誤（檔案不存在）:**
```json
{
  "error": "file_not_found",
  "message": "File node not found: src/unknown.ts"
}
```

### GET /api/graph 行為變更

Sprint 7 起，`GET /api/graph` **預設只回傳 file/directory 級別節點**（向下相容）。

新增 query parameter：
- `?include=functions`：包含函式/class 級別節點與 call 邊
- 預設（無參數）：僅 file/directory 節點 + import/export/data-flow 邊

## Sprint 8 新增端點

### POST /api/ai/overview

> Sprint 8 新增。AI 生成專案架構概述，只送結構資訊不送原始碼。

**Request:**
```json
{
  "provider": "openai"
}
```

> `provider` 為 optional，省略時使用設定檔或 CLI flag 指定的 provider。

**Response:**
```json
{
  "overview": "這是一個使用 TypeScript 的 monorepo 專案，包含 3 個 package...",
  "provider": "openai",
  "cached": false,
  "structureInfo": {
    "totalFiles": 156,
    "totalFunctions": 423,
    "topModules": [
      { "path": "src/core/analyzer.ts", "dependencyCount": 12 },
      { "path": "src/utils/helper.ts", "dependencyCount": 8 }
    ]
  }
}
```

**錯誤（AI 未設定）:**
```json
{
  "error": "ai_not_configured",
  "message": "No API key configured. Set in .codeatlas.json or use --ai-key flag."
}
```

**錯誤（概述生成失敗）:**
```json
{
  "error": "ai_overview_failed",
  "message": "Failed to generate project overview: {detail}"
}
```

### POST /api/ai/search-keywords（P1）

> Sprint 8 P1 新增。AI 從自然語言描述提取搜尋關鍵字。

**Request:**
```json
{
  "query": "處理登入的邏輯",
  "provider": "openai"
}
```

> `provider` 為 optional。

**Response:**
```json
{
  "keywords": ["login", "auth", "handleLogin", "validateUser"],
  "originalQuery": "處理登入的邏輯"
}
```

**錯誤（AI 未設定）:**
```json
{
  "error": "ai_not_configured",
  "message": "No API key configured. Set in .codeatlas.json or use --ai-key flag."
}
```

## Sprint 8 新增錯誤碼

| 代碼 | HTTP Status | 說明 |
|------|-------------|------|
| `ai_overview_failed` | 500 | AI 專案概述生成失敗 |

## Sprint 16 新增端點

### POST /api/ai/analyze

> Sprint 16 新增。觸發按需 AI 分析 job。

**Request:**
```json
{
  "scope": "directory",
  "target": "src/services",
  "force": false
}
```

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| scope | string | ✅ | `directory` / `method` / `method-group` / `endpoint` / `all` / `core` |
| target | string | ❌ | 目標路徑 / ID（scope=all/core 時省略） |
| force | boolean | ❌ | 強制重新分析（忽略 cache），預設 false |

**Response:**
```json
{
  "ok": true,
  "job": {
    "jobId": "directory-src/services-1712505600000",
    "scope": "directory",
    "target": "src/services",
    "status": "queued",
    "createdAt": "2026-04-07T12:00:00.000Z",
    "force": false
  }
}
```

**Job 狀態流轉**: `queued → running → succeeded / failed / cached / canceled`

**重複提交策略**:
- 同一 scope+target 已有 running job → 回傳該 job
- Cache hit 且 force=false → 回傳 status=cached 的 job

### GET /api/ai/jobs/:jobId

> Sprint 16 新增。查詢 AI 分析 job 狀態。

**Response:**
```json
{
  "ok": true,
  "job": {
    "jobId": "directory-src/services-1712505600000",
    "scope": "directory",
    "status": "succeeded",
    "createdAt": "2026-04-07T12:00:00.000Z",
    "startedAt": "2026-04-07T12:00:01.000Z",
    "completedAt": "2026-04-07T12:00:15.000Z",
    "force": false
  }
}
```

**錯誤（Job 不存在）:**
```json
{ "ok": false, "message": "Job not found" }
```

### POST /api/ai/configure

> Sprint 16 新增。即時切換 AI Provider。

**Request:**
```json
{
  "provider": "gemini",
  "apiKey": "optional-api-key"
}
```

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| provider | string | ✅ | `openai` / `anthropic` / `ollama` / `claude-code` / `gemini` / `disabled` |
| apiKey | string | ❌ | API key（可選） |

**Response:**
```json
{
  "ok": true,
  "provider": "gemini",
  "persisted": true,
  "message": "設定已儲存"
}
```

### GET /api/ai/status（Sprint 16 更新）

**Response 新增欄位:**
```json
{
  "enabled": true,
  "provider": "ollama",
  "mode": "local",
  "privacyLevel": "full",
  "model": "gemma3:4b",
  "cacheSize": 42,
  "metrics": {
    "totalJobs": 12,
    "successCount": 10,
    "failCount": 1,
    "cacheHitCount": 1,
    "cacheHitRate": 0.08,
    "analyzeSuccessRate": 0.83
  }
}
```

## Sprint 16 新增錯誤碼

| 代碼 | HTTP Status | 說明 |
|------|-------------|------|
| (400) | 400 | POST /api/ai/analyze 缺少 scope 或 scope 無效 |
| (400) | 400 | POST /api/ai/configure 缺少 provider 或 provider 無效 |
| (404) | 404 | GET /api/ai/jobs/:jobId job 不存在 |

## Sprint 19 新增端點

### GET /api/wiki

> Sprint 19 新增。取得 Wiki 知識庫 manifest。

讀取最近一次 `codeatlas wiki` 產出的 `wiki-manifest.json`。

**Response（wiki 已產生）:**
```json
{
  "status": "ready",
  "generatedAt": "2026-04-08T12:00:00.000Z",
  "nodes": [],
  "edges": [],
  "stats": {
    "pageCount": 42,
    "linkCount": 156,
    "deadLinks": 0,
    "coverage": 0.875
  },
  "pages": [
    {
      "slug": "module--src--auth",
      "mdPath": "modules/module--src--auth.md",
      "type": "module",
      "displayName": "Auth Module",
      "lang": "typescript",
      "hasAiContent": false
    }
  ]
}
```

**Response（wiki 未產生）:**
```json
{
  "status": "not_generated",
  "message": "Wiki has not been generated. Run 'codeatlas wiki' first."
}
```

### GET /api/wiki/page/:slug

> Sprint 19 新增。Lazy load 單頁 .md 內容。

**Parameters:**
- `slug`: Wiki page slug（如 `module--src--auth`）

**Response:**
```json
{
  "slug": "module--src--auth",
  "content": "---\nid: module:src/auth\ntype: module\n...",
  "frontmatter": {
    "id": "module:src/auth",
    "type": "module",
    "displayName": "Auth Module",
    "lang": "typescript"
  }
}
```

**錯誤（頁面不存在）:**
```json
{ "error": "Page not found", "slug": "unknown-slug" }
```
HTTP 404

### POST /api/wiki/analyze

> Sprint 19 新增。觸發單頁 AI 深度分析，復用 Sprint 16 Job 狀態機。

**Request:**
```json
{
  "slug": "module--src--auth",
  "scope": "module"
}
```

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| slug | string | ✅ | Wiki page slug |
| scope | string | ❌ | `module` / `file` / `endpoint` / `method`，預設 `module` |

**Response:**
```json
{
  "jobId": "wiki-analyze-module--src--auth"
}
```

**Job polling**: 復用 `GET /api/ai/jobs/:jobId`（Sprint 16）。

**成功後行為**:
- AI 結果覆寫 `.md` 檔案的 Description 區段
- `wiki-manifest.json` 中對應 page 的 `hasAiContent` 設為 `true`
- 骨架內容不受影響

**錯誤:**
- 400: AI provider 未設定
- 404: slug 在 manifest 中不存在

## Sprint 19 新增 CLI 指令

| 指令 | 說明 | Sprint |
|------|------|--------|
| `codeatlas wiki [path]` | 產出互連 .md 知識庫到 `.codeatlas/wiki/` | 19 |

### CLI Flags（wiki 指令）

| Flag | 說明 | 預設值 |
|------|------|--------|
| `--output <dir>` | 輸出目錄 | `.codeatlas/wiki` |
| `--ai` | 觸發 AI 深度分析 | `false` |

## Sprint 19 新增錯誤碼

| 代碼 | HTTP Status | 說明 |
|------|-------------|------|
| (400) | 400 | POST /api/wiki/analyze slug 格式不合法或 AI 未設定 |
| (404) | 404 | GET /api/wiki/page/:slug 或 POST /api/wiki/analyze slug 不存在 |

## Sprint 20 新增端點

> Sprint 20 啟動體驗改造：零參啟動 + 歡迎頁 + 進度頁 + 專案切換。

### GET /api/project/status

取得 Server 當前運行狀態。

**Response:**
```json
{
  "mode": "idle",
  "currentPath": "/path/to/project",
  "projectName": "project"
}
```

| 欄位 | 型別 | 說明 |
|------|------|------|
| mode | `"idle"` \| `"analyzing"` \| `"ready"` | Server 模式 |
| currentPath | string? | 當前專案路徑（idle 時可能缺）|
| projectName | string? | 當前專案目錄名 |

### POST /api/project/validate

驗證路徑是否為有效專案目錄。

**Request:**
```json
{
  "path": "/path/to/project"
}
```

**Response（有效）:**
```json
{
  "valid": true,
  "stats": {
    "fileCount": 156,
    "languages": ["typescript", "javascript"]
  }
}
```

**Response（無效）:**
```json
{
  "valid": false,
  "reason": "no_source_files"
}
```

| reason 值 | 說明 |
|-----------|------|
| `not_found` | 路徑不存在 |
| `not_directory` | 不是目錄 |
| `no_source_files` | 目錄內無 JS/TS/Python/Java 原始碼 |
| `path_too_long` | 路徑超過 4096 字元 |

**安全防護**: 拒絕包含 null byte 的路徑，防止 path traversal。

### POST /api/project/analyze

觸發專案分析 job（fire-and-forget）。Server 轉入 `analyzing` 模式。

**Request:**
```json
{
  "path": "/path/to/project"
}
```

**Response (202 Accepted):**
```json
{
  "jobId": "project-1712505600000-a1b2c3"
}
```

**行為**:
1. 建立分析 job → 回傳 job_id（202）
2. 背景執行 scan → parse → build 管線
3. 每步更新 AnalysisProgress，推送給 SSE 訂閱者
4. 完成後寫入 `.codeatlas/analysis.json`，server 轉為 `ready`
5. 失敗時 server 退回 `idle`

**AI 設定讀取**: 分析啟動時，若 Web 端未主動 configure（`aiConfiguredByWeb=false`），從專案目錄 `.codeatlas.json` 讀取 AI 設定。優先級鏈：Web 設定 > CLI flag > .codeatlas.json > env > default。

### GET /api/project/progress/:jobId

查詢分析 job 進度。支援 SSE（即時推送）和 JSON polling（快照）。

**SSE 模式**（`Accept: text/event-stream`）:
```
data: {"jobId":"...","status":"scanning","stages":{...},"startedAt":"..."}

data: {"jobId":"...","status":"parsing","stages":{...},"startedAt":"..."}

data: {"jobId":"...","status":"completed","stages":{...},"startedAt":"...","completedAt":"..."}
```

**Polling 模式**（預設）:
```json
{
  "jobId": "project-1712505600000-a1b2c3",
  "status": "scanning",
  "stages": {
    "scanning": { "status": "running", "progress": 45, "current": "src/utils/helper.ts", "total": 156, "done": 70 },
    "parsing": { "status": "pending", "progress": 0 },
    "building": { "status": "pending", "progress": 0 }
  },
  "startedAt": "2026-04-09T12:00:00.000Z"
}
```

**AnalysisProgress 狀態流轉**: `queued → scanning → parsing → building → [ai_analyzing] → completed | failed`

**StageProgress**:

| 欄位 | 型別 | 說明 |
|------|------|------|
| status | `"pending"` \| `"running"` \| `"completed"` \| `"skipped"` \| `"failed"` | 階段狀態 |
| progress | number | 0-100 百分比 |
| current | string? | 當前處理的檔案名 |
| total | number? | 總項目數 |
| done | number? | 已完成項目數 |

**錯誤:**
- 400: job_id 無效
- 404: job 不存在

### GET /api/project/recent

取得最近開啟的專案清單。

**Response:**
```json
[
  {
    "path": "/path/to/project",
    "name": "project",
    "lastOpened": "2026-04-09T12:00:00.000Z",
    "stats": {
      "fileCount": 156,
      "languages": ["typescript"]
    }
  }
]
```

最多 10 筆，按 `lastOpened` 降序。儲存位置：`~/.codeatlas/recent.json`。

### DELETE /api/project/recent/:index

從最近專案清單中移除指定項目。

**Parameters:**
- `index`: 項目索引（0-based 非負整數）

**Response:**
```json
{ "success": true }
```

**錯誤:**
- 400: index 非有效非負整數

## Sprint 20 新增 CLI 行為

| 指令 | 說明 | Sprint |
|------|------|--------|
| `codeatlas`（零參數） | 等同 `codeatlas web`，server mode=idle，自動開瀏覽器 | 20 |

### CLI Flag 優先級鏈（Sprint 20 更新）

AI Provider 設定的優先級（高→低）：
1. Web 端 `POST /api/ai/configure`（`aiConfiguredByWeb` 旗標）
2. CLI flag（`--ai-provider`、`--ai-key`）
3. 專案目錄 `.codeatlas.json`
4. 環境變數
5. 預設值（disabled）

## Sprint 20 新增錯誤碼

| 代碼 | HTTP Status | 說明 |
|------|-------------|------|
| `invalid_request` | 400 | POST /api/project/validate 或 /analyze 缺少 path |
| `invalid_path` | 400 | POST /api/project/analyze 路徑含無效字元 |
| `invalid_job_id` | 400 | GET /api/project/progress/:jobId id 無效 |
| `job_not_found` | 404 | GET /api/project/progress/:jobId job 不存在 |
| `invalid_index` | 400 | DELETE /api/project/recent/:index 非有效索引 |
