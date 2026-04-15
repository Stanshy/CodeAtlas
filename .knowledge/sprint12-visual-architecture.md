# Sprint 12 — 視覺重塑 + 呈現邏輯重做 架構設計

> **版本**: v1.0
> **日期**: 2026-04-01
> **作者**: Tech Lead (L1)
> **核准圖稿**: `proposal/references/sprint12/three-perspectives-mockup.html`

---

## 1. 設計總覽

Sprint 12 做兩件大事：

1. **視覺風格替換**：深色霓虹 → 白紙黑格（全局 CSS 主題）
2. **呈現邏輯重做**：三種視角顯示完全不同的內容（不只是顏色和佈局差異）

### 與 Sprint 11 的根本差異

| 面向 | Sprint 11 | Sprint 12 |
|------|-----------|-----------|
| 背景 | 深色 #0a0a0f | 白紙 #fafafa + 雙層網格 |
| 節點 | 霓虹 glow + 深色填充 | 白底 #ffffff + 實線邊框 + 輕微陰影 |
| 系統框架資料 | 檔案節點（50+）| 目錄卡片（5~15）|
| 邏輯運作互動 | hover 高亮 | click 聚焦，預設全 dimmed 0.08 |
| 資料旅程動畫 | 逐步高亮（都在畫面上）| 逐步出現（opacity 0→1）|

---

## 2. 白紙黑格主題系統

### 2.1 Design Tokens 對照表

從核准圖稿 `:root` CSS 變數逐項提取，映射到 `theme.ts` 的 `THEME` 物件：

| CSS 變數 | 值 | THEME 鍵名 | 用途 |
|----------|-----|-----------|------|
| `--bg-paper` | `#fafafa` | `bgPaper` | 主背景 |
| `--bg-grid` | `#f0f0f0` | `bgGrid` | 網格背景、badge bg |
| `--grid-line` | `#d8d8d8` | `gridLine` | 20px 小格線 |
| `--grid-line-major` | `#c8c8c8` | `gridLineMajor` | 100px 大格線 |
| `--ink-primary` | `#1a1a2e` | `inkPrimary` | 主文字 |
| `--ink-secondary` | `#4a4a6a` | `inkSecondary` | 次文字 |
| `--ink-muted` | `#8888aa` | `inkMuted` | 弱化文字 |
| `--ink-faint` | `#bbbbcc` | `inkFaint` | 最弱文字 |
| `--border-default` | `#d0d0d8` | `borderDefault` | 通用邊框 |
| `--shadow-card` | `0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)` | `shadowCard` | 卡片陰影 |
| `--shadow-hover` | `0 4px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)` | `shadowHover` | hover 陰影 |
| `--sf-border` | `#1565c0` | `sfBorder` | 系統框架邊框 |
| `--sf-bg` | `#e3f2fd` | `sfBg` | 系統框架背景 |
| `--sf-accent` | `#1976d2` | `sfAccent` | 系統框架強調 |
| `--sf-line` | `#1e88e5` | `sfLine` | 系統框架高亮邊 |
| `--lo-routes` | `#1565c0` | `loRoutes` | 邏輯運作 routes 色 |
| `--lo-services` | `#7b1fa2` | `loServices` | 邏輯運作 services 色 |
| `--lo-controllers` | `#e65100` | `loControllers` | 邏輯運作 controllers 色 |
| `--lo-models` | `#4e342e` | `loModels` | 邏輯運作 models 色 |
| `--lo-utils` | `#546e7a` | `loUtils` | 邏輯運作 utils 色 |
| `--lo-middleware` | `#00838f` | `loMiddleware` | 邏輯運作 middleware 色 |
| `--dj-border` | `#2e7d32` | `djBorder` | 資料旅程邊框 |
| `--dj-bg` | `#e8f5e9` | `djBg` | 資料旅程背景 |
| `--dj-accent` | `#388e3c` | `djAccent` | 資料旅程強調 |
| `--dj-line` | `#43a047` | `djLine` | 資料旅程邊色 |
| `--dj-glow` | `rgba(46, 125, 50, 0.2)` | `djGlow` | 資料旅程 glow |

### 2.2 邏輯運作分類背景色

| 分類 | border 色 | active 背景色 | THEME 鍵名 |
|------|-----------|--------------|-----------|
| routes | `#1565c0` | `#e3f2fd` | `loBgRoutes` |
| services | `#7b1fa2` | `#f3e5f5` | `loBgServices` |
| controllers | `#e65100` | `#fff3e0` | `loBgControllers` |
| models | `#4e342e` | `#efebe9` | `loBgModels` |
| utils | `#546e7a` | `#eceff1` | `loBgUtils` |
| middleware | `#00838f` | `#e0f7fa` | `loBgMiddleware` |

### 2.3 雙層網格背景 CSS

```css
.grid-bg {
  background-color: #fafafa;
  background-image:
    linear-gradient(#d8d8d8 1px, transparent 1px),
    linear-gradient(90deg, #d8d8d8 1px, transparent 1px),
    linear-gradient(#c8c8c8 1px, transparent 1px),
    linear-gradient(90deg, #c8c8c8 1px, transparent 1px);
  background-size: 20px 20px, 20px 20px, 100px 100px, 100px 100px;
  background-position: -1px -1px, -1px -1px, -1px -1px, -1px -1px;
}
```

### 2.4 元件樣式替換策略

保留所有元件命名（NeonNode、NeonEdge 等），只替換內部樣式值。替換方式：

1. `theme.ts` 全面重寫為 `THEME` 物件
2. 新增 `global.css` 注入 CSS 變數
3. 各元件從 `THEME` 讀取值，不再引用舊 `colors`/`glow`/`nodeStyles` 等

---

## 3. 目錄聚合引擎（Core 層）

### 3.1 設計目標

將檔案級 Graph JSON（200+ 節點）聚合為目錄級（5~15 張卡片），供系統框架視角使用。

### 3.2 聚合演算法

```
輸入: GraphNode[], GraphEdge[]
輸出: DirectoryGraph | null

Step 1: 按第一層目錄分組
  src/services/user.ts → services
  src/models/db.ts     → models
  src/index.ts         → src (根目錄)

Step 2: 計算目錄間依賴
  如果 services/user.ts imports models/db.ts
  → services → models (weight +1)
  同目錄內的依賴忽略（無自循環）

Step 3: 分類
  entry:   含 app.ts / index.ts / main.ts 的目錄
  logic:   名稱匹配 routes / controllers / services / hooks
  data:    名稱匹配 models / db / types / schemas
  support: 名稱匹配 utils / lib / config / middleware / tests

Step 4: 回退檢查
  if (目錄數 <= 2) return null  // 扁平專案
```

### 3.3 型別定義

```typescript
export interface DirectoryNode {
  id: string;                    // 目錄路徑
  label: string;                  // 顯示名 (如 'services/')
  type: 'entry' | 'logic' | 'data' | 'support';
  fileCount: number;
  files: string[];
  role: NodeRole;
}

export interface DirectoryEdge {
  source: string;
  target: string;
  weight: number;                 // 子檔案間依賴數
}

export interface DirectoryGraph {
  nodes: DirectoryNode[];
  edges: DirectoryEdge[];
}
```

### 3.4 API 擴充

`/api/graph` 回應新增 `directoryGraph` 欄位：

```typescript
interface GraphResponse {
  // ...existing fields...
  directoryGraph: DirectoryGraph | null;  // Sprint 12 新增
}
```

---

## 4. 三種呈現邏輯框架

### 4.1 系統框架 = 目錄鳥瞰

**資料源**: `directoryGraph`（非檔案級節點）

**渲染**:
- DirectoryCard.tsx: React Flow 自訂節點（SVG rect + 色帶 + 圓點 + 名稱 + badge）
- dagre 佈局: rankdir TB, nodesep 60, ranksep 100
- 邊: elbowPath（肘部路徑），stroke #9aa8bc, marker-end arrow

**互動**:
- hover: 高亮卡片 + 連接邊，非相關 dimmed 0.25
- mouseleave: 重置
- Legend bar: `[ dot 模組目錄 ] [ --- 依賴箭頭 ] [ --- Hover 高亮路徑 ]`

**圖稿 CSS 對照**:
- `.dir-card .card-body`: fill #fff, stroke --sf-border, stroke-width 1.5, rx 8
- `.dir-card:hover .card-body`: fill --sf-bg, stroke-width 2.5
- `.dir-card.dimmed`: opacity 0.25
- `.sf-edge`: stroke #9aa8bc, stroke-width 1.5
- `.sf-edge.highlighted`: stroke --sf-line, stroke-width 2.5
- `.sf-edge.dimmed`: opacity 0.12

### 4.2 邏輯運作 = 聚焦模式

**資料源**: 檔案級節點

**預設狀態**: 所有節點 dimmed 0.08, 所有邊 opacity 0, 中央提示可見

**互動**:
1. click 節點 → BFS (maxDepth 5) 找呼叫鏈
2. 鏈上節點 active (fill: category-bg, stroke-width 2.5)
3. 入口節點 extra stroke-width 3
4. 非鏈節點保持 dimmed 0.08
5. 鏈上邊 opacity 1, 其他 opacity 0
6. 中央提示 opacity 0
7. 底部 ChainInfoPanel 出現
8. 重置: click 空白 / click 「清除選取」

**新增元件**:
- `useBfsClickFocus.ts`: click 版 BFS hook
- `ChainInfoPanel.tsx`: 底部面板（鏈名 + 節點數 + 清除按鈕）
- `PerspectiveHint.tsx`: 中央提示（LO/DJ 共用）

**圖稿 CSS 對照**:
- `.lo-node .lo-rect`: fill #fff, stroke-width 1.5, rx 6
- `.lo-node.active .lo-rect`: stroke-width 2.5, drop-shadow
- `.lo-node.dimmed`: opacity 0.08
- `.lo-edge`: opacity 0 (預設隱藏)
- `.lo-edge.visible`: opacity 1
- `.lo-star`: fill #f59e0b, 10px
- `.lo-chain-info`: bottom 24px, left 50%, translateX(-50%)

### 4.3 資料旅程 = 播放模式

**資料源**: 檔案級節點（只取 entry 節點做初始畫面）

**初始狀態**: entry 節點可見（綠色框 + 脈衝動畫）, 中央提示, 其他不渲染

**互動**:
1. click entry → 開始 stagger 播放
2. 350ms/步: 節點 opacity 0→1, 邊 stroke-dashoffset 200→0
3. current 節點: stroke-width 3, drop-shadow glow
4. lit 節點: stroke-width 2.5, 較弱 shadow
5. 右側 JourneyPanel 同步 (active/done/inactive 三態)
6. >30 步加速至 100ms
7. 播放完成 → 「重播此旅程」按鈕

**新增元件**:
- `JourneyPanel.tsx`: 右側 280px 面板
- 共用 `PerspectiveHint.tsx`

**圖稿 CSS 對照**:
- `.dj-node .dj-rect`: fill #fff, stroke --border-default, stroke-width 1.5, rx 8
- `.dj-node.entry .dj-rect`: stroke --dj-accent, stroke-width 2, fill --dj-bg
- `.dj-node.lit .dj-rect`: fill --dj-bg, stroke --dj-border, stroke-width 2.5
- `.dj-node.current .dj-rect`: stroke-width 3, drop-shadow(0 0 12px rgba(46,125,50,0.4))
- `.dj-edge`: stroke --dj-line, stroke-dasharray 200, stroke-dashoffset 200
- `.dj-edge.drawn`: stroke-dashoffset 0
- `.dj-panel`: width 280px, border-left 1.5px solid --border-default
- `.dj-step-item.active`: bg --dj-bg, border 1px solid #a5d6a7
- `.dj-replay-btn`: bg --dj-border, hover bg #1b5e20

---

## 5. 視角切換 UI (Tab Bar)

### 5.1 結構

```
Header (60px)
Tab Bar (48px)
Canvas Area (flex: 1)
  ├── Tab 1: System Framework (perspective-panel)
  ├── Tab 2: Logic Operation (perspective-panel)
  └── Tab 3: Data Journey (perspective-panel)
```

### 5.2 Tab 按鈕規格（從圖稿 `.tab-btn` 提取）

- height: 40px, padding: 0 20px
- inactive: color --ink-muted, font-weight 500, border transparent
- active: color --ink-primary, font-weight 600, bg #fff, border --border-default (底部無邊框)
- hover: color --ink-secondary, bg --bg-grid
- 色點 8px: 藍 --sf-border / 三色 conic-gradient / 綠 --dj-border
- 計數 badge: 11px 600, bg --bg-grid, border 1px --border-default, border-radius 10px

---

## 6. PerspectivePreset 更新

```typescript
PERSPECTIVE_PRESETS = {
  'system-framework': {
    colorScheme: 'blue-paper',        // 從 cyan-monochrome 改
    interaction: 'directory-hover',    // 從 static-hierarchy 改
    dataSource: 'directory',           // 新增
  },
  'logic-operation': {
    colorScheme: 'multi-paper',        // 從 neon-multicolor 改
    interaction: 'bfs-click-focus',    // 從 bfs-hover-highlight 改
    dataSource: 'file',
  },
  'data-journey': {
    colorScheme: 'green-paper',        // 從 green-monochrome 改
    interaction: 'stagger-appear',     // 從 stagger-playback 改
    dataSource: 'file',
  },
};
```

---

## 7. 策展整合

三層過濾順序不變：`perspective → curation → manual filter`

系統框架使用 directoryGraph，策展在目錄級（noise 目錄仍顯示）。
邏輯運作 + 資料旅程使用檔案級，策展邏輯不變。

---

## 8. 檔案變更清單

### 新增

| 檔案 | 任務 |
|------|------|
| `packages/core/src/analyzers/directory-aggregator.ts` | T2 |
| `packages/web/src/styles/global.css` | T3 |
| `packages/web/src/components/DirectoryCard.tsx` | T5 |
| `packages/web/src/components/ChainInfoPanel.tsx` | T6 |
| `packages/web/src/components/JourneyPanel.tsx` | T7 |
| `packages/web/src/components/TabBar.tsx` | T4 |
| `packages/web/src/components/PerspectiveHint.tsx` | T6, T7 |
| `packages/web/src/hooks/useBfsClickFocus.ts` | T6 |

### 修改

| 檔案 | 任務 |
|------|------|
| `packages/core/src/index.ts` | T2 |
| `packages/cli/src/server.ts` | T2 |
| `packages/web/src/styles/theme.ts` | T3 |
| `packages/web/src/components/NeonNode.tsx` | T3 |
| `packages/web/src/components/NeonEdge.tsx` | T3 |
| `packages/web/src/components/GraphCanvas.tsx` | T3-T8 |
| `packages/web/src/adapters/graph-adapter.ts` | T4 |
| `packages/web/src/adapters/perspective-presets.ts` | T4 |
| `packages/web/src/hooks/useStaggerAnimation.ts` | T7 |
