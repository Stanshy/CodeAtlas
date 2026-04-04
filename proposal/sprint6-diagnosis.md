# 產品診斷報告 — Sprint 6

**專案**: CodeAtlas
**診斷日期**: 2026-03-31
**診斷人**: PM

---

## Q1: 問題存在嗎？（Problem Validation）

| 檢查項 | 說明 |
|--------|------|
| 痛點來源 | 目前 AI 摘要只支援雲端 API（OpenAI/Anthropic），使用者的原始碼片段會傳送到第三方伺服器。對企業內部專案、敏感程式碼、或注重隱私的使用者來說，這是不可接受的。金鑰管理也有安全疑慮（CLI flag 會留在 shell history） |
| 頻率 | 每次使用 AI 摘要功能都會觸發 — 這是核心功能 |
| 嚴重度 | 高 — 老闆決策 #7（程式碼不出站）、#14（Ollama 本地模型）、#15（金鑰安全）明確要求。產品定位為 local-first，隱私是核心承諾 |
| 現有替代方案 | 關閉 AI 功能（disabled 模式），但這樣就失去 AI 摘要的價值 |

**結論**: [x] 問題真實存在且值得解決

---

## Q2: 目標用戶是誰？（User Definition）

| 檢查項 | 說明 |
|--------|------|
| 用戶角色 | ① 企業開發者（公司禁止程式碼外傳）② 隱私敏感的獨立開發者 ③ 離線環境使用者（無網路）④ 所有使用者（金鑰安全影響所有人） |
| 使用頻率 | AI 摘要是常用功能，每次瀏覽節點都可能觸發 |
| 技術水平 | 需要安裝 Ollama（一行指令），門檻低 |
| 關鍵場景 | ① 企業環境：`codeatlas web --ai-provider ollama` → 程式碼完全不出站 ② 設定 `CODEATLAS_AI_KEY` 環境變數 → 金鑰不留在 shell history ③ UI 看到 「⚠️ 原始碼片段將傳送至 OpenAI」→ 明確知道資料去向 |

**結論**: [x] 用戶輪廓清晰

---

## Q3: 解法合理嗎？（Solution Fitness）

| 檢查項 | 說明 |
|--------|------|
| 複雜度 vs 價值 | OllamaProvider 就是一個 HTTP fetch 到 localhost:11434，約 100 行程式碼。環境變數讀取也很輕量。價值極高（兌現 local-first 承諾） |
| 有沒有更簡單的做法 | 沒有 — Ollama 已經是最簡單的本地模型方案（一行安裝、HTTP API、不增加套件體積） |
| 技術可行性 | ✅ Ollama API 是標準 REST（POST /api/generate），與現有 Provider 介面完全相容。環境變數讀取是 Node.js 原生功能 |
| 邊界情況 | ① Ollama 未安裝時的錯誤處理 ② 本地模型回應慢（需 timeout + loading 提示）③ .codeatlas.json 設定檔格式驗證 |

**結論**: [x] 解法合理

---

## Q4: 範圍明確嗎？（Scope Clarity）

| 檢查項 | 說明 |
|--------|------|
| 必做（Must Have） | ① OllamaProvider（localhost HTTP）② 環境變數金鑰（CODEATLAS_AI_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY）③ .codeatlas.json 設定檔 ④ AI 三模式切換（disabled / local / cloud）⑤ 隱私標示（雲端模式 UI 警告）⑥ 金鑰安全（.codeatlas.json 自動 .gitignore）⑦ 錯誤處理強化 |
| 不做（Out of Scope） | 模型微調/訓練、多模型同時使用、AI 專案概述（Phase 3）、自訂 prompt |
| 驗收標準 | Ollama 模式下 AI 摘要可用 + 雲端模式顯示隱私警告 + 環境變數金鑰生效 + .codeatlas.json 設定可用 |
| 依賴 | Sprint 3 已有 AI Provider 介面 + OpenAI/Anthropic 實作。Sprint 5 完成 ✅ |

**結論**: [x] 範圍清晰可執行

---

## Q5: 符合架構嗎？（Architecture Alignment）

| 檢查項 | 說明 |
|--------|------|
| 三層分離原則 | ✅ OllamaProvider 在 core 層（與 OpenAI/Anthropic 同層）。環境變數 + 設定檔在 cli 層。隱私標示在 web 層 |
| 資料流向 | ✅ core 提供 Provider → cli 讀取設定選擇 Provider → web 顯示 AI 狀態 + 隱私標示 |
| 命名規範 | ✅ `ollama.ts`、`config-reader.ts`、`PrivacyBadge.tsx` |
| 歷史教訓 | ① AI Provider 介面已定義，新增 Ollama 只是多一個實作 ② API 端點 `/api/ai/status` 已存在（Sprint 3），需擴充回傳隱私資訊 |

**結論**: [x] 符合架構

---

## Q6: 風險可控嗎？（Risk Assessment）

| 風險類型 | 評估 |
|---------|------|
| 時間風險 | 🟢 低 — OllamaProvider 約 100 行、設定檔讀取簡單、UI 隱私標示輕量 |
| 技術風險 | 🟢 低 — Ollama API 是標準 REST、環境變數是 Node.js 原生、.codeatlas.json 是 JSON 讀取 |
| 回歸風險 | 🟢 低 — 435 tests 保護。新增 Provider 不改現有 Provider 邏輯 |
| 維護風險 | 🟢 低 — 零新依賴（HTTP fetch 即可），不增加 bundle size |

**結論**: [x] 風險可控

---

## 診斷摘要

| # | 診斷問題 | 結論 | 備註 |
|---|---------|------|------|
| Q1 | 問題存在嗎？ | ✅ 真實存在 | 程式碼外傳 + 金鑰安全是核心隱私問題 |
| Q2 | 目標用戶清晰？ | ✅ 清晰 | 企業開發者 + 隱私敏感者 + 離線環境 |
| Q3 | 解法合理？ | ✅ 合理 | Ollama HTTP 最簡方案，約 100 行 |
| Q4 | 範圍明確？ | ✅ 明確 | 7 項核心功能，不含模型微調 |
| Q5 | 符合架構？ | ✅ 符合 | 三層各有對應工作，不破壞現有架構 |
| Q6 | 風險可控？ | ✅ 可控 | 全低風險，零新依賴 |

## 總體建議

[x] 建議通過，可進入 Sprint 6 提案書撰寫

Sprint 6 是 Phase 2 的收官之作，兌現產品的 local-first 隱私承諾。技術複雜度低，風險全低。
