# Sprint 17 重構報告

> **產出者**: tech-lead
> **日期**: 2026-04-08
> **Sprint**: Sprint 17 — 程式碼優化

---

## 1. LOC 前後對比

| 層 | 重構前 | 重構後 | 差異 |
|----|--------|--------|------|
| web | 25,711 | 25,264 | -447 |
| core | 7,860 | 7,860 | 0 |
| cli | 2,920 | 2,897 | -23 |
| **Total** | **36,491** | **36,021** | **-470** |

### 測試 LOC

| 項目 | 重構前 | 重構後 |
|------|--------|--------|
| 測試數 | 1,666 pass / 19 fail | 1,797 pass / 0 fail |
| 測試檔案 | 79 | 79 |

> 測試數增加是因 T1 修復 15 個 + T10 修復 4 個 = 19 個從 fail 恢復為 pass。

---

## 2. 大元件拆分結果

| 元件 | 重構前 | 重構後 | 目標 | 達標 |
|------|--------|--------|------|------|
| GraphCanvas.tsx | 2,644 | 896 | <900 | ✅ |
| Graph3DCanvas.tsx | 1,627 | 606 | <800 | ✅ |
| SettingsPopover.tsx | 899 | 257 | <500 | ✅ |
| **合計** | **5,170** | **1,759** | | **-66%** |

---

## 3. 刪除檔案清單

| 檔案 | LOC | 原因 |
|------|-----|------|
| ControlPanel.tsx | 609 | 已被 SettingsPopover 完全取代，零引用 |
| ControlPanelSection.tsx | 133 | 僅被 ControlPanel.tsx 引用 |
| **合計** | **742** | |

---

## 4. 新增檔案清單

### T6: GraphCanvas 拆分 (5 個)

| 檔案 | LOC | 說明 |
|------|-----|------|
| hooks/useGraphCanvasFiltering.ts | 445 | filtering pipeline |
| hooks/useDJMode.ts | 412 | Data Journey 狀態+邏輯 |
| hooks/useLOMode.ts | 290 | Logic Operation 狀態+邏輯 |
| hooks/useNodeEdgeStyling.ts | 665 | 節點/邊樣式優先權鏈 |
| components/graph/GraphCanvasFooter.tsx | 259 | 三視角 footer JSX |

### T7: Graph3DCanvas 拆分 (2 個)

| 檔案 | LOC | 說明 |
|------|-----|------|
| utils/three-scene-helpers.ts | 479 | Three.js 純函式+常數 |
| hooks/use3DHighlightEffects.ts | 734 | 8 種 highlight useEffect |

### T8: SettingsPopover 拆分 (2 個)

| 檔案 | LOC | 說明 |
|------|-----|------|
| components/settings/AnalysisSection.tsx | 296 | 分析工具區段 |
| components/settings/AISettingsSection.tsx | 444 | AI 設定區段 |

### T9: 共用 hooks (3 個)

| 檔案 | LOC | 說明 |
|------|-----|------|
| hooks/useFilteredGraphData.ts | ~40 | perspective+curation pipeline |
| hooks/useGraphAdjacency.ts | ~30 | 邊→鄰接表 |
| hooks/useHighlightPriority.ts | ~60 | 高亮優先權判定 |

**新增合計**：12 個檔案

---

## 5. 其他清理

| 項目 | 說明 |
|------|------|
| Debug log 移除 | ai-job-manager.ts 3 個 + ai-pipeline.ts 11 個 = 14 個 console.log |
| JSDoc 註解更新 | DisplayPrefsSection / FilterPanel / SettingsPopover 中 ControlPanel 引用清理 |
| 測試修復 | ai-contracts 6 + directory-card 7 + sf-detail-panel 2 + ai-pipeline 4 = 19 個 |

---

## 6. 品質指標

| 指標 | 結果 |
|------|------|
| pnpm build | ✅ 零錯誤 |
| pnpm test | ✅ 1,797 pass / 0 fail |
| Circular dependency | ✅ 無 |
| API 契約變更 | ✅ 無（graph JSON schema 不變） |
| UI 外觀變更 | ✅ 無（使用者無感） |
| 新增測試失敗 | ✅ 零 |

---

## 7. 後續觀察項

| 項目 | 說明 |
|------|------|
| use3DHighlightEffects.ts (734 行) | 職責單一但行數大，後續可視需要再拆 |
| useNodeEdgeStyling.ts (665 行) | 同上 |
| useFilteredGraphData 未整合 2D | 2D filtering 與 RF card 生成耦合，需更大重構才能拆開 |
| core 層 export 審計 | 本次未做精確審計，後續 Sprint 可補 |
