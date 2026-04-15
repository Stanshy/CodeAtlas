# 產品診斷報告

**專案**: CodeAtlas Sprint 15 — SF + DJ 視角 AI 整合
**診斷日期**: 2026-04-05
**診斷人**: PM

---

## Q1: 問題存在嗎？（Problem Validation）

| 檢查項 | 說明 |
|--------|------|
| 痛點來源 | **Sprint 13 diff-report 未解項目**。SF 缺少目錄摘要（SF-4）、檔案展開沒有 function 資訊（SF-5）。DJ 步驟描述只重複方法名（DJ-2）、缺少 INPUT/OUTPUT/TRANSFORM 區塊（DJ-3）、端點卡片缺少中文描述（DJ-4）。Sprint 14 只解決了 LO 視角，SF 和 DJ 仍然「看得到但看不懂」。 |
| 頻率 | **每次使用 SF/DJ 視角**。 |
| 嚴重度 | **中高**。LO 已有 AI 摘要，SF/DJ 沒有 → 體驗不一致。產品承諾「5 分鐘看懂」在 SF/DJ 上仍未兌現。 |
| 現有替代方案 | 無。SF 目錄卡片只有檔案數和行數，DJ 步驟只有方法名重複。 |

**結論**: [x] 問題真實存在且值得解決

---

## Q2: 目標用戶是誰？（User Definition）

| 檢查項 | 說明 |
|--------|------|
| 用戶角色 | 所有 CodeAtlas 使用者，特別是非工程角色（PM/QA/老闆用 SF 看架構全貌、用 DJ 追蹤請求鏈） |
| 使用頻率 | 每次開啟 SF 或 DJ 視角 |
| 技術水平 | 各級適用。SF 目錄摘要幫非工程師理解「這個資料夾做什麼」，DJ 步驟描述幫理解「這個 API 請求經過什麼流程」 |
| 關鍵場景 | **場景 1**：老闆開 SF 看專案架構 → 每張目錄卡片有 AI 摘要（「前端路由與頁面元件」）→ 30 秒理解全局。**場景 2**：QA 開 DJ 追蹤 API → 每步有描述（「驗證 Token」→「查詢記錄」→「推入佇列」）+ INPUT/OUTPUT 區塊 → 知道資料怎麼流動 |

**結論**: [x] 用戶輪廓清晰

---

## Q3: 解法合理嗎？（Solution Fitness）

| 檢查項 | 說明 |
|--------|------|
| 複雜度 vs 價值 | **低複雜度高價值**。Sprint 14 已建好全部基礎（AI Contract + Provider + Prompt Budget），Sprint 15 只需要：(1) 新增 SF/DJ 的 prompt 模板 (2) 前端整合顯示。不需要新架構。 |
| 有沒有更簡單的做法 | 已經是最簡單的做法了——複用 Sprint 14 基礎層，只做前端整合。 |
| 技術可行性 | **完全可行**。AIAnalysisProvider 已有 analyzeMethodBatch/explainChain，SF/DJ 只需呼叫現有方法 + 新增 prompt 模板。 |
| 邊界情況 | (1) SF Large budget (20K) 可能觸及 token limit → 截斷策略已在 prompt-budget.ts 定義 (2) DJ 步驟可能很多 → Medium budget 截斷 |

**結論**: [x] 解法合理

---

## Q4: 範圍明確嗎？（Scope Clarity）

| 檢查項 | 說明 |
|--------|------|
| 必做（Must Have） | (1) SF 目錄摘要 (2) SF 目錄角色分類 (3) SF FUNCTIONS 區塊 (4) DJ 端點中文描述 (5) DJ 步驟語義描述 (6) DJ 右側面板 INPUT/OUTPUT/TRANSFORM 區塊 |
| 不做（Out of Scope） | AI evidence mode UI、AI 自然語言搜尋、多語言、AI streaming |
| 驗收標準 | SF 每張目錄卡片有 AI 摘要、DJ 每個端點有中文描述、DJ 每步有 INPUT/OUTPUT、AI 關閉時不 block |
| 依賴 | Sprint 14 完成（✅），AI Contract + Provider + Prompt Budget 全部就緒 |

**結論**: [x] 範圍清晰可執行

---

## Q5: 符合架構嗎？（Architecture Alignment）

| 檢查項 | 說明 |
|--------|------|
| 三層分離 | **符合**。新增 prompt 模板在 core 層，前端整合在 web 層。 |
| 資料流向 | **符合**。複用 Sprint 14 的 AIAnalysisProvider → AI Contract → Graph JSON → web 渲染。 |
| 命名規範 | **符合**。新型別 DirectorySummary（PascalCase），新檔案 kebab-case。 |
| 歷史教訓 | Sprint 14 Minor: endpoint-detector 整合延後 + 測試連線 mock。Sprint 15 應一併處理。 |

**結論**: [x] 符合架構

---

## Q6: 風險可控嗎？（Risk Assessment）

| 風險類型 | 評估 |
|---------|------|
| 時間風險 | **低**。基礎層已就緒，Sprint 15 主要是前端整合 + prompt 模板，工作量比 Sprint 14 小很多。 |
| 技術風險 | **低**。全部複用 Sprint 14 架構，無新技術引入。 |
| 回歸風險 | **低**。LO AI 功能不動，只新增 SF/DJ 的 AI 顯示。 |
| 維護風險 | **低**。AI Contract schema 統一管理，新增 SF/DJ schema 是自然擴展。 |

**結論**: [x] 風險可控

---

## 診斷摘要

| # | 診斷問題 | 結論 | 備註 |
|---|---------|------|------|
| Q1 | 問題存在嗎？ | ✅ 真實存在 | SF/DJ「看得到但看不懂」，LO 已解決但體驗不一致 |
| Q2 | 目標用戶？ | ✅ 清晰 | 非工程角色受益最大（SF 看架構、DJ 追 API） |
| Q3 | 解法合理？ | ✅ 合理 | 複用 Sprint 14 基礎，只做整合 |
| Q4 | 範圍明確？ | ✅ 清晰 | 6 項必做，邊界清楚 |
| Q5 | 符合架構？ | ✅ 符合 | 自然擴展，無新架構 |
| Q6 | 風險可控？ | ✅ 可控 | 全部低風險 |

## 總體建議

[x] 建議通過 G0，可進入開發

## 附加建議

1. Sprint 14 的 2 項 Minor 應在 Sprint 15 一併處理（endpoint-detector 整合 + 測試連線真實化）
2. 工作量比 Sprint 14 小，可考慮額外處理 Sprint 13 diff-report 中剩餘的 P2/P3 項目
