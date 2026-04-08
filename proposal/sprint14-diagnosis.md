# 產品診斷報告

**專案**: CodeAtlas Sprint 14 — AI 基礎層 + LO 視角 AI 整合
**診斷日期**: 2026-04-05
**診斷人**: PM

---

## Q1: 問題存在嗎？（Problem Validation）

| 檢查項 | 說明 |
|--------|------|
| 痛點來源 | **老闆實測 + 圖稿校正差異報告**。Sprint 13 diff-report 明確指出：LO 群組顯示 214 個方法充斥噪音（LO-1），DJ 步驟 19 步充斥 SQLAlchemy 語法（DJ-1），方法列表只有函式名沒有業務描述（LO-4, DJ-2）。使用者看到 `select_from()` `stmt.where()` 根本不知道這個方法在幹嘛。 |
| 頻率 | **每次使用**。只要開啟 LO/DJ 視角就會遇到噪音和看不懂的問題。 |
| 嚴重度 | **高**。核心承諾「5 分鐘看懂專案」無法兌現——使用者看到方法名但不理解業務意義，等於看了也白看。 |
| 現有替代方案 | Sprint 13 用 skip list 做硬編碼過濾，效果有限（仍有噪音），且無法適應不同專案/語言。使用者目前唯一的替代方案是自己去讀原始碼。 |

**結論**: [x] 問題真實存在且值得解決

> 從「看得到結構」到「看得懂業務」是產品質變的關鍵一步。Sprint 12-13 解決了呈現問題，Sprint 14 要解決理解問題。

---

## Q2: 目標用戶是誰？（User Definition）

| 檢查項 | 說明 |
|--------|------|
| 用戶角色 | **所有 CodeAtlas 使用者**：工程師（快速理解陌生專案）、Vibe coder（AI 生成的程式碼看不懂）、非工程角色（PM/QA/老闆看架構） |
| 使用頻率 | 每次打開 CodeAtlas 的 LO 視角就會受益 |
| 技術水平 | **各級皆適用**。工程師看到 MethodRole 分類可以跳過 utility/infra；非工程師靠 AI 一句話摘要直接理解業務邏輯 |
| 關鍵場景 | **場景 1**：新人接手專案 → 開 LO 視角 → 看到方法列表帶 AI 摘要（「JWT Token 驗證」「查詢影片記錄」）→ 30 秒理解業務流程。**場景 2**：PM 看 LO chain → 每一步都有中文描述 → 不需要問工程師「這段在做什麼」。 |

**結論**: [x] 用戶輪廓清晰

> 核心價值鏈：AI 方法分類（過濾噪音）→ AI 方法摘要（理解業務）→ AI chain 解釋（串起流程）。非工程角色受益最大。

---

## Q3: 解法合理嗎？（Solution Fitness）

| 檢查項 | 說明 |
|--------|------|
| 複雜度 vs 價值 | **合理偏高但值得**。需要建立 AI Contract Layer（typed schema）、新增 2 個 Provider（Claude Code CLI + Gemini）、更新 1 個 Provider（Ollama Gemma 4）、Settings UI、LO AI 整合。但這些是一次性基礎建設，Sprint 15 的 SF+DJ 就可以直接複用。 |
| 有沒有更簡單的做法 | **部分有**：(1) 噪音過濾可以用更完善的 rule-based 方法（MethodRole enum 規則分類），不一定需要 AI；(2) 但「一句話摘要」和「chain 步驟解釋」沒有 AI 做不到。**結論**：規則先行 + AI 補充，這正是老闆核准的策略。 |
| 技術可行性 | **可行**。(1) Claude Code CLI spawn 是標準 child_process，無特殊風險；(2) Gemini API 是標準 HTTP REST；(3) AI Contract typed schema 是 TypeScript 強項；(4) MethodRole enum 規則分類基於現有 tree-sitter AST，不需新依賴。 |
| 邊界情況 | (1) Claude Code CLI 未安裝時需 graceful fallback → Disabled 模式；(2) AI 回應格式不符 schema → 需要 validation + fallback；(3) AI 回應慢 → 需要 loading 狀態 + 快取機制；(4) Ollama 未啟動 → 現有錯誤處理已有，可複用。 |

**結論**: [x] 解法合理

> 「規則先分類、AI 後解釋」的雙層策略是正確的。規則保底確保無 AI 也能用，AI 加分讓體驗質變。

---

## Q4: 範圍明確嗎？（Scope Clarity）

| 檢查項 | 說明 |
|--------|------|
| 必做（Must Have） | (1) AI Contract Layer（typed schema for MethodSummary, ChainExplanation）(2) MethodRole enum + 規則分類引擎 (3) Claude Code CLI Provider (4) Google Gemini API Provider (5) Ollama Gemma 4 更新 (6) Settings UI AI Provider 管理 (7) Prompt Input Budget 三級 (8) LO 方法角色分類（規則+AI）(9) LO 方法一句話摘要 (10) LO chain 步驟解釋 (11) LO 噪音智慧過濾 |
| 不做（Out of Scope） | (1) SF 目錄摘要 → Sprint 15 (2) DJ 端點描述 + 步驟語義 → Sprint 15 (3) AI evidence mode UI（信心分數視覺化）→ 後續 (4) AI 自然語言搜尋改進 → 後續 (5) AI 專案概述改進 → 後續 (6) 多語言支援 → Sprint 16 |
| 驗收標準 | (1) Settings Popover 可選擇 4 種 Provider 並連線測試 (2) LO groups 卡片方法列表只顯示業務相關方法（utility/framework_glue 被過濾）(3) LO groups 每個方法旁有 AI 一句話摘要 (4) LO chain 每個步驟有 AI 生成描述 (5) AI 關閉時仍可使用規則分類 (6) pnpm build + pnpm test 通過 |
| 依賴 | Sprint 13 已完成，無前置依賴。現有 `packages/core/src/ai/` 目錄有完整的 Provider 架構可擴展。 |

**結論**: [x] 範圍清晰可執行

> 11 項必做功能可分為三大塊：基礎層（#1-7）、LO 整合（#8-11）。邊界清晰，SF/DJ 明確排除到 Sprint 15。

---

## Q5: 符合架構嗎？（Architecture Alignment）

**已讀取**：`.knowledge/architecture.md` v3.0、`.knowledge/postmortem-log.md` v1.0

| 檢查項 | 說明 |
|--------|------|
| 三層分離 | **符合**。AI Contract + MethodRole + Provider 都放在 `packages/core/src/ai/`（core 層）。Settings UI 放在 `packages/web/`（web 層）。不破壞三層分離原則。 |
| 資料流向 | **符合**。core 產出 AI 分析結果 → 寫入 Graph JSON → web 讀取渲染。不繞過正規路徑。Claude Code CLI Provider 透過 child_process spawn，遵循現有 Provider interface。 |
| 命名規範 | **符合**。新型別 PascalCase（`MethodSummary`, `MethodRole`, `ChainExplanation`）、新檔案 kebab-case（`claude-code.ts`, `gemini.ts`, `method-role-classifier.ts`）、package scope `@codeatlas/*`。 |
| 歷史教訓 | **需注意**：postmortem-log 記錄「API 端點遺漏」問題，分派任務時需附 Provider interface checklist 確保每個 Provider 實作完整。另外「JSON.parse 無 try-catch」提醒 AI 回應解析必須有 try-catch + validation。 |
| 現有 AI 模組 | **可擴展**。`packages/core/src/ai/` 已有 `types.ts`（SummaryProvider interface）、`disabled.ts`、`openai.ts`、`anthropic.ts`、`ollama.ts`、`index.ts`（createProvider factory）。新 Provider 只需實作相同 interface 並在 factory 註冊。 |

**結論**: [x] 符合架構

> 現有 AI 模組架構設計良好，新增 Provider 和 Contract Layer 是自然擴展，不需要大改架構。

---

## Q6: 風險可控嗎？（Risk Assessment）

| 風險類型 | 評估 |
|---------|------|
| 時間風險 | **中等**。11 項功能 1 個 Sprint 偏滿，但基礎層（Contract + Provider）和 LO 整合可以並行推進。Settings UI 可複用 SettingsPopover 現有 AI 設定區塊。風險點：Claude Code CLI spawn 的跨平台相容性（Windows cmd vs bash）。 |
| 技術風險 | **低-中**。(1) Claude Code CLI spawn 是新模式，需要處理 stdin/stdout/stderr、timeout、process cleanup（中等）。(2) AI 回應格式不穩定，需要 robust validation（低，用 zod schema 可解）。(3) MethodRole 規則引擎需要足夠的 heuristic 規則（低，從 Sprint 13 skip list 升級）。 |
| 回歸風險 | **低**。AI 功能是純新增，不修改現有分析邏輯。MethodRole 替換 skip list 需要確保過濾效果不退步。Settings UI 改動 SettingsPopover 需確保現有五個區塊不壞。 |
| 維護風險 | **低**。AI Contract Layer 的 typed schema 反而降低維護成本——所有 AI 輸出有型別保障。Provider 實作獨立，新增/移除不影響其他 Provider。 |

**結論**: [x] 風險可控

> 最大風險是 Claude Code CLI 的跨平台 spawn 處理，建議優先實作 + 測試。其餘風險都可控。

---

## 診斷摘要

| # | 診斷問題 | 結論 | 備註 |
|---|---------|------|------|
| Q1 | 問題存在嗎？ | ✅ 真實存在且值得解決 | diff-report 15 項中多項指向「看得到但看不懂」 |
| Q2 | 目標用戶是誰？ | ✅ 用戶輪廓清晰 | 所有使用者受益，非工程角色受益最大 |
| Q3 | 解法合理嗎？ | ✅ 解法合理 | 規則先行 + AI 補充，雙層策略正確 |
| Q4 | 範圍明確嗎？ | ✅ 範圍清晰可執行 | 11 項必做，SF/DJ 明確排除 |
| Q5 | 符合架構嗎？ | ✅ 符合架構 | 現有 AI 模組可自然擴展 |
| Q6 | 風險可控嗎？ | ✅ 風險可控 | Claude Code CLI spawn 是最大風險點 |

## 總體建議

[x] 建議通過 G0，可進入開發

## 附加建議

1. **L1 進入計畫模式**：派工時要求 Tech Lead 先規劃再執行，確保 AI Contract schema 設計正確
2. **Claude Code CLI 優先驗證**：建議 T1 或 T2 就做 Claude Code CLI Provider 的 POC，提早發現跨平台問題
3. **MethodRole 規則引擎獨立測試**：規則分類不依賴 AI，可以獨立跑測試驗證覆蓋率
4. **AI 回應 validation 必須用 zod**：所有 AI 輸出 parse 後用 zod schema validate，不合格就 fallback
