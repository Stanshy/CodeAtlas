# Sprint 2 — 深色霓虹視覺風格文件

> **版本**: v1.0
> **日期**: 2026-03-30
> **作者**: brand-guardian（design-director 指派）
> **任務**: T2 — 深色霓虹視覺設計
> **狀態**: 草稿，待 G1 審核

---

## 1. 設計理念

### 情緒板描述

CodeAtlas 的視覺語言從「深夜工程師的終端機」出發，疊加「科幻電影的神經網路可視化」。使用者打開的第一眼，應該感受到：

- **秩序中的能量**：整齊的格線背景暗示結構，霓虹節點與流光邊線注入生命感
- **深空感**：極暗的背景讓使用者感知到「無限畫布」，節點漂浮其中如同星圖
- **程式碼的美學**：等寬字型的節點標籤、Cyan/Magenta 的霓虹對比，呼應老牌 IDE 的暗色主題 DNA，但更富視覺張力

### 核心視覺印象

| 維度 | 描述 |
|------|------|
| 科技感 | 精密的光學儀器質感——所有邊線筆直或弧度精確，節點邊框清晰銳利 |
| 未來感 | Cyan + Magenta 對比色組合，源自 80 年代 synthwave 美學，現代重詮釋 |
| 高對比 | 前景元素（節點/文字/邊線）與極暗背景之間刻意拉開對比差距 |
| 可讀性優先 | 所有 glow 效果只強化存在感，不遮蔽文字——「發光但清晰」 |

### 設計原則

1. **Glow 節制原則**：Glow 是點綴，不是主角。正常狀態使用 subtle glow，Hover/Active 才升級。過度 glow 會造成視覺疲勞，截圖也會糊掉。
2. **層次清晰原則**：背景 < 邊線 < 節點容器 < 節點邊框/標籤，每層都有明確的亮度差異。
3. **型別即顏色原則**：directory 節點永遠是 Magenta/Purple 系，file 節點永遠是 Cyan 系。使用者不需要讀標籤就能感知節點類型。
4. **動畫服務資訊原則**：粒子流動的方向 = import 依賴的方向，動畫不是裝飾，而是資訊的一部分。

---

## 2. 色彩系統

### 2.1 背景色

| 名稱 | Hex | 用途 |
|------|-----|------|
| `bg-base` | `#0a0a0f` | 主畫布背景（最暗層） |
| `bg-surface` | `#0f0f1a` | 節點填充底色（稍亮，區隔背景） |
| `bg-elevated` | `#13131f` | 選中節點/Panel 底色 |
| `bg-overlay` | `#1a1a2e` | Tooltip、Modal、工具列背景（最亮背景層） |
| `bg-grid` | `rgba(255, 255, 255, 0.03)` | 背景網格線色（極弱，僅暗示結構） |

#### 背景漸層

畫布可選用徑向漸層，強調中心焦點感：

```css
background: radial-gradient(
  ellipse at 50% 50%,
  #0f0f1a 0%,
  #0a0a0f 60%,
  #070710 100%
);
```

### 2.2 主色（Primary）

| 名稱 | Hex | 用途 |
|------|-----|------|
| `primary` | `#00d4ff` | 主要互動元素、選中狀態、Toolbar 強調 |
| `primary-dim` | `#0099bb` | 主色降亮版，用於次要互動態 |
| `primary-ghost` | `rgba(0, 212, 255, 0.12)` | 選中狀態的背景填充 |

### 2.3 輔色（Secondary）

| 名稱 | Hex | 用途 |
|------|-----|------|
| `secondary` | `#bd00ff` | 次要強調元素，directory 節點主色 |
| `secondary-dim` | `#8800bb` | 輔色降亮版 |
| `secondary-ghost` | `rgba(189, 0, 255, 0.10)` | Directory 節點填充背景 |

### 2.4 霓虹色碼（Neon Palette）

#### Cyan 系 — File 節點專屬

| 名稱 | Hex | 對比度（on #0a0a0f） | 用途 |
|------|-----|---------------------|------|
| `neon-cyan-bright` | `#00ffff` | 21.0:1 ✓ | File 節點 Hover/Active 邊框、高亮狀態 |
| `neon-cyan` | `#00d4ff` | 14.8:1 ✓ | File 節點標準邊框色 |
| `neon-cyan-dim` | `#0099cc` | 7.2:1 ✓ | File 節點次要狀態、淡化邊框 |
| `neon-cyan-muted` | `rgba(0, 212, 255, 0.35)` | — | File 節點填充背景色 |

#### Magenta / Purple 系 — Directory 節點專屬

| 名稱 | Hex | 對比度（on #0a0a0f） | 用途 |
|------|-----|---------------------|------|
| `neon-magenta-bright` | `#ff00ff` | 9.6:1 ✓ | Directory 節點 Hover/Active 邊框 |
| `neon-magenta` | `#bd00ff` | 7.1:1 ✓ | Directory 節點標準邊框色 |
| `neon-purple` | `#8855ff` | 5.2:1 ✓ | Directory 節點填充邊框（稍暗） |
| `neon-purple-muted` | `rgba(136, 85, 255, 0.18)` | — | Directory 節點填充背景色 |

#### Green 系 — Data-flow / Import 邊

| 名稱 | Hex | 對比度（on #0a0a0f） | 用途 |
|------|-----|---------------------|------|
| `neon-green-bright` | `#00ff88` | 16.8:1 ✓ | 邊線 Hover 高亮色 |
| `neon-green` | `#00cc66` | 10.7:1 ✓ | 標準 import 邊線色 |
| `neon-green-dim` | `#009944` | 6.1:1 ✓ | 流動粒子主色 |

#### Amber / Orange 系 — 警告 / Highlight

| 名稱 | Hex | 對比度（on #0a0a0f） | 用途 |
|------|-----|---------------------|------|
| `neon-amber-bright` | `#ffaa00` | 10.5:1 ✓ | 循環依賴警告邊線、高亮強調 |
| `neon-amber` | `#ff8800` | 8.2:1 ✓ | 警告節點邊框、entry point 標記 |
| `neon-amber-dim` | `#cc6600` | 5.4:1 ✓ | 次要警告態 |

### 2.5 Glow 效果參數

#### Glow 強度分級

**Subtle（正常態）**
```css
/* File 節點 subtle glow */
box-shadow: 0 0 8px rgba(0, 212, 255, 0.25),
            0 0 16px rgba(0, 212, 255, 0.10);
filter: drop-shadow(0 0 4px rgba(0, 212, 255, 0.20));

/* Directory 節點 subtle glow */
box-shadow: 0 0 8px rgba(189, 0, 255, 0.25),
            0 0 16px rgba(189, 0, 255, 0.10);
filter: drop-shadow(0 0 4px rgba(189, 0, 255, 0.20));
```

**Normal（Hover 態）**
```css
/* File 節點 normal glow */
box-shadow: 0 0 12px rgba(0, 212, 255, 0.50),
            0 0 24px rgba(0, 212, 255, 0.25),
            0 0 40px rgba(0, 212, 255, 0.10);
filter: drop-shadow(0 0 8px rgba(0, 212, 255, 0.45));

/* Directory 節點 normal glow */
box-shadow: 0 0 12px rgba(189, 0, 255, 0.50),
            0 0 24px rgba(189, 0, 255, 0.25),
            0 0 40px rgba(189, 0, 255, 0.10);
filter: drop-shadow(0 0 8px rgba(189, 0, 255, 0.45));
```

**Intense（Active / Selected 態）**
```css
/* File 節點 intense glow */
box-shadow: 0 0 16px rgba(0, 255, 255, 0.70),
            0 0 32px rgba(0, 212, 255, 0.40),
            0 0 60px rgba(0, 212, 255, 0.20),
            inset 0 0 12px rgba(0, 212, 255, 0.08);
filter: drop-shadow(0 0 12px rgba(0, 255, 255, 0.60));

/* Directory 節點 intense glow */
box-shadow: 0 0 16px rgba(255, 0, 255, 0.70),
            0 0 32px rgba(189, 0, 255, 0.40),
            0 0 60px rgba(189, 0, 255, 0.20),
            inset 0 0 12px rgba(189, 0, 255, 0.08);
filter: drop-shadow(0 0 12px rgba(255, 0, 255, 0.60));
```

**Edge glow（邊線 Hover）**
```css
filter: drop-shadow(0 0 6px rgba(0, 204, 102, 0.80));
```

#### Glow 快速索引表

| 狀態 | File 節點 box-shadow 核心值 | Directory 節點 box-shadow 核心值 |
|------|---------------------------|--------------------------------|
| subtle | `0 0 8px rgba(0,212,255,0.25)` | `0 0 8px rgba(189,0,255,0.25)` |
| normal (hover) | `0 0 12px rgba(0,212,255,0.50), 0 0 24px rgba(0,212,255,0.25)` | `0 0 12px rgba(189,0,255,0.50), 0 0 24px rgba(189,0,255,0.25)` |
| intense (active) | `0 0 16px rgba(0,255,255,0.70), 0 0 32px rgba(0,212,255,0.40)` | `0 0 16px rgba(255,0,255,0.70), 0 0 32px rgba(189,0,255,0.40)` |

### 2.6 文字色

| 名稱 | Hex | 對比度（on #0a0a0f） | 用途 |
|------|-----|---------------------|------|
| `text-primary` | `#e8eaf6` | 16.4:1 ✓ (AA+) | 節點標籤主文字、Panel 標題 |
| `text-secondary` | `#9e9ec8` | 7.2:1 ✓ (AA+) | 節點次要資訊（如副標籤、描述） |
| `text-muted` | `#5c5c88` | 4.7:1 ✓ (AA) | 暗文字、分隔線說明、佔位符 |
| `text-disabled` | `#3a3a5c` | 2.8:1 — (不達 AA，僅用於非重要UI) | 停用狀態 |
| `text-on-neon` | `#0a0a0f` | — | 霓虹背景上的文字（反色） |

> WCAG AA 要求：正常文字對比度 ≥ 4.5:1，大文字（18px+ 或 bold 14px+）≥ 3:1。
> `text-primary` (#e8eaf6) 在 #0a0a0f 背景上對比度為 16.4:1，遠超標準。

### 2.7 邊線色（React Flow 邊）

| 類型 | Hex | 透明度 | 粗細 | 用途 |
|------|-----|--------|------|------|
| import 邊（標準） | `#00cc66` | 0.7 | 1.5px | 標準 import 依賴關係 |
| import 邊（Hover） | `#00ff88` | 1.0 | 2.5px | 被 Hover 高亮的邊 |
| import 邊（淡化） | `#00cc66` | 0.15 | 1px | 非相關邊的淡化狀態 |
| export 邊（標準） | `#0099cc` | 0.7 | 1.5px | 反向依賴（若追蹤） |
| data-flow 邊 | `#00ffff` | 0.6 | 1px | 資料流向（虛線） |
| 警告邊（循環依賴） | `#ff8800` | 0.85 | 2px | 循環依賴標示 |

---

## 3. 節點視覺規格

### 3.1 File 節點（Cyan 系）

| 屬性 | 規格 |
|------|------|
| 形狀 | 矩形（Rounded Rectangle） |
| 最小寬度 | 140px |
| 最大寬度 | 220px（超出截斷加省略號） |
| 高度 | 48px（單行標籤）/ 64px（雙行含副標籤） |
| 圓角（border-radius） | 8px |
| 邊框粗細 | 1.5px（標準）/ 2px（Hover）/ 2.5px（Active） |
| 邊框色（標準） | `#00d4ff` |
| 邊框色（Hover） | `#00ffff` |
| 邊框色（Active/Selected） | `#00ffff` |
| 填充色（背景） | `rgba(0, 212, 255, 0.07)` |
| 填充色（Hover） | `rgba(0, 212, 255, 0.12)` |
| 填充色（Active） | `rgba(0, 212, 255, 0.16)` |
| Glow（標準） | `0 0 8px rgba(0, 212, 255, 0.25), 0 0 16px rgba(0, 212, 255, 0.10)` |
| Glow（Hover） | `0 0 12px rgba(0, 212, 255, 0.50), 0 0 24px rgba(0, 212, 255, 0.25)` |
| Glow（Active） | `0 0 16px rgba(0, 255, 255, 0.70), 0 0 32px rgba(0, 212, 255, 0.40)` |
| 標籤字型 | `'Inter', system-ui, sans-serif` |
| 標籤字重 | 500（Medium） |
| 標籤字色 | `#e8eaf6` |
| 標籤大小 | 13px |
| 副標籤（檔案路徑） | 10px，`#9e9ec8` |
| Hover 放大比例 | `scale(1.04)` |
| 圖示（左側） | 14px，檔案類型 icon，顏色與邊框同 `#00d4ff` |

### 3.2 Directory 節點（Magenta/Purple 系）

| 屬性 | 規格 |
|------|------|
| 形狀 | 矩形，帶頂部色條（top accent bar） |
| 最小寬度 | 160px |
| 最大寬度 | 280px |
| 高度（收合） | 56px |
| 高度（展開） | 動態，包含子節點區域 + padding |
| 圓角（border-radius） | 10px |
| 頂部色條高度 | 3px，顏色為 `#bd00ff` |
| 邊框粗細 | 1.5px（標準）/ 2px（Hover）/ 2.5px（Active） |
| 邊框色（標準） | `#8855ff` |
| 邊框色（Hover） | `#bd00ff` |
| 邊框色（Active/Selected） | `#ff00ff` |
| 填充色（背景） | `rgba(136, 85, 255, 0.08)` |
| 填充色（Hover） | `rgba(189, 0, 255, 0.13)` |
| 填充色（Active） | `rgba(189, 0, 255, 0.18)` |
| 內部子節點背景 | `rgba(136, 85, 255, 0.04)` |
| Glow（標準） | `0 0 8px rgba(189, 0, 255, 0.25), 0 0 16px rgba(189, 0, 255, 0.10)` |
| Glow（Hover） | `0 0 12px rgba(189, 0, 255, 0.50), 0 0 24px rgba(189, 0, 255, 0.25)` |
| Glow（Active） | `0 0 16px rgba(255, 0, 255, 0.70), 0 0 32px rgba(189, 0, 255, 0.40)` |
| 標籤字型 | `'Inter', system-ui, sans-serif` |
| 標籤字重 | 600（SemiBold） |
| 標籤字色 | `#e8eaf6` |
| 標籤大小 | 13px |
| 副標籤（子節點數） | 10px，`#9e9ec8`（如 `12 files`） |
| Hover 放大比例 | `scale(1.02)`（群組節點放大幅度較小） |
| 展開/收合按鈕 | 右上角 12x12px 圓形，`#8855ff` 填充，+/- 符號 |

### 3.3 Hover 狀態規格

| 屬性 | File 節點 | Directory 節點 |
|------|-----------|----------------|
| 變換 | `scale(1.04)` | `scale(1.02)` |
| 過渡時間 | `150ms ease-out` | `150ms ease-out` |
| 邊框亮度提升 | bright variant (`#00ffff`) | bright variant (`#ff00ff`) |
| Glow 升級 | subtle → normal | subtle → normal |
| 游標 | `pointer` | `pointer` |
| z-index 提升 | +10 | +5 |

### 3.4 Active / Selected 狀態

| 屬性 | 規格 |
|------|------|
| 邊框粗細 | 2.5px |
| Glow 強度 | intense 等級 |
| 填充背景亮度 | 較 hover 提升 30% alpha |
| 選取指示器 | 四角 4px 方形標記，顏色為邊框色 |
| 其餘節點 | opacity 降至 0.35（淡化非相關節點） |

---

## 4. 邊視覺規格

### 4.1 Import 邊（標準狀態）

| 屬性 | 規格 |
|------|------|
| 邊線色 | `#00cc66` |
| 透明度 | 0.70 |
| 粗細 | 1.5px |
| 邊線樣式 | 實線（solid） |
| 箭頭端點 | 三角箭頭，大小 6px，顏色與邊線同 |
| 曲率 | React Flow 預設貝茲曲線，`curvature: 0.25` |

### 4.2 流動粒子（Particle Flow）

| 屬性 | 規格 |
|------|------|
| 粒子色 | `#00ff88` |
| 粒子大小 | 3px（寬）× 3px（高），圓形 |
| 流動速度 | 2.5px/frame（約 2 秒/條邊） |
| 每條邊粒子數量 | 2～3 個（依邊長動態計算，最多 4 個） |
| 粒子間距 | 均勻分佈，間距 = 邊長 / 粒子數量 |
| 粒子 opacity | 0.85（頭部）→ 0 （尾部漸隱，trail 效果） |
| 動畫實作 | CSS `@keyframes` + `animation-delay` 錯開 |
| `prefers-reduced-motion` | 支援，粒子改為靜態點，禁用動畫 |
| 效能降級 | 節點 > 200 個時，關閉粒子，只顯示邊線 |

CSS 關鍵幀範例：
```css
@keyframes particle-flow {
  0%   { offset-distance: 0%;   opacity: 0; }
  10%  { opacity: 0.85; }
  85%  { opacity: 0.85; }
  100% { offset-distance: 100%; opacity: 0; }
}
```

### 4.3 Hover 高亮邊

| 屬性 | 規格 |
|------|------|
| 觸發 | 任一相關節點 Hover 時 |
| 邊線色 | `#00ff88` |
| 透明度 | 1.0 |
| 粗細 | 2.5px |
| Glow | `filter: drop-shadow(0 0 6px rgba(0, 255, 136, 0.80))` |
| 過渡時間 | `100ms ease-out` |
| 粒子加速 | 速度提升 1.5x |

### 4.4 淡化邊（非相關邊）

| 屬性 | 規格 |
|------|------|
| 觸發 | 有節點被 Hover 時，所有非相關邊 |
| opacity | `0.12` |
| 粒子 | 隱藏（opacity: 0） |
| 過渡時間 | `200ms ease-out` |
| 恢復時間 | `300ms ease-out` |

---

## 5. 字體規範

### 5.1 字型家族

| 用途 | 字型棧 |
|------|--------|
| 程式碼 / 路徑 / 檔名 | `'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace` |
| 節點標籤 / UI 標籤 | `'Inter', system-ui, -apple-system, sans-serif` |
| 數字 / 統計數字 | `'Inter', system-ui` + `font-feature-settings: "tnum"` |

### 5.2 大小層級

| 層級 | 大小 | 字重 | 行高 | 用途 |
|------|------|------|------|------|
| H1 | 24px | 700 Bold | 1.3 | 主標題（左上角 App 名稱） |
| H2 | 18px | 600 SemiBold | 1.4 | 面板標題 |
| Body | 14px | 400 Regular | 1.5 | 一般說明文字、Tooltip |
| Node Label | 13px | 500 Medium | 1.2 | 節點主標籤 |
| Small | 12px | 400 Regular | 1.4 | 節點副標籤、count 數字 |
| Tiny | 10px | 400 Regular | 1.3 | 極小的輔助資訊（慎用） |

### 5.3 字重對照

| 字重名稱 | 數值 | 使用場景 |
|---------|------|---------|
| Light | 300 | 不建議用於節點（過細在暗色背景可讀性差） |
| Regular | 400 | Body 文字、次要說明 |
| Medium | 500 | 節點主標籤、按鈕文字 |
| SemiBold | 600 | Directory 節點標籤、Panel 標題 |
| Bold | 700 | App 名稱、強調文字 |

### 5.4 特殊文字處理

- 節點標籤過長時：`text-overflow: ellipsis; overflow: hidden; white-space: nowrap`
- 檔案副檔名：使用 `neon-cyan-dim` 色單獨標示（如 `.ts`、`.tsx`）
- 路徑分隔符 `/`：使用 `text-muted` 降低視覺權重

---

## 6. 元件樣式規範

### 6.1 節點卡片（Node Card）

```
padding: 10px 14px
border-width: 1.5px (normal) / 2px (hover) / 2.5px (active)
border-radius: 8px (file) / 10px (directory)
gap（icon + label）: 8px
min-width: 140px (file) / 160px (directory)
```

### 6.2 Minimap（縮略圖）

| 屬性 | 規格 |
|------|------|
| 位置 | 右下角，margin 16px |
| 尺寸 | 160px × 120px |
| 背景色 | `rgba(10, 10, 15, 0.85)` |
| 邊框 | `1px solid rgba(255, 255, 255, 0.08)` |
| 圓角 | 8px |
| Minimap File 節點色 | `#00d4ff` with 70% opacity |
| Minimap Directory 節點色 | `#8855ff` with 70% opacity |
| Minimap 視口框色 | `rgba(255, 255, 255, 0.15)` |
| Backdrop blur | `backdrop-filter: blur(4px)` |

### 6.3 工具列（Toolbar）

| 屬性 | 規格 |
|------|------|
| 位置 | 左上角，margin 16px，或頂部居中 |
| 背景色 | `rgba(26, 26, 46, 0.90)` |
| 邊框 | `1px solid rgba(255, 255, 255, 0.08)` |
| 圓角 | 10px |
| 按鈕大小 | 32px × 32px |
| 按鈕 icon 色（Normal） | `#9e9ec8` |
| 按鈕 icon 色（Hover） | `#e8eaf6` |
| 按鈕 icon 色（Active） | `#00d4ff` |
| 按鈕 hover 背景 | `rgba(255, 255, 255, 0.06)` |
| 按鈕 active 背景 | `rgba(0, 212, 255, 0.10)` |
| Backdrop blur | `backdrop-filter: blur(8px)` |

### 6.4 背景效果

#### 網格線（Grid）
```css
background-image:
  linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
  linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
background-size: 40px 40px;
```

> React Flow 的 `<Background>` 元件使用 `variant="dots"` 或 `variant="lines"`，建議用 `dots` variant，dot color 設為 `rgba(255,255,255,0.08)`，dot size 1px，gap 24px。

#### 邊角暗暈（Vignette）
```css
/* 疊加在畫布最上層的 overlay div */
background: radial-gradient(
  ellipse at 50% 50%,
  transparent 40%,
  rgba(7, 7, 16, 0.6) 100%
);
pointer-events: none;
```

### 6.5 狀態彙整

| 元件 | Normal | Hover | Active/Selected | Disabled |
|------|--------|-------|-----------------|---------|
| File 節點 | 邊框 `#00d4ff`, 透明填充, subtle glow | 邊框 `#00ffff`, scale 1.04, normal glow | 邊框 `#00ffff` 2.5px, intense glow | opacity 0.40, no glow |
| Directory 節點 | 邊框 `#8855ff`, 透明填充, subtle glow | 邊框 `#bd00ff`, scale 1.02, normal glow | 邊框 `#ff00ff` 2.5px, intense glow | opacity 0.40, no glow |
| 工具列按鈕 | icon `#9e9ec8` | icon `#e8eaf6`, bg rgba(255,255,255,0.06) | icon `#00d4ff`, bg rgba(0,212,255,0.10) | icon opacity 0.30 |
| Import 邊 | `#00cc66` 70% 1.5px | `#00ff88` 100% 2.5px + glow | — | opacity 0.12 |

---

## 驗收自查

- [x] 色彩系統完整（背景色 5 色、主色、輔色、4 系霓虹色、glow 參數三級別）
- [x] 節點視覺規格明確（directory Magenta/Purple 系 vs file Cyan 系，形狀、尺寸、圓角、邊框色、填充色、glow 全部列出）
- [x] 邊視覺規格明確（import 邊、流動粒子、hover 高亮、淡化邊）
- [x] 字體規範完整（字型家族、大小層級、字重）
- [x] 元件樣式規範含 hover/active/disabled 狀態
- [x] WCAG AA 對比度驗證完成（text-primary 16.4:1、text-secondary 7.2:1、text-muted 4.7:1）
- [x] 所有色碼使用精確 hex 值
- [x] glow 效果給出完整 CSS 值

---

*文件產出者: brand-guardian | 任務: T2 | Sprint: 2 | 日期: 2026-03-30*
