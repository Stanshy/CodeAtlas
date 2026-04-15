# Sprint 提案書: Sprint 10 — 智慧策展 + 效能 + 3D 空間

> **提案人**: PM
> **日期**: 2026-04-01
> **專案**: CodeAtlas
> **Sprint 類型**: 核心體驗升級
> **六問診斷**: `proposal/sprint10-diagnosis.md`（全部通過）
> **前置 Sprint**: Sprint 9 — 控制面板 + 視圖模式 + 端到端追蹤（✅ 已完成）
> **方向決策**: 老闆 2026-04-01 確認 — 智慧策展 + 三種故事視角（Sprint 10-11 分兩期）

---

## 1. 目標

不再顯示所有檔案。core 層新增節點重要度分析，自動識別業務邏輯和橫向切面，預設只顯示核心節點。3D 模式加入 XYZ 軸線 + 背景網格，讓使用者有空間感。節點數大幅減少後效能自然改善，搭配 ViewState 優化根治卡頓。這是 Sprint 11「三種故事視角」的基礎 — 先策展好，再講故事。

**一句話驗收**：打開 CodeAtlas → 只看到核心模組（30~50 個節點而非 500 個）→ 3D 有軸線和網格 → 操作流暢不卡 → 「終於看得清楚架構了」。

---

## 2. 確認的流程

```
需求 → 設計 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）
```

> **無 G1** — 無新 UI 面板設計，3D 網格/軸線為 Three.js 標準元件。
> **core + web 雙層改動** — core 新增節點重要度分析，web 優化渲染 + 3D 空間。

### 阻斷規則

- 無額外阻斷規則

---

## 3. 功能清單

### P0（必做）

| # | 功能 | 描述 |
|---|------|------|
| S10-1 | 節點重要度分析 | core 層新增：分析每個節點的「角色」— 業務邏輯（route/controller/service/model/handler）、橫向切面（middleware/auth/logging/validation/error-handling）、基礎設施（config/db-connection/server-setup）、輔助（utils/helpers/constants/types）、噪音（test/build/CI）。使用 heuristic（目錄名 + 檔名模式 + import/export 數量 + 被依賴次數）判斷 |
| S10-2 | 智慧策展 | 預設只顯示「業務邏輯 + 橫向切面」節點。無「全部顯示」選項。graph-adapter 層在渲染前自動過濾。節點數從 500 → 30~50 |
| S10-3 | 手動微調 | 過濾面板升級：使用者可手動加入被隱藏的特定節點（如想看某個 util），但不能一鍵全開 |
| S10-4 | 3D 空間參考系 | Three.js GridHelper（地板網格）+ AxesHelper（XYZ 軸線）+ 軸標示文字。深色主題下淡色半透明，不搶視覺。旋轉時始終可見 |
| S10-5 | 效能優化 | ViewState 拆分或 selector 機制（避免全局 re-render）+ graph-adapter useMemo 快取精確化 + 3D useEffect 減量 + 渲染管線優化 |
| S10-6 | 3D 佈局改善 | 調整 3d-force-graph 力導向參數（charge、link distance、collision），避免節點擠成一團。節點減少後空間自然改善 |
| S10-7 | Graph JSON 擴充 | AnalysisResult 新增每個節點的 role 欄位（business-logic / cross-cutting / infrastructure / utility / noise），供 web 層策展 |

### P1（應做，視時間）

| # | 功能 | 描述 |
|---|------|------|
| S10-8 | AI 輔助分類 | 對 heuristic 無法判斷的節點，用 AI 分析檔案名稱 + 路徑 + import 模式，輔助分類角色。復用現有 AI Provider |
| S10-9 | Sprint 9 P1 收尾 | AI 設定 UI + Onboarding overlay（Sprint 9 T13 延後項） |

---

## 4. 範圍界定

### 做

- core 層節點重要度分析（heuristic）
- 智慧策展（預設只顯示核心節點，無全部顯示）
- 過濾面板手動微調（加入特定隱藏節點）
- 3D XYZ 軸線 + 背景網格 + 軸標示
- 效能優化（ViewState + graph-adapter + 渲染）
- 3D 佈局改善（力導向參數調整）
- Graph JSON 擴充（node role 欄位）
- AI 輔助分類（P1）
- Sprint 9 P1 收尾（P1）

### 不做

- 三種故事視角（Sprint 11）
- 分層佈局引擎（Sprint 11）
- 路徑佈局引擎（Sprint 11）
- 多語言 Python/Java（Phase 4）
- 2D 模式網格（只做 3D）
- 自訂主題

---

## 5. 團隊

| 角色 | Agent | 職責 |
|------|-------|------|
| L1 領導 | tech-lead | 節點重要度分析演算法設計、效能 profiling、架構設計、Review、Gate 回報 |
| 後端開發 | backend-architect | core 層節點重要度分析、Graph JSON 擴充、AI 輔助分類 |
| 前端開發 | frontend-developer | 智慧策展 graph-adapter、3D 空間參考系、效能優化、佈局改善、過濾面板升級 |
| 測試 | test-writer-fixer | 重要度分析測試、策展測試、效能回歸、全面回歸 |

---

## 6. 驗收標準

### 策展驗收（S10-1 + S10-2 + S10-3）

- [ ] core 分析結果中每個節點含 role 欄位（business-logic / cross-cutting / infrastructure / utility / noise）
- [ ] 預設只顯示 business-logic + cross-cutting 節點
- [ ] 無「全部顯示」按鈕或選項
- [ ] 過濾面板可手動加入特定被隱藏節點
- [ ] 典型全端專案（Express + React）策展後節點數 < 80
- [ ] heuristic 分類準確率 > 80%（對已知專案結構）

### 3D 空間驗收（S10-4 + S10-6）

- [ ] 3D 模式顯示 XYZ 軸線 + 背景網格
- [ ] 軸線有 X/Y/Z 標示文字
- [ ] 深色主題下網格淡色半透明，不搶節點視覺
- [ ] 旋轉時軸線和網格始終可見
- [ ] 節點不再擠成一團，分佈有空間感

### 效能驗收（S10-5）

- [ ] 視圖切換、影響分析觸發無明顯卡頓
- [ ] 3D 模式旋轉/縮放流暢（> 30 FPS）
- [ ] 策展後節點數減少，渲染負擔降低

### 資料模型驗收（S10-7）

- [ ] GraphNode 新增 role 欄位
- [ ] Graph JSON 格式向下相容（role 為 optional）
- [ ] API /api/graph 回傳包含 role

### 回歸驗收

- [ ] 現有 893+ tests 全部通過，零回歸
- [ ] Sprint 1-9 核心功能不受影響
- [ ] 2D 模式不受 3D 空間參考系影響

---

## 7. 風險

| 風險 | 等級 | 緩解方式 |
|------|------|---------|
| heuristic 分類不準確 | 中 | 先做保守分類（只隱藏確定是噪音的），不確定的歸為 infrastructure（淡化但不隱藏）。P1 AI 輔助提升準確率 |
| ViewState 拆分影響現有功能 | 中 | 893 tests 保護 + 拆分時保持 API 不變（只改內部實作） |
| 3D 網格影響效能 | 低 | GridHelper 是 Three.js 輕量物件，幾乎零效能影響 |
| Graph JSON 擴充影響現有消費端 | 低 | role 為 optional 欄位，向下相容 |
| 策展太激進（隱藏太多） | 中 | 允許手動加入 + 保守分類策略。寧可多顯示不確定的，也不要漏掉重要的 |

---

## 8. 初步時程

| 階段 | 任務 | 預估 |
|------|------|------|
| 設計 | 節點重要度分析演算法 + 效能 profiling + 3D 空間設計 | 1 天 |
| 實作 — core | 節點重要度分析 + Graph JSON role 欄位 + API 擴充 | 1.5 天 |
| 實作 — web 策展 | graph-adapter 智慧策展 + 過濾面板升級 | 1 天 |
| 實作 — 3D | 空間參考系 + 佈局改善 | 1 天 |
| 實作 — 效能 | ViewState 優化 + graph-adapter 快取 + 渲染優化 | 1.5 天 |
| 實作 — P1 | AI 輔助分類 + Sprint 9 P1 收尾（視時間） | 1 天 |
| 測試 | 重要度分析 + 策展 + 效能 + 回歸 | 1 天 |

---

## G0 審核

**老闆決策**: [x] 通過

**審核意見**: 老闆 2026-04-01 確認通過，無調整。

**確認的流程**: 需求 → 設計 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）
