# CodeAtlas 資料模型

> 版本: v9.0 | Sprint 16 | 最後更新: 2026-04-07

## 概述

定義 CodeAtlas core 引擎的圖資料模型，包含節點（Node）與邊（Edge）的型別、屬性與 JSON 輸出格式。此模型為 core → web → cli 三層共用的資料契約。

## Sprint 10 擴充 — 節點角色分類（Node Role）

### NodeRole 型別

```typescript
export type NodeRole = 'business-logic' | 'cross-cutting' | 'infrastructure' | 'utility' | 'noise';
```

| 角色 | 值 | 說明 | 策展行為 |
|------|-----|------|---------|
| 業務邏輯 | `business-logic` | route / controller / service / model / handler / page / view | 預設顯示 |
| 橫向切面 | `cross-cutting` | middleware / auth / logging / validation / error-handling / guard | 預設顯示 |
| 基礎設施 | `infrastructure` | config / db / server / connection / setup / bootstrap / migration | 淡化但不隱藏 |
| 輔助 | `utility` | utils / helpers / constants / types / interfaces / enums / shared | 預設隱藏 |
| 噪音 | `noise` | test / spec / mock / fixture / build / CI / script / dist | 預設隱藏 |

### NodeMetadata.role 擴充

```typescript
interface NodeMetadata {
  // ...既有欄位...
  role?: NodeRole;  // Sprint 10 — optional for backward compat
}
```

### 向下相容

- `role` 為 optional 欄位，不破壞任何現有消費端
- 舊版前端讀不到 role 等同不策展，全部顯示
- undefined role 在 web 端當作 `infrastructure` 處理

## Sprint 14 擴充 — MethodRole 9 分類 + AI Contract

### MethodRole 型別

```typescript
// 9 種方法角色分類（zod enum）
export const MethodRoleEnum = z.enum([
  'entrypoint',        // 路由處理器、中間件入口
  'business_core',     // 核心業務邏輯
  'domain_rule',       // 業務規則驗證（計算、判斷）
  'orchestration',     // 流程編排（呼叫多個服務）
  'io_adapter',        // DB/API/檔案 I/O
  'validation',        // 輸入驗證
  'infra',             // 框架設定、中間件註冊
  'utility',           // 工具函式（格式化、轉換）
  'framework_glue',    // 框架膠水程式碼（ORM builder、query chain）
]);
```

### NodeMetadata AI 擴充

```typescript
interface NodeMetadata {
  // ...既有欄位...
  methodRole?: string;        // MethodRole enum 值（Sprint 14）
  roleConfidence?: number;    // 信心度 0-1（Sprint 14）
  aiSummary?: string;         // AI 一句話摘要（Sprint 14）
}
```

### AI Contract Schemas（zod validated）

| Schema | 用途 | 欄位 |
|--------|------|------|
| MethodSummarySchema | 方法摘要 | id, role, confidence, oneLineSummary, businessRelevance?, evidence? |
| MethodRoleClassificationSchema | 角色分類 | id, role, confidence, sourceSignals? |
| ChainExplanationSchema | 呼叫鏈解釋 | chainId, overallPurpose, steps[{stepIndex, methodId, description}] |
| BatchMethodSummarySchema | 批次摘要 | methods[] |
| DirectorySummarySchema | 目錄摘要（Sprint 15） | directoryPath, role, oneLineSummary(max30), keyResponsibilities?, confidence |
| EndpointDescriptionSchema | 端點描述（Sprint 15） | endpointId, method, path, chineseDescription(max20), purpose, confidence |
| StepDetailSchema | 步驟詳情（Sprint 15） | stepIndex, methodId, description(max30), input, output, transform |

### ChainStep 擴充（Sprint 15）

```typescript
export interface ChainStep {
  name: string;
  description?: string;
  method: string;
  className?: string;
  fileId: string;
  input?: string;
  output?: string;
  transform?: string;
  role?: string;           // Sprint 15: MethodRole from rule engine
  roleConfidence?: number; // Sprint 15: Classification confidence 0-1
}
```

### AIAnalysisProvider 介面

```typescript
interface AIAnalysisProvider extends SummaryProvider {
  analyzeMethodBatch(methods: MethodContext[], budget: PromptBudget): Promise<BatchMethodSummary>;
  explainChain(chain: ChainContext, budget: PromptBudget): Promise<ChainExplanation>;
  supportsAnalysis(): boolean;
}
```

### Provider 層級

| Provider | 類型 | 預設模型 |
|----------|------|---------|
| ClaudeCodeProvider | 本地 CLI | claude (已安裝) |
| GeminiProvider | 雲端 API | gemini-2.0-flash |
| OllamaProvider | 本地推論 | gemma3:4b |
| OpenAIProvider | 雲端 API | gpt-4o-mini |
| AnthropicProvider | 雲端 API | claude-3-haiku |
| DisabledProvider | 停用 | — |

## 節點類型（Node Types）

| 類型 | 說明 | Sprint |
|------|------|--------|
| `directory` | 資料夾節點 | 1 |
| `file` | 檔案節點 | 1 |
| `function` | 函式節點 | 7 |
| `class` | 類別節點 | 7 |
| `variable` | 變數/常數節點 | Phase 4+ |

### Node 共用屬性

```typescript
interface GraphNode {
  id: string;                  // 唯一識別（使用相對檔案路徑）
  type: NodeType;              // 'directory' | 'file' | 'function' | 'class'
  label: string;               // 顯示名稱
  filePath: string;            // 相對於專案根目錄的路徑
  metadata: NodeMetadata;      // 附加資訊
}

interface NodeMetadata {
  fileSize?: number;           // bytes
  language?: string;           // 'javascript' | 'typescript'
  exportCount?: number;        // export 數量
  importCount?: number;        // import 數量
  dependencyCount?: number;    // 被依賴次數
  lastModified?: string;       // ISO 8601
}
```

## 邊類型（Edge Types）

| 類型 | 說明 | Sprint |
|------|------|--------|
| `import` | 模組 import/require 依賴 | 1 |
| `export` | 模組 re-export | 1 |
| `data-flow` | 高層資料進出方向（heuristic） | 1 |
| `call` | 函式呼叫關係 | 7 |

### Edge 共用屬性

```typescript
interface GraphEdge {
  id: string;                  // 唯一識別
  source: string;              // 來源 node id
  target: string;              // 目標 node id
  type: EdgeType;              // 'import' | 'export' | 'data-flow' | 'call'
  metadata: EdgeMetadata;      // 附加資訊
}

interface EdgeMetadata {
  importedSymbols?: string[];  // 被 import 的 symbol 名稱
  isDefault?: boolean;         // 是否為 default import
  isDynamic?: boolean;         // 是否為 dynamic import（標記為 heuristic）
  confidence?: 'high' | 'medium' | 'low'; // 分析信心度
}
```

## Graph 輸出格式

```typescript
interface AnalysisResult {
  version: string;             // schema 版本
  projectPath: string;         // 專案根目錄
  analyzedAt: string;          // ISO 8601 分析時間
  stats: AnalysisStats;        // 統計資訊
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  errors: AnalysisError[];     // 解析失敗的檔案
}

interface AnalysisStats {
  totalFiles: number;
  analyzedFiles: number;
  skippedFiles: number;
  failedFiles: number;
  totalNodes: number;
  totalEdges: number;
  analysisDurationMs: number;
}

interface AnalysisError {
  filePath: string;
  error: string;
  phase: 'scan' | 'parse' | 'analyze';
}
```

## Sprint 12 擴充 — 目錄聚合圖（DirectoryGraph）

### DirectoryGraph 型別

```typescript
export interface DirectoryNode {
  id: string;                    // 目錄路徑，如 'src/services'
  label: string;                  // 顯示名，如 'services/'
  type: 'entry' | 'logic' | 'data' | 'support';  // 目錄分類
  fileCount: number;              // 子檔案數
  files: string[];                // 子檔案 ID 列表
  role: NodeRole;                 // 繼承自子節點主要角色
}

export interface DirectoryEdge {
  source: string;                 // 目錄 ID
  target: string;                 // 目錄 ID
  weight: number;                 // 子檔案間依賴的數量
}

export interface DirectoryGraph {
  nodes: DirectoryNode[];
  edges: DirectoryEdge[];
}
```

### 目錄分類規則

| 分類 | 值 | 匹配規則 | 說明 |
|------|-----|---------|------|
| 入口 | `entry` | 含 app.ts / index.ts / main.ts 的目錄 | 應用程式入口 |
| 邏輯 | `logic` | routes / controllers / services / hooks | 業務邏輯 |
| 資料 | `data` | models / db / types / schemas | 資料層 |
| 輔助 | `support` | utils / lib / config / middleware / tests | 輔助工具 |

### 聚合規則

1. 按第一層目錄分組
2. 目錄間邊 = 子檔案間依賴聯集（去重）
3. 同目錄內依賴忽略（無自循環）
4. 扁平專案（≤2 個目錄）回退 → 返回 null

### API 回應擴充

`/api/graph` 回應新增 `directoryGraph` 欄位：

```json
{
  "version": "0.1.0",
  "graph": { "nodes": [...], "edges": [...] },
  "directoryGraph": {
    "nodes": [
      { "id": "src/services", "label": "services/", "type": "logic", "fileCount": 8, "files": [...], "role": "business-logic" }
    ],
    "edges": [
      { "source": "src/services", "target": "src/models", "weight": 5 }
    ]
  }
}
```

`directoryGraph` 為 `null` 時表示扁平專案，web 層回退為檔案視圖。

## 命名規範

| 項目 | 規範 | 範例 |
|------|------|------|
| Node ID | 相對路徑，用 `/` 分隔 | `src/utils/helper.ts` |
| Edge ID | `{source}--{type}--{target}` | `src/app.ts--import--src/utils/helper.ts` |
| JSON 欄位 | camelCase | `fileSize`, `importCount` |
| TypeScript 型別 | PascalCase | `GraphNode`, `EdgeType` |

## Sprint 7 擴充 — 函式級節點與呼叫邊

### 函式/類別節點屬性（NodeMetadata 擴充）

```typescript
interface NodeMetadata {
  // === 既有欄位（Sprint 1）===
  fileSize?: number;
  language?: string;
  exportCount?: number;
  importCount?: number;
  dependencyCount?: number;
  lastModified?: string;

  // === Sprint 7 新增（function/class 節點專用）===
  parentFileId?: string;          // 所屬檔案節點 ID
  kind?: 'function' | 'method' | 'getter' | 'setter' | 'constructor' | 'class';
  parameters?: FunctionParam[];   // 函式參數列表
  returnType?: string;            // 回傳型別（字串形式）
  lineCount?: number;             // 函式/類別行數
  isAsync?: boolean;              // 是否為 async 函式
  isExported?: boolean;           // 是否被 export
  methodCount?: number;           // class 專用：方法數量
}

interface FunctionParam {
  name: string;
  type?: string;       // 型別字串（可能為 undefined 如 JS 無型別）
  isOptional?: boolean;
  isRest?: boolean;    // ...args
}
```

### 呼叫邊屬性（EdgeMetadata 擴充）

```typescript
interface EdgeMetadata {
  // === 既有欄位（Sprint 1）===
  importedSymbols?: string[];
  isDefault?: boolean;
  isDynamic?: boolean;
  confidence?: 'high' | 'medium' | 'low';

  // === Sprint 7 新增（call edge 專用）===
  callerName?: string;            // 呼叫者函式名
  calleeName?: string;            // 被呼叫函式名
  callType?: 'direct' | 'method' | 'new';  // 呼叫類型
}
```

### AnalysisStats 擴充

```typescript
interface AnalysisStats {
  // === 既有欄位 ===
  totalFiles: number;
  analyzedFiles: number;
  skippedFiles: number;
  failedFiles: number;
  totalNodes: number;
  totalEdges: number;
  analysisDurationMs: number;

  // === Sprint 7 新增 ===
  totalFunctions?: number;        // 函式節點數量
  totalClasses?: number;          // 類別節點數量
  totalCallEdges?: number;        // 呼叫邊數量
}
```

### Node ID 規則

| 節點類型 | ID 格式 | 範例 |
|---------|---------|------|
| directory | 相對路徑 | `src/utils` |
| file | 相對路徑 | `src/utils/helper.ts` |
| function | `{fileId}#{functionName}` | `src/utils/helper.ts#formatDate` |
| class | `{fileId}#{className}` | `src/models/user.ts#UserService` |
| method | `{fileId}#{className}.{methodName}` | `src/models/user.ts#UserService.findById` |

### Edge ID 規則（call type）

| 格式 | 範例 |
|------|------|
| `{callerId}--call--{calleeId}` | `src/app.ts#handleLogin--call--src/auth.ts#validateUser` |

### 向下相容

- 既有的 `directory` / `file` 節點完全不變
- 既有的 `import` / `export` / `data-flow` 邊完全不變
- 新增欄位全部為 optional（`?`），舊版前端讀不到不影響
- AnalysisResult.graph.nodes 混合 file 和 function/class 節點
- 前端透過 `parentFileId` 判斷是否為子節點，預設隱藏
- GET /api/graph 預設只回傳 file/directory 節點（向下相容）
- GET /api/graph/functions/:fileId 回傳指定檔案的函式節點（按需載入）

## Sprint 8 擴充 — 影響分析 + 搜尋強化

### 資料模型變更

Sprint 8 **不新增** node type 或 edge type。既有的 `directory` / `file` / `function` / `class` 節點和 `import` / `export` / `data-flow` / `call` 邊完全不變。

Sprint 8 的新功能（影響分析、搜尋聚焦、過濾、右鍵選單）均為 **純前端邏輯**，透過 ViewState 管理狀態，不改動 Graph JSON 資料模型。

### ImpactAnalysisResult（前端型別，非 Graph JSON）

```typescript
/**
 * 影響分析結果 — 純前端計算產物，不存入 Graph JSON
 * 由 analyzeImpact() 純函式計算，存入 ViewState
 */
interface ImpactAnalysisResult {
  impactedNodes: string[];              // 受影響的節點 ID 列表
  impactedEdges: string[];              // 受影響的邊 ID 列表
  depthMap: Record<string, number>;     // nodeId → BFS 深度（0=起點）
}
```

### FilterState（前端型別，非 Graph JSON）

```typescript
/**
 * 過濾狀態 — 純前端，控制哪些節點/邊在圖上顯示
 * 空陣列代表全選（不過濾）
 */
interface FilterState {
  directories: string[];    // 勾選的目錄 ID（空 = 全選）
  nodeTypes: NodeType[];    // 勾選的節點類型（空 = 全選）
  edgeTypes: EdgeType[];    // 勾選的邊類型（空 = 全選）
}
```

### StructureInfo（AI 概述用，不含原始碼）

```typescript
/**
 * 專案結構資訊 — 由 core/ai/overview-builder.ts 從 AnalysisResult 提取
 * 用於 AI 專案概述 prompt 組裝
 * 隱私保證：只含名稱、類型、數量，不含原始碼
 */
interface StructureInfo {
  totalFiles: number;
  totalFunctions: number;
  totalClasses: number;
  topModules: Array<{
    path: string;
    dependencyCount: number;
    importCount: number;
    exportCount: number;
  }>;
  moduleRelationships: Array<{
    source: string;
    target: string;
    edgeCount: number;
  }>;
}
```

### 向下相容

- 既有所有 node type / edge type 完全不變
- Graph JSON schema 無變更
- AnalysisResult 結構無變更
- 新增型別（ImpactAnalysisResult、FilterState、StructureInfo）為純前端/core 內部使用，不影響 Graph JSON 輸出

## Sprint 13 擴充 — API 端點識別 + 智慧目錄聚合

### EndpointGraph 型別（新增）

```typescript
export interface ApiEndpoint {
  id: string;                      // 如 'POST /api/v1/videos/upload'
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;                    // 如 '/api/v1/videos/upload'
  handler: string;                 // handler 函式名
  handlerFileId: string;           // handler 所在檔案 ID
  middlewares?: string[];           // 中間件函式名列表
  description?: string;            // 從註解提取的描述
}

export interface EndpointGraph {
  endpoints: ApiEndpoint[];
  chains: EndpointChain[];          // 每個端點的請求鏈
}

export interface EndpointChain {
  endpointId: string;               // 對應的端點 ID
  steps: ChainStep[];               // 請求鏈步驟
}

export interface ChainStep {
  name: string;                     // 方法名，如 'check_upload_quota()'
  description?: string;             // 步驟描述
  method: string;                   // 方法名
  className?: string;               // 所屬 class
  fileId: string;                   // 所在檔案 ID
  input?: string;                   // 輸入描述
  output?: string;                  // 輸出描述
  transform?: string;               // 轉換邏輯描述
}
```

### DirectoryNode 型別擴充

```typescript
export interface DirectoryNode {
  id: string;
  label: string;
  sublabel?: string;                // Sprint 13: 完整路徑，如 'frontend/src/services/'
  type: 'entry' | 'logic' | 'data' | 'support';
  category?: 'frontend' | 'backend' | 'infra';  // Sprint 13: 卡片分類
  fileCount: number;
  files: string[];
  role: NodeRole;
  autoExpand?: boolean;             // Sprint 13: 是否為智慧展開的子目錄
}
```

### 智慧聚合規則（Sprint 13 升級）

1. 先按第一層目錄聚合（與 Sprint 12 相同）
2. 計算每個目錄的檔案占比（fileCount / totalFiles）
3. 占比 >70% 的目錄自動展開為子目錄
4. 展開後的子目錄成為獨立卡片（autoExpand: true）
5. 維持目錄間依賴正確計算
6. 目標卡片數：5~17

### Category 分類規則

| 分類 | 值 | 匹配規則 |
|------|-----|---------|
| 前端 | `frontend` | 路徑含 frontend / client / web / app / src（純前端） |
| 後端 | `backend` | 路徑含 backend / server / api / routes / models |
| 基礎設施 | `infra` | 其餘（nginx, relay, config, scripts） |

### API 回應擴充

`/api/graph` 回應新增 `endpointGraph` 欄位：

```json
{
  "version": "0.1.0",
  "graph": { "nodes": [...], "edges": [...] },
  "directoryGraph": { ... },
  "endpointGraph": {
    "endpoints": [
      { "id": "POST /api/v1/videos/upload", "method": "POST", "path": "/api/v1/videos/upload", "handler": "uploadVideo", "handlerFileId": "backend/routes/video-api.ts" }
    ],
    "chains": [
      { "endpointId": "POST /api/v1/videos/upload", "steps": [...] }
    ]
  }
}
```

`endpointGraph` 為 `null` 時表示未偵測到 API 端點（非 web 框架專案），web 層回退為檔案級。

### 向下相容

- `endpointGraph` 為 optional 欄位，舊版前端讀不到不影響
- DirectoryNode 新增欄位（sublabel, category, autoExpand）均為 optional
- 既有 Graph JSON schema 不變

## Sprint 16 擴充 — AI 快取資料模型

### AICacheEntry

```typescript
interface AICacheEntry {
  /** Cache key = `${scope}:${targetId}:${provider}:${promptVersion}` */
  key: string;
  /** md5 hash of source content for staleness check */
  contentHash: string;
  /** AI provider that generated this result */
  provider: string;
  /** Prompt version used (e.g. 'v16.0') */
  promptVersion: string;
  /** The cached AI result (JSON-serializable) */
  result: unknown;
  /** ISO timestamp when this entry was created */
  createdAt: string;
}
```

### Cache Key 格式

| Scope | Key 格式 | result 型別 |
|-------|---------|------------|
| method | `method:{nodeId}:{provider}:{promptVersion}` | `string` (oneLineSummary) |
| directory | `directory:{dirPath}:{provider}:{promptVersion}` | `DirectorySummary` |
| endpoint-desc | `endpoint-desc:{epId}:{provider}:{promptVersion}` | `string` (chineseDescription) |
| endpoint-steps | `endpoint-steps:{epId}:{provider}:{promptVersion}` | `StepDetail[]` |

### 失效規則

- contentHash 變更 → stale（需重新分析）
- promptVersion 變更 → 強制失效
- provider 變更 → 不失效（結果仍可用）

### 磁碟格式

```json
{
  "version": 1,
  "entries": [ AICacheEntry, ... ]
}
```

儲存路徑：`.codeatlas/cache/ai-results.json`，5MB LRU eviction。

### AIJob

```typescript
type AIJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cached' | 'canceled';
type AIJobScope = 'directory' | 'method' | 'method-group' | 'endpoint' | 'all' | 'core';

interface AIJob {
  jobId: string;
  scope: AIJobScope;
  target?: string;
  status: AIJobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  force: boolean;
}
```
