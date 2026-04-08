# Sprint 提案書: Sprint 14 — AI 基礎層 + LO 視角 AI 整合

> **提案人**: PM
> **日期**: 2026-04-05
> **專案**: CodeAtlas
> **Sprint 類型**: AI 智慧分析（Phase 4 第二階段）
> **六問診斷**: `proposal/sprint14-diagnosis.md`（全部通過，Q6 風險可控）
> **前置 Sprint**: Sprint 13 — 方法/端點級三視角 + 版面大改版（✅ 已完成，1344 tests）
> **方向決策**: 老闆決策 #20（2026-04-05）— AI 智慧分析拆為 Sprint 14（基礎+LO）+ Sprint 15（SF+DJ）
> **設計原則**: 規則先分類、AI 後解釋。靜態分析決定結構，AI 增添理解。

---

## 1. 目標

Sprint 13 讓使用者「看得到方法名」，但看到 `select_from()` `hashPassword()` 還是不知道這些方法在做什麼、哪些是核心業務邏輯、哪些是框架噪音。

Sprint 14 做兩件大事：
1. **建立 AI 智慧分析基礎層** — AI Contract（typed schema）+ 四種 Provider（Claude Code CLI / Gemini API / Ollama Gemma 4 / Disabled）+ Settings UI + Prompt Input Budget
2. **LO 視角率先落地 AI** — MethodRole 9 分類（規則+AI）+ 方法一句話摘要 + chain 步驟解釋 + 噪音智慧過濾

**一句話驗收**：齒輪開啟 Settings → 選擇 AI Provider → 切到 LO 視角 → 群組卡片只顯示業務方法（噪音過濾）→ 每個方法旁有一句話摘要 → click chain 每步有描述。AI 關閉時仍可用規則分類。

---

## 2. 確認的流程

```
需求 → 設計 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）→ 文件 → G4（文件審查）
```

> **有設計階段** — AI Contract schema + MethodRole 規則引擎 + Provider 介面是新的架構設計，L1 需要先規劃再執行。
> **有 G4** — AI 相關的架構文件需更新（`.knowledge/` 新增 AI 架構設計文件）。

### 阻斷規則

- AI Contract schema 設計完成前不得開始 Provider 實作
- MethodRole 規則引擎完成前不得開始 AI 分類整合（規則先行，AI 後補）

---

## 3. 功能清單

### P0（必做）— AI 基礎層

| # | 功能 | 描述 |
|---|------|------|
| S14-1 | **AI Contract Layer** | 定義所有 AI 輸出的 TypeScript typed schema。核心型別：`MethodSummary`（id, role, confidence, oneLineSummary, businessRelevance, evidence）、`ChainExplanation`（chainId, steps[].description, overallPurpose）、`MethodRoleClassification`（id, role, confidence, sourceSignals）。所有 AI 回應必須經 zod schema validation，不合格 fallback 為規則分類結果 |
| S14-2 | **MethodRole Enum + 規則引擎** | 9 種角色分類：`entrypoint`（route handler/middleware）/ `business_core`（核心業務邏輯）/ `domain_rule`（業務規則驗證）/ `orchestration`（流程編排）/ `io_adapter`（DB/API/file 操作）/ `validation`（輸入驗證）/ `infra`（框架/配置）/ `utility`（工具函式）/ `framework_glue`（框架膠水碼）。規則引擎基於 AST 特徵判斷（export/handler → entrypoint，db.* → io_adapter，validate* → validation 等），不依賴 AI 即可運作 |
| S14-3 | **Prompt Input Budget** | 三級 context 控制。Small ~2K token：單一方法 signature + body，用於方法摘要/角色分類。Medium ~8K token：一條 chain 的所有方法 signature + body + 呼叫關係，用於 chain 解釋。Large ~20K token：目錄結構 + 關鍵檔案摘要，用於目錄/專案概述（Sprint 15 用）。每級有對應的 context builder 函式 |
| S14-4 | **Claude Code CLI Provider** | 透過 `child_process.spawn` 呼叫 Claude Code CLI（`claude -p "prompt"`）。處理 stdin/stdout/stderr、timeout（30s）、process cleanup。偵測 CLI 是否安裝（`which claude` / `where claude`）。推薦但不自動設為預設，讓用戶在 Settings 確認。跨平台相容（Windows cmd + Unix bash） |
| S14-5 | **Google Gemini API Provider** | 呼叫 `generativelanguage.googleapis.com` REST API。支援 Gemini Pro / Gemini Flash 模型選擇。需使用者提供 API key。隱私標示「原始碼片段傳送至 Google」 |
| S14-6 | **Ollama Provider 更新** | 現有 OllamaProvider 基礎上，推薦 Gemma 4 作為預設本地模型。Settings UI 顯示已安裝模型列表（`/api/tags`）。保持向後相容（codellama / llama3 仍可選） |
| S14-7 | **Settings UI — AI Provider 管理** | 齒輪 SettingsPopover 的 AI 設定區塊重做：Provider 選擇（4 種 + 保留 OpenAI/Anthropic）、API key 輸入（Gemini）、Claude Code CLI 偵測狀態、Ollama 連線測試 + 模型列表、隱私標示（哪些 Provider 會送出原始碼）、「測試連線」按鈕 |

### P0（必做）— LO 視角 AI 整合

| # | 功能 | 描述 |
|---|------|------|
| S14-8 | **LO 方法角色分類** | 規則引擎先判斷（基於 AST 特徵：export/handler → entrypoint，db.execute → io_adapter，等）。AI 啟用時：送出方法 signature+body（Small budget），AI 回傳 MethodRole + confidence。規則 vs AI 衝突時：confidence > 0.8 用 AI，否則用規則。分類結果快取（同一方法不重複 AI 呼叫） |
| S14-9 | **LO 方法一句話摘要** | AI 為每個業務方法（role != utility/framework_glue）生成一句話描述。格式：動詞開頭、15 字以內中文（如「驗證 JWT Token」「查詢影片記錄」「推入 Celery 佇列」）。顯示位置：LO 群組卡片方法名旁 + 右側面板方法詳情。AI 關閉時：顯示方法名，不顯示摘要（不 block 功能） |
| S14-10 | **LO Chain 步驟解釋** | 點擊方法進入 chain 視圖後，AI 為每一步生成描述（Medium budget，一次性送出整條 chain）。描述格式：一句話說明這步在做什麼（如「JWT Token 驗證」→「查詢影片記錄」→「推入 Celery 佇列」）。顯示在 chain footer 中間 + 右側面板 LODetailPanel。AI 關閉時：顯示方法名作為步驟描述 |
| S14-11 | **LO 噪音智慧過濾** | 基於 MethodRole 過濾：預設隱藏 `utility` + `framework_glue` 角色的方法。群組卡片底部顯示「+N 個工具方法」可展開。使用者可在 Settings 調整過濾規則（顯示/隱藏哪些角色）。目標：LO 群組從 214 個方法 → 40-60 個業務方法 |

### P1（應做，視時間）

| # | 功能 | 描述 |
|---|------|------|
| S14-12 | AI 快取持久化 | AI 分析結果寫入 `.codeatlas/ai-cache.json`，下次開啟不重新分析 |
| S14-13 | LO ★ 推薦入口標記 | role=entrypoint + confidence>0.9 的方法前加 ★ 標記 |

---

## 4. 範圍界定

### 做

- AI Contract Layer（全部 typed schema + zod validation）
- MethodRole 9 分類 enum + 規則引擎（不依賴 AI）
- Prompt Input Budget 三級 context builder
- Claude Code CLI Provider（spawn + 跨平台）
- Google Gemini API Provider（REST API）
- Ollama Provider 更新（推薦 Gemma 4）
- Settings UI AI Provider 管理區塊重做
- LO 方法角色分類（規則 + AI 雙層）
- LO 方法一句話摘要（AI 生成）
- LO chain 步驟解釋（AI 生成）
- LO 噪音智慧過濾（基於 MethodRole）

### 不做

- SF 目錄摘要（Sprint 15）
- SF 目錄角色分類（Sprint 15）
- DJ 端點中文描述（Sprint 15）
- DJ 步驟語義描述 + INPUT/OUTPUT/TRANSFORM（Sprint 15）
- AI evidence mode UI / 信心分數視覺化（後續）
- AI 自然語言搜尋改進（後續）
- AI 專案概述改進（後續）
- 多語言 Python/Java（Sprint 16）
- AI streaming 逐字顯示（後續考慮）

---

## 5. 團隊

| 角色 | Agent | 職責 |
|------|-------|------|
| L1 領導 | tech-lead | **計畫模式**：先規劃 AI Contract schema + Provider 架構 + 規則引擎設計，再分派執行。Review、Gate 回報 |
| AI 工程 | ai-engineer | AI Contract Layer + Provider 實作（Claude Code CLI / Gemini / Ollama 更新）+ Prompt 模板 |
| 後端架構 | backend-architect | MethodRole enum + 規則引擎 + context builder + 快取機制 |
| 前端開發 | frontend-developer | Settings UI 重做 + LO 群組卡片 AI 摘要顯示 + chain 步驟描述 + 噪音過濾 UI |
| 測試 | test-writer-fixer | AI Contract validation 測試 + Provider 測試 + 規則引擎測試 + LO 整合測試 + 全面回歸 |

---

## 6. 驗收標準

### AI Contract Layer 驗收（S14-1）

- [ ] `MethodSummary` typed schema 定義完整（id, role, confidence, oneLineSummary, businessRelevance, evidence）
- [ ] `ChainExplanation` typed schema 定義完整（chainId, steps[].description, overallPurpose）
- [ ] `MethodRoleClassification` typed schema 定義完整
- [ ] zod schema 定義完整，可 validate AI 回應
- [ ] validation 失敗時 graceful fallback 為規則分類結果
- [ ] 單元測試覆蓋（含 malformed AI response 場景）

### MethodRole 規則引擎驗收（S14-2）

- [ ] 9 種 MethodRole enum 定義
- [ ] 規則引擎基於 AST 特徵分類（不依賴 AI）
- [ ] 用 VideoBrief 驗證：Routes handler → entrypoint，db.execute → io_adapter，datetime.* → utility
- [ ] AI 關閉時規則引擎仍可獨立運作
- [ ] 單元測試覆蓋 9 種角色至少各 2 個 case

### Provider 驗收（S14-4, S14-5, S14-6）

- [ ] Claude Code CLI Provider：spawn 成功、timeout 處理、CLI 未安裝 fallback
- [ ] Claude Code CLI Provider：Windows + Unix 跨平台相容
- [ ] Gemini API Provider：API 呼叫成功、key 驗證、錯誤處理
- [ ] Ollama Provider：Gemma 4 推薦、模型列表取得、向後相容
- [ ] 所有 Provider 實作 SummaryProvider interface
- [ ] 所有 Provider 輸出經 AI Contract validation
- [ ] 單元測試覆蓋（含 mock）

### Settings UI 驗收（S14-7）

- [ ] Provider 選擇 UI（4 種 + 保留 OpenAI/Anthropic）
- [ ] API key 輸入（Gemini）
- [ ] Claude Code CLI 偵測狀態顯示
- [ ] Ollama 連線測試 + 模型列表
- [ ] 隱私標示正確
- [ ] 「測試連線」按鈕可用

### LO AI 整合驗收（S14-8 ~ S14-11）

- [ ] LO 群組卡片：方法列表只顯示業務相關方法（utility/framework_glue 被過濾）
- [ ] LO 群組卡片：每個方法旁有 AI 一句話摘要（AI 啟用時）
- [ ] LO chain：每個步驟有 AI 生成描述（AI 啟用時）
- [ ] LO 噪音過濾：VideoBrief Routes 從 214 → 40-60 個業務方法
- [ ] AI 關閉時：規則分類仍生效，摘要位置顯示方法名
- [ ] AI 分類結果有快取，同一方法不重複呼叫
- [ ] 群組卡片底部「+N 個工具方法」可展開

### 回歸驗收

- [ ] 現有 1344+ tests 全部通過，零回歸
- [ ] Sprint 1-13 核心功能不受影響
- [ ] pnpm build 全通過
- [ ] 三種視角切換正常
- [ ] 版面骨架（Toolbar + TabBar + RightPanel + Footer）不受影響

---

## 7. 風險

| 風險 | 等級 | 緩解措施 |
|------|------|---------|
| Claude Code CLI spawn 跨平台相容性 | 中 | 優先實作 + 測試。Windows 用 `where claude`，Unix 用 `which claude`。spawn 用 `shell: true` 確保跨平台 |
| AI 回應格式不穩定 | 中 | zod schema validation + structured output prompt + fallback 為規則結果 |
| AI 回應延遲影響 UX | 中 | loading 狀態 + 快取機制 + 非阻塞 UI（AI 結果回來前先顯示規則分類） |
| MethodRole 規則引擎覆蓋率不足 | 低 | 從 Sprint 13 skip list 升級，覆蓋常見 pattern。未知方法 fallback 為 `utility` |
| Gemini API rate limit | 低 | 批量請求 + 快取 + 指數退避重試 |
| 功能量偏大（11 項 P0） | 中 | 基礎層和 LO 整合可並行推進。Settings UI 複用現有區塊 |

---

## 8. Rollback 計畫

| 項目 | 說明 |
|------|------|
| 程式碼回滾 | AI 功能全部為新增模組，回滾 = 移除新檔案即可，不影響 Sprint 13 功能 |
| 判斷標準 | (1) AI Provider 呼叫導致 crash → 回滾該 Provider (2) MethodRole 分類導致方法全部消失 → 回滾過濾邏輯 |
| 負責人 | Tech Lead |

---

## 9. 初步時程

| 階段 | 任務 | 預估 |
|------|------|------|
| 設計（計畫模式） | L1 規劃 AI Contract schema + Provider 架構 + 規則引擎設計 + 任務拆解 | 0.5 天 |
| 實作 — 基礎層 | AI Contract + MethodRole enum + 規則引擎 + Prompt Budget | 1.5 天 |
| 實作 — Provider | Claude Code CLI + Gemini API + Ollama 更新 | 1.5 天 |
| 實作 — Settings UI | Provider 管理 + 連線測試 + 隱私標示 | 0.5 天 |
| 實作 — LO 整合 | 方法角色分類 + 一句話摘要 + chain 描述 + 噪音過濾 | 1.5 天 |
| 測試 | Contract validation + Provider + 規則引擎 + LO 整合 + 全面回歸 | 1 天 |

---

## 10. 關鍵指令：Sprint 14 vs Sprint 13 差異

> **Sprint 13 解決「看得到」，Sprint 14 解決「看得懂」。**

### 核心概念

| | Sprint 13 | Sprint 14 |
|---|-----------|-----------|
| 方法過濾 | skip list 硬編碼（`select`, `where`, `join` 等） | MethodRole 9 分類（規則+AI），智慧過濾 |
| 方法描述 | 只有函式名 | AI 一句話摘要（「驗證 JWT Token」） |
| chain 步驟 | 只有方法名重複 | AI 步驟解釋（每步做什麼） |
| AI Provider | OpenAI / Anthropic / Ollama / Disabled | + Claude Code CLI + Gemini API + Ollama Gemma 4 |
| AI 輸出 | 無 schema，純文字 | AI Contract typed schema + zod validation |
| Settings | 基本 AI 開關 | 完整 Provider 管理 + 連線測試 + 隱私標示 |

### LO 視角改善

| | Sprint 13 結果 | Sprint 14 目標 |
|---|---------------|---------------|
| Routes 方法數 | 214 個（充斥噪音） | 40-60 個（只留業務方法） |
| 方法列表 | `select_from()`, `stmt.where()` 混在一起 | 只顯示 `upload()`, `googleLogin()` 等業務方法 |
| 方法旁邊 | 空白 | AI 一句話摘要 |
| chain 步驟描述 | 方法名重複 | 「JWT 驗證」→「查詢記錄」→「推入佇列」 |

---

## 11. 參考文件

| 文件 | 說明 |
|------|------|
| `proposal/sprint14-diagnosis.md` | 六問診斷報告 |
| `proposal/roadmap.md` | 路線圖 v5.0（Phase 4 = Sprint 13-15） |
| `proposal/sprint13-diff-report.md` | Sprint 13 差異報告（LO-1, DJ-1 噪音問題 = Sprint 14 要根治的） |
| `packages/core/src/ai/` | 現有 AI Provider 架構（types.ts, disabled.ts, openai.ts, anthropic.ts, ollama.ts, index.ts） |
| `.knowledge/sprint13-method-level-architecture.md` | Sprint 13 方法級架構（MethodRole 在此基礎上擴展） |

---

## G0 審核

**老闆決策**: [x] 通過

**審核意見**: 老闆 2026-04-05 確認通過。L1 需先進入計畫模式規劃 AI Contract schema + Provider 架構 + 規則引擎設計，再分派執行。

**確認的流程**: 需求 → 設計 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）→ 文件 → G4（文件審查）
