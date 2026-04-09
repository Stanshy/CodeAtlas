# CodeAtlas — 產品開發路線圖

> **版本**: v9.0
> **日期**: 2026-04-09
> **撰寫**: PM
> **狀態**: ✅ 已核准
> **變更說明**: Sprint 19 完成（Wiki 知識輸出 + Obsidian 知識圖）。Phase 6 ✅ 全部完成。新增 Phase 7：Sprint 20 啟動體驗改造（零參啟動 + Web 選路徑 + 進度顯示）。i18n 推至 Phase 8 Sprint 21。開源推至 Phase 9 Sprint 22。CLI/VSC 推至 Phase 10 Sprint 23+。老闆決策 #25：啟動體驗優先於 i18n。

---

## 產品定位

**一句話**：讓任何人在 5 分鐘內看懂一個陌生專案的架構與資料流。

**產品形態**：開源 local-first 專案視覺化工具，CLI 入口 + 本地 Web 視覺介面。

**核心差異化**：不是靜態圖表工具，而是一張「活的、可探索的系統地圖」——2D/3D 雙模式，視覺衝擊力就是產品本身。

**隱私承諾**：程式碼不離開本機。Local-first，離線可用。AI 摘要支援本地模型（Ollama），雲端 AI 為可選項且明確標示資料外傳。

**開源策略**：不商業化，不急著上線，做到極致再開源。

---

## 使用方式

```bash
npm install -g codeatlas

# Sprint 20 後（目標體驗）：
codeatlas                    # 零參啟動 → 自動開瀏覽器 → Web 選路徑 + AI 設定

# 現有方式（仍支援）：
codeatlas analyze [path]     # CLI 指定路徑掃描
codeatlas web [path]         # CLI 指定路徑啟動 Web UI
codeatlas wiki [path]        # CLI 輸出知識 Wiki
```

---

## 老闆決策紀錄

| # | 決策 | 日期 |
|---|------|------|
| 1 | 先做「模組依賴圖」+「資料流追蹤圖」（Phase 1 資料流為 heuristic 級） | 2026-03-30 |
| 2 | JS/TS 先行，但產品定位為語言無關 | 2026-03-30 |
| 3 | 視覺效果全保留，衝擊力是核心賣點，不降級 | 2026-03-30 |
| 4 | 開源，不商業化 | 2026-03-30 |
| 5 | 之後做 CLI 強化 + VSC 插件 | 2026-03-30 |
| 6 | AI 可插拔，不綁單一模型商 | 2026-03-30 |
| 7 | Local-first，程式碼不出站 | 2026-03-30 |
| 8 | 首發 demo 用典型全端專案 + AI 生成專案 | 2026-03-30 |
| 9 | 產品形態描述為「local-first 分析工具，CLI 入口 + 本地 Web 視覺介面」 | 2026-03-30 |
| 10 | AI 專案概述延到 Phase 2 | 2026-03-30 |
| 11 | **不急著上線開源，先做到極致** | 2026-03-31 |
| 12 | **新增 3D 視覺化，2D/3D 可切換** | 2026-03-31 |
| 13 | **新增資料流動視覺化（模組 I/O + 路徑追蹤）** | 2026-03-31 |
| 14 | **新增 Ollama 本地模型支援，強化隱私** | 2026-03-31 |
| 15 | **金鑰改用環境變數為主，UI 明確標示雲端 AI 資料外傳** | 2026-03-31 |
| 16 | **Sprint 9 改為控制面板 + 視圖模式 + 端到端追蹤，多語言順延為 Sprint 10** | 2026-03-31 |
| 17 | **產品方向重大調整：從「顯示所有檔案」轉為「智慧策展 + 三種故事視角」。只呈現業務邏輯 + 橫向切面，無全部顯示選項。三種視角：系統框架/邏輯運作/資料旅程。Sprint 10 改為智慧策展 + 效能 + 3D 空間，Sprint 11 改為三種故事視角，多語言順延** | 2026-04-01 |
| 18 | **視覺風格 + 呈現邏輯大改：深色霓虹 → 白紙黑格。三視角不只換顏色，要換「看什麼」：系統框架=目錄鳥瞰（5~15 個目錄卡片）、邏輯運作=聚焦呼叫鏈（其餘 opacity 0.08）、資料旅程=播放模式（逐步出現 350ms）。Sprint 12 處理呈現畫面問題，多語言順延至 Sprint 13** | 2026-04-01 |
| 19 | **三種視角從「檔案級」升級為「方法/端點級」。資料旅程入口 = API 端點（POST /api/users）不是檔案。邏輯運作追蹤方法呼叫鏈不是檔案依賴。系統框架智慧聚合（自動展開不均衡大目錄）。Sprint 13 處理，重新規劃呈現方式。多語言順延至 Sprint 14** | 2026-04-02 |
| 20 | **Sprint 13 完成後加入 AI 智慧分析。Phase 4 擴展為 Sprint 13-15。Sprint 14 = AI 基礎層（Contract Layer + Provider + Settings UI）+ LO AI 整合。Sprint 15 = SF + DJ AI 整合。多語言順延至 Sprint 16。四項設計決策通過：(1) MethodRole enum 取代二元 noise 過濾 (2) AI Contract typed schema (3) Provider 優先級：Claude Code CLI > Gemini API > Ollama Gemma 4 > Disabled (4) Prompt Input Budget 三級（small 2K / medium 8K / large 20K）** | 2026-04-05 |
| 21 | **Phase 4 擴展至 Sprint 16（AI 體驗完整化）。Sprint 14-15 完成 AI 基礎+管線。Sprint 15.1 Hotfix 補管線串接。Sprint 16 = 按需分析+設定連動+快取持久化+Prompt 中文化+視覺強化。新增 Phase 5 = 程式碼優化（Sprint 17），產品碼疑似過大需瘦身。Phase 6 多語言+開源順延至 Sprint 18-19。** | 2026-04-07 |
| 22 | **Phase 4 + Phase 5 全部完成。Sprint 18 = Python + Java 雙語言同時做（PM 建議先 Python only 但老闆決定一起做）。功能驗證（3D 等 7 項）和專案概述頁面延後處理。** | 2026-04-08 |
| 23 | **3D 星圖視覺層改為 Obsidian 風格知識關聯圖。新增 `codeatlas wiki` 指令產出互連 .md 知識庫。產品方向從「視覺衝擊力」轉為「知識實用性」。** | 2026-04-08 |
| 24 | **i18n 中英多語系獨立為 Sprint 20。開源發佈順延至 Sprint 21。Sprint 排序：19 Wiki + 知識圖 → 20 i18n → 21 開源 → 22+ CLI/VSC。** | 2026-04-08 |
| 25 | **啟動體驗改造優先於 i18n。Sprint 20 = 零參啟動 + Web 選路徑 + 處理進度。i18n 推至 Sprint 21。開源推至 Sprint 22。Sprint 排序：20 啟動體驗 → 21 i18n → 22 開源 → 23+ CLI/VSC。** | 2026-04-09 |

---

## 路線圖總覽

```
Phase 1（已完成）  Phase 2（已完成）  Phase 3（已完成）    Phase 4（已完成）                   Phase 5（已完成） Phase 6（已完成）     Phase 7        Phase 8        Phase 9      Phase 10
核心引擎+2D       3D+資料流+隱私    深度分析+智慧策展    方法/端點級+AI                      程式碼優化       多語言+Wiki知識       啟動體驗改造    i18n 多語系    開源發佈     CLI+VSC+社群
━━━━━━━━━━━━    ━━━━━━━━━━━━    ━━━━━━━━━━━━━━   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ━━━━━━━━━━  ━━━━━━━━━━━━━━   ━━━━━━━━━━  ━━━━━━━━━━  ━━━━━━━━  ━━━━━━━━━━━━
core engine      3D 力導向渲染    函式級呼叫鏈        S13: 方法/端點級 ✅                 LOC 盤點       S18: Python+Java ✅  零參啟動       Web UI 中英   npm 發佈    CLI 完整功能
JS/TS 解析       2D/3D 切換      影響分析+搜尋       S14: AI Contract ✅                重複碼合併      S19: Wiki+知識圖 ✅   Web 選路徑     AI 輸出語言   GitHub      VSC Extension
模組依賴圖        資料流動視覺化   控制面板+UX        S14: LO AI ✅                      死碼移除                             處理進度顯示   Wiki 語言     Demo        Plugin 機制
2D 霓虹視覺       Ollama 本地模型  智慧策展+效能       S15: SF+DJ AI ✅                   模組拆分                             專案記憶       翻譯框架      首發傳播     社群語言包
AI 節點摘要       金鑰安全+隱私   3D 空間+視角        S15.1: 管線 Hotfix ✅              測試瘦身                             歡迎頁引導
搜尋+面板        路徑追蹤模式    白紙黑格重做         S16: AI 體驗 ✅                    打包優化
━━━━━━━━━━━━    ━━━━━━━━━━━━    ━━━━━━━━━━━━━━   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ━━━━━━━━━━  ━━━━━━━━━━━━━━   ━━━━━━━━━━  ━━━━━━━━━━  ━━━━━━━━  ━━━━━━━━━━━━
Sprint 1-3 ✅    Sprint 4-6 ✅    Sprint 7-12 ✅    Sprint 13-16 ✅                  Sprint 17 ✅  Sprint 18-19 ✅      Sprint 20    Sprint 21    Sprint 22  Sprint 23+
已完成            已完成           真正好用          方法級+AI ✅                      精簡 ✅       多語言+知識化 ✅      Web 驅動啟動  中英切換     對外發佈    日常工作流
```

---

## Phase 1：核心引擎 + 2D 視覺（✅ 已完成）

> **狀態**：Sprint 1-3 全部完成。
> **交付**：core 解析引擎 + 2D 霓虹視覺 + 面板/搜尋/AI 摘要。

### 完成紀錄

| Sprint | 目標 | 狀態 | 測試 |
|--------|------|------|------|
| Sprint 1 | Monorepo + 解析引擎 + CLI + Server | ✅ | 192 tests, 88.84% coverage |
| Sprint 2 | React Flow + 霓虹主題 + 動畫 | ✅ | 225 tests, 零回歸 |
| Sprint 3 | 面板 + 搜尋 + AI 摘要（OpenAI/Anthropic） | ✅ | 266 tests, 零回歸 |

### 里程碑達成

| 里程碑 | 狀態 |
|--------|------|
| M1 解析引擎可用 | ✅ |
| M2 視覺炸裂（2D） | ✅ |
| M3 功能完整 | ✅ |

---

## Phase 2：3D 視覺 + 資料流 + 隱私強化（✅ 已完成）

> **狀態**：Sprint 4-6 全部完成。
> **交付**：3D 星圖模式 + 資料流動視覺化 + Ollama 本地 AI + 隱私標示。

### 完成紀錄

| Sprint | 目標 | 狀態 | 測試 |
|--------|------|------|------|
| Sprint 4 | 3D 力導向渲染 + 2D/3D 切換 + 霓虹光效 | ✅ | 353 tests, 零回歸 |
| Sprint 5 | 邊 symbol 標籤 + 路徑追蹤 + 熱力圖 | ✅ | 435 tests, 零回歸 |
| Sprint 6 | OllamaProvider + 環境變數 + 隱私標示 | ✅ | 523 tests, 零回歸 |

### 里程碑達成

| # | 里程碑 | 狀態 |
|---|--------|------|
| M4 | 3D 星圖 | ✅ |
| M5 | 資料流可見 | ✅ |
| M6 | 隱私完整 | ✅ |

### Sprint 4：3D 視覺化

> 目標：從 2D 平面圖升級為 3D 星圖，視覺衝擊力翻倍。

| 功能 | 說明 |
|------|------|
| 3D 力導向渲染 | `3d-force-graph`（Three.js + d3-force-3d），節點在 3D 空間漂浮 |
| 2D/3D 切換 | UI 按鈕一鍵切換，2D 看細節、3D 看全景 |
| 3D 霓虹主題 | 延續 Sprint 2 色彩系統，3D 節點發光 + 邊線光跡 |
| 3D 互動 | 旋轉、飛入、穿梭、點擊節點聚焦 |
| 3D Hover 高亮 | 移到節點 → 3D 空間中相關路徑全部亮起 |
| 3D 粒子流動 | 光點沿 3D 邊線流動，表示依賴方向 |
| 面板 + 搜尋適配 | 現有面板/搜尋在 3D 模式下正常運作 |

### Sprint 5：資料流動視覺化

> 目標：不只看到「誰 import 誰」，還看到「搬了什麼東西過去」。

| 功能 | 說明 |
|------|------|
| 邊上 symbol 標籤 | Hover 邊線 → 浮現「exports: UserService, AuthMiddleware」 |
| 路徑追蹤模式 | 點擊一個 symbol → 整條傳遞路徑亮起（A export → B import → B re-export → C import） |
| 輸入/輸出標記 | 節點上標示 import 數（入）和 export 數（出），視覺化 I/O 流量 |
| 粒子攜帶資訊 | 粒子顏色/大小代表不同 symbol 類型（function/class/variable） |
| 資料流熱力圖 | 依賴頻率越高的邊越亮/越粗，一眼看出核心資料通道 |
| 2D + 3D 皆適用 | 資料流動效果在兩種模式下都可見 |

### Sprint 6：Ollama + 隱私強化

> 目標：程式碼真正不出站，本地 AI 完整可用。

| 功能 | 說明 |
|------|------|
| OllamaProvider | 呼叫 localhost:11434，支援 codellama / llama3 等模型 |
| 環境變數金鑰 | `CODEATLAS_AI_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`，優先於 CLI flag |
| .codeatlas.json | 設定檔：忽略目錄、AI provider、port，金鑰不存入（自動 .gitignore） |
| AI 三模式 | 離線（disabled）/ 本地（Ollama）/ 雲端（OpenAI/Anthropic），UI 明確標示 |
| 隱私標示 | 雲端 AI 模式下，UI 顯示「⚠️ 原始碼片段將傳送至 {provider}」 |
| 金鑰安全 | .codeatlas.json 自動加入 .gitignore 範本，CLI flag 標示「不建議」|
| 錯誤處理強化 | 解析失敗 graceful fallback，UI 紅色標記錯誤節點 |

---

## Phase 2 資料流定義

> Phase 2 的資料流視覺化為**模組級（L1）**，在現有 import/export symbol 資料基礎上增強呈現。

### 做

| 項目 | 說明 |
|------|------|
| Import symbol 傳遞視覺化 | 邊上標示具體搬運的 symbol 名稱 |
| 路徑追蹤 | 選定 symbol → 追蹤完整傳遞鏈 |
| I/O 流量視覺化 | 節點的 import/export 數量反映為視覺大小/亮度 |
| 資料流熱力圖 | 依賴頻率映射邊的粗細/亮度 |

### 不做（Phase 3 考慮）

| 項目 | 說明 |
|------|------|
| 函式級參數/回傳追蹤 | 需要 L2 級分析，Phase 3 Sprint 7 |
| 端到端 API 路徑 | 需要框架理解，Phase 3 Sprint 7 |
| 變數級 taint analysis | 技術風險高，長期考慮 |

---

## Phase 3：深度分析 + UX 整合 + 視覺重塑（✅ 已完成）

> **狀態**：Sprint 7-12 全部完成。
> **目標**：從模組級深入到函式級，整合 UX，視覺體驗做到極致。
> **預估**：6 個 Sprint
> **交付**：函式級呼叫鏈 + 影響分析 + 控制面板 + 智慧策展 + 三種故事視角 + 白紙黑格視覺重塑

### 里程碑

| # | 里程碑 | 目標 | 交付物 |
|---|--------|------|--------|
| M7 | 函式級分析 | 看到函式呼叫鏈 + 參數/回傳 | L2 資料流 |
| M8 | 影響分析 | 改一個地方，預覽影響範圍 | 影響分析功能 |
| M9 | UX 整合 | 控制面板 + 視圖模式 + 端到端追蹤 | 易用性躍升 |
| M10 | 智慧策展 | 只顯示核心節點 + 3D 空間參考系 + 效能流暢 | 核心體驗達標 |
| M11 | 故事視角 | 三種視角框架交付 | 系統框架/邏輯運作/資料旅程 |
| M12 | 視覺重塑 | 白紙黑格 + 呈現邏輯重做，使用者真正看懂 | 目錄鳥瞰/聚焦呼叫鏈/播放模式 |

### 完成紀錄

| Sprint | 目標 | 狀態 | 測試 |
|--------|------|------|------|
| Sprint 7 | 函式級解析 + 呼叫鏈 | ✅ | 605 tests, 零回歸 |
| Sprint 8 | 影響分析 + 搜尋強化 | ✅ | 718 tests, 零回歸 |
| Sprint 9 | 控制面板 + 視圖模式 + 端到端追蹤 | ✅ | 893 tests, 零回歸 |
| Sprint 10 | 智慧策展 + 效能 + 3D 空間 | ✅ | 983 tests, 零回歸 |
| Sprint 11 | 三種故事視角 | ✅ | 1092 tests, 零回歸 |
| Sprint 12 | 白紙黑格 + 呈現邏輯重做 | ✅ | 1235 tests, 零回歸 |

### 里程碑達成

| # | 里程碑 | 狀態 |
|---|--------|------|
| M7 | 函式級分析 | ✅ |
| M8 | 影響分析 | ✅ |
| M9 | UX 整合 | ✅ |
| M10 | 智慧策展 | ✅ |
| M11 | 故事視角 | ✅（功能交付，呈現效果待優化）|
| M12 | 視覺重塑 | ✅（白紙黑格 + 呈現邏輯重做完成）|

### Sprint 7：函式級解析 + 呼叫鏈（✅ 已完成）

| 功能 | 說明 |
|------|------|
| 函式/類別解析 | tree-sitter 解析 function、class、method 定義 |
| 呼叫關係分析 | 函式之間的呼叫關係（靜態分析）|
| 呼叫鏈圖 | 選一個函式 → 展開完整呼叫路徑 |
| API 路徑視圖 | Express/Fastify/Next.js route → handler → service → data access |
| 節點第三層 | 3D/2D 中 zoom into 檔案內部 → 看到函式/class 節點 |
| 函式 I/O 視覺化 | 參數（輸入）→ 回傳（輸出），3D 中展示函式內部資料流 |

### Sprint 8：影響分析 + 搜尋強化（✅ 已完成）

| 功能 | 說明 |
|------|------|
| 正向影響分析 | 選節點 → 高亮所有下游影響 |
| 反向依賴分析 | 選節點 → 高亮所有上游依賴 |
| 搜尋聚焦模式 | 搜尋後整張圖暗掉，只有相關路徑亮 |
| 模組過濾 | 按目錄/層級/類型過濾 |
| 自然語言搜尋 | 輸入「處理登入的邏輯」→ AI 定位相關節點 |
| AI 專案概述 | 一鍵生成整個專案的架構摘要 |

### Sprint 9：控制面板 + 視圖模式 + 端到端追蹤（✅ 已完成）

| 功能 | 說明 |
|------|------|
| 控制面板 | 統一側邊面板，收納所有功能入口 + 設定 |
| 視圖模式切換 | 全景 / 依賴 / 資料流 / 呼叫鏈 四種預設，一鍵切換 |
| 端到端資料流追蹤 | 選入口 → 追蹤 input 到 output → 整條路徑發亮 |
| 顯示偏好 | Heatmap / 邊標籤 / 粒子動畫 / 節點標籤 toggle |
| Toolbar 整合 | 修復未連接按鈕 + 統一佈局 |
| AI 設定 UI | P1 — 延後至下個 Sprint |

### Sprint 10：智慧策展 + 效能 + 3D 空間

| 功能 | 說明 |
|------|------|
| 節點重要度分析 | core 新增：heuristic + AI 分類（業務邏輯/橫向切面/輔助/噪音） |
| 智慧策展 | 預設只顯示業務邏輯 + 橫向切面，無「全部顯示」選項 |
| 手動微調 | 過濾面板可手動加入被隱藏的節點 |
| 3D 空間參考系 | XYZ 軸線 + 背景網格 + 軸標示 |
| 效能優化 | ViewState 優化 + graph-adapter 快取 + 節點減少後自然改善 |
| 3D 佈局改善 | 調整力導向參數，避免節點擠成一團 |

### Sprint 11：三種故事視角（視覺方向已核准）

> **視覺方向**：老闆 2026-04-01 核准「三視角、三佈局、三色調」方案。
> **核准圖稿**：`proposal/references/sprint11/three-perspectives-mockup.html`

| 功能 | 說明 |
|------|------|
| 系統框架視角 | dagre 分層佈局，Cyan `#00d4ff` 色調，目錄群組卡片 + 子元素計數，30 秒看懂架構 |
| 邏輯運作視角 | 力導向佈局，多色霓虹，粒子流動 + BFS hover 高亮 + 非相關淡化 |
| 資料旅程視角 | 力導向 + 路徑鎖定，Green `#00ff88` 色調，stagger animation (350ms) + Bloom 發光 + E2E 面板同步 |
| 替換舊視圖 | 三種故事視角取代 Sprint 9 的四種視圖模式（全景/依賴/資料流/呼叫鏈） |
| 佈局引擎 | 系統框架用 dagre 分層，邏輯運作用力導向，資料旅程用路徑鎖定 |

### Sprint 12：白紙黑格 + 呈現邏輯重做

> **視覺方向**：老闆 2026-04-01 核准白紙黑格風格 + 三視角呈現邏輯重做。
> **核准圖稿**：`proposal/references/sprint12/three-perspectives-mockup.html`

| 功能 | 說明 |
|------|------|
| 白紙黑格主題 | 全局視覺風格從深色霓虹 → 白底 + 雙層格線（20px 細格 + 100px 粗格）|
| 系統框架 = 目錄鳥瞰 | 不顯示檔案，顯示目錄卡片（5~15 個），dagre 分層，藍色系 |
| 邏輯運作 = 聚焦模式 | 點擊入口 → 呼叫鏈亮起 → 其餘 opacity 0.08，多色 |
| 資料旅程 = 播放模式 | 逐步動畫 350ms + E2E 面板同步 + 重播按鈕，綠色系 |
| core 目錄聚合 | 新增 aggregateByDirectory() 產出目錄級 Graph JSON |

---

## Phase 4：方法/端點級呈現 + AI 智慧分析（✅ 已完成）

> **目標**：三種視角升級為方法/端點級，再加入 AI 智慧分析，從「看得到」到「看得懂」。
> **預估**：4 個 Sprint + 1 Hotfix（Sprint 13-16 + 15.1）
> **交付**：方法/端點級三視角 + AI Contract + Provider + 管線串接 + 按需分析體驗
> **老闆決策 #19**：2026-04-02 — 用 VideoBrief 實測後確認方向
> **老闆決策 #20**：2026-04-05 — AI 智慧分析拆為 Sprint 14（基礎+LO）+ Sprint 15（SF+DJ）
> **老闆決策 #21**：2026-04-07 — Sprint 16 改為 AI 體驗完整化，多語言順延。新增 Phase 5 程式碼優化。

### 里程碑

| # | 里程碑 | 目標 | 交付物 | 狀態 |
|---|--------|------|--------|------|
| M13 | 方法/端點級呈現 | 三視角升級為方法級追蹤 + 版面大改版 | 端點入口 + 呼叫鏈流程圖 + 智慧聚合 + 統一骨架 | ✅ |
| M14 | AI 基礎 + LO 智慧分析 | AI 基礎層建立 + LO 視角 AI 整合 | Contract Layer + Provider + Settings UI + LO AI 摘要 | ✅ |
| M15 | SF + DJ 智慧分析 + 管線 | 全視角 AI 覆蓋 + 管線串接 | SF/DJ AI 整合 + 規則引擎管線 + 背景分析 + 前端 polling | ✅（附條件） |
| M16 | AI 體驗完整化 | 用戶能完整操作 AI 功能 | 按需分析 + 設定連動 + 快取持久化 + 視覺強化 | ✅ |

### Sprint 13：方法/端點級三視角 + 版面大改版（✅ 已完成）

> **核心改變**：Sprint 12 讓畫面「好看了」，Sprint 13 讓內容「有用了」+ 讓操作「順手了」。
> 三種視角都從追蹤檔案升級為追蹤方法/端點。版面從左側 ControlPanel 改為齒輪 Popover + TabBar 固定可見 + 三視角統一骨架。

**方法/端點級功能**：

| # | 功能 | 說明 |
|---|------|------|
| 1 | **API 端點識別**（core） | core 解析 Express/Fastify 的 `router.get()` / `app.post()` 等，識別 API 端點定義，輸出端點列表（`POST /api/users`、`GET /api/videos`） |
| 2 | **資料旅程入口 = API 端點** | 入口從檔案改為端點。顯示 `POST /api/users` 而非 `auth-api.ts`。點擊後追蹤整條請求鏈 |
| 3 | **邏輯運作 = 方法呼叫鏈流程圖** | click 入口 → 展開方法呼叫鏈，dagre TB 分層佈局 |
| 4 | **系統框架智慧聚合** | 自動展開不均衡大目錄（占比 >70% → 展開子目錄）|
| 5 | **方法→位置映射** | 點擊方法節點 → 面板顯示：方法名 + 所屬 class + 所在檔案路徑 |

**版面大改版功能**：

| # | 功能 | 說明 |
|---|------|------|
| 6 | **ControlPanel → SettingsPopover** | 移除左側面板，改為 Toolbar 齒輪 icon 開啟的白色 Popover |
| 7 | **TabBar 固定可見** | TabBar 固定在 Toolbar 下方（top:48px），三視角切換隨時可見 |
| 8 | **統一骨架** | 三視角統一：圖譜區（左）+ 右側面板 300px（右）+ 底部 footer 44px |
| 9 | **清除/返回按鈕** | SF「清除選取」、LO「返回群組」、DJ「清除選取」，不依賴點空白處 |

**完成紀錄**：1344 tests（916 web + 428 core），G2 + G3 + G4 通過，2026-04-05 老闆核准結案。

### Sprint 14：AI 基礎層 + LO 視角 AI 整合（✅ 已完成）

> **核心改變**：建立 AI 智慧分析的技術基礎，並率先在 LO 視角落地。讓使用者從「看到方法名」進步到「看懂方法在做什麼」。
> **設計原則**：規則先分類、AI 後解釋。靜態分析決定結構，AI 增添理解。
> **完成紀錄**：1572 tests（core 588 + web 947 + cli 37），191 新增，G2+G3+G4 通過。

**AI 基礎層（Contract + Provider + Settings）**：

| # | 功能 | 說明 |
|---|------|------|
| 1 | **AI Contract Layer** | 定義所有 AI 輸出的 TypeScript typed schema（MethodSummary, DirectorySummary, ChainExplanation 等），每個結果附帶 confidence + evidence |
| 2 | **MethodRole enum** | 取代二元 noise/non-noise 過濾，分為 9 種角色：entrypoint / business_core / domain_rule / orchestration / io_adapter / validation / infra / utility / framework_glue |
| 3 | **Prompt Input Budget** | 三級 context 控制：Small ~2K（單一方法）/ Medium ~8K（一條 chain）/ Large ~20K（目錄/專案概述）|
| 4 | **Claude Code CLI Provider** | 透過 spawn child process 呼叫 Claude Code CLI，利用使用者現有 subscription，推薦但不自動設為預設 |
| 5 | **Google Gemini API Provider** | 呼叫 Google Gemini API，需使用者提供 API key |
| 6 | **Ollama Gemma 4 Provider** | 更新 Ollama Provider，推薦 Gemma 4 作為本地模型 |
| 7 | **Settings UI — AI Provider 管理** | 齒輪 Popover 中的 AI 設定區塊：Provider 選擇、API key 輸入、連線測試、隱私標示 |

**LO 視角 AI 整合**：

| # | 功能 | 說明 |
|---|------|------|
| 8 | **LO 方法角色分類** | 規則先判斷（export/handler/middleware → entrypoint，db/fetch → io_adapter），AI 再驗證補充 |
| 9 | **LO 方法一句話摘要** | AI 為每個方法生成一句話描述（如「JWT Token 驗證」「查詢影片記錄」），顯示在群組卡片和右側面板 |
| 10 | **LO chain 步驟解釋** | AI 為呼叫鏈每一步生成描述，顯示在 chain footer 和右側面板 |
| 11 | **LO 噪音智慧過濾** | 基於 MethodRole 過濾：預設隱藏 utility + framework_glue，保留業務相關方法 |

### Sprint 15：SF + DJ 視角 AI 整合（✅ 已完成）

> **核心改變**：AI 分析能力覆蓋全部三種視角。
> **完成紀錄**：1746 tests（87 新增），G2+G3+G4 通過。

**SF 視角 AI 整合**：

| # | 功能 | 說明 |
|---|------|------|
| 1 | **SF 目錄摘要** | AI 為每個目錄卡片生成一句話描述（如「前端路由與頁面元件」「後端 API 端點定義」），顯示在卡片副標題 |
| 2 | **SF 目錄角色分類** | 規則先判斷目錄層級（src/routes → 路由層），AI 補充分類，影響卡片色條顏色 |
| 3 | **SF 右側面板 FUNCTIONS 區塊** | 展開檔案 → 顯示函式列表 + AI 一句話描述 |

**DJ 視角 AI 整合**：

| # | 功能 | 說明 |
|---|------|------|
| 4 | **DJ 端點中文描述** | AI 為每個 API 端點生成中文描述（如「影片上傳」「觸發處理」），顯示在選擇器卡片 |
| 5 | **DJ 步驟語義描述** | AI 為每個步驟生成 INPUT/OUTPUT/TRANSFORM 描述，取代單純重複方法名 |
| 6 | **DJ 右側面板 AI 區塊** | 點擊步驟 → 右面板顯示 AI 生成的 INPUT、OUTPUT、TRANSFORM、METHOD 四個區塊 |

### Sprint 15.1：AI 資料管線串接 Hotfix（✅ 附條件通過）

> **核心改變**：Sprint 14-15 建了 AI 元件但缺少串接管線。本 Hotfix 補完「規則引擎 → AI 背景分析 → API 合併 → 前端 polling」全鏈路。
> **完成紀錄**：1707 tests（48 新增），管線打通。AI 成功率不達標（LO 32%/SF 8%/DJ 0%），歸因 Gemma4 模型品質不足，移 Sprint 16 處理。額外修復 9 項 Hotfix bug。

| 功能 | 說明 |
|------|------|
| 規則引擎管線 | buildFunctionGraph() 自動 classifyMethodRole()，所有函式有 methodRole |
| AI 背景分析管線 | server 啟動後背景非同步三階段 AI 分析（method → directory → endpoint） |
| API 合併 | /api/graph 回傳時從 AICache 合併 AI 欄位 |
| 前端 polling | /api/ai/status 回傳 ready 狀態，前端 polling + auto-refresh |
| 降級路徑 | AI disabled/failed 時規則引擎照常，不 crash |

### Sprint 16：AI 體驗完整化（✅ 已完成）

> **核心改變**：從「啟動即掃全專案」→「使用者按需分析」。讓用戶真正看到、用到 AI 功能。
> **老闆指示**：不一次掃全專案、使用者選擇才分析、體驗良好。
> **提案書**：`proposal/sprint16-proposal.md`
> **完成紀錄**：G2✅ + G3⚠️附條件 + G4✅ 通過。AI 按鈕移至右側面板、新增 method scope、★排序、Prompt 中文化。

| # | 功能 | 說明 |
|---|------|------|
| 1 | **按需 AI 分析 API** | POST /api/ai/analyze + Job 狀態機（queued→running→succeeded/failed/cached）+ GET /api/ai/jobs/:jobId |
| 2 | **Provider 設定連動後端** | POST /api/ai/configure → .codeatlas.json 持久化 → server 即時切換 |
| 3 | **AI 結果持久化** | .codeatlas/cache/ai-results.json + 完整 cache key 契約（scope:target:provider:promptVersion） |
| 4 | **Prompt 中文化 + 結構化輸出** | 強制繁體中文 + JSON 格式 + 字數上限 + 禁 markdown + Provider 容錯 |
| 5 | **三視角按需分析按鈕** | SF「分析此目錄」/ LO「解釋邏輯」/ DJ「解釋資料流」+ 4 種按鈕狀態 |
| 6 | **AI 內容視覺強化** | 淺色底色區塊 + ✨ icon + 字級 ≥13px + MethodRole badge 加大 |
| 7 | **控制面板分析操作** | 「分析全部」+「分析核心」按鈕 + 進度百分比 |
| 8 | **移除自動全量分析** | server 啟動只載入快取，不主動分析 |
| 9 | **Claude CLI 穩定化** | Windows 回應解析邊界情況補完 |

---

## Phase 5：程式碼優化（✅ 已完成）

> **目標**：產品碼經過 16 個 Sprint 可能過於膨脹，進行全面盤點、瘦身、重構。
> **預估**：1 個 Sprint
> **交付**：精簡後的程式碼 + 重構報告

### 里程碑

| # | 里程碑 | 目標 | 交付物 |
|---|--------|------|--------|
| M17 | 程式碼瘦身 | LOC 降低、模組清晰 | 重構報告 + 測試通過 | ✅ |

### Sprint 17：程式碼瘦身與重構（✅ 已完成）

> **背景**：16 個 Sprint 累積約 33K 行產品碼，需評估是否過大、哪些可合併/刪除。
> **完成紀錄**：36,491→36,021 LOC，GraphCanvas 2,644→896、Graph3DCanvas 1,627→592、SettingsPopover 899→257，ControlPanel 刪除（609 行）。1,797 tests 全過，19 歷史測試修復。G2+G3+G4 通過。

| 方向 | 說明 |
|------|------|
| LOC 全面盤點 | core / cli / web 各層行數、檔案數、平均檔案大小 |
| 重複碼識別 | 跨檔案相似邏輯合併（如 Provider 類共用模式） |
| 死碼移除 | 已被取代或不再使用的舊邏輯（如舊 ControlPanel vs SettingsPopover） |
| 模組拆分/整合 | 過大的檔案拆分、過小的檔案合併 |
| 測試碼瘦身 | 重複測試合併、過度 mock 簡化 |
| 打包優化 | 移除未使用的依賴、tree-shaking 改善 |
| 產品碼 vs 測試碼比例 | 確認測試碼不會比產品碼更膨脹 |

---

## Phase 6：多語言 + Wiki 知識輸出（✅ 已完成）

> **目標**：支援多語言 + 產出知識化 .md 文件 + Obsidian 風格知識圖取代 3D。
> **預估**：2 個 Sprint（Sprint 18-19）
> **交付**：Python/Java 支援 + Wiki .md 知識庫 + Obsidian 知識圖 Tab
> **老闆決策 #23**：3D→Obsidian 知識圖 + Wiki 輸出。

### 里程碑

| # | 里程碑 | 目標 | 交付物 | 狀態 |
|---|--------|------|--------|------|
| M18 | 多語言 | Python + Java 可用 | 語言擴充 | ✅ |
| M19 | Wiki 知識輸出 | .md 知識庫 + Obsidian 知識圖 | codeatlas wiki + 知識圖 Tab | ✅ |

### Sprint 18：多語言支援（✅ 已完成）

> **完成紀錄**：65 新測試、784 total pass、G2+G3+G4 通過。

| 功能 | 說明 |
|------|------|
| Python 支援 | tree-sitter python grammar + import/function extractor |
| Java 支援 | tree-sitter java grammar + import/function extractor |
| 語言自動偵測 | 根據副檔名自動選擇語言 + parser |
| call-analyzer 多語言 | Python self.method() + Java this.method() |
| import-resolver 多語言 | Python module + Java package 路徑解析 |

### Sprint 19：Wiki 知識輸出 + Obsidian 知識圖（✅ 已完成）

> **核心改變**：從「只有互動式 Web UI」到「Wiki .md 知識庫 + Obsidian 知識圖」。3D 星圖移除，改為實用知識圖。
> **老闆決策 #23**：產品方向從「視覺衝擊力」轉為「知識實用性」。
> **提案書**：`proposal/sprint19-proposal.md`
> **完成紀錄**：19 任務完成（含 T19 Post-G2 Hotfix）、136 新測試、G2+G4 ✅、G3 附條件通過（35 既有測試待清理）。

| # | 功能 | 說明 |
|---|------|------|
| 1 | **Wiki Exporter** | core：Graph JSON → AI 萃取知識概念 → 結構化 .md 檔案群 |
| 2 | **Wiki-link 生成** | 知識概念關聯 → `[[wiki-link]]` → Obsidian 知識關聯圖 |
| 3 | **AI 深度分析** | 全域概念萃取 + 單頁深度分析（知識節點，非框架節點） |
| 4 | **CLI `codeatlas wiki`** | 新指令：掃描 → AI 萃取 → 輸出知識 .md |
| 5 | **知識圖 Tab** | Web UI 第四 Tab，D3 force Obsidian 風格，概念關係網絡 |
| 6 | **雙向跳轉** | 知識圖 ↔ SF/LO/DJ（sources 反向引用） |
| 7 | **移除 3D** | 3d-force-graph / Three.js 完全移除 |

---

## Phase 7：啟動體驗改造（Sprint 20）

> **目標**：從 CLI 驅動改為 Web 驅動。零參啟動 → Web 選路徑 → 即時處理進度。
> **預估**：1 個 Sprint
> **交付**：零參啟動 + 歡迎頁 + 路徑選擇 + 全域處理進度 + 專案記憶
> **老闆決策 #25**：啟動體驗優先於 i18n，開源前必須完成。

### 里程碑

| # | 里程碑 | 目標 | 交付物 | 狀態 |
|---|--------|------|--------|------|
| M20 | 啟動體驗 | Web 驅動啟動 | 歡迎頁 + 進度頁 + 零參 CLI | 待開始 |

### Sprint 20：啟動體驗改造

| # | 功能 | 說明 |
|---|------|------|
| 1 | **零參啟動** | `codeatlas` 不帶路徑直接啟動 server，進入「選擇專案」模式 |
| 2 | **歡迎頁/專案選擇** | Web 首頁：輸入路徑 / 瀏覽最近開啟的專案 / 拖放資料夾 |
| 3 | **AI Provider 引導** | 首次啟動引導流程包含 AI Provider 選擇（復用現有 Settings 邏輯） |
| 4 | **全域處理進度** | 掃描→解析→建圖→(可選)AI 分析，每步進度條，前端即時更新（SSE/polling） |
| 5 | **專案記憶** | 記住最近開啟的專案路徑，下次啟動快速選擇（.codeatlas/recent.json） |
| 6 | **CLI flag 降級為可選** | `--ai-provider` / `--port` 等 flag 保留但非必須，Web 端可覆蓋 |
| 7 | **過時測試清理** | Sprint 19 G3 附條件：修正 35 個過時測試 |

---

## Phase 8：i18n 中英多語系（Sprint 21）

> **目標**：全面支援繁體中文 / English 切換。
> **預估**：1 個 Sprint
> **交付**：Web UI 中英切換 + AI 分析輸出語言切換 + Wiki 輸出語言選擇

### 里程碑

| # | 里程碑 | 目標 | 交付物 | 狀態 |
|---|--------|------|--------|------|
| M21 | i18n 多語系 | 中英完整切換 | i18n 框架 + 翻譯檔 + 語言設定 | 待開始 |

### Sprint 21：i18n 中英多語系

| 功能 | 說明 |
|------|------|
| i18n 框架 | locale 設定 + 翻譯檔結構（JSON key-value）+ 語言切換機制 |
| Web UI 中英切換 | Tab 名稱、按鈕、面板標題、提示文字全部 i18n 化 + Settings 語言切換 |
| AI 分析語言切換 | Prompt 模板化，根據 locale 切換中文/英文輸出 |
| Wiki 輸出語言 | `codeatlas wiki --lang zh-TW/en` |

---

## Phase 9：開源發佈（Sprint 22）

> **目標**：品質打磨到極致，正式開源發佈。
> **預估**：1 個 Sprint
> **交付**：npm 套件 + GitHub repo + README + Demo

### 里程碑

| # | 里程碑 | 目標 | 交付物 | 狀態 |
|---|--------|------|--------|------|
| M22 | 開源上線 | GitHub + npm | 公開發佈 | 待開始 |

### Sprint 22：開源發佈

| 功能 | 說明 |
|------|------|
| npm 發佈 | `npm install -g codeatlas` 單一套件 |
| GitHub repo | README（demo GIF）+ LICENSE（MIT）+ CONTRIBUTING |
| Demo 素材 | 截圖 + GIF（2D 三視角 + 知識圖 + Obsidian）|
| 首發傳播 | Twitter + Reddit + Hacker News + Dev.to |

---

## Phase 10：CLI 強化 + VSC 插件 + 社群

> **目標**：嵌入開發者日常工作流，建立社群生態。
> **預估**：Sprint 23+，依需求動態調整
> **交付**：VSC Extension + Plugin 機制 + Git 整合

### 功能方向

| 功能 | 說明 |
|------|------|
| CLI 強化 | export / summary / diff 指令 |
| VSC Extension | 編輯器內嵌 WebView，當前檔案依賴圖 |
| Git diff 視覺化 | 兩個 commit 的結構差異，PR 影響範圍 |
| Plugin 架構 | 第三方自訂分析規則、節點類型 |
| 語言包機制 | 社群貢獻新語言 parser |
| 自訂主題 | 社群做自己的視覺主題 |
| GitHub Action | CI 中自動分析 + 架構規則檢查 |

---

## 技術架構

### 三層分離原則

```
core（純分析引擎）→ 不依賴任何 UI、不管 server
cli（入口 + 編排）→ 呼叫 core + 啟動 server + serve 靜態前端 + graph JSON
web（純前端）     → 讀 JSON 渲染（2D React Flow + 3D Three.js），不直接依賴 core
```

### 技術棧

| 層 | 技術 | 理由 |
|----|------|------|
| 語言 | TypeScript（全端） | 一致性、型別安全 |
| Monorepo | pnpm workspace | 輕量、快速 |
| 前端框架 | React + TypeScript | 生態最大 |
| 2D 圖譜 | React Flow + D3.js | 節點互動 + 力導向 |
| **3D 圖譜** | **3d-force-graph（Three.js + d3-force-3d）** | **3D 力導向 + WebGL 效能** |
| 動畫 | Framer Motion + Canvas API | 粒子流動、過渡動畫 |
| 解析引擎 | tree-sitter（Node.js binding，備案 WASM） | 語言無關、高效能 |
| 本地 Server | Fastify | serve 靜態前端 + graph JSON |
| AI — 雲端 | OpenAI / Anthropic（HTTP fetch，無 SDK） | 可插拔 |
| **AI — 本地** | **Ollama（localhost HTTP）** | **程式碼不出站** |
| 打包 | tsup / esbuild | 快速打包 |
| 測試 | Vitest | 快速、TypeScript 原生 |
| CI/CD | GitHub Actions | 自動測試、npm publish |

### AI Provider 架構（v2 — Sprint 14 更新）

```
┌───────────────────────────────────────────────────────────┐
│  CodeAtlas（本機）                                          │
│                                                           │
│  Provider 1: Claude Code CLI（⭐ 推薦）                    │
│  → spawn child process → claude CLI                       │
│  → ✅ 使用者現有 subscription，免額外費用                    │
│  → ⚠️ 需安裝 Claude Code CLI                              │
│                                                           │
│  Provider 2: Google Gemini API                             │
│  → fetch generativelanguage.googleapis.com                 │
│  → ⚠️ 原始碼片段傳送至 Google（UI 明確標示）                │
│                                                           │
│  Provider 3: Ollama + Gemma 4（本地推薦）                   │
│  → fetch localhost:11434 → Ollama → Gemma 4                │
│  → ✅ 程式碼完全不出站                                      │
│                                                           │
│  Provider 4: Disabled（離線模式）                           │
│  → 無 AI 摘要，純結構分析 + 規則分類                         │
│  → ✅ 零外部依賴                                           │
│                                                           │
│  ── AI Contract Layer ──                                   │
│  所有 Provider 輸出統一 typed schema                        │
│  每個結果附帶 confidence + evidence                         │
│  Prompt Input Budget: Small 2K / Medium 8K / Large 20K     │
│                                                           │
│  ── MethodRole Enum ──                                     │
│  規則先分類 → AI 驗證補充                                   │
│  9 種角色: entrypoint | business_core | domain_rule |       │
│  orchestration | io_adapter | validation | infra |          │
│  utility | framework_glue                                  │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

> **舊版 Provider**（OpenAI / Anthropic）保留向後相容，但不再主推。

---

## 風險清單

| # | 風險 | 影響 | 緩解方式 |
|---|------|------|---------|
| 1 | 3d-force-graph + 現有 UI 整合 | 3D/2D 切換可能有狀態管理問題 | Sprint 4 專門處理，先做切換再做細節 |
| 2 | 3D 效能（大量節點 + 光效） | WebGL 比 DOM 快，但光效可能吃 GPU | 效能分級：節點 > 500 關閉光效 |
| 3 | Ollama 模型品質 | 本地模型摘要品質可能不如 GPT-4 | UI 標示模型名稱，讓使用者自選 |
| 4 | 資料流路徑追蹤複雜度 | 循環依賴的路徑追蹤可能無限展開 | 設定追蹤深度上限（預設 5 層） |
| 5 | 多語言 tree-sitter grammar 品質 | Python/Java grammar 可能有 edge case | 先做 JS/TS 做深，多語言標註 beta |
| 6 | npm 發佈 monorepo 打包 | 三個 package → 單一 npm 套件配置複雜 | 提前研究方案，Sprint 10 專門處理 |
| 7 | 開源前品質要求高 | 不急上線但要做到極致 | 每個 Sprint 維持高測試覆蓋率 |

---

## 成功指標

### Phase 2 完成時（內部驗收）

| 指標 | 目標 |
|------|------|
| 3D 模式截圖衝擊力 | 老闆覺得「太酷了，一定要分享」 |
| 資料流路徑追蹤 | 選一個 symbol → 完整路徑一目了然 |
| Ollama 摘要可用 | 本地模型 5 秒內回傳可讀摘要 |
| 隱私零外傳模式 | Ollama 模式下完全不打外部 API |

### Phase 5 開源後（首月）

| 指標 | 目標 | 追蹤方式 |
|------|------|---------|
| GitHub stars | > 1000（品質夠好應該更高） | GitHub |
| npm weekly downloads | > 500 | npm |
| 首次分析成功率 | > 90% | 內部測試 |
| 3D 模式使用率 | > 50% | opt-in analytics |

---

**老闆決策**: [x] 通過

**審核意見**:
- 2026-04-02 老闆核准路線圖 v4.0。Sprint 12 結案，Phase 3 完成。Sprint 13 升級為方法/端點級呈現。
- 2026-04-05 老闆核准路線圖 v5.0。Sprint 13 結案（1344 tests）。Phase 4 擴展加入 AI 智慧分析（Sprint 14-15）。四項 AI 設計決策通過：AI Contract Layer、MethodRole enum、Prompt Input Budget、Provider 優先級（Claude Code CLI > Gemini API > Ollama Gemma 4 > Disabled）。多語言順延至 Sprint 16。
- 2026-04-07 老闆核准路線圖 v6.0。Sprint 14✅ + 15✅ + 15.1✅（附條件）完成。Sprint 16 改為 AI 體驗完整化（不做多語言）。新增 Phase 5 程式碼優化（Sprint 17）。多語言+開源順延至 Sprint 18-19（Phase 6）。CLI+VSC 改為 Phase 7（Sprint 20+）。
