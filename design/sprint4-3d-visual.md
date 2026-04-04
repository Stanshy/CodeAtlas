# Sprint 4 — 3D 視覺設計規範

> **版本**: v1.0
> **日期**: 2026-03-31
> **作者**: brand-guardian（design-director 指派）
> **任務**: T2 — 3D 視覺設計規範
> **Sprint**: Sprint 4
> **狀態**: in_review
> **依賴**: `design/sprint2-visual-style.md`、`design/sprint2-theme-draft.ts`

---

## 色彩來源聲明

本文件所有色碼均引用 `design/sprint2-theme-draft.ts`（Sprint 2 主題設計稿）中的 `colors` 常數。
唯一新增色碼：`#050510`（3D 深空背景色，比 2D 的 `#0a0a0f` 更深，強化深空感，以「新增」標示）。

| theme.ts 常數路徑 | hex 值 | 本文件用途 |
|-------------------|--------|-----------|
| `colors.bg.surface` | `#0f0f1a` | 球體 color 底色 |
| `colors.bg.overlay` | `#1a1a2e` | AmbientLight 色 |
| `colors.primary.DEFAULT` | `#00d4ff` | file 節點 emissive、Toolbar Active icon、相關光源 |
| `colors.secondary.DEFAULT` | `#bd00ff` | directory 節點 emissive、相關光源 |
| `colors.neon.cyan.DEFAULT` | `#00d4ff` | file 球體 glow sprite 色、入射光色 |
| `colors.neon.cyan.bright` | `#00ffff` | file Active 態 emissive（極亮） |
| `colors.neon.magenta.DEFAULT` | `#bd00ff` | directory 球體 glow sprite 色 |
| `colors.neon.magenta.bright` | `#ff00ff` | directory Active 態 emissive（極亮） |
| `colors.neon.green.DEFAULT` | `#00cc66` | import 邊線色 |
| `colors.neon.green.bright` | `#00ff88` | Hover 高亮邊色、粒子色 |
| `colors.text.primary` | `#e8eaf6` | 節點標籤色 |
| `colors.text.secondary` | `#9e9ec8` | Toolbar Normal icon 色 |
| `colors.neon.amber.DEFAULT` | `#ff8800` | 警告邊（循環依賴） |
| `#050510` | — | **（新增）** 3D 深空背景色、Fog 色 |

---

## 第 1 章：3D 節點外觀

### 1.1 設計理念

3D 模式下節點以發光球體呈現，雙層發光架構：
1. **emissive 內發光**：MeshStandardMaterial 的 emissive 屬性，模擬自發光質感
2. **Sprite 外發光 (glow halo)**：SpriteMaterial + AdditiveBlending，模擬霓虹光暈

「型別即顏色」原則延續 Sprint 2：file 節點永遠 Cyan 系、directory 節點永遠 Magenta 系。

---

### 1.2 球體幾何（SphereGeometry）

```javascript
// File 節點
new THREE.SphereGeometry(
  4,   // radius
  16,  // widthSegments
  16   // heightSegments
)

// Directory 節點（大一號，視覺上突顯層級容器角色）
new THREE.SphereGeometry(
  6,   // radius
  16,  // widthSegments
  16   // heightSegments
)
```

| 屬性 | File 節點 | Directory 節點 |
|------|-----------|----------------|
| radius | 4 | 6 |
| widthSegments | 16 | 16 |
| heightSegments | 16 | 16 |

> segments = 16 在球體曲面與 GPU 負載之間取得平衡。低於 12 會出現多邊形感，高於 24 對視覺改善有限但增加頂點數。

---

### 1.3 球體材質（MeshStandardMaterial）

#### File 節點材質

```javascript
// Normal 態
const fileMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#0f0f1a'),         // colors.bg.surface — 球體底色
  emissive: new THREE.Color('#00d4ff'),      // colors.neon.cyan.DEFAULT — 自發光色
  emissiveIntensity: 0.6,                    // Normal 態強度
  transparent: true,
  opacity: 0.9,
  metalness: 0.2,
  roughness: 0.5,
})

// Hover 態（修改現有材質實例）
fileMaterial.emissiveIntensity = 1.2

// Active（Selected）態
fileMaterial.emissiveIntensity = 1.5
fileMaterial.emissive = new THREE.Color('#00ffff')  // colors.neon.cyan.bright

// Faded（非相關節點）態
fileMaterial.opacity = 0.1
fileMaterial.emissiveIntensity = 0.1
```

#### Directory 節點材質

```javascript
// Normal 態
const directoryMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#0f0f1a'),         // colors.bg.surface — 球體底色
  emissive: new THREE.Color('#bd00ff'),      // colors.neon.magenta.DEFAULT — 自發光色
  emissiveIntensity: 0.6,                    // Normal 態強度
  transparent: true,
  opacity: 0.9,
  metalness: 0.2,
  roughness: 0.5,
})

// Hover 態
directoryMaterial.emissiveIntensity = 1.2

// Active（Selected）態
directoryMaterial.emissiveIntensity = 1.5
directoryMaterial.emissive = new THREE.Color('#ff00ff')  // colors.neon.magenta.bright

// Faded 態
directoryMaterial.opacity = 0.1
directoryMaterial.emissiveIntensity = 0.1
```

#### 四態規格對照表

| 狀態 | File emissive | File intensity | Directory emissive | Directory intensity | opacity |
|------|--------------|----------------|-------------------|---------------------|---------|
| Normal | `#00d4ff` | 0.6 | `#bd00ff` | 0.6 | 0.9 |
| Hover | `#00d4ff` | 1.2 | `#bd00ff` | 1.2 | 0.9 |
| Active | `#00ffff` | 1.5 | `#ff00ff` | 1.5 | 0.9 |
| Faded | `#00d4ff` | 0.1 | `#bd00ff` | 0.1 | 0.1 |

> 效能降級：節點數 > 500 時，將 `MeshStandardMaterial` 替換為 `MeshLambertMaterial`（不支援 metalness/roughness 但計算量更低）。`emissive` 和 `emissiveIntensity` 在 `MeshLambertMaterial` 上同樣有效。

---

### 1.4 外發光 Sprite（Glow Halo）

#### Texture 程式產生（radial gradient）

```javascript
function createGlowTexture(color) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, color)       // 中心：傳入色（含 alpha）
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')  // 邊緣：完全透明

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 128, 128)

  return new THREE.CanvasTexture(canvas)
}

// File 節點 glow texture
const fileGlowTexture = createGlowTexture('rgba(0, 212, 255, 0.3)')
// colors.neon.cyan.DEFAULT 的 RGBA 形式，alpha=0.3

// Directory 節點 glow texture
const dirGlowTexture = createGlowTexture('rgba(189, 0, 255, 0.3)')
// colors.neon.magenta.DEFAULT 的 RGBA 形式，alpha=0.3
```

#### SpriteMaterial 設定

```javascript
// File 節點 glow sprite
const fileGlowMaterial = new THREE.SpriteMaterial({
  map: fileGlowTexture,
  blending: THREE.AdditiveBlending,
  transparent: true,
  opacity: 0.3,          // Normal 態
  depthWrite: false,     // 防止 z-fighting
})

// Directory 節點 glow sprite
const dirGlowMaterial = new THREE.SpriteMaterial({
  map: dirGlowTexture,
  blending: THREE.AdditiveBlending,
  transparent: true,
  opacity: 0.3,          // Normal 態
  depthWrite: false,
})

// Sprite 尺寸（scale = 球體直徑 × 3）
const fileSprite = new THREE.Sprite(fileGlowMaterial)
fileSprite.scale.set(4 * 2 * 3, 4 * 2 * 3, 1)  // radius=4 → 直徑=8 → scale=24

const dirSprite = new THREE.Sprite(dirGlowMaterial)
dirSprite.scale.set(6 * 2 * 3, 6 * 2 * 3, 1)   // radius=6 → 直徑=12 → scale=36
```

#### Sprite 四態規格

| 狀態 | File sprite opacity | Directory sprite opacity |
|------|---------------------|--------------------------|
| Normal | 0.3 | 0.3 |
| Hover | 0.5 | 0.5 |
| Active | 0.7 | 0.7 |
| Faded | 0.0 | 0.0 |

> 效能降級：節點數 > 300 時，隱藏所有 glow sprite（`sprite.visible = false`），保留 emissive 內發光即可維持辨識度。

---

### 1.5 節點標籤

使用 **3d-force-graph 的 `nodeLabel` prop**（三種方案擇一，依實作需求）：

#### 方案 A：3d-force-graph 內建 HTML 標籤（推薦）

```javascript
// 在 3d-force-graph 的設定中
<ForceGraph3D
  nodeLabel={node => node.name}
  nodeThreeObjectExtend={true}
  // 標籤樣式透過 CSS 注入
/>
```

對應 CSS：
```css
.graph-node-label {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #e8eaf6;        /* colors.text.primary */
  background: transparent;
  pointer-events: none;
  white-space: nowrap;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);  /* 確保深空背景可讀 */
}
```

#### 方案 B：CSS2DRenderer 自訂標籤

```javascript
// 建立標籤 DOM
const labelDiv = document.createElement('div')
labelDiv.style.fontFamily = "'Inter', sans-serif"
labelDiv.style.fontSize = '12px'
labelDiv.style.fontWeight = '500'
labelDiv.style.color = '#e8eaf6'            // colors.text.primary
labelDiv.style.pointerEvents = 'none'
labelDiv.style.userSelect = 'none'
labelDiv.textContent = node.name

const label = new CSS2DObject(labelDiv)
// 標籤位置：球體正下方
label.position.set(0, -(radius + 2), 0)    // Y 軸偏移 = -(radius + 2)
sphere.add(label)
```

| 屬性 | 規格 |
|------|------|
| 字體 | `'Inter', sans-serif` |
| 字號 | 12px |
| 字重 | 500（Medium） |
| 顏色 | `#e8eaf6`（`colors.text.primary`） |
| 位置 | 球體正下方，Y offset = -(radius + 2) |
| 可見性（Faded 態） | `opacity: 0`（隱藏標籤） |
| 可見性（Hover 態） | `opacity: 1`（始終顯示） |

---

## 第 2 章：3D 邊線外觀

### 2.1 邊線材質（LineBasicMaterial）

```javascript
// Import 邊 — Normal 態
const importLineMaterial = new THREE.LineBasicMaterial({
  color: new THREE.Color('#00cc66'),   // colors.neon.green.DEFAULT
  transparent: true,
  opacity: 0.5,
  // 注意：WebGL 的 linewidth 在大多數平台（Windows/Linux）最大有效值為 1
  // Three.js linewidth 設定無效，實際渲染均為 1px
})

// Import 邊 — Hover 高亮態
const importLineHoverMaterial = new THREE.LineBasicMaterial({
  color: new THREE.Color('#00ff88'),   // colors.neon.green.bright
  transparent: true,
  opacity: 1.0,
})

// 淡化邊 — Faded 態
const importLineFadedMaterial = new THREE.LineBasicMaterial({
  color: new THREE.Color('#00cc66'),   // colors.neon.green.DEFAULT
  transparent: true,
  opacity: 0.06,
})
```

#### 邊線四態規格

| 狀態 | 顏色 | opacity | 備註 |
|------|------|---------|------|
| Normal | `#00cc66` | 0.5 | 標準 import 邊 |
| Hover（相關邊） | `#00ff88` | 1.0 | 被 hover 節點的入邊/出邊 |
| Active | `#00ff88` | 1.0 | 同 Hover 高亮 |
| Faded（非相關邊） | `#00cc66` | 0.06 | 幾乎不可見 |

#### 邊線粗細替代方案（超越 WebGL linewidth 限制）

WebGL 規範在 Windows/Linux 上 `linewidth > 1` 無效。若需視覺上更粗的邊線，採用以下替代方案：

**方案 A：MeshLine 函式庫**
```javascript
// 引入 meshline（npm install meshline）
import { MeshLine, MeshLineMaterial } from 'meshline'

const line = new MeshLine()
line.setPoints(pointsArray)

const material = new MeshLineMaterial({
  color: new THREE.Color('#00cc66'),
  opacity: 0.5,
  lineWidth: 0.002,   // 比例值，相對於視窗尺寸
  transparent: true,
})
```

**方案 B：自訂 TubeGeometry**
```javascript
const curve = new THREE.CatmullRomCurve3([startVec, endVec])
const tubeGeometry = new THREE.TubeGeometry(
  curve,
  8,     // tubularSegments
  0.3,   // radius（視覺粗細）
  6,     // radialSegments
  false
)
```

> 推薦：優先嘗試 MeshLine，效能優於 TubeGeometry。

---

### 2.2 箭頭設定（3d-force-graph API）

```javascript
<ForceGraph3D
  linkDirectionalArrowLength={4}
  linkDirectionalArrowRelPos={1}        // 1 = 箭頭在 target 端
  linkDirectionalArrowColor={link => {
    if (link.__isHovered) return '#00ff88'   // colors.neon.green.bright
    return '#00cc66'                          // colors.neon.green.DEFAULT
  }}
/>
```

| 屬性 | 值 | 說明 |
|------|----|------|
| `linkDirectionalArrowLength` | 4 | 箭頭長度 |
| `linkDirectionalArrowRelPos` | 1 | 1 = target 端，0 = source 端 |
| arrowColor Normal | `#00cc66` | 跟隨邊線色 |
| arrowColor Hover | `#00ff88` | 跟隨邊線高亮色 |

---

## 第 3 章：3D 背景

### 3.1 背景色

```javascript
// scene 背景色
scene.background = new THREE.Color('#050510')
// 新增色碼：#050510，比 2D bg-base(#0a0a0f) 更深 50%，強化深空感
```

### 3.2 指數霧效（可選）

```javascript
// FogExp2 使遠處節點自然淡出，強化空間縱深感
scene.fog = new THREE.FogExp2(
  '#050510',  // 霧的顏色與背景一致
  0.002       // 密度（0.002 = 距離約 500 單位時完全消失）
)
```

> 效能備注：`FogExp2` 在頂點著色器中計算，效能開銷極低，建議保留。若使用者反映霧效造成遠處節點無法點選，可調降密度至 0.001 或關閉。

### 3.3 光源配置

```javascript
// 1. 環境光（AmbientLight）— 提供基礎可見度，防止陰影面完全純黑
const ambientLight = new THREE.AmbientLight(
  '#1a1a2e',  // colors.bg.overlay — 微弱冷藍調
  0.4         // intensity
)
scene.add(ambientLight)

// 2. Cyan 點光源 — 模擬主要霓虹光源
const cyanPointLight = new THREE.PointLight(
  '#00d4ff',  // colors.neon.cyan.DEFAULT
  0.6,        // intensity
  0           // distance（0 = 無衰減限制）
)
cyanPointLight.position.set(100, 100, 100)
scene.add(cyanPointLight)

// 3. Magenta 點光源 — 補充輔助光，製造 Cyan/Magenta 雙色光影
const magentaPointLight = new THREE.PointLight(
  '#bd00ff',  // colors.neon.magenta.DEFAULT
  0.4,        // intensity
  0
)
magentaPointLight.position.set(-100, -50, -100)
scene.add(magentaPointLight)
```

#### 光源規格彙整

| 光源 | 類型 | 顏色 | Intensity | Position |
|------|------|------|-----------|----------|
| 環境光 | `AmbientLight` | `#1a1a2e` | 0.4 | — |
| Cyan 點光源 | `PointLight` | `#00d4ff` | 0.6 | (100, 100, 100) |
| Magenta 點光源 | `PointLight` | `#bd00ff` | 0.4 | (-100, -50, -100) |

### 3.4 不加星空粒子

根據 feature-spec F25 明確規定，**不加星空背景粒子**，避免額外 GPU 負擔。空曠的深空背景（#050510）已足夠強調節點的存在感。

---

## 第 4 章：3D Hover 效果

### 4.1 設計原則

對照 Sprint 2 的 2D Hover 邏輯，3D Hover 效果在三維空間中同樣遵循：
- **焦點節點高亮**：放大 + 提升 emissiveIntensity + 加強 glow
- **相關邊高亮**：入邊/出邊 opacity 提升，粒子加速
- **上下游節點弱高亮**：emissiveIntensity 提升到中等值
- **無關節點/邊淡化**：opacity 降到接近不可見

### 4.2 各元素 Hover 狀態規格

#### Hover 節點本身

```javascript
// onNodeHover callback 中（3d-force-graph 內建 raycaster 偵測）
graphInstance.onNodeHover(hoveredNode => {
  if (hoveredNode) {
    // 球體 scale 放大
    hoveredNode.__threeObj.scale.setScalar(1.5)

    // emissiveIntensity 提升
    hoveredNode.__threeObj.material.emissiveIntensity = 1.2

    // glow sprite opacity 提升
    hoveredNode.__glowSprite.material.opacity = 0.5
  }
})
```

| 屬性 | Normal | Hover |
|------|--------|-------|
| scale | 1.0 | 1.5x |
| emissiveIntensity（file） | 0.6 | 1.2 |
| emissiveIntensity（directory） | 0.6 | 1.2 |
| glow sprite opacity | 0.3 | 0.5 |

#### 相關入邊 / 出邊

| 屬性 | Normal | Hover 時相關邊 |
|------|--------|---------------|
| 邊線 opacity | 0.5 | 1.0 |
| 邊線顏色 | `#00cc66` | `#00ff88` |
| 粒子速度倍數 | 1.0x | 1.5x（`linkDirectionalParticleSpeed × 1.5`） |

#### 上下游節點（直接相鄰，非 hover 目標）

| 屬性 | Normal | 上下游弱高亮 |
|------|--------|------------|
| emissiveIntensity | 0.6 | 0.8 |
| opacity | 0.9 | 0.9 |
| scale | 1.0 | 1.0（不放大） |

#### 無關節點

| 屬性 | Normal | Faded |
|------|--------|-------|
| opacity | 0.9 | 0.1 |
| emissiveIntensity | 0.6 | 0.1 |
| glow sprite opacity | 0.3 | 0.0 |
| 標籤 opacity | 1.0 | 0.0 |

#### 無關邊

| 屬性 | Normal | Faded |
|------|--------|-------|
| opacity | 0.5 | 0.06 |

### 4.3 過渡動畫

```javascript
// 使用 @tweenjs/tween.js（3d-force-graph 依賴中已包含）
import TWEEN from '@tweenjs/tween.js'

function tweenNodeOpacity(mesh, targetOpacity, duration = 150) {
  new TWEEN.Tween({ opacity: mesh.material.opacity })
    .to({ opacity: targetOpacity }, duration)
    .easing(TWEEN.Easing.Quadratic.Out)
    .onUpdate(({ opacity }) => {
      mesh.material.opacity = opacity
    })
    .start()
}

function tweenNodeScale(mesh, targetScale, duration = 150) {
  new TWEEN.Tween({ s: mesh.scale.x })
    .to({ s: targetScale }, duration)
    .easing(TWEEN.Easing.Quadratic.Out)
    .onUpdate(({ s }) => {
      mesh.scale.setScalar(s)
    })
    .start()
}
```

| 過渡類型 | 時間 | Easing |
|---------|------|--------|
| 節點 scale 放大 | 150ms | Quadratic.Out |
| 節點 opacity 淡化 | 150ms | Quadratic.Out |
| 邊線 opacity 變化 | 150ms | Quadratic.Out |
| 恢復（hover 離開） | 300ms | Quadratic.Out |

### 4.4 Hover 偵測

```javascript
// 使用 3d-force-graph 內建 onNodeHover（基於 THREE.Raycaster）
// 響應時間要求：< 100ms（feature-spec F27 規定）

graphInstance
  .onNodeHover((node, prevNode) => {
    // node: 當前 hover 的節點（null = 無 hover）
    // prevNode: 上一個 hover 的節點
    updateHoverState(node, prevNode)
  })
  .onLinkHover((link, prevLink) => {
    updateLinkHoverState(link, prevLink)
  })
```

> 效能要求：hover 回調中的所有操作必須在單一 frame（< 16ms）內完成。如果節點數量大，使用 `Map` 快取節點物件引用，避免每次回調重新遍歷節點陣列。

---

## 第 5 章：2D/3D 切換按鈕

### 5.1 位置與布局

```
[ Toolbar ]
  [zoom-in] [zoom-out] [fit] | [toggle-2d-3d]
                             ↑
                        divider 分隔線
                        位於 zoom +/- 右側
```

- 位置：Toolbar 最右側，以 `1px solid rgba(255,255,255,0.08)` 的 divider 與 zoom 按鈕群分隔
- 尺寸：32px × 32px（與現有 Toolbar 按鈕完全一致）

### 5.2 圖示規格

| 當前模式 | 按鈕顯示 | 語意 |
|---------|---------|------|
| 2D 模式 | `3D` 文字或立方體 icon | 「點擊切換到 3D」 |
| 3D 模式 | `2D` 文字或平面 icon | 「點擊切換到 2D」 |

文字方案（無 icon 函式庫依賴時）：
```css
.btn-toggle-3d .label {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
```

### 5.3 顏色狀態

延續 Toolbar 按鈕規範（`design/sprint2-theme-draft.ts` > `canvas.toolbar.button`）：

| 狀態 | icon/文字色 | 背景色 |
|------|------------|-------|
| Normal | `#9e9ec8`（`colors.text.secondary`） | 透明 |
| Hover | `#e8eaf6`（`colors.text.primary`） | `rgba(255,255,255,0.06)` |
| Active（當前 3D 模式） | `#00d4ff`（`colors.primary.DEFAULT`） | `rgba(0,212,255,0.10)`（`colors.primary.ghost`） |

```css
/* Normal */
.btn-toggle-dimension {
  color: #9e9ec8;
  background: transparent;
  border-radius: 6px;
  transition: color 150ms ease-out, background 150ms ease-out;
}

/* Hover */
.btn-toggle-dimension:hover {
  color: #e8eaf6;
  background: rgba(255, 255, 255, 0.06);
}

/* Active — 當前處於 3D 模式時按鈕呈 active 態 */
.btn-toggle-dimension.is-3d-active {
  color: #00d4ff;
  background: rgba(0, 212, 255, 0.10);
}
```

### 5.4 切換過渡動畫

```javascript
// 切換邏輯
async function toggleDimension() {
  // 1. 淡出畫布（300ms）
  await fadeCanvas({ opacity: 0, duration: 300 })

  // 2. 切換模式
  setMode(currentMode === '2d' ? '3d' : '2d')

  // 3. 淡入畫布（300ms）
  await fadeCanvas({ opacity: 1, duration: 300 })
}
```

| 動畫階段 | 時間 | 說明 |
|---------|------|------|
| fade out | 300ms | 舊視圖透明度 1 → 0 |
| 模式切換 | ~0ms | React state 更新，DOM 交換 |
| fade in | 300ms | 新視圖透明度 0 → 1 |
| 總時間 | ~600ms | 使用者感知流暢切換 |

### 5.5 Tooltip

```javascript
// hover 時顯示 tooltip
// 在 2D 模式下（按鈕顯示「3D」）
tooltipText = "Switch to 3D"

// 在 3D 模式下（按鈕顯示「2D」）
tooltipText = "Switch to 2D"
```

Tooltip 樣式延續既有 Toolbar tooltip 規範（背景 `colors.bg.overlay` = `#1a1a2e`，文字 `colors.text.primary` = `#e8eaf6`）。

---

## 第 6 章：3D 粒子流動

### 6.1 API 設定

使用 3d-force-graph 的 `linkDirectionalParticles` 系列 API（內建於 three-forcegraph，底層為 Three.js Points）：

```javascript
<ForceGraph3D
  linkDirectionalParticles={4}
  // 每條邊 4 個粒子

  linkDirectionalParticleWidth={1.5}
  // 粒子視覺大小（three-forcegraph 單位）

  linkDirectionalParticleSpeed={0.006}
  // 粒子速度：每 frame 移動的比例（0.006 ≈ 約 2-3 秒走完一條邊）

  linkDirectionalParticleColor={link => {
    if (link.__isHovered) return '#00ff88'  // colors.neon.green.bright
    return '#00ff88'                         // 統一使用 bright 色
  }}
/>
```

### 6.2 粒子規格

| 屬性 | 值 | 來源 |
|------|-----|------|
| 每條邊粒子數 | 4 | — |
| 粒子大小 (`linkDirectionalParticleWidth`) | 1.5 | — |
| 粒子速度 Normal | 0.006 per frame | ≈ 2-3 秒/條邊 |
| 粒子速度 Hover | 0.009 per frame | Normal × 1.5 |
| 粒子顏色 | `#00ff88` | `colors.neon.green.bright`（延續 Sprint 2 粒子色） |
| 粒子 opacity Normal | 0.4 | — |
| 粒子 opacity Hover 相關邊 | 0.85 | 延續 Sprint 2 `particleFlow.opacityPeak` |

### 6.3 Hover 時粒子速度動態調整

3d-force-graph 的 `linkDirectionalParticleSpeed` 支援 function 形式：

```javascript
linkDirectionalParticleSpeed={link => {
  if (link.__isHovered || link.__isAdjacentToHovered) {
    return 0.009  // 0.006 × 1.5
  }
  return 0.006
}}
```

### 6.4 效能降級

```javascript
// 節點數量偵測
const nodeCount = graphData.nodes.length

// 效能降級：節點 > 200 時關閉粒子
const particleCount = nodeCount > 200 ? 0 : 4

<ForceGraph3D
  linkDirectionalParticles={particleCount}
  // ...
/>
```

| 條件 | 粒子數 | 說明 |
|------|--------|------|
| 節點 ≤ 200 | 4 | 正常粒子效果 |
| 節點 > 200 | 0 | 關閉粒子，保留邊線 |

### 6.5 prefers-reduced-motion

```javascript
const prefersReducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

<ForceGraph3D
  linkDirectionalParticles={prefersReducedMotion ? 0 : particleCount}
  // 響應系統無障礙設定
/>
```

---

## 第 7 章：相機預設視角

### 7.1 視角定義

使用 3d-force-graph 的 `cameraPosition(position, lookAt, transitionDuration)` API：

```javascript
// API 簽名
graphInstance.cameraPosition(
  { x, y, z },      // 相機位置
  { x, y, z },      // lookAt 目標點
  500               // 切換動畫時間（ms）
)
```

### 7.2 預設視角規格

| 視角名稱 | 快捷鍵 | 相機位置 (x, y, z) | lookAt | 說明 |
|---------|--------|-------------------|--------|------|
| 預設 (Default) | `0` | (0, 0, 300) | (0, 0, 0) | 正面角度，初始載入視角 |
| 俯瞰 (Top-down) | `1` | (0, 300, 0) | (0, 0, 0) | 從正上方俯視整個圖譜 |
| 側視 (Side-view) | `2` | (300, 50, 0) | (0, 0, 0) | 水平角度，清楚看到 Y 軸分層高低差 |
| 聚焦核心 (Focus-core) | `3` | 動態計算 | 動態計算 | 飛到依賴最密集的核心模組前方 |

### 7.3 切換實作

```javascript
// 預設視角對照表
const CAMERA_PRESETS = {
  default: {
    position: { x: 0, y: 0, z: 300 },
    lookAt: { x: 0, y: 0, z: 0 },
  },
  topDown: {
    position: { x: 0, y: 300, z: 0 },
    lookAt: { x: 0, y: 0, z: 0 },
  },
  sideView: {
    position: { x: 300, y: 50, z: 0 },
    lookAt: { x: 0, y: 0, z: 0 },
  },
}

// 聚焦核心（Focus-core）— 動態計算
function focusCore(graphData, graphInstance) {
  // 找出 dependencyCount 最高的節點
  const coreNode = graphData.nodes.reduce((max, node) =>
    (node.dependencyCount ?? 0) > (max.dependencyCount ?? 0) ? node : max
  )

  const nodePos = {
    x: coreNode.x ?? 0,
    y: coreNode.y ?? 0,
    z: coreNode.z ?? 0,
  }

  graphInstance.cameraPosition(
    { x: nodePos.x + 80, y: nodePos.y + 40, z: nodePos.z + 80 },
    nodePos,
    500  // 500ms tween
  )
}

// 快捷鍵綁定
document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case '0':
      graphInstance.cameraPosition(
        CAMERA_PRESETS.default.position,
        CAMERA_PRESETS.default.lookAt,
        500
      )
      break
    case '1':
      graphInstance.cameraPosition(
        CAMERA_PRESETS.topDown.position,
        CAMERA_PRESETS.topDown.lookAt,
        500
      )
      break
    case '2':
      graphInstance.cameraPosition(
        CAMERA_PRESETS.sideView.position,
        CAMERA_PRESETS.sideView.lookAt,
        500
      )
      break
    case '3':
      focusCore(graphData, graphInstance)
      break
  }
})
```

### 7.4 切換動畫規格

| 屬性 | 值 |
|------|-----|
| 動畫時間 | 500ms |
| Easing | easeInOut（three-forcegraph 內建） |
| 切換時是否重置 simulation | 否（`numDimensions` 不重設） |

---

## 第 8 章：3D 節點分層

### 8.1 設計理念

將目錄深度（depth）映射到 3D 空間的 Y 軸，讓使用者在「側視（Side-view）」模式下能直觀感知到目錄層級結構的「高低差」。根目錄在最底層，越深的目錄越高。

### 8.2 Y 軸映射規則

| 目錄深度 | Y 值 | 範例路徑 |
|---------|------|---------|
| depth = 0 | 0 | 根目錄（`/`） |
| depth = 1 | 40 | `packages/` |
| depth = 2 | 80 | `packages/core/` |
| depth = 3 | 120 | `packages/core/src/` |
| depth = n | n × 40 | 通用公式 |

> Y 間距常數 = 40（可調整，建議範圍 30-60）。

### 8.3 3d-force-graph 實作

使用 `d3Force` 配置，對 Y 軸施加弱約束力（forceY）：

```javascript
graphInstance
  .d3Force('y-layer',
    d3.forceY(d => (d.depth ?? 0) * 40).strength(0.3)
  )
```

| 參數 | 值 | 說明 |
|------|----|------|
| Y 目標值 | `depth × 40` | depth 來自 Graph JSON 的 `node.depth` 欄位 |
| strength | 0.3 | 弱約束：視覺引導但不阻止力導向（force-directed）自由微調 |

> strength 選擇邏輯：
> - strength = 1.0：節點被固定在精確 Y 值，喪失 3D 力導向的自然感
> - strength = 0.3：足夠讓同 depth 節點聚集在相近 Y 層，同時保留 X/Z 平面的自由分布

### 8.4 file 節點的分層

file 節點的 `depth` 值等同其所在目錄的深度。範例：

| 節點 | depth | Y 值 |
|------|-------|------|
| `packages/core/src/index.ts`（file） | 3 | 120 |
| `packages/core/src/`（directory） | 3 | 120 |
| `packages/core/`（directory） | 2 | 80 |
| `packages/`（directory） | 1 | 40 |

同目錄的 file 節點因 Y 目標相同而自然聚集在同一水平層，directory 節點漂浮在其子節點正下方（或相近位置）。

### 8.5 效能考量

`forceY` 在每個 simulation tick 計算，與其他力（`forceLink`、`forceManyBody`、`forceCenter`）並行，不增加顯著計算量。

---

## 驗收自查

- [x] 設計稿含所有 3D 視覺元素規格（節點、邊線、背景、Hover、按鈕、粒子、相機、分層）
- [x] 色彩引用 Sprint 2 theme.ts 色系（Cyan / Magenta / Green），唯一新增色碼 `#050510` 已標明
- [x] 含 Three.js material 參數（`MeshStandardMaterial`、`emissive`、`emissiveIntensity`、`SpriteMaterial`、`AdditiveBlending`）
- [x] 含 3D Hover / Active / Faded 四態規格（節點、邊線、sprite 各別定義）
- [x] 含 2D/3D 切換按鈕設計（位置、尺寸、顏色四態、過渡動畫、tooltip）
- [x] 含相機預設視角規格（4 個預設、快捷鍵、動態核心聚焦）
- [x] 含粒子流動規格（速度、數量、顏色、Hover 加速、效能降級、prefers-reduced-motion）
- [x] 含 3D 節點分層規格（Y 軸映射、forceY strength、file/directory 一致對待）
- [x] 所有 Three.js 參數使用完整 API 格式（可直接抄寫到程式碼）
- [x] 效能降級方案：每個視覺元素均有降級說明
- [x] WebGL linewidth 限制已標明，並提供 MeshLine 替代方案

---

## 附錄：色彩來源核對表

確認所有色碼均可在 `design/sprint2-theme-draft.ts` 中找到：

| 本文件使用 hex | theme.ts 來源 | 用途 |
|--------------|--------------|------|
| `#0f0f1a` | `colors.bg.surface` | 球體底色 |
| `#1a1a2e` | `colors.bg.overlay` | AmbientLight |
| `#00d4ff` | `colors.neon.cyan.DEFAULT` / `colors.primary.DEFAULT` | file emissive、Cyan 點光源 |
| `#00ffff` | `colors.neon.cyan.bright` | file Active emissive |
| `#bd00ff` | `colors.neon.magenta.DEFAULT` / `colors.secondary.DEFAULT` | directory emissive、Magenta 點光源 |
| `#ff00ff` | `colors.neon.magenta.bright` | directory Active emissive |
| `#00cc66` | `colors.neon.green.DEFAULT` / `colors.edge.import` | import 邊線色 |
| `#00ff88` | `colors.neon.green.bright` / `colors.edge.importHover` | Hover 高亮邊、粒子色 |
| `#e8eaf6` | `colors.text.primary` | 節點標籤色 |
| `#9e9ec8` | `colors.text.secondary` | Toolbar Normal icon |
| `#ff8800` | `colors.neon.amber.DEFAULT` / `colors.edge.warning` | 警告邊 |
| `#050510` | **（新增）** | 3D 深空背景色、FogExp2 色 |

---

*文件產出者: brand-guardian | 任務: T2 | Sprint: 4 | 日期: 2026-03-31*
