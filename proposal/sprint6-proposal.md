# Sprint 提案書: Sprint 6 — Ollama + 隱私強化

> **提案人**: PM
> **日期**: 2026-03-31
> **專案**: CodeAtlas
> **Sprint 類型**: 功能開發
> **六問診斷**: `proposal/sprint6-diagnosis.md`（全部通過）
> **前置 Sprint**: Sprint 5 — 資料流動視覺化（✅ 已完成）

---

## 1. 目標

兌現 CodeAtlas 的 local-first 隱私承諾。新增 Ollama 本地 AI 支援（程式碼完全不出站）、環境變數金鑰管理、.codeatlas.json 設定檔、UI 隱私標示。使用者明確知道資料去向，企業環境可安心使用。

**一句話驗收**：`codeatlas web --ai-provider ollama` → AI 摘要可用 → 程式碼完全不出站 → UI 顯示「✅ 本地模式」。

---

## 2. 確認的流程

```
需求 → 設計 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）
```

> Sprint 6 無新視覺模式，無 G1。三層都有工作（core + cli + web），但都是輕量擴充。

### 阻斷規則

- 無額外阻斷規則

---

## 3. 功能清單

### P0（必做）

| # | 功能 | 描述 |
|---|------|------|
| S6-1 | OllamaProvider | core 層新增 Ollama AI Provider。HTTP fetch 到 `localhost:11434/api/generate`，支援 codellama / llama3 等模型。與現有 Provider 介面相容 |
| S6-2 | 環境變數金鑰 | cli 層讀取環境變數：`CODEATLAS_AI_KEY`（通用）、`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`。優先於 CLI flag 和設定檔 |
| S6-3 | .codeatlas.json 設定檔 | 專案根目錄設定檔，支援：`aiProvider`（disabled/ollama/openai/anthropic）、`ollamaModel`（預設 codellama）、`port`（預設 3000）、`ignore`（額外忽略目錄）。金鑰不存入設定檔 |
| S6-4 | AI 三模式切換 | 離線（disabled）/ 本地（ollama）/ 雲端（openai/anthropic）。CLI flag `--ai-provider` + 設定檔 + 環境變數三層優先級 |
| S6-5 | 隱私標示 | web UI 顯示當前 AI 模式 + 隱私狀態。雲端模式：「⚠️ 原始碼片段將傳送至 {provider}」。本地模式：「✅ 本地模式 — 程式碼不出站」。離線模式：「AI 已關閉」 |
| S6-6 | 金鑰安全 | .codeatlas.json 自動加入 .gitignore 範本（雖然不存金鑰，但設定檔可能含敏感路徑）。CLI flag `--ai-key` 標示「不建議，金鑰會留在 shell history」|
| S6-7 | 錯誤處理強化 | Ollama 未安裝 → 友善提示安裝方式。Ollama 模型不存在 → 提示 `ollama pull {model}`。連線逾時 → 提示檢查 Ollama 是否運行。解析失敗 → graceful fallback（UI 紅色錯誤標記） |

### P1（應做）

| # | 功能 | 描述 |
|---|------|------|
| S6-8 | API 端點擴充 | `GET /api/ai/status` 擴充回傳隱私資訊：`{ enabled, provider, mode, privacyLevel }` |
| S6-9 | Ollama 模型選擇 | .codeatlas.json 或 CLI flag `--ollama-model` 指定模型（預設 codellama）。UI 顯示當前使用的模型名稱 |

---

## 4. 範圍界定

### 做

- OllamaProvider（localhost HTTP fetch）
- 環境變數金鑰讀取（三層優先級）
- .codeatlas.json 設定檔（讀取 + 驗證）
- AI 三模式切換邏輯
- UI 隱私標示（PrivacyBadge）
- 金鑰安全措施（.gitignore 範本 + CLI 警告）
- 錯誤處理強化（Ollama 未安裝/模型不存在/逾時）
- API 端點擴充（隱私資訊）
- Ollama 模型選擇

### 不做

- 模型微調/訓練
- 多模型同時使用
- AI 專案概述（Phase 3 Sprint 8）
- 自訂 prompt template
- Ollama 自動安裝
- 雲端 AI 用量追蹤

---

## 5. 團隊

| 角色 | Agent | 職責 |
|------|-------|------|
| L1 領導 | tech-lead | 任務拆解、Provider 架構設計、Review、Gate 回報 |
| 後端開發 | backend-architect | OllamaProvider、設定檔讀取、API 擴充 |
| 前端開發 | frontend-developer | PrivacyBadge、UI 模式顯示 |
| 測試 | test-writer-fixer | Provider 測試、設定檔測試、回歸測試 |

---

## 6. 驗收標準

### 功能驗收

- [ ] `--ai-provider ollama` 啟動後，AI 摘要可用（呼叫 localhost:11434）
- [ ] 環境變數 `CODEATLAS_AI_KEY` 設定後，無需 CLI flag 即可使用雲端 AI
- [ ] .codeatlas.json 設定 `aiProvider: "ollama"` 後，無需 CLI flag 即可使用本地 AI
- [ ] UI 顯示隱私標示：雲端模式顯示警告、本地模式顯示安全、離線模式顯示關閉
- [ ] Ollama 未安裝時顯示友善錯誤提示
- [ ] Ollama 模型不存在時提示 `ollama pull {model}`
- [ ] `GET /api/ai/status` 回傳隱私資訊（mode + privacyLevel）

### 安全驗收

- [ ] 金鑰不存入 .codeatlas.json
- [ ] .codeatlas.json 範本含 .gitignore 提示
- [ ] CLI `--ai-key` flag 顯示不建議警告

### 優先級驗收

- [ ] 金鑰優先級：環境變數 > .codeatlas.json（不存金鑰）> CLI flag
- [ ] AI Provider 優先級：CLI flag > .codeatlas.json > 環境變數 > 預設（disabled）

### 回歸驗收

- [ ] 現有 435+ tests 全部通過，零回歸
- [ ] 現有 OpenAI/Anthropic Provider 不受影響
- [ ] 2D/3D 模式所有功能不受影響

---

## 7. 風險

| 風險 | 等級 | 緩解方式 |
|------|------|---------|
| Ollama 未安裝的使用者體驗 | 低 | 友善錯誤提示 + 安裝指引連結 |
| 本地模型回應品質不如雲端 | 低 | UI 顯示模型名稱，使用者自選。不影響功能正確性 |
| 本地模型回應慢 | 低 | timeout 設定（預設 30 秒）+ loading 提示 |
| .codeatlas.json 格式錯誤 | 低 | JSON Schema 驗證 + 友善錯誤訊息 |
| 設定優先級混淆 | 低 | CLI help 明確說明優先級順序 |

---

## 8. 初步時程

| 階段 | 任務 | 預估 |
|------|------|------|
| 設計 | Provider 架構 + 設定優先級 + API 擴充 | 0.5 天 |
| 實作 — core | OllamaProvider + 錯誤處理 | 0.5 天 |
| 實作 — cli | 環境變數 + .codeatlas.json + 設定優先級 | 1 天 |
| 實作 — web | PrivacyBadge + 模式顯示 + API 擴充 | 1 天 |
| 測試 | Provider 測試 + 設定測試 + 回歸 | 1 天 |

---

## G0 審核

**老闆決策**: [x] 通過

**審核意見**: 2026-03-31 老闆核准 G0。

**確認的流程**: 需求 → 設計 → 實作 → G2 → 測試 → G3
