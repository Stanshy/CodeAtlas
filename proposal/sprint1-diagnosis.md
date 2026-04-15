# 產品診斷報告

**專案**: CodeAtlas — Sprint 1（專案骨架 + 解析引擎）
**診斷日期**: 2026-03-30
**診斷人**: PM

---

## Q1: 問題存在嗎？（Problem Validation）

> 我們要解決的問題，用戶真的有感嗎？

| 檢查項 | 評估 |
|--------|------|
| 痛點來源 | **市場觀察 + 老闆判斷**。AI coding 工具（Copilot、Claude Code、Cursor）爆發後，程式碼產出速度大幅提升，但「理解既有專案」的成本沒有降低，反而因為生成量增加而上升。 |
| 頻率 | **每天**。工程師接手專案、review PR、onboarding 新人、debug 跨模組問題，每天都會碰到「不知道這專案怎麼接在一起」的問題。 |
| 嚴重度 | **中高**。不解決不會直接流失用戶（因為市場上還沒有主流工具），但會持續浪費大量理解時間。Vibe coder 更嚴重——他們可能完全看不懂 AI 生出來的東西。 |
| 現有替代方案 | ① 手動讀 code + IDE 搜尋（慢、吃經驗）② dependency-cruiser / Madge（能畫依賴圖，但醜、無互動、無 AI）③ Sourcegraph（偏企業、偏搜尋、非視覺化）④ 找人問（不 scale）。**結論：有替代但體驗都不好，尤其缺乏「視覺衝擊 + 互動探索 + AI 解讀」的組合。** |

**結論**: [x] 問題真實存在且值得解決

> AI 時代的專案理解成本是真實痛點，現有工具沒有一個同時做到「好看 + 好用 + AI 輔助 + local-first」。

---

## Q2: 目標用戶是誰？（User Definition）

> 這個功能是給誰用的？他們的使用場景是什麼？

| 檢查項 | 評估 |
|--------|------|
| 用戶角色 | **三層**：① 工程師（接手專案、debug、review）② Vibe coder / 非本科開發者（理解 AI 生成的 code）③ 非工程角色 PM/QA/老闆（理解系統架構） |
| 使用頻率 | ① 工程師：每週數次 ② Vibe coder：每次用 AI 生完 code 後 ③ 非工程：每個 Sprint / 每次需求討論 |
| 技術水平 | 首發主打工程師 + vibe coder，需要會用 npm install，但不需要理解 AST 或 parser 原理 |
| 關鍵場景 | **場景 A**：接手陌生 repo，5 分鐘內看懂模組結構和依賴關係。**場景 B**：AI 生完一個 side project，用 CodeAtlas 快速掌握它建了什麼、怎麼接的。 |

**結論**: [x] 用戶輪廓清晰

> 首發聚焦 JS/TS 工程師 + vibe coder，場景明確：快速理解陌生專案。

---

## Q3: 解法合理嗎？（Solution Fitness）

> 我們提出的解法，是不是最簡單有效的？

| 檢查項 | 評估 |
|--------|------|
| 複雜度 vs 價值 | **中高複雜度，高價值**。tree-sitter 解析 + React Flow 渲染 + D3 力導向 + 動畫 + AI provider，技術棧不輕。但產出物是有強烈差異化的視覺工具，市場上沒有同級競品。 |
| 有沒有更簡單的做法 | ① 純用 Madge/dependency-cruiser 輸出 → 缺互動、缺 AI、缺視覺衝擊力 ② 純用 LLM 分析 code → 不穩定、貴、無結構化圖譜 ③ 混合制（tree-sitter 結構 + LLM 語意）是目前最合理的組合。**沒有更簡單且能達到同等效果的做法。** |
| 技術可行性 | **可行**。tree-sitter 有成熟的 JS/TS grammar，React Flow 有大量生產案例，D3 force layout 是成熟技術。關鍵風險在 tree-sitter Windows 相容性（有 WASM 備案）。 |
| 邊界情況 | ① Barrel export（index.ts re-export 大量模組）可能導致圖譜過於密集 ② Path alias（tsconfig paths、webpack alias）靜態解析困難 ③ Dynamic import 抓不到 ④ Monorepo 內跨 package 引用。**這些 edge case 存在但不致命，Phase 1 可先標記為「未解析」。** |

**結論**: [x] 解法合理

> 混合制（tree-sitter + AI provider）是當前最合理的技術選型。edge case 有風險但可控。

---

## Q4: 範圍明確嗎？（Scope Clarity）

> 這個任務的邊界在哪裡？什麼做、什麼不做？

| 檢查項 | 評估 |
|--------|------|
| 必做（Must Have） | Monorepo 骨架、tree-sitter JS/TS 解析、檔案掃描、import 依賴圖 JSON 輸出、CLI `analyze` 指令、AI Provider 接口定義、本地 web server 基礎 |
| 不做（Out of Scope） | Web UI 渲染（Sprint 2）、動畫（Sprint 2）、AI 實際呼叫（Sprint 3）、多語言（Phase 2）、npm 發佈（Sprint 4）、函式級解析（Phase 2） |
| 驗收標準 | `codeatlas analyze ./project` 能輸出包含正確 file nodes + import edges 的 JSON；100 檔案 < 10 秒；Windows 可用 |
| 依賴 | 無前置依賴，Sprint 1 是全新建置 |

**結論**: [x] 範圍清晰可執行

> Sprint 1 只做解析引擎 + CLI + 骨架，不碰 UI 渲染，邊界明確。

---

## Q5: 符合架構嗎？（Architecture Alignment）

> 這個功能和現有架構一致嗎？會破壞什麼嗎？

**參考文件比對**：

| 文件 | 比對結果 |
|------|---------|
| `.knowledge/architecture.md` | 現有架構參考是通用 Web App 模板。CodeAtlas 是全新專案，不受既有架構限制。但 Monorepo 三層分離（core / web / cli）的設計需要**新增專案專屬架構文件**，現有模板不足以描述。 |
| `.knowledge/coding-standards.md` | 尚未建立。Sprint 1 開發計畫書中需補建。 |
| `.knowledge/postmortem-common.md` | 無相關踩坑紀錄（全新專案）。 |

| 檢查項 | 評估 |
|--------|------|
| IPC 四方同步 | 不適用（非 IPC 架構） |
| 資料流向 | core 掃描本地檔案 → 輸出 JSON → CLI serve 給 Web 前端。資料流向單純，不繞路。 |
| 命名規範 | 需在 dev-plan 中定義：package 名 `@codeatlas/*`、檔案 kebab-case、型別 PascalCase、變數 camelCase |
| 歷史教訓 | 無踩坑紀錄，但 tree-sitter Windows 相容性是已知風險，已列入風險清單 |

**結論**: [x] 需要小幅調整

> 全新專案，不存在破壞既有架構的問題。但需要在 dev-plan 中建立 CodeAtlas 專屬的架構文件和命名規範。

---

## Q6: 風險可控嗎？（Risk Assessment）

> 最壞的情況是什麼？我們能承受嗎？

| 風險類型 | 評估 |
|---------|------|
| 時間風險 | **中**。Sprint 1 範圍是骨架 + 解析引擎，不含 UI 渲染，工作量可控。但 tree-sitter 整合如果遇到 Windows 問題可能吃掉 2-3 天。 |
| 技術風險 | **中**。tree-sitter 本身成熟，但 JS/TS import 解析有 edge case（alias、barrel export、dynamic import）。Phase 1 定義為 heuristic 級，可接受部分不準確。 |
| 回歸風險 | **無**。全新專案，無既有功能可破壞。 |
| 維護風險 | **低**。Monorepo + TypeScript + 三層分離，架構清晰。core 零 UI 依賴，未來擴充不會牽動結構。 |

**最壞情況**：tree-sitter native binding 在 Windows 完全不可用，且 WASM 版效能太差。
**承受能力**：可以。WASM 版是成熟備案，效能差異在 500 檔案以下可接受。如果兩者都不行（極小概率），可退回到 Babel parser（僅 JS/TS）。

**結論**: [x] 風險可控

> 所有風險都有備案。最大風險（tree-sitter Windows）有 WASM 備案 + Babel 最後防線。

---

## 診斷摘要

| # | 診斷問題 | 結論 | 備註 |
|---|---------|------|------|
| Q1 | 問題存在嗎？ | ✅ 問題真實存在且值得解決 | AI 時代專案理解成本上升，現有工具不夠好 |
| Q2 | 目標用戶是誰？ | ✅ 用戶輪廓清晰 | 工程師 + vibe coder，場景：快速理解陌生專案 |
| Q3 | 解法合理嗎？ | ✅ 解法合理 | tree-sitter + React Flow + AI provider 是最合理組合 |
| Q4 | 範圍明確嗎？ | ✅ 範圍清晰可執行 | 只做引擎 + CLI，不碰 UI 渲染 |
| Q5 | 符合架構嗎？ | ⚠️ 需要小幅調整 | 全新專案，需建立專屬架構文件與命名規範 |
| Q6 | 風險可控嗎？ | ✅ 風險可控 | tree-sitter 有 WASM 備案 |

## 總體建議

[x] 建議通過 G0，可進入開發

## 附帶條件

1. **dev-plan 階段需補建**：`.knowledge/architecture.md` 更新為 CodeAtlas 專屬架構（Monorepo 三層分離）
2. **Sprint 1 第一週需完成**：tree-sitter Windows 相容性驗證，結果回報老闆決策用 native 或 WASM

---

**呈報老闆審核**
