# CodeAtlas API 設計

> 版本: v6.0 | Sprint 13 | 最後更新: 2026-04-02

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
