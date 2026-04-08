# Sprint 提案書: Sprint 15.1 — AI 資料管線串接（Hotfix）

> **提案人**: PM
> **日期**: 2026-04-05
> **專案**: CodeAtlas
> **Sprint 類型**: Hotfix（Sprint 15 遺漏補完）
> **前置 Sprint**: Sprint 15 — SF + DJ 視角 AI 整合（✅ 已完成，1746 tests）
> **問題來源**: TL 回報 — Sprint 14-15 的 AI 功能無法端到端運作

---

## 1. 問題描述

Sprint 14-15 建了三層 AI 元件，但**缺少串接管線**，導致 AI 功能全部是死的：

```
目前的資料流（斷裂）：

CLI 啟動 → core 分析專案 → 產出 AnalysisResult（無 AI 欄位）
  → /api/graph 回傳 nodes/edges（aiSummary = undefined, methodRole = undefined）
  → 前端 UI 插槽全部 falsy → 不顯示任何 AI 內容

缺的管線：

core 分析完成
  → ① 規則引擎 classifyMethodRole()  寫入 methodRole + roleConfidence（零成本）
  → ② AI Provider analyzeMethodBatch() 寫入 aiSummary（背景非同步）
  → ③ AI Provider explainChain()       寫入 DJ chain 描述（背景非同步）
  → 結果合併回 AnalysisResult
  → /api/graph 回傳帶 AI 欄位的 JSON
  → 前端 UI 插槽亮起來
```

**影響**：Sprint 14-15 的全部 AI 功能（LO 摘要、SF 目錄摘要、DJ 步驟描述、INPUT/OUTPUT/TRANSFORM）用戶都看不到。

---

## 2. 確認的流程

```
需求 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）
```

> **無 G1**（無 UI 變更，前端插槽已就緒）
> **無 G4**（文件在 Sprint 15 已更新，此次只補串接邏輯）

### 阻斷規則

- 無

---

## 3. 功能清單

### P0（必做）

| # | 功能 | 描述 | 層 |
|---|------|------|---|
| S15.1-1 | **規則引擎管線** | core 分析完成後，自動呼叫 `classifyMethodRole()` 為所有 function/method 節點寫入 `methodRole` + `roleConfidence`。這是純規則引擎，不需要 AI，零延遲。 | core |
| S15.1-2 | **AI 分析管線（背景非同步）** | CLI server 啟動後，若 AI Provider 啟用，背景非同步執行：(1) `analyzeMethodBatch()` 為所有函式寫入 `aiSummary` (2) SF 目錄摘要 (3) DJ 端點描述 + 步驟詳情。結果寫入記憶體快取。 | cli |
| S15.1-3 | **API 回應合併** | `/api/graph` 回應時，從快取合併 AI 欄位到 node.metadata（aiSummary, methodRole, roleConfidence）、directoryGraph nodes（aiSummary, role）、endpointGraph（chineseDescription, step descriptions, input/output/transform）。 | cli |
| S15.1-4 | **前端 AI 狀態感知** | 前端透過 `/api/ai/status` 判斷 AI 是否就緒。AI 分析進行中時顯示 loading 狀態，完成後自動刷新。polling 或 SSE 機制。 | web |
| S15.1-5 | **AI 關閉降級** | AI Provider = disabled 時：規則引擎 methodRole 仍然運作（顯示角色分類），AI 摘要相關欄位為 undefined（UI 插槽不顯示）。確保零 crash。 | 全層 |

### P1（應做，視時間）

| # | 功能 | 描述 |
|---|------|------|
| S15.1-6 | AI 快取持久化 | AI 分析結果寫入 `.codeatlas/ai-cache.json`，下次啟動不重新分析（Sprint 15 提案 S15-10 移入） |

---

## 4. 範圍界定

### 做

- 規則引擎管線串接（classifyMethodRole → node.metadata）
- AI Provider 背景非同步分析管線
- API 回應合併 AI 欄位
- 前端 AI 就緒狀態感知 + 自動刷新
- AI 關閉時的降級路徑

### 不做

- 新增任何 AI Contract / Prompt 模板（Sprint 14-15 已完成）
- 修改前端 UI 插槽（Sprint 15 已完成）
- AI streaming 逐字顯示
- 多語言支援

---

## 5. 技術方案概要

### 5.1 規則引擎管線（S15.1-1）

```
core analyzeProject() 最後階段：
  → 遍歷所有 type='function' | 'method' 的 GraphNode
  → 呼叫 classifyMethodRole(node) → 寫入 node.metadata.methodRole + roleConfidence
  → 回傳 enriched AnalysisResult
```

**位置**：`packages/core/src/analyzer.ts`（或 graph-builder 出口）
**成本**：純 regex/pattern match，毫秒級

### 5.2 AI 背景分析管線（S15.1-2）

```
CLI server 啟動後（analyze 完成、server listen 後）：
  → 檢查 AI Provider.supportsAnalysis()
  → 若 true → 開啟背景 Promise：
     1. analyzeMethodBatch(所有函式, budget) → Map<nodeId, aiSummary>
     2. SF 目錄摘要（每個 directoryNode）     → Map<dirId, DirectorySummary>
     3. DJ 端點描述 + 步驟詳情（每條 chain）  → Map<endpointId, descriptions>
  → 結果存入 AICache（記憶體 Map）
  → 標記 aiReady = true
```

**位置**：`packages/cli/src/server.ts`（或新增 `ai-pipeline.ts`）
**錯誤處理**：AI 失敗不影響主流程，catch 後 log warning

### 5.3 API 回應合併（S15.1-3）

```
GET /api/graph handler：
  → 取得 AnalysisResult（已含 methodRole from 規則引擎）
  → 從 AICache 合併 aiSummary 到 graph.nodes[].metadata
  → 從 AICache 合併目錄摘要到 directoryGraph.nodes[]
  → 從 AICache 合併端點/步驟描述到 endpointGraph
  → 回傳 enriched response
```

### 5.4 前端 AI 狀態感知（S15.1-4）

```
擴充 /api/ai/status 回應：
  { enabled: true, provider: "claude-code", ready: false, progress: "analyzing 12/45 methods..." }

前端啟動時：
  → fetch /api/ai/status
  → 若 enabled && !ready → 顯示 AI 分析中 spinner → polling 每 3s
  → ready = true → 重新 fetch /api/graph → UI 插槽更新
```

### 5.5 降級路徑（S15.1-5）

| AI Provider 狀態 | methodRole | aiSummary | DJ descriptions |
|-----------------|------------|-----------|-----------------|
| disabled | ✅ 規則引擎照常 | undefined | undefined |
| enabled + 分析中 | ✅ 規則引擎照常 | loading | loading |
| enabled + 完成 | ✅ 規則引擎照常 | ✅ 有值 | ✅ 有值 |
| enabled + 失敗 | ✅ 規則引擎照常 | undefined | undefined |

---

## 6. 團隊

| 角色 | Agent | 職責 |
|------|-------|------|
| L1 領導 | tech-lead | 整體協調、管線架構設計、Review |
| AI 工程 | ai-engineer | 規則引擎管線 + AI 背景分析管線 |
| 後端開發 | backend-architect | CLI server 合併邏輯 + /api/ai/status 擴充 |
| 前端開發 | frontend-developer | AI 狀態感知 + polling + loading 狀態 |
| 測試 | test-writer-fixer | 端到端管線測試 + 降級測試 |

---

## 7. 驗收標準

### 端到端驗收

- [ ] `codeatlas web` 啟動後，SF 目錄卡片自動出現 AI 摘要（AI 啟用時）
- [ ] DJ 端點有中文描述、步驟有 AI 描述、右面板有 INPUT/OUTPUT/TRANSFORM
- [ ] LO 方法群組有 AI 摘要 + MethodRole badge
- [ ] 三種視角 AI 體驗一致

### 規則引擎驗收

- [ ] 所有 function/method 節點有 methodRole + roleConfidence（不需 AI）
- [ ] AI 關閉時 methodRole 仍然顯示
- [ ] MethodRole badge 在 LO/SF FUNCTIONS 列表中正確顯示

### AI 非同步驗收

- [ ] AI 分析背景執行，不阻塞 server 啟動
- [ ] /api/ai/status 正確回報 ready 狀態
- [ ] 前端 AI 分析中有 loading 提示，完成後自動更新
- [ ] AI Provider 失敗時 graceful 降級（warning log，不 crash）

### 回歸

- [ ] 現有 1746+ tests 全部通過，零回歸
- [ ] pnpm build 全通過
- [ ] AI disabled 時全部功能正常（等同 Sprint 13 行為）

---

## 8. 風險

| 風險 | 等級 | 緩解措施 |
|------|------|---------|
| AI 分析時間過長（大專案） | 中 | 背景非同步 + progress 回報 + 前端 loading 狀態 |
| AI Provider API 失敗 | 低 | try-catch + graceful 降級 + warning log |
| 記憶體快取佔用過多 | 低 | 限制快取大小 + LRU 策略（P1 再處理） |

---

## 9. Rollback 計畫

| 項目 | 說明 |
|------|------|
| 程式碼回滾 | 移除管線串接邏輯，回到 Sprint 15 狀態（AI 功能存在但不觸發） |
| 判斷標準 | 管線導致 server crash 或分析阻塞 → 回滾 |

---

## G0 審核

**老闆決策**: [x] 通過

**審核意見**: 老闆 2026-04-05 確認通過。Sprint 15 遺漏的管線串接，必須補完。

**確認的流程**: 需求 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）
