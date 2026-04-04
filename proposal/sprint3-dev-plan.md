# 開發計畫書: Sprint 3 — 互動深度 + AI 摘要

> **撰寫者**: PM（代 Tech Lead 產出，Tech Lead 開工後確認）
> **日期**: 2026-03-31
> **專案**: CodeAtlas
> **Sprint 提案書**: `proposal/sprint3-proposal.md`
> **狀態**: ✅ Sprint 3 完成（2026-03-31）

---

> 本文件在 G0 通過後由 PM 撰寫，依據提案書中勾選的步驟展開技術細節。

## 1. 需求摘要

Sprint 2 讓使用者「看到」架構，Sprint 3 讓使用者「讀懂」架構。新增三大功能：節點詳情面板（右側滑出面板顯示模組完整資訊）、搜尋定位（快速找到並聚焦模組）、AI 節點摘要（口語化解釋模組功能）。完成後達成 Phase 1 M3 里程碑——功能完整。

### 確認的流程

需求 → 設計 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）

> 無 G1 — 視覺風格延續 Sprint 2 霓虹主題（`design/sprint2-visual-style.md`），不重新設計。

---

## 2. 技術方案

### 選定方案

**前端面板 + 前端搜尋 + 後端 AI 真實呼叫**

| 層 | 技術 | 說明 |
|----|------|------|
| 面板 UI | React + Framer Motion | 右側滑出面板，動畫過渡 |
| 原始碼高亮 | Shiki 或 Prism.js | 輕量 syntax highlighter，支援 JS/TS |
| 搜尋 | 前端記憶體過濾 | 不需後端，直接過濾 graph nodes |
| AI — OpenAI | fetch → OpenAI Chat Completions API | 直接 HTTP 呼叫，不裝 SDK（減少依賴） |
| AI — Anthropic | fetch → Anthropic Messages API | 直接 HTTP 呼叫，不裝 SDK |
| 摘要快取 | .codeatlas/cache/{nodeId-hash}.json | 本地 JSON 檔案，server 端讀寫 |

### 替代方案比較

| 方案 | 優點 | 缺點 | 結論 |
|------|------|------|------|
| A: 直接 HTTP fetch | 零依賴，程式碼簡單 | 需自己處理 error/retry | ✅ 選定 |
| B: 安裝 openai / @anthropic-ai/sdk | SDK 處理 retry/stream | 增加依賴體積，與「輕量」理念衝突 | ❌ 排除 |

### 架構決策

```
前端（web）                          後端（cli server）              外部
┌─────────────────────┐    HTTP    ┌──────────────────┐    HTTP    ┌─────────┐
│ NodePanel.tsx        │ ───────→  │ GET /api/node/:id │            │         │
│   - 詳情顯示         │           │   sourceCode 回傳  │            │         │
│   - AI 摘要按鈕      │ ───────→  │ POST /api/ai/summary │ ──────→ │ OpenAI  │
│                     │           │   快取檢查 → 呼叫 → 存快取 │      │ Claude  │
│ SearchBar.tsx        │           │                    │            │         │
│   - 前端過濾 nodes   │           └──────────────────┘            └─────────┘
│   - fitView 聚焦     │
└─────────────────────┘
```

**不動的**：
- core 層：不修改（types、scanner、parser、analyzer 不動）
- 現有 API 端點：行為不變，僅 `/api/ai/summary` 從 stub 變為真實呼叫

---

## 3. UI 圖稿

Sprint 3 無 G1。面板/搜尋 UI 遵循 Sprint 2 霓虹主題設計語言：
- 面板背景：`bg-overlay`（#1a1a2e）
- 面板邊框：`rgba(255, 255, 255, 0.08)`
- 搜尋框：參照 Sprint 2 Toolbar 風格（backdrop-filter blur）
- 按鈕/互動色：`primary`（#00d4ff）

不適用。

---

## 4. 檔案變更清單

### 新增

| 檔案/目錄 | 用途 |
|----------|------|
| `packages/web/src/components/NodePanel.tsx` | 節點詳情面板（右側滑出） |
| `packages/web/src/components/SearchBar.tsx` | 搜尋框 + 即時過濾候選清單 |
| `packages/web/src/components/CodePreview.tsx` | 原始碼預覽 + syntax highlight |
| `packages/web/src/components/AiSummary.tsx` | AI 摘要區塊（loading/結果/降級提示） |
| `packages/web/src/hooks/useNodeDetail.ts` | 節點詳情載入 hook（fetch /api/node/:id） |
| `packages/web/src/hooks/useSearch.ts` | 搜尋邏輯 hook（前端過濾 + 鍵盤快捷鍵） |
| `packages/web/src/hooks/useAiSummary.ts` | AI 摘要呼叫 hook（fetch /api/ai/summary） |
| `packages/web/src/api/node.ts` | API 呼叫層：getNodeDetail() |
| `packages/web/src/api/ai.ts` | API 呼叫層：getAiSummary() |
| `packages/web/__tests__/node-panel.test.ts` | 面板邏輯測試 |
| `packages/web/__tests__/search.test.ts` | 搜尋邏輯測試 |
| `packages/web/__tests__/ai-summary.test.ts` | AI 摘要測試 |
| `packages/core/__tests__/ai-openai.test.ts` | OpenAI Provider 測試 |
| `packages/core/__tests__/ai-anthropic.test.ts` | Anthropic Provider 測試 |

### 修改

| 檔案 | 變更內容 |
|------|---------|
| `packages/core/src/ai/openai.ts` | stub → 真實 HTTP 呼叫（OpenAI Chat Completions） |
| `packages/core/src/ai/anthropic.ts` | stub → 真實 HTTP 呼叫（Anthropic Messages） |
| `packages/core/src/ai/index.ts` | createProvider 支援傳入 apiKey 參數 |
| `packages/cli/src/server.ts` | /api/ai/summary 加入快取邏輯 + 傳遞 apiKey 到 provider |
| `packages/cli/src/commands/web.ts` | 傳遞 --ai-key / --ai-provider 到 server |
| `packages/web/src/App.tsx` | 整合 NodePanel + SearchBar |
| `packages/web/src/components/GraphCanvas.tsx` | 節點點擊事件 → 開啟面板 |
| `packages/web/src/styles/global.css` | 面板 + 搜尋框樣式 |
| `CLAUDE.md` | 更新 Sprint 3 文件索引 |

### 刪除

無。

---

## 5. 規範文件索引

| 檔案 | 內容 | 狀態 |
|------|------|------|
| `.knowledge/specs/data-model.md` | Node/Edge 型別 — Sprint 3 不變 | ✅ 已建立（v1.0） |
| `.knowledge/specs/api-design.md` | API 端點 — Sprint 3 不新增端點，強化現有 | ✅ 已建立（v1.0） |
| `.knowledge/specs/feature-spec.md` | 需更新 Sprint 3 功能規格（F16~F22） | ⚠️ 待 L1 更新（v3.0） |

---

## 6. 任務定義與分配

> L1 讀取本節後按依賴順序執行。第一步先執行 `/task-delegation` 建立 `.tasks/` 檔案，系統自動追蹤進度。

### 任務清單

| # | 任務名稱 | 說明 | 負責 Agent | 依賴 | 對應步驟 | 驗收標準 |
|---|---------|------|-----------|------|---------|---------|
| T1 | AI Provider 真實實作 | OpenAIProvider + AnthropicProvider 填入真實 HTTP 呼叫（fetch，不裝 SDK），含 prompt 設計、error handling、timeout | backend-architect | 無 | 實作 | 傳入有效 API key 可取得摘要回應，無效 key 回傳明確錯誤 |
| T2 | AI 摘要快取 | server 端快取邏輯：.codeatlas/cache/{hash}.json，命中快取直接回傳（cached: true），未命中呼叫 provider 後存檔 | backend-architect | T1 | 實作 | 同一節點第二次呼叫不打外部 API，回應含 cached: true |
| T3 | Server 傳遞 AI 設定 | cli --ai-key / --ai-provider 參數傳到 server → createProvider，/api/ai/summary 整合快取 | backend-architect | T1, T2 | 實作 | `codeatlas web --ai-key xxx --ai-provider openai` 可啟用 AI |
| T4 | 節點詳情面板 UI | NodePanel.tsx：右側滑出面板（Framer Motion），顯示檔案路徑、metadata、import/export 清單、被依賴清單 | frontend-developer | 無 | 實作 | 點擊節點 → 面板滑出，顯示完整資訊，再點擊關閉 |
| T5 | 原始碼預覽 | CodePreview.tsx：面板內原始碼區塊，syntax highlight（Shiki/Prism），限制前 100 行預覽 | frontend-developer | T4 | 實作 | 面板內可看到原始碼，有語法高亮，大檔案不卡頓 |
| T6 | AI 摘要 UI | AiSummary.tsx：面板內 AI 摘要區塊，loading spinner → 結果顯示 → 無 key 降級提示 | frontend-developer | T4 | 實作 | 有 key → 顯示摘要；無 key → 顯示引導提示；loading 有 spinner |
| T7 | 搜尋定位 | SearchBar.tsx + useSearch.ts：頂部搜尋框，即時過濾 node 清單，選擇後 fitView 聚焦 + 高亮 | frontend-developer | 無 | 實作 | 輸入檔名 → 過濾候選 → 選擇 → 地圖飛到節點 |
| T8 | 搜尋鍵盤快捷鍵 | Ctrl+K / Cmd+K 開啟搜尋框，Esc 關閉，上下鍵選擇候選 | frontend-developer | T7 | 實作 | Ctrl+K 開啟，Esc 關閉，鍵盤可完成完整搜尋流程 |
| T9 | GraphCanvas 整合 | 修改 GraphCanvas.tsx + App.tsx：節點 onClick → 開面板，整合 SearchBar + NodePanel | frontend-developer | T4, T7 | 實作 | 三大功能在同一 UI 協同工作，無衝突 |
| T10 | 前後端串接 | web API 層（node.ts + ai.ts）呼叫 server 端點，確保資料格式正確 | frontend-developer | T3, T9 | 實作 | 面板 → /api/node/:id 取資料；AI → /api/ai/summary 取摘要 |
| T11 | 單元測試 + 整合測試 | AI Provider 測試（mock HTTP）、快取測試、搜尋邏輯測試、面板 hooks 測試 | test-writer-fixer | T1~T10 | 測試 | 覆蓋率 ≥ 80%，225 既有 tests 無回歸，新增 tests 全通過 |

### 依賴圖

```
T1（AI Provider 實作）
├── T2（快取）
│   └── T3（Server 傳遞 AI 設定）───┐
│                                    │
T4（面板 UI）─────────────────────────┤
├── T5（原始碼預覽）                  │
├── T6（AI 摘要 UI）                  │
│                                    ▼
T7（搜尋定位）                   T9（GraphCanvas 整合）
├── T8（鍵盤快捷鍵）                  │
│                                    ▼
│                              T10（前後端串接）
│                                    │
└─────────────────────────────── T11（測試）
```

### 可並行的任務

| 並行組 | 任務 | 條件 |
|--------|------|------|
| 組 1 | T1 + T4 + T7 | 三大功能線可同時開始 |
| 組 2 | T2 + T5 + T6 + T8 | 各自前置完成後可同時 |
| 組 3 | T3 + T9 | 後端線和前端線各自完成後 |

### L1 執行指令

> PM 產出此區塊，老闆複製貼入 tech-lead session 即可啟動。

```
請執行 Sprint 3 — 互動深度 + AI 摘要 的開發計畫。

📄 計畫書：proposal/sprint3-dev-plan.md
📋 確認的流程：需求 → 設計 → 實作 → G2 → 測試 → G3

⚠️ 無 G1 阻斷 — 視覺延續 Sprint 2 霓虹主題，無需圖稿審核。
⚠️ feature-spec.md 需更新為 v3.0，新增 F16~F22。

🔧 委派 backend-architect：T1（AI Provider 實作）、T2（快取）、T3（Server AI 設定）
🖥️ 委派 frontend-developer：T4（面板 UI）、T5（原始碼預覽）、T6（AI 摘要 UI）、T7（搜尋定位）、T8（鍵盤快捷鍵）、T9（GraphCanvas 整合）、T10（前後端串接）
🧪 委派 test-writer-fixer：T11（單元測試 + 整合測試）

📌 三大功能線可並行：
- 後端線：T1 → T2 → T3
- 面板線：T4 → T5 + T6
- 搜尋線：T7 → T8
- 匯流：T9（整合）→ T10（串接）→ T11（測試）

📌 Sprint 1/2 教訓提醒：
- API 回應格式必須與 api-design.md 一致
- 所有 JSON.parse 必須包 try-catch
- 所有外部 HTTP 呼叫必須有 timeout + error handling
- 色碼嚴格引用 theme.ts，不硬編碼
- 版本號統一 0.1.0

📌 現有 server.ts 已有完整的 /api/node/:id 和 /api/ai/summary 端點：
- /api/node/:id 已回傳 sourceCode（Sprint 1 實作）
- /api/ai/summary 已有完整流程，只需：(1) provider 真實呼叫 (2) 加入快取 (3) 傳遞 apiKey

第一步請先執行 /task-delegation 建立任務檔案。
```

### 共用檔案（需協調）

| 檔案 | 涉及任務 | 風險等級 |
|------|---------|---------|
| `packages/web/src/App.tsx` | T4, T7, T9 | 高（面板+搜尋+整合都改） |
| `packages/web/src/components/GraphCanvas.tsx` | T9 | 中（加 onClick） |
| `packages/cli/src/server.ts` | T2, T3 | 中（加快取+AI 設定傳遞） |
| `packages/core/src/ai/index.ts` | T1, T3 | 中（createProvider 簽名變更） |

---

## 7. 測試計畫

### 單元測試

| 測試檔案 | 測試案例 |
|---------|---------|
| `ai-openai.test.ts` | 有效 key → 回傳摘要、無效 key → 拋錯、timeout 處理、回應格式驗證 |
| `ai-anthropic.test.ts` | 同上，Anthropic Messages API 格式 |
| `ai-cache.test.ts` | 首次呼叫 → 存快取、第二次呼叫 → 讀快取（不打 API）、快取檔案格式驗證 |
| `search.test.ts` | 搜尋匹配正確（部分檔名、大小寫不敏感）、空搜尋回傳全部、無結果處理 |
| `node-panel.test.ts` | useNodeDetail hook 呼叫正確端點、metadata 顯示完整、import/export 清單正確 |
| `ai-summary.test.ts` | useAiSummary hook loading 狀態、成功顯示摘要、無 key 降級提示 |

### 整合測試

| 測試檔案 | 測試案例 |
|---------|---------|
| `integration.test.ts` | 節點點擊 → 面板開啟 → API 呼叫 → 資料顯示（mock server） |

---

## 8. 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| AI API 第三方不穩定 | 高 | timeout 10s + retry 1 次 + 離線降級 + 快取 |
| AI 回應品質不穩定 | 中 | prompt engineering 固定格式 + 限制 max_tokens + 顯示「AI 生成」標記 |
| 面板 + 搜尋 + AI 整合複雜度 | 中 | 三條線並行開發，T9 才匯流整合 |
| Syntax highlight 套件體積 | 低 | 選擇輕量方案（Prism.js ~10KB），或 lazy load |
| App.tsx 共用檔案衝突 | 中 | T9 統一整合，T4/T7 各自開發獨立元件 |

---

## 9. 文件更新

完成後需同步更新的文件：

- [x] `CLAUDE.md` — Sprint 3 文件索引已在提案書階段更新
- [x] `.knowledge/specs/feature-spec.md` — 已更新至 v3.0，新增 F16~F22
- [x] `.knowledge/specs/api-design.md` — 已更新至 v2.0，新增 /api/ai/status
- [x] `.knowledge/architecture.md` — 已更新至 v3.0（Sprint 2 收尾時補上）

---

## 10. 任務與審核紀錄（備查）

> 每個任務完成後記錄結果，每次 Review/Gate 通過後記錄決策。本區作為 Sprint 完整稽核軌跡。

### 任務完成紀錄

| 任務 | 完成日期 | 結果 | 備註 |
|------|---------|------|------|
| T1 | 2026-03-31 | ✅ 完成 | OpenAI + Anthropic 真實 HTTP 呼叫，buildPrompt + truncateCode 共用工具，timeout 10s |
| T2 | 2026-03-31 | ✅ 完成 | cache.ts：sha256 hash + JSON 存讀，損壞自動 miss |
| T3 | 2026-03-31 | ✅ 完成 | CLI --ai-key/--ai-provider，server /api/ai/status，快取整合 |
| T4 | 2026-03-31 | ✅ 完成 | NodePanel.tsx 右側滑出面板，metadata + imports/exports + slots |
| T5 | 2026-03-31 | ✅ 完成 | CodePreview.tsx 行號 + 100 行截斷 + 展開 |
| T6 | 2026-03-31 | ✅ 完成 | AiSummary.tsx 三態（loading/success/not configured）+ regenerate |
| T7 | 2026-03-31 | ✅ 完成 | SearchBar.tsx + useSearch.ts 前端過濾 + fitView 聚焦 |
| T8 | 2026-03-31 | ✅ 完成 | Ctrl+K/Cmd+K 開啟，Esc 關閉，ArrowUp/Down + Enter |
| T9 | 2026-03-31 | ✅ 完成 | GraphCanvas onNodeClick + App.tsx 整合三大功能 |
| T10 | 2026-03-31 | ✅ 完成 | api/node.ts + api/ai.ts + types 更新，前後端串接 |
| T11 | 2026-03-31 | ✅ 完成 | 266 tests 全通過（+41 新增），core 217 / web 42 / cli 7 |

### Review 紀錄

| Review 步驟 | 日期 | 結果 | Review 文件連結 |
|------------|------|------|---------------|
| 實作 Review（程式碼品質 + 規範） | 2026-03-31 | 通過 | Blocker:0 Major:0 Minor:0 — 全部通過。無 any，JSON.parse 全包 try-catch，API 格式與規範一致，266 tests 通過 |
| 測試 Review（覆蓋率 + 整合） | 2026-03-31 | 通過 | Blocker:0 Major:0 Minor:0 — 266 tests（+41 新增），core 217 / web 42 / cli 7，零回歸，build 全通過 |

### Gate 紀錄

| Gate | 日期 | 決策 | 審核意見 |
|------|------|------|---------|
| G0 | 2026-03-31 | ✅ 通過 | 六問診斷通過，提案書全數通過，無調整 |
| G2 | 2026-03-31 | ✅ 通過 | 程式碼品質合格。對程式碼+對規範 Review 全通過，0 Blocker / 0 Major。所有 JSON.parse 包 try-catch，外部 HTTP 呼叫有 timeout，無 any，命名規範正確。 |
| G3 | 2026-03-31 | ✅ 通過 | 測試驗收通過。266 tests 全通過（+41 新增），core 217 / web 42 / cli 7，零回歸。pnpm build 三個 package 全通過。 |
| 功能驗收 | 2026-03-31 | ✅ 通過 | 老闆親自驗收：面板詳情 ✅、搜尋定位 ✅、AI 摘要（OpenAI key 接通）✅。PM 6 項 checklist 通過。附帶：/api/ai/status 需補到 api-design.md |

---

**確認**: [x] L1 確認 / [x] Tech Lead 確認
