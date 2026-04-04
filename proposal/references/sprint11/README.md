# Sprint 11 — 業界視覺參考圖集索引

> **撰寫者**: design-director
> **日期**: 2026-04-01
> **目的**: 為 Sprint 11「三種故事視角」收集業界競品視覺參考，供老闆比較選擇 CodeAtlas 的呈現風格方向
> **調研來源**: `.knowledge/research-industry-visualization.md`（trend-researcher 業界調研報告 v1.0）

---

## 快速瀏覽

**請直接開啟 `visual-gallery.html` 在瀏覽器中瀏覽所有參考圖（需聯網載入圖片）。**

---

## 一、程式碼架構視覺化工具

| # | 工具 | 截圖來源 | 核心視覺特點 | 對 CodeAtlas 的參考價值 | 適合視角 |
|---|------|---------|-------------|----------------------|---------|
| 1 | **Sourcetrail** | [GitHub README](https://github.com/CoatiSoftware/Sourcetrail) | 三欄佈局（符號清單 + 星狀依賴圖 + 程式碼高亮），雙向同步 | 三欄同步是「三種故事視角」切換的直接對標 | 系統框架 + 邏輯運作 |
| 2 | **CodeScene** | [官網 Product](https://codescene.com/product/code-health) | Circle Packing 圓形填充 + 熱力色彩編碼，展示模組健康度 | Hotspot 視角、模組層次分佈的靈感 | 系統框架 |
| 3 | **Dependency Cruiser** | [GitHub README](https://github.com/sverweij/dependency-cruiser) | Graphviz 靜態有向圖，循環依賴紅線閉環，違規規則紅色標示 | 循環依賴視覺化、架構規則違反警告 | 系統框架 |
| 4 | **Nx Graph** | [官網](https://nx.dev/features/explore-graph)（動態渲染，無靜態截圖） | 互動式 Web 深色主題依賴圖，Focus 聚焦模式（非相關淡化） | 聚焦模式互動設計參考 | 邏輯運作 |
| 5 | **Obsidian Graph View** | [官網](https://obsidian.md)（動態渲染） | 深色力導向圖，節點大小依連結數縮放，hover 高亮鄰近節點 | 力導向深色配色的直接對標，風格最接近 CodeAtlas | 邏輯運作 |

### 確認有效的圖片 URL

| 工具 | 圖片 URL | 尺寸 |
|------|---------|------|
| Sourcetrail | `https://raw.githubusercontent.com/CoatiSoftware/Sourcetrail/master/docs/readme/user_interface.png` | 2258x1354px, 641KB |
| CodeScene | `https://codescene.com/hubfs/New%20Website/Product%20Images/Website%20-%20Code%20Health%20Visualization.svg` | SVG |
| Dependency Cruiser | `https://raw.githubusercontent.com/sverweij/dependency-cruiser/main/doc/assets/sample-dot-output.png` | 35KB |

---

## 二、資料流呈現方式

| # | 呈現方式 | 截圖來源 | 核心視覺特點 | 對 CodeAtlas 的參考價值 | 適合視角 |
|---|---------|---------|-------------|----------------------|---------|
| 6 | **Sankey Diagram** | [D3 Observable](https://observablehq.com/@d3/sankey)（互動式） | 流量帶寬度比例分配，左到右流向 | 函式呼叫流量的「流量分佈」子視圖 | 資料旅程 |
| 7 | **Sequence Diagram** | [Mermaid.js](https://mermaid.js.org)（動態渲染） | Actor + 生命線 + 訊息箭頭，標準時序視覺語言 | API 呼叫鏈「執行流程」視角 | 資料旅程 |
| 8 | **DAG Flow** | [Airflow 文件](https://airflow.apache.org/docs/apache-airflow/stable/ui.html) | DAG 節點以狀態色填色（綠/紅/黃），深色主題 | 執行狀態顏色編碼直接適用 | 資料旅程 |
| 9 | **Path Tracing** | [AWS X-Ray 文件](https://docs.aws.amazon.com/xray/latest/devguide/xray-console-servicemap.html) | 圓形節點健康色環 + 邊粗=流量 + 選中路徑全亮 | 端到端追蹤的直接視覺參考 | 資料旅程 + 邏輯運作 |

### 確認有效的圖片 URL

| 工具 | 圖片 URL | 尺寸 |
|------|---------|------|
| Airflow DAG | `https://airflow.apache.org/docs/apache-airflow/stable/_images/dag_overview_graph.png` | 2150x1534px |
| AWS X-Ray 服務地圖 | `https://docs.aws.amazon.com/xray/latest/devguide/images/console-servicemap-xray.png` | 185KB |
| AWS X-Ray 節點詳情 | `https://docs.aws.amazon.com/xray/latest/devguide/images/console-servicemap-nodedetail-xray.png` | — |

---

## 三、3D 視覺化

| # | 工具/概念 | 截圖來源 | 核心視覺特點 | 對 CodeAtlas 的參考價值 | 適合視角 |
|---|----------|---------|-------------|----------------------|---------|
| 10 | **Gource** | [官網](https://gource.io) | Git 歷史 3D 動畫，樹狀結構 + 貢獻者粒子 + 深黑發光 | Sprint 11 Git 歷史故事視角的核心靈感 | 系統框架（時間演進） |
| 11 | **Code City** | [論文](https://wettel.github.io/codecity.html)（SonarCity 已失效 404） | 城市隱喻：建築高度=複雜度，街區=目錄 | 複雜度視角的備選方案 | 系統框架 |
| 12 | **3d-force-graph** | [GitHub](https://github.com/vasturiano/3d-force-graph) | 深色背景球形節點半透明發光，CodeAtlas 正在使用的庫 | 3D 模式 UI 設計基線 | 全部視角 |
| 13 | **Three.js Bloom** | [Three.js 範例](https://threejs.org/examples/#webgl_postprocessing_unreal_bloom) | UnrealBloomPass 泛光後處理，物件光暈擴散 | 3D 高活躍節點發光效果的技術實作 | 全部視角 |

### 確認有效的圖片 URL

| 工具 | 圖片 URL | 尺寸 |
|------|---------|------|
| Gource (Linux) | `https://gource.io/images/gource-linux.jpg` | 256KB |
| Gource (Git) | `https://gource.io/images/gource-git.jpg` | 155KB |
| Gource (PV3D) | `https://gource.io/images/gource-papervision.jpg` | — |
| 3d-force-graph | `https://vasturiano.github.io/3d-force-graph/example/preview.png` | 1440x900px, 193KB |
| Three.js Bloom | `https://threejs.org/examples/screenshots/webgl_postprocessing_unreal_bloom.jpg` | 68KB |

### 替代參考（原始來源失效）

- **SonarCity**（tcard.github.io）已 404 → 建議參考 [SAP CodeCharta](https://codecharta.com) 或 [Richard Wettel CodeCity 論文](https://wettel.github.io/codecity.html)

---

## 四、佈局策略對比

| 佈局 | 說明 | 適合場景 | 代表工具 | 建議用於 Sprint 11 |
|------|------|---------|---------|-------------------|
| **力導向 (Force-Directed)** | 節點自然聚集，物理模擬 | 無明確層次的依賴關係探索 | CodeAtlas 現有、Obsidian | 邏輯運作視角（預設） |
| **分層 (Hierarchical Top-Down)** | 根在頂、依賴逐層下放 | 有明確入口的系統，30 秒看懂 | dagre、Graphviz dot | **系統框架視角（推薦）** |
| **星狀展開 (Ego Graph)** | 只看選中節點的 1 度關係 | 聚焦探索 | Sourcetrail Focus Mode | 邏輯運作視角（聚焦模式） |
| **城市地圖 (City Map)** | 目錄=區域，檔案=建築 | 展示複雜度分佈 | CodeScene、Code City | 未來考慮（Phase 5+） |

---

## 五、三種故事視角 × 呈現方式 對照表

> 以下為 design-director 的初步視覺建議，供老闆決策參考。

| 故事視角 | 核心問題 | 建議佈局 | 建議參考來源 | 關鍵視覺效果 |
|---------|---------|---------|------------|------------|
| **系統框架** | 「這個專案有哪些模組？怎麼組織的？」 | 分層佈局 (Hierarchical) | Sourcetrail 三欄、Airflow DAG 狀態色、CodeScene Circle Packing | 目錄=群組節點，由上到下層次分明，顏色區分模組角色 |
| **邏輯運作** | 「A 模組怎麼呼叫 B？資料怎麼傳遞？」 | 力導向佈局 (Force-Directed) | Obsidian hover 高亮、Nx Focus 模式、AWS X-Ray 路徑追蹤 | hover 高亮依賴路徑、非相關 fade 到 0.15、粒子流動方向 |
| **資料旅程** | 「從 input 到 output，資料經過哪些步驟？」 | 路徑追蹤高亮 (Path Tracing) | AWS X-Ray/Datadog fade-out、Gource 粒子軌跡、Sankey 流量 | stagger animation（每節點 150ms 延遲亮起）、glow 路徑、E2EPanel 步驟面板 |

---

## 六、設計總監初步視覺建議

### 明確推薦

1. **系統框架視角** → 採用 **dagre 分層佈局**（非力導向），參考 Sourcetrail 三欄同步 + Airflow DAG 狀態色
2. **邏輯運作視角** → 保持現有力導向佈局，強化 **hover 高亮** + **聚焦模式**，參考 Obsidian + Nx
3. **資料旅程視角** → 基於現有端到端追蹤（Sprint 9），加入 **stagger animation** + **Bloom 後處理**，參考 X-Ray + Gource

### 不建議採用

- **Sankey 圖**：CodeAtlas 是圖譜工具（節點+邊），Sankey 是流量圖（帶狀），結構不匹配。可作為未來獨立子視圖考慮
- **時序圖 (Sequence Diagram)**：適合 API 呼叫鏈，但 CodeAtlas 目前不追蹤時序。可作為 Phase 5 功能
- **城市地圖 (City Map)**：工作量大，且需要 3D 額外開發。留待 Phase 5+ 評估

### 技術方向

- **3D 模式加入 UnrealBloomPass**：Sprint 11 可考慮，視覺提升顯著
- **分層佈局引擎**：推薦使用 dagre（React Flow 原生支援），不需額外依賴
- **stagger animation**：Framer Motion `staggerChildren` 可直接實現，每步延遲 150ms

---

## 檔案清單

| 檔案 | 說明 |
|------|------|
| `visual-gallery.html` | 互動式視覺參考圖集（瀏覽器開啟，需聯網） |
| `README.md` | 本索引文件 |

---

*產出者: design-director | 日期: 2026-04-01*
