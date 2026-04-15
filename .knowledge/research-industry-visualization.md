# 業界程式碼視覺化調研報告

> **版本**: v1.0
> **日期**: 2026-04-01
> **撰寫**: trend-researcher (Market Analyst Agent)
> **目的**: 調研業界「程式碼架構視覺化」與「資料流呈現」的主流工具與設計趨勢，為 CodeAtlas 後續 Sprint 提供參考依據

---

## 摘要

本報告涵蓋五大方向：程式碼架構視覺化工具、資料流視覺化手法、3D 圖譜呈現、UX 最佳實踐、以及與 CodeAtlas 定位最接近的競品分析。核心結論如下：

1. **業界大多數工具停留在靜態圖表**，缺乏動態互動和視覺衝擊力，這正是 CodeAtlas 的差異化空間。
2. **資料流視覺化是未被充分開發的領域**，大多數工具只做「依賴圖」而非「資料旅程」。
3. **3D 呈現仍是少數工具在用的前沿技術**，目前尚無一個工具做到「3D + local-first + 5 分鐘理解」的組合。

---

## 一、程式碼架構視覺化工具

### 1.1 CodeScene

**網站**: https://codescene.com
**定位**: 企業級程式碼健康度與架構分析平台（SaaS）

**視覺化手法**:
- 使用 **圓形填充圖（Zoomable Circle Packing）** 呈現模組層次結構，外圈是目錄，內圈是檔案
- 以 **熱力圖（Heatmap）** 疊加在圖形上，紅色代表高技術債、高複雜度、高頻修改的檔案
- **X-Ray 功能**：進入函式層級，顯示函式內部複雜度分佈，函式越紅越複雜
- 依賴視圖使用 **矩陣圖（Dependency Matrix）** 和 **弦圖（Chord Diagram）** 呈現模組間耦合

**節點過多的處理**:
- 依層級漸進展開（目錄 > 子目錄 > 檔案），預設只展開兩層
- 圓形填充自動按面積比例縮放，小檔案在視覺上自然被壓縮
- 提供「Hot Spots 過濾器」，只顯示高技術債節點

**智慧篩選機制**:
- **Change Coupling 分析**：自動找出「哪些檔案總是一起被修改」，形成邏輯群組
- **Team Responsibility Map**：按貢獻者自動分群，顯示誰負責哪些模組
- **Trend 篩選**：只顯示近 30/90/180 天有變動的部分

**截圖/參考**:
- 官網 product 頁面有完整截圖展示
- https://codescene.com/blog/software-architecture-visualization/
- YouTube: "CodeScene Architecture Analysis Demo"（搜尋可找到官方影片）

**與 CodeAtlas 的差距**:
- CodeScene 是 SaaS + 需要 Git 連接，程式碼需上傳
- 視覺風格偏向分析工具（灰/紅配色），不是「炫酷展示」
- 沒有 3D，沒有資料流動畫

---

### 1.2 Sourcetrail（已停止維護，2021 年開源）

**GitHub**: https://github.com/CoatiSoftware/Sourcetrail
**定位**: 桌面端程式碼探索工具，支援 C/C++/Python/Java

**視覺化手法**:
- **三欄佈局**：左側節點列表 + 中間互動圖譜 + 右側原始碼同步高亮
- 圖譜使用 **橢圓節點 + 分層佈局**，選中節點後展開直接相關的依賴和被依賴節點
- **同心圓擴散呈現**：選中節點在中央，第一層依賴在內圈，第二層在外圈
- 邊的類型（繼承、呼叫、使用）用不同顏色和線型區分

**節點過多的處理**:
- **聚焦模式（Focus Mode）**：只展示當前選中節點的直接關係，其餘隱藏
- 支援「Node Bundling」：同目錄的多個類別可折疊為一個群組節點
- 提供滾輪縮放 + 搜尋定位

**智慧篩選**:
- 可按「只顯示直接依賴」或「顯示所有傳遞依賴」切換
- 支援按符號類型過濾（class / function / variable）
- 原始碼視窗與圖譜雙向同步，點圖譜跳程式碼，點程式碼亮圖譜

**優缺點**:
- 優點：免費開源，原始碼同步是殺手功能，工程師很愛
- 缺點：已不再維護（2021），UI 過時，無 Web 模式，安裝複雜，無動畫
- 學習點：**圖譜與原始碼雙向同步** 是非常有價值的互動模式

**截圖/參考**:
- https://github.com/CoatiSoftware/Sourcetrail（GitHub 首頁有截圖）
- https://www.sourcetrail.com/blog/（舊部落格，有設計說明文章）

---

### 1.3 Understand（SciTools）

**網站**: https://scitools.com
**定位**: 商業級靜態分析工具，深度支援 C/C++/Ada/Fortran 等

**視覺化手法**:
- **Butterfly Graph**：選中一個函式，左側是「呼叫它的人」，右側是「它呼叫的人」，形如蝴蝶展翼
- **Dependency Graph**：矩形節點 + 直線邊，支援有向圖和無向圖切換
- **Treemap**：用面積大小呈現程式碼量，支援多種度量指標疊加
- **UML Class Diagram 自動生成**：從程式碼直接生成 UML，可匯出 SVG/PNG

**節點過多的處理**:
- 提供「Depth Limit」設定：最大展開深度
- 支援「Cluster」功能：同 namespace 的類別自動群組
- 提供圖表縮略圖（MiniMap）供大圖瀏覽

**智慧篩選**:
- 可按 metric 過濾（complexity > N、lines of code > N）
- 提供「Violation Filter」：只顯示違反架構規則的依賴

**截圖/參考**:
- https://scitools.com/features/（官網功能頁）
- YouTube: "SciTools Understand Code Analysis"

---

### 1.4 Dependency Cruiser

**GitHub**: https://github.com/sverweij/dependency-cruiser
**定位**: CLI 工具，分析 JS/TS/CJS/ESM 依賴，輸出 DOT/SVG/JSON

**視覺化手法**:
- 依賴 **Graphviz** 渲染，輸出靜態 SVG 圖
- 節點是檔案/目錄，邊是 import 關係，有向圖
- 支援「folder collapse」：目錄層級折疊為單一節點
- 顏色規則可自訂：違反規則的依賴顯示為紅色

**節點過多的處理**:
- 提供 `--max-depth` 參數限制展開層數
- 支援 `--focus` 和 `--reaches` 過濾：只輸出「以某節點為起點/終點」的子圖
- Graphviz 的 `rankdir` 支援橫向/縱向佈局切換

**智慧篩選**:
- **Rule Engine**：可設定「A 不得依賴 B」等規則，違反時 CI 中斷並標紅
- `--include-only` / `--exclude` 正規表示式過濾
- 輸出類型包含 `dot`、`svg`、`html`、`json`、`csv`

**核心價值**:
- 最輕量的 JS/TS 依賴分析工具，可直接整合 CI
- Rule-as-code：架構規則寫成 JSON config，自動驗證

**截圖/參考**:
- https://github.com/sverweij/dependency-cruiser（README 有大量截圖）
- https://github.com/sverweij/dependency-cruiser/blob/main/doc/options-reference.md

---

### 1.5 Madge

**GitHub**: https://github.com/pahen/madge
**定位**: 輕量 CLI，生成 JS/TS 模組依賴圖

**視覺化手法**:
- 依賴 **Graphviz** 或 **d3-graphviz** 輸出 SVG/PNG
- 簡單有向圖，無特殊視覺處理
- 可偵測循環依賴並標紅

**核心特點**:
- 超輕量，安裝即用
- 可以輸出循環依賴清單（`madge --circular`）
- 整合 CI 時常用，判斷是否有不當循環依賴

**截圖/參考**:
- https://github.com/pahen/madge（README 有 demo GIF）

---

### 1.6 整體比較表

| 工具 | 視覺效果 | 互動性 | 資料流 | 3D | Local-first | 免費 |
|------|---------|--------|--------|-----|-------------|------|
| CodeScene | 高（熱力圖） | 中 | 否 | 否 | 否（SaaS） | 付費 |
| Sourcetrail | 中 | 高 | 否 | 否 | 是（桌面） | 開源 |
| Understand | 中 | 高 | 部分 | 否 | 是（桌面） | 付費 |
| Dependency Cruiser | 低（靜態圖） | 否 | 否 | 否 | 是（CLI） | 開源 |
| Madge | 低（靜態圖） | 否 | 否 | 否 | 是（CLI） | 開源 |
| **CodeAtlas** | **最高（3D + 動畫）** | **最高** | **是** | **是** | **是（CLI+Web）** | **開源** |

---

## 二、資料流視覺化

### 2.1 業界呈現資料路徑的主流方式

#### Sankey Diagram（桑基圖）

**原理**: 節點代表處理階段，連接帶的寬度代表流量大小
**適用場景**: 呈現資料在系統各層之間的流量分佈
**工具**: D3.js `d3-sankey`、Observable Plot、Plotly

**視覺特徵**:
- 橫向流動（左到右），節點垂直排列
- 連接帶顏色通常繼承來源節點顏色
- 越粗的帶表示越大的流量

**程式碼架構應用**:
- Netflix 用 Sankey 呈現 API Gateway 的流量分配
- 適合呈現「哪個模組接收最多資料流」

**截圖/參考**:
- https://observablehq.com/@d3/sankey（D3 官方範例）
- https://d3-graph-gallery.com/sankey.html

---

#### Flow Diagram（流程圖）

**原理**: 有向圖，節點是處理步驟，邊是資料流向
**工具**: Mermaid.js、draw.io、Lucidchart、React Flow

**在程式碼工具中的應用**:
- **AWS Application Composer**：視覺化 Lambda 函式之間的資料流，節點是函式，邊是觸發關係
- **Prefect / Airflow UI**：DAG（有向無環圖）視覺化資料管道，支援即時執行狀態高亮

**視覺設計**:
- 節點通常是矩形（處理）或菱形（決策）
- 邊上標示傳遞的資料類型
- 執行中的節點以動畫（旋轉、發光）表示

---

#### Sequence Diagram（時序圖）

**原理**: 橫軸是時間，縱軸是參與者，箭頭是互動消息
**工具**: Mermaid.js、PlantUML、Structurizr

**在程式碼工具中的應用**:
- **Jaeger / Zipkin**（分散式追蹤）：呈現一個請求在多個服務之間的時序
- 視覺化「一個 HTTP request 如何流過 middleware → controller → service → DB」

**視覺特徵**:
- 垂直生命線（lifeline）表示各模組
- 水平箭頭表示呼叫方向
- 可疊加時間軸和延遲標示

---

#### Path Tracing（路徑追蹤高亮）—— 最適合 CodeAtlas 的模式

**原理**: 在圖譜中，選中某節點或邊後，整條傳遞路徑以高亮動畫顯示
**業界案例**:

**Datadog Service Map**:
- 選中服務 → 所有上游/下游服務亮起
- 紅色邊表示有 error，黃色表示高延遲
- 路徑追蹤時其他節點 fade out（透明度降低）

**AWS X-Ray Trace Map**:
- 圓形節點（服務）+ 有向邊（呼叫關係）
- 點一個 trace → 整條呼叫鏈從左到右逐步高亮
- 每個節點顯示 latency、error rate

**Neo4j Bloom（Graph Database UI）**:
- 路徑查詢後整條路徑以彩色高亮
- 非路徑節點 dim（灰色）
- 路徑節點有脈衝動畫（pulse animation）

**截圖/參考**:
- https://www.datadoghq.com/product/service-map/
- https://aws.amazon.com/xray/
- https://neo4j.com/product/bloom/

---

### 2.2 動畫效果業界做法

#### 粒子流動（Particle Flow）

**最佳實踐工具**: Grafana Node Graph Panel、AWS Console

**技術實現**:
```
方式 1（Canvas API）: requestAnimationFrame，粒子沿貝塞爾曲線移動
方式 2（SVG + CSS）: stroke-dashoffset 動畫，模擬線條流動
方式 3（Three.js）: BufferGeometry + Points，3D 粒子系統
方式 4（React Flow）: 自訂 Edge 組件 + CSS animation
```

**視覺設計要點**:
- 粒子大小 2-4px，透明度 0.6-0.8
- 速度根據「流量大小」動態調整（流量大 = 粒子快 = 粒子密）
- 顏色跟隨來源節點的主題色

**現有業界案例**:
- Grafana 的 Node Graph Panel（https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/node-graph/）：有向邊上的粒子流動，表示流量方向
- n8n 工作流工具：執行時節點間的資料流以動態箭頭呈現

---

#### 漸進高亮（Progressive Highlight）

**Framer Motion 業界做法**:
- `animate={{ opacity: [0.2, 1, 0.2] }}` 創造脈衝效果
- `pathLength` 動畫：邊從 0 到 1 逐漸「畫出來」，引導視覺注意力
- `staggerChildren`：路徑上的節點按順序依次亮起（每個節點延遲 150ms）

**業界案例**:
- GitHub Actions Workflow 視覺化：執行時 step 依序高亮，已完成的變綠
- Linear（專案管理工具）的 Dependency Map：路徑動畫使用 staggered reveal

---

#### 發光效果（Glow / Bloom）

**技術實現**:
```css
/* CSS 做法（適合 2D SVG / React Flow）*/
filter: drop-shadow(0 0 6px #00d4ff) drop-shadow(0 0 12px #00d4ff40);

/* Three.js 做法（適合 3D）*/
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
composer.addPass(new UnrealBloomPass(resolution, strength, radius, threshold))
```

**視覺效果**: 節點和邊線散發霓虹光，層次感強，深色背景下效果最佳

**業界工具使用 Bloom 的案例**:
- Blender 的 Shader Editor（深色 + neon 邊線）
- Unreal Engine 的 Blueprint Editor（節點連接線有發光效果）
- Obsidian（知識圖譜）的 Canvas + 部分主題插件使用發光邊

---

## 三、3D 圖譜呈現

### 3.1 使用 3D 呈現程式碼結構的工具

#### gource（版本控制視覺化）

**官網**: https://gource.io
**定位**: 將 Git commit 歷史動態渲染成 3D 太陽系風格動畫

**視覺手法**:
- 根目錄在中央，子目錄向外放射，檔案是最外層的點
- 提交者以小人形象在樹狀結構上移動，修改哪個檔案就移動到哪
- 完全 3D 空間，可旋轉、縮放、時間軸快進
- 深色背景 + 彩色節點 + 粒子光效，視覺衝擊力極強

**截圖/參考**:
- https://gource.io（官網首頁有 GIF 展示）
- YouTube: "gource visualization" 有大量 demo 影片，效果驚豔
- 注意：gource 是時間軸型，不是靜態架構圖

---

#### Code City / Softwarenaut（代碼城市概念）

**概念來源**: Richard Wettel 的研究論文「Code City」（2008，ICSE），將程式碼結構對應到城市建築
- **類 = 建築物**：高度 = 方法數，底面積 = 屬性數
- **套件/目錄 = 街區**：按層次巢狀
- **顏色 = 複雜度**：紅色 = 高複雜度

**現代實作**:
- **SonarCity**（https://tcard.github.io/SonarCity/）：基於 SonarQube 指標生成 3D 城市圖
- **CodeFlower**：基於 D3 的 2D 放射狀版本
- **Code Park**（VR 版）：Unity 做的 VR 程式碼城市，可以「走進去」探索

**截圖/參考**:
- https://wettel.github.io/codecity.html（原始 Code City 論文和截圖）
- https://github.com/tcard/sonar-city

---

#### 3d-force-graph（CodeAtlas 正在使用的庫）

**GitHub**: https://github.com/vasturiano/3d-force-graph
**技術棧**: Three.js + d3-force-3d

**視覺手法（業界最佳實踐）**:
- **力導向佈局（Force-Directed）**：節點互相排斥，邊互相吸引，自然形成星圖
- **後處理效果（Post-Processing）**：
  - `UnrealBloomPass`：整體發光氛圍
  - `FilmPass`：膠片顆粒感，增加科技感
  - `GlitchPass`：載入動畫時短暫故障效果
- **粒子邊（Particle Edge）**：光點沿邊移動，表示資料流方向

**業界知名 3D 力導向圖案例**:
- **Observable HQ** 的知識圖譜展示
- **Wikipedia Graph Explorer**（https://wikimapper.toolforge.org/）：3D 力導向圖探索維基百科概念關係
- **Kumu**（https://kumu.io）：3D 系統思考圖，深色主題 + 節點發光

---

### 3.2 3D 空間佈局策略

| 策略 | 說明 | 適合場景 | 代表工具 |
|------|------|---------|---------|
| **力導向（Force-Directed）** | 物理模擬，節點自然分散 | 無明顯層次的依賴關係 | CodeAtlas、3d-force-graph |
| **分層佈局（Hierarchical/DAG）** | 根節點在頂，依賴逐層下放 | 有明顯入口點的系統 | Graphviz dot、Elk.js |
| **球狀（Spherical）** | 節點分佈在球面上，按類別分區 | 大量節點的概覽 | WebGL Globe |
| **柱狀/城市（City）** | XY 平面放模組，Z 軸表示指標 | 展示複雜度分佈 | Code City |
| **Galaxy（星系）** | 核心節點在中央，相關節點圍繞 | 展示核心/邊緣關係 | 部分知識圖譜工具 |
| **Grid（網格）** | 節點按矩陣排列，Z 軸表示指標 | 比較分析 | Treemap 的 3D 版 |

**CodeAtlas 目前使用**：力導向，是正確選擇（依賴圖無明確層次）
**Sprint 11 建議補充**：系統框架視角用分層佈局（Hierarchical）

---

### 3.3 業界對 3D vs 2D 的討論

#### 3D 的優勢

1. **視覺衝擊力**：截圖/影片的分享性遠高於 2D，「第一眼」效果是 2D 的數倍
2. **空間利用率**：相同螢幕空間可以呈現更多節點，Z 軸是額外維度
3. **認知區分**：前後景深自然分離重要/次要節點
4. **旋轉探索**：從不同角度看同一個系統，可能發現 2D 中被遮蔽的模式
5. **展示場景**：Demo、簡報、招募工程師，3D 圖有強烈記憶點

#### 3D 的劣勢

1. **遮蔽問題（Occlusion）**：節點可能被其他節點遮擋，需要旋轉才能看清
2. **標籤可讀性**：3D 空間中文字標籤的可讀性比 2D 差，字型大小隨距離縮放
3. **精確互動困難**：點擊 3D 空間中的小節點需要更高精度
4. **學習成本**：不熟悉 3D 導覽（旋轉、縮放、平移）的用戶會有困惑
5. **效能要求**：需要 WebGL，低端設備可能卡頓

#### 業界共識

- **2D 看細節，3D 看全景** —— 這正是 CodeAtlas 的設計哲學
- 大多數工具（Sourcetrail、CodeScene）放棄 3D，選擇深化 2D 互動
- 知識圖譜工具（Obsidian、Roam）提供 2D，但社群插件會加 3D
- **結論：CodeAtlas 的 2D/3D 雙模式策略在業界是差異化優勢**

---

## 四、使用者體驗最佳實踐

### 4.1 大型圖譜互動設計

#### Zoom & Pan（縮放與平移）

**業界標準行為**:
```
滾輪縮放（Ctrl+滾輪 或直接滾輪）
雙指縮放（觸控板）
拖拽平移
雙擊節點：zoom-to-fit 該節點及其鄰居
Ctrl+0 / 按鈕：reset to fit all
```

**MiniMap（縮略導覽）**:
- 右下角固定小縮略圖，顯示當前視窗在全圖中的位置
- 點擊縮略圖可跳轉（React Flow 原生支援）
- 業界標準：寬 200px、高 150px，透明度 0.8

**業界工具參考**:
- **Figma** 的縮略圖 + 縮放是業界黃金標準
- **Miro** 的 Command+滾輪縮放 + 空格拖拽
- **React Flow** 的預設互動已很接近業界標準

---

#### Filter & Search（篩選與搜尋）

**漸進式篩選（Progressive Filtering）**:
1. 搜尋框輸入 → 即時高亮匹配節點（無需按 Enter）
2. 非匹配節點 dim（透明度降至 0.15-0.3）
3. 匹配節點的直接鄰居保持 0.6 透明度（context 保留）
4. 再次搜尋或 Esc 清除 → 恢復全圖顯示

**業界案例**:
- **Obsidian Graph View**：搜尋後非相關節點即時灰化
- **Neo4j Bloom**：多條件篩選（按類型、按屬性），即時更新
- **GitHub Dependency Graph**：按生態系（npm/pip/maven）篩選

**Filter Panel 設計模式**:
- 側邊欄 checkbox 群組，按類型/目錄分類
- 支援「全選/全不選」快速操作
- 顯示每個 filter 項目的節點計數（例如「components/ (24)」）

---

#### Graph Layout Controls

**業界常見佈局選項**:
```
力導向（預設）- 自動分散，適合探索
分層（Top-Down）- 適合有明確入口的系統
分層（Left-Right）- 適合流程型架構
圓形（Circular）- 適合找出循環依賴
網格（Grid）- 適合比較分析
```

**業界工具**:
- **yEd Graph Editor**：最多佈局選項，是佈局算法的業界標竿
- **Elk.js（Eclipse Layout Kernel）**：開源佈局引擎，支援 10+ 算法
- **Cytoscape.js**：Web 端圖譜庫，內建多種佈局，常用於生物資訊和知識圖譜

---

### 4.2 引導使用者理解架構

#### Guided Tour（引導遊覽）

**業界做法**:
- **Shepherd.js / Intro.js**：步驟式高亮 + tooltip 說明
- 第一次使用時自動觸發，5-7 步以內
- 每步高亮相關 UI 元素，背景 overlay

**在圖譜工具中的應用**:
- **Kumu** 的 Guided Tour：選一個起點，系統帶你逐層探索，每步說明這個模組做什麼
- **Lucidchart** 的 Presentation Mode：把圖譜變成投影片，按順序 zoom in 不同區域

**故事化呈現（Storytelling）**:
- **The Narrative Graph**（學術概念）：不是一次性顯示全圖，而是「講故事」
  - 第 1 幕：這個系統有三層（只顯示三個大框）
  - 第 2 幕：前端層包含這些模組（展開前端）
  - 第 3 幕：資料從這裡進入，流向這裡（路徑追蹤動畫）
- 這正是 CodeAtlas Sprint 11「三種故事視角」的設計思路

---

#### 漸進式揭露（Progressive Disclosure）

**設計原則**:
- 預設顯示最高層級概覽（3-7 個主要模組）
- 點擊展開下一層
- 每次只增加 5-10 個節點，避免認知超載

**業界案例**:
- **CodeScene 的 Zoomable Circle Packing**：點擊外圈圓形可展開內部
- **AWS 架構圖**：預設服務群組折疊，點擊展開
- **IntelliJ IDEA 的 Dependency Analyzer**：只顯示直接依賴，點擊展開傳遞依賴

**節點數量建議（來自 UX 研究）**:
- 7±2 法則：人類同時能處理 5-9 個資訊單元
- 圖譜節點：20 個以下無壓力，20-50 需要分組，50+ 必須有策展機制
- **這正是 CodeAtlas Sprint 10「智慧策展」的理論依據**

---

### 4.3 視覺設計趨勢

#### 深色主題（Dark Theme）

**為何是標準**:
- 工程師長時間使用，淺色主題對眼睛刺激大
- 深色背景下圖譜節點的顏色和發光效果對比度最佳
- GitHub、VS Code、Figma 都以深色為預設（或主要選擇）

**深色主題設計規範**:
```
背景：#0a0a0f（近黑，帶藍紫色調）比純黑 #000000 更舒適
主色：#00d4ff（青色/賽博藍）、#7c3aed（紫色）、#ff6b6b（紅色警示）
節點底色：#1a1a2e（比背景略亮）
邊線：rgba(255,255,255,0.2)（白色低透明度）
Hover 高亮：主色 + glow effect
```

---

#### Neon / Cyberpunk 風格

**趨勢來源**:
- 賽博龐克 2077 遊戲（2020）帶動 neon 美學大流行
- 工程師社群對「科技感」有強烈偏好
- GitHub Star 數據：neon 主題的工具 README 截圖更容易在 Twitter/Reddit 獲得關注

**業界採用的工具**:
- **Obsidian** 的 Cybertron 主題（社群最受歡迎主題之一）
- **WezTerm / Kitty** 等終端模擬器的 neon 主題
- **Grafana** 的 GloomX / Midnight 主題

**設計元素**:
- 節點邊框：1-2px，主色，帶 glow
- 邊線：帶方向性的流動效果（dash animation）
- 背景：細微的網格線（grid）或星星點（dots），增加空間感
- 字型：Monospace（JetBrains Mono、Fira Code）

---

#### 玻璃擬態（Glassmorphism）

**在圖譜工具中的應用**:
- Panel/Card 背景：`backdrop-filter: blur(10px)` + 半透明白色/藍色
- 懸浮提示（Tooltip）：磨砂玻璃效果
- 側邊欄：半透明，可透過看到背後的圖譜

**代表工具**: Figma 的部分 UI 元素、Linear 的 Panel 設計

---

#### 空間計算（Spatial Computing）趨勢 — 2025 新方向

**背景**: Apple Vision Pro（2024 發布）帶動空間 UI 設計思潮

**對 CodeAtlas 的啟示**:
- 3D 圖譜在空間計算設備上有天然優勢
- 「空間感」設計：深度感、光影、物理質感
- 雖然 CodeAtlas 目前針對桌面，但設計語言可借鑑 spatial computing 的美學

---

## 五、競品分析

### 5.1 與 CodeAtlas 定位最接近的競品

#### Sourcegraph Code Navigation

**官網**: https://sourcegraph.com
**定位**: 企業級程式碼搜尋 + 程式碼智能，SaaS + 自部署

**相似點**:
- 也做跨檔案的符號（symbol）追蹤
- 也有「Find references」、「Go to definition」
- 也有 AI 輔助（Cody AI）

**差異**:
- Sourcegraph 是搜尋/瀏覽工具，不是視覺化工具，沒有圖譜
- 企業定向，定價昂貴，不適合個人開發者
- 強調「大規模代碼庫搜尋」，CodeAtlas 強調「視覺化理解」

**CodeAtlas 借鑑點**:
- Sourcegraph 的「hover preview」：游標停在 symbol 上自動顯示定義預覽
- 跨 repo 追蹤（未來 Phase 5 可考慮）

---

#### Mermaid.js + Diagram as Code

**GitHub**: https://github.com/mermaid-js/mermaid
**定位**: 文字描述自動生成圖表（流程圖、序列圖、ER 圖、Git 圖等）

**相似點**:
- 輕量、可整合進文件（GitHub README、Notion、Confluence 原生支援）
- 也做依賴圖、流程圖

**差異**:
- Mermaid 是手寫圖表，不是自動從程式碼生成
- 靜態，無動畫，無互動
- 不做 3D

**CodeAtlas 借鑑點**:
- Mermaid 的「Diagram as Code」理念可延伸：未來 CodeAtlas 可以輸出 Mermaid 格式
- 輕量的 sequence diagram 格式適合記錄 API 呼叫鏈

---

#### Nx Graph（Nx Workspace）

**官網**: https://nx.dev/features/explore-graph
**定位**: Monorepo 管理工具 Nx 的依賴圖功能

**視覺化做法**:
- 互動式 Web UI（不是靜態圖），深色主題
- 節點是 Nx Project（Library / Application），邊是依賴關係
- 支援「Focus on a project」：選中後只顯示相關節點
- 支援「Task Graph」：顯示建置任務的依賴關係

**與 CodeAtlas 比較**:
| 維度 | Nx Graph | CodeAtlas |
|------|---------|-----------|
| 層級 | Project 級（粗粒度） | 檔案級 + 函式級（細粒度） |
| 對象 | 僅限 Nx Workspace | 任意 JS/TS 專案 |
| 視覺效果 | 現代，但無動畫 | 霓虹 + 粒子 + 3D |
| 資料流 | 否 | 是 |
| 3D | 否 | 是 |
| AI | 否 | 是 |

**截圖/參考**:
- https://nx.dev/features/explore-graph
- https://github.com/nrwl/nx（README 有截圖）

---

#### Snyk Code Flow

**官網**: https://snyk.io/product/snyk-code/
**定位**: 安全掃描工具，有「資料流圖（Data Flow Diagram）」功能

**視覺化手法**:
- 顯示「污點追蹤（taint tracking）」：危險資料從哪裡進入，流向哪裡
- 資料流圖是線性步驟（非圖譜），每步標示檔案 + 行號
- 高亮顯示可能的安全漏洞路徑

**與 CodeAtlas 比較**:
- Snyk 的「資料流」是安全視角（taint analysis），CodeAtlas 是架構理解視角
- Snyk 的呈現方式（線性步驟列表）對非安全工程師理解成本較高
- **借鑑點**：Snyk 的「污點源 → 中間節點 → 匯聚點」標示方式可用於 CodeAtlas 的端到端追蹤

---

#### Whimsical / Eraser.io（AI 生成架構圖）

**Eraser.io**: https://www.eraser.io
**定位**: AI 輔助技術圖表工具（系統設計、架構圖、ER 圖）

**視覺化做法**:
- 支援自然語言描述 → AI 自動生成架構圖
- 圖表風格乾淨現代，支援深色/淺色主題
- 支援 Diagram as Code（類 Mermaid 語法）

**與 CodeAtlas 比較**:
- Eraser 是「設計階段的圖表工具」，CodeAtlas 是「現有程式碼的分析工具」
- Eraser 的圖是手動描述或 AI 生成，不是從程式碼自動解析
- **借鑑點**：Eraser 的視覺設計風格（節點樣式、色彩系統）值得參考

---

#### Cursor / GitHub Copilot（有程式碼理解但無視覺化）

- 這類 AI coding 工具理解程式碼結構，但不做視覺化
- 未來趨勢：AI + 視覺化 = 更強的程式碼理解工具
- **CodeAtlas 的機會**：成為「AI 解釋 + 視覺化呈現」的組合，這個組合目前無人做好

---

### 5.2 競品總覽矩陣

| 競品 | 視覺衝擊 | 自動解析 | 資料流 | 3D | Local-first | AI | 免費/開源 |
|------|---------|---------|--------|-----|-------------|-----|---------|
| CodeScene | 中 | 是 | 否 | 否 | 否 | 否 | 付費 |
| Sourcetrail | 低 | 是 | 否 | 否 | 是 | 否 | 開源（停維護） |
| Nx Graph | 中 | 是（Nx 專用） | 否 | 否 | 是 | 否 | 開源 |
| Sourcegraph | 低（無圖譜） | 是 | 否 | 否 | 自部署 | 是 | 付費+自部署 |
| Dependency Cruiser | 低（靜態） | 是 | 否 | 否 | 是 | 否 | 開源 |
| Eraser.io | 高 | 否（手動） | 否 | 否 | 否（SaaS） | 是 | 付費 |
| **CodeAtlas** | **最高** | **是** | **是** | **是** | **是** | **是** | **開源** |

---

### 5.3 CodeAtlas 的差異化優勢總結

在業界調研後，CodeAtlas 擁有以下**無人同時具備**的組合：

1. **自動解析 + 視覺衝擊** — 大多數工具只能二選一
2. **3D + 資料流** — 目前沒有競品同時做這兩件事
3. **Local-first + AI** — 不用上傳程式碼就能用 AI 摘要（Ollama）
4. **5 分鐘理解** — 故事視角（Sprint 11）是業界首創的「guided narrative graph」
5. **CLI + Web UI** — 工程師工作流整合，而非獨立工具

**最大威脅**:
- Nx 持續強化其 Graph 功能，如果加入動畫和 AI，競爭力會顯著提升
- GitHub/GitLab 可能在未來整合更好的視覺化，利用其生態優勢

---

## 六、對 CodeAtlas 的具體建議

基於以上調研，對應 Sprint 10/11 提出以下優先建議：

### 6.1 可立即借鑑的設計決策

| 建議 | 來源 | 對應 Sprint |
|------|------|------------|
| 節點計數顯示在 filter 旁（例如「utils/ (12)」） | Nx Graph、Obsidian | Sprint 10 智慧策展 |
| 非相關節點 dim 到 0.15 透明度（不完全隱藏） | Datadog Service Map | Sprint 10/11 |
| 路徑高亮時用 stagger animation（每節點延遲 150ms 亮起） | GitHub Actions | Sprint 11 資料旅程 |
| 系統框架視角用 Top-Down 分層佈局（非力導向） | Sourcetrail、yEd | Sprint 11 系統框架 |
| UnrealBloomPass 的 3D 發光強度在節點選中時動態提升 | 3d-force-graph demos | Sprint 10 3D 空間 |
| MiniMap 加到 3D 模式（投影 2D 縮略） | React Flow | Sprint 10 |

### 6.2 中長期差異化方向

| 方向 | 描述 | 對應 Phase |
|------|------|-----------|
| Diagram Export | 輸出 Mermaid / SVG 格式供文件使用 | Phase 4 |
| VS Code Extension | 編輯器內嵌，當前檔案即時依賴圖 | Phase 5 |
| Presentation Mode | 把圖譜變成投影片（Lucidchart 模式） | Phase 5 |
| Git Diff Visualization | 兩個 commit 之間的架構變化動畫 | Phase 5 |

---

## 七、參考連結清單

以下均為可直接訪問的公開資源：

### 工具官網 / GitHub
- CodeScene: https://codescene.com/product/architecture-visualization
- Sourcetrail: https://github.com/CoatiSoftware/Sourcetrail
- Dependency Cruiser: https://github.com/sverweij/dependency-cruiser
- Madge: https://github.com/pahen/madge
- Nx Graph: https://nx.dev/features/explore-graph
- gource: https://gource.io
- 3d-force-graph: https://github.com/vasturiano/3d-force-graph
- Kumu: https://kumu.io
- Neo4j Bloom: https://neo4j.com/product/bloom/
- Eraser.io: https://www.eraser.io

### 技術參考
- D3 Sankey: https://observablehq.com/@d3/sankey
- UnrealBloomPass (Three.js): https://threejs.org/examples/webgl_postprocessing_unreal_bloom.html
- React Flow: https://reactflow.dev/examples
- Grafana Node Graph: https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/node-graph/

### 視覺截圖資源（可直接搜尋）
- YouTube: "CodeScene architecture visualization demo"
- YouTube: "gource git visualization"
- YouTube: "Sourcetrail code exploration"
- Twitter/X: #codevisualization, #graphvisualization

### 學術/設計參考
- Code City 論文: https://wettel.github.io/codecity.html
- "Graph Drawing: Methods and Models"（書籍）
- IEEE InfoVis / VAST 會議論文（圖形可視化業界頂會）

---

> **報告產生時間**: 2026-04-01
> **下次更新建議**: Sprint 11 完成後，補充三種故事視角的業界對標案例
