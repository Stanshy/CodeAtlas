# Sprint 17 LOC 盤點報告

> **產出者**: tech-lead
> **日期**: 2026-04-07
> **Sprint**: Sprint 17 — 程式碼優化
> **時點**: 重構前基線

---

## 1. 各層 LOC 統計

| 層 | Source Files | Source LOC | Test Files | Test LOC | Source:Test |
|----|-------------|-----------|-----------|---------|------------|
| web | 89 | 25,711 | 46 | 11,287 | 2.28:1 |
| core | 34 | 7,860 | 44 | 8,508 | 0.92:1 |
| cli | 9 | 2,920 | 6 | 1,990 | 1.47:1 |
| **Total** | **132** | **36,491** | **96** | **21,785** | **1.68:1** |

### Web 層子目錄分佈

| 子目錄 | Files | LOC | 佔 web % |
|--------|-------|-----|---------|
| components/ | 52 | 19,099 | 74.3% |
| hooks/ | 19 | 2,239 | 8.7% |
| adapters/ | 6 | 925 | 3.6% |
| api/ | 3 | 487 | 1.9% |
| utils/ | 4 | 487 | 1.9% |
| styles/ | 1 | 455 | 1.8% |
| types/ | 1 | 433 | 1.7% |
| contexts/ | 1 | 666 | 2.6% |
| root (App.tsx + main.tsx) | 2 | 324 | 1.3% |

### Core 層子目錄分佈

| 子目錄 | Files | LOC | 佔 core % |
|--------|-------|-----|----------|
| ai/ | 16 | ~2,400 | 30.5% |
| analyzers/ | 2 | ~1,700 | 21.6% |
| parser/ (含 providers/) | 9 | ~1,600 | 20.4% |
| analyzer/ | 4 | ~1,300 | 16.5% |
| scanner/ | 1 | 262 | 3.3% |
| root (types + index) | 2 | 170 | 2.2% |

---

## 2. 大檔案 TOP 20

| # | 檔案 | LOC | 層 |
|---|------|-----|----|
| 1 | GraphCanvas.tsx | 2,644 | web |
| 2 | Graph3DCanvas.tsx | 1,627 | web |
| 3 | endpoint-detector.ts | 978 | core |
| 4 | server.ts | 934 | cli |
| 5 | SettingsPopover.tsx | 899 | web |
| 6 | LODetailPanel.tsx | 763 | web |
| 7 | DJPanel.tsx | 731 | web |
| 8 | E2EPanel.tsx | 719 | web |
| 9 | directory-aggregator.ts | 718 | core |
| 10 | FilterPanel.tsx | 698 | web |
| 11 | SFDetailPanel.tsx | 671 | web |
| 12 | ViewStateContext.tsx | 666 | web |
| 13 | function-extractor.ts | 631 | core |
| 14 | LOCategoryGroup.tsx | 619 | web |
| 15 | ControlPanel.tsx | 609 | web |
| 16 | ai-job-manager.ts | 600 | cli |
| 17 | import-extractor.ts | 564 | core |
| 18 | ai-pipeline.ts | 560 | cli |
| 19 | DJEndpointSelector.tsx | 508 | web |
| 20 | graph-builder.ts | 496 | core |

> TOP 20 合計 15,845 行，佔 source 總量 43.4%。

---

## 3. 死碼候選清單

### 確認可刪除（老闆已核准）

| 檔案 | LOC | 理由 |
|------|-----|------|
| `packages/web/src/components/ControlPanel.tsx` | 609 | 已被 SettingsPopover 完全取代。App.tsx line 208 註解確認，零 import 引用。 |
| `packages/web/src/components/ControlPanelSection.tsx` | 133 | 僅被 ControlPanel.tsx 引用，SettingsPopover 有自己的 Section 元件。 |
| **小計** | **742** | |

### 附帶清理（過時註解）

| 檔案 | 內容 |
|------|------|
| DisplayPrefsSection.tsx line 3 | JSDoc 提及 "for the ControlPanel" |
| FilterPanel.tsx line 24 | JSDoc 提及 "Used when embedded inside ControlPanel" |
| FilterPanel.tsx line 425 | 註解 "Render: embedded mode (inside ControlPanel)" |
| SettingsPopover.tsx lines 4-8 | Header 提及 "replaces the left ControlPanel" |

### 未發現其他死碼

- 全 test 檔案均對應活躍元件（46 test files 逐一核對）
- core 層 export 目前均有 cli/web 消費端（需後續精確審計）

---

## 4. 重複邏輯候選（GraphCanvas vs Graph3DCanvas）

| 重複項 | 說明 | 估計重複行數 |
|--------|------|------------|
| ViewStateContext 解構 | 兩者拉取相同 20+ 個 state 值 | ~30 |
| 高亮優先權邏輯 | e2e > impact > search > tracing > hover > normal，各自實作 | ~80 |
| 鄰接表建構 | 從 edges 建 connectedNodes Map | ~20 |
| Perspective filtering | applyPerspective + applyCuration pipeline | ~15 |
| **估計可共用** | **~145 行** | |

> 渲染範式不同（ReactFlow declarative vs Three.js imperative），真正可共用的是資料計算層。

---

## 5. 拆分方案預覽

### GraphCanvas.tsx (2,644 → <900)

| 抽出模組 | 目標檔案 | 估計行數 |
|---------|---------|---------|
| useDJMode | hooks/useDJMode.ts | ~350 |
| useLOMode | hooks/useLOMode.ts | ~250 |
| useNodeEdgeStyling | hooks/useNodeEdgeStyling.ts | ~500 |
| useGraphCanvasFiltering | hooks/useGraphCanvasFiltering.ts | ~350 |
| GraphCanvasFooter | components/graph/GraphCanvasFooter.tsx | ~260 |

### Graph3DCanvas.tsx (1,627 → <800)

| 抽出模組 | 目標檔案 | 估計行數 |
|---------|---------|---------|
| three-scene-helpers | utils/three-scene-helpers.ts | ~420 |
| use3DHighlightEffects | hooks/use3DHighlightEffects.ts | ~650 |

### SettingsPopover.tsx (899 → <500)

| 抽出模組 | 目標檔案 | 估計行數 |
|---------|---------|---------|
| AnalysisSection | components/settings/AnalysisSection.tsx | ~200 |
| AISettingsSection | components/settings/AISettingsSection.tsx | ~340 |

---

## 6. LOC 影響預估

| 變更 | 行數 |
|------|------|
| 死碼刪除（ControlPanel + ControlPanelSection） | -742 |
| Debug log 清理 | -3 |
| 共用 hooks 新增（T9） | +130 |
| 重複消除（T9） | -145 |
| **預估淨 LOC 變化** | **~-760** |

> 拆分（T6-T8）為零和搬移，不計入淨變化。

---

## 7. 總結

- **web 層佔 70.4%** 是大頭，components/ 佔 web 的 74.3%
- **前 3 大元件**（GraphCanvas + Graph3DCanvas + SettingsPopover）合計 5,170 行，佔 web source 的 20.1%
- **確認死碼 742 行**（ControlPanel 系列），已獲老闆核准刪除
- **拆分後** 3 個巨型元件主檔均可降至目標以下
- **風險低**：重構不改 API 契約、不改 UI、不改外部 import path
