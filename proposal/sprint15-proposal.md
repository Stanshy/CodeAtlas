# Sprint 提案書: Sprint 15 — SF + DJ 視角 AI 整合

> **提案人**: PM
> **日期**: 2026-04-05
> **專案**: CodeAtlas
> **Sprint 類型**: AI 智慧分析（Phase 4 第三階段）
> **六問診斷**: `proposal/sprint15-diagnosis.md`（全部通過，全低風險）
> **前置 Sprint**: Sprint 14 — AI 基礎層 + LO AI（✅ 已完成，1572 tests）
> **方向決策**: 老闆決策 #20（2026-04-05）— Sprint 15 = SF + DJ 視角 AI 整合
> **設計原則**: 規則先分類、AI 後解釋（延續 Sprint 14）

---

## 1. 目標

Sprint 14 完成 AI 基礎層 + LO 視角 AI 整合，LO 群組卡片有了 AI 摘要和噪音過濾。但 SF 和 DJ 視角仍然「看得到但看不懂」——SF 目錄卡片只有檔案數、DJ 步驟只有方法名重複。

Sprint 15 做一件事：**AI 分析覆蓋全部三種視角**。

1. **SF 視角**：目錄卡片有 AI 摘要 + 角色分類 + 檔案展開顯示函式列表
2. **DJ 視角**：端點有中文描述 + 步驟有語義描述 + 右面板有 INPUT/OUTPUT/TRANSFORM
3. **收尾**：Sprint 14 遺留的 2 項 Minor（endpoint-detector 整合 + 測試連線真實化）

**一句話驗收**：SF 每張目錄卡片下方有 AI 一句話摘要；DJ 端點選擇器有中文描述、每步有 AI 描述、右面板有 INPUT/OUTPUT/TRANSFORM；三種視角 AI 體驗一致。

---

## 2. 確認的流程

```
需求 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）→ 文件 → G4（文件審查）
```

> **無設計階段** — 複用 Sprint 14 全部基礎架構（AI Contract + Provider + Prompt Budget），只做前端整合 + prompt 模板新增。
> **無 G1** — SF/DJ 的 AI 顯示位置已在 Sprint 13 圖稿中定義。

### 阻斷規則

- 無（Sprint 14 基礎層已就緒，無前置阻斷）

---

## 3. 功能清單

### P0（必做）— SF 視角 AI 整合

| # | 功能 | 描述 |
|---|------|------|
| S15-1 | **SF 目錄摘要** | AI 為每張目錄卡片生成一句話描述（如「前端路由與頁面元件」「後端 API 端點定義」）。使用 Large budget（~20K token，含目錄結構 + 關鍵檔案摘要）。顯示在目錄卡片副標題位置（檔案數下方，灰色字）。AI 關閉時不顯示 |
| S15-2 | **SF 目錄角色分類** | 規則引擎先判斷目錄角色（路徑 pattern：src/routes→路由層、src/models→資料層），AI 補充。影響卡片左側色條顏色（Sprint 13 diff-report SF-1 一併解決） |
| S15-3 | **SF FUNCTIONS 區塊** | 右側面板 SFDetailPanel 新增 FUNCTIONS 統計 + 檔案展開顯示函式列表。每個函式旁顯示 AI 一句話摘要 + MethodRole badge。解決 Sprint 13 diff-report SF-4 和 SF-5 |

### P0（必做）— DJ 視角 AI 整合

| # | 功能 | 描述 |
|---|------|------|
| S15-4 | **DJ 端點中文描述** | AI 為每個 API 端點生成中文描述（如「影片上傳」「觸發處理」「Google 登入」）。顯示在 DJSelectorCardNode 端點名稱下方。解決 Sprint 13 diff-report DJ-4 |
| S15-5 | **DJ 步驟語義描述** | AI 為每個步驟生成描述（如「JWT Token 驗證」「查詢影片記錄」），取代方法名重複。使用 Medium budget（一條 chain 整體送出）。顯示在 DJStepNode 步驟名稱下方。解決 diff-report DJ-2 |
| S15-6 | **DJ 右面板 INPUT/OUTPUT/TRANSFORM** | 點擊步驟後右面板（DJPanel）新增四個區塊：INPUT（輸入參數）、OUTPUT（回傳值）、TRANSFORM（資料轉換邏輯）、METHOD（方法位置）。AI 生成 INPUT/OUTPUT/TRANSFORM 內容。解決 diff-report DJ-3 |

### P0（必做）— Sprint 14 遺留修復

| # | 功能 | 描述 |
|---|------|------|
| S15-7 | **endpoint-detector 整合 MethodRole** | 將 Sprint 14 的 method-role-classifier 整合到 endpoint-detector.ts，chain step 建構時自動附帶 MethodRole 分類。Sprint 14 T2 Minor 修復 |
| S15-8 | **Settings 測試連線真實化** | SettingsPopover「測試連線」按鈕接真實 Provider 的 isConfigured() + 簡單 AI 呼叫。取代 Sprint 14 的 mock setTimeout。Sprint 14 T7 Minor 修復 |

### P1（應做，視時間）

| # | 功能 | 描述 |
|---|------|------|
| S15-9 | SF 卡片左側色條 | Sprint 13 diff-report SF-1：每張卡片左側 5px 色條區分 Frontend/Backend/Infra |
| S15-10 | AI 快取持久化 | AI 分析結果寫入 `.codeatlas/ai-cache.json`，下次開啟不重新分析 |

---

## 4. 範圍界定

### 做

- SF 目錄摘要 + 角色分類 + FUNCTIONS 區塊
- DJ 端點中文描述 + 步驟語義描述 + INPUT/OUTPUT/TRANSFORM
- Sprint 14 遺留 2 項 Minor 修復
- 新增 SF/DJ 的 prompt 模板 + AI Contract schema（DirectorySummary, EndpointDescription, StepDetail）
- buildLargeContext() 實作（Sprint 14 預留的）

### 不做

- AI evidence mode UI / 信心分數視覺化（後續）
- AI streaming 逐字顯示（後續）
- 多語言 Python/Java（Sprint 16）
- 3D 模式 AI 整合（後續）

---

## 5. 團隊

| 角色 | Agent | 職責 |
|------|-------|------|
| L1 領導 | tech-lead | 整體協調、Review、Gate 回報 |
| AI 工程 | ai-engineer | SF/DJ prompt 模板 + AI Contract 擴展 + buildLargeContext + endpoint-detector 整合 |
| 前端開發 | frontend-developer | SF 卡片摘要 + SFDetailPanel FUNCTIONS + DJ 端點描述 + DJStepNode 描述 + DJPanel INPUT/OUTPUT + Settings 連線真實化 |
| 測試 | test-writer-fixer | SF/DJ AI 整合測試 + 回歸 |

---

## 6. 驗收標準

### SF AI 整合驗收

- [ ] SF 每張目錄卡片有 AI 一句話摘要（灰色字）
- [ ] SF 目錄角色分類正確（路由層/資料層/服務層等）
- [ ] SF 右面板有 FUNCTIONS 統計 + 檔案展開顯示函式列表
- [ ] SF 函式列表每項有 AI 摘要 + MethodRole badge
- [ ] AI 關閉時不 block，不顯示摘要

### DJ AI 整合驗收

- [ ] DJ 端點選擇器每個端點有中文描述
- [ ] DJ 步驟有 AI 語義描述（不再重複方法名）
- [ ] DJ 右面板有 INPUT / OUTPUT / TRANSFORM / METHOD 四個區塊
- [ ] AI 關閉時：步驟顯示方法名，無 INPUT/OUTPUT
- [ ] 用 VideoBrief 驗證：`POST /api/v1/videos/upload` 旁顯示「影片上傳」

### Sprint 14 遺留修復

- [ ] endpoint-detector chain step 附帶 MethodRole
- [ ] Settings 測試連線按鈕呼叫真實 Provider

### 回歸驗收

- [ ] 現有 1572+ tests 全部通過，零回歸
- [ ] LO 視角 AI 功能不受影響
- [ ] pnpm build 全通過

---

## 7. 風險

| 風險 | 等級 | 緩解措施 |
|------|------|---------|
| Large budget 20K token 觸及模型 context limit | 低 | prompt-budget.ts 已有截斷策略，超出時自動截斷 |
| DJ INPUT/OUTPUT 資訊可能不準確 | 低 | AI 生成 + 提示「AI 生成，僅供參考」標示 |
| 工作量比預期大（8 項 P0） | 低 | 基礎層已就緒，主要是前端整合，複雜度低 |

---

## 8. Rollback 計畫

| 項目 | 說明 |
|------|------|
| 程式碼回滾 | SF/DJ AI 功能全部為新增，回滾 = 移除新增程式碼，不影響 Sprint 14 LO AI |
| 判斷標準 | AI 摘要導致 SF/DJ 視角 crash → 回滾對應視角的 AI 整合 |

---

## 9. 參考文件

| 文件 | 說明 |
|------|------|
| `proposal/sprint15-diagnosis.md` | 六問診斷報告 |
| `proposal/sprint14-dev-plan.md` | Sprint 14 計畫書（基礎層架構） |
| `proposal/sprint13-diff-report.md` | Sprint 13 差異報告（SF-1/4/5, DJ-2/3/4 = Sprint 15 要解決的） |
| `packages/core/src/ai/contracts.ts` | AI Contract Layer（Sprint 14 產出） |
| `packages/core/src/ai/prompt-budget.ts` | Prompt Budget（Sprint 14 產出，Large 待實作） |
| `.knowledge/sprint14-ai-architecture.md` | Sprint 14 AI 架構設計 |

---

## G0 審核

**老闆決策**: [x] 通過

**審核意見**: 老闆 2026-04-05 確認通過。複用 Sprint 14 基礎層，主要是前端整合工作。

**確認的流程**: 需求 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）→ 文件 → G4（文件審查）
