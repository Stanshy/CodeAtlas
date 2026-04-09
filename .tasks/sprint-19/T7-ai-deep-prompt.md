# AI 深度分析 Prompt

| 欄位 | 值 |
|------|-----|
| ID | T7 |
| 專案 | CodeAtlas |
| Sprint | Sprint 19 |
| 指派給 | ai-engineer |
| 優先級 | P0 |
| 狀態 | in_review |
| 依賴 | T5 |
| 預估 | 2h |
| 建立時間 | 2026-04-08T07:25:25.000Z |
| 開始時間 | 2026-04-08T08:01:26.247Z |
| 完工時間 | 2026-04-08T08:03:00.731Z |

---

## 任務描述

新增深度分析 prompt 模板，用於 Wiki 頁面的 AI 語義補充：

- 三級 prompt 模板：
  - module 級：模組職責、架構角色、對外服務、設計決策
  - file 級：檔案職責、核心方法一句話描述、資料流說明
  - endpoint 級：端點用途、請求/回應描述、呼叫鏈人類可讀描述
- 遵守附錄 C AI 硬性禁令：
  - 禁止虛構方法/檔案/依賴
  - 禁止生成 wiki-link
  - 禁止修改結構資料
  - AI 輸出前綴 `<!-- @ai-generated -->`
- 規則骨架 + AI 語義分離：規則永遠產出，AI 只填充描述欄位
- 降級行為：AI 失敗時骨架完整，描述欄顯示「（待分析）」

## 驗收標準

- [x] AI 產出可填入 .md 描述欄位
- [x] 降級時骨架仍完整
- [x] 遵守附錄 C 所有禁令
- [x] 三級 prompt 各有模板

---

## 事件紀錄

### 2026-04-08T07:25:25.000Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-08T08:01:26.247Z — 狀態變更 → in_progress
開始執行任務

### 2026-04-08T08:03:00.731Z — 狀態變更 → in_review
建立 packages/core/src/wiki-exporter/ai-prompts.ts，實作 buildWikiSystemPrompt()、buildWikiUserPrompt()、parseWikiAiResponse()。三級 prompt 模板（module/file/endpoint/method）、附錄 C 硬性禁令強制寫入 system prompt、降級回傳空字串。TypeScript 編譯無新增錯誤。
