# CodeAtlas 功能規格

> 版本: v17.0 | Sprint 18 | 最後更新: 2026-04-08

## 概述

Sprint 1：核心解析引擎 + CLI 入口 + 本地 Web Server 基礎。
Sprint 2：Web UI 視覺化渲染 — React Flow + D3 力導向佈局 + 深色霓虹主題 + 互動動畫。
Sprint 3：互動深度 + AI 摘要 — 節點詳情面板、搜尋定位、AI 節點摘要。
Sprint 4：3D 視覺化 — 3d-force-graph 整合、2D/3D 切換、3D 霓虹主題、3D 互動。
Sprint 5：資料流動視覺化 — 邊上 symbol 標籤、路徑追蹤、節點 I/O 標記、資料流熱力圖。
Sprint 6：Ollama + 隱私強化 — OllamaProvider、環境變數金鑰、.codeatlas.json 設定檔、AI 三模式、隱私標示。
Sprint 7：函式級解析 + 呼叫鏈 — tree-sitter 擴充函式/類別解析、靜態呼叫分析、呼叫鏈圖、節點第三層 zoom into file、函式 I/O。
Sprint 8：影響分析 + 搜尋強化 — 正向/反向影響分析（BFS）、右鍵選單、搜尋聚焦模式、模組過濾面板、AI 專案概述、2D+3D 適配、自然語言搜尋。
Sprint 9：控制面板 + 視圖模式 + 端到端追蹤 — 統一控制面板、四種視圖模式（全景/依賴/資料流/呼叫鏈）、端到端資料流追蹤、顯示偏好 Toggle、Toolbar 整合修復、2D+3D 適配、AI 設定 UI、功能引導。
Sprint 10：智慧策展 + 效能 + 3D 空間 — 節點重要度分析（heuristic 角色分類）、智慧策展（預設只顯示核心節點）、手動微調（釘選隱藏節點）、3D 空間參考系（GridHelper + AxesHelper）、ViewState selector 效能優化、3D 佈局改善、Graph JSON role 欄位擴充。
Sprint 11：三種故事視角 — 系統框架（dagre 分層 + Cyan 色調）、邏輯運作（力導向 + BFS hover 多跳高亮）、資料旅程（stagger 350ms + Green 色調 + 邊流動），佈局引擎框架（可擴展），取代 Sprint 9 四種視圖模式，策展 + 視角整合。
Sprint 12：白紙黑格視覺重塑 + 呈現邏輯重做 — 全域主題從霓虹改為白紙黑格、三視角呈現邏輯各自獨立（DJ 入口/出口卡片 + stagger, LO dagre 分層 + BFS, SF directory hover）。
Sprint 13：方法/端點級三視角 — 三視角從檔案級升級為方法/端點級（DJ API 端點入口+請求鏈、LO 分類群組+呼叫鏈流程圖、SF 智慧聚合+目錄詳情），三種右側面板各自獨立內容，core 新增 endpoint-detector 模組。
Sprint 14：AI 智慧分析基礎層 + LO AI 整合 — AI Contract Layer（zod typed schema）、MethodRole 9 分類規則引擎、Prompt Budget 三級上下文控制、6 種 AI Provider（Claude Code CLI / Gemini / Ollama / OpenAI / Anthropic / Disabled）、BaseAnalysisProvider 抽象層、Settings UI AI 區塊重做、LO 方法角色過濾（噪音隱藏 214→40-60）、LO AI 摘要顯示、LODetailPanel AI 分析區塊。
Sprint 15：SF + DJ 視角 AI 整合 — AI Contract 擴展（DirectorySummary / EndpointDescription / StepDetail 三個 zod schema）、SF/DJ prompt 模板、buildLargeContext 目錄級上下文建構、endpoint-detector 整合 MethodRole（chain step 附帶角色分類）、SF DirectoryCard AI 摘要行+角色色條、SF FUNCTIONS 區塊（函式列表+AI 摘要+MethodRole badge）、DJ 端點中文描述、DJ 步驟 INPUT/OUTPUT/TRANSFORM/METHOD 四區塊、Settings 測試連線真實化。
Sprint 16：AI 體驗完整化 — 按需分析 + 快取持久化 + Provider 即時切換 + Prompt 中文化 + Response Sanitizer。
Sprint 17：程式碼優化 — 三大元件瘦身（GraphCanvas/Graph3DCanvas/SettingsPopover）+ 死碼清除 + 共用 hook 提取 + debug log 清理。
Sprint 18：Python + Java 多語言支援 — SupportedLanguage 統一型別、tree-sitter Python/Java grammar 載入（native + WASM fallback）、Python/Java import extractor（含 relative import / static import / wildcard）、Python/Java function extractor（含 class / method / decorator / interface / enum / constructor）、call-analyzer 多語言適配（Python self.method() / Java this.method()）、import-resolver 語言感知路徑解析、scanner 副檔名擴充 + ignore dirs。
 — 按需分析（AIJobManager + POST /api/ai/analyze + GET /api/ai/jobs/:jobId + method/method-group/directory/endpoint 四種 scope）、快取持久化（PersistentAICache + 磁碟儲存 + LRU eviction + contentHash 失效）、移除啟動自動全量掃描、Provider 即時切換（POST /api/ai/configure + .codeatlas.json 持久化）、Prompt 全面中文化（PROMPT_VERSION v16.1 + 6 個 prompt 模板全繁體中文 + REPLY_RULES）、Response Sanitizer（markdown fence strip + zod partial parse + 純文字 fallback）、Claude CLI 穩定化（空輸出/stderr 隔離/Windows path）、三視角按需分析按鈕移至右側明細面板（SF SFAISection scope=directory / LO LOAISection scope=method 單一方法級 / DJ DJAIResultSection scope=endpoint + 5 種狀態 + useSyncExternalStore 共享狀態持久化）、AIResultBlock 共用元件（compact/full + RoleBadge 9色 + DJAIBlocks 四區塊色彩）、控制面板分析操作（✨ 分析全部 + ✨ 分析核心目錄 + 進度條）、Settings onChange 連動（Provider select + ⭐ 推薦 + Toast 三色回饋）、Settings 精簡（移除冗餘「故事視角」「顯示偏好」section）、LO 改進（★ 入口方法排序置頂 + 群組卡片一句話摘要 CATEGORY_SUMMARIES）、AI Metrics（success/fail/cacheHit 計數器 + /api/ai/status 暴露）。

## 功能規格

### F1: 檔案掃描器（Scanner）

**描述**：遞迴掃描指定目錄，建立檔案樹。

**規則**：
- 預設忽略：`node_modules`、`.git`、`dist`、`build`、`.next`、`coverage`、`.cache`
- 支援自訂忽略：透過 `--ignore` flag 或 `.codeatlas.json` 設定
- 只處理：`.js`、`.jsx`、`.ts`、`.tsx`、`.mjs`、`.cjs`、`.py`、`.pyw`、`.java`（Sprint 18）
- 輸出：file node 清單 + directory node 清單

**邊界條件**：
- 空目錄：跳過，不建立 node
- symlink：不追蹤，跳過
- 超大檔案（> 1MB）：掃描但標記 warning
- 無 JS/TS/Python/Java 檔案的專案：回傳空 graph + warning message
- Python ignore dirs: `__pycache__`、`.venv`、`venv`、`.tox`、`.mypy_cache`（Sprint 18）
- Java ignore dirs: `target`、`.gradle`、`.idea`（Sprint 18）

### F2: Import 解析器（Parser）

**描述**：解析每個 JS/TS 檔案的 import/require/export 語句。

**支援的 import 模式**：

| 模式 | 範例 | Sprint 1 支援 |
|------|------|--------------|
| ESM named import | `import { foo } from './bar'` | ✅ |
| ESM default import | `import foo from './bar'` | ✅ |
| ESM namespace import | `import * as foo from './bar'` | ✅ |
| ESM re-export | `export { foo } from './bar'` | ✅ |
| CJS require | `const foo = require('./bar')` | ✅ |
| Dynamic import | `import('./bar')` | ⚠️ 標記為 heuristic |
| Path alias | `import foo from '@/utils'` | ❌ Phase 2（標記未解析） |
| Barrel export | `export * from './bar'` | ✅ 建立邊，但不展開內部 symbol |

**路徑解析規則**：
1. 相對路徑（`./` / `../`）→ 解析為實際檔案路徑
2. 自動補副檔名：依序嘗試 `.ts` → `.tsx` → `.js` → `.jsx` → `/index.ts` → `/index.js`
3. 第三方套件（`react`、`lodash`）→ 不建立 node，忽略
4. 解析失敗 → 記錄到 `errors`，不阻塞

### F3: 依賴分析器（Analyzer）

**描述**：將解析結果組裝成 Graph（nodes + edges）。

**規則**：
- 每個檔案 = 一個 file node
- 每個目錄（含至少一個檔案）= 一個 directory node
- 每個 import 語句 = 一條 import edge
- 高層資料流：基於 import/export 方向推導，confidence 標註為 `medium`

**統計計算**：
- `exportCount`：該檔案的 export 語句數
- `importCount`：該檔案的 import 語句數
- `dependencyCount`：有多少其他檔案 import 了此檔案

### F4: CLI `codeatlas analyze`

**描述**：CLI 入口，觸發掃描 + 解析 + 分析，輸出 JSON。

**行為**：
```
codeatlas analyze [path]
```
1. `path` 預設為當前目錄
2. 執行 Scanner → Parser → Analyzer
3. 將 AnalysisResult JSON 寫入 `.codeatlas/analysis.json`
4. 終端機顯示統計摘要

**終端機輸出範例**：
```
CodeAtlas v0.1.0

Scanning: /path/to/project
Files found: 156
Analyzed: 152 ✓
Skipped: 2 (binary)
Failed: 2 (see .codeatlas/analysis.json)

Nodes: 156 files, 23 directories
Edges: 312 imports

Analysis saved to .codeatlas/analysis.json
Duration: 3.2s
```

### F5: CLI `codeatlas web`

**描述**：啟動本地 HTTP server，serve 前端頁面 + 分析結果 API。

**行為**：
```
codeatlas web [path]
```
1. 如果 `.codeatlas/analysis.json` 不存在，先自動執行 analyze
2. 啟動 Fastify HTTP server
3. Serve 靜態前端（Sprint 1 為佔位頁）
4. 提供 `/api/graph`、`/api/node/:id` 等 API
5. 自動打開瀏覽器

**Sprint 1 佔位頁**：顯示「CodeAtlas — Web UI coming in Sprint 2」+ 分析統計 + JSON 預覽。

### F6: AI Provider Interface

**描述**：可插拔的 AI 摘要介面，Sprint 1 只定義接口與 stub。

```typescript
interface SummaryProvider {
  name: string;
  isConfigured(): boolean;
  summarize(code: string, context: SummaryContext): Promise<string>;
}

interface SummaryContext {
  filePath: string;
  language: string;
  imports: string[];
  exports: string[];
}
```

**Sprint 1 實作**：
- `DisabledProvider`：固定回傳 "AI summary not configured"
- `OpenAIProvider`：接口定義 + stub（實際呼叫 Sprint 3）
- `AnthropicProvider`：接口定義 + stub（實際呼叫 Sprint 3）

## Sprint 2 功能規格

### F7: Graph 資料轉換層（Adapter）

**描述**：將 `/api/graph` 回傳的 `AnalysisResult` JSON 轉換為 React Flow 的 `Node[]` + `Edge[]` 格式。

**規則**：
- `GraphNode` → React Flow `Node`：id 保持不變，label 作為顯示名稱，type 對應自訂節點元件
- `GraphEdge` → React Flow `Edge`：source/target 對應 node id，type 對應自訂邊元件
- directory node → group node（可展開/收合）
- file node → 基本節點
- metadata 保留在 node.data 中

**邊界條件**：
- API 回傳空 graph（0 nodes）→ 顯示空狀態提示
- API 回傳錯誤 → 顯示錯誤訊息
- 超大 graph（500+ nodes）→ Sprint 2 不做虛擬化，先渲染（效能優化 Sprint 4）

### F8: React Flow 基礎渲染

**描述**：使用 React Flow 將轉換後的 nodes/edges 渲染為可互動的圖。

**規則**：
- 使用 React Flow v12+（最新穩定版）
- 支援滑鼠滾輪縮放
- 支援拖曳平移
- 支援 minimap 縮略圖
- 節點可拖曳重新定位

### F9: D3 力導向佈局

**描述**：使用 D3 force simulation 自動計算節點位置。

**規則**：
- 使用 `d3-force`：forceLink + forceManyBody + forceCenter + forceCollide
- 初次載入時自動佈局，動畫展示節點歸位
- 節點不重疊（forceCollide 碰撞偵測）
- 依賴關係密集的模組自然聚合
- 佈局穩定後停止 simulation（節省 CPU）

**參數建議**（需調參）：
- charge strength: -300 ~ -500
- link distance: 100 ~ 200
- collision radius: 節點尺寸 + padding

### F10: 深色霓虹主題

**描述**：整體視覺風格 — 深色背景 + 霓虹色系 + glow 效果。

**視覺規則**：
- 背景色：#0a0a0f 或類似深色
- 節點：圓角矩形，深色填充 + 霓虹色邊框（cyan/magenta/green）
- 邊線：半透明漸層，霓虹色
- 文字：白色/淺灰，確保對比度 ≥ 4.5:1（WCAG AA）
- Glow 效果：CSS box-shadow / filter: drop-shadow
- 不同節點類型用不同霓虹色區分（directory vs file）

### F11: Hover 高亮

**描述**：滑鼠移到節點時，高亮相關依賴路徑。

**行為**：
1. Hover 節點 → 該節點放大 / 亮度提高
2. 該節點的所有入邊（被誰 import）+ 出邊（import 誰）全部亮起
3. 相關的上下游節點也高亮
4. 其餘節點和邊淡化（opacity 降低）
5. 移開滑鼠 → 恢復正常

**效能要求**：hover 響應 < 50ms

### F12: 節點分層

**描述**：zoom 層級控制節點顯示粒度。

**規則**：
- **Level 1（zoom out）**：只顯示 directory 節點，檔案收合在目錄中
- **Level 2（zoom in）**：展開目錄，顯示 file 節點
- zoom threshold：可調參數（建議 zoom < 0.5 為 L1，≥ 0.5 為 L2）
- 展開/收合有平滑動畫過渡

**邊界條件**：
- 扁平專案（無子目錄）→ 直接顯示所有檔案
- 深層巢狀目錄 → 只顯示到第一層子目錄

### F13: 流動動畫

**描述**：依賴邊上有方向性光點流動，表示依賴方向。

**規則**：
- CSS animation 或 Canvas 繪製光點粒子
- 粒子沿邊線從 source 流向 target
- 速度適中（不能太快閃爍、不能太慢看不出動感）
- 非 hover 時粒子較暗（背景裝飾），hover 時粒子明亮
- 可用 `prefers-reduced-motion` media query 關閉

### F14: 動畫過渡

**描述**：節點展開/收合/聚焦時的平滑動畫。

**規則**：
- 使用 Framer Motion 或 React Flow 內建 transition
- 展開目錄：子節點從父節點位置展開到佈局位置
- 收合目錄：子節點匯聚回父節點
- 聚焦節點：viewport 平滑移動 + zoom in
- 動畫時長：200-400ms
- easing：ease-out 或 spring

### F15: CLI Server 更新

**描述**：更新 `codeatlas web` 指令，serve 新的 React build 產物。

**變更**：
- `packages/cli/src/commands/web.ts`：靜態檔案路徑指向 `packages/web/dist/`
- `packages/cli/src/server.ts`：靜態檔案 serve 路徑更新
- 確保 `pnpm build` 後 web dist 產物存在

## 驗收標準

### Sprint 1

- [x] Scanner 能正確掃描 JS/TS 專案，跳過 node_modules 等
- [x] Parser 能解析 ESM + CJS import，建立正確的依賴邊
- [x] Analyzer 產出的 JSON 符合 data-model.md 定義的 schema
- [x] `codeatlas analyze` CLI 可在 Windows / macOS 執行
- [x] `codeatlas web` 可啟動 server 並在瀏覽器打開
- [x] 100 檔案專案分析 < 10 秒
- [x] 單檔解析失敗不阻塞整體
- [x] AI Provider Interface 已定義，DisabledProvider 可用

### Sprint 2

- [ ] `codeatlas web` 在瀏覽器中顯示可互動的依賴圖（非佔位頁）
- [ ] 深色背景 + 霓虹色節點與邊線，視覺有衝擊力
- [ ] 力導向佈局：節點自動排列，不重疊，結構清晰
- [ ] 滑鼠滾輪縮放 + 拖曳平移流暢
- [ ] Hover 節點 → 相關依賴路徑全部亮起，其餘淡化
- [ ] 節點分層：zoom out 看目錄、zoom in 看檔案（至少兩層）
- [ ] 邊上有方向性流動動畫
- [ ] 展開/收合/聚焦有平滑過渡動畫
- [ ] 中型專案（100-300 檔案）渲染 > 30 FPS
- [ ] Graph JSON → React Flow 格式轉換正確
- [ ] CLI `codeatlas web` serve 新的 React build 產物
- [ ] Web package 可獨立 build
- [ ] 截圖有「想點進去看」的視覺衝擊力

## Sprint 3 功能規格

### F16: 節點詳情面板（Node Panel）

**描述**：點擊節點後右側滑出面板，顯示模組完整資訊。

**規則**：
- 右側固定寬度 400px 滑出面板，Framer Motion 動畫
- 顯示：檔案路徑、metadata（type/language/fileSize/imports/exports/dependencyCount）
- 列出 import 清單和被依賴清單（可點擊跳轉）
- 點擊面板外或 Escape 關閉
- Loading spinner + Error 狀態處理

### F17: 原始碼預覽（Code Preview）

**描述**：面板內顯示原始碼，有行號和語法提示。

**規則**：
- 限制顯示前 100 行（避免大檔案卡頓）
- 超過 100 行顯示 "N more lines" + 展開按鈕
- monospace 字體，深色主題
- 無原始碼時顯示提示文字

### F18: AI 節點摘要（AI Summary）

**描述**：AI 口語化解釋模組功能，嵌入面板內。

**規則**：
- OpenAI（gpt-4o-mini）+ Anthropic（claude-3-haiku）雙 provider
- 直接 HTTP fetch，不裝 SDK
- timeout 10s + error handling
- 三狀態：loading spinner → 結果顯示 → 未設定降級提示
- 「Regenerate」按鈕重新呼叫
- 「AI generated」浮水印標記

### F19: AI 摘要快取

**描述**：server 端快取 AI 摘要，避免重複呼叫。

**規則**：
- 快取目錄：`.codeatlas/cache/{hash}.json`
- hash = sha256(nodeId + provider) 前 16 位
- 命中快取回傳 `cached: true`，不打外部 API
- 快取損壞時自動重新呼叫

### F20: 搜尋定位（Search & Navigate）

**描述**：頂部搜尋框，即時過濾 node 清單，選擇後飛到節點。

**規則**：
- 前端記憶體過濾（label + filePath，大小寫不敏感）
- 最多 10 筆候選結果
- 選擇後 viewport 飛到節點（setCenter, zoom 1.2, 500ms 動畫）
- 候選清單顯示檔名 + 完整路徑 + 類型 icon

### F21: 搜尋鍵盤快捷鍵

**描述**：Ctrl+K / Cmd+K 開啟搜尋，完整鍵盤操作。

**規則**：
- Ctrl+K / Cmd+K 開啟搜尋框 + auto focus
- Escape 關閉
- ArrowUp / ArrowDown 移動候選高亮
- Enter 選擇並聚焦
- 搜尋框右側顯示 ESC 快捷鍵提示

### F22: CLI AI 參數傳遞

**描述**：CLI `--ai-key` / `--ai-provider` 參數傳入 server。

**規則**：
- `codeatlas web --ai-key xxx --ai-provider openai` 啟用 AI
- 無 `--ai-key` 時 `/api/ai/summary` 回傳 `ai_not_configured`
- `/api/ai/status` 端點回傳 `{ enabled, provider }`
- 版本號保持 0.1.0

## Sprint 4 功能規格

### F23: 3D 力導向渲染

**描述**：使用 `3d-force-graph`（Three.js + d3-force-3d）將依賴圖渲染為 3D 空間。

**規則**：
- 節點在 3D 空間以力導向佈局自動排列
- 使用 `3d-force-graph` 套件，底層為 Three.js WebGL 渲染
- 力導向參數延續 2D 設定（charge、link distance、collision）
- 節點使用球體 + 自訂 Three.js material（glow 效果）
- 佈局穩定後降低 simulation 頻率（節省 GPU）

### F24: 2D/3D 切換

**描述**：UI 按鈕一鍵切換 2D（React Flow）和 3D（3d-force-graph）渲染模式。

**規則**：
- 切換按鈕固定在工具列（Toolbar）
- 切換時保留共享狀態：selectedNodeId、searchQuery、searchResults、panelOpen
- 過渡動畫：fade out 舊模式 → fade in 新模式（300ms）
- 預設模式為 2D（向下相容）
- 共享狀態層（ViewStateContext）提供給兩個渲染器讀取

**共享狀態層設計**：
```typescript
interface ViewState {
  mode: '2d' | '3d';
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  searchQuery: string;
  searchResults: string[];
  isPanelOpen: boolean;
}
```

### F25: 3D 霓虹主題

**描述**：3D 模式延續 Sprint 2 霓虹色彩系統。

**規則**：
- 色彩系統：Cyan（#00d4ff）/ Magenta（#ff00ff）/ Green（#00ff88）/ Amber（#ffaa00）
- 節點球體：內發光（emissive material）+ 外發光（sprite glow）
- 邊線：Three.js Line material，霓虹色半透明
- 背景：深空暗色（#050510），無星空粒子（避免 GPU 浪費）
- file 節點 = Cyan，directory 節點 = Magenta（與 2D 一致）

### F26: 3D 互動

**描述**：3D 模式下的使用者互動操作。

**規則**：
- 旋轉：左鍵拖曳（OrbitControls）
- 縮放：滾輪 zoom（有最小/最大限制）
- 平移：右鍵拖曳
- 點擊節點：相機飛到節點前方（lookAt + zoom in，500ms 動畫）
- 右鍵節點：context menu（複製路徑、在面板中開啟）
- 飛入：雙擊節點 zoom to fit

### F27: 3D Hover 高亮

**描述**：3D 模式下 hover 節點高亮依賴路徑。

**規則**：
- Hover 節點 → 該節點球體放大 1.5x + 亮度提高
- 相關入邊/出邊全部亮起（opacity 1.0 + 加粗）
- 上下游節點也高亮
- 無關節點/邊暗淡（opacity 0.1）
- 使用 raycaster 偵測 hover 目標
- hover 響應 < 100ms（3D raycasting 比 DOM 慢）

### F28: 3D 粒子流動

**描述**：3D 邊線上有方向性光點粒子流動。

**規則**：
- 延續 Sprint 2 粒子概念，適配 3D 空間
- 使用 `3d-force-graph` 的 linkDirectionalParticles API
- 粒子顏色跟隨邊線顏色（霓虹色）
- 粒子速度適中（0.005 ~ 0.01 per frame）
- hover 時粒子明亮，非 hover 時較暗

### F29: 面板 + 搜尋 3D 適配

**描述**：Sprint 3 的 NodePanel、SearchBar 在 3D 模式下正常運作。

**規則**：
- NodePanel：固定在畫面右側（absolute positioning），不跟隨 3D 空間
- 點擊 3D 節點 → 開啟面板（與 2D 行為一致）
- SearchBar：Ctrl+K 開啟，3D 模式下選擇節點 → 相機飛到目標
- 搜尋定位：3D 相機 lookAt 目標節點 + zoom（非 React Flow fitView）
- 面板/搜尋讀取共享狀態層，不依賴渲染模式

### F30: 3D 節點分層（P1）

**描述**：目錄層級映射為 3D Y 軸高度。

**規則**：
- 根目錄 = Y=0，每深一層 Y 增加固定值
- 同目錄節點自然聚集（forceCluster 或 Y 軸約束力）
- 分層為視覺引導，不阻止力導向佈局微調

### F31: 3D 相機預設視角（P1）

**描述**：提供預設相機角度快速切換。

**規則**：
- 俯瞰（top-down）：Y 軸高處向下看
- 側視（side-view）：X 軸方向水平看
- 聚焦核心（focus-core）：飛到依賴最多的節點
- 快捷鍵：1/2/3 數字鍵切換
- 切換動畫 500ms（camera tween）

### F32: 3D 效能基線（P1）

**描述**：確保 3D 渲染效能達標。

**規則**：
- 200 節點 3D 渲染 > 30 FPS
- 節點 > 200 時自動降低光效（減少 glow sprite 解析度）
- 2D/3D 切換 < 1 秒
- 使用 Stats.js 或 performance.now() 量測

## 驗收標準

### Sprint 3

- [ ] 點擊節點 → 右側面板滑出，顯示完整模組資訊
- [ ] 面板內可預覽原始碼（有行號，前 100 行）
- [ ] AI 摘要：有 key → 顯示口語化摘要；無 key → 降級提示
- [ ] 同一節點第二次呼叫 AI 走快取（不打外部 API）
- [ ] Ctrl+K 開啟搜尋 → 輸入過濾 → 選擇 → 飛到節點
- [ ] 鍵盤可完成完整搜尋流程
- [ ] 266 tests 全通過，零回歸
- [ ] `pnpm build` 三個 package 全通過

### Sprint 4

- [ ] 3D 模式下節點以力導向佈局呈現在 3D 空間中
- [ ] UI 按鈕可在 2D/3D 之間切換，切換時選中節點/搜尋結果保留
- [ ] 3D 節點/邊線延續霓虹色彩系統（Cyan/Magenta/Green/Amber）
- [ ] 3D 可旋轉、縮放、點擊節點時相機飛入聚焦
- [ ] 3D hover 節點時相關路徑亮起、無關節點暗淡
- [ ] 3D 邊線上有光點粒子流動，表示依賴方向
- [ ] NodePanel 在 3D 模式下可開啟、顯示節點詳情
- [ ] SearchBar 在 3D 模式下可搜尋，定位時相機飛到目標節點
- [ ] 200 節點 3D 渲染 > 30 FPS
- [ ] 2D/3D 切換 < 1 秒
- [ ] 現有 2D 模式所有功能不受影響
- [ ] 現有 266+ tests 全部通過，零回歸

## Sprint 5 功能規格

### F33: 邊上 Symbol 標籤

**描述**：Hover 邊線時浮現該邊搬運的 symbol 名稱。

**規則**：
- Hover 邊線 → 浮現 `EdgeMetadata.importedSymbols` 中的 symbol 名稱
- 2D 模式：React Flow edge label（custom edge label component）
- 3D 模式：Three.js sprite text（hover 才渲染，非全量渲染）
- 超過 3 個 symbol 顯示前 3 個 + 「+N more」
- 無 importedSymbols（空陣列）→ 不顯示標籤
- 標籤背景半透明深色，文字白色，確保可讀性

**效能規則**：
- 3D 模式：超過 50 條邊只渲染 hover 的那條邊的標籤，不全部渲染
- 2D 模式：hover 時才顯示，非永久顯示

**資料來源**：`EdgeMetadata.importedSymbols: string[]`（Sprint 1 已解析）

### F34: 路徑追蹤模式

**描述**：點擊邊上的某個 symbol → 追蹤完整傳遞鏈（A export → B import → B re-export → C import）。

**規則**：
- 點擊 symbol 標籤中的某個 symbol 名稱觸發追蹤
- 追蹤演算法：BFS/DFS 遍歷圖，找出所有包含該 symbol 的邊與節點
- 整條路徑高亮（邊+節點），無關節點暗淡（opacity 0.1）
- 追蹤深度上限 10 層（防循環依賴無限展開）
- 使用 visited set 防重複訪問
- 2D 和 3D 模式共用追蹤邏輯（純計算），各自渲染高亮
- 點擊空白處或按 Escape 退出追蹤模式

**ViewStateContext 擴充**：
```typescript
tracingSymbol: string | null;     // 正在追蹤的 symbol 名稱
tracingPath: string[];            // 追蹤路徑中的 node ID 列表
tracingEdges: string[];           // 追蹤路徑中的 edge ID 列表
```

**邊界條件**：
- symbol 只出現在一條邊 → 只高亮該邊與兩端節點
- 循環依賴 → visited set 防止無限迴圈
- 追蹤結果為空 → 不進入追蹤模式

### F35: 節點 I/O 標記

**描述**：節點上顯示 import 數（入）和 export 數（出）的視覺標記。

**規則**：
- 左上角顯示入箭頭 + importCount（例：↓12）
- 右上角顯示出箭頭 + exportCount（例：↑5）
- 2D 模式：覆蓋在 NeonNode/DirectoryNode 上的 badge
- 3D 模式：sprite text 或 HTML overlay
- importCount=0 且 exportCount=0 → 不顯示標記
- 數字 > 99 顯示「99+」

**資料來源**：`NodeMetadata.importCount` / `NodeMetadata.exportCount`（Sprint 1 已計算）

### F36: 資料流熱力圖

**描述**：邊的 `importedSymbols.length` 映射為邊的粗細和亮度。

**規則**：
- symbol 數量 → 邊線粗細映射：1-2 symbols = 1px，3-5 = 2px，6-10 = 3px，11+ = 4px
- symbol 數量 → 邊線亮度映射：線性插值 opacity 0.3 ~ 1.0
- 熱力圖預設關閉，需手動開啟（避免視覺資訊過載）
- 2D 模式：React Flow edge strokeWidth + opacity
- 3D 模式：Three.js line width + material opacity
- 熱力圖開啟時，粒子流動速度也跟隨 symbol 數量調整（多=快）

**資料來源**：`EdgeMetadata.importedSymbols.length`

### F37: 2D + 3D 雙模式適配

**描述**：S5-1 ~ S5-4 所有功能在 2D 和 3D 模式下都可用。

**規則**：
- 業務邏輯（路徑追蹤演算法、symbol 格式化、熱力圖計算）抽為共用 hook
- 渲染層各自適配（React Flow custom component vs Three.js sprite/material）
- 切換模式時追蹤狀態保留（tracingSymbol/tracingPath 不重置）
- 共用 hook 列表：
  - `useEdgeSymbols(edgeId)` → 格式化 symbol 標籤
  - `usePathTracing()` → 追蹤邏輯 + 路徑計算
  - `useHeatmap()` → 熱力圖計算 + 開關狀態

### F38: 粒子攜帶 Symbol 類型資訊（P1）

**描述**：粒子顏色/大小代表不同 symbol 類型。

**規則**：
- function → 綠色（#00ff88）大粒子（size 3）
- class → 青色（#00d4ff）中粒子（size 2）
- variable/其他 → 白色（#ffffff）小粒子（size 1）
- symbol 類型推斷：基於 symbol 命名慣例（PascalCase=class、camelCase=function/variable）
- 僅 3D 模式適用（2D 粒子為 CSS animation，不易區分大小）

### F39: 路徑追蹤面板（P1）

**描述**：追蹤模式啟動時，右側面板顯示完整路徑列表。

**規則**：
- 與 NodePanel 共用面板區域（追蹤模式時替換面板內容）
- 顯示每一跳的：symbol 名稱、檔案路徑、import 類型（named/default/re-export）
- 可點擊任一跳 → 聚焦到該節點（FOCUS_NODE）
- 面板頂部顯示追蹤的 symbol 名稱 + 總跳數
- Escape 或點擊「結束追蹤」按鈕關閉

### F40: 熱力圖強度切換（P1）

**描述**：Toolbar 按鈕控制熱力圖開關。

**規則**：
- Toolbar 中新增熱力圖 toggle 按鈕（火焰 icon 或類似）
- 開啟/關閉即時切換，無需重載
- 按鈕狀態存在 ViewStateContext（`isHeatmapEnabled: boolean`）
- 預設關閉
- 2D 和 3D 模式共用開關狀態

## 驗收標準

### Sprint 5

- [ ] Hover 邊線 → 浮現搬運的 symbol 名稱，超過 3 個顯示「+N more」
- [ ] 點擊 symbol → 完整傳遞路徑高亮（A→B→C），無關節點暗淡
- [ ] 路徑追蹤深度上限 10 層，循環依賴不會無限展開
- [ ] 節點上可見 import 數（入）和 export 數（出）標記
- [ ] 邊的粗細/亮度反映 symbol 數量（熱力圖效果）
- [ ] 以上所有功能在 2D 和 3D 模式下都正常運作
- [ ] 路徑追蹤面板顯示完整路徑列表，可點擊跳轉
- [ ] 熱力圖 toggle 按鈕可即時切換開關
- [ ] 現有 353+ tests 全部通過，零回歸
- [ ] 2D 模式所有 Sprint 1~4 功能不受影響
- [ ] 3D 模式所有 Sprint 4 功能不受影響

## Sprint 6 功能規格

### F41: OllamaProvider

**描述**：core 層新增 Ollama AI Provider，透過 HTTP fetch 呼叫本地 Ollama daemon。

**規則**：
- 實作 `SummaryProvider` 介面（`name`, `isConfigured()`, `summarize()`）
- HTTP POST `http://localhost:11434/api/generate`，`stream: false`
- 預設模型 `codellama`，可透過 options 設定
- `isConfigured()` 恆為 true（Ollama 不需要 API key）
- 回應格式：`{ response: string }`，取 `response` 欄位為摘要文字
- timeout 30 秒（與既有 Provider 一致，使用 `AI_TIMEOUT_MS`）
- 重用 `buildPrompt()` 產生 prompt

**資料流**：`createProvider('ollama', undefined, { ollamaModel }) → OllamaProvider → fetch localhost:11434`

### F42: 環境變數金鑰管理

**描述**：cli 層讀取環境變數作為 AI API key 來源，優先於 CLI flag。

**規則**：
- 支援三個環境變數：`CODEATLAS_AI_KEY`（通用）、`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`
- Provider-specific 環境變數優先於通用環境變數
- 環境變數優先於 CLI flag `--ai-key`（環境變數更安全，不留在 shell history）
- 環境變數不存在 → fallback CLI flag
- 不改現有 OpenAI/Anthropic Provider 內部邏輯

### F43: .codeatlas.json 設定檔

**描述**：專案根目錄設定檔，支援 AI provider、Ollama model、port、ignore 目錄。

**規則**：
- 檔案位置：專案根目錄 `.codeatlas.json`
- 支援欄位：`aiProvider`（disabled/ollama/openai/anthropic）、`ollamaModel`（字串）、`port`（1~65535）、`ignore`（字串陣列）
- 金鑰不存入設定檔。偵測到含 `key` / `secret` / `token` 欄位 → console 警告
- 檔案不存在 → 靜默使用預設值
- JSON 格式錯誤 → 友善錯誤訊息 + 使用預設值
- 無效 `aiProvider` 值 → 錯誤訊息 + 使用 `'disabled'`

### F44: AI 三模式切換

**描述**：離線（disabled）/ 本地（ollama）/ 雲端（openai/anthropic）三種 AI 模式。

**規則**：
- AI Provider 優先級：CLI flag `--ai-provider` > `.codeatlas.json` > 環境變數 > `'disabled'`
- API Key 優先級：環境變數 > CLI flag `--ai-key`
- Port 優先級：CLI flag `--port` > `.codeatlas.json` > `3000`
- Ollama Model 優先級：CLI flag `--ollama-model` > `.codeatlas.json` > `'codellama'`
- 統一由 `resolveConfig()` 函式合併所有來源

### F45: 隱私標示（PrivacyBadge）

**描述**：web UI 顯示當前 AI 模式 + 隱私狀態。

**規則**：
- 離線模式：顯示「AI 已關閉」，灰色文字
- 本地模式：顯示「✅ 本地模式 — 程式碼不出站」，綠色
- 雲端模式：顯示「⚠️ 雲端模式 — 原始碼片段將傳送至 {provider}」，琥珀色
- 放置位置：NodePanel → AiSummary 區塊上方
- 讀取 GET /api/ai/status 回傳的 mode + privacyLevel
- 所有色彩引用 theme.ts

### F46: 金鑰安全措施

**描述**：防止金鑰意外洩露的安全措施。

**規則**：
- .codeatlas.json 自動加入 .gitignore 範本（文件提示，非自動寫入）
- CLI `--ai-key` flag help 文字標示「不建議使用，金鑰會留在 shell history」
- .codeatlas.json 偵測到含 key/secret/token 欄位 → console.warn
- 金鑰不出現在任何 log 輸出中

### F47: 錯誤處理強化

**描述**：Ollama 各種錯誤情境的友善處理。

**規則**：
- Ollama 未安裝/未啟動（ECONNREFUSED）→ 提示安裝 URL + `ollama serve`
- 模型不存在（404）→ 提示 `ollama pull {model}`
- 連線逾時 → 提示檢查 Ollama 是否運行
- 回應 JSON 解析失敗 → graceful fallback（空摘要 + 錯誤訊息）
- 前端：錯誤訊息顯示在 AiSummary 區塊內（既有 error state）

### F48: GET /api/ai/status 擴充

**描述**：擴充現有 AI 狀態端點，新增隱私資訊。

**規則**：
- 既有欄位保留：`enabled`（boolean）、`provider`（string）
- 新增 `mode`：`'disabled'` / `'local'` / `'cloud'`
- 新增 `privacyLevel`：`'none'`（disabled）/ `'full'`（ollama）/ `'partial'`（cloud）
- 新增 `model`：string | null（Ollama 有值，其他為 null）
- 向下相容：前端讀不到新欄位時 fallback 為舊行為

### F49: Ollama 模型選擇

**描述**：支援指定 Ollama 模型名稱。

**規則**：
- CLI flag `--ollama-model <name>` 指定模型
- .codeatlas.json `ollamaModel` 欄位
- 預設 `'codellama'`
- 優先級：CLI flag > .codeatlas.json > 預設
- UI 顯示當前使用的模型名稱（PrivacyBadge 或 AiSummary header 旁）

## 驗收標準

### Sprint 6

- [ ] `--ai-provider ollama` 啟動後，AI 摘要可用（呼叫 localhost:11434）
- [ ] 環境變數 `CODEATLAS_AI_KEY` 設定後，無需 CLI flag 即可使用雲端 AI
- [ ] .codeatlas.json 設定 `aiProvider: "ollama"` 後，無需 CLI flag 即可使用本地 AI
- [ ] UI 顯示隱私標示：雲端模式顯示警告、本地模式顯示安全、離線模式顯示關閉
- [ ] Ollama 未安裝時顯示友善錯誤提示（含安裝 URL）
- [ ] Ollama 模型不存在時提示 `ollama pull {model}`
- [ ] `GET /api/ai/status` 回傳 mode + privacyLevel + model
- [ ] 金鑰不存入 .codeatlas.json
- [ ] CLI `--ai-key` flag 顯示不建議警告
- [ ] 設定優先級正確：Provider = CLI > json > env > disabled，Key = env > CLI
- [ ] 現有 435+ tests 全部通過，零回歸
- [ ] 現有 OpenAI/Anthropic Provider 不受影響

## Sprint 7 功能規格

### F50: 函式/類別/方法定義解析

**描述**：擴充 tree-sitter 解析器，從 AST 提取函式、類別、方法定義。

**規則**：
- 新增 `function-extractor.ts`，獨立於現有 `import-extractor.ts`（新增 pass，不改既有解析）
- 支援的定義類型：
  - function declaration：`function foo() {}`
  - arrow function（具名賦值）：`const foo = () => {}`、`const foo = function() {}`
  - class declaration：`class Foo {}`
  - class method：`class Foo { bar() {} }`
  - getter / setter：`class Foo { get x() {} set x(v) {} }`
  - async / generator 變體：`async function foo() {}`、`function* gen() {}`
- 輸出 `ParsedFunction` / `ParsedClass` 結構：
  - name、kind（function/method/getter/setter/constructor）
  - parameters（名稱 + 型別）、returnType
  - startLine、endLine、isExported、isAsync
- 產出 `function` / `class` 類型的 GraphNode，掛在所屬 file 節點下
- Node ID 格式：`{fileId}#functionName` 或 `{fileId}#ClassName`
- Node metadata 擴充：`parentFileId`、`kind`、`parameters`、`returnType`、`lineCount`

**邊界條件**：
- 匿名函式（callback / IIFE）：不建立節點（無穩定 ID）
- 同名函式（overload）：取第一個，或合併 signatures
- 巢狀函式：只取頂層 + class 內方法，不遞迴巢狀

### F51: 靜態呼叫關係分析

**描述**：分析函式之間的呼叫關係，產出 `call` 類型的 GraphEdge。

**規則**：
- 新增 `call-analyzer.ts`，接收 AST + 函式清單，分析呼叫關係
- 支援的呼叫模式：
  - 直接呼叫：`foo()`
  - 方法呼叫：`obj.foo()`、`this.foo()`
  - new 建構：`new Foo()`
- 不支援（標記 confidence: low）：
  - 動態呼叫：`obj[method]()`
  - callback 參數：`setTimeout(fn)`
  - 解構/間接呼叫：`const { fn } = obj; fn()`
- 呼叫解析策略：
  1. 同檔案呼叫：直接匹配函式名
  2. import 的函式：透過 import 關係解析到目標檔案的函式
  3. 無法解析：標記 `confidence: 'low'`，保留邊但不展開路徑
- Edge 格式：`type: 'call'`，metadata 含 `callerName`、`calleeName`、`callType`（direct/method/new）
- Edge ID：`{callerId}--call--{calleeId}`

**邊界條件**：
- 遞迴呼叫（A→A）：建立自邊
- 循環呼叫（A→B→A）：正常建立，路徑追蹤需設深度上限
- 呼叫未匯入的函式（全域/第三方）：不建立邊（外部函式無節點）

### F52: 呼叫鏈圖

**描述**：選一個函式，展開完整呼叫路徑（caller → callee 鏈）。

**規則**：
- 復用 Sprint 5 的 BFS 路徑追蹤演算法，擴充為支援 `call` edge
- 起點：選定的函式節點
- 方向：雙向 — 向上追溯 callers（誰呼叫我），向下追蹤 callees（我呼叫誰）
- 深度上限：預設 5 層（避免爆開）
- 追蹤結果寫入 ViewState（tracingSymbol / tracingPath / tracingEdges），復用現有高亮邏輯
- 面板顯示：呼叫鏈列表（A → B → C），可點擊跳轉

**邊界條件**：
- 無呼叫關係的函式：顯示空鏈提示
- 超過深度上限：截斷並提示「more...」
- low confidence 邊：虛線顯示（區別 high confidence 實線）

### F53: 節點第三層（Zoom Into File）

**描述**：雙擊檔案節點 → 展開該檔案內部 → 看到函式/class 子節點。

**規則**：
- 觸發：2D/3D 中雙擊檔案節點（或按快捷鍵）
- 展開後：
  - 2D：React Flow subflow/group — 檔案節點變為容器，內部排列函式/class 子節點
  - 3D：camera 飛入 + 子場景 — 動畫過渡到檔案內部視圖
- 收合：再次雙擊或按 Escape → 回到檔案級
- ViewState 擴充：新增 `expandedFileId: string | null`
- Graph JSON 擴充：函式/class nodes 透過 `parentFileId` 關聯到 file node
- 預設：只載入被雙擊的檔案的子節點（不全部載入，避免 JSON 暴增）
- API 支援：GET /api/graph/functions/:fileId 按需載入

**效能考量**：
- 函式級節點數可能是檔案級 5-10 倍
- 預設不展開 → 按需載入 → 展開後快取

### F54: 函式 I/O 視覺化

**描述**：函式節點顯示參數（輸入）和回傳型別（輸出）。

**規則**：
- 函式節點上方顯示入口箭頭（參數列表）
- 函式節點下方顯示出口箭頭（回傳型別）
- 面板中展示完整函式簽名：`function foo(a: string, b: number): boolean`
- 參數超過 3 個時節點上只顯示數量（`3 params`），面板顯示完整
- class 節點顯示方法數量（`5 methods`）

### F55: 2D + 3D 雙模式適配

**描述**：函式級節點、呼叫邊、zoom into 在 2D 和 3D 模式下都可用。

**規則**：
- 2D 函式節點：新 FunctionNode 元件，比 NeonNode 小一號，不同色系（建議 lime/yellow）
- 2D 呼叫邊：虛線/點線（區別 import 實線），粒子速度較快
- 2D zoom into：React Flow subflow + fitView 動畫
- 3D 函式節點：更小球體，亮度略低（子節點層次感）
- 3D 呼叫邊：不同粒子顏色（區別 import 邊）
- 3D zoom into：camera 飛入 + 透明化外部節點

## 驗收標準

### Sprint 7

- [ ] tree-sitter 正確解析 function declaration、arrow function、class、method、getter/setter
- [ ] 解析結果產出 function/class 類型的 GraphNode，含 parentFileId
- [ ] 靜態呼叫分析產出 call 類型 GraphEdge，含 caller → callee
- [ ] 動態呼叫標記 confidence: low
- [ ] 雙擊檔案 → 展開函式/class 子節點（2D + 3D）
- [ ] Escape 或再次雙擊 → 收合回檔案級
- [ ] 選一個函式 → 呼叫鏈高亮（caller → callee 完整路徑）
- [ ] 函式節點顯示參數列表和回傳型別
- [ ] 面板顯示函式簽名詳情
- [ ] GraphNode 支援 type: 'function' | 'class'，含 parentFileId
- [ ] GraphEdge 支援 type: 'call'，含 caller/callee 資訊
- [ ] 既有模組級 nodes/edges 不受影響（向下相容）
- [ ] Graph JSON 格式向下相容（新增欄位為 optional）
- [ ] 現有 523+ tests 全部通過，零回歸
- [ ] 模組級圖譜（Sprint 1-6）所有功能不受影響

## Sprint 8 功能規格

### F56: 正向影響分析（Forward Impact Analysis）

**描述**：選節點 → BFS 遍歷所有下游（被影響者）→ 高亮整條影響鏈。

**規則**：
- BFS 遍歷：follow edges where `source === startNodeId`，逐層展開
- 支援所有 edge type：import / export / data-flow / call
- depth limit 預設 5，可透過 depth slider 調整（1-10）
- 截斷：超過 50 個影響節點 → 截斷 + 顯示「影響範圍較大，已截斷至 50 個節點」
- 純函式 `analyzeImpact(startNodeId, edges, 'forward', maxDepth)` 實作
- 回傳 `ImpactAnalysisResult: { impactedNodes, impactedEdges, depthMap }`
- 結果寫入 ViewState，渲染層讀取高亮
- 透過右鍵選單「影響分析（下游）」觸發

**邊界條件**：
- 孤立節點（無邊）→ 顯示「此節點無依賴關係」
- 循環依賴 → visited set 防無限迴圈
- 函式級節點 → call edge 也參與 BFS

### F57: 反向依賴分析（Reverse Dependency Analysis）

**描述**：選節點 → BFS 遍歷所有上游（依賴者）→ 高亮整條依賴鏈。

**規則**：
- BFS 遍歷：follow edges where `target === startNodeId`，逐層展開
- 與 F56 共用 `analyzeImpact` 演算法（direction 參數切換）
- 所有規則同 F56（depth limit、截斷、ViewState 等）
- 透過右鍵選單「依賴分析（上游）」觸發

**邊界條件**：同 F56

### F58: 搜尋聚焦模式（Search Focus Mode）

**描述**：搜尋後整張圖暗掉，只有匹配節點 + 其直接依賴路徑亮起。

**規則**：
- 強化現有 `SearchBar.tsx`
- 搜尋有結果時 → dispatch `ENTER_SEARCH_FOCUS`
- 所有節點/邊 dim 到 opacity 0.1
- 匹配節點 + 直接連接的邊 → opacity 1.0
- Escape 或清空搜尋 → dispatch `EXIT_SEARCH_FOCUS` → 恢復所有 opacity
- 2D 模式：React Flow node/edge style opacity
- 3D 模式：node material opacity + edge line opacity

**邊界條件**：
- 無搜尋結果 → 不進入聚焦模式
- 搜尋聚焦 + 過濾同時啟用 → 過濾先生效，搜尋在過濾結果內聚焦

### F59: 模組過濾面板（Filter Panel）

**描述**：左側可收合面板，支援按目錄、節點類型、邊類型過濾圖譜。

**規則**：
- 新元件 `FilterPanel.tsx`，左側 sidebar
- 三個過濾區段：
  1. 目錄過濾：checkbox tree，從 directory 節點衍生
  2. 節點類型：file / directory / function / class checkboxes
  3. 邊類型：import / export / data-flow / call checkboxes
- 過濾狀態存在 ViewState：`filter: { directories, nodeTypes, edgeTypes }`
- 過濾在 `graph-adapter.ts` 中 applied（渲染前過濾 nodes/edges）
- 預設全部啟用（空陣列 = 全選）
- 2D 和 3D 模式共用過濾狀態

**邊界條件**：
- 過濾後 0 個節點 → 顯示「目前過濾條件下無可顯示的節點」
- FilterPanel 可收合（窄螢幕）

### F60: AI 專案概述（AI Project Overview）

**描述**：一鍵生成整個專案的架構摘要，只送結構資訊不送原始碼。

**規則**：
- 新增 `packages/core/src/ai/overview-builder.ts`
- 從 AnalysisResult 提取結構資訊：totalFiles、totalFunctions、topModules（按 dependencyCount）、moduleRelationships
- 組裝 prompt：只含名稱、類型、數量，不含原始碼（隱私保護）
- 超過 20 個模組 → 只取 top 20
- 新增 API：`POST /api/ai/overview`
- Request: `{ provider?: string }`
- Response: `{ overview, provider, cached, structureInfo: { totalFiles, totalFunctions, topModules } }`
- 快取策略同 AI summary（file-based cache）
- 前端 `OverviewPanel.tsx`：從 Toolbar 觸發，顯示 AI 概述 + 結構統計

**邊界條件**：
- AI 未啟用 → 顯示「需啟用 AI 才能使用此功能」
- prompt 過長 → 截斷到 top 20 模組
- API 超時 → 顯示超時提示 + 重試按鈕

### F61: 右鍵選單（Context Menu）

**描述**：右鍵節點彈出操作選單，支援 2D DOM overlay 和 3D raycaster 投影。

**規則**：
- 新元件 `ContextMenu.tsx`
- 2D 模式：React Flow `onNodeContextMenu` → `event.clientX/clientY` → DOM overlay
- 3D 模式：raycaster 命中節點 → `Vector3.project(camera)` → 螢幕座標 → DOM overlay
- 選單項目：「影響分析（下游）」/「依賴分析（上游）」/「複製路徑」/「在面板中開啟」
- 關閉：click outside / Escape / 選擇項目後

**邊界條件**：
- 右鍵空白區域 → 不彈出（或彈出全域選單，Sprint 8 先不做）
- 3D 模式 raycaster 未命中 → 不彈出

### F62: 2D + 3D 雙模式適配

**描述**：影響分析、搜尋聚焦、過濾、右鍵選單在 2D 和 3D 模式下都正常運作。

**規則**：
- 業務邏輯（BFS、過濾計算）抽為共用 hook/純函式
- 渲染層各自適配（React Flow style vs Three.js material）
- 切換模式時影響分析/過濾/搜尋聚焦狀態保留（不重置）
- 共用 hook：`useImpactAnalysis()`

### F63: 自然語言搜尋（P1）

**描述**：輸入自然語言描述 → AI 提取關鍵字 → 匹配節點。

**規則**：
- AI 啟用時：POST /api/ai/search-keywords → AI 提取關鍵字
- 關鍵字匹配 node label / filePath / AI summary
- AI 未啟用 → fallback：以空格分割 query 為關鍵字
- 搭配 F58 搜尋聚焦模式使用

**邊界條件**：
- AI 回應慢 → 先顯示精確匹配，AI 結果回來後更新
- AI 回傳空關鍵字 → 使用原始 query 精確匹配

## 驗收標準

### Sprint 8

- [ ] 選節點 → 右鍵選單「影響分析（下游）」→ 下游節點 + 邊全部高亮
- [ ] 選節點 → 右鍵選單「依賴分析（上游）」→ 上游節點 + 邊全部高亮
- [ ] 影響分析 depth limit 預設 5，可透過 slider 調整（1-10）
- [ ] 面板顯示影響/依賴節點列表，按 BFS 深度分層
- [ ] 超過 50 個影響節點顯示截斷提示
- [ ] 搜尋後整張圖暗掉，匹配節點 + 直接路徑亮起
- [ ] Escape 或清空搜尋 → 退出聚焦模式
- [ ] FilterPanel 可按目錄/類型/邊類型過濾
- [ ] 過濾後圖即時更新（只顯示符合條件）
- [ ] AI 專案概述一鍵生成，顯示架構摘要
- [ ] AI 概述只送結構資訊不送原始碼
- [ ] 右鍵選單在 2D + 3D 模式都可用
- [ ] 影響分析/搜尋聚焦/過濾在 2D + 3D 都可用
- [ ] 現有 605+ tests 全部通過，零回歸
- [ ] Sprint 1-7 所有功能不受影響

## Sprint 9 功能規格

### F64: 控制面板（Control Panel）

**描述**：統一側邊面板（左側可收合），整合所有功能入口和設定，取代散落各處的零散入口。

**規則**：
- 位置：左側 fixed，top: 0，height: 100vh
- 寬度：280px（展開）/ 44px（收合，只顯示 icon 列）
- z-index: 35（高於 FilterPanel 的 30，低於搜尋的 40-45）
- 五個區段：
  1. **視圖模式**（預設展開）：四種視圖 radio group
  2. **顯示偏好**（預設收合）：Heatmap / 邊標籤 / 粒子 / 標籤密度 toggle
  3. **分析工具**（預設收合）：端到端追蹤 trigger、AI 專案概述
  4. **過濾器**（預設收合）：嵌入 FilterPanel 內容（目錄 / 節點類型 / 邊類型）
  5. **AI 設定**（預設收合，P1）：Provider 切換、隱私模式、連線狀態
- 區段展開/收合透過 state 管理，點擊 header toggle
- 收合後用 icon 快捷列（視圖/顯示/分析/過濾/AI 各 1 icon）
- 面板中可直接觸發：影響分析、路徑追蹤、端到端追蹤、AI 概述
- ControlPanel 取代現有 FilterPanel 的獨立左側欄位，FilterPanel 內容嵌入「過濾器」區段

**ViewState 擴充**：
```typescript
isControlPanelOpen: boolean;  // 控制面板展開/收合
```

**邊界條件**：
- 小螢幕 → 收合設計 + 只有 icon 列（~44px 寬）
- 面板展開時遮蓋圖譜左側，但不影響圖譜互動（pointer-events 正確設定）
- 2D + 3D 模式共用同一面板

### F65: 視圖模式切換

**描述**：四種預設視圖一鍵切換，每種視圖為 filter + display 組合。

**規則**：
- 四種視圖模式：
  1. **全景模式**（panorama）：所有節點 + 所有邊，預設佈局
  2. **依賴視圖**（dependency）：聚焦 import/export 邊，dim 其他
  3. **資料流視圖**（dataflow）：聚焦 data-flow + export 邊 + symbol 標籤 + heatmap
  4. **呼叫鏈視圖**（callchain）：聚焦 call 邊 + 函式節點，自動展開檔案

**視圖預設定義**：
```typescript
export type ViewModeName = 'panorama' | 'dependency' | 'dataflow' | 'callchain';

export interface ViewModePreset {
  name: ViewModeName;
  label: string;
  description: string;
  filter: {
    nodeTypes: NodeType[];   // 空 = 全選
    edgeTypes: EdgeType[];   // 空 = 全選
  };
  display: {
    showHeatmap: boolean;
    showEdgeLabels: boolean;
    showParticles: boolean;
    labelDensity: 'all' | 'smart' | 'none';
    expandFiles: boolean;
  };
}
```

**切換邏輯**：
1. 使用者選擇視圖 → dispatch `SET_VIEW_MODE`
2. Reducer 更新 `activeViewMode`，同時清除衝突狀態（impact / searchFocus / e2eTracing / 手動 filter）
3. graph-adapter 的 `applyViewMode()` 根據 preset filter 過濾 nodes/edges
4. 渲染層根據 preset display 控制 heatmap/label/particle
5. 手動 filter 疊加在視圖預設之上（使用者可微調）
6. 切換視圖時重置手動過濾

**ViewState 擴充**：
```typescript
activeViewMode: ViewModeName;  // 預設 'panorama'
```

**邊界條件**：
- 切換視圖時清除影響分析/搜尋聚焦/端到端追蹤狀態，避免混亂
- 視圖模式 + 手動過濾可疊加（先視圖預設，再手動微調）
- 2D + 3D 模式共用視圖狀態

### F66: 端到端資料流追蹤

**描述**：選一個入口節點（函式/檔案）→ 追蹤 input 如何經由 import → call → export 流到 output → 整條路徑發亮（glow effect）。

**規則**：
- 從 startNodeId 出發，沿 all edge types（import → call → export → data-flow）BFS 遍歷
- 追蹤方向：forward only（從入口到 output）
- 記錄每步的 symbol + edgeType（面板需要顯示）
- depth limit 預設 10，可透過控制面板調整（1-20）
- 截斷閾值 30 個節點（路徑可讀性）
- 循環偵測：visited set 防止無限迴圈
- 純函式 `traceE2E(startNodeId, edges, maxDepth)` 實作

**資料結構**：
```typescript
export interface E2EStep {
  nodeId: string;
  nodeLabel: string;
  edgeId: string | null;     // 進入此節點的邊 ID（起點為 null）
  edgeType: string | null;   // import / call / export / data-flow
  symbols: string[];          // 此步驟傳遞的 symbol 名稱
  depth: number;
}

export interface E2ETracingResult {
  path: string[];         // node ID 有序列表
  edges: string[];        // edge ID 有序列表
  steps: E2EStep[];       // 每步資訊（用於面板顯示）
  truncated: boolean;
}
```

**ViewState 擴充**：
```typescript
e2eTracing: {
  active: boolean;
  startNodeId: string | null;
  path: string[];
  edges: string[];
  steps: E2EStep[];
  maxDepth: number;
  truncated: boolean;
} | null;
```

**觸發方式**：
1. 控制面板「分析工具 → 端到端追蹤」→ 進入選取模式 → 點擊節點啟動
2. 右鍵選單新增「端到端追蹤」選項

**渲染**：
- 2D：path 上的 nodes/edges glow color，其他 dim（opacity 0.1）
- 3D：path 上的 node material intensity + edge color alpha
- 復用 Sprint 5 tracing highlight 架構

**面板顯示**（E2EPanel）：
- 右側面板，與 NodePanel / TracingPanel 互斥
- 顯示每步 nodeLabel + edgeType + symbol 名稱
- 可點擊任一步驟 → 聚焦到該節點
- depth slider 調整追蹤深度
- 頂部顯示起點名稱 + 總步數 + 是否截斷

**邊界條件**：
- 孤立節點（無出邊）→ 顯示「此節點無下游路徑」
- 循環依賴 → visited set 防止無限迴圈
- 路徑超過 30 節點 → 截斷 + 提示「路徑較長，已截斷」

### F67: 顯示偏好 Toggle

**描述**：控制面板中的開關，控制圖譜顯示細節。

**規則**：
- Heatmap 開/關 toggle：控制邊粗細/亮度映射，立即生效
- 邊 symbol 標籤 開/關 toggle：控制 hover 邊時是否顯示 symbol，立即生效
- 粒子流動動畫 開/關 toggle：控制邊上粒子流動，立即生效
- 節點標籤密度可調：三檔切換
  - `all`：全部節點顯示標籤
  - `smart`：依 zoom level 智慧縮略（遠處隱藏，近處顯示）
  - `none`：隱藏所有標籤
- 影響分析 depth limit 預設值：slider 控制（1-10，預設 5）

**ViewState 擴充**：
```typescript
displayPrefs: {
  showEdgeLabels: boolean;   // 預設 false
  showParticles: boolean;    // 預設 true
  labelDensity: 'all' | 'smart' | 'none';  // 預設 'smart'
  impactDefaultDepth: number; // 預設 5
};
```

**邊界條件**：
- 視圖模式切換時，顯示偏好會被視圖預設覆蓋（使用者之後可再手動調整）
- 所有 toggle 在 2D + 3D 模式下都生效

### F68: Toolbar 整合修復

**描述**：統一 Toolbar 佈局，修復未連接的按鈕。

**規則**：
- 三區段佈局：
  - **左**：ControlPanel toggle 按鈕（≡ icon）
  - **中**：SearchBar（Ctrl+K）
  - **右**：ViewMode indicator + 2D/3D toggle + 設定（gear icon）
- 修復 FilterPanel Toolbar 按鈕 → 點擊開關 ControlPanel 過濾器區段
- 修復 OverviewPanel Toolbar 按鈕 → 點擊觸發 AI 概述
- 移除散落的獨立浮動元件（ViewToggle、HeatmapToggle），收歸 ControlPanel
- Toolbar position: fixed top，z-index: 40

**邊界條件**：
- 小螢幕時 Toolbar 自適應（SearchBar 縮短，右側元素收進 dropdown）
- 2D + 3D 模式共用同一 Toolbar

### F69: 2D + 3D 雙模式適配

**描述**：控制面板、視圖模式、端到端追蹤、顯示偏好在 2D 和 3D 模式下都正常運作。

**規則**：
- 業務邏輯（BFS、filter、display preferences）抽為共用 hook/純函式
- 渲染層各自適配（React Flow style vs Three.js material）
- 切換 2D/3D 時保留所有狀態：
  - 控制面板展開/收合 → 保留
  - 視圖模式 → 保留
  - 端到端追蹤 → 保留（glow 各自渲染）
  - 顯示偏好 → 保留
- 端到端追蹤發亮在 2D + 3D 模式都可見
- 優先順序堆疊：filter → viewMode → searchFocus → e2eTracing → impact → tracing → hover

### F70: AI 設定 UI（P1）

**描述**：控制面板中的 AI 區段，提供 Provider 切換和狀態顯示。

**規則**：
- 區段內容：
  - Provider 切換 dropdown：disabled / ollama / openai / anthropic
  - 隱私模式指示：與現有 PrivacyBadge 同邏輯
  - 連線狀態：讀取 GET /api/ai/status，顯示綠燈/紅燈
  - 模型名稱顯示（ollama 模式下）
- 可能需新增 `POST /api/settings` 端點（cli 層）
- 切換 Provider 後即時生效（呼叫 API 更新 server 狀態）

**邊界條件**：
- Ollama 未安裝 → 選擇 ollama 後顯示友善提示（含安裝 URL）
- 雲端 Provider 無 API key → 顯示「需設定 API Key（環境變數）」
- 2D + 3D 模式共用同一 AI 區段

### F71: 功能引導 Onboarding（P1）

**描述**：首次使用顯示半透明 overlay，標註主要功能入口。

**規則**：
- 首次使用偵測：localStorage `codeatlas_onboarding_completed` 為 null
- 半透明 overlay（z-index: 100），背景 rgba(0,0,0,0.7)
- 標註提示（spotlight + 文字泡泡）：
  - 「控制面板 — 所有功能入口」
  - 「右鍵 → 影響分析」
  - 「雙擊 → 展開函式」
  - 「Ctrl+F → 搜尋聚焦」
  - 「視圖模式 → 一鍵切換視角」
- 可關閉（X 按鈕）+ 「不再顯示」checkbox
- 關閉後設定 localStorage flag

**邊界條件**：
- 只在首次使用顯示，清除 localStorage 可重新觸發
- overlay 不阻擋鍵盤快捷鍵（Escape 可關閉）
- 2D + 3D 模式共用同一 overlay

### F72: 節點重要度分析（Node Role Classification）

**描述**：core 層新增 heuristic 演算法，自動分類每個節點的「角色」— 業務邏輯、橫向切面、基礎設施、輔助、噪音。

**規則**：
- 純函式 `classifyNodeRole(node, depStats)` 放在 `analyzer/role-classifier.ts`
- 5 步判定：路徑模式 → 檔名模式 → 目錄名模式 → 依賴度分析 → 預設值
- 預設值為 `infrastructure`（保守策略：淡化但不隱藏）
- 只分類 file/directory 節點，function/class 不參與

**邊界條件**：
- 無法判斷時歸為 infrastructure
- 路徑模式比對大小寫不敏感
- 空專案：無節點不分類

### F73: 智慧策展（Smart Curation）

**描述**：預設只顯示「業務邏輯 + 橫向切面」節點，infrastructure 淡化顯示，utility + noise 隱藏。

**規則**：
- `applyCuration()` 在 graph-adapter 層過濾
- 三層過濾順序：applyViewMode → applyCuration → filterNodes/filterEdges
- 無「全部顯示」按鈕或選項（產品方向決策）
- role undefined → 當 infrastructure 處理
- 策展後節點 < 5 → 自動放寬（顯示全部非 noise）

**邊界條件**：
- 舊版 Graph JSON（無 role 欄位）→ 全部當 infrastructure，不隱藏
- 邊過濾：source + target 都在顯示集合才保留

### F74: 手動微調（Pin/Unpin Hidden Nodes）

**描述**：使用者可在過濾面板手動加入被策展隱藏的特定節點。

**規則**：
- ViewState 新增 `pinnedNodeIds: string[]`
- PIN_NODE / UNPIN_NODE actions
- FilterPanel 新增「已隱藏節點」區段
- 不可一鍵全開

**邊界條件**：
- pinnedNodeIds 中節點不存在 → 靜默忽略
- 切換視圖模式後 pinnedNodeIds 保持

### F75: 3D 空間參考系（3D Spatial Reference）

**描述**：3D 模式加入 XYZ 軸線 + 背景網格 + 軸標示文字，建立空間感。

**規則**：
- Three.js GridHelper（地板網格）size=1000, divisions=50, rgba(0,212,255,0.06)
- AxesHelper 長度 500，X=紅 Y=綠 Z=藍，淡色半透明
- Canvas texture sprite 軸標示文字，billboard 朝向相機
- 只限 3D 模式，2D 不受影響

**邊界條件**：
- 深色主題下不搶節點視覺
- 旋轉時始終可見

### F76: ViewState 效能優化（Selector Mechanism）

**描述**：新增 `useViewStateSelector` hook，元件只在 selector 回傳值變化時 re-render。

**規則**：
- 內部使用 `useSyncExternalStore`
- 既有 `useViewState()` 保持不變
- 漸進式遷移：先在 GraphCanvas, NeonNode, NeonEdge 使用

**邊界條件**：
- selector 回傳 object 時需注意 reference stability
- 893+ tests 保護

### F77: 3D 佈局改善（3D Layout Improvement）

**描述**：調整 3d-force-graph 力導向參數，避免節點擠成一團。

**規則**：
- charge strength: -300（增加斥力）
- link distance: 120（增加間距）
- collision radius: 30（添加碰撞力）

**邊界條件**：
- 參數調整後需穩定收斂
- 不影響 2D 模式

### F78: Graph JSON 擴充（Node Role Field）

**描述**：AnalysisResult 中每個節點新增 `role` optional 欄位。

**規則**：
- `NodeMetadata.role?: NodeRole`
- 向下相容（optional 欄位）
- API /api/graph 自動包含（core 層已填入）

**邊界條件**：
- 舊版前端讀不到 role 不影響功能
- Graph JSON schema 不破壞

## Sprint 11 功能規格

### F79: 故事視角系統（Story Perspectives）

**描述**：三種故事視角取代 Sprint 9 四種技術視圖模式，用故事引導使用者理解專案。

**規則**：
- 三種視角：系統框架（System Framework）/ 邏輯運作（Logic Operation）/ 資料旅程（Data Journey）
- 完全取代 ViewModeName（panorama/dependency/dataflow/callchain），不並存
- 新增 `PerspectiveName` 型別：`'system-framework' | 'logic-operation' | 'data-journey'`
- 預設視角：`'logic-operation'`（最接近原 panorama 行為）
- ViewState: `activePerspective: PerspectiveName`（取代 `activeViewMode`）
- Action: `SET_PERSPECTIVE`（取代 `SET_VIEW_MODE`），同樣清除衝突狀態

**ViewModeName 遷移**：
| 舊 ViewMode | 遷移至 | 說明 |
|-------------|--------|------|
| panorama | logic-operation | 全選行為 + 策展 |
| dependency | system-framework | import/export 聚焦 + dagre 分層 |
| dataflow | data-journey | 資料流 + stagger animation |
| callchain | logic-operation | BFS hover 涵蓋呼叫鏈 |

**邊界條件**：
- SET_PERSPECTIVE 清除 impactAnalysis / searchFocus / e2eTracing / filter
- 切換視角時 pinnedNodeIds 保持
- ViewModeName 標記 deprecated，保留但不使用

### F80: 系統框架視角（System Framework）

**描述**：dagre 分層佈局，Cyan 色調，目錄群組卡片 — 2D 專用。

**規則**：
- 佈局引擎：dagre Hierarchical（Top-Down）
- dagre 參數：rankdir=TB, nodesep=60, ranksep=100, marginx=40, marginy=40
- 色調：Cyan `#00d4ff` 單色調
- 目錄群組卡片：背景 `rgba(0, 212, 255, 0.05)`，虛線邊框，顯示目錄名 + 子元素計數
- 節點按層次分佈：UI 層 → API 層 → 服務層 → 資料層
- 靜態佈局，無粒子動畫
- 2D 專用：3D 模式下選擇此視角 → 自動切換至 2D
- filter.edgeTypes: ['import', 'export']

**邊界條件**：
- dagre 佈局失敗 → 回退為力導向佈局 + console.warn
- 3D 模式下切至此視角 → 自動切至 2D 模式
- 從此視角切至 3D → 自動切回邏輯運作

### F81: 邏輯運作視角（Logic Operation）

**描述**：力導向佈局，多色霓虹色調，BFS hover 多跳高亮 — 2D + 3D。

**規則**：
- 佈局引擎：Force-Directed（現有佈局）
- 色調：多色霓虹（現有 Sprint 2 配色系統）
- BFS hover 高亮：移到節點 → 雙向 BFS 遍歷 → 呼叫鏈全部亮起（maxDepth 5）
- 非相關節點淡化至 opacity 0.15
- 粒子流動保留
- filter: 全選（nodeTypes 空 + edgeTypes 空）
- 2D + 3D 皆適用

**邊界條件**：
- 孤立節點（無邊）→ BFS 結果只含自身
- maxDepth 可配置但預設 5
- hover 切換時高亮集合即時更新

### F82: 資料旅程視角（Data Journey）

**描述**：力導向 + 路徑鎖定佈局，Green 色調，stagger animation 350ms — 2D + 3D。

**規則**：
- 佈局引擎：Path Tracing（力導向 + 路徑鎖定）
- 色調：Green `#00ff88` 單色調
- Stagger animation：路徑上節點按順序依次亮起，每步 350ms（老闆核准）
- >30 節點時加速至 100ms/步
- 邊有 stroke-dashoffset 流動動畫（stroke-dasharray: 8 4, 1s linear infinite）
- E2E 面板同步高亮當前步驟，步驟條目滾動跟隨
- 重播按鈕（replay action）
- filter: 全選
- 2D + 3D 皆適用

**邊界條件**：
- 無路徑選擇時只顯示基礎力導向佈局
- stagger >30 節點自動加速
- 重播從第一步重新開始

### F83: 視角切換 UI

**描述**：取代 Sprint 9 四種視圖模式 radio group，新的三選一切換。

**規則**：
- ControlPanel「視圖模式」區段 → 三選一按鈕（系統框架 / 邏輯運作 / 資料旅程）
- 每個按鈕有色標：Cyan / Magenta / Green
- 切換時佈局、色調、互動行為同步變化
- 切換動畫：Framer Motion AnimatePresence + layoutAnimation（300ms ease-out）
- Toolbar 顯示當前視角名稱 pill + 色標

**邊界條件**：
- 切換動畫期間不可重複觸發
- 無閃爍：先計算新佈局再一次性過渡

### F84: 佈局引擎框架（Layout Engine Framework）

**描述**：graph-adapter 層新增佈局路由，根據視角選擇佈局引擎。

**規則**：
- `layout-router.ts`：`computeLayout(engine, input)` 路由函式
- `LAYOUT_PROVIDERS` 註冊表（Record<LayoutEngine, LayoutProvider>）
- 三種 provider：dagre-hierarchical / force-directed / path-tracing
- 統一介面：`LayoutInput` → `LayoutOutput`
- 可擴展設計：未來新增佈局只需 register 新 provider
- fallback：未知 engine → force-directed

**邊界條件**：
- provider 不存在 → 回退 force-directed
- 空節點集 → 回傳空 output
- 佈局計算超時 → 回退 force-directed（三秒保護）

### F85: 視圖模式遷移

**描述**：Sprint 9 四種視圖模式的過濾邏輯完整遷移到三種視角。

**規則**：
- `applyPerspective()` 替代 `applyViewMode()`
- panorama 過濾邏輯 → logic-operation
- dependency 過濾邏輯 → system-framework
- dataflow 過濾邏輯 → data-journey
- callchain 過濾邏輯 → logic-operation（BFS hover 涵蓋）
- `view-modes.ts` 保留但標記 deprecated
- 三層過濾順序：perspective → curation → manual filter

**邊界條件**：
- 舊測試中引用 ViewModeName 需重構
- 確保無功能丟失（逐一對照遷移清單）

### F86: 策展 + 視角整合

**描述**：Sprint 10 智慧策展與新視角正確整合。

**規則**：
- 三層過濾順序不變：perspective → curation → manual filter
- 策展後節點在所有視角中一致（同一批核心節點）
- 手動釘選節點在切換視角時保持
- 影響分析、搜尋聚焦在新視角下正確運作
- 2D/3D 切換時視角保持（系統框架除外）

**邊界條件**：
- 視角切換不改變策展結果
- pinnedNodeIds 跨視角持久

### F87: 3D Bloom 後處理（P1）

**描述**：Three.js UnrealBloomPass，資料旅程視角中選中路徑 Bloom 發光效果。

**規則**：
- UnrealBloomPass 參數：strength 0.6, radius 0.4, threshold 0.85
- 只在資料旅程視角 + 3D 模式 + 有選中路徑時啟用
- Bloom 效果作用於路徑上的節點和邊
- 不影響其他視角的 3D 渲染

**邊界條件**：
- 無選中路徑 → 不啟用 Bloom
- 切換視角時關閉 Bloom
- WebGL 不支援 → 靜默降級（無 Bloom 但功能正常）

## 驗收標準

### Sprint 11

- [ ] 三種視角切換 UI 取代舊四種視圖模式
- [ ] 系統框架：dagre 分層渲染正確，Cyan 色調，目錄卡片 + 子元素計數
- [ ] 邏輯運作：BFS hover 多跳高亮，非相關淡化至 0.15，粒子保留
- [ ] 資料旅程：stagger 350ms 逐步亮起，邊流動動畫，E2E 面板同步，重播可用
- [ ] 切換視角時佈局 + 色調 + 互動同步變化，無閃爍
- [ ] Sprint 9 四種視圖的過濾邏輯完整遷移，無功能丟失
- [ ] 佈局引擎框架可擴展（LAYOUT_PROVIDERS 註冊表）
- [ ] 策展在三視角中正確運作，三層過濾順序：perspective → curation → manual filter
- [ ] 手動釘選跨視角保持
- [ ] 系統框架 2D 專用，3D 模式自動回退
- [ ] 邏輯運作、資料旅程 2D + 3D 皆可用
- [ ] 983+ tests 全部通過，零回歸
- [ ] pnpm build 全通過

### Sprint 10

- [ ] core 分析結果中每個節點含 role 欄位
- [ ] 5 種角色分類正確，heuristic 準確率 > 80%
- [ ] 預設只顯示 business-logic + cross-cutting，infrastructure 淡化
- [ ] 無「全部顯示」按鈕或選項
- [ ] 過濾面板可手動釘選/取消釘選隱藏節點
- [ ] 3D 模式顯示 XYZ 軸線 + 背景網格 + 軸標示文字
- [ ] 深色主題下網格淡色半透明
- [ ] useViewStateSelector hook 可用，useViewState() API 不變
- [ ] 節點分佈有空間感，不擠成一團
- [ ] GraphNode.role optional，向下相容
- [ ] 893+ tests 全部通過，零回歸
- [ ] 2D 模式不受 3D 空間參考系影響

### Sprint 9

- [ ] 左側可收合控制面板，包含：視圖模式、顯示偏好、分析工具、過濾器、AI 功能區段
- [ ] 面板可收合（收合後只顯示 icon 列 ~44px）
- [ ] 面板中可直接觸發：影響分析、路徑追蹤、端到端追蹤、AI 概述
- [ ] 所有既有功能都能從控制面板找到入口
- [ ] 四種視圖模式可一鍵切換：全景 / 依賴 / 資料流 / 呼叫鏈
- [ ] 切換視圖時圖即時更新（過濾 + 高亮 + display 變更）
- [ ] 每種視圖有明確的視覺差異
- [ ] 視圖模式 + 手動過濾可疊加
- [ ] 選入口節點 → 端到端追蹤整條路徑發亮（import → call → export 鏈）
- [ ] 面板顯示路徑每一步 + 傳遞的資料（symbol 名 / 參數 / 回傳值）
- [ ] 端到端追蹤支援 depth limit（預設 10，可調）+ 循環偵測
- [ ] Heatmap 開/關、邊標籤 開/關、粒子動畫 開/關 toggle 立即生效
- [ ] 節點標籤密度可調（全顯示/智慧縮略/隱藏）
- [ ] FilterPanel Toolbar 按鈕已連接，點擊可開關
- [ ] OverviewPanel Toolbar 按鈕已連接，點擊可觸發 AI 概述
- [ ] Toolbar 佈局統一：左 + 中 + 右 三區段
- [ ] 控制面板 / 視圖模式 / 端到端追蹤 / 顯示偏好在 2D + 3D 模式都正常運作
- [ ] 現有 718+ tests 全部通過，零回歸
- [ ] Sprint 1-8 所有功能不受影響

### F88: 白紙黑格全局主題

**描述**: 深色霓虹 → 白紙黑格全局視覺主題替換。

**規則**:
- 背景: #fafafa 白紙 + 雙層 CSS 網格（20px #d8d8d8 + 100px #c8c8c8）
- 節點: 白底 #ffffff + 實線邊框 + stroke-width 1.5 + 輕微陰影
- 邊: #9aa8bc 灰色 + stroke-width 1.5 + 無 glow
- 所有元件（Toolbar, ControlPanel, Header）白底 + border 1.5px solid #d0d0d8
- Design tokens 從核准圖稿 CSS 變數提取，見 sprint12-visual-architecture.md

### F89: 目錄聚合引擎

**描述**: Core 層新增 `aggregateByDirectory()`，將檔案級 Graph JSON 聚合為目錄級。

**規則**:
- 按第一層目錄分組
- 目錄間邊 = 子檔案間依賴聯集（去重，無自循環）
- 分類: entry / logic / data / support
- 扁平專案（<=2 個目錄）回退 null
- API `/api/graph` 回應新增 `directoryGraph` 欄位

### F90: 視角切換 Tab Bar

**描述**: 頂部 Tab Bar 取代 ControlPanel 內的 radio 選擇。

**規則**:
- 三個 Tab: 系統框架 / 邏輯運作 / 資料旅程
- Active tab: 白底 + 邊框（底部無邊框）+ font-weight 600
- 色點 8px: 藍色 / 三色漸層 / 綠色
- 計數 badge: 目錄數 / 檔案數 / 入口數

### F91: 系統框架 = 目錄鳥瞰

**描述**: 系統框架視角顯示目錄卡片（5~15 張），不是檔案節點。

**規則**:
- 資料源: directoryGraph（非檔案級）
- DirectoryCard: 白底 + 色帶 + 圓點 + 目錄名 + fileCount badge
- dagre 佈局: TB, nodesep 60, ranksep 100
- 邊: elbowPath, stroke #9aa8bc, marker-end arrow
- hover: 高亮卡片 + 連接邊, 非相關 dimmed 0.25
- 底部 Legend Bar

### F92: 邏輯運作 = 聚焦模式

**描述**: 邏輯運作視角改為 click 聚焦（非 hover 高亮），預設全 dimmed。

**規則**:
- 預設: 所有節點 dimmed 0.08, 所有邊 opacity 0, 中央提示
- click 節點 → BFS maxDepth 5 找呼叫鏈
- 鏈上節點 active (category-bg, stroke-width 2.5)
- 非鏈保持 dimmed 0.08
- 底部 ChainInfoPanel: 鏈名 + 節點數 + 清除按鈕
- ★ 推薦入口: business-logic route/API 入口, 黃色 #f59e0b
- 重置: click 空白 / 清除按鈕
- 六色分類: routes/services/controllers/models/utils/middleware

### F93: 資料旅程 = 播放模式

**描述**: 資料旅程視角改為逐步出現（非逐步高亮），節點從 opacity 0→1。

**規則**:
- 初始: entry 節點可見（綠色框 + 脈衝）+ 中央提示
- click entry → 350ms/步 stagger 播放
- 節點 opacity 0→1, 邊 stroke-dashoffset 200→0
- current 節點: stroke-width 3, drop-shadow glow
- lit 節點: stroke-width 2.5
- 右側 JourneyPanel 280px: 步驟列表 (active/done/inactive)
- >30 步加速至 100ms
- 重播按鈕: bg #2e7d32, hover #1b5e20

### F94: graph-adapter directoryGraph 分流

**描述**: `applyPerspective()` 支援 directoryGraph 資料源分流。

**規則**:
- system-framework + directoryGraph 存在 → 使用目錄數據
- 其他視角 → 使用檔案數據
- perspective-presets 新增 dataSource: 'directory' | 'file'

### Sprint 12 驗收標準

- [ ] 背景 #fafafa + 雙層網格可見
- [ ] 所有元件白底實線，無殘留霓虹
- [ ] 系統框架顯示目錄卡片（5~15 張），不是檔案節點
- [ ] 邏輯運作預設全 dimmed + 中央提示, click 才亮
- [ ] 資料旅程節點逐步出現（opacity 0→1）
- [ ] Tab Bar 三分頁正常切換
- [ ] CSS 值與核准圖稿完全一致
- [ ] 1092+ tests 零回歸
- [ ] pnpm build 通過

---

## Sprint 13 功能規格 — 方法/端點級三視角

### F95: API 端點識別模組（Core）

**描述**: 新增 `endpoint-detector.ts`，解析 Express/Fastify API 端點定義，建立 `EndpointGraph`。

**規則**:
- Pattern matching 支援 Express Router/App + Fastify 標準寫法
- 輸出 `ApiEndpoint`（id, method, path, handler, handlerFileId, middlewares, description）
- 從 handler BFS 追蹤呼叫鏈（`EndpointChain` + `ChainStep`），深度 >10 截斷
- 非 web 框架專案回退 null
- `/api/graph` 回應新增 `endpointGraph` 欄位

### F96: 智慧目錄聚合升級（Core）

**描述**: 升級 `aggregateByDirectory()`，占比 >70% 的目錄自動展開為子目錄卡片。

**規則**:
- 先按第一層目錄聚合，計算檔案占比
- >70% 占比的目錄展開為子目錄
- DirectoryNode 新增 `sublabel`（完整路徑）, `category`（frontend/backend/infra）, `autoExpand`
- 目標卡片數 5~17
- 展開後依賴正確計算

### F97: 系統框架改造（Web）

**描述**: 系統框架視角改為 click 選取 + BFS 高亮 + 右側目錄詳情面板。

**規則**:
- 卡片結構: 5px 色條（frontend 紫 / backend 藍 / infra 灰）+ card body
- Click 選取: 藍色光圈 2.5px solid #1565c0
- BFS 高亮: 相連邊加粗, 不相連 dimmed (卡片 0.3, 邊 0.1)
- 右側面板 `SFDetailPanel`（300px）: 📊 Stats + 📄 Files 可展開 + ⬆ Upstream + ⬇ Downstream
- 邊路徑: calcEdgePath（垂直/水平 Bezier 自動判斷）

### F98: 邏輯運作改造（Web）

**描述**: 邏輯運作視角改為分類群組初始 + click 方法 → dagre TB 呼叫鏈流程圖。

**規則**:
- 初始: 5 個分類群組卡片（routes/middleware/services/models/utils）
- 群組色碼: routes #1565c0, middleware #00838f, services #7b1fa2, models #4e342e, utils #546e7a
- 卡片: W=240, rowH=24, headerH=36, padY=12, >5 方法收合
- 群組間: 虛線依賴箭頭 (stroke-dasharray: 6 3, opacity: 0.6)
- 鑽取: click 方法 → 群組消失 → dagre TB 流程圖 (nodeW=200, nodeH=44, layerH=100)
- 3 條預定義呼叫鏈 (upload/query/auth)
- 右側面板 `LODetailPanel`（300px）: 🔧 Method + Signature + Class/File + Callers/Callees + Complexity/Exec
- 清除: 重建群組卡片

### F99: 資料旅程改造（Web）

**描述**: 資料旅程視角改為 API 端點入口 + 請求鏈 stagger 播放 + 資料轉換面板。

**規則**:
- 初始: 端點卡片分類選擇（URL prefix 自動分類）
- 端點卡片: 260×64px, 綠色虛線框, 左側分類色條, 脈衝環動畫
- 播放: stagger animation 350ms/step, fadeIn 20ms, 邊 appear 0.8
- 步驟節點: 340×76px (Step N + method + description)
- 右側面板 `DJPanel`（300px）: 步驟列表三態 + Input/Output/Transform 明細展開
- 面板三態: 未到達(灰) / 進行中(綠光暈) / 已完成(綠實心)
- 明細: 手動點擊展開（動畫期間只高亮不展開）
- 方法→位置映射: Method + Class + File

### F100: 三種右側面板切換

**描述**: `RightPanel.tsx` 面板容器，根據視角自動切換面板內容。

**規則**:
- system-framework → SFDetailPanel
- logic-operation → LODetailPanel
- data-journey → DJPanel
- 切換無閃爍，狀態重置正確
- SVG 動態尺寸（超出可滾動）
- LO 縮放控制: +/-/⊞ (每次 ±15%)
- PerspectivePreset 更新: interaction + dataSource 改為方法/端點級

### Sprint 13 驗收標準

- [ ] SF: 智慧聚合 5~17 張卡片（VideoBrief: ~17）
- [ ] SF: click 選取 + BFS 高亮 + 右側目錄詳情
- [ ] LO: 5 分類群組初始，>5 收合
- [ ] LO: click 方法 → dagre TB 流程圖
- [ ] LO: 右側方法簽名面板 + class/file
- [ ] DJ: API 端點分類選擇
- [ ] DJ: stagger 播放 + 面板三態 + 明細展開
- [ ] DJ: 方法→位置映射
- [ ] 三種面板正確切換
- [ ] 1235+ tests 零回歸
- [ ] pnpm build 通過

---

## Sprint 18: Python + Java 多語言支援

### F101: 多語言型別系統（SupportedLanguage）

**描述**：統一的語言型別，貫穿整個解析管線。

**型別定義**：
```typescript
type SupportedLanguage = 'javascript' | 'typescript' | 'python' | 'java';
```

**語言偵測**：
| 副檔名 | 語言 |
|--------|------|
| `.ts`, `.tsx` | typescript |
| `.js`, `.jsx`, `.mjs`, `.cjs` | javascript |
| `.py`, `.pyw` | python |
| `.java` | java |

### F102: Python 語法解析

**描述**：tree-sitter Python grammar 載入 + Python import/function/call 提取。

**Python import 支援**：
| 模式 | 範例 | 支援 |
|------|------|------|
| 絕對 import | `import os` | ✅ |
| from import | `from os.path import join` | ✅ |
| relative import | `from . import utils` | ✅ |
| relative from | `from ..models import User` | ✅ |
| `__init__.py` | 目錄即模組 | ✅ |
| wildcard | `from X import *` | ✅（標記 namespace） |
| aliased | `import numpy as np` | ✅ |
| 動態 import | `importlib.import_module()` | ❌ 不支援 |

**Python function 支援**：
| 結構 | 支援 |
|------|------|
| `def foo():` | ✅ |
| `async def foo():` | ✅（標記 async） |
| `class Foo:` | ✅ |
| `@decorator` | ✅ |
| `*args` / `**kwargs` | ✅（標記 isRest） |
| typed parameters | ✅ |
| return type annotation | ✅ |
| `self`/`cls` 自動剝離 | ✅ |

**Python call 支援**：
| 模式 | 支援 |
|------|------|
| `foo()` | ✅ direct |
| `self.method()` | ✅ method（isThisCall） |
| `cls.method()` | ✅ method（isThisCall） |
| `obj.method()` | ✅ method |

### F103: Java 語法解析

**描述**：tree-sitter Java grammar 載入 + Java import/function/call 提取。

**Java import 支援**：
| 模式 | 範例 | 支援 |
|------|------|------|
| 一般 import | `import com.foo.Bar;` | ✅ |
| static import | `import static com.foo.Bar.method;` | ✅ |
| wildcard | `import com.foo.*;` | ✅（標記 namespace） |
| package 宣告 | `package com.foo;` | ✅（不產生 edge） |
| classpath 解析 | Maven/Gradle | ❌ 不支援 |

**Java function 支援**：
| 結構 | 支援 |
|------|------|
| class | ✅ |
| method | ✅（含 return type、修飾符） |
| constructor | ✅ |
| interface | ✅ |
| enum | ✅ |
| annotation | ✅ |
| varargs (`...`) | ✅（標記 isRest） |

**Java call 支援**：
| 模式 | 支援 |
|------|------|
| `method()` | ✅ direct |
| `this.method()` | ✅ method（isThisCall） |
| `obj.method()` | ✅ method |
| `new Foo()` | ✅ new |

### F104: 語言感知 Import Resolver

**描述**：import-resolver 根據語言選擇不同的路徑探測策略。

| 語言 | 副檔名探測 | Index 探測 | 路徑轉換 |
|------|-----------|-----------|---------|
| JS/TS | `.ts` → `.tsx` → `.js` → `.jsx` | `/index.ts` → `/index.js` | 原路徑 |
| Python | `.py` → `.pyw` | `/__init__.py` | dots → slashes（`from ..models` → `../models`） |
| Java | `.java` | — | dots → slashes（`com.foo.Bar` → `com/foo/Bar`） |

### F105: 語言感知 Call Analyzer

**描述**：call-analyzer 根據語言使用不同的 AST node type 和 skip name 集合。

| 語言 | Call node type | Method node type | Skip names |
|------|---------------|-----------------|------------|
| JS/TS | `call_expression` / `CallExpression` | `member_expression` / `PropertyAccessExpression` | `console`, `Math`, `JSON`... |
| Python | `call` | `attribute` | `len`, `print`, `dict`, `range`... |
| Java | `method_invocation` | `method_invocation`（含 receiver） | `System`, `String`, `Collections`... |

### Sprint 18 驗收標準

- [x] Python 專案 import 正確提取（絕對/from/relative/wildcard）
- [x] Java 專案 import 正確提取（import/static/wildcard/package）
- [x] Python 函式+類別正確提取（def/class/async/decorator）
- [x] Java 方法+類別正確提取（class/method/constructor/interface/enum）
- [x] call-analyzer 支援 Python self.method() / Java this.method()
- [x] 語言自動偵測（.py/.java/.ts）
- [x] JS/TS 零回歸
- [x] pnpm build 通過
- [x] pnpm test 通過（784 tests, 65 new）
