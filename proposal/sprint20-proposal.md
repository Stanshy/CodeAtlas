# Sprint 提案書: Sprint 20 — 啟動體驗改造

> **提案人**: PM
> **日期**: 2026-04-09
> **專案**: CodeAtlas
> **Sprint 類型**: UX 改造 + CLI 架構調整（cli + web）
> **前置 Sprint**: Sprint 19（✅ 完成 — Wiki 知識輸出 + Obsidian 知識圖）
> **狀態**: 待 G0 審核

---

## 1. 目標

CodeAtlas 目前的啟動方式是 CLI 驅動：使用者必須在終端機指定掃描路徑和 AI Provider 才能使用（`codeatlas web /path --ai-provider ollama`）。這對非工程師用戶（PM/QA/老闆）不友好，且 Web 端已有的設定頁（AI Provider 選擇、連線測試）與 CLI flag 存在功能重疊。

本 Sprint 將啟動方式從 CLI 驅動改為 **Web 驅動**：

1. **零參啟動**：`codeatlas` 一個指令直接開瀏覽器，不需要任何參數
2. **Web 端專案選擇**：在瀏覽器中選擇要掃描的專案路徑，取代 CLI 指定
3. **全域處理進度**：掃描→解析→建圖→AI 分析，每一步都有即時進度顯示
4. **專案記憶**：記住最近開啟的專案，下次一鍵切換

改造後體驗：`npm install -g codeatlas && codeatlas` → 自動開瀏覽器 → 選路徑 → 看進度 → 完成，全程不需要碰終端機。這是開源前的第一印象體驗，必須做好。

---

## 2. 範圍定義

### 做

| # | 功能/任務 | 優先級 | 說明 |
|---|----------|--------|------|
| S20-1 | **零參啟動模式** | P0 | `codeatlas` 不帶路徑啟動 server，進入「選擇專案」模式。自動開瀏覽器。現有 `codeatlas web [path]` / `codeatlas analyze [path]` / `codeatlas wiki [path]` 仍保留向後相容 |
| S20-2 | **歡迎頁 — 專案選擇** | P0 | Web 首頁：路徑輸入框 + 最近開啟清單 + 「開始分析」按鈕。無已分析專案時顯示歡迎畫面。有已分析專案時顯示專案列表可快速進入 |
| S20-3 | **路徑驗證 API** | P0 | POST /api/project/validate — 驗證路徑是否存在、是否為目錄、是否有原始碼。回傳驗證結果 + 檔案統計（檔案數、語言分佈） |
| S20-4 | **掃描觸發 API** | P0 | POST /api/project/analyze — 接受路徑，觸發完整分析（scan → parse → build graph）。回傳 jobId |
| S20-5 | **處理進度 API** | P0 | GET /api/project/progress/:jobId — 回傳各階段進度（scanning / parsing / building / ai_analyzing），每階段有 0-100% + 當前處理的檔案名。支援 SSE（Server-Sent Events）即時推送，備案 polling |
| S20-6 | **進度頁 — 即時顯示** | P0 | 分析中的全螢幕進度頁：多階段進度條（掃描→解析→建圖→AI 分析）+ 當前檔案名 + 預估剩餘時間。完成後自動跳轉到三視角 |
| S20-7 | **專案記憶** | P1 | 記錄最近開啟的專案路徑（最多 10 個），儲存在 `~/.codeatlas/recent.json`（全域，不綁專案）。歡迎頁顯示最近清單 |
| S20-8 | **專案切換** | P1 | 已在分析視圖中時，Toolbar 新增「切換專案」按鈕，回到歡迎頁。不需要重啟 server |
| S20-9 | **首次引導流程** | P1 | 第一次使用時（`~/.codeatlas/` 不存在），歡迎頁多一步 AI Provider 設定引導。復用現有 AISettingsSection 元件。之後可在 Settings 中隨時更改 |
| S20-10 | **CLI flag 降級** | P1 | `--ai-provider` / `--port` / `--ai-key` 等 CLI flag 保留向後相容，但 Web 端設定可覆蓋 CLI 初始值。優先級：Web 設定 > CLI flag > .codeatlas.json > 環境變數 > 預設值 |
| S20-11 | **過時測試清理** | P0 | Sprint 19 G3 附條件：修正或移除 35 個過時測試（3D 殘留 14 個 + multilang 7 個 + Tab 期望值 2 個 + AI prompt 4 個 + AI 設定 2 個 + LO 互動 4 個 + misc 2 個） |
| S20-12 | **測試** | P0 | 歡迎頁 + 進度頁 + API + 專案記憶 + 零參啟動 測試 |
| S20-13 | **文件更新** | P0 | feature-spec + api-design + CLAUDE.md 更新 |

### 不做（明確排除）

- 拖放資料夾（瀏覽器安全限制，使用者需手動輸入或貼上路徑）
- 多專案同時分析（一次只分析一個專案）
- 遠端專案分析（僅支援本地路徑）
- 雲端同步專案記錄（純本機 ~/.codeatlas/recent.json）
- i18n 中英多語系（推到 Sprint 21）
- 開源發佈（推到 Sprint 22）

---

## 3. 流程決策（G0 核心產出）

### 步驟勾選

| 勾選 | 步驟 | 說明 | 對應關卡 | 備註 |
|------|------|------|---------|------|
| [x] | 需求分析 | 本文件 | G0 | 必選 |
| [x] | 設計 | API 設計 + 進度推送架構 | — | |
| [x] | UI 圖稿 | 歡迎頁 + 進度頁 mockup + **逐場景截圖** | G1: 圖稿審核 | 全新頁面。HTML mockup 完成後必須截圖每個場景存成圖片，作為前端開發基準 |
| [x] | 實作 | cli + web + server 改動 | G2: 程式碼審查 | |
| [x] | 測試 | API + 元件 + E2E + 過時測試清理 | G3: 測試驗收 | |
| [x] | 文件 | feature-spec + api-design + CLAUDE.md | G4: 文件審查 | |
| [ ] | 部署 | — | — | 不需 |
| [ ] | 發佈 | — | — | Sprint 22 |

### 確認的流程

```
需求 → 設計 → UI 圖稿 → G1（圖稿審核）→ 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）→ 文件 → G4（文件審查）
```

### 阻斷規則

- [x] G1（圖稿）通過前不得開始前端實作（歡迎頁 + 進度頁是全新 UI）

---

## 4. 團隊分配

| 角色 | Agent | 負責範圍 |
|------|-------|---------|
| L1 領導 | tech-lead | 整體架構、API 設計、Review |
| L2 CLI | backend-architect | 零參啟動 + 路徑驗證 + 掃描觸發 + 進度 API |
| L2 Web | frontend-developer | 歡迎頁 + 進度頁 + 專案切換 + 首次引導 |
| L2 測試 | test-writer-fixer | 新功能測試 + 35 個過時測試清理 |
| DD | ui-designer | 歡迎頁 + 進度頁 G1 圖稿 |

---

## 5. 風險評估

| 風險 | 可能性 | 影響 | 緩解措施 |
|------|--------|------|---------|
| SSE 在某些代理/防火牆後不可用 | 中 | 中 | 備案 polling（GET /api/project/progress/:jobId），SSE 連線失敗自動降級 |
| 路徑輸入 UX 不佳（手動打字） | 中 | 低 | 專案記憶 + 最近清單減少重複輸入；autocomplete 可考慮但不在本 Sprint |
| 零參啟動與現有 CLI flag 互動衝突 | 低 | 高 | 明確優先級鏈：Web 設定 > CLI flag > config file > env > default |
| 進度估算不準（百分比跳動） | 中 | 低 | 各階段獨立進度，用檔案數/已處理數計算，不做跨階段合併百分比 |
| 大型專案掃描時間長（>30 秒） | 中 | 中 | 進度頁即時顯示當前檔案名，使用者知道在處理中。加 cancel 按鈕 |

---

## 6. 失敗模式分析

| 失敗場景 | 可能性 | 影響 | 偵測方式 | 緩解措施 |
|---------|--------|------|---------|---------|
| 路徑不存在或無權限 | 高 | 低 | validate API 回傳 error | 前端顯示明確錯誤訊息 + 建議 |
| 分析中途 crash | 低 | 高 | Job 狀態變 failed | 進度頁顯示錯誤 + 重試按鈕 |
| SSE 連線斷開 | 中 | 低 | 前端偵測 EventSource close | 自動降級 polling + 重連 |
| recent.json 讀寫失敗 | 低 | 低 | try-catch | 靜默失敗，不影響核心功能 |
| 使用者輸入 Windows 長路徑（>260 字元） | 低 | 中 | validate API 檢查 | 提示路徑過長 |

---

## 7. 可觀測性

> 壞了怎麼知道？

- **日誌策略**: server 啟動模式（零參/帶路徑）記 INFO、分析各階段起止記 INFO、錯誤記 ERROR
- **關鍵指標**: 分析完成率、各階段平均耗時、SSE 連線成功率
- **前端狀態**: 進度頁有明確的 loading / error / completed 三態，不會卡在空白

---

## 8. Rollback 計畫

| 項目 | 說明 |
|------|------|
| 程式碼回滾 | git revert Sprint 20 commits，回到 `codeatlas web [path]` 模式 |
| DB 回滾 | 無 DB 變更。刪除 `~/.codeatlas/recent.json` 即恢復初始狀態 |
| 判斷標準 | 零參啟動模式導致現有 CLI 使用者無法正常使用 |
| 負責人 | Tech Lead |

---

## 9. 驗收標準

- [ ] G1 圖稿 HTML mockup 完成後，每個場景/狀態逐一截圖存為圖片（PNG），存放於 `proposal/references/sprint20/screenshots/`
- [ ] 前端實作結果與 G1 截圖逐畫面比對，佈局/配色/間距/字級一致
- [ ] `codeatlas` 零參啟動 → 自動開瀏覽器 → 顯示歡迎頁
- [ ] 歡迎頁可輸入路徑 → 點擊開始 → 進入進度頁
- [ ] 進度頁即時顯示各階段進度（掃描/解析/建圖），不卡頓
- [ ] 分析完成自動跳轉到三視角 + Wiki Tab
- [ ] 最近開啟清單可記住並快速切換專案
- [ ] `codeatlas web /path` 舊用法仍正常運作（向後相容）
- [ ] `codeatlas analyze` / `codeatlas wiki` 舊用法仍正常運作
- [ ] 35 個過時測試全部修正或移除，零失敗
- [ ] 勾選的所有關卡皆通過

---

## 附錄 A：API 設計草案

### 新增 API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/project/status` | 目前伺服器狀態（idle / analyzing / ready） + 當前專案路徑 |
| POST | `/api/project/validate` | 驗證路徑。Body: `{ path: string }`。回傳 `{ valid, reason?, stats? }` |
| POST | `/api/project/analyze` | 觸發分析。Body: `{ path: string }`。回傳 `{ jobId }` |
| GET | `/api/project/progress/:jobId` | 分析進度。支援 `Accept: text/event-stream` 走 SSE |
| GET | `/api/project/recent` | 最近開啟清單。回傳 `RecentProject[]` |
| DELETE | `/api/project/recent/:index` | 刪除最近清單中的一個項目 |

### 進度回傳格式

```typescript
interface AnalysisProgress {
  jobId: string;
  status: 'queued' | 'scanning' | 'parsing' | 'building' | 'ai_analyzing' | 'completed' | 'failed';
  stages: {
    scanning:    { status: StageStatus; progress: number; current?: string; total?: number; done?: number };
    parsing:     { status: StageStatus; progress: number; current?: string; total?: number; done?: number };
    building:    { status: StageStatus; progress: number };
    ai_analyzing?: { status: StageStatus; progress: number; current?: string; total?: number; done?: number };
  };
  error?: string;
  startedAt: string;
  completedAt?: string;
}

type StageStatus = 'pending' | 'running' | 'completed' | 'skipped' | 'failed';
```

### 專案記憶格式

```typescript
// ~/.codeatlas/recent.json
interface RecentProjects {
  projects: RecentProject[];
  maxItems: 10;
}

interface RecentProject {
  path: string;           // 絕對路徑
  name: string;           // 目錄名
  lastOpened: string;     // ISO timestamp
  stats?: {
    fileCount: number;
    languages: string[];  // ['typescript', 'python']
  };
}
```

---

## 附錄 B：頁面流程圖

```
┌──────────────────────────────────────────────────────────────┐
│                     codeatlas（零參啟動）                       │
│                            ↓                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                     歡迎頁                               │  │
│  │                                                         │  │
│  │  ┌─────────────────────────────────┐                    │  │
│  │  │  📂 輸入專案路徑                  │                    │  │
│  │  │  [/path/to/project          ] [開始分析]              │  │
│  │  └─────────────────────────────────┘                    │  │
│  │                                                         │  │
│  │  最近開啟的專案：                                         │  │
│  │  ┌─────────────────────────────────┐                    │  │
│  │  │ 📁 my-project     (TS/JS)  3分鐘前 │ → [開啟]        │  │
│  │  │ 📁 api-service    (Python) 1小時前 │ → [開啟]        │  │
│  │  │ 📁 spring-app     (Java)   昨天    │ → [開啟]        │  │
│  │  └─────────────────────────────────┘                    │  │
│  │                                                         │  │
│  │  ⚙️ AI 設定（首次顯示引導）                               │  │
│  └─────────────────────────────────────────────────────────┘  │
│                            ↓ 點擊開始分析                      │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                     進度頁                               │  │
│  │                                                         │  │
│  │  正在分析：/path/to/project                              │  │
│  │                                                         │  │
│  │  ■■■■■■■■■■■■■■■■■■□□  掃描檔案    90%  (450/500)      │  │
│  │  ■■■■■■■■■□□□□□□□□□□□  解析結構    45%  auth-service.ts │  │
│  │  □□□□□□□□□□□□□□□□□□□□  建立圖譜    等待中               │  │
│  │  □□□□□□□□□□□□□□□□□□□□  AI 分析     等待中（可選）       │  │
│  │                                                         │  │
│  │                    [取消]                                 │  │
│  └─────────────────────────────────────────────────────────┘  │
│                            ↓ 完成自動跳轉                      │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              三視角 + Wiki（現有介面）                     │  │
│  │  [SF] [LO] [DJ] [Wiki]              [切換專案] [⚙️]     │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 附錄 C：CLI 啟動模式對照

| 指令 | 行為 | 說明 |
|------|------|------|
| `codeatlas` | 零參啟動 → 歡迎頁 | **新增**（本 Sprint） |
| `codeatlas web` | 同零參啟動 | 向後相容，等同 `codeatlas` |
| `codeatlas web /path` | 直接分析指定路徑 → 跳過歡迎頁 → 進度頁 → 三視角 | 向後相容 |
| `codeatlas analyze /path` | 純 CLI 分析（不開瀏覽器） | 不變 |
| `codeatlas wiki /path` | 純 CLI wiki 輸出 | 不變 |
| `codeatlas --port 3001` | 零參啟動，自訂 port | flag 保留 |
| `codeatlas web /path --ai-provider ollama` | 帶路徑 + AI 設定 | 向後相容，Web 端可覆蓋 |

### 優先級鏈（高→低）

```
Web 端即時設定（使用者在 UI 操作） 
  > CLI flag（啟動時指定）
    > .codeatlas.json（專案設定檔）
      > 環境變數（CODEATLAS_AI_KEY 等）
        > 預設值
```

---

**G0 審核結果**

**老闆決策**: [x] 通過

**審核意見**: 通過。額外要求：(1) G1 圖稿必須截圖每個場景/部分，存成圖片檔作為開發基準；(2) 前端開發必須嚴格比對圖稿截圖實作，不得自由發揮。

**確認的流程**: 需求 → 設計 → UI 圖稿 → G1（圖稿審核）→ 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）→ 文件 → G4（文件審查）
