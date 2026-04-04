# Sprint 13 Method-Level Mockup 技術規格書

> **發文者**: design-director (L1)
> **日期**: 2026-04-02
> **版本**: v1.0
> **對應圖稿**: `proposal/references/sprint13/method-level-mockup.html`
> **備份檔**: `proposal/references/sprint13/method-level-mockup-v1-backup.html`

---

## 一、文件目的

本文件詳細說明 Sprint 13 互動式 HTML 圖稿的設計意圖、互動流程、資料結構與技術實作細節，作為前端工程師實作時的對照規格。

---

## 二、設計概述

### 2.1 核心概念

Sprint 13 延續 Sprint 11 的「三種故事視角」與 Sprint 12 的「白紙黑格」視覺語言，將視角顆粒度從「模組/目錄層級」下鑽到「方法/端點層級」。三個視角呈現完全不同的佈局、互動範式與右側面板內容，讓使用者從三個角度理解同一份 codebase。

### 2.2 資料來源

所有資料取自 VideoBrief 專案的真實結構：
- Frontend: 102 files, ~14,800 lines
- Backend: 59 files, ~8,200 lines
- API Endpoints: 42 個
- Methods: 60+ 個（44 個在 LO 背景節點中呈現）

### 2.3 設計語言

| Token | 值 | 用途 |
|-------|-----|------|
| `--bg-paper` | `#fafafa` | 全域背景色 |
| `--grid-line` | `#d8d8d8` | 網格線（20px 間距） |
| `--grid-line-major` | `#c8c8c8` | 主網格線（100px 間距） |
| `--ink-primary` | `#1a1a2e` | 主要文字 |
| `--ink-secondary` | `#4a4a6a` | 次要文字 |
| `--ink-muted` | `#8888aa` | 輔助說明 |
| `--ink-faint` | `#bbbbcc` | 最淡文字 |
| `--shadow-card` | `0 1px 4px rgba(0,0,0,0.08)` | 卡片陰影 |
| `--shadow-hover` | `0 4px 16px rgba(0,0,0,0.12)` | Hover 陰影 |
| `--font-ui` | `Inter` | UI 字體 |
| `--font-mono` | `JetBrains Mono` | 程式碼字體 |

### 2.4 各視角色調

| 視角 | 主色 | CSS Variable 前綴 |
|------|------|-------------------|
| 系統框架 (SF) | Blue `#1565c0` | `--sf-*` |
| 邏輯運作 (LO) | Multi-color (分類) | `--lo-*` |
| 資料旅程 (DJ) | Green `#2e7d32` | `--dj-*` |

---

## 三、全域架構

### 3.1 頁面結構

```
#app (flex column, 100vh)
├── #header (48px, fixed)
│   ├── .header-logo   → "CodeAtlas"
│   ├── .header-path   → "~/projects/VideoBrief"
│   └── .header-badge  → "Sprint 13 · Method-Level"
├── #tabbar (44px, 三個分頁按鈕)
│   ├── .tab-btn.sf-tab → 系統框架
│   ├── .tab-btn.lo-tab → 邏輯運作
│   └── .tab-btn.dj-tab → 資料旅程
├── #main (flex: 1, flex row)
│   └── .tab-panel (一次只顯示一個)
│       ├── .canvas-area (flex: 1, 含 SVG)
│       └── .right-panel (300px, 右側詳情)
└── #legend (36px, 底部圖例)
```

### 3.2 分頁切換機制

```javascript
function switchTab(tab) {
  // 1. 移除所有 .active
  // 2. 加入 .active 到對應 tab-btn + tab-panel
  // 3. 切換 legend 顯示
  // 4. 懶初始化：首次切到該分頁才執行 init*()
}
```

- 首次載入只初始化 SF（`initSF()`）
- LO/DJ 於首次點擊分頁時才初始化（避免不必要的 DOM 操作）

### 3.3 SVG 渲染策略

所有視覺內容均透過 SVG + `foreignObject` 渲染：

```javascript
function createSVGEl(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}
```

- **SVG `<g>` 群組**：用來管理圖層顯示/隱藏（如 `lo-bg-nodes` vs `lo-chain-group`）
- **`foreignObject`**：在 SVG 中嵌入 HTML 元素，實現卡片、按鈕等複雜 UI
- **動態 viewBox**：當內容超出可視範圍時，動態調整 `viewBox` 和 SVG `height`

---

## 四、Tab 1 — 系統框架 (System Framework)

### 4.1 設計意圖

呈現專案的**目錄層級結構**與**模組間依賴關係**。使用固定座標佈局，每個目錄是一張卡片，邊（edge）代表 import 依賴。

### 4.2 資料結構

#### SF_NODES（17 個節點）

```javascript
{
  id: 'fe-services',
  label: 'services/',
  sublabel: 'frontend/src/services/',
  files: 7,
  type: 'dir',          // 'root' | 'dir'
  category: 'frontend', // 'frontend' | 'backend' | 'infra'
  autoExpand: false      // >70% 子檔案 → 自動展開
}
```

- 2 個 root 節點：`frontend/`（102 files）、`backend/`（59 files）
- 7 個 frontend 子目錄：app, components, services, hooks, contexts, utils, types
- 6 個 backend 子目錄：routes, services, models, core, schemas, tasks
- 2 個 infra 節點：nginx, relay

#### SF_EDGES（17 條邊）

```javascript
{ from: 'fe-services', to: 'be-routes', label: 'HTTP' }
```

關鍵跨域邊：`fe-services → be-routes`（前後端 HTTP 通訊）

#### SF_NODE_DETAILS（每節點的右側面板資料）

```javascript
{
  title: 'frontend/src/services/',
  path: 'frontend/src/services/',
  stats: { files: 7, functions: 34, lines: '~1,200' },
  files: [
    { name: 'video-api.ts', fns: 11 },
    { name: 'auth-api.ts', fns: 2 },
    // ...
  ],
  upstream: ['app/', 'components/', 'hooks/'],
  downstream: ['types/', 'backend/api/routes/ (API)']
}
```

#### SF_POSITIONS（手動佈局座標）

三層配置：
- Row 0 (y=60)：root 節點
- Row 1 (y=220, y=340)：子目錄
- Row 2 (y=460)：infra

### 4.3 互動流程

```
初始狀態
  → 所有卡片可見，邊以 opacity 0.6 顯示
  → 右側面板顯示 placeholder

點擊任一卡片 (sfSelectNode)
  ├── 被選卡片加 .selected（藍色光圈）
  ├── BFS 找出所有相連節點
  ├── 相連邊加 .highlighted（加粗、全不透明）
  ├── 不相連邊加 .dimmed（opacity 0.1）
  ├── 不相連卡片加 .dimmed（opacity 0.3）
  └── 右側面板更新 (sfShowDetail)
       ├── 📊 Statistics：files / functions / lines
       ├── 📄 Files：可展開列表
       │    └── 點擊 ▶ 展開函式清單 (sfToggleFile)
       ├── ⬆ Upstream：被誰 import
       └── ⬇ Downstream：import 了誰
```

### 4.4 邊路徑演算法

```javascript
function calcEdgePath(from, to, W, H) {
  // 判斷方向：垂直 or 水平
  if (|dy| > |dx|) {
    // 垂直：from 底部 → to 頂部，Bezier 曲線
    return `M fx,sy C fx,sy+30 tx,ey-30 tx,ey`;
  } else {
    // 水平：from 右側 → to 左側，Bezier 曲線
    return `M sx,fy C sx+dx*0.4,fy ex-dx*0.4,ty ex,ty`;
  }
}
```

### 4.5 卡片元件結構

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

色條顏色區分：
- `.backend` → `#1565c0` 藍
- `.frontend` → `#7b1fa2` 紫
- `.infra` → `#546e7a` 灰

---

## 五、Tab 2 — 邏輯運作 (Logic Operation)

### 5.1 設計意圖

呈現**方法之間的呼叫鏈**。有兩個狀態：

1. **初始狀態**：分類群組卡片（org-chart 風格），俯瞰全部 44 個方法
2. **鑽取狀態**：點擊任一方法 → 群組消失 → dagre TB 流程圖呈現完整呼叫鏈

### 5.2 資料結構

#### LO_BACKGROUND_NODES（44 個方法）

```javascript
{
  id: 'bg-upload',
  method: 'upload()',
  cls: 'video-api',     // 所屬 class/module
  cat: 'routes'          // 分類：routes | middleware | services | models | utils
}
```

分類分布：
- routes: ~16 個（video-api, admin-api, billing-api）
- middleware: 2 個（auth-api）
- services: ~25 個（最多，含 backend services）
- models: 0 個（在此顆粒度未單獨列出）
- utils: 1 個

#### LO_CHAINS（3 條呼叫鏈）

| 鏈名 | 節點數 | 入口 | 說明 |
|------|--------|------|------|
| `upload` | 10 | `POST /videos/upload` | 影片上傳處理全流程 |
| `query` | 7 | `GET /videos` | 影片列表查詢 |
| `auth` | 6 | `POST /auth/google` | Google 登入 |

每個鏈節點：
```javascript
{
  id: 'upload-5',
  method: 'extract_audio()',
  cls: 'services/ffmpeg',
  cat: 'services',
  layer: 5   // dagre 佈局層級
}
```

#### LO_NODE_DETAILS（23 個詳情）

每個呼叫鏈中的節點都有詳細資訊：

```javascript
{
  method: 'extract_audio()',
  sig: '(video_path: str)\n  → str (wav path)',
  cls: 'FFmpegService',
  file: 'backend/app/services/ffmpeg.py',
  lines: 38,
  complexity: 6,
  callers: ['process_video_task()'],
  callees: ['subprocess.run()'],
  exec: '~8s',
  errRate: '1.2%'
}
```

#### LO_METHOD_TO_CHAIN（44 筆對映）

將初始畫面的每個方法映射到對應的呼叫鏈：

```javascript
{
  'upload()': 'upload',
  'getVideos()': 'query',
  'googleLogin()': 'auth',
  'create_ecpay_checkout()': 'query',
  // ... 共 44 筆
}
```

#### LO_GROUP_DEFS（5 個分類）

```javascript
[
  { cat: 'routes',     label: 'Routes / API',     color: '#1565c0', icon: '🔵' },
  { cat: 'middleware',  label: 'Middleware / Auth', color: '#00838f', icon: '🟢' },
  { cat: 'services',   label: 'Services',          color: '#7b1fa2', icon: '🟣' },
  { cat: 'models',     label: 'Models / DB',       color: '#4e342e', icon: '🟤' },
  { cat: 'utils',      label: 'Utils / Tasks',     color: '#546e7a', icon: '⚫' },
]
```

#### LO_GROUP_EDGES（5 條群組間依賴）

```
routes → middleware → services → models
routes → services → utils
```

### 5.3 初始狀態 — 分類群組卡片

#### 佈局演算法

```
Dagre 層級佈局（TB 方向）：
  Layer 0: routes
  Layer 1: middleware
  Layer 2: services
  Layer 3: models + utils（並排）

每層內卡片水平居中排列：
  curX = (canvasWidth - totalLayerWidth) / 2
```

#### 卡片尺寸計算

```javascript
const cardW = 240;        // 固定寬度
const rowH = 24;          // 每個方法行高度
const headerH = 36;       // 卡片標頭
const padY = 12;          // 底部 padding
const layerGapY = 44;     // 層間距
const colGap = 50;        // 卡片間距
```

#### 收合/展開機制

**設計需求**：超過 5 個方法的卡片預設只顯示前 5 個，附「展開更多」按鈕。

```
預設狀態（收合）：
  cardH = headerH + min(methods.length, 5) * rowH + toggleRowH + padY

展開狀態：
  fullH = headerH + methods.length * rowH + toggleRowH + padY
```

互動流程：
```
點擊「▼ 展開更多 (25)」
  ├── 顯示所有隱藏的 .lo-method-row
  ├── 按鈕文字變為「▲ 收合」
  ├── 更新 foreignObject height → fullH
  ├── 更新 cardPositions[cat].h → fullH
  └── 呼叫 loRecalcLayout()
       ├── 重新計算所有層的 Y 座標
       ├── 更新所有 foreignObject 的 x, y
       ├── 調整 SVG viewBox 總高度
       └── 重繪群組間依賴箭頭
```

#### 群組間依賴箭頭

```javascript
// Bezier 曲線：從 from 卡片底部中心 → to 卡片頂部中心
d: `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`
```

樣式：`stroke: #bbb; stroke-width: 1.5; stroke-dasharray: 6 3; opacity: 0.6`

#### SVG 自動縮放

```javascript
// 如果內容高度超過視窗 1.2 倍 → 自動縮小
if (totalContentH > H * 1.2) {
  loZoomFit();  // scale = min(viewportH / contentH, viewportW / contentW)
}
```

縮放控制按鈕（右下角）：
- `+` 放大（每次 +15%）
- `-` 縮小（每次 -15%）
- `⊞` 適應畫面

### 5.4 鑽取狀態 — 呼叫鏈流程圖

#### 觸發方式

```
使用者點擊群組卡片中任一方法
  → loFindChainForMethod(methodName)
  → 查 LO_METHOD_TO_CHAIN 表
  → loSelectChain(chainKey)
```

#### 狀態切換

```javascript
function loSelectChain(chainKey) {
  // 1. 隱藏群組卡片 (lo-bg-nodes → display:none)
  // 2. 淡出提示文字 (lo-hint → .fade-out)
  // 3. 顯示呼叫鏈群組 (lo-chain-group → display:'')
  // 4. 繪製鏈節點 + 邊
  // 5. 顯示底部操作列
}
```

#### 呼叫鏈佈局

```
垂直居中排列（TB 方向）：
  nodeW = 200, nodeH = 44
  layerH = 100 (節點間距)
  centerX = canvasWidth / 2 - nodeW / 2
  
每個節點 (foreignObject):
  ┌──────────────────────────┐
  │ ▌ extract_audio()        │  ← 左側 3px 色條（按分類著色）
  │   services/ffmpeg        │
  └──────────────────────────┘
  
左側裝飾：
  ● (圓點, 按分類著色) + 層號 (0, 1, 2...)
```

#### 節點點擊 → 右側面板

```
點擊呼叫鏈中的節點 (loSelectNode)
  ├── 加 .selected-node 邊框
  └── 右側面板更新 (loShowNodeDetail)
       ├── 🔧 Method name (帶分類色條)
       ├── Signature (mono 字體，預格式化)
       ├── Class + File path
       ├── Lines / Complexity 指標
       ├── ⬆ Callers (N)
       ├── ⬇ Callees (N)
       └── 📊 Avg execution / Error rate
```

#### 清除選取

```
點擊「清除選取」按鈕 (clearLoChain)
  → svg.innerHTML = '' (完全清空)
  → 重新呼叫 initLO() (重建群組卡片)
  → 恢復提示文字、隱藏底部列、重置右側面板
```

### 5.5 LO 分類色碼

| 分類 | 色碼 | 用途 |
|------|------|------|
| routes | `#1565c0` | API 路由 |
| services | `#7b1fa2` | 業務邏輯服務 |
| middleware | `#00838f` | 認證/中介層 |
| models | `#4e342e` | 資料模型 |
| utils/tasks | `#546e7a` | 工具類/背景任務 |

---

## 六、Tab 3 — 資料旅程 (Data Journey)

### 6.1 設計意圖

呈現 **API 端點的完整資料流**。使用者選擇一個 API 端點，系統以 stagger animation 逐步展示資料從請求進入到回應送出的每一步，包括每步的 Input/Output/Transform。

### 6.2 資料結構

#### DJ_ENTRIES_RAW（6 個 API 端點）

```javascript
{
  id: 'j-upload',
  method: 'POST /api/v1/videos/upload',
  desc: '影片上傳',
  badge: '8 steps'
}
```

#### 自動分類機制

```javascript
function autoCategorizeDJEntries(entries) {
  // 解析 URL 前綴：
  //   "POST /api/v1/videos/upload" → prefix = "videos"
  //   "POST /api/v1/auth/google"   → prefix = "auth"
  //
  // 依 prefix 分組，對照 DJ_CAT_META 取得標籤/顏色/圖示
}
```

分類結果：
| 前綴 | 端點數 | 顏色 | 圖示 |
|------|--------|------|------|
| videos | 4 | `#1565c0` | 🎬 |
| auth | 1 | `#00838f` | 🔐 |
| billing | 1 | `#7b1fa2` | 💳 |

#### DJ_JOURNEYS（6 條旅程）

每條旅程包含 5-9 個步驟，每步：

```javascript
{
  name: 'check_upload_quota()',       // 步驟名稱
  desc: '檢查上傳配額',               // 描述
  input: 'User object',              // 輸入
  output: 'bool (quota OK)',         // 輸出
  transform: 'User.plan → quota limit → compare usage_count',  // 轉換邏輯
  method: 'check_upload_quota()',     // 對應方法
  file: 'services/quota_service.py'   // 檔案位置
}
```

### 6.3 初始狀態 — 端點選擇

#### 佈局

```
分類群組佈局：
  每個分類標題（帶色條底線）
  └── 2 欄網格，每張 260×64 的端點卡片

卡片樣式：
  ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐
  │ ▌POST /api/v1/videos/upload  │  ← 綠色虛線框 + 左側分類色條
  │   影片上傳                     │
  │   [8 steps]                   │
  └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘
```

- 卡片邊框：`1.5px dashed var(--dj-border)` 綠色虛線
- Hover 效果：虛線變實線 + `translateY(-2px)` + shadow 加深
- 脈衝環動畫：`@keyframes dj-pulse`（2s 循環）

### 6.4 播放狀態 — Stagger Animation

#### 觸發

```
使用者點擊端點卡片 (djStartJourney)
  ├── 隱藏端點選擇畫面
  ├── 清空並顯示旅程群組
  ├── 預建立所有步驟節點（opacity: 0）
  ├── 設置右側面板
  └── 啟動 stagger 動畫
```

#### 動畫流程

```
animateStep(0)
  ├── fadeIn: opacity 0→1 (20ms interval, 0.15 step)
  ├── 邊加 .appeared (opacity 0→0.8)
  ├── 當前節點加 .active-step (綠色光圈)
  ├── 前一節點移除 .active-step
  ├── 右側面板 djPanelHighlight(i) ← 只高亮，不展開
  └── setTimeout(350ms) → animateStep(1)
       └── ... 重複直到最後一步
```

**關鍵設計決策**：

- 動畫期間只呼叫 `djPanelHighlight()`：高亮當前行、標記已完成行
- **不展開** Input/Output/Transform 明細
- 明細只有在使用者**手動點擊**右側面板的步驟行時才展開

#### 步驟節點元件

```html
<div class="dj-step-node">
  <div class="dj-step-num">Step 3</div>
  <div class="dj-step-name">check_upload_quota()</div>
  <div class="dj-step-desc">檢查上傳配額</div>
</div>
```

尺寸：`nodeW=340, nodeH=76, stepSpacing=96`

### 6.5 右側面板 — 互動細節

#### 面板結構

```
DJ 右側面板
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
│           └── 📍 Method + File
├── [重播此旅程] 按鈕
└── [清除選取] 按鈕
```

#### 三種行狀態

| 狀態 | CSS Class | Badge 顏色 | Status 圖示 |
|------|-----------|------------|-------------|
| 未到達 | (預設) | 灰底灰字 | 空心圓 |
| 進行中 | `.active-item` | 綠底白字 | 綠色空心+光暈 |
| 已完成 | `.completed-item` | 淡綠底綠字 | 綠色實心圓 |

#### 明細展開（點擊觸發）

```javascript
function djPanelSetActive(stepIdx) {
  // 1. 先高亮當前步驟
  djPanelHighlight(stepIdx);

  // 2. Toggle 明細：
  //    - 關閉所有其他步驟的 .dj-step-detail
  //    - 當前步驟的 .dj-step-detail.toggle('open')
  
  // 3. 同步高亮 canvas 上的步驟節點
  //    - 移除所有 .active-step
  //    - 加入 .active-step 到對應節點
}
```

#### 重播 (djReplay)

```
點擊「重播此旅程」
  → 停止現有動畫 timer
  → 捲軸回頂
  → 清空旅程群組
  → 重新呼叫 djStartJourney(currentJourney)
```

#### 清除選取 (djClearSelection)

```
點擊「清除選取」
  → 停止動畫 timer
  → 恢復 SVG 尺寸
  → 移除 .scrollable
  → 隱藏旅程群組，顯示端點選擇
  → 恢復提示文字
  → 重置右側面板
```

---

## 七、SVG 動態尺寸策略

### 7.1 問題

SVG viewBox 固定大小時，當內容（如 10 步的呼叫鏈、25 個方法的群組卡）超出可視區域，內容會被裁切。

### 7.2 解決方案

```javascript
// 1. 計算所需高度
const requiredH = startY + totalElements * spacing + bottomPadding;
const svgH = Math.max(viewportH, requiredH);

// 2. 更新 SVG
svg.setAttribute('viewBox', `0 0 ${W} ${svgH}`);
svg.style.height = svgH + 'px';

// 3. 啟用卷軸
canvasWrap.classList.add('scrollable');
// CSS: .canvas-area.scrollable { overflow-y: auto; }
// CSS: .canvas-area.scrollable svg { height: auto; min-height: 100%; }
```

### 7.3 適用場景

| 場景 | 觸發條件 |
|------|---------|
| LO 初始群組 | Services 卡片展開後總高度超出 |
| LO 呼叫鏈 | upload 鏈 10 節點需 ~1040px |
| DJ 旅程播放 | process 旅程 9 步需 ~900px |

---

## 八、關鍵 CSS 設計模式

### 8.1 pointer-events 策略

```css
/* 所有提示/覆蓋層永遠不攔截點擊 */
.lo-hint, .dj-hint { pointer-events: none; }

/* 重要：JS 中不再設定 pointerEvents = 'auto' */
/* 這是 Sprint 12 的已知踩坑 */
```

### 8.2 fade-out 控制

```css
.fade-out {
  opacity: 0 !important;
  pointer-events: none;
}
```

用於提示文字在進入鑽取/播放狀態時淡出。

### 8.3 狀態驅動的元件

```css
/* DJ 步驟明細：預設隱藏，手動點擊才顯示 */
.dj-step-detail { display: none; }
.dj-step-detail.open { display: block; }

/* LO 群組卡片收合行：透過 data-hidden + style.display 控制 */
.lo-method-row[data-hidden] { /* 由 JS 控制 display */ }
```

---

## 九、效能考量

### 9.1 懶初始化

- 三個分頁只在首次切換時才執行 `init*()`
- 避免載入時一次建立 ~100 個 DOM 節點

### 9.2 動畫節制

- Stagger animation 使用 `setTimeout` 鏈（非 `requestAnimationFrame`），350ms 間隔人眼可感知
- fadeIn 使用 `setInterval(20ms)` + `opacity += 0.15`，約 7 幀完成（~140ms）

### 9.3 DOM 重用

- `clearLoChain()` 採用 `svg.innerHTML = '' + initLO()` 重建，而非嘗試恢復隱藏元素
- 簡化狀態管理，避免殘留 CSS class

---

## 十、已知限制與未來改進

| 項目 | 現況 | 改進方向 |
|------|------|---------|
| SF 佈局 | 手動座標 | 改用 dagre 自動計算 |
| LO 呼叫鏈 | 僅 3 條 | 支援動態新增 |
| DJ 旅程 | 僅 6 條 | 接入 core 引擎自動生成 |
| 響應式 | min-width 1200px | 適配更小螢幕 |
| SVG 縮放 | CSS transform | 改用 viewBox 縮放（避免模糊） |
| 搜尋 | 無 | 加入方法/端點搜尋框 |

---

## 十一、檔案清單

| 檔案 | 大小 | 說明 |
|------|------|------|
| `method-level-mockup.html` | ~2900 行 | 主圖稿（HTML + CSS + JS 單檔） |
| `method-level-mockup-v1-backup.html` | — | 第一版備份 |
| `method-level-mockup-spec.md` | — | 本技術規格書 |

---

*設計總監核准發行 · 2026-04-02*
