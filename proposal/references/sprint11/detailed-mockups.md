# Sprint 11 — 三種故事視角 細化圖稿規格

> **文件類型**: 前端開發細節規格（設計補充，非新圖稿）
> **撰寫者**: design-director (L1)
> **日期**: 2026-04-01
> **狀態**: 定案，供前端開發直接參考
> **對應核准圖稿**: `proposal/references/sprint11/three-perspectives-mockup.html`
> **對應架構文件**: `.knowledge/sprint11-perspectives-architecture.md`

---

## 閱讀說明

本文件補充核准圖稿未明確說明的像素級規格與互動細節，讓前端工程師無需反覆確認即可實作。章節順序對應三種視角 + 共用 UI 元件。

---

## 1. 系統框架視角 (System Framework)

### 1.1 整體佈局策略

- 佈局引擎：dagre，方向 Top-Down（`rankdir: 'TB'`）
- 節點間距：`nodesep: 60`（水平）、`ranksep: 100`（垂直）
- 畫布邊距：`marginx: 40`、`marginy: 40`
- 佈局完成後節點位置固定，禁用力導向 simulation

### 1.2 目錄群組卡片規格

用於 `nodeType === 'directory'` 且 `activePerspective === 'system-framework'` 的節點渲染。

| 屬性 | 值 |
|------|----|
| background | `rgba(0, 212, 255, 0.05)` |
| border | `1px dashed rgba(0, 212, 255, 0.2)` |
| border-radius | `12px` |
| padding | `8px 12px` |
| minWidth | `180px` |
| 標題顏色 | `#00d4ff` |
| 標題 fontSize | `11px` |
| 標題 fontWeight | `600` |
| 標題格式 | `{dirName}/ ({childCount})` |
| childCount 不透明度 | `0.6`（疊加在標題色上） |

標題格式範例：`src/ (12)`、`components/ (5)`

子節點在卡片內以 React Flow Group Node 方式排列，間距 `8px`。

### 1.3 Cyan 單色系規格

所有節點、邊、glow 效果只使用以下 Cyan 色票，禁用多色霓虹配色。

| 用途 | 色值 |
|------|------|
| 主色（節點邊框、標題、邊線） | `#00d4ff` |
| 亮色（hover glow、focus ring） | `#00ffff` |
| 暗色（dim 節點、非焦點邊） | `#0099cc` |
| 背景暈 (node bg) | `rgba(0, 212, 255, 0.05)` |
| 邊框（node border） | `rgba(0, 212, 255, 0.2)` |
| Glow box-shadow | `0 0 12px rgba(0, 212, 255, 0.4)` |
| 選中/hover glow | `0 0 20px rgba(0, 212, 255, 0.6)` |

### 1.4 節點層次標示（UI → API → Service → Data）

dagre 計算 rank 後，依節點所在 rank 標示語意層次 badge。

| Rank（由上而下） | 語意標籤 | badge 底色 |
|-----------------|---------|-----------|
| Rank 0 | `UI` | `rgba(0, 212, 255, 0.15)` |
| Rank 1 | `API` | `rgba(0, 212, 255, 0.10)` |
| Rank 2 | `Service` | `rgba(0, 212, 255, 0.08)` |
| Rank 3+ | `Data` | `rgba(0, 212, 255, 0.05)` |

badge 規格：
- 位置：節點右上角，absolute，top: -6px，right: 6px
- 樣式：`border-radius: 3px`、`padding: 1px 5px`、`fontSize: 9px`、`fontWeight: 600`
- 文字色：`#00d4ff`、`opacity: 0.8`

**說明**：層次標籤為輔助資訊，若 rank 無法對應語意（混合結構），可省略 badge 不顯示。

### 1.5 邊（Edge）規格

| 屬性 | 值 |
|------|----|
| stroke | `#00d4ff` |
| strokeWidth | `1.5` |
| opacity（靜態） | `0.4` |
| markerEnd（箭頭） | Cyan 色填充，size 8 |
| 線型 | 直線或 orthogonal（dagre 分層適用直角折線） |
| hover 時 opacity | `0.9` + `filter: drop-shadow(0 0 4px #00d4ff)` |

### 1.6 2D 專用標示 Badge

- 位置：Toolbar 視角 pill 右側，或 Canvas 右下角浮層
- 文字：`2D 專用`
- 樣式：`background: rgba(0, 212, 255, 0.1)`、`border: 1px solid rgba(0, 212, 255, 0.3)`、`border-radius: 4px`、`padding: 2px 8px`、`fontSize: 10px`、`color: #00d4ff`
- 行為：用戶在 3D 模式下選擇此視角時，自動切換至 2D，並短暫顯示 tooltip「系統框架僅支援 2D 模式」（2 秒後消失）

---

## 2. 邏輯運作視角 (Logic Operation)

### 2.1 BFS Hover 高亮效果規格

#### 高亮狀態

| 節點/邊狀態 | opacity | transition |
|------------|---------|-----------|
| 無 hover（初始） | `1.0` | — |
| hover 中 — 相關節點（BFS 可達） | `1.0` | `opacity 200ms ease-out` |
| hover 中 — 非相關節點 | `0.15` | `opacity 200ms ease-out` |
| hover 中 — 相關邊 | `1.0` | `opacity 200ms ease-out` |
| hover 中 — 非相關邊 | `0.08` | `opacity 200ms ease-out` |

#### BFS 參數

| 參數 | 值 | 說明 |
|------|----|------|
| maxDepth | `5` | 最大遍歷跳數，平衡高亮範圍與清晰度 |
| 方向 | 雙向（Forward + Backward） | 追蹤依賴鏈的完整上下游 |
| hover 目標節點自身 opacity | `1.0` + glow 增強 | box-shadow 加倍 |

#### hover 目標節點額外樣式

```
box-shadow: 0 0 20px {nodeAccentColor}80, 0 0 40px {nodeAccentColor}30
border-color: {nodeAccentColor}
```

其中 `{nodeAccentColor}` 為該節點在霓虹多色配色下的對應色（保留 Sprint 2 配色規則）。

### 2.2 霓虹多色配色保留說明

邏輯運作視角完整保留 Sprint 2 現有霓虹配色，不引入新色彩規則。

| 節點類型 | 邊框色 | 背景色 |
|---------|--------|--------|
| file | `#00d4ff` (Cyan) | `rgba(0,212,255,0.06)` |
| function | `#bd00ff` (Magenta) | `rgba(189,0,255,0.06)` |
| class | `#ff8800` (Amber) | `rgba(255,136,0,0.06)` |
| variable | `#00cc66` (Green) | `rgba(0,204,102,0.06)` |
| directory | `#9e9ec8` (Muted Purple) | `rgba(158,158,200,0.04)` |

邊線顏色依 source 節點色延伸，opacity `0.35`，無淡化時。

### 2.3 粒子流動規格

與 Sprint 2 保持一致，不改動。CSS offset-path 粒子沿邊流動，速度 2.5s/cycle。

### 2.4 2D + 3D 共用標示

- 位置：Toolbar 視角 pill 右側
- 文字：`2D + 3D`
- 樣式：`background: rgba(255,0,255,0.08)`、`border: 1px solid rgba(255,0,255,0.25)`、`border-radius: 4px`、`padding: 2px 8px`、`fontSize: 10px`、`color: #ff00ff`

---

## 3. 資料旅程視角 (Data Journey)

### 3.1 Stagger Animation 規格

#### 核心時序（老闆核准，不可改）

| 參數 | 值 | 說明 |
|------|----|------|
| stepDuration（預設） | `350ms` | 每步節點亮起間隔 |
| stepDuration（>30 節點） | `100ms` | 自動加速，唯一例外 |
| 節點淡入 duration | `200ms` | 單節點從 dim → bright 的過渡時間 |
| 節點淡入 easing | `ease-in` | |
| 節點初始 opacity | `0.3` | 路徑節點預填充到畫面（dim 狀態） |
| 節點點亮 opacity | `1.0` | stagger 到達該節點時 |

#### Framer Motion 實作參考

```jsx
// staggerChildren 套用節奏
variants={{
  container: { transition: { staggerChildren: 0.35 } },
  item: {
    initial: { opacity: 0.3 },
    animate: { opacity: 1, transition: { duration: 0.2, ease: 'easeIn' } }
  }
}}
```

> 注意：>30 節點時 staggerChildren 改為 `0.1`，由 `useStaggerAnimation` hook 的 `effectiveDuration` 控制。

### 3.2 邊流動動畫 CSS

```css
.data-journey-edge {
  stroke-dasharray: 8 4;
  animation: dash-flow 1s linear infinite;
}

@keyframes dash-flow {
  to { stroke-dashoffset: -12; }
}
```

| 屬性 | 值 |
|------|----|
| stroke-dasharray | `8 4`（8px 實線 + 4px 空白） |
| animation duration | `1s` |
| animation timing | `linear infinite` |
| stroke-dashoffset 結束值 | `-12`（= dasharray 合計 = 8 + 4） |

### 3.3 Green 單色系規格

所有節點、邊、glow 效果只使用以下 Green 色票。

| 用途 | 色值 |
|------|------|
| 主色（節點邊框、邊線） | `#00ff88` |
| 亮色（hover glow、active step） | `#00ffaa` |
| 暗色（dim 節點、未到達邊） | `#00cc66` |
| 節點背景（點亮狀態） | `rgba(0, 255, 136, 0.08)` |
| 節點背景（dim 狀態） | `rgba(0, 255, 136, 0.02)` |
| 邊框（dim 節點） | `rgba(0, 255, 136, 0.2)` |
| Glow box-shadow | `0 0 12px rgba(0, 255, 136, 0.4)` |
| currentStep glow | `0 0 24px rgba(0, 255, 136, 0.7)` |

### 3.4 E2E 面板同步高亮規格

E2E 面板（`E2EPanel.tsx`）中，每個路徑步驟列表項目的高亮狀態：

| 狀態 | background | 左邊框 | 文字色 |
|------|-----------|--------|--------|
| currentStep（播放到此） | `rgba(0, 255, 136, 0.1)` | `2px solid #00ff88` | `#00ff88` |
| 已經過（step < currentStep） | `rgba(0, 255, 136, 0.03)` | `2px solid rgba(0,255,136,0.2)` | `var(--text-secondary)` |
| 未到達（step > currentStep） | `transparent` | `2px solid transparent` | `var(--text-muted)` |

步驟列表過渡動畫：`background 150ms ease, border-color 150ms ease, color 150ms ease`

currentStep 項目自動滾動至可見區域（`scrollIntoView({ behavior: 'smooth', block: 'nearest' })`）。

### 3.5 重播按鈕規格

| 屬性 | 值 |
|------|----|
| 位置 | E2E 面板頂部右側（flex row justify-between 的右端） |
| 圖示 | RotateCcw（Lucide icon，size 14） |
| 標籤文字 | 無文字（icon only），tooltip 顯示「重播」 |
| 寬高 | `28px x 28px` |
| 背景（預設） | `rgba(0, 255, 136, 0.08)` |
| 背景（hover） | `rgba(0, 255, 136, 0.16)` |
| 邊框 | `1px solid rgba(0, 255, 136, 0.25)` |
| border-radius | `6px` |
| icon 色 | `#00ff88` |
| transition | `background 150ms ease` |
| 播放中狀態 | `opacity: 0.4`（禁用，動畫完畢後恢復） |

播放/重播按鈕邏輯：
- 播放未開始或已結束：顯示 Play 圖示（TriangleRight）
- 播放中：顯示 Pause 圖示
- 重播：位置固定在右側，始終可見，點擊後呼叫 `replay()`

### 3.6 2D + 3D 共用標示

- 樣式與邏輯運作相同，但底色換用 Green 系：
  `background: rgba(0, 255, 136, 0.08)`、`border: 1px solid rgba(0, 255, 136, 0.25)`、`color: #00ff88`

---

## 4. 視角切換 UI

### 4.1 ControlPanel 三選一按鈕規格

取代 Sprint 9 四選一 ViewMode radio group，佈局保持垂直列表。

#### 每個視角按鈕的結構（左 → 右）

```
[色標圓點 8px] [標題 + 描述] [2D/3D badge（右側）]
```

#### 色標圓點

| 視角 | 圓點色 |
|------|--------|
| 系統框架 | `#00d4ff` |
| 邏輯運作 | `#ff00ff` |
| 資料旅程 | `#00ff88` |

規格：`width: 8px`、`height: 8px`、`border-radius: 50%`、`flex-shrink: 0`、`margin-right: 10px`、背景色填充對應色、`box-shadow: 0 0 6px {color}80`

#### 按鈕狀態

| 狀態 | 樣式 |
|------|------|
| 未選中（default） | 文字色 `var(--text-muted)`、背景 `transparent`、無左邊框 |
| hover | 文字色 `var(--text-secondary)`、背景 `rgba(255,255,255,0.03)` |
| 選中（active） | 文字色 `var(--text-primary)`、背景 `rgba({accentColor}, 0.08)`、左邊框 `2px solid {accentColor}` |
| disabled（不存在此場景） | — |

`{accentColor}` 各視角如下：

| 視角 | accentColor RGB |
|------|----------------|
| 系統框架 | `0, 212, 255` |
| 邏輯運作 | `255, 0, 255` |
| 資料旅程 | `0, 255, 136` |

#### 按鈕整體尺寸

- `padding: 10px 12px`
- `border-radius: 8px`
- `min-height: 52px`
- `width: 100%`
- `cursor: pointer`
- `transition: background 150ms ease, border-color 150ms ease, color 150ms ease`

#### 標題與描述

| 元素 | 樣式 |
|------|------|
| 標題 | `fontSize: 13px`、`fontWeight: 600`、繼承文字色 |
| 描述 | `fontSize: 11px`、`color: var(--text-muted)`、`marginTop: 2px` |

三組標題/描述文字：

| 視角 | 標題 | 描述 |
|------|------|------|
| 系統框架 | `系統框架` | `分層結構一目了然` |
| 邏輯運作 | `邏輯運作` | `從入口追呼叫鏈` |
| 資料旅程 | `資料旅程` | `逐步追蹤資料路徑` |

### 4.2 Toolbar 色標 Pill 規格

位於 Toolbar 中段，顯示當前視角名稱。

#### Pill 結構（左 → 右）

```
[6px 圓點] [視角名稱] [2D/3D badge]
```

#### 尺寸與樣式

| 屬性 | 值 |
|------|----|
| height | `24px` |
| padding | `0 10px` |
| border-radius | `12px`（完全圓角 pill） |
| border | `1px solid {accentColor}40`（40 = 25% opacity） |
| background | `rgba({accentColor}, 0.06)` |
| gap（內部元素） | `6px` |
| fontSize（文字） | `12px` |
| fontWeight（文字） | `500` |
| 文字色 | `{accentColor}` |

#### 內部圓點

- `width: 6px`、`height: 6px`、`border-radius: 50%`、`background: {accentColor}`、`box-shadow: 0 0 4px {accentColor}`

#### 2D/3D Badge（pill 右側）

緊貼於 pill 右側，不在 pill 內部：

| 視角 | Badge 文字 | 底色 | 邊框色 | 文字色 |
|------|-----------|------|--------|--------|
| 系統框架 | `2D 專用` | `rgba(0,212,255,0.1)` | `rgba(0,212,255,0.3)` | `#00d4ff` |
| 邏輯運作 | `2D + 3D` | `rgba(255,0,255,0.08)` | `rgba(255,0,255,0.25)` | `#ff00ff` |
| 資料旅程 | `2D + 3D` | `rgba(0,255,136,0.08)` | `rgba(0,255,136,0.25)` | `#00ff88` |

Badge 尺寸：`border-radius: 4px`、`padding: 2px 8px`、`fontSize: 10px`、`fontWeight: 500`

### 4.3 視角切換過渡動畫

#### 圖譜區域（Canvas）

使用 Framer Motion `AnimatePresence`，`mode="wait"`：

| 屬性 | 值 |
|------|----|
| initial | `{ opacity: 0 }` |
| animate | `{ opacity: 1 }` |
| exit | `{ opacity: 0 }` |
| duration | `300ms` |
| easing | `ease-out` |

#### 節點位置過渡

切換佈局引擎時（e.g. force-directed → dagre），節點位置從舊座標平滑移動至新座標：

- React Flow `nodesDraggable` 配合 `position` prop 更新
- 使用 CSS `transition: transform 300ms ease-out` 在 node element 上
- 注意：dagre 計算完後才觸發位置更新，避免節點跳動

#### ControlPanel 按鈕選中態過渡

- `transition: background 150ms ease, border-color 150ms ease, color 150ms ease`
- 切換視角時，舊按鈕與新按鈕狀態同步更新，無需額外動畫

---

## 5. 2D/3D 適配邏輯摘要

### 5.1 視角與模式矩陣

| 視角 | 2D | 3D | 備注 |
|------|----|----|------|
| 系統框架 | 支援 | 不支援 | 選 3D 時自動切回 2D |
| 邏輯運作 | 支援 | 支援 | — |
| 資料旅程 | 支援 | 支援 | — |

### 5.2 自動切換提示規格

當用戶在 3D 模式下選擇系統框架，或從系統框架切換至 3D 模式時：

- 顯示 Toast/Snackbar：「系統框架視角僅支援 2D 模式，已自動切換」
- Toast 位置：Canvas 底部居中
- 持續時間：2000ms
- 樣式：`background: rgba(0,212,255,0.12)`、`border: 1px solid rgba(0,212,255,0.3)`、`color: #00d4ff`、`border-radius: 8px`、`padding: 10px 16px`、`fontSize: 13px`

---

## 6. 共用設計 Token

### 6.1 三視角色彩系統對照表（快查）

| Token | 系統框架 | 邏輯運作 | 資料旅程 |
|-------|---------|---------|---------|
| `--perspective-primary` | `#00d4ff` | `#ff00ff` | `#00ff88` |
| `--perspective-bright` | `#00ffff` | `#ff44ff` | `#00ffaa` |
| `--perspective-dim` | `#0099cc` | `#aa00cc` | `#00cc66` |
| `--perspective-bg` | `rgba(0,212,255,0.05)` | 多色（節點類型決定） | `rgba(0,255,136,0.05)` |
| `--perspective-border` | `rgba(0,212,255,0.2)` | 多色（節點類型決定） | `rgba(0,255,136,0.2)` |
| `--perspective-glow` | `rgba(0,212,255,0.4)` | 多色（節點類型決定） | `rgba(0,255,136,0.4)` |

### 6.2 背景與底色

所有視角共用以下底色（繼承自 Sprint 2，不改動）：

| Token | 值 |
|-------|----|
| `--bg-base` | `#0a0a0f` |
| `--bg-surface` | `#0f0f1a` |
| `--bg-elevated` | `#13131f` |
| `--bg-overlay` | `#1a1a2e` |
| `--text-primary` | `#e8eaf6` |
| `--text-secondary` | `#9e9ec8` |
| `--text-muted` | `#5c5c88` |

### 6.3 Typography（圖譜內部）

| 元素 | fontFamily | fontSize | fontWeight |
|------|-----------|---------|-----------|
| 節點標籤 | `JetBrains Mono` | `11.5px` | `500` |
| 節點 meta 資訊 | `JetBrains Mono` | `10px` | `400` |
| 目錄群組標題 | `Inter` | `11px` | `600` |
| E2E 面板步驟 | `JetBrains Mono` | `12px` | `400` |
| ControlPanel 標題 | `Inter` | `13px` | `600` |
| ControlPanel 描述 | `Inter` | `11px` | `400` |

---

## 7. 元件狀態清單

### 7.1 ControlPanel 視角按鈕

- [x] Default（未選中）
- [x] Hover
- [x] Active（選中）
- [ ] Disabled（此版本無禁用場景）
- [ ] Loading（切換中 spinner，可選加分項）

### 7.2 目錄群組卡片

- [x] Default（靜態展開）
- [x] Hover（glow 增強）
- [ ] Collapsed（摺疊，Sprint 12+ 功能）

### 7.3 Stagger 播放控制

- [x] 未播放（播放按鈕顯示）
- [x] 播放中（暫停按鈕顯示，進度推進）
- [x] 播放完成（重播按鈕可用）
- [x] >30 節點（加速模式，視覺無差異，節奏加快）

### 7.4 BFS Hover 高亮

- [x] 無 hover（全圖正常顯示）
- [x] Hover 中 — 相關節點全亮、非相關節點 dim
- [x] Hover 離開（回復至全圖正常，200ms 過渡）

---

## 8. 邊界條件與例外處理（UI 層）

| 場景 | UI 行為 |
|------|---------|
| dagre 計算失敗 | 回退 force-directed，Canvas 不顯示錯誤，console.warn |
| 路徑為空（Data Journey 無選取路徑） | E2E 面板顯示空狀態：「請先選取起點與終點節點」，字色 `var(--text-muted)` |
| stagger path 長度 0 | 播放按鈕禁用（opacity 0.4），重播按鈕禁用 |
| BFS hover 在孤立節點 | 僅高亮該節點自身，其餘節點 dim（正常行為） |
| 3D 選系統框架 | 自動切 2D + Toast 提示（見 §5.2） |
| 視角切換動畫中（300ms）| 禁止再次點擊視角按鈕（pointer-events: none 300ms） |

---

## 9. 實作優先順序建議

依複雜度與視覺影響排序，供前端工程師安排實作序列：

1. **視角切換框架**（ViewStateContext + ControlPanel UI + Toolbar pill）— 基礎骨架，其餘依賴此
2. **系統框架視角**（dagre 佈局 + 目錄群組卡片 + Cyan 色調）— 視覺最獨特，老闆最在意
3. **邏輯運作 BFS 高亮**（useBfsHoverHighlight hook + opacity transition）— 互動核心
4. **資料旅程 Stagger**（useStaggerAnimation hook + E2E 面板同步 + 重播按鈕）— 依賴 E2E 面板已存在
5. **3D 適配限制**（系統框架強制 2D + Toast 提示）— 邊界處理，最後補齊

---

*設計總監已完成細化規格，前端工程師可直接依本文件實作，無需額外確認像素細節。*
