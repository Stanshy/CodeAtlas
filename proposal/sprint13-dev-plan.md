# 開發計畫書: Sprint 13 — 方法/端點級三視角

> **撰寫者**: PM（延續 Sprint 12 做法，PM 撰寫確保需求精確傳達）
> **日期**: 2026-04-02
> **專案**: CodeAtlas
> **Sprint 提案書**: `proposal/sprint13-proposal.md`
> **狀態**: 待執行

---

> 本文件在 G0 通過後由 PM 撰寫。Sprint 13 是內容顆粒度的根本升級，不是視覺調整。
> **核准圖稿**：`proposal/references/sprint13/method-level-mockup.html`（2346 行完整 HTML，TL 必須逐行參照）
> **技術規格書**：`proposal/references/sprint13/method-level-mockup-spec.md`（11 章完整規格，TL 必讀）

## 1. 需求摘要

Sprint 12 完成了白紙黑格視覺重塑（1235 tests），但老闆用 VideoBrief 實測後發現三種視角都在追蹤「檔案」而非「方法/端點」，對工程師沒有實際幫助。

**根因**：Sprint 12 改了視覺和呈現邏輯，但資料顆粒度停在檔案級。資料旅程入口是 `video-api.ts` 而非 `POST /api/v1/videos/upload`，邏輯運作追蹤檔案依賴而非方法呼叫鏈。

**Sprint 13 做一件大事**：

1. **三種視角從「檔案級」升級為「方法/端點級」**
   - 資料旅程 = API 端點入口 + 請求鏈追蹤（endpoint → middleware → service → model）
   - 邏輯運作 = 分類群組初始畫面 + click 展開方法呼叫鏈流程圖（dagre TB）
   - 系統框架 = 智慧目錄聚合（自動展開不均衡大目錄）+ 目錄詳情面板
   - 三種右側面板各自不同內容
   - 方法→位置映射（方法名 + class + 檔案路徑）

### 確認的流程

需求 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）

> **無 G1** — 核准 HTML 圖稿 + 技術規格書（11 章）已完整，TL 直接參照實作。
> **core + web 雙層改動** — core 新增 API 端點識別模組，web 三視角從檔案級改為方法/端點級。

---

## 2. 技術方案

### ⚠️ Sprint 12 vs Sprint 13 關鍵差異（TL 必讀）

> **以下每一項都是 Sprint 13 與 Sprint 12 的根本區別。Sprint 12 的程式碼不能「微調」，必須按以下方向改造。**

#### 差異 1：資料旅程 — 檔案入口 → API 端點入口

| 項目 | Sprint 12（現狀） | Sprint 13（目標） |
|------|-------------------|-------------------|
| 入口顯示 | 檔案名（`video-api.ts`） | API 端點（`POST /api/v1/videos/upload`） |
| 入口分類 | 無 | URL prefix 分類（`videos` / `auth` / `billing`） |
| 追蹤粒度 | 檔案間依賴 | 方法呼叫鏈（endpoint → middleware → controller → service → model） |
| 右側面板 | 步驟列表（步驟號 + 節點名） | 資料轉換面板（input / output / transform per step） |
| 初始畫面 | entry 檔案選擇 | 端點卡片分類展示（虛線框 + 分類色條） |
| 節點元件 | 檔案節點 | 步驟節點（Step N + 方法名 + 描述，340×76px） |

#### 差異 2：邏輯運作 — dimmed + click 聚焦 → 分類群組 + 流程圖

| 項目 | Sprint 12（現狀） | Sprint 13（目標） |
|------|-------------------|-------------------|
| 初始畫面 | 所有節點 dimmed（opacity 0.08）+ 中央提示 | **分類群組卡片**（routes/middleware/services/models/utils，每組一張卡片列出方法名） |
| 節點內容 | 檔案節點 | **方法節點**（`upload()`、`createVideo()`） |
| click 後 | 呼叫鏈亮起，非相關 opacity 0.08 | **群組消失 → dagre TB 流程圖**展開（每層 = 呼叫深度） |
| 佈局 | 力導向 | **dagre TB 分層**（垂直居中，nodeW=200, nodeH=44, layerH=100） |
| 重置 | 點擊空白/清除 → 全 dimmed | 點擊「清除選取」→ 重建群組卡片 |
| 右側面板 | 呼叫鏈資訊（底部面板） | **方法簽名面板**（signature + class + file + callers/callees + complexity + exec time） |

#### 差異 3：系統框架 — 固定聚合 → 智慧聚合

| 項目 | Sprint 12（現狀） | Sprint 13（目標） |
|------|-------------------|-------------------|
| 聚合策略 | 固定按第一層目錄聚合 | **智慧聚合**（檔案占比 >70% 的大目錄自動展開為子目錄卡片） |
| 卡片數 | 5~15 | **5~17**（大目錄展開後增加） |
| 卡片分類 | entry/logic/data/support | **frontend/backend/infra**（色條區分） |
| 右側面板 | hover 子檔案列表 | **目錄詳情面板**（📊 Statistics + 📄 Files 可展開列表 + ⬆ Upstream + ⬇ Downstream） |
| 節點互動 | hover 高亮 | **click 選取 + BFS 高亮**（selected 藍色光圈 + connected 高亮 + 其他 dimmed） |

#### 差異 4：全視角共通 — 新增方法→位置映射 + 三種不同面板

| 項目 | Sprint 12（現狀） | Sprint 13（目標） |
|------|-------------------|-------------------|
| 節點資訊 | 檔案名 | 方法名 + class + 檔案路徑 |
| 右側面板 | 三視角面板內容類似 | **三視角面板完全不同** |
| core 數據 | directoryGraph + 檔案級 | **+endpointGraph**（API 端點列表 + 請求鏈） |

---

### 2.1 Core 層：API 端點識別模組

> **Sprint 13 唯一的 core 層新增能力。** 解析 Express/Fastify 的 API 端點定義。

#### `endpoint-detector.ts` 新增

```typescript
// packages/core/src/analyzers/endpoint-detector.ts — 新增

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

#### Pattern Matching 規則

支援的 API 定義模式：

| 框架 | Pattern | 範例 |
|------|---------|------|
| Express Router | `router.{method}(path, ...handlers)` | `router.get('/videos', listVideos)` |
| Express App | `app.{method}(path, ...handlers)` | `app.post('/auth/login', loginHandler)` |
| Fastify | `fastify.{method}(path, opts, handler)` | `fastify.get('/users/:id', getUser)` |
| Fastify Route | `fastify.route({ method, url, handler })` | `fastify.route({ method: 'GET', url: '/health' })` |

不支援（fallback 為檔案級）：
- 自訂 router wrapper
- 動態路由生成
- Decorator-based routing（NestJS `@Get()`）

#### 請求鏈追蹤邏輯

端點識別後，從 handler 函式開始 BFS 追蹤呼叫鏈：

```
endpoint handler → middleware calls → service calls → model/db calls
```

利用 Sprint 7 已有的 `call` 邊類型追蹤。每一步記錄 method + class + file。

#### Graph JSON 擴充

API 端點 `/api/graph` 回應新增 `endpointGraph` 欄位：

```typescript
interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  directoryGraph: DirectoryGraph | null;  // Sprint 12
  endpointGraph: EndpointGraph | null;    // Sprint 13 新增
}
```

`endpointGraph` 為 `null` 時表示未偵測到 API 端點（非 web 框架專案），web 層回退為檔案級。

---

### 2.2 Core 層：智慧目錄聚合升級

> **改造 Sprint 12 的 `aggregateByDirectory()`，新增自動展開邏輯。**

#### 智慧展開規則

```typescript
// packages/core/src/analyzers/directory-aggregator.ts — 修改

/**
 * 智慧聚合升級：
 * 1. 先按第一層目錄聚合（與 Sprint 12 相同）
 * 2. 計算每個目錄的檔案占比
 * 3. 占比 >70% 的目錄自動展開為子目錄
 * 4. 展開後的子目錄成為獨立卡片
 * 5. 維持目錄間依賴正確計算
 */
```

預期 VideoBrief 結果：
- `frontend/`（102 files, 佔 63%）→ 展開為 7 個子目錄（app, components, services, hooks, contexts, utils, types）
- `backend/`（59 files, 佔 37%）→ 展開為 6 個子目錄（routes, services, models, core, schemas, tasks）
- `nginx/`、`relay/` → 保持為獨立卡片
- 總計 17 張卡片

#### 卡片分類色條（從圖稿提取）

| 分類 | category | 色條顏色 | badge 背景 |
|------|----------|---------|-----------|
| 後端子目錄 | `backend` | `#1565c0` 藍 | `#bbdefb` |
| 前端子目錄 | `frontend` | `#7b1fa2` 紫 | `#e1bee7` |
| 基礎設施 | `infra` | `#546e7a` 灰 | `#cfd8dc` |

#### DirectoryNode 型別擴充

```typescript
export interface DirectoryNode {
  id: string;
  label: string;
  sublabel?: string;                // Sprint 13 新增：完整路徑，如 'frontend/src/services/'
  type: 'entry' | 'logic' | 'data' | 'support';
  category: 'frontend' | 'backend' | 'infra';  // Sprint 13 新增
  fileCount: number;
  files: string[];
  role: NodeRole;
  autoExpand: boolean;              // Sprint 13 新增：是否自動展開
}
```

---

### 2.3 系統框架 = 智慧目錄聚合 + 目錄詳情面板（改造）

> **核心區別**：Sprint 12 固定聚合 + hover 子檔案列表 → Sprint 13 智慧聚合 + click 選取 + 目錄詳情面板。

#### 資料來源

仍使用 `directoryGraph`，但節點數從 5~15 增加到 5~17（智慧展開後）。

#### 節點互動改造（從規格書 §4.3 提取）

Sprint 12 是 hover 高亮，Sprint 13 改為 **click 選取 + BFS 高亮**：

```
點擊任一卡片 (sfSelectNode)
  ├── 被選卡片加 .selected（藍色光圈 border: 2.5px solid #1565c0）
  ├── BFS 找出所有相連節點
  ├── 相連邊加 .highlighted（加粗 stroke-width:2.5, 全不透明）
  ├── 不相連邊加 .dimmed（opacity 0.1）
  ├── 不相連卡片加 .dimmed（opacity 0.3）
  └── 右側面板更新 (sfShowDetail)
```

#### 右側面板（從規格書 §4.3 提取）

300px 固定寬度，結構：

```
┌─────────────────────────┐
│ 📊 Statistics            │
│   Files: 7               │
│   Functions: 34           │
│   Lines: ~1,200           │
├─────────────────────────┤
│ 📄 Files                 │
│   ▶ video-api.ts (11 fns)│  ← 點擊 ▶ 展開函式清單
│   ▶ auth-api.ts (2 fns)  │
│   ...                    │
├─────────────────────────┤
│ ⬆ Upstream (3)          │
│   app/, components/       │
├─────────────────────────┤
│ ⬇ Downstream (2)        │
│   types/, backend/routes/ │
└─────────────────────────┘
```

資料來源：`SF_NODE_DETAILS`（規格書 §4.2）

#### 卡片結構（從規格書 §4.5 提取）

```html
<div class="sf-card">
  <div class="sf-card-accent backend"></div>  <!-- 5px 色條 -->
  <div class="sf-card-body">
    <div class="sf-card-name">services/</div>
    <div class="sf-card-bottom">
      <span class="sf-card-badge">16 files</span>
      <span class="sf-card-icon">📁</span>
    </div>
  </div>
</div>
```

#### 邊路徑演算法（從規格書 §4.4 提取）

```typescript
function calcEdgePath(from, to, W, H) {
  if (Math.abs(dy) > Math.abs(dx)) {
    // 垂直：Bezier 曲線 from 底→to 頂
    return `M fx,sy C fx,sy+30 tx,ey-30 tx,ey`;
  } else {
    // 水平：Bezier 曲線 from 右→to 左
    return `M sx,fy C sx+dx*0.4,fy ex-dx*0.4,ty ex,ty`;
  }
}
```

---

### 2.4 邏輯運作 = 分類群組 + 方法呼叫鏈流程圖（徹底重做）

> **核心區別**：Sprint 12 是 dimmed 檔案 + click 聚焦。Sprint 13 改為分類群組 → click 方法 → dagre 流程圖。

#### 初始狀態 — 分類群組卡片（從規格書 §5.3 提取）

**佈局**：dagre 層級（TB 方向），5 個群組卡片

```
Layer 0: routes（~16 methods）
Layer 1: middleware（2 methods）
Layer 2: services（~25 methods）
Layer 3: models + utils（並排）
```

**每張群組卡片**：

```
┌──────────────────────────────┐
│ ● Routes / API (16)    🔵   │  ← 標頭：色點 + 分類名 + 計數 + icon
├──────────────────────────────┤
│  upload()                    │  ← 方法行，hover 可點
│  getVideos()                 │
│  getVideoStatus()            │
│  getStreamUrl()              │
│  deleteVideo()               │
│  ▼ 展開更多 (11)             │  ← >5 個預設收合
└──────────────────────────────┘
```

**卡片尺寸計算**（從規格書提取）：
- `cardW = 240`，`rowH = 24`，`headerH = 36`，`padY = 12`
- 收合：`headerH + min(methods, 5) * rowH + toggleRowH + padY`
- 展開：`headerH + methods * rowH + toggleRowH + padY`

**群組間依賴箭頭**：虛線箭頭（`stroke: #bbb; stroke-dasharray: 6 3; opacity: 0.6`）

```
routes → middleware → services → models
routes → services → utils
```

**5 個群組色碼**（從規格書 §5.5 提取）：

| 分類 | 色碼 | 背景色 | icon |
|------|------|--------|------|
| routes | `#1565c0` | `#e3f2fd` | 🔵 |
| middleware | `#00838f` | `#e0f7fa` | 🟢 |
| services | `#7b1fa2` | `#f3e5f5` | 🟣 |
| models | `#4e342e` | `#efebe9` | 🟤 |
| utils | `#546e7a` | `#eceff1` | ⚫ |

#### 鑽取狀態 — 呼叫鏈流程圖（從規格書 §5.4 提取）

**觸發**：
```
使用者點擊群組卡片中任一方法
  → loFindChainForMethod(methodName)
  → 查 LO_METHOD_TO_CHAIN 表
  → loSelectChain(chainKey)
```

**狀態切換**：
1. 隱藏群組卡片（`lo-bg-nodes → display:none`）
2. 淡出提示文字
3. 顯示呼叫鏈群組（`lo-chain-group → display:''`）
4. dagre TB 佈局繪製鏈節點 + 邊
5. 顯示底部操作列

**呼叫鏈佈局**（dagre TB 垂直居中）：
```
nodeW = 200, nodeH = 44, layerH = 100
centerX = canvasWidth / 2 - nodeW / 2

每個節點：
┌──────────────────────────┐
│ ▌ extract_audio()        │  ← 左側 3px 色條
│   services/ffmpeg        │
└──────────────────────────┘
左側：● (分類色圓點) + 層號 (0, 1, 2...)
```

**3 條預定義呼叫鏈**（VideoBrief）：

| 鏈 | 入口 | 節點數 | 說明 |
|----|------|--------|------|
| upload | `POST /videos/upload` | 10 | 影片上傳全流程 |
| query | `GET /videos` | 7 | 影片列表查詢 |
| auth | `POST /auth/google` | 6 | Google 登入 |

**44 個方法→鏈的映射**：`LO_METHOD_TO_CHAIN` 表將初始畫面每個方法映射到呼叫鏈。

**節點點擊 → 右側面板**（從規格書提取）：

```
點擊呼叫鏈中的節點 (loSelectNode)
  ├── 加 .selected-node 邊框
  └── 右側面板更新 (loShowNodeDetail)
       ├── 🔧 Method name (帶分類色條)
       ├── Signature (mono 字體)
       ├── Class + File path          ← 方法→位置映射
       ├── Lines / Complexity 指標
       ├── ⬆ Callers (N)
       ├── ⬇ Callees (N)
       └── 📊 Avg execution / Error rate
```

**清除選取**：
```
點擊「清除選取」→ svg.innerHTML = '' → 重新 initLO() → 重建群組卡片
```

---

### 2.5 資料旅程 = API 端點入口 + 請求鏈追蹤（徹底重做）

> **核心區別**：Sprint 12 入口是檔案，Sprint 13 入口是 API 端點。

#### 初始狀態 — 端點選擇（從規格書 §6.3 提取）

**佈局**：分類群組 + 2 欄網格

```
🎬 Videos (4)
┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐ ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐
│ POST /api/v1/videos/ │ │ GET /api/v1/videos    │
│ upload               │ │                       │
│ 影片上傳 [8 steps]    │ │ 影片列表 [7 steps]     │
└╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘ └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘

🔐 Auth (1)
┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐
│ POST /api/v1/auth/   │
│ google               │
│ Google 登入 [6 steps] │
└╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘

💳 Billing (1)
...
```

**端點卡片**：260×64px，綠色虛線框（`1.5px dashed var(--dj-border)`）+ 左側分類色條。
- Hover：虛線變實線 + `translateY(-2px)` + shadow 加深
- 脈衝環動畫：`@keyframes dj-pulse`（2s 循環）

**自動分類機制**：解析 URL prefix → 分組（`videos` → 🎬, `auth` → 🔐, `billing` → 💳）

#### 播放狀態 — Stagger Animation（從規格書 §6.4 提取）

**觸發**：
```
使用者點擊端點卡片 (djStartJourney)
  ├── 隱藏端點選擇畫面
  ├── 清空並顯示旅程群組
  ├── 預建立所有步驟節點（opacity: 0）
  ├── 設置右側面板
  └── 啟動 stagger 動畫
```

**動畫流程**：
```
animateStep(0)
  ├── fadeIn: opacity 0→1 (20ms interval, 0.15 step)
  ├── 邊加 .appeared (opacity 0→0.8)
  ├── 當前節點加 .active-step (綠色光圈)
  ├── 前一節點移除 .active-step
  ├── 右側面板 djPanelHighlight(i)  ← 只高亮，不展開明細
  └── setTimeout(350ms) → animateStep(1)
```

**關鍵設計決策**：動畫期間只高亮，不展開 Input/Output/Transform 明細。明細只在使用者**手動點擊**面板步驟行時展開。

**步驟節點元件**：`nodeW=340, nodeH=76, stepSpacing=96`

```html
<div class="dj-step-node">
  <div class="dj-step-num">Step 3</div>
  <div class="dj-step-name">check_upload_quota()</div>
  <div class="dj-step-desc">檢查上傳配額</div>
</div>
```

#### 右側面板 — 三種行狀態（從規格書 §6.5 提取）

```
DJ 右側面板 (300px)
├── .dj-panel-header-block
│   ├── 旅程標題（mono 字體，綠色）
│   └── 副標題 + 步驟數
├── .dj-step-list（可滾動）
│   └── .dj-step-item ×N
│       ├── .dj-step-item-header
│       │   ├── .dj-step-num-badge (圓形編號)
│       │   ├── .dj-step-item-name
│       │   └── .dj-step-status (●)
│       └── .dj-step-detail （預設 display:none）
│           ├── 📥 Input
│           ├── 📤 Output
│           ├── 🔄 Transform
│           └── 📍 Method + File     ← 方法→位置映射
├── [重播此旅程] 按鈕
└── [清除選取] 按鈕
```

| 狀態 | CSS Class | Badge 顏色 | Status 圖示 |
|------|-----------|------------|-------------|
| 未到達 | (預設) | 灰底灰字 | 空心圓 |
| 進行中 | `.active-item` | 綠底白字 | 綠色空心+光暈 |
| 已完成 | `.completed-item` | 淡綠底綠字 | 綠色實心圓 |

**明細展開**：點擊步驟行 → toggle `.dj-step-detail.open` → 同步高亮 canvas 上的步驟節點。

---

### 2.6 三種右側面板架構

三種視角各自獨立的右側面板元件，隨視角切換自動切換：

| 視角 | 面板元件 | 內容 | 寬度 |
|------|---------|------|------|
| 系統框架 | `SFDetailPanel.tsx` | 📊 Statistics + 📄 Files (可展開) + ⬆ Upstream + ⬇ Downstream | 300px |
| 邏輯運作 | `LODetailPanel.tsx` | 🔧 Method + Signature + Class/File + Lines/Complexity + Callers/Callees + Exec/Error | 300px |
| 資料旅程 | `DJPanel.tsx` | 旅程標題 + 步驟列表（三態 + 明細展開：Input/Output/Transform/Method+File）+ 重播/清除 | 300px |

```typescript
// 面板切換邏輯
function RightPanel({ perspective, ...props }) {
  switch (perspective) {
    case 'system-framework': return <SFDetailPanel {...props} />;
    case 'logic-operation': return <LODetailPanel {...props} />;
    case 'data-journey': return <DJPanel {...props} />;
  }
}
```

---

### 2.7 方法→位置映射

所有方法節點（邏輯運作 + 資料旅程）點擊後面板顯示：

```
🔧 extract_audio()
   Signature: (video_path: str) → str (wav path)
   Class: FFmpegService
   File: backend/app/services/ffmpeg.py     ← 完整路徑
   Lines: 38 | Complexity: 6
```

數據來源：Sprint 7 已有的 `FunctionNode`（`parentFileId` + `kind` + `parameters` + `returnType`）。

---

### 2.8 SVG 動態尺寸策略（從規格書 §7 提取）

呼叫鏈/旅程步驟超出視窗時：

```javascript
const requiredH = startY + totalElements * spacing + bottomPadding;
const svgH = Math.max(viewportH, requiredH);
svg.setAttribute('viewBox', `0 0 ${W} ${svgH}`);
svg.style.height = svgH + 'px';
canvasWrap.classList.add('scrollable');
```

LO 縮放控制：右下角 `+` / `-` / `⊞`（每次 ±15%）。

---

### 2.9 PerspectivePreset 更新

```typescript
export const PERSPECTIVE_PRESETS: Record<PerspectiveName, PerspectivePreset> = {
  'system-framework': {
    colorScheme: 'blue-paper',
    interaction: 'sf-click-select',      // ← 從 'directory-hover' 改為 click + BFS
    dataSource: 'directory',
  },
  'logic-operation': {
    colorScheme: 'multi-paper',
    interaction: 'lo-category-drill',    // ← 從 'bfs-click-focus' 改為群組→流程圖
    dataSource: 'method',                // ← 從 'file' 改
  },
  'data-journey': {
    colorScheme: 'green-paper',
    interaction: 'dj-endpoint-play',     // ← 從 'stagger-appear' 改為端點入口→播放
    dataSource: 'endpoint',              // ← 從 'file' 改
  },
};
```

---

## 3. UI 圖稿

| 頁面/元件 | 檔案 | 說明 |
|----------|------|------|
| 完整三視角方法級效果 | `proposal/references/sprint13/method-level-mockup.html` | 老闆核准，2346 行 HTML+CSS+JS，**TL 必須逐行參照** |
| 技術規格書 | `proposal/references/sprint13/method-level-mockup-spec.md` | 11 章完整規格，互動流程、資料結構、演算法，**TL 必讀** |
| 系統框架 Tab | 圖稿 Tab 1 | 17 張目錄卡片 + 手動座標 + BFS click + 右側詳情面板 |
| 邏輯運作 Tab | 圖稿 Tab 2 | 5 個分類群組（44 methods）→ click 鑽取 → dagre TB 呼叫鏈 + 右側方法面板 |
| 資料旅程 Tab | 圖稿 Tab 3 | 6 個 API 端點分類展示 → click → stagger animation + 右側轉換面板 |

---

## 4. 檔案變更清單

### 新增

| 檔案 | 用途 | 任務 |
|------|------|------|
| `packages/core/src/analyzers/endpoint-detector.ts` | API 端點識別模組 | T2 |
| `packages/core/src/analyzers/endpoint-detector.test.ts` | 端點識別單元測試 | T2 |
| `packages/web/src/components/SFDetailPanel.tsx` | 系統框架右側目錄詳情面板 | T4 |
| `packages/web/src/components/LODetailPanel.tsx` | 邏輯運作右側方法簽名面板 | T5 |
| `packages/web/src/components/LOCategoryGroup.tsx` | 邏輯運作分類群組卡片 | T5 |
| `packages/web/src/components/LOCallChain.tsx` | 邏輯運作呼叫鏈流程圖 | T5 |
| `packages/web/src/components/DJEndpointSelector.tsx` | 資料旅程端點選擇畫面 | T6 |
| `packages/web/src/components/DJStepNode.tsx` | 資料旅程步驟節點元件 | T6 |
| `packages/web/src/components/RightPanel.tsx` | 三種面板切換容器 | T7 |
| `.knowledge/sprint13-method-level-architecture.md` | Sprint 13 架構設計文件 | T1 |

### 修改

| 檔案 | 變更內容 | 任務 |
|------|---------|------|
| `packages/core/src/index.ts` | 匯出 `detectEndpoints`, `ApiEndpoint`, `EndpointGraph` | T2 |
| `packages/core/src/analyzers/directory-aggregator.ts` | 智慧聚合升級（>70% 自動展開）+ DirectoryNode 擴充（category, sublabel, autoExpand） | T3 |
| `packages/cli/src/server.ts` | `/api/graph` 回應新增 `endpointGraph` 欄位 | T2 |
| `packages/web/src/adapters/graph-adapter.ts` | `applyPerspective()` 支援 endpointGraph + method-level 分流 | T4, T5, T6 |
| `packages/web/src/adapters/perspective-presets.ts` | interaction/dataSource 更新為方法/端點級 | T4 |
| `packages/web/src/components/GraphCanvas.tsx` | 整合三種新渲染邏輯 + 右側面板切換 | T4, T5, T6, T7 |
| `packages/web/src/components/DirectoryCard.tsx` | 卡片結構適配（新增 sublabel, category 色條, 分類色系） | T4 |
| `packages/web/src/hooks/useBfsClickFocus.ts` | 適配 SF click-select 邏輯 | T4 |
| `packages/web/src/hooks/useStaggerAnimation.ts` | 適配端點入口 + 步驟節點元件 | T6 |
| `packages/web/src/components/JourneyPanel.tsx` | 改造為 DJPanel（三態 + Input/Output/Transform 明細） | T6 |
| `packages/web/src/components/ChainInfoPanel.tsx` | 適配 LO 鑽取狀態底部操作列 | T5 |
| `.knowledge/specs/feature-spec.md` | v13.0（+Sprint 13 功能規格） | T1 |
| `.knowledge/specs/data-model.md` | v6.0（+ApiEndpoint/EndpointGraph/ChainStep + DirectoryNode 擴充） | T1 |
| `.knowledge/specs/api-design.md` | v6.0（+endpointGraph 欄位） | T1 |

### 不改動

| 檔案 | 原因 |
|------|------|
| `packages/web/src/styles/theme.ts` | Sprint 12 白紙黑格主題不變 |
| `packages/web/src/styles/global.css` | CSS 變數不變 |
| `packages/web/src/components/NeonNode.tsx` | 白底樣式不變（保留命名） |
| `packages/web/src/components/NeonEdge.tsx` | 灰色樣式不變 |
| `packages/web/src/components/TabBar.tsx` | Tab 切換框架不變 |

---

## 5. 規範文件索引

| 規範 | 路徑 | 版本 |
|------|------|------|
| 功能規格 | `.knowledge/specs/feature-spec.md` | v13.0（本 Sprint 更新） |
| 資料模型 | `.knowledge/specs/data-model.md` | v6.0（本 Sprint 更新：+ApiEndpoint/EndpointGraph + DirectoryNode 擴充） |
| API 設計 | `.knowledge/specs/api-design.md` | v6.0（本 Sprint 更新：/api/graph +endpointGraph） |
| 架構設計 | `.knowledge/sprint13-method-level-architecture.md` | v1.0（新建） |
| 核准圖稿 | `proposal/references/sprint13/method-level-mockup.html` | 老闆核准，實作必須嚴格對照 |
| 技術規格書 | `proposal/references/sprint13/method-level-mockup-spec.md` | 11 章完整規格，實作必須嚴格對照 |

---

## 6. 任務拆解

### 任務清單

| ID | 任務 | 說明 | 負責 Agent | 依賴 | 對應步驟 | 驗收標準 |
|----|------|------|-----------|------|---------|---------|
| T1 | 架構設計 + 規範文件更新 | Sprint 13 架構文件撰寫（端點識別設計、三視角方法級改造策略、智慧聚合升級）+ feature-spec v13.0 + data-model v6.0（+ApiEndpoint/EndpointGraph/ChainStep + DirectoryNode 擴充）+ api-design v6.0（+endpointGraph 欄位） | tech-lead | — | 設計 | 架構文件完整、三份規範文件已更新、規格書資料結構完整對照 |
| T2 | Core 層 API 端點識別 | `endpoint-detector.ts` 新增。Pattern matching 識別 Express/Fastify 端點定義。從 handler BFS 追蹤請求鏈。輸出 `EndpointGraph`（endpoints + chains）。`cli/server.ts` 的 `/api/graph` 回應新增 `endpointGraph`。非標準框架回退 null。單元測試覆蓋 | backend-architect | T1 | 實作 | 用 VideoBrief 驗證識別出 API 端點，請求鏈正確追蹤，API 回應含 endpointGraph，非 web 專案回退 null |
| T3 | Core 層智慧目錄聚合升級 | 修改 `directory-aggregator.ts`。占比 >70% 的目錄自動展開子目錄。DirectoryNode 擴充（category, sublabel, autoExpand）。維持目錄間依賴正確。單元測試更新 | backend-architect | T1 | 實作 | VideoBrief：frontend 展開為 7 子目錄、backend 展開為 6 子目錄、總 17 卡片。依賴箭頭正確 |
| T4 | 系統框架改造 | DirectoryCard 適配新分類色條。click 選取 + BFS 高亮（取代 hover）。新增 `SFDetailPanel.tsx`（📊 Stats + 📄 Files 可展開 + ⬆⬇ deps）。graph-adapter + perspective-presets 更新。邊路徑 calcEdgePath()。**嚴格對照圖稿 Tab 1 + 規格書 §4** | frontend-developer | T2, T3 | 實作 | 17 張卡片正確渲染，click 選取 + BFS 高亮，右側面板顯示目錄詳情，Files 可展開函式列表，與圖稿一致 |
| T5 | 邏輯運作改造 | 新增 `LOCategoryGroup.tsx`（5 個群組卡片，>5 收合）+ `LOCallChain.tsx`（dagre TB 流程圖）。新增 `LODetailPanel.tsx`（方法簽名面板）。群組間依賴虛線箭頭。click 方法 → 群組消失 → 流程圖。LO_METHOD_TO_CHAIN 映射。清除→重建群組。**嚴格對照圖稿 Tab 2 + 規格書 §5** | frontend-developer | T4 | 實作 | 初始 5 群組卡片正確，>5 收合，click 方法展開 dagre 流程圖，右側顯示方法簽名+class+file，清除重建正確，與圖稿一致 |
| T6 | 資料旅程改造 | 新增 `DJEndpointSelector.tsx`（端點分類選擇）+ `DJStepNode.tsx`（步驟節點 340×76px）。改造 JourneyPanel → DJPanel（三態 + Input/Output/Transform 明細展開）。端點自動分類（URL prefix）。stagger animation 適配新節點。方法→位置映射（每步 Method + File）。**嚴格對照圖稿 Tab 3 + 規格書 §6** | frontend-developer | T4 | 實作 | 端點卡片分類正確，click 開始 stagger 播放，面板三態正確，明細展開顯示 Input/Output/Transform/Method+File，與圖稿一致 |
| T7 | 三種右側面板 + 視角切換整合 | 新增 `RightPanel.tsx`（面板切換容器）。三種視角切換時面板自動切換。SVG 動態尺寸策略。PerspectivePreset 更新。整合測試三視角完整流程。2D/3D 適配（3D 回退邏輯） | frontend-developer | T4, T5, T6 | 實作 | 三種面板正確切換，SVG 超長內容可滾動，視角切換無閃爍，2D/3D 回退正常 |
| T8 | 測試 + 全面回歸 | 端點識別測試（core）。智慧聚合測試（core）。三視角方法級測試（web）。右側面板測試。方法→位置映射測試。1235+ 回歸測試。pnpm build 通過 | test-writer-fixer | T7 | 測試 | 1235+ tests 零回歸 + 新增測試，pnpm build 全通過 |

### 依賴圖

```
T1（架構設計 + 規範，tech-lead）
 ├── T2（core 端點識別，backend-architect）
 │    └── T4（系統框架改造，frontend-developer）← 也依賴 T3
 ├── T3（core 智慧聚合升級，backend-architect）
 │    └── T4
 │         ├── T5（邏輯運作改造，frontend-developer）
 │         └── T6（資料旅程改造，frontend-developer）
 │              └── T7（面板整合 + 視角切換）
 └── T8（測試 + 回歸）← T7 完成後

T2 和 T3 可平行（兩個 core 模組互不依賴）
T5 和 T6 可平行（都依賴 T4，彼此獨立）
```

### 執行順序建議

```
Phase 0: 設計（tech-lead）
  T1 架構設計 + 規範文件更新

Phase 1: Core 基礎（可平行）
  T2 端點識別（backend-architect）‖ T3 智慧聚合升級（backend-architect）

Phase 2: 系統框架
  T4 系統框架改造（frontend-developer）← T2+T3 完成後

Phase 3: 邏輯運作 + 資料旅程（可平行）
  T5（邏輯運作分類群組 + 呼叫鏈流程圖）‖ T6（資料旅程端點入口 + 請求鏈）

Phase 4: 整合
  T7 三種面板 + 視角切換整合

Phase 5: 測試
  T8 測試 + 全面回歸

→ /review → G2 → G3
```

### L1 執行指令

> PM 產出此區塊，老闆複製貼入 L1 session 即可啟動。

```
請執行 Sprint 13 — 方法/端點級三視角。

📄 計畫書：proposal/sprint13-dev-plan.md
📐 核准圖稿：proposal/references/sprint13/method-level-mockup.html（2346 行，逐行參照）
📘 技術規格書：proposal/references/sprint13/method-level-mockup-spec.md（11 章，必讀）

📋 你負責的任務：T1（架構設計 + 規範文件）
🔧 委派 backend-architect：T2（端點識別）, T3（智慧聚合升級）
🎨 委派 frontend-developer：T4, T5, T6, T7
🧪 委派 test-writer-fixer：T8

⚠️ 關鍵提醒：
1. Sprint 13 不是視覺調整，是內容顆粒度的根本升級（檔案→方法/端點）
2. 資料旅程入口 = API 端點（POST /api/v1/videos/upload），不是檔案
3. 邏輯運作 = 分類群組初始 → click 方法 → dagre TB 流程圖，不是 dimmed + click 聚焦
4. 系統框架 = 智慧聚合（>70% 展開子目錄），不是固定第一層聚合
5. 三種右側面板完全不同（目錄詳情 / 方法簽名 / 資料轉換）
6. 所有方法節點必須顯示 class + 檔案路徑（方法→位置映射）
7. 用 VideoBrief 做最終驗收

第一步請先執行 /task-delegation 建立任務檔案。
```

### 共用檔案（需協調）

| 檔案 | 涉及任務 | 風險等級 |
|------|---------|---------|
| `packages/web/src/components/GraphCanvas.tsx` | T4, T5, T6, T7 | 高 — 三種新渲染邏輯 + 面板切換 |
| `packages/web/src/adapters/graph-adapter.ts` | T4, T5, T6 | 高 — endpoint/method 分流 |
| `packages/web/src/adapters/perspective-presets.ts` | T4 | 中 — interaction/dataSource 更新 |
| `packages/core/src/analyzers/directory-aggregator.ts` | T3 | 中 — 智慧展開邏輯 |
| `packages/cli/src/server.ts` | T2 | 低 — 新增 endpointGraph 到 API 回應 |

---

## 7. 測試計畫

### 單元測試（core）

| 測試對象 | 測試要點 | 任務 |
|---------|---------|------|
| `detectEndpoints()` | Express/Fastify pattern 正確識別、handler 解析、非標準框架回退 null | T2, T8 |
| `buildEndpointChains()` | 從 handler BFS 追蹤請求鏈、步驟正確、深度限制 | T2, T8 |
| `aggregateByDirectory()` 升級 | 智慧展開（>70% 目錄展開子目錄）、category 欄位、sublabel、展開後依賴正確 | T3, T8 |
| EndpointGraph 輸出 | endpoints + chains 結構完整、ChainStep 含 method/class/file | T8 |

### 單元測試（web）

| 測試對象 | 測試要點 | 任務 |
|---------|---------|------|
| `LOCategoryGroup` | 5 分類渲染、>5 收合、展開/收合切換 | T8 |
| `LOCallChain` | dagre TB 佈局、節點點擊、方法→位置映射 | T8 |
| `LODetailPanel` | 方法簽名、class/file、callers/callees | T8 |
| `DJEndpointSelector` | 端點分類、卡片渲染、click 觸發 | T8 |
| `DJStepNode` | 步驟號+方法名+描述、340×76px 尺寸 | T8 |
| `DJPanel` (改造) | 三態（未到/進行/完成）、明細展開（I/O/Transform）、重播 | T8 |
| `SFDetailPanel` | Stats + Files 展開 + Upstream/Downstream | T8 |
| `RightPanel` | 三視角切換正確、面板內容對應 | T8 |
| `applyPerspective()` | endpoint/method 分流正確 | T8 |

### 整合測試

| 測試場景 | 描述 | 任務 |
|---------|------|------|
| SF 智慧聚合 | 載入 VideoBrief → 17 張卡片（7 前端 + 6 後端 + 2 infra + 2 root） | T8 |
| SF click 選取 | click 卡片 → BFS 高亮 → 右側面板顯示目錄詳情 | T8 |
| LO 初始群組 | 切到邏輯運作 → 5 個分類群組卡片，44 個方法 | T8 |
| LO 鑽取 | click 方法 → 群組消失 → dagre 流程圖 → 右側方法簽名 | T8 |
| LO 清除重建 | 清除選取 → 重建群組卡片 | T8 |
| DJ 端點選擇 | 切到資料旅程 → 6 個端點按 3 類展示 | T8 |
| DJ 播放 | click 端點 → stagger animation → 面板同步 → 明細展開 | T8 |
| 視角切換 | 三種視角切換 → 面板自動切換 → 無閃爍 | T8 |

### 回歸測試

- 1235+ 既有 tests 零回歸
- `pnpm build` 全通過
- Sprint 1-12 所有功能不受影響
- Tab 切換正常
- 策展 + 手動釘選正常

---

## 8. 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| API 端點識別 pattern matching 不完整 | 中 | 僅支援 Express/Fastify 標準寫法，非標準回退 null。VideoBrief 是 Express，可驗證 |
| 請求鏈 BFS 追蹤不完整 | 中 | 利用 Sprint 7 已有的 call 邊。深度 >10 截斷 + 提示 |
| 三視角資料源全面改造 | 高 | 圖稿 + 規格書 11 章已備齊，減少探索時間。1235 tests 保護回歸 |
| LO 分類群組是全新 UI | 中 | 規格書 §5 完整定義了佈局算法、卡片尺寸、收合邏輯。TL 照規格實作 |
| DJ 端點選擇畫面是全新 UI | 中 | 規格書 §6 完整定義。端點卡片結構簡單（260×64px） |
| 智慧聚合可能打破 5~15 卡片限制 | 低 | 規格書限制 5~17。如超出，調整展開閾值 |
| Sprint 12 postmortem：pointer-events 攔截 | 中 | 規格書 §8.1 明確：`.lo-hint, .dj-hint { pointer-events: none }` |
| 共用 GraphCanvas.tsx 衝突 | 高 | T5/T6 可平行但各自改不同分支，T7 整合。L1 需協調 |

---

## 9. 文件更新

完成後需同步更新的文件：

- [ ] `.knowledge/specs/feature-spec.md` → v13.0
- [ ] `.knowledge/specs/data-model.md` → v6.0（+ApiEndpoint/EndpointGraph/ChainStep + DirectoryNode 擴充）
- [ ] `.knowledge/specs/api-design.md` → v6.0（+endpointGraph 欄位）
- [ ] `.knowledge/sprint13-method-level-architecture.md`（新建）
- [ ] `CLAUDE.md`（Sprint 13 相關條目）

---

## 10. 任務與審核紀錄（備查）

> 每個任務完成後記錄結果，每次 Review/Gate 通過後記錄決策。本區作為 Sprint 完整稽核軌跡。

### 任務完成紀錄

| 任務 | 完成日期 | 結果 | 備註 |
|------|---------|------|------|
| T1 | 2026-04-02 | ✅ 完成 | 架構文件 547 行 + feature-spec v13.0 + data-model v6.0 + api-design v6.0 |
| T2 | 2026-04-02 | ✅ 完成 | endpoint-detector.ts + CLI 整合 + 10 tests，428 core tests 全過 |
| T3 | 2026-04-02 | ✅ 完成 | 智慧展開 + category/sublabel/autoExpand + 8 tests，零回歸 |
| T4 | 2026-04-02 | ✅ 完成 | SFDetailPanel + DirectoryCard 色條 + click-select + BFS + presets 更新 |
| T5 | 2026-04-02 | ✅ 完成 | LOCategoryGroup + LOCallChain + LODetailPanel，825 web tests 全過 |
| T6 | 2026-04-02 | ✅ 完成 | DJEndpointSelector + DJStepNode + DJPanel + stagger 端點播放 |
| T7 | 2026-04-02 | ✅ 完成 | RightPanel 統一切換容器，移除重複面板渲染 |
| T8 | 2026-04-02 | ✅ 完成 | 91 新測試 + 1344 全過（916 web + 428 core）+ pnpm build 通過 |

### Review 紀錄

| Review 步驟 | 日期 | 結果 | Review 文件連結 |
|------------|------|------|---------------|
| 實作 Review（對程式碼+對規範+對設計稿） | 2026-04-02 | 通過 | Blocker:0 Major:0 Minor:3 — task 文件缺完工時間/驗收未勾/已修正 |
| 測試 Review（對功能+對規範） | 2026-04-02 | 通過 | Blocker:0 Major:0 Minor:0 — 1344 tests 全過，pnpm build 通過 |

### Gate 紀錄

| Gate | 日期 | 決策 | 審核意見 |
|------|------|------|---------|
| G0 | 2026-04-02 | ✅ 通過 | 老闆確認通過。無需 G1，核准圖稿 + 技術規格書直接作為實作規範 |
| G2 | 2026-04-02 | ✅ 通過 | L1 Review 通過（Blocker:0 Major:0 Minor:3 已修正）。程式碼品質合格，規範一致，設計稿對照通過 |
| G3 | 2026-04-02 | ✅ 通過 | 1344 tests 全過（916 web + 428 core，+91 新增），pnpm build 通過，零回歸 |

---

**確認**: [ ] L1 確認 / [ ] Tech Lead 確認
