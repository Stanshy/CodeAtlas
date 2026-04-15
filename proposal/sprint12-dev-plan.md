# 開發計畫書: Sprint 12 — 視覺重塑 + 呈現邏輯重做

> **撰寫者**: PM（老闆要求 PM 撰寫，確保需求精確傳達）
> **日期**: 2026-04-01
> **專案**: CodeAtlas
> **Sprint 提案書**: `proposal/sprint12-proposal.md`
> **狀態**: 待執行

---

> 本文件在 G0 通過後由 PM 撰寫。Sprint 12 是視覺和呈現邏輯的根本性重做，不是微調。
> **核准圖稿**：`proposal/references/sprint12/three-perspectives-mockup.html`（2022 行完整 HTML，TL 必須逐行參照）

## 1. 需求摘要

Sprint 11 交付了三種故事視角（1092 tests），但老闆看實際畫面後判定失敗：「三個視角看起來幾乎沒差異，使用者看不懂」。

**根因**：Sprint 11 只改了佈局和顏色，沒改「使用者看什麼」。三個視角都顯示同一堆檔案節點，只是排列方式和顏色不同。

**Sprint 12 做兩件大事**：

1. **視覺風格**：深色霓虹 → 白紙黑格（全局 CSS 主題替換）
2. **呈現邏輯**：三種視角必須顯示**完全不同的內容**
   - 系統框架 = 目錄卡片（5~15 張）← 不是檔案節點
   - 邏輯運作 = 聚焦模式（預設全 dimmed，click 才亮）← 不是 hover 高亮
   - 資料旅程 = 播放模式（節點逐步出現）← 不是逐步亮起

### 確認的流程

需求 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）

> **無 G1** — 核准 HTML 圖稿已完整，TL 直接參照實作。
> **core + web 雙層改動** — core 新增目錄聚合，web 主題替換 + 呈現邏輯重做。

---

## 2. 技術方案

### ⚠️ Sprint 11 vs Sprint 12 關鍵差異（TL 必讀）

> **以下每一項都是 Sprint 12 與 Sprint 11 的根本區別。Sprint 11 的程式碼不能「微調」，必須按以下方向重做。**

#### 差異 1：全局視覺 — 深色霓虹 → 白紙黑格

| 項目 | Sprint 11（現狀） | Sprint 12（目標） |
|------|-------------------|-------------------|
| 背景色 | 深色（接近黑色） | `#fafafa` 白紙 |
| 網格 | 無 / 3D GridHelper | 雙層 CSS 網格（20px `#d8d8d8` + 100px `#c8c8c8`） |
| 節點 | 霓虹發光 + 深色填充 | 實線邊框 + 白色 `#ffffff` 填充 |
| 邊 | 霓虹色邊 | `#9aa8bc` 灰色邊 |
| 字型 | 系統字型 | `Inter`（UI）+ `JetBrains Mono`（code） |
| 陰影 | 無 / 霓虹 glow | `0 1px 4px rgba(0,0,0,0.08)` 輕微陰影 |

#### 差異 2：系統框架 — 檔案節點 → 目錄卡片

| 項目 | Sprint 11 | Sprint 12 |
|------|-----------|-----------|
| 顯示什麼 | 所有檔案節點（50+ 個） | **目錄卡片**（5~15 個） |
| 資料來源 | 檔案級 Graph JSON | **core 新增 `aggregateByDirectory()` 產出目錄級數據** |
| 佈局 | dagre 排成一條水平線（失敗） | dagre 分層成功（節點少，可正常分層） |
| 色調 | Cyan `#00d4ff` 霓虹 | 藍色實線（邊框 `#1565c0`，背景 `#e3f2fd`） |
| 卡片內容 | 無 | 目錄名 + 檔案數 badge + 類型 icon |
| hover 效果 | 無特別 | hover 高亮連接的目錄 + 邊，非相關 dimmed 0.25 |

#### 差異 3：邏輯運作 — hover 高亮 → click 聚焦

| 項目 | Sprint 11 | Sprint 12 |
|------|-----------|-----------|
| 預設狀態 | 所有節點都可見 | **所有節點 dimmed（opacity 0.08）+ 中央提示文字** |
| 觸發方式 | hover 節點 | **click 節點** |
| 效果 | 呼叫鏈高亮，非相關淡化至 0.15 | **僅呼叫鏈亮起，非相關保持 0.08（近乎消失）** |
| 邊 | 所有邊都可見 | **預設所有邊 opacity 0，僅呼叫鏈的邊顯示** |
| 中央提示 | 無 | **「點擊任一節點查看呼叫鏈」+ ★ 推薦入口標示** |
| 底部面板 | 無 | **呼叫鏈名稱 + 節點數 + 清除選取按鈕** |
| 重置方式 | mouseleave | **點擊空白處 / 點擊「清除選取」按鈕** |

#### 差異 4：資料旅程 — 逐步亮起 → 逐步出現

| 項目 | Sprint 11 | Sprint 12 |
|------|-----------|-----------|
| 初始狀態 | 所有節點可見，逐步變亮 | **畫面空白 + 「選擇資料入口開始追蹤」提示** |
| 入口選擇 | 自動 | **畫面顯示 entry 節點（綠色脈衝動畫），click 開始** |
| 動畫方式 | 節點逐步「高亮」 | **節點逐步「出現」（從 opacity 0 → 1）** |
| 邊動畫 | stroke-dasharray 流動 | **stroke-dashoffset 200→0（逐步畫出）** |
| 面板位置 | E2E 面板（現有左側） | **右側專用面板（280px 固定寬度）** |
| 面板內容 | 現有 E2E | **步驟列表（步驟號 + 節點名 + 描述），active 步驟綠色高亮** |
| 重播 | 無 | **底部「重播此旅程」按鈕（綠色）** |

---

### 2.1 白紙黑格主題系統

#### Design Tokens（從核准圖稿提取）

```typescript
// packages/web/src/styles/theme.ts — 全面重寫
export const THEME = {
  // 背景
  bgPaper: '#fafafa',
  bgGrid: '#f0f0f0',
  gridLine: '#d8d8d8',
  gridLineMajor: '#c8c8c8',
  
  // 文字
  inkPrimary: '#1a1a2e',
  inkSecondary: '#4a4a6a',
  inkMuted: '#8888aa',
  inkFaint: '#bbbbcc',
  
  // 邊框與陰影
  borderDefault: '#d0d0d8',
  shadowCard: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
  shadowHover: '0 4px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
  
  // 系統框架 — 藍色
  sfBorder: '#1565c0',
  sfBg: '#e3f2fd',
  sfAccent: '#1976d2',
  sfLine: '#1e88e5',
  
  // 邏輯運作 — 多色分類
  loRoutes: '#1565c0',
  loServices: '#7b1fa2',
  loControllers: '#e65100',
  loModels: '#4e342e',
  loUtils: '#546e7a',
  loMiddleware: '#00838f',
  
  // 邏輯運作 — 分類背景色
  loBgRoutes: '#e3f2fd',
  loBgServices: '#f3e5f5',
  loBgControllers: '#fff3e0',
  loBgModels: '#efebe9',
  loBgUtils: '#eceff1',
  loBgMiddleware: '#e0f7fa',
  
  // 資料旅程 — 綠色
  djBorder: '#2e7d32',
  djBg: '#e8f5e9',
  djAccent: '#388e3c',
  djLine: '#43a047',
  djGlow: 'rgba(46, 125, 50, 0.2)',
  
  // 間距
  radiusSm: '6px',
  radiusMd: '10px',
  radiusLg: '16px',
  
  // 字型
  fontUi: "'Inter', sans-serif",
  fontMono: "'JetBrains Mono', monospace",
} as const;
```

#### CSS 變數（全局注入）

```css
/* packages/web/src/styles/global.css — 新增/重寫 */
:root {
  --bg-paper: #fafafa;
  --bg-grid: #f0f0f0;
  --grid-line: #d8d8d8;
  --grid-line-major: #c8c8c8;
  --ink-primary: #1a1a2e;
  --ink-secondary: #4a4a6a;
  --ink-muted: #8888aa;
  --ink-faint: #bbbbcc;
  --border-default: #d0d0d8;
  --shadow-card: 0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04);
  --shadow-hover: 0 4px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06);
  --sf-border: #1565c0;
  --sf-bg: #e3f2fd;
  --lo-routes: #1565c0;
  --lo-services: #7b1fa2;
  --lo-controllers: #e65100;
  --dj-border: #2e7d32;
  --dj-bg: #e8f5e9;
  --radius-sm: 6px;
  --radius-md: 10px;
  --font-ui: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

#### 雙層網格背景（從圖稿提取）

```css
.grid-bg {
  background-color: var(--bg-paper);
  background-image:
    linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px),
    linear-gradient(var(--grid-line-major) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line-major) 1px, transparent 1px);
  background-size: 20px 20px, 20px 20px, 100px 100px, 100px 100px;
  background-position: -1px -1px, -1px -1px, -1px -1px, -1px -1px;
}
```

#### 元件適配（所有 web 元件）

需要改動的元件（NeonNode、NeonEdge 等保留命名不改，只改樣式）：

| 元件 | 原風格 | 新風格 |
|------|--------|--------|
| `NeonNode` | 深色填充 + 霓虹邊框 glow | `fill: #ffffff` + `stroke: {color}` 實線 + `stroke-width: 1.5` + `drop-shadow(0 1px 3px rgba(0,0,0,0.08))` |
| `NeonEdge` | 霓虹色邊 + glow | `stroke: #9aa8bc` + `stroke-width: 1.5` + 無 glow |
| `ControlPanel` | 深色背景 | `background: #ffffff` + `border: 1.5px solid var(--border-default)` |
| `Toolbar` | 深色背景 | `background: #ffffff` + `border-bottom: 1.5px solid var(--border-default)` |
| `E2EPanel` / 右側面板 | 深色 | `background: #ffffff` + `border-left: 1.5px solid var(--border-default)` |
| `GraphCanvas` 容器 | 深色背景 | `.grid-bg` class（雙層網格） |
| `Header` | 深色 | `background: #ffffff` + `height: 60px` + `border-bottom: 1.5px solid var(--border-default)` |
| Tab Bar | 無（Sprint 11 是 radio） | 見 §2.5 視角切換 UI |

---

### 2.2 Core 層：目錄聚合引擎

> **這是 Sprint 12 唯一的 core 層改動。** Sprint 11 純 web 層，Sprint 12 需要 core 新增函式。

#### `aggregateByDirectory()` 函式

```typescript
// packages/core/src/analyzers/directory-aggregator.ts — 新增

export interface DirectoryNode {
  id: string;                    // 目錄路徑，如 'src/services'
  label: string;                  // 顯示名，如 'services/'
  type: 'entry' | 'logic' | 'data' | 'support';  // 分類
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

/**
 * 將檔案級 Graph JSON 聚合為目錄級。
 * 
 * 聚合規則：
 * 1. 每個目錄成為一個節點（只取第一層目錄，如 src/services → services/）
 * 2. 目錄間的邊 = 子檔案間依賴的聯集（去重）
 * 3. 同目錄內的邊忽略（不產生自循環）
 * 4. 扁平專案（≤2 個目錄）回退 → 返回 null，web 層回退為檔案視圖
 * 
 * 分類邏輯（從圖稿 SF_TYPE_COLOR 提取）：
 * - entry: 入口檔（app.ts, index.ts, main.ts 所在目錄）
 * - logic: 業務邏輯（routes, controllers, services, hooks）
 * - data: 資料層（models, db, types, schemas）
 * - support: 輔助（utils, lib, config, middleware, tests）
 */
export function aggregateByDirectory(
  nodes: GraphNode[],
  edges: GraphEdge[],
): DirectoryGraph | null {
  // 1. 按目錄分組
  // 2. 計算目錄間依賴
  // 3. 扁平專案回退
  // 4. 回傳 DirectoryGraph
}
```

#### Graph JSON 擴充

API 端點 `/api/graph` 的回應新增 `directoryGraph` 欄位：

```typescript
interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  directoryGraph: DirectoryGraph | null;  // Sprint 12 新增
}
```

> CLI 端（server.ts）需要呼叫 `aggregateByDirectory()` 並附加到回應中。

#### 目錄分類 icon 對照（從圖稿 `SF_TYPE_ICON` 提取）

| type | icon | 顏色 |
|------|------|------|
| entry | ⬡ | `#1565c0` border + `#e3f2fd` bg + `#bbdefb` badge bg |
| logic | ◈ | `#1565c0` border + `#e3f2fd` bg + `#bbdefb` badge bg |
| data | ◆ | `#0d47a1` border + `#e8eaf6` bg + `#c5cae9` badge bg |
| support | ◇ | `#546e7a` border + `#eceff1` bg + `#cfd8dc` badge bg |

---

### 2.3 系統框架 = 目錄鳥瞰（徹底重做）

#### 資料源切換

系統框架視角啟用時，GraphCanvas **不使用**檔案級節點，改用 `directoryGraph`：

```typescript
// graph-adapter.ts 修改
function applyPerspective(perspective, rawNodes, rawEdges, directoryGraph) {
  if (perspective === 'system-framework' && directoryGraph) {
    // 使用目錄級數據
    return adaptDirectoryGraph(directoryGraph);
  }
  // 其他視角使用檔案級數據
  return applyFileBasedPerspective(perspective, rawNodes, rawEdges);
}
```

#### 目錄卡片渲染（從圖稿 CSS 提取）

每張目錄卡片的結構（對照圖稿 `.dir-card`）：

```
┌─────────────────────────┐  ← .card-body: fill:#fff, stroke:{type-border}, stroke-width:1.5, rx:8
│ ▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃  │  ← 頂部色帶: fill:{type-border}, opacity:0.15, height:5px
│ ● services/             │  ← 圓點 + 目錄名（JetBrains Mono 11px bold）
│ ┌──────────┐            │
│ │ 10 files │            │  ← badge: bg:{type-badgeBg}, color:{type-badge}, 9px
│ └──────────┘            │
└─────────────────────────┘
  └── 3px offset shadow: rgba(0,0,0,0.07)
```

#### hover 互動（從圖稿 JS `highlightSFNode()` 提取）

1. hover 目錄卡片 → 高亮該卡片（`fill: sfBg`, `stroke-width: 2.5`, `drop-shadow` 增強）
2. 該卡片直接連接的邊 → `stroke: #1e88e5`, `stroke-width: 2.5`, `marker-end: sf-arrow-hi`
3. 邊連接的其他卡片 → 保持正常
4. **非連接的卡片和邊** → `dimmed`（卡片 `opacity: 0.25`，邊 `opacity: 0.12`）
5. mouseleave → 重置所有狀態

#### 邊的樣式（肘部路徑）

```typescript
// 從圖稿 elbowPath() 提取
function elbowPath(x1, y1, x2, y2) {
  const my = y1 + (y2 - y1) * 0.5;
  return `M ${x1} ${y1} L ${x1} ${my} L ${x2} ${my} L ${x2} ${y2}`;
}
// 邊: stroke:#9aa8bc, stroke-width:1.5, marker-end: arrow
// hover 高亮: stroke:#1e88e5, stroke-width:2.5
```

#### dagre 佈局參數

Sprint 11 dagre 排成一條線是因為檔案太多。Sprint 12 目錄只有 5~15 個，dagre 正常分層。

```typescript
g.setGraph({
  rankdir: 'TB',    // Top-to-Bottom
  nodesep: 60,      // 節點間距
  ranksep: 100,     // 層間距
  marginx: 40,
  marginy: 40,
});
// 卡片寬度 ~160px，高度 ~72px
```

#### 底部 Legend Bar（從圖稿 `.sf-legend-bar` 提取）

```
[ ● 模組目錄 ] [ ─── 依賴箭頭 ] [ ─── Hover 高亮路徑 ]        Hover 目錄卡片查看連線
```

高度 44px，白色背景，`border-top: 1px solid var(--border-default)`。

---

### 2.4 邏輯運作 = 聚焦模式（徹底重做）

> **核心區別**：Sprint 11 是「hover 高亮」，Sprint 12 是「click 聚焦 + 其餘近乎消失」。

#### 預設狀態（無選中）

- **所有節點**：`opacity: 0.08`（近乎消失，但能看到模糊輪廓）
- 圖稿用 `.lo-node.faded { opacity: 0.3 }` 但初始是 faded，搭配文字 dimmed 是 0.08
- **所有邊**：`opacity: 0`（完全不可見）
- **中央提示**（從圖稿 `.lo-hint` 提取）：
  ```
  ○ ← 虛線圓圈 (border: 2px dashed var(--ink-faint), border-radius:50%)
  點擊任一節點查看呼叫鏈  ← 22px bold, color: var(--ink-secondary)
  ★ 標示為推薦入口，任意節點皆可點擊  ← 14px, color: var(--ink-muted)
  ```
  `pointer-events: none`，不遮擋點擊。

#### ★ 推薦入口標示

部分節點有 ★ 標記（黃色 `#f59e0b`，10px），表示推薦入口。
由 core 層的 node role 決定：`business-logic` 且為 route/API 入口的標記為推薦。

#### Click 聚焦行為（從圖稿 `selectLONode()` 提取）

1. 使用者 click 任意節點
2. **BFS 找到該節點所屬的呼叫鏈**
3. 鏈上節點 → `active`（完全可見）
   - 節點 `.lo-rect`: `fill: {category-bg}`, `stroke-width: 2.5`
   - 入口節點額外: `stroke-width: 3`
4. 非鏈節點 → `dimmed`（`opacity: 0.08`）
   - `.lo-rect`: 保持 `fill: #ffffff`, `stroke-width: 1.5`
5. 鏈上的邊 → `.visible`（`opacity: 1`）
6. 其他邊 → 保持 `opacity: 0`
7. 中央提示 → 消失（`opacity: 0`）
8. **底部面板出現**（從圖稿 `.lo-chain-info` 提取）：
   ```
   [鏈名稱 bold] [8 個節點 muted] [清除選取 button]
   ```
   - `position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%)`
   - `background: #ffffff; border: 1.5px solid var(--border-default); border-radius: 10px`
   - `box-shadow: var(--shadow-hover)`

#### 重置行為

- 點擊 SVG 空白處 → `resetLoSelection()`
- 點擊「清除選取」按鈕 → `resetLoSelection()`
- 重置後：所有節點回到 faded (0.08)，所有邊隱藏，中央提示重新出現

#### 節點分類色彩（從圖稿 `LO_CATEGORY_COLOR` / `LO_CATEGORY_BG` 提取）

| 分類 | border 色 | active 背景色 |
|------|-----------|--------------|
| routes | `#1565c0` | `#e3f2fd` |
| services | `#7b1fa2` | `#f3e5f5` |
| controllers | `#e65100` | `#fff3e0` |
| models | `#4e342e` | `#efebe9` |
| utils | `#546e7a` | `#eceff1` |
| middleware | `#00838f` | `#e0f7fa` |

#### 底部 Legend Bar（從圖稿 `.lo-legend-bar` 提取）

```
[ ● routes ] [ ● services ] [ ● controllers ] [ ● models ] [ ● utils ] [ ● middleware ]    點擊節點展開呼叫鏈 · 點擊空白重置
```

#### 修改 `useBfsHoverHighlight` → `useBfsClickFocus`

Sprint 11 的 hook 基於 hover（`hoveredNodeId`），Sprint 12 改為 click（`selectedNodeId`）：
- 觸發：`onClick` 而非 `onMouseEnter`
- 保持：選中狀態持續直到重置（不是 mouseleave 消失）
- `maxDepth` 保持 5

---

### 2.5 資料旅程 = 播放模式（徹底重做）

> **核心區別**：Sprint 11 節點「逐步亮起」（已在畫面上），Sprint 12 節點「逐步出現」（從無到有）。

#### 初始狀態（無選中旅程）

- **畫面**：顯示 entry 節點（綠色框，有脈衝動畫）+ 中央提示
- **中央提示**（從圖稿 `.dj-hint` 提取）：
  ```
  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
  │                          │  ← border: 2px dashed var(--dj-border), border-radius:16px
  │  選擇資料入口開始追蹤      │  ← 18px bold, color: var(--dj-border)
  │  點擊綠色框入口節點        │  ← 13px, color: var(--ink-muted)
  │  觀察資料如何逐步流動      │
  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
  ```
- **Entry 節點**：
  - `fill: #e8f5e9`, `stroke: #2e7d32`, `stroke-width: 2`
  - 外框脈衝：`stroke: #43a047`, `stroke-width: 1.5`, `opacity: 0.4`（動畫效果）
  - 文字：`JetBrains Mono 12px bold`, `color: #1b5e20`
  - 副標：「點擊開始追蹤」`10px, color: #388e3c`

#### 右側面板（280px 固定寬度，從圖稿 `.dj-panel` 提取）

```
┌─────────────────────┐
│ 資料旅程步驟          │ ← header: bg:#f0f0f0, 13px bold
│ 請選擇入口            │ ← 11px muted
├─────────────────────┤
│ ① POST /api/users   │ ← .dj-step-item (inactive: opacity 0.35)
│   HTTP Request 進入   │
│ ② JSON Parse         │
│   Body → Raw Object  │
│ ③ Schema Validate    │ ← .active: opacity 1, bg:#e8f5e9, border:1px solid #a5d6a7
│   Zod → validated DTO│    step-num: bg:#2e7d32, color:#fff
│ ④ ...               │ ← .done: opacity 0.7, step-num: bg:#a5d6a7
│                      │
├─────────────────────┤
│ [  重播此旅程  ]      │ ← .dj-replay-btn: bg:#2e7d32, color:#fff
│                      │    hover: bg:#1b5e20
└─────────────────────┘
```

#### Click Entry → 播放動畫（從圖稿 `startDJJourney()` 提取）

1. 隱藏中央提示
2. 清空 SVG，重建該旅程的節點和邊
3. **所有節點初始 `opacity: 0`**（不可見）
4. **所有邊初始 `stroke-dashoffset: 200`**（未畫出）
5. **開始 stagger 動畫**：
   - 每 350ms 亮起一個節點（`opacity: 0 → 1`，transition 0.25s）
   - 同時畫出前一個節點到當前節點的邊（`stroke-dashoffset: 200 → 0`，transition 0.45s）
   - 當前步驟節點：`current` class — `fill: #e8f5e9`, `stroke: #2e7d32`, `stroke-width: 3`, `filter: drop-shadow(0 0 12px rgba(46,125,50,0.4))`
   - 已完成步驟節點：`lit` class — `fill: #e8f5e9`, `stroke: #2e7d32`, `stroke-width: 2.5`, `filter: drop-shadow(0 2px 8px rgba(46,125,50,0.25))`
6. **右側面板同步**：
   - 當前步驟 `.active`（opacity 1，綠色背景）
   - 已完成步驟 `.done`（opacity 0.7）
   - 未到步驟保持 `opacity: 0.35`
7. **播放完成** → 顯示「重播此旅程」按鈕

#### 修改 `useStaggerAnimation`

Sprint 11 的 hook 基於「高亮」（`visibleNodes` = 所有節點都在，按順序高亮）。Sprint 12 改為「出現」：
- `revealedSteps: number` — 已出現的步驟數
- 節點不在 `revealedSteps` 範圍內 → `opacity: 0`（不可見）
- 邊不在 `revealedSteps` 範圍內 → `stroke-dashoffset: 200`
- > 30 步驟時加速至 100ms/步

---

### 2.6 視角切換 UI（Tab Bar）

Sprint 11 是 ControlPanel 內的三選一 radio。Sprint 12 改為**頂部 Tab Bar**（從圖稿 `.tab-bar` 提取）：

```
┌────────────────────────────────────────────────────────────────┐
│ ● 系統框架  13  │   ● 邏輯運作  42  │   ● 資料旅程  3            │
└────────────────────────────────────────────────────────────────┘
```

| 元素 | 樣式 |
|------|------|
| Tab Bar | `height: 48px`, `background: #ffffff`, `border-bottom: 1.5px solid var(--border-default)` |
| Tab 按鈕 | `height: 40px`, `padding: 0 20px`, `font: 13px 500 Inter`, `color: var(--ink-muted)` |
| Active Tab | `background: #ffffff`, `border: 1.5px solid var(--border-default)`（底部無邊框），`font-weight: 600`, `color: var(--ink-primary)` |
| 色點 | 8px circle — 藍色 `#1565c0` / 三色漸層（conic-gradient）/ 綠色 `#2e7d32` |
| 計數 badge | `11px 600`, `color: var(--ink-faint)`, `background: var(--bg-grid)`, `border: 1px solid var(--border-default)`, `border-radius: 10px` |

#### 切換行為

- 系統框架 → 載入 `directoryGraph`，dagre 佈局
- 邏輯運作 → 載入檔案級節點，全部 faded + 中央提示
- 資料旅程 → 載入 entry 節點選擇畫面 + 右側面板
- 切換時 `.perspective-panel` toggle（`display: none` ↔ `display: flex`）

---

### 2.7 PerspectivePreset 更新

Sprint 11 的 `PERSPECTIVE_PRESETS` 需要更新以反映新的呈現邏輯：

```typescript
// packages/web/src/adapters/perspective-presets.ts — 更新
export const PERSPECTIVE_PRESETS: Record<PerspectiveName, PerspectivePreset> = {
  'system-framework': {
    // ...Sprint 11 保留
    colorScheme: 'blue-paper',           // ← 從 'cyan-monochrome' 改
    interaction: 'directory-hover',       // ← 從 'static-hierarchy' 改
    dataSource: 'directory',              // ← 新增：使用 directoryGraph
  },
  'logic-operation': {
    // ...Sprint 11 保留
    colorScheme: 'multi-paper',           // ← 從 'neon-multicolor' 改
    interaction: 'bfs-click-focus',       // ← 從 'bfs-hover-highlight' 改
    dataSource: 'file',                   // ← 新增
  },
  'data-journey': {
    // ...Sprint 11 保留
    colorScheme: 'green-paper',           // ← 從 'green-monochrome' 改
    interaction: 'stagger-appear',        // ← 從 'stagger-playback' 改（出現 vs 高亮）
    dataSource: 'file',                   // ← 新增
  },
};
```

---

### 2.8 策展 + 視角整合（更新）

三層過濾順序不變：`perspective → curation → manual filter`。

但系統框架視角的策展邏輯需調整：
- 系統框架使用 `directoryGraph`，策展在目錄級別運作（不是檔案級）
- 目錄的 role 繼承自子節點的主要角色
- `noise` 目錄（如 `tests/`）在系統框架中仍然可見（因為只有 5~15 個卡片，全部顯示更好理解）

---

## 3. UI 圖稿

| 頁面/元件 | 檔案 | 說明 |
|----------|------|------|
| 完整三視角 + 白紙黑格效果 | `proposal/references/sprint12/three-perspectives-mockup.html` | 老闆 2026-04-01 核准，2022 行完整 HTML+CSS+JS，**TL 必須逐行參照** |
| 系統框架 Tab | 圖稿 Tab 1 | 目錄卡片 + dagre + 藍色 + hover 高亮 + legend bar |
| 邏輯運作 Tab | 圖稿 Tab 2 | 42 個節點 faded + 中央提示 + click 聚焦 + 底部 chain info + legend bar |
| 資料旅程 Tab | 圖稿 Tab 3 | entry 選擇 + stagger 出現 + 右側步驟面板 + 重播按鈕 |

---

## 4. 檔案變更清單

### 新增

| 檔案 | 用途 | 任務 |
|------|------|------|
| `packages/core/src/analyzers/directory-aggregator.ts` | 目錄聚合引擎 | T2 |
| `packages/core/src/analyzers/directory-aggregator.test.ts` | 目錄聚合單元測試 | T2 |
| `packages/web/src/styles/global.css` | 全局 CSS 變數 + 網格背景 | T3 |
| `packages/web/src/components/DirectoryCard.tsx` | 目錄卡片 React Flow 自訂節點 | T5 |
| `packages/web/src/components/ChainInfoPanel.tsx` | 邏輯運作底部呼叫鏈資訊面板 | T6 |
| `packages/web/src/components/JourneyPanel.tsx` | 資料旅程右側步驟面板 | T7 |
| `packages/web/src/components/TabBar.tsx` | 視角切換 Tab Bar | T4 |
| `packages/web/src/components/PerspectiveHint.tsx` | 中央提示元件（邏輯運作 + 資料旅程共用） | T6, T7 |
| `packages/web/src/hooks/useBfsClickFocus.ts` | BFS click 聚焦 hook（替代 hover） | T6 |
| `.knowledge/sprint12-visual-architecture.md` | Sprint 12 架構設計文件 | T1 |

### 修改

| 檔案 | 變更內容 | 任務 |
|------|---------|------|
| `packages/core/src/index.ts` | 匯出 `aggregateByDirectory` | T2 |
| `packages/cli/src/server.ts` | `/api/graph` 回應新增 `directoryGraph` 欄位 | T2 |
| `packages/web/src/styles/theme.ts` | 全面重寫 — 深色霓虹 → 白紙黑格 design tokens | T3 |
| `packages/web/src/components/NeonNode.tsx` | 樣式改白底實線（保留命名） | T3 |
| `packages/web/src/components/NeonEdge.tsx` | 樣式改灰色實線（保留命名） | T3 |
| `packages/web/src/components/ControlPanel.tsx` | 移除 ViewMode radio，白底樣式 | T3, T4 |
| `packages/web/src/components/Toolbar.tsx` | 白底樣式 | T3 |
| `packages/web/src/components/GraphCanvas.tsx` | 整合 directoryGraph + grid-bg + Tab 切換 + 三種呈現邏輯 | T3, T4, T5, T6, T7 |
| `packages/web/src/components/Graph3DCanvas.tsx` | 白底適配（P1） | T9 |
| `packages/web/src/adapters/graph-adapter.ts` | `applyPerspective()` 支援 directoryGraph | T4 |
| `packages/web/src/adapters/perspective-presets.ts` | colorScheme/interaction/dataSource 更新 | T4 |
| `packages/web/src/hooks/useBfsHoverHighlight.ts` | 改為 click-based（或保留 + 新增 useBfsClickFocus） | T6 |
| `packages/web/src/hooks/useStaggerAnimation.ts` | 改為「出現」邏輯（opacity 0→1 而非高亮） | T7 |
| `packages/web/src/components/E2EPanel.tsx` | 資料旅程改用 JourneyPanel | T7 |
| `.knowledge/specs/feature-spec.md` | v12.0（+Sprint 12 功能規格） | T1 |
| `.knowledge/specs/data-model.md` | v5.0（+DirectoryNode/DirectoryEdge/DirectoryGraph） | T1 |

### 不改動

| 檔案 | 原因 |
|------|------|
| `packages/core/src/analyzers/*.ts`（既有） | 既有分析器不改動，只新增 directory-aggregator |
| `packages/web/src/types/graph.ts` | PerspectiveName 已在 Sprint 11 定義，無需改動 |
| `packages/web/src/contexts/ViewStateContext.tsx` | Sprint 11 已遷移完成 |

---

## 5. 規範文件索引

| 規範 | 路徑 | 版本 |
|------|------|------|
| 功能規格 | `.knowledge/specs/feature-spec.md` | v12.0（本 Sprint 更新） |
| 資料模型 | `.knowledge/specs/data-model.md` | v5.0（本 Sprint 更新：+DirectoryGraph） |
| API 設計 | `.knowledge/specs/api-design.md` | v5.0（本 Sprint 更新：/api/graph +directoryGraph） |
| 架構設計 | `.knowledge/sprint12-visual-architecture.md` | v1.0（新建） |
| 核准圖稿 | `proposal/references/sprint12/three-perspectives-mockup.html` | 老闆核准，實作必須嚴格對照 |

---

## 6. 任務拆解

### 任務清單

| ID | 任務 | 說明 | 負責 Agent | 依賴 | 對應步驟 | 驗收標準 |
|----|------|------|-----------|------|---------|---------|
| T1 | 架構設計 + 規範文件更新 | Sprint 12 架構文件撰寫（目錄聚合設計、主題替換策略、呈現邏輯框架）+ feature-spec v12.0 + data-model v5.0 + api-design v5.0 | tech-lead | — | 設計 | 架構文件完整、三份規範文件已更新、圖稿 design tokens 完整對照表 |
| T2 | Core 層目錄聚合引擎 | `packages/core/src/analyzers/directory-aggregator.ts` 新增 `aggregateByDirectory()`。`cli/server.ts` 的 `/api/graph` 回應新增 `directoryGraph`。單元測試覆蓋。邏輯：按目錄分組 → 計算目錄間依賴（子檔案依賴聯集）→ 分類（entry/logic/data/support）→ ≤2 目錄回退 null | backend-architect | T1 | 實作 | `aggregateByDirectory()` 正確聚合，典型專案 5~15 個目錄，API 回應含 directoryGraph，扁平專案回退 null，單元測試通過 |
| T3 | 白紙黑格全局主題替換 | `theme.ts` 全面重寫為白紙黑格 design tokens（見 §2.1）。新增 `global.css` 含 CSS 變數 + 雙層網格。NeonNode/NeonEdge 樣式改白底實線（保留命名）。ControlPanel/Toolbar/Header 白底。GraphCanvas 加 `.grid-bg`。**所有顏色值必須與圖稿 `:root` CSS 變數完全一致** | frontend-developer | T1 | 實作 | 背景 #fafafa，雙層網格可見，所有元件白底實線，無殘留霓虹元素，CSS 變數與圖稿一致 |
| T4 | 視角切換 Tab Bar + graph-adapter 適配 | 新增 `TabBar.tsx`（樣式見 §2.6）。`graph-adapter.ts` 的 `applyPerspective()` 支援 `directoryGraph` 分流（系統框架→目錄數據，其他→檔案數據）。`perspective-presets.ts` 更新 colorScheme/interaction/dataSource | frontend-developer | T2, T3 | 實作 | Tab Bar 三分頁切換正常，系統框架切換時使用 directoryGraph，其他視角使用檔案數據，色點和計數正確 |
| T5 | 系統框架 = 目錄鳥瞰 | 新增 `DirectoryCard.tsx`（樣式見 §2.3）。dagre 分層佈局（5~15 張卡片）。卡片結構：陰影底 + 白色填充 + 色帶 + 圓點 + 目錄名 + badge。hover 互動：高亮連接卡片 + dimmed 0.25 非相關。底部 legend bar。邊用 elbowPath。**嚴格對照圖稿 Tab 1** | frontend-developer | T4 | 實作 | 目錄卡片正確渲染，dagre 分層不再是一條線，hover 高亮 + dimmed 效果正確，badge 顯示檔案數，legend bar 可見，與圖稿一致 |
| T6 | 邏輯運作 = 聚焦模式 | 新增 `useBfsClickFocus.ts`（click 版 BFS，見 §2.4）。新增 `ChainInfoPanel.tsx`（底部面板）。新增 `PerspectiveHint.tsx`（中央提示）。預設全 dimmed 0.08 + 中央提示。click 入口 → BFS 展開鏈 → 鏈上亮起 + 其餘 0.08 + 邊出現。★ 推薦入口標示。底部面板：鏈名稱+節點數+清除按鈕。點擊空白/清除 → 重置。legend bar（六色分類）。**嚴格對照圖稿 Tab 2** | frontend-developer | T4 | 實作 | 預設全 dimmed + 中央提示，click 展開呼叫鏈，非相關 0.08 近乎消失，底部面板正確顯示，★ 標示可見，重置正常，與圖稿一致 |
| T7 | 資料旅程 = 播放模式 | 修改 `useStaggerAnimation.ts`（出現邏輯，見 §2.5）。新增 `JourneyPanel.tsx`（右側 280px 面板）。初始：entry 選擇畫面 + 中央提示。click entry → 350ms stagger 逐步出現。節點 opacity 0→1。邊 stroke-dashoffset 200→0。面板同步（active/done/inactive 三態）。重播按鈕。>30 步→100ms。**嚴格對照圖稿 Tab 3** | frontend-developer | T4 | 實作 | 初始顯示 entry 選擇 + 提示，click 開始播放，節點逐步出現（不是高亮），面板同步正確，重播可用，與圖稿一致 |
| T8 | 策展整合 + 2D/3D 適配 | 三層過濾：系統框架使用 directoryGraph（策展在目錄級）。邏輯運作 + 資料旅程使用檔案級（策展不變）。手動釘選跨視角保持。影響分析/搜尋聚焦在新呈現邏輯下正確。3D 模式系統框架回退。切換無閃爍 | frontend-developer | T5, T6, T7 | 實作 | 三層過濾正確，策展在三視角正確運作，影響分析/搜尋聚焦正常，3D 回退邏輯可用 |
| T9 | 3D 模式白底適配（P1） | Three.js 場景 background 改白色。GridHelper 適配白底（如需）。材質顏色適配 | frontend-developer | T8 | 實作 | 3D 場景白底，GridHelper 可見，材質適配 |
| T10 | 累積 P1 收尾（P1） | AI 輔助角色分類 + AI 設定 UI + Onboarding overlay + 3D Bloom。已延後 3 Sprint | frontend-developer + backend-architect | T8 | 實作 | 視時間，不阻塞 P0 |
| T11 | 測試 + 全面回歸 | 目錄聚合測試（core 層）。主題測試（CSS 變數正確性）。三種呈現邏輯測試（系統框架目錄卡片 / 邏輯運作 click 聚焦 / 資料旅程 stagger 出現）。Tab 切換測試。策展整合測試。1092+ 回歸測試。pnpm build 通過 | test-writer-fixer | T8 | 測試 | 1092+ tests 零回歸 + 新增測試，pnpm build 全通過 |

### 依賴圖

```
T1（架構設計 + 規範，tech-lead）
 ├── T2（core 目錄聚合，backend-architect）
 │    └── T4（Tab Bar + graph-adapter 適配，frontend-developer）← 也依賴 T3
 ├── T3（白紙黑格主題，frontend-developer）
 │    └── T4
 │         ├── T5（系統框架 = 目錄鳥瞰）
 │         ├── T6（邏輯運作 = 聚焦模式）
 │         └── T7（資料旅程 = 播放模式）
 │              └── T8（策展整合 + 2D/3D）
 │                   ├── T9（P1 3D 白底）
 │                   └── T10（P1 累積收尾）
 └── T11（測試 + 回歸）← T8 完成後

T2 和 T3 可平行（core vs web，互不依賴）
T5, T6, T7 可平行（都依賴 T4，彼此獨立）
```

### 執行順序建議

```
Phase 0: 設計（tech-lead）
  T1 架構設計 + 規範文件更新

Phase 1: 基礎搭建（可平行）
  T2 core 目錄聚合（backend-architect）‖ T3 白紙黑格主題（frontend-developer）

Phase 2: 框架整合
  T4 Tab Bar + graph-adapter 適配（frontend-developer）← T2+T3 完成後

Phase 3: 三種呈現邏輯（可平行）
  T5（系統框架目錄鳥瞰）‖ T6（邏輯運作聚焦模式）‖ T7（資料旅程播放模式）

Phase 4: 整合
  T8 策展整合 + 2D/3D 適配

Phase 5: P1 + 測試
  T9（P1 3D 白底）+ T10（P1 累積收尾）— 視時間
  T11 測試 + 全面回歸

→ /review → G2 → G3
```

### L1 執行指令

> PM 產出此區塊，老闆複製貼入 L1 session 即可啟動。

```
請執行 Sprint 12 — 視覺重塑 + 呈現邏輯重做。

📄 計畫書：proposal/sprint12-dev-plan.md
📐 核准圖稿：proposal/references/sprint12/three-perspectives-mockup.html（2022 行，逐行參照）

📋 你負責的任務：T1（架構設計 + 規範文件）
🔧 委派 backend-architect：T2（core 目錄聚合）
🎨 委派 frontend-developer：T3, T4, T5, T6, T7, T8, T9, T10
🧪 委派 test-writer-fixer：T11

⚠️ 關鍵提醒：
1. Sprint 12 不是微調 Sprint 11，是呈現邏輯的根本改變
2. 系統框架 = 目錄卡片（不是檔案節點），需要 core 新增 aggregateByDirectory()
3. 邏輯運作 = click 聚焦（不是 hover 高亮），預設全 dimmed 0.08
4. 資料旅程 = 逐步出現（不是逐步高亮），節點從 opacity 0 到 1
5. 所有顏色值必須與圖稿 CSS 變數完全一致（見計畫書 §2.1）
6. NeonNode/NeonEdge 保留命名，只改樣式

第一步請先執行 /task-delegation 建立任務檔案。
```

### 共用檔案（需協調）

| 檔案 | 涉及任務 | 風險等級 |
|------|---------|---------|
| `packages/web/src/styles/theme.ts` | T3 | 高 — 全面重寫 |
| `packages/web/src/components/GraphCanvas.tsx` | T3, T4, T5, T6, T7, T8 | 高 — 主題 + Tab 切換 + 三種呈現邏輯 |
| `packages/web/src/adapters/graph-adapter.ts` | T4 | 高 — directoryGraph 分流 |
| `packages/web/src/adapters/perspective-presets.ts` | T4 | 中 — colorScheme/interaction 更新 |
| `packages/web/src/components/NeonNode.tsx` | T3, T5 | 中 — 白底樣式 + 目錄卡片 |
| `packages/web/src/components/NeonEdge.tsx` | T3, T7 | 中 — 白底樣式 + stagger 邊動畫 |
| `packages/cli/src/server.ts` | T2 | 低 — 新增 directoryGraph 到 API 回應 |

---

## 7. 測試計畫

### 單元測試（core）

| 測試對象 | 測試要點 | 任務 |
|---------|---------|------|
| `aggregateByDirectory()` | 正確分組、目錄間依賴計算、扁平專案回退 null、分類正確 | T2, T11 |
| DirectoryGraph 輸出 | 節點 5~15 個（典型專案）、邊 weight 正確、無自循環 | T11 |

### 單元測試（web）

| 測試對象 | 測試要點 | 任務 |
|---------|---------|------|
| `THEME` / CSS 變數 | design tokens 值與圖稿一致 | T11 |
| `applyPerspective()` | directoryGraph 分流正確、系統框架→目錄、其他→檔案 | T11 |
| `useBfsClickFocus` | click 觸發、BFS 正確、maxDepth 限制、重置行為 | T11 |
| `useStaggerAnimation` (v2) | 出現邏輯（opacity 0→1）、350ms 節奏、>30 加速、replay | T11 |
| `DirectoryCard` | 渲染正確、hover 事件、badge 顯示 | T11 |
| `TabBar` | 三 tab 切換、active 狀態、色點正確 | T11 |
| `ChainInfoPanel` | 鏈名+節點數+清除按鈕 | T11 |
| `JourneyPanel` | 步驟列表、active/done/inactive 三態、重播按鈕 | T11 |

### 整合測試

| 測試場景 | 描述 | 任務 |
|---------|------|------|
| 系統框架載入 | 切換到系統框架 → 顯示目錄卡片而非檔案節點 | T11 |
| 邏輯運作預設 | 切換到邏輯運作 → 所有節點 dimmed + 中央提示可見 | T11 |
| 邏輯運作 click | click 節點 → BFS 鏈亮起 → 其餘 0.08 → 底部面板出現 | T11 |
| 資料旅程播放 | 選 entry → 節點逐步出現 → 面板同步 → 重播可用 | T11 |
| Tab 切換 | 三種 Tab 切換 → 各自呈現邏輯正確載入 | T11 |
| 策展 + 視角 | 策展在系統框架（目錄級）和其他視角（檔案級）正確運作 | T11 |

### 回歸測試

- 1092+ 既有 tests 零回歸
- `pnpm build` 全通過
- Sprint 1-11 所有功能不受影響
- 2D/3D 切換正常
- 策展 + 手動釘選正常

---

## 8. 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| 全局主題替換影響範圍大 | 高 | CSS 變數化隔離。圖稿有完整 design tokens，機械性替換。逐元件確認 |
| core 目錄聚合設計 | 中 | 邏輯簡單（按目錄 group + 子檔案依賴聯集）。扁平專案有回退 |
| 呈現邏輯重做影響 Sprint 11 功能 | 高 | 基於 Sprint 11 框架改造，不從零重寫。1092 tests 保護 |
| dagre 在目錄級仍排成一行 | 低 | 目錄只有 5~15 個，dagre 更容易成功。回退為力導向 |
| 視覺回歸需人工確認 | 中 | 全局主題替換無法純靠自動測試。L1 Review 時逐畫面對照圖稿 |
| Sprint 10 教訓：useMemo deps 遺漏 | 中 | Review 重點核對所有 useMemo deps 和消費端變數引用 |
| Sprint 11 教訓：NeonEdge 缺 CSS class | 中 | T3 主題替換時逐一確認所有 CSS class 與圖稿一致 |

---

## 9. 文件更新

完成後需同步更新的文件：

- [ ] `.knowledge/specs/feature-spec.md` → v12.0
- [ ] `.knowledge/specs/data-model.md` → v5.0（+DirectoryGraph）
- [ ] `.knowledge/specs/api-design.md` → v5.0（+directoryGraph 欄位）
- [ ] `.knowledge/sprint12-visual-architecture.md`（新建）
- [ ] `CLAUDE.md`（Sprint 12 相關條目，PM 已新增）

---

## 10. 任務與審核紀錄（備查）

> 每個任務完成後記錄結果，每次 Review/Gate 通過後記錄決策。本區作為 Sprint 完整稽核軌跡。

### 任務完成紀錄

| 任務 | 完成日期 | 結果 | 備註 |
|------|---------|------|------|
| T1 | 2026-04-01 | ✅ 完成 | 架構文件 v1.0 + feature-spec v12.0（+F88-F94）+ data-model v5.0（+DirectoryGraph）+ api-design v5.0 |
| T2 | 2026-04-01 | ✅ 完成 | aggregateByDirectory() + CLI /api/graph 擴充 + 15 new tests, 406 total core tests pass |
| T3 | 2026-04-01 | ✅ 完成 | theme.ts 全面重寫 + global.css CSS 變數 + NeonNode/NeonEdge/GraphCanvas 白底樣式, build 通過 |
| T4 | 2026-04-01 | ✅ 完成 | TabBar.tsx + graph-adapter directoryGraph 分流 + perspective-presets 更新 + App/GraphCanvas 整合, build 通過 |
| T5 | 2026-04-01 | ✅ 完成 | DirectoryCard.tsx + ElbowEdge.tsx + dagre 目錄佈局 + SF hover highlight + SF legend bar, build 通過 |
| T6 | 2026-04-01 | ✅ 完成 | useBfsClickFocus.ts + PerspectiveHint.tsx + ChainInfoPanel.tsx + LO click focus + 6 category colors + LO legend bar, build 通過 |
| T7 | 2026-04-01 | ✅ 完成 | JourneyPanel.tsx + useStaggerAnimation v2 (appear logic) + DJ entry detection + edge draw animation + DJ hint + replay, build 通過 |
| T8 | 2026-04-01 | ✅ 完成 | useMemo deps 修正(getLoCategoryStyle) + fitView perspective 切換觸發 + 3D toggle disabled for SF, build+701 tests pass |
| T9 | 2026-04-01 | ✅ 完成 | Graph3DCanvas 白底適配: scene bg→#fafafa, GridHelper 明度提升, AdditiveBlending→NormalBlending, PointLight→DirectionalLight, emissive 調整 |
| T10 | — | ⏭️ 跳過 | P1 項目，本 Sprint 時間不足，延至下個 Sprint |
| T11 | 2026-04-01 | ✅ 完成 | +124 new tests (5 new files + 1 modified), 1231 total (406 core + 825 web), zero regression |

### Review 紀錄

| Review 步驟 | 日期 | 結果 | Review 文件連結 |
|------------|------|------|---------------|
| 實作 Review（對程式碼+對規範+對設計稿） | 2026-04-01 | 通過 | Blocker:0 Major:0 Minor:1 — ElbowEdge.tsx void cast 冗餘（已知，不阻塞）。程式碼品質合格、規範 8/8 合規、設計稿 92 項全部吻合 |
| 測試 Review（對功能） | 2026-04-01 | 通過 | Blocker:0 Major:0 Minor:0 — 1231 tests 全通過（406 core + 825 web），+124 new Sprint 12 tests，zero regression |

### Gate 紀錄

| Gate | 日期 | 決策 | 審核意見 |
|------|------|------|---------|
| G0 | 2026-04-01 | ✅ 通過 | 老闆確認通過。無需 G1，核准圖稿直接作為實作規範 |
| G2 | 2026-04-02 | ✅ 通過 | L1 Review 通過（0B/0M/2m）。PM 審核通過。1235 tests 零回歸。B1-B6 修復 + 6 項需求追加完成。老闆確認通過 |
| G3 | 2026-04-02 | ✅ 通過 | 1235 tests（410 core + 825 web），+143 比 Sprint 11。pnpm build 通過。老闆確認通過。已知待改善：三種視角需升級為方法/端點級追蹤（Sprint 13） |

---

**確認**: [x] L1 確認 / [x] Tech Lead 確認

---

## Sprint 12 已知問題（帶入 Sprint 13）

> 老闆 2026-04-02 用 VideoBrief 實測後指出，三種視角需從「檔案級」升級為「方法/端點級」。

| # | 問題 | 影響視角 | 說明 |
|---|------|---------|------|
| 1 | 資料旅程入口應是 API 端點不是檔案 | 資料旅程 | 入口顯示 `video-api.ts` 而非 `POST /api/videos`。需 core 解析 API 端點定義 |
| 2 | 邏輯運作應追蹤方法不是檔案 | 邏輯運作 | click 應展開方法呼叫鏈（`createUser()` → `validate()` → `db.insert()`），不是檔案依賴 |
| 3 | 系統框架聚合粒度不智慧 | 系統框架 | frontend(114 files) 縮成 1 張卡片，應自動展開不均衡的大目錄 |
| 4 | 系統框架目錄間沒有箭頭 | 系統框架 | 新專案測試時目錄間無依賴線 |
| 5 | 點擊方法要能知道位置 | 三視角共通 | 點擊方法節點 → 顯示屬於哪個 class / 哪個檔案 |
| 6 | root 卡片 "No node found" | 系統框架 | bug，點擊 root 報錯 |
| 7 | 重新規劃呈現方式 | 全局 | 老闆指示 Sprint 13 需重新設計三視角的呈現邏輯 |
