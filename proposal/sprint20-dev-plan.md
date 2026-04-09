# 開發計畫書: Sprint 20 — 啟動體驗改造

> **撰寫者**: PM
> **日期**: 2026-04-09
> **專案**: CodeAtlas
> **Sprint 提案書**: `proposal/sprint20-proposal.md`（G0 通過 2026-04-09）
> **狀態**: ✅ 完成（G2✅ G3✅ G4✅，老闆 2026-04-09 批准）
> **Base Branch**: agent/tech-lead/2026-04-08
> **Sprint Branch**: sprint-20

---

## 1. 需求摘要

CodeAtlas 目前 CLI 驅動啟動（`codeatlas web /path --ai-provider ollama`），本 Sprint 改為 Web 驅動：`codeatlas` 零參啟動 → 自動開瀏覽器 → 歡迎頁選路徑 → 即時進度顯示 → 完成後進入三視角 + Wiki。同時清理 Sprint 19 G3 附條件遺留的 35 個過時測試。

### 確認的流程

```
需求 → 設計 → UI 圖稿 → G1（圖稿審核）→ 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）→ 文件 → G4（文件審查）
```

### 阻斷規則

- G1（圖稿）通過前不得開始前端實作（歡迎頁 + 進度頁是全新 UI）

---

## 2. 技術方案

### 架構概覽

```
cli 層（修改）
├── index.ts               ← 新增 default command（零參啟動）
├── commands/web.ts        ← 支援無路徑啟動 → server 進入 idle 模式
├── server.ts              ← 新增 /api/project/* 路由群 + SSE 進度推送
├── analysis-runner.ts     ← 新增：封裝 analyze pipeline，支援進度回報
└── recent-projects.ts     ← 新增：~/.codeatlas/recent.json 讀寫

web 層（新增 + 修改）
├── pages/
│   ├── WelcomePage.tsx     ← 新增：歡迎頁（路徑輸入 + 最近專案 + AI 引導）
│   └── ProgressPage.tsx    ← 新增：進度頁（多階段進度條 + SSE 訂閱）
├── components/
│   ├── ProjectInput.tsx    ← 新增：路徑輸入 + 驗證 + 錯誤提示
│   ├── RecentProjects.tsx  ← 新增：最近專案清單
│   ├── ProgressBar.tsx     ← 新增：單階段進度條（可復用）
│   ├── ProgressStages.tsx  ← 新增：多階段進度組合
│   └── Toolbar.tsx         ← 修改：新增「切換專案」按鈕
├── hooks/
│   ├── useAnalysisProgress.ts  ← 新增：SSE 訂閱 + polling fallback
│   └── useProjectStatus.ts    ← 新增：server 狀態查詢
├── contexts/
│   └── AppStateContext.tsx ← 新增：app 全域狀態（welcome / analyzing / ready）
└── App.tsx                ← 修改：根據 app state 路由到對應頁面
```

### 選定方案

**進度推送：SSE（Server-Sent Events）為主、polling 為備案**

| 方案 | 優點 | 缺點 | 結論 |
|------|------|------|------|
| A: SSE | 即時推送、低延遲、單向足夠、瀏覽器原生支援 | 部分 proxy 不支援 | ✅ 選定 |
| B: WebSocket | 雙向通訊 | 過度設計（只需 server→client）、增加複雜度 | ❌ 排除 |
| C: 純 Polling | 簡單 | 延遲高（1-2s 間隔）、浪費請求 | 備案（SSE 失敗時降級） |

**路由方案：App State 驅動（非 URL Router）**

| 方案 | 優點 | 缺點 | 結論 |
|------|------|------|------|
| A: AppState | 簡單、不需引入 router 依賴 | 無 URL 分享 | ✅ 選定 |
| B: React Router | URL 可分享 | 引入新依賴、本地工具不需要 URL 路由 | ❌ 排除 |

### Server 啟動模式

```
codeatlas（零參）
  → server 啟動，mode = 'idle'
  → 前端顯示歡迎頁
  → 使用者選路徑 → POST /api/project/analyze → mode = 'analyzing'
  → 分析完成 → mode = 'ready'

codeatlas web /path（帶路徑）
  → 照舊自動 analyze → server 啟動，mode = 'ready'
  → 前端跳過歡迎頁，直接進入三視角
```

---

## 3. UI 圖稿

| 頁面/元件 | Mockup 檔案 | 說明 |
|----------|------------|------|
| 歡迎頁（全場景） | `proposal/references/sprint20/launch-experience-mockup.html` | 首次空白 / 有最近專案 / AI 引導 / 錯誤狀態 |
| 進度頁（全場景） | 同上 | 掃描中 / 解析中 / 完成 / 失敗 |
| Toolbar 切換專案 | 同上 | 新增按鈕 |

### 圖稿驗收標準

- [ ] 所有新增頁面皆有對應 HTML mockup
- [ ] 可在瀏覽器直接開啟預覽（不需 build）
- [ ] 繁體中文化完成
- [ ] 暗色/亮色主題皆可檢視
- [ ] **每個場景截圖存為 PNG**，存放 `proposal/references/sprint20/screenshots/`

### 截圖清單（G1 強制）

| # | 場景 | 截圖檔名 |
|---|------|---------|
| 1 | 歡迎頁 — 首次使用（空白） | `01-welcome-empty.png` |
| 2 | 歡迎頁 — 有最近專案清單 | `02-welcome-recent.png` |
| 3 | 歡迎頁 — 首次 AI 設定引導 | `03-welcome-ai-setup.png` |
| 4 | 歡迎頁 — 路徑輸入錯誤狀態 | `04-welcome-error.png` |
| 5 | 進度頁 — 掃描中 | `05-progress-scanning.png` |
| 6 | 進度頁 — 解析中 | `06-progress-parsing.png` |
| 7 | 進度頁 — 完成 | `07-progress-completed.png` |
| 8 | 進度頁 — 失敗 | `08-progress-failed.png` |
| 9 | Toolbar — 切換專案按鈕 | `09-toolbar-switch.png` |

---

## 4. 檔案變更清單

### 新增

| 檔案 | 用途 |
|------|------|
| `packages/cli/src/analysis-runner.ts` | 封裝 analyze pipeline，支援進度回報回調 |
| `packages/cli/src/recent-projects.ts` | ~/.codeatlas/recent.json 讀寫 |
| `packages/web/src/pages/WelcomePage.tsx` | 歡迎頁元件 |
| `packages/web/src/pages/ProgressPage.tsx` | 進度頁元件 |
| `packages/web/src/components/ProjectInput.tsx` | 路徑輸入 + 驗證 |
| `packages/web/src/components/RecentProjects.tsx` | 最近專案清單 |
| `packages/web/src/components/ProgressBar.tsx` | 單階段進度條 |
| `packages/web/src/components/ProgressStages.tsx` | 多階段進度組合 |
| `packages/web/src/hooks/useAnalysisProgress.ts` | SSE 訂閱 + polling fallback |
| `packages/web/src/hooks/useProjectStatus.ts` | server 狀態查詢 |
| `packages/web/src/contexts/AppStateContext.tsx` | App 全域狀態 |
| `packages/core/src/types.ts`（擴充） | AnalysisProgress / StageStatus 型別 |

### 修改

| 檔案 | 變更內容 |
|------|---------|
| `packages/cli/src/index.ts` | 新增 default command（零參啟動） |
| `packages/cli/src/commands/web.ts` | 支援無路徑啟動 → idle 模式 |
| `packages/cli/src/server.ts` | 新增 /api/project/* 路由群 + SSE + ServerOptions 擴充 mode 欄位 |
| `packages/web/src/App.tsx` | AppState 路由：welcome → progress → ready |
| `packages/web/src/components/Toolbar.tsx` | 新增「切換專案」按鈕 |

### 刪除

| 檔案 | 原因 |
|------|------|
| 無 | 本 Sprint 不刪除檔案 |

---

## 5. 介面設計

### API 新增

| 方法 | 端點 | 參數 | 回傳 | 說明 |
|------|------|------|------|------|
| GET | `/api/project/status` | — | `{ mode, currentPath?, projectName? }` | server 當前狀態 |
| POST | `/api/project/validate` | `{ path: string }` | `{ valid, reason?, stats? }` | 驗證路徑 |
| POST | `/api/project/analyze` | `{ path: string }` | `{ jobId }` | 觸發分析 |
| GET | `/api/project/progress/:jobId` | Accept: text/event-stream | SSE stream / JSON | 進度推送 |
| GET | `/api/project/recent` | — | `RecentProject[]` | 最近專案 |
| DELETE | `/api/project/recent/:index` | — | `{ success }` | 刪除單筆 |

### 型別定義

```typescript
// --- Server Mode ---
type ServerMode = 'idle' | 'analyzing' | 'ready';

interface ServerStatus {
  mode: ServerMode;
  currentPath?: string;     // 當前分析的專案路徑
  projectName?: string;     // 目錄名
}

// --- Path Validation ---
interface ValidateRequest {
  path: string;
}

interface ValidateResponse {
  valid: boolean;
  reason?: string;          // 'not_found' | 'not_directory' | 'no_source_files' | 'path_too_long'
  stats?: {
    fileCount: number;
    languages: string[];    // ['typescript', 'python', 'java']
  };
}

// --- Analysis Progress ---
interface AnalysisProgress {
  jobId: string;
  status: 'queued' | 'scanning' | 'parsing' | 'building' | 'ai_analyzing' | 'completed' | 'failed';
  stages: {
    scanning:     StageProgress;
    parsing:      StageProgress;
    building:     StageProgress;
    ai_analyzing?: StageProgress;
  };
  error?: string;
  startedAt: string;
  completedAt?: string;
}

interface StageProgress {
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed';
  progress: number;         // 0-100
  current?: string;         // 當前檔案名
  total?: number;           // 總數
  done?: number;            // 已完成數
}

// --- Recent Projects ---
interface RecentProject {
  path: string;             // 絕對路徑
  name: string;             // 目錄名
  lastOpened: string;       // ISO timestamp
  stats?: {
    fileCount: number;
    languages: string[];
  };
}

// --- App State (frontend) ---
type AppPage = 'welcome' | 'progress' | 'analysis';
```

---

## 6. 任務定義與分配

### 任務清單

| # | 任務名稱 | 說明 | 負責 Agent | 依賴 | 並行組 | 對應步驟 | 驗收標準 |
|---|---------|------|-----------|------|--------|---------|---------|
| T1 | 過時測試清理 | 修正或移除 Sprint 19 G3 附條件遺留的 35 個過時測試（3D 殘留 14 + multilang 7 + Tab 2 + AI prompt 4 + AI 設定 2 + LO 互動 4 + misc 2） | test-writer-fixer | 無 | A | 測試 | 35 個失敗測試歸零，pnpm test 全通過 |
| T2 | 型別定義 | core/types.ts 新增 AnalysisProgress、StageProgress、ServerMode、ValidateResponse、RecentProject 型別。pnpm build 零錯誤 | tech-lead | 無 | A | 實作 | 型別可被 cli 和 web 引用，build 零錯誤 |
| T3 | analysis-runner | 新增 packages/cli/src/analysis-runner.ts：封裝 scan→parse→build 管線，接受 onProgress 回調，每步回報階段+百分比+當前檔案 | backend-architect | T2 | — | 實作 | 獨立呼叫可完成分析，進度回調正確觸發 |
| T4 | recent-projects | 新增 packages/cli/src/recent-projects.ts：讀寫 ~/.codeatlas/recent.json，最多 10 筆，CRUD 操作，try-catch 靜默失敗 | backend-architect | T2 | — | 實作 | 讀寫正確、超過 10 筆自動移除最舊、檔案不存在回空陣列 |
| T5 | Project API 路由 | server.ts 新增 /api/project/status、/api/project/validate、/api/project/analyze、/api/project/progress/:jobId（SSE+polling）、/api/project/recent（GET+DELETE）。串接 analysis-runner + recent-projects | backend-architect | T3, T4 | — | 實作 | 6 個端點皆可用，SSE 推送正常，validate 防 path traversal |
| T6 | 零參啟動 | index.ts 新增 default command：無子命令時等同 `codeatlas web`（無路徑）。web.ts 支援無路徑啟動 → server mode='idle'。自動開瀏覽器（open 套件或 child_process） | backend-architect | T5 | — | 實作 | `codeatlas` 可啟動 server + 開瀏覽器。`codeatlas web /path` 向後相容 |
| T7 | CLI flag 降級 | Web 端 POST /api/ai/configure 可覆蓋 CLI 初始值。優先級鏈：Web 設定 > CLI flag > .codeatlas.json > env > default | backend-architect | T6 | — | 實作 | Web 端切換 AI Provider 後，後續請求使用新設定 |
| T8 | G1 圖稿 | HTML mockup：歡迎頁（4 狀態）+ 進度頁（4 狀態）+ Toolbar 切換按鈕。暗色/亮色雙主題。**完成後截圖 9 個場景存 PNG** | ui-designer | 無 | A | UI 圖稿 | 9 張截圖齊全，可在瀏覽器直接預覽 |
| T9 | AppState Context | 新增 AppStateContext：管理 welcome/progress/analysis 三態。App.tsx 根據 state 渲染對應頁面。串接 /api/project/status 判斷初始狀態 | frontend-developer | T8（G1 通過後） | — | 實作 | 三態切換正確，重新整理恢復正確狀態。**比對截圖** |
| T10 | 歡迎頁 | WelcomePage + ProjectInput + RecentProjects。路徑輸入→驗證→錯誤提示。最近專案清單→點擊快速開啟。首次引導（AI 設定，復用 AISettingsSection） | frontend-developer | T9 | — | 實作 | 路徑輸入→驗證→開始分析流程正常。**嚴格比對截圖 01-04** |
| T11 | 進度頁 | ProgressPage + ProgressBar + ProgressStages。SSE 訂閱 useAnalysisProgress（fallback polling）。四階段進度條+當前檔案名。完成自動跳轉。失敗顯示錯誤+重試。取消按鈕 | frontend-developer | T10 | — | 實作 | 進度即時更新，完成跳轉，失敗可重試。**嚴格比對截圖 05-08** |
| T12 | 專案切換 | Toolbar 新增「切換專案」按鈕。點擊回到歡迎頁（AppState → welcome）。不重啟 server | frontend-developer | T11 | — | 實作 | 已在三視角中可切換回歡迎頁。**嚴格比對截圖 09** |
| T13 | 測試 | API 單元測試（validate/analyze/progress/recent）+ 前端元件測試（WelcomePage/ProgressPage）+ SSE 測試 + 向後相容回歸測試 | test-writer-fixer | T12 | — | 測試 | 新測試全通過 + pnpm build 零錯誤 + 舊測試零回歸 |
| T14 | 文件更新 | feature-spec 更新（F-新增：啟動體驗 + 歡迎頁 + 進度頁）、api-design 更新（/api/project/* 6 端點）、CLAUDE.md 索引更新 | tech-lead | T13 | — | 文件 | 文件與程式碼一致 |

### 依賴圖

```
T1（過時測試清理）─────────────────────────────────────────┐
T2（型別定義）→ T3（analysis-runner）→ T5（Project API）    │
T2（型別定義）→ T4（recent-projects）→ T5              │
                                        ↓              │
                                  T6（零參啟動）         │
                                        ↓              │
                                  T7（CLI flag 降級）    │
                                                       │
T8（G1 圖稿）──── G1 阻斷 ──→ T9（AppState）             │
                                  ↓                    │
                            T10（歡迎頁）                │
                                  ↓                    │
                            T11（進度頁）                │
                                  ↓                    │
                            T12（專案切換）               │
                                  ↓←──────────────────┘
                            T13（測試）
                                  ↓
                            T14（文件）
```

### 並行組

- **組 A**（可同時進行）：T1（過時測試清理）、T2（型別定義）、T8（G1 圖稿）
- 其餘為循序依賴

### L1 執行指令

```
請執行 Sprint 20 — 啟動體驗改造。

📄 計畫書：proposal/sprint20-dev-plan.md
📋 提案書：proposal/sprint20-proposal.md（G0 通過，附錄 A/B/C）

你負責的任務：T2（型別定義）、T14（文件更新）
🎨 委派 ui-designer：T8（G1 圖稿 + 截圖）
🔧 委派 backend-architect：T3, T4, T5, T6, T7
🖥️ 委派 frontend-developer：T9, T10, T11, T12
🧪 委派 test-writer-fixer：T1, T13

⚠️ 阻斷規則：T8（G1 圖稿）通過前不得開始 T9-T12（前端實作）

⚠️ 前端開發強制規則（老闆指示）：
前端 T9-T12 必須嚴格比對 G1 截圖實作。
截圖位於 proposal/references/sprint20/screenshots/
每個前端任務驗收標準包含「比對截圖 XX.png」。
不得自由發揮佈局/配色/間距/字級。

第一步請先執行 /task-delegation 建立任務檔案。
```

### 共用檔案（需協調）

| 檔案 | 涉及任務 | 風險等級 |
|------|---------|---------|
| `packages/cli/src/server.ts` | T5, T6, T7 | 中 — 同一後端開發者，循序執行 |
| `packages/web/src/App.tsx` | T9, T10, T11, T12 | 中 — 同一前端開發者，循序執行 |
| `packages/core/src/types.ts` | T2 | 低 — T2 先完成再開始其他 |

---

## 7. 測試計畫

### T1 過時測試清理（35 個）

| 分類 | 數量 | 處理方式 |
|------|------|---------|
| 3D 移除殘留（ViewToggle/CameraPresets/viewState 3D mode） | 14 | 移除 3D 相關 test case |
| Sprint 18 multilang（call-analyzer + python-extractor） | 7 | 修正期望值 |
| T12 四 Tab（TabBar "exactly three tabs"） | 2 | 更新為四 Tab |
| T7 AI prompt 容錯 | 4 | 修正 parseConceptExtractionResponse mock |
| AI 設定（anthropic model + timeout） | 2 | 更新 mock 設定 |
| LO 互動（LOCategoryGroup click） | 4 | 修正事件處理 mock |
| misc | 2 | 逐一排查修正 |

### T13 新功能測試

| 測試檔案 | 測試案例 |
|---------|---------|
| `packages/cli/__tests__/analysis-runner.test.ts` | onProgress 回調觸發、錯誤處理、cancel |
| `packages/cli/__tests__/recent-projects.test.ts` | CRUD、max 10、檔案不存在、讀寫失敗靜默 |
| `packages/cli/__tests__/project-api.test.ts` | validate（正常/不存在/非目錄/無原始碼）、analyze 觸發+jobId、progress SSE、recent GET/DELETE |
| `packages/web/__tests__/WelcomePage.test.tsx` | 空白狀態、有最近專案、輸入路徑驗證、錯誤顯示、AI 引導 |
| `packages/web/__tests__/ProgressPage.test.tsx` | 各階段進度、完成跳轉、失敗重試、取消 |
| `packages/web/__tests__/useAnalysisProgress.test.ts` | SSE 訂閱、SSE 斷線降級 polling、重連 |

---

## 8. 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| SSE 在 proxy/防火牆後不可用 | 進度頁無即時更新 | useAnalysisProgress 偵測 EventSource 失敗自動降級 polling（2s interval） |
| analysis-runner 封裝改動影響現有 analyze | 現有 `codeatlas analyze` 壞掉 | T13 加向後相容回歸測試 |
| 零參啟動與現有 flag 衝突 | CLI 使用者混淆 | 明確優先級鏈 + codeatlas --help 更新 |
| 大型專案（>5000 檔案）進度不準 | 使用者以為卡住 | 顯示當前檔案名 + 「檔案數/已處理數」+ cancel 按鈕 |

---

## 9. 文件更新

完成後需同步更新的文件：

- [x] `.knowledge/specs/feature-spec.md` — 新增 F-啟動體驗（歡迎頁 + 進度頁 + 專案記憶 + 零參啟動）→ v19.0
- [x] `.knowledge/specs/api-design.md` — 新增 /api/project/* 6 個端點 → v9.0
- [x] `CLAUDE.md` — Sprint 20 索引更新

---

## 10. 任務與審核紀錄（備查）

> 每個任務完成後記錄結果，每次 Review/Gate 通過後記錄決策。本區作為 Sprint 完整稽核軌跡。

### 任務完成紀錄

| 任務 | 完成日期 | 結果 | 備註 |
|------|---------|------|------|
| T1 | 2026-04-09 | ✅ 完成 | 35 個過時測試全部修正：3D 移除 14（刪除）+ multilang 7（修正期望）+ Tab 2（四 Tab）+ AI prompt 4（容錯）+ AI 設定 2（model+timeout）+ LO 互動 4（endpointGraph mock）。1986/1986 全通過。 |
| T2 | 2026-04-09 | ✅ 完成 | 12 個型別定義（ServerMode/ServerStatus/ValidateResponse/StageProgress/AnalysisProgress/RecentProject/AppPage 等）。pnpm build 零錯誤。 |
| T3 | 2026-04-09 | ✅ 完成 | analysis-runner.ts：封裝 scan→parse→build 管線，onProgress 回調，AbortSignal 支援。 |
| T4 | 2026-04-09 | ✅ 完成 | recent-projects.ts：~/.codeatlas/recent.json CRUD，max 10，try-catch 靜默失敗。 |
| T5 | 2026-04-09 | ✅ 完成 | 6 個 /api/project/* 端點（status/validate/analyze/progress SSE/recent GET+DELETE）。projectJobs 追蹤。 |
| T6 | 2026-04-09 | ✅ 完成 | 零參啟動：default action → webCommandIdle()，server mode='idle'，自動開瀏覽器。向後相容。 |
| T7 | 2026-04-09 | ✅ 完成 | CLI flag 降級：aiConfiguredByWeb flag，POST /api/ai/configure 設定優先。優先級鏈正確。 |
| T8 | 2026-04-09 | ✅ 完成 | HTML mockup + 9 張 PNG 截圖已產出，待 G1 審核 |
| T9 | 2026-04-09 | ✅ 完成 | AppStateContext：welcome/progress/analysis 三態。App.tsx 路由整合。/api/project/status 判斷初始狀態。 |
| T10 | 2026-04-09 | ✅ 完成 | WelcomePage + ProjectInput + RecentProjects。路徑驗證+錯誤提示+最近專案+AI 引導。嚴格比對截圖 01-04。 |
| T11 | 2026-04-09 | ✅ 完成 | ProgressPage + ProgressBar + ProgressStages + useAnalysisProgress（SSE+polling fallback）。四階段進度+自動跳轉+失敗重試。嚴格比對截圖 05-08。 |
| T12 | 2026-04-09 | ✅ 完成 | Toolbar「📁 切換專案」按鈕。returnToWelcome()。嚴格比對截圖 09。 |
| T13 | 2026-04-09 | ✅ 完成 | 6 個測試檔案，125 個新測試：analysis-runner（19）+ recent-projects（21）+ project-api（34）+ WelcomePage（14）+ ProgressPage（18）+ useAnalysisProgress（19）。2111/2111 全通過，零回歸。 |
| T14 | 2026-04-09 | ✅ 完成 | feature-spec v19.0（Sprint 20 啟動體驗描述）、api-design v9.0（6 個 /api/project/* 端點完整文件）、CLAUDE.md 版本索引更新。 |

### Review 紀錄

| Review 步驟 | 日期 | 結果 | Review 文件連結 |
|------------|------|------|---------------|
| UI 圖稿 Review | 2026-04-09 | ✅ 通過 | `proposal/references/sprint20/launch-experience-mockup.html` + 9 PNG |
| 實作 Review | | | |
| 測試 Review | | | |
| 文件 Review | | | |

### Gate 紀錄

| Gate | 日期 | 決策 | 審核意見 |
|------|------|------|---------|
| G0 | 2026-04-09 | ✅ 通過 | 提案書通過。額外要求：G1 截圖 + 前端嚴格比對圖稿 |
| G1 | 2026-04-09 | ✅ 通過 | 9 場景 HTML mockup + 9 張 PNG 截圖，老闆審核通過 |
| G2 | 2026-04-09 | ✅ 通過 | 14/14 任務完成、2111 tests 全通過、125 新測試、pnpm build 零錯誤。老闆批准。 |
| G3 | 2026-04-09 | ✅ 通過 | 2111/2111 全通過、零回歸。Sprint 19 G3 附條件（35 過時測試）已清理完畢。老闆批准。 |
| G4 | 2026-04-09 | ✅ 通過 | feature-spec v19.0 + api-design v9.0 + CLAUDE.md 索引，文件與程式碼一致。老闆批准。 |

---

**確認**: [x] PM 確認
