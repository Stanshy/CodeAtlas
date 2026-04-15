# 產品診斷報告 — Sprint 3

**專案**: CodeAtlas
**診斷日期**: 2026-03-31
**診斷人**: PM

---

## Q1: 問題存在嗎？（Problem Validation）

| 檢查項 | 說明 |
|--------|------|
| 痛點來源 | 老闆在 Sprint 2 驗收時明確提出「光看圖不滿足，要能統整邏輯文字說明」。Sprint 2 交付的依賴圖只能看結構，不能「讀懂」模組在做什麼 |
| 頻率 | 每次打開工具都會遇到 — 看到一個節點就想知道它是什麼 |
| 嚴重度 | 不解決 = 工具只是「好看的圖」，無法達成核心價值「5 分鐘看懂專案」 |
| 現有替代方案 | 手動打開原始碼 + 讀 import → 非常耗時，正是我們要解決的痛點 |

**結論**: [x] 問題真實存在且值得解決

> Sprint 2 證明了視覺衝擊力，Sprint 3 要讓衝擊力轉化為理解力。

---

## Q2: 目標用戶是誰？（User Definition）

| 檢查項 | 說明 |
|--------|------|
| 用戶角色 | 工程師（快速理解陌生專案）、Vibe coder（理解 AI 生成的程式碼）、非工程角色（PM/QA/老闆看架構） |
| 使用頻率 | 接手新專案時密集使用，日常偶爾查詢 |
| 技術水平 | 混合 — 工程師需要詳細 import/export 清單，非工程角色需要 AI 口語摘要 |
| 關鍵場景 | ① 點擊模組節點 → 側邊 Panel 顯示詳情 + AI 摘要 ② 搜尋「auth」→ 地圖飛到相關模組並聚焦 |

**結論**: [x] 用戶輪廓清晰

> 兩層用戶需求：技術用戶看結構資訊，非技術用戶讀 AI 摘要。

---

## Q3: 解法合理嗎？（Solution Fitness）

| 檢查項 | 說明 |
|--------|------|
| 複雜度 vs 價值 | 三個功能（面板 + 搜尋 + AI）各自獨立，價值高且複雜度適中 |
| 有沒有更簡單的做法 | 面板和搜尋是標準 UI 功能，沒有更簡單的替代。AI 摘要已有 Sprint 1 預埋的 SummaryProvider 接口，接上即可 |
| 技術可行性 | ✅ 面板：React 側邊欄，讀取 /api/node/:id。✅ 搜尋：前端過濾 + React Flow fitView。✅ AI：SummaryProvider stub 已有，接 OpenAI/Anthropic API 即可 |
| 邊界情況 | AI API key 未設定時的降級體驗（只顯示結構資訊，不顯示摘要）；搜尋無結果時的提示 |

**結論**: [x] 解法合理

> Sprint 1 預埋的 AI 接口大幅降低了實作成本。

---

## Q4: 範圍明確嗎？（Scope Clarity）

| 檢查項 | 說明 |
|--------|------|
| 必做（Must Have） | ① 節點詳情面板（檔案路徑、import/export 清單、被依賴清單、原始碼預覽）② 搜尋定位（檔名/模組名搜尋 → 飛到節點）③ AI 摘要（OpenAI + Anthropic 實際呼叫，可插拔開關）④ AI 離線降級（無 key = 不顯示摘要） |
| 不做（Out of Scope） | 自然語言搜尋（Phase 2）、AI 專案概述（Phase 2）、函式級展開（Phase 2）、.codeatlas.json 設定檔（Phase 3）|
| 驗收標準 | 點擊節點 → 面板顯示完整資訊 + AI 摘要；搜尋 → 地圖飛到節點；無 API key → 純結構模式正常使用 |
| 依賴 | Sprint 2 Web UI ✅、Sprint 1 core API ✅、Sprint 1 AI Provider stub ✅ |

**結論**: [x] 範圍清晰可執行

---

## Q5: 符合架構嗎？（Architecture Alignment）

| 檢查項 | 說明 |
|--------|------|
| 三層分離原則 | ✅ 面板和搜尋是 web 層功能，透過 /api/node/:id 和 /api/graph 取資料。AI 摘要透過 /api/ai/summary 呼叫 core 層 provider。不破壞三層分離 |
| 資料流向 | web → Fastify API → core AI provider → 外部 API。符合現有架構，不繞路 |
| 命名規範 | @codeatlas/web 內新增元件（NodePanel.tsx、SearchBar.tsx），遵循 kebab-case 檔名 + PascalCase 元件 |
| 歷史教訓 | ① API 端點已在 Sprint 1 定義（/api/node/:id、/api/ai/summary），但需確認實作與 api-design.md 一致 ② JSON.parse 防護（postmortem #2）③ resolveWebDir 已修復（postmortem #6） |

**結論**: [x] 符合架構

> 所有 API 端點在 Sprint 1 已定義，Sprint 3 是「接上真實實作」，不需要新增端點。

---

## Q6: 風險可控嗎？（Risk Assessment）

| 風險類型 | 評估 |
|---------|------|
| 時間風險 | 🟡 中等 — 三個功能（面板+搜尋+AI），但各自獨立可並行。AI 接 API 可能有第三方不穩定性 |
| 技術風險 | 🟢 低 — 面板和搜尋是標準 React 功能。AI Provider 接口已預埋，只需填入 HTTP 呼叫 |
| 回歸風險 | 🟢 低 — web 層新增功能，不動 core 和 cli 主邏輯。225 tests 保護回歸 |
| 維護風險 | 🟡 中等 — AI API 可能版本升級，需要維護 provider 實作。但可插拔設計降低耦合 |

**結論**: [x] 風險可控

> 最大風險是 AI API 第三方不穩定，但離線降級設計確保基本功能不受影響。

---

## 診斷摘要

| # | 診斷問題 | 結論 | 備註 |
|---|---------|------|------|
| Q1 | 問題存在嗎？ | ✅ 真實存在 | 老闆明確提出「要文字說明」，核心價值缺口 |
| Q2 | 目標用戶是誰？ | ✅ 用戶清晰 | 技術用戶看結構，非技術用戶讀 AI 摘要 |
| Q3 | 解法合理嗎？ | ✅ 合理 | Sprint 1 預埋 AI 接口，成本低 |
| Q4 | 範圍明確嗎？ | ✅ 明確 | 面板 + 搜尋 + AI 摘要，邊界清楚 |
| Q5 | 符合架構嗎？ | ✅ 符合 | 三層分離不破壞，API 已定義 |
| Q6 | 風險可控嗎？ | ✅ 可控 | AI 第三方風險有離線降級兜底 |

## 總體建議

[x] 建議通過 G0，可進入開發

六問全部通過，無需修改。Sprint 3 是路線圖 Phase 1 M3（功能完整）的關鍵里程碑，完成後 CodeAtlas 從「好看的圖」變成「真正能幫人理解專案的工具」。
