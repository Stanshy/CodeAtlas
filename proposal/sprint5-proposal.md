# Sprint 提案書: Sprint 5 — 資料流動視覺化

> **提案人**: PM
> **日期**: 2026-03-31
> **專案**: CodeAtlas
> **Sprint 類型**: 功能開發
> **六問診斷**: `proposal/sprint5-diagnosis.md`（全部通過）
> **前置 Sprint**: Sprint 4 — 3D 視覺化（✅ 已完成）

---

## 1. 目標

讓使用者不只看到「誰 import 誰」，還能看到「搬了什麼東西過去」。邊線上浮現 symbol 名稱、點擊 symbol 追蹤完整傳遞路徑、熱力圖一眼看出核心資料通道。從「看架構」升級到「看流動」。

**一句話驗收**：Hover 邊線 → 看到 symbol 名稱 → 點擊 symbol → 整條傳遞路徑亮起 → 「原來資料是這樣流的」。

---

## 2. 確認的流程

```
需求 → 設計 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）
```

> Sprint 5 無新視覺模式（延續 Sprint 4 的 2D/3D），無 G1。無文件/部署/發佈。

### 阻斷規則

- 無額外阻斷規則（G2 前完成實作即可）

---

## 3. 功能清單

### P0（必做）

| # | 功能 | 描述 |
|---|------|------|
| S5-1 | 邊上 symbol 標籤 | Hover 邊線 → 浮現該邊搬運的 symbol 名稱（如「UserService, AuthMiddleware」）。2D 用 React Flow edge label，3D 用 Three.js sprite text。超過 3 個 symbol 顯示前 3 個 + 「+N more」 |
| S5-2 | 路徑追蹤模式 | 點擊邊上的某個 symbol → 追蹤完整傳遞鏈（A export → B import → B re-export → C import）。整條路徑高亮，無關節點暗淡。追蹤深度上限 10 層（防循環依賴無限展開） |
| S5-3 | 節點 I/O 標記 | 節點上顯示 import 數（入）和 export 數（出）的視覺標記。利用現有 `NodeMetadata.importCount` / `exportCount` |
| S5-4 | 資料流熱力圖 | 邊的 `importedSymbols.length` 映射為邊的粗細和亮度 — symbol 越多的邊越粗越亮，一眼看出核心資料通道 |
| S5-5 | 2D + 3D 雙模式適配 | 以上所有功能在 2D（React Flow）和 3D（3d-force-graph）模式下都可用 |

### P1（應做）

| # | 功能 | 描述 |
|---|------|------|
| S5-6 | 粒子攜帶資訊 | 粒子顏色/大小代表不同 symbol 類型：function（綠色大粒子）、class（青色中粒子）、variable（白色小粒子） |
| S5-7 | 路徑追蹤面板 | 追蹤模式啟動時，右側面板顯示完整路徑列表（每一跳的 symbol 名稱 + 檔案路徑），可點擊跳轉 |
| S5-8 | 熱力圖強度切換 | Toolbar 按鈕控制熱力圖開關，避免視覺資訊過載 |

---

## 4. 範圍界定

### 做

- 邊上 symbol 標籤（hover 浮現）
- 路徑追蹤模式（symbol 傳遞鏈）
- 節點 I/O 標記
- 資料流熱力圖（邊粗細/亮度）
- 2D + 3D 雙模式適配
- 粒子攜帶 symbol 類型資訊
- 路徑追蹤面板
- 熱力圖開關

### 不做

- 函式級參數/回傳追蹤（Sprint 7）
- 端到端 API 路徑追蹤（Sprint 7）
- 變數級 taint analysis（長期）
- 新的 core 解析功能（利用現有 importedSymbols 資料）
- re-export 鏈解析強化（現有 core 已能解析基本 re-export）

---

## 5. 團隊

| 角色 | Agent | 職責 |
|------|-------|------|
| L1 領導 | tech-lead | 任務拆解、路徑追蹤演算法設計、Review、Gate 回報 |
| 前端開發 | frontend-developer | 邊標籤、熱力圖、面板、2D/3D 適配 |
| 後端開發 | backend-architect | core 路徑追蹤 utility（如需）、API 擴充（如需） |
| 測試 | test-writer-fixer | 路徑追蹤測試、邊標籤測試、回歸測試 |

---

## 6. 驗收標準

### 功能驗收

- [ ] Hover 邊線 → 浮現搬運的 symbol 名稱，超過 3 個顯示「+N more」
- [ ] 點擊 symbol → 完整傳遞路徑高亮（A→B→C），無關節點暗淡
- [ ] 路徑追蹤深度上限 10 層，循環依賴不會無限展開
- [ ] 節點上可見 import 數（入）和 export 數（出）標記
- [ ] 邊的粗細/亮度反映 symbol 數量（熱力圖效果）
- [ ] 以上所有功能在 2D 和 3D 模式下都正常運作
- [ ] 路徑追蹤面板顯示完整路徑列表，可點擊跳轉

### 資料驗收

- [ ] 利用現有 `EdgeMetadata.importedSymbols` 資料，不重新解析
- [ ] 利用現有 `NodeMetadata.importCount` / `exportCount`，不重新計算

### 回歸驗收

- [ ] 現有 353+ tests 全部通過，零回歸
- [ ] 2D 模式所有 Sprint 1~4 功能不受影響
- [ ] 3D 模式所有 Sprint 4 功能不受影響

---

## 7. 風險

| 風險 | 等級 | 緩解方式 |
|------|------|---------|
| 3D 邊上文字渲染效能 | 中 | Three.js sprite text 在大量邊時可能吃效能。超過 50 條邊只顯示 hover 的那條，不全部渲染 |
| 循環依賴路徑追蹤 | 中 | 設定深度上限 10 層 + visited set 防重複 |
| 邊標籤視覺擁擠 | 低 | 只 hover 時浮現，非永久顯示。超過 3 個 symbol 摺疊 |
| 2D/3D 雙模式維護成本 | 中 | 邊標籤/熱力圖邏輯抽為共用 hook，渲染層各自適配 |
| core importedSymbols 資料不完整 | 低 | Sprint 1 已實作 import symbol 解析，覆蓋率 > 90% |

---

## 8. 初步時程

| 階段 | 任務 | 預估 |
|------|------|------|
| 設計 | 路徑追蹤演算法 + 邊標籤架構 | 0.5 天 |
| 實作 — 核心 | 路徑追蹤 utility + 邊標籤（2D） | 1.5 天 |
| 實作 — 3D 適配 | 3D 邊標籤 + 3D 熱力圖 + 3D 路徑高亮 | 1.5 天 |
| 實作 — 面板 | I/O 標記 + 路徑面板 + 熱力圖開關 | 1 天 |
| 測試 | 路徑追蹤測試 + 邊標籤測試 + 回歸 | 1 天 |

---

## G0 審核

**老闆決策**: [x] 通過

**審核意見**: 2026-03-31 老闆核准 G0。

**確認的流程**: 需求 → 設計 → 實作 → G2 → 測試 → G3
