# Sprint 13 架構設計：方法/端點級三視角

> **版本**: v1.0
> **撰寫者**: Tech Lead (L1)
> **日期**: 2026-04-02
> **Sprint**: 13
> **提案書**: `proposal/sprint13-proposal.md`
> **開發計畫書**: `proposal/sprint13-dev-plan.md`
> **技術規格書**: `proposal/references/sprint13/method-level-mockup-spec.md`

---

## 1. 概覽

Sprint 13 是 CodeAtlas 資料顆粒度的根本升級。Sprint 12 完成了白紙黑格視覺語言，但三種故事視角的資料層仍停留在檔案級（file-level）。本 Sprint 將全部三個視角從檔案/目錄粒度下鑽到方法/端點粒度。

### 1.1 三視角升級摘要

| 視角 | Sprint 12（現狀） | Sprint 13（目標） |
|------|-------------------|-------------------|
| 資料旅程 (DJ) | 檔案入口 + 檔案依賴追蹤 | API 端點入口 + 請求鏈追蹤（endpoint → middleware → service → model） |
| 邏輯運作 (LO) | 節點 dimmed + click 聚焦 | 分類群組卡片 → click 方法 → dagre TB 呼叫鏈流程圖 |
| 系統框架 (SF) | 目錄卡片（靜態） | 智慧目錄聚合（>70% 自動展開）+ click-select + BFS 高亮 |

### 1.2 影響範圍

- **core 層（新增）**: `endpoint-detector.ts`
- **core 層（修改）**: `directory-aggregator.ts`
- **web 層（新增）**: `SFDetailPanel`, `LODetailPanel`, `DJPanel`, method-level 節點元件
- **web 層（修改）**: `GraphCanvas.tsx`, `graph-adapter.ts`, `RightPanel.tsx`
- **cli 層（修改）**: `server.ts` — `/api/graph` 回應加入 `endpointGraph` 欄位

### 1.3 不改動範圍

- Sprint 7 的 `call` edge 資料結構與 BFS chain tracing 邏輯（endpoint-detector 直接復用）
- Sprint 11 的 `PerspectiveName` / `PerspectivePreset` 型別系統
- Sprint 12 的白紙黑格（`--bg-paper` / `--grid-line`）視覺設計語言
- 既有 `/api/health`、`/api/graph/stats`、`/api/node/:id` 端點

---

## 2. Core 層：端點偵測模組

**新增檔案**: `packages/core/src/analyzers/endpoint-detector.ts`

### 2.1 型別定義

```typescript
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ApiEndpoint {
  id: string;             // 唯一識別，格式：{method}:{path}，如 POST:/api/v1/videos/upload
  method: HttpMethod;
  path: string;           // 完整路由路徑，如 /api/v1/videos/upload
  handler: string;        // handler 函式名稱
  handlerFileId: string;  // handler 所在檔案的 GraphNode.id
  middlewares: string[];  // 中間件名稱陣列（按執行順序）
  description?: string;   // 從 JSDoc / 函式名推導
}

export interface ChainStep {
  name: string;           // 方法/函式名稱
  description: string;    // 可讀說明（從命名推導）
  method?: string;        // class method（若在 class 內）
  className?: string;     // 所屬 class 名稱（若有）
  fileId: string;         // 所在檔案的 GraphNode.id
  input?: string;         // 輸入型別描述
  output?: string;        // 輸出型別描述
  transform?: string;     // 資料轉換說明
}

export interface EndpointChain {
  endpointId: string;     // 對應 ApiEndpoint.id
  steps: ChainStep[];     // 按執行順序排列，含 handler 本身
}

export interface EndpointGraph {
  endpoints: ApiEndpoint[];
  chains: EndpointChain[];
}
```

### 2.2 框架模式比對

偵測範圍限定為專案中常見的 Express Router/App 與 Fastify 標準語法。

**Express 模式**：

| 語法形式 | 範例 |
|---------|------|
| `router.METHOD(path, handler)` | `router.post('/upload', uploadHandler)` |
| `app.METHOD(path, handler)` | `app.get('/health', healthCheck)` |
| `router.use(path, handler)` | `router.use('/auth', authMiddleware)` |
| 多中間件形式 | `router.post('/upload', validate, auth, uploadHandler)` |

**Fastify 模式**：

| 語法形式 | 範例 |
|---------|------|
| `fastify.route({ method, url, handler })` | 物件配置形式 |
| `fastify.METHOD(url, handler)` | 鏈式呼叫形式 |

非 web 專案（未偵測到任何路由定義）回傳 `null`。

### 2.3 BFS 呼叫鏈追蹤

復用 Sprint 7 `graph-builder` 產出的 `call` 類型 edges 進行 BFS 追蹤。

```
detectChain(endpoint: ApiEndpoint, callEdges: GraphEdge[]):
  起點 = endpoint.handlerFileId + '#' + endpoint.handler
  BFS 遍歷 call edges（僅走 source → target 方向）
  深度上限 = 10
  每個訪問節點對應一個 ChainStep（
    從 FunctionNode.metadata.parentFileId + kind + parameters + returnType 取資訊
  )
  排除：
    - 第三方套件呼叫（callEdge.metadata.confidence === 'low' 且 target 無 fileId）
    - 全域函式（console.*、Math.*、JSON.*）
  回傳有序 ChainStep[]
```

### 2.4 錯誤隔離

```typescript
try {
  // 端點偵測 + chain tracing
} catch (err) {
  // 不影響主圖資料 — 回傳 null
  return null;
}
```

### 2.5 效能邊界

| 指標 | 限制 |
|------|------|
| BFS 深度上限 | 10 |
| 最大端點數量 | 200（超過僅取前 200，依路徑字母排序） |
| 單端點 chain 最大步數 | 20 |

---

## 3. Core 層：智慧目錄聚合升級

**修改檔案**: `packages/core/src/analyzers/directory-aggregator.ts`

### 3.1 DirectoryNode 擴充欄位

```typescript
interface DirectoryNode {
  // ...既有欄位（向下相容，不刪除）...

  // Sprint 13 新增欄位（全部 optional）
  category?: 'frontend' | 'backend' | 'infra';
  sublabel?: string;      // 完整相對路徑，如 'frontend/src/services/'
  autoExpand?: boolean;   // >70% 檔案份額時自動展開
}
```

### 3.2 分類偵測規則

| 分類 | 目錄名稱關鍵字（任一匹配即分類） |
|------|-------------------------------|
| `frontend` | `frontend`, `client`, `web`, `ui`, `pages`, `views`, `components` |
| `backend` | `backend`, `server`, `api`, `routes`, `controllers`, `services`, `models` |
| `infra` | 其餘（含 `config`, `scripts`, `ci`, `tools`, `docker` 等） |

偵測順序：先比對完整目錄名，再比對路徑片段。

### 3.3 智慧展開邏輯

```
calculateAutoExpand(dirNode: DirectoryNode, allDirNodes: DirectoryNode[]):
  totalFiles = 所有目錄的檔案數總和
  dirFileShare = dirNode.fileCount / totalFiles

  if dirFileShare > 0.70:
    autoExpand = true   // 此目錄過於龐大，展開為子目錄卡片
  else:
    autoExpand = false
```

目標結果：SF 視角渲染 5~17 張卡片（聚合後）。

---

## 4. 系統框架視角（Tab 1）

### 4.1 初始畫面

`directory-aggregator` 產出的 `DirectoryNode[]` 套用智慧展開後渲染為卡片群組，目標卡片數量 5~17。

**卡片結構**：

```
┌─────────────────────────────┐
│ 5px accent color bar（頂部） │
├─────────────────────────────┤
│  [icon]  目錄名稱            │
│          badge（分類標籤）   │
│          sublabel（完整路徑）│
└─────────────────────────────┘
```

分類顏色（accent bar + badge）：

| 分類 | 顏色 |
|------|------|
| `backend` | `#1565c0` |
| `frontend` | `#7b1fa2` |
| `infra` | `#546e7a` |

### 4.2 互動行為

Sprint 12 的 hover 高亮替換為 **click-select + BFS 高亮**：

- 單擊卡片 → 選中（border 加粗）+ BFS 高亮相鄰卡片（雙向，depth=3）
- 非高亮卡片 opacity 降至 0.2
- 再次單擊同一卡片 → 取消選中，全部恢復
- BFS 演算法復用 Sprint 11 `useBfsHoverHighlight`（`maxDepth=3`）

### 4.3 邊路徑計算

Edge 渲染改用 `calcEdgePath`，支援垂直/水平 Bezier 曲線以避免連線穿越卡片。

```typescript
function calcEdgePath(
  source: { x: number; y: number; width: number; height: number },
  target: { x: number; y: number; width: number; height: number },
): string {
  // 判斷主軸方向（dx > dy → 水平 Bezier，反之 → 垂直 Bezier）
  // 控制點偏移量 = 主軸距離 * 0.4
}
```

### 4.4 右側面板：SFDetailPanel

寬度 300px，點選卡片後顯示。

| 區塊 | 內容 |
|------|------|
| Stats | 檔案數、行數、export 數 |
| Files（可展開） | 目錄內檔案清單，預設折疊 |
| Upstream | 依賴此目錄的其他目錄（BFS 1 hop） |
| Downstream | 此目錄依賴的其他目錄（BFS 1 hop） |

---

## 5. 邏輯運作視角（Tab 2）

### 5.1 初始畫面：分類群組卡片

使用 dagre TB 佈局渲染 5 張分類群組卡片。

| 群組 | 顏色 | 典型內容 |
|------|------|---------|
| routes | `#1565c0` | API 路由定義函式 |
| middleware | `#6a1b9a` | 請求前處理函式 |
| services | `#1b5e20` | 業務邏輯函式 |
| models | `#bf360c` | 資料存取函式 |
| utils | `#37474f` | 工具函式 |

**卡片尺寸規格**：

| 屬性 | 值 |
|------|-----|
| 卡片寬度 | 240px |
| 每行方法高度 | 24px |
| Header 高度 | 36px |
| 垂直 padding（上下各） | 12px |
| 超過 5 個方法 | 折疊，顯示展開按鈕 |

**群組依賴箭頭**：dashed，顏色 `#bbb`，`stroke-dasharray: 6 3`，`opacity: 0.6`。

### 5.2 Drilldown 流程圖

點擊任一方法名稱後觸發：

1. 群組卡片淡出（`opacity` → 0，`duration: 200ms`）
2. dagre TB 呼叫鏈流程圖淡入

**流程圖節點規格**：

| 屬性 | 值 |
|------|-----|
| 節點寬度 | 200px |
| 節點高度 | 44px |
| 層間距（dagre `ranksep`） | 100px |

**預定義 Chain 對照**（3 條示範用途）：

| Chain ID | 觸發方法 | 步數 |
|---------|---------|------|
| `upload` | uploadVideo 等上傳相關方法 | 10 |
| `query` | getVideos 等查詢相關方法 | 7 |
| `auth` | login、authenticate 等認證方法 | 6 |

`LO_METHOD_TO_CHAIN` 映射表共 44 條方法到 chain 的對應關係，定義在 web 層常數檔案。

### 5.3 右側面板：LODetailPanel

寬度 300px，drilldown 後顯示。

| 欄位 | 說明 |
|------|------|
| 方法簽名 | `methodName(params): returnType` |
| 所屬 Class | 類別名稱（若有） |
| 檔案路徑 | `parentFileId` 對應的相對路徑 |
| Callers | 呼叫此方法的上游（來自 Sprint 7 call edges） |
| Callees | 此方法呼叫的下游 |
| Complexity | 函式行數作為複雜度代理指標 |
| 預估執行時間 | 靜態分析估算（async/await 計數 × 基礎值） |

**Clear 按鈕**：重建群組卡片，恢復初始畫面。

---

## 6. 資料旅程視角（Tab 3）

### 6.1 初始畫面：端點選擇器

`EndpointGraph.endpoints` 依 URL prefix 自動分類展示。

**端點卡片規格**：

| 屬性 | 值 |
|------|-----|
| 尺寸 | 260×64px |
| 邊框 | `2px dashed`，分類顏色，opacity 0.6 |
| 頂部 accent bar | 分類顏色，高 4px |
| 動畫 | pulse（邊框 opacity 0.6 ↔ 0.2，1.5s loop） |

### 6.2 Stagger 動畫播放

點擊端點卡片後加載對應 `EndpointChain.steps`：

| 動畫參數 | 值 |
|---------|-----|
| 每步延遲 | 350ms |
| 節點 fadeIn 持續時間 | 20ms |
| 邊出現時機 | 前一節點出現後 0.8 步 |

**步驟節點規格**：

| 屬性 | 值 |
|------|-----|
| 尺寸 | 340×76px |
| 標題行 | `Step N`（灰色標籤）|
| 內容行 1 | 方法名稱（加粗） |
| 內容行 2 | 描述文字（`ChainStep.description`） |

### 6.3 右側面板：DJPanel

寬度 300px。

**面板結構**：

- Journey 標題（端點 method + path）
- 步驟列表（全部步驟，3 種狀態）
- 步驟詳情展開（點擊步驟名稱）

**步驟狀態**：

| 狀態 | 視覺 |
|------|------|
| `unreached` | 灰色文字，無圖示 |
| `active` | 綠色文字 + 發光邊框（`box-shadow: 0 0 8px rgba(46,125,50,0.4)`） |
| `completed` | 綠色文字 + 實心勾號 |

**步驟詳情區塊**（展開後顯示）：

| 欄位 | 資料來源 |
|------|---------|
| Input | `ChainStep.input` |
| Output | `ChainStep.output` |
| Transform | `ChainStep.transform` |
| Method + File | `ChainStep.name` + `ChainStep.fileId` |

**控制按鈕**：Replay（重播，重置到 step 0 後自動播放）、Clear（清除 chain，回到端點選擇器）。

---

## 7. 三右側面板架構

### 7.1 RightPanel 容器

`packages/web/src/components/RightPanel.tsx` 依當前 `activePerspective` 切換渲染目標。

```typescript
function RightPanel({ activePerspective, selectedNode, journeyState }: RightPanelProps) {
  switch (activePerspective) {
    case 'system-framework':  return <SFDetailPanel node={selectedNode} />;
    case 'logic-operation':   return <LODetailPanel node={selectedNode} />;
    case 'data-journey':      return <DJPanel journey={journeyState} />;
  }
}
```

### 7.2 面板規格對照

| 面板 | 寬度 | 觸發條件 | 主要資料來源 |
|------|------|---------|------------|
| `SFDetailPanel` | 300px | 點選目錄卡片 | `DirectoryNode` + import/export edges |
| `LODetailPanel` | 300px | drilldown 至方法節點 | `FunctionNode.metadata` + call edges |
| `DJPanel` | 300px | 點選端點卡片後持續顯示 | `EndpointChain.steps` |

---

## 8. 方法 → 位置映射

所有方法節點顯示三段資訊：

```
{methodName}           ← FunctionNode.label
{className}            ← FunctionNode.metadata.parentClass（Sprint 7）
{fileRelativePath}     ← FunctionNode.metadata.parentFileId 對應的 filePath
```

資料來源為 Sprint 7 產出的 `FunctionNode`，相關 metadata 欄位：

| 欄位 | 型別 | 說明 |
|------|------|------|
| `parentFileId` | `string` | 所在檔案的 GraphNode.id |
| `kind` | `'function' \| 'method' \| 'class'` | 節點種類 |
| `parameters` | `FunctionParam[]` | 參數列表（含型別） |
| `returnType` | `string \| undefined` | 回傳型別 |
| `className` | `string \| undefined` | 所屬 class（method 節點專用） |

方法簽名組裝：

```typescript
function buildMethodSignature(fn: FunctionNode): string {
  const params = fn.metadata.parameters
    ?.map(p => `${p.name}${p.isOptional ? '?' : ''}: ${p.type ?? 'unknown'}`)
    .join(', ') ?? '';
  const ret = fn.metadata.returnType ?? 'void';
  return `${fn.label}(${params}): ${ret}`;
}
```

---

## 9. API 變更

### 9.1 GET /api/graph 回應擴充

Sprint 13 在既有 `AnalysisResult` 回應中新增 `endpointGraph` 欄位。

```typescript
interface AnalysisResult {
  // ...既有欄位（不改動）...

  // Sprint 12 已有
  directoryGraph: DirectoryGraph | null;

  // Sprint 13 新增
  endpointGraph: EndpointGraph | null;
  // null 條件：非 web 專案（無路由偵測結果）
}
```

### 9.2 cli/server.ts 修改

`packages/cli/src/server.ts` 在組裝 `/api/graph` 回應時：

```typescript
const endpointGraph = detectEndpoints(analysisResult.nodes, analysisResult.edges);
// detectEndpoints 內部捕捉所有錯誤，失敗時回傳 null

response.send({
  ...analysisResult,
  directoryGraph,   // Sprint 12
  endpointGraph,    // Sprint 13
});
```

### 9.3 向下相容

- `endpointGraph` 為新增可選欄位，舊版 web 讀不到時等同無端點資料，三視角回退為 Sprint 12 行為
- `DirectoryNode` 新增的 `category`、`sublabel`、`autoExpand` 均為 optional，不破壞任何現有消費端

---

## 10. 資料流

```
packages/core/src/analyzers/
  endpoint-detector.ts          → EndpointGraph JSON（新增）
  directory-aggregator.ts       → DirectoryGraph JSON（升級：category / sublabel / autoExpand）

packages/cli/src/
  server.ts                     → GET /api/graph 回應加入 endpointGraph 欄位

packages/web/src/
  adapters/graph-adapter.ts     → 讀取 endpointGraph / directoryGraph，路由至對應視角 renderer
  components/GraphCanvas.tsx    → 依 activePerspective 渲染 SF / LO / DJ
  components/RightPanel.tsx     → 依 activePerspective 切換 SFDetailPanel / LODetailPanel / DJPanel
  components/SFDetailPanel.tsx  → 系統框架右側面板（新增）
  components/LODetailPanel.tsx  → 邏輯運作右側面板（新增）
  components/DJPanel.tsx        → 資料旅程右側面板（新增）
```

完整流程：

```
core (endpoint-detector)
  └─ EndpointGraph JSON
       └─ cli (server.ts) → /api/graph response
            └─ web (graph-adapter)
                 ├─ system-framework → DirectoryGraph → SF card layout → SFDetailPanel
                 ├─ logic-operation  → FunctionNode + call edges → LO group cards → LODetailPanel
                 └─ data-journey     → EndpointGraph → DJ endpoint selector → DJPanel
```

---

## 11. 錯誤處理與邊界條件

| 場景 | 處理策略 |
|------|---------|
| 非 web 專案（無路由） | `endpoint-detector` 回傳 `null`，DJ 視角顯示「未偵測到 API 端點」提示 |
| BFS chain 深度超過 10 | 截斷，最後一步標記 `description: '(chain truncated)'` |
| `EndpointGraph` 端點超過 200 | 取前 200，依路徑字母排序 |
| `DirectoryGraph` 卡片數少於 5 | `autoExpand` 全部設為 `false`，不強制展開 |
| `DirectoryGraph` 卡片數超過 17 | 依 `fileCount` 降序排列，取前 17 |
| `LO_METHOD_TO_CHAIN` 查無對應 | fallback 至 `upload` chain |
| DJ panel step detail 無 Input/Output | 顯示 `—`（em dash）佔位 |
| `FunctionNode` 無 `returnType` | 方法簽名顯示 `void` |
| dagre 佈局計算失敗 | catch → 回退 force-directed（沿用 Sprint 11 策略） |
| web 端 `endpointGraph` 為 `null` | DJ 視角回退為 Sprint 12 的檔案入口選擇行為 |

---

## 12. 設計決策記錄

| 決策 | 選擇 | 理由 |
|------|------|------|
| BFS 深度上限 | 10 | 覆蓋 99% 真實 web 專案的請求鏈深度，避免循環依賴導致無限遍歷 |
| 端點偵測框架範圍 | Express + Fastify 標準模式 | 佔市場主流；動態路由生成（factory pattern）排除在外，準確度優先 |
| chain tracing 依賴 Sprint 7 call edges | 直接復用 | 避免重複分析 AST；Sprint 7 的 `call` edges 已覆蓋跨檔案呼叫解析 |
| LO 初始畫面改為群組卡片 | 取代 dimmed 全圖 | 老闆核准：方法清單比 opacity 0.08 的節點更有資訊量 |
| SF click-select 取代 hover | click-select | 卡片數量少（5~17），hover 狀態不穩定；click 意圖更明確 |
| DirectoryNode 新欄位全部 optional | 是 | 向下相容，不破壞 Sprint 12 的消費端 |
| `endpointGraph: null` vs 空陣列 | `null` | 明確區分「非 web 專案」與「web 專案但無端點」兩種語義 |
| 步驟節點尺寸 340×76px | 固定 | 容納「Step N + 方法名 + 描述」三行文字的最小合適尺寸 |
| stagger 每步 350ms | 沿用 Sprint 11 | 老闆已核准節奏，不改動 |
