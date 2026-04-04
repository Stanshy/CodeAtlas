# Sprint 提案書: Sprint 3 — 互動深度 + AI 摘要

> **提案人**: PM
> **日期**: 2026-03-31
> **專案**: CodeAtlas
> **Sprint 類型**: 功能開發
> **六問診斷**: `proposal/sprint3-diagnosis.md`（全部通過）
> **前置 Sprint**: Sprint 2 — 模組依賴圖 + 視覺衝擊（✅ 已完成）

---

## 1. 目標

Sprint 2 讓使用者「看到」架構，Sprint 3 讓使用者「讀懂」架構。

完成後 CodeAtlas 從「好看的圖」變成「真正能幫人理解專案的工具」，達成路線圖 Phase 1 M3（功能完整）里程碑。

**一句話驗收**：點任何一個模組 → 旁邊告訴你「這是什麼、做什麼、跟誰有關」。

---

## 2. 確認的流程

```
需求 → 設計 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）
```

> Sprint 3 無 UI 圖稿審核（G1），因為視覺風格延續 Sprint 2 的霓虹主題，不需要重新設計。面板/搜尋的 UI 遵循 Sprint 2 風格文件（`design/sprint2-visual-style.md`）。

---

## 3. 功能清單

### P0（必做）

| # | 功能 | 描述 |
|---|------|------|
| S3-1 | 節點詳情面板 | 點擊節點 → 右側滑出面板，顯示：檔案路徑、檔案大小、import 清單（誰 import 了此檔）、export 清單（此檔 export 的 symbol）、被依賴清單（誰依賴此檔）、原始碼預覽（syntax highlight） |
| S3-2 | 搜尋定位 | 頂部搜尋框，輸入檔名/模組名 → 即時過濾候選清單 → 選擇後地圖飛到該節點並聚焦高亮 |
| S3-3 | AI 節點摘要 | 面板內「AI 摘要」區塊，呼叫 POST /api/ai/summary → 用口語解釋模組功能、依賴關係、資料流向 |
| S3-4 | AI Provider 實際接通 | OpenAIProvider + AnthropicProvider 填入真實 HTTP 呼叫（Sprint 1 stub → 真實實作） |
| S3-5 | AI 離線降級 | 無 API key → 面板隱藏 AI 摘要區塊，顯示「設定 API key 以啟用 AI 摘要」提示 |
| S3-6 | 節點資訊豐富化 | 面板顯示 metadata：exportCount、importCount、dependencyCount、fileSize、lastModified |

### P1（應做）

| # | 功能 | 描述 |
|---|------|------|
| S3-7 | 摘要快取 | 已生成的 AI 摘要存本地（.codeatlas/cache/），不重複呼叫。面板顯示 cached 狀態 |
| S3-8 | 原始碼 Syntax Highlight | 面板原始碼預覽區使用 syntax highlighting（支援 JS/TS） |
| S3-9 | 搜尋鍵盤快捷鍵 | Ctrl+K / Cmd+K 開啟搜尋框，Esc 關閉 |

---

## 4. 範圍界定

### 做

- 節點詳情面板（右側滑出）
- 搜尋定位（前端過濾 + React Flow fitView）
- AI 摘要（OpenAI + Anthropic 真實呼叫）
- AI 離線降級
- 摘要本地快取
- 原始碼預覽 + syntax highlight
- 節點 metadata 豐富化

### 不做

- 自然語言搜尋（Phase 2 — 需要 embedding）
- AI 專案概述/全局摘要（Phase 2）
- 函式級展開/呼叫鏈（Phase 2）
- .codeatlas.json 設定檔（Sprint 4）
- 效能優化/虛擬化（Sprint 4）
- 多語言支援（Phase 2）

---

## 5. 團隊

| 角色 | Agent | 職責 |
|------|-------|------|
| L1 領導 | tech-lead | 任務拆解、Review、Gate 回報 |
| 前端開發 | frontend-developer | 面板 UI、搜尋 UI、React Flow 整合 |
| 後端開發 | backend-architect | AI Provider 實作、摘要快取、/api/node/:id 強化 |
| 測試 | test-writer-fixer | 單元測試 + 整合測試 |

---

## 6. 驗收標準

### 功能驗收

- [ ] 點擊任意節點 → 右側面板滑出，顯示完整資訊（路徑、import/export、被依賴、metadata）
- [ ] 面板顯示原始碼預覽，有 syntax highlighting
- [ ] 搜尋框輸入檔名 → 即時過濾 → 選擇後地圖飛到節點
- [ ] Ctrl+K 開啟搜尋框
- [ ] 設定 API key 後，面板內顯示 AI 摘要
- [ ] 未設定 API key → 面板正常顯示結構資訊，AI 區塊顯示引導提示
- [ ] AI 摘要結果已快取 → 第二次點擊不重新呼叫 API

### 技術驗收

- [ ] AI Provider HTTP 呼叫正確（OpenAI + Anthropic 各至少一個 test case）
- [ ] 所有新增 API 回應格式與 api-design.md 一致
- [ ] 測試覆蓋率 ≥ 80%
- [ ] 現有 225 tests 無回歸
- [ ] pnpm build 三包通過

### 使用者體驗

- [ ] 面板開閉動畫流暢（Framer Motion）
- [ ] 搜尋響應 < 100ms（前端過濾）
- [ ] AI 摘要等待時有 loading 狀態
- [ ] 面板視覺遵循 Sprint 2 霓虹主題

---

## 7. API 端點確認

> 以下端點在 Sprint 1 api-design.md 已定義，Sprint 3 須確保實作完整。

| 端點 | Sprint 1 狀態 | Sprint 3 需求 |
|------|--------------|---------------|
| GET /api/node/:id | 已實作（基本） | 強化：回傳 sourceCode 欄位 |
| POST /api/ai/summary | 已實作（回傳 stub） | 接通真實 AI 呼叫 + 快取 |
| GET /api/graph | 已實作 | 不變 |
| GET /api/graph/stats | 已實作 | 不變 |
| GET /api/health | 已實作 | 不變 |

---

## 8. 風險

| 風險 | 等級 | 緩解方式 |
|------|------|---------|
| AI API 第三方不穩定/變更 | 中 | 離線降級設計 + 快取減少呼叫次數 |
| AI 回應品質不穩定 | 中 | prompt engineering + 限制回應長度 + 顯示「AI 生成，僅供參考」|
| 面板 + 搜尋 + AI 三功能工作量 | 中 | 三個功能互不依賴，可並行開發 |
| 原始碼讀取效能（大檔案） | 低 | 預覽限制前 100 行，完整原始碼需捲動載入 |

---

## 9. 初步時程

| 階段 | 任務 | 預估 |
|------|------|------|
| 設計 | 面板/搜尋元件設計 + AI prompt 設計 | 0.5 天 |
| 實作 — 前端 | 面板 UI + 搜尋 UI + React Flow 整合 | 2 天 |
| 實作 — 後端 | AI Provider 真實呼叫 + 快取 + /api/node 強化 | 1.5 天 |
| 測試 | 單元測試 + 整合測試 | 1 天 |
| 整合 | 前後端串接 + CLI 更新 | 0.5 天 |

---

## G0 審核

**老闆決策**: [x] 通過 / [ ] 調整後通過 / [ ] 擱置

**審核日期**: 2026-03-31

**審核意見**: 無調整，全數通過。

**確認的流程**: 需求 → 設計 → 實作 → G2 → 測試 → G3
