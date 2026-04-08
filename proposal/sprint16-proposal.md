# Sprint 提案書: Sprint 16 — AI 體驗完整化

> **提案人**: PM
> **日期**: 2026-04-07
> **專案**: CodeAtlas
> **Sprint 類型**: full（全流程）
> **前置 Sprint**: Sprint 15.1（✅ 附條件通過 — AI 管線已通，體驗待加強）
> **產品診斷**: `proposal/sprint16-diagnosis.md`（六問全通過）
> **外部審核**: GPT 5.4 審核 → 補齊 5 項缺口 + 8 個規格問題

---

## 1. 背景與目標

### 問題

Sprint 14-15 建了 AI 引擎 + 管線 + 前端插槽，Sprint 15.1 打通了管線，但：

1. **AI 品質不達標** — Gemma4 本地模型太弱（LO 32% / SF 8% / DJ 0%），中文回英文
2. **自動掃全專案浪費資源** — 啟動就跑全量 AI 分析，大專案等很久
3. **前端設定不連動後端** — 選 Provider 只是 UI 狀態，不通知後端
4. **AI 結果不持久** — 重啟歸零，每次都要重新分析
5. **AI 內容不明顯** — 灰色小字，用戶看不出差異
6. **Claude CLI Windows 回應解析不穩定** — 部分修了，需驗證

### 目標

**讓用戶真正看到、用到 AI 功能**。

老闆原則：
> 「用 AI 分析讓使用者能快速了解某個專案的架構、原理、邏輯以及資料流」
> 「不應該一次掃描全部專案，應該要讓使用者選擇才去掃描，不然浪費資源」
> 「思考如何讓使用者體驗良好」

### 目標體驗流程（方案 C：引導 + 按需分析）

```
第一次使用（引導式）：
  codeatlas web → 看到三視角（純結構，無 AI）
  → 右上角提示：「啟用 AI 分析，讓 CodeAtlas 幫你讀懂這個專案」
  → 點擊 → 設定 Provider（Claude / Ollama / API Key）
  → 測試連線 ✅ → 設定持久化到 .codeatlas.json
  → 引導結束，AI 功能就緒

日常使用（按需分析）：
  三視角瀏覽 → 看到感興趣的區域
  → SF 視角：目錄卡片有「分析此目錄角色」按鈕 → 點擊 → 只分析該目錄
  → LO 視角：方法群組有「解釋這組邏輯」按鈕 → 點擊 → 只分析該群組
  → DJ 視角：端點有「解釋這條資料流」按鈕 → 點擊 → 只分析該請求鏈
  → 結果幾秒後出現，永久快取（下次不重跑）

快捷操作：
  → 控制面板「分析全部」按鈕（想一次跑完可用）
  → 控制面板「分析核心」按鈕（只分析 business-logic + cross-cutting 角色目錄）
```

---

## 2. 目標用戶

| 用戶 | 場景 | 期望 |
|------|------|------|
| 工程師 | 接手陌生專案，想快速看懂架構 | 選幾個核心目錄 → AI 中文摘要 → 5 分鐘理解結構 |
| Vibe coder | AI 生成的專案，想理解程式碼 | 選端點 → AI 解釋每一步做什麼 → 知道資料怎麼流 |
| PM / QA | 需要了解技術架構做決策 | 看到中文摘要 + 端點描述 → 不問工程師也能理解 |

---

## 3. 核心功能

### P0（必做）

| # | 功能 | 描述 | 層 |
|---|------|------|---|
| S16-1 | **按需 AI 分析 API + Job 模型** | 新增 `POST /api/ai/analyze` + `GET /api/ai/jobs/:jobId`。完整 job 狀態機（見 §附錄 A）。 | cli |
| S16-2 | **Provider 設定連動後端** | 新增 `POST /api/ai/configure`。前端選擇器 → 後端切換 → .codeatlas.json 持久化（見 §附錄 B）。 | cli + web |
| S16-3 | **AI 結果持久化 + 快取契約** | AI 結果寫入磁碟，完整 cache key 規則（見 §附錄 C）。 | cli |
| S16-4 | **Prompt 中文化 + 結構化輸出** | 所有 Prompt 模板強制：繁體中文、JSON 結構、字數上限、禁止 markdown 包裹（見 §附錄 D）。 | core |
| S16-5 | **三視角按需分析按鈕** | 具體文案 + hover tooltip + 已分析狀態顯示（見 §附錄 E）。 | web |
| S16-6 | **AI 內容視覺強化** | AI 區塊獨立背景色 + ✨ icon + 字級 ≥13px + MethodRole badge 加大加色 + DJ 四區塊色彩區分。 | web |
| S16-8 | **控制面板分析操作** | 「分析全部」+「分析核心目錄」按鈕 + 進度百分比。 | web |
| S16-9 | **Claude CLI 回應解析穩定化** | 補完邊界情況：無輸出、stderr warning、非 JSON fallback。 | core |
| S16-11 | **移除自動全量分析** | 移除 Sprint 15.1 的 server 啟動即跑全量分析。改為純按需，啟動只載入快取。 | cli |

### P1（應做，視時間）

| # | 功能 | 描述 |
|---|------|------|
| S16-7 | **首次使用引導** | 偵測 AI 未設定 → 浮動提示 → 點擊展開 AI 設定 → 不阻斷主流程 |
| S16-10 | **AI 進度體驗改善** | shimmer loading 效果 + 「已分析 3/12」百分比 + 完成 toast |

> **P0/P1 調整說明**：首次引導（S16-7）從 P0 降為 P1，因為 Sprint 成敗取決於「分析流程跑通且狀態一致」，不是引導文案。移除自動全量分析（S16-11）升為 P0，因為這是老闆明確要求。

---

## 4. 範圍界定

### 做

- 按需分析 API + Job 狀態機 + 結果查詢
- Provider 設定連動後端 + .codeatlas.json 持久化
- AI 結果持久化 + 完整 cache key 契約
- Prompt 繁體中文化 + 結構化 JSON 輸出規範
- 三視角按需分析按鈕 + AI 內容視覺強化
- 控制面板「分析全部 / 分析核心」
- Claude CLI 回應解析穩定化
- 移除自動全量分析

### 不做

- 多語言支援（Python/Java）→ Sprint 18+
- 增量分析（只分析變更的檔案）→ 後續
- AI streaming 逐字顯示
- 新增 AI Provider（現有 6 種夠用）
- 程式碼瘦身（→ Sprint 17 專門處理）

---

## 5. 確認的流程

```
需求 → 設計 → UI 圖稿 → G1（圖稿審核）→ 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）→ 文件 → G4（文件審查）
```

> **有 G1**：有 UI 變更（按需分析按鈕、視覺強化、引導提示）
> **G1 阻斷**：圖稿未審核通過前不得開始前端實作

---

## 6. 初步時程與依賴

```
Phase 1（並行，後端 + core）：
  T1  POST /api/ai/analyze + Job 模型（cli）
  T2  POST /api/ai/configure（cli）
  T3  AI 快取持久化 + cache 契約（cli）
  T4  Prompt 中文化 + 結構化輸出（core）
  T9  Claude CLI 穩定化（core）
  T11 移除自動全量分析（cli）

↓ Phase 1 完成 + G1 圖稿通過

Phase 2（並行，前端）：
  T5  三視角按需分析按鈕（web）
  T6  AI 內容視覺強化（web）
  T8  控制面板分析操作（web）

↓ Phase 2 完成

Phase 3：
  T10 測試 + 回歸

Phase 4：
  T12 文件更新
```

---

## 7. 驗收標準

### 功能驗收

| # | 驗收項 | 可測標準 |
|---|--------|---------|
| 1 | Provider 設定連動 | 前端選 Provider → POST /api/ai/configure → .codeatlas.json 寫入成功 → 重啟 server → GET /api/ai/status 回傳新 provider |
| 2 | SF 按需分析 | 點「分析此目錄角色」→ job 狀態 queued→running→succeeded → API 回傳合法 DirectorySummary JSON → 前端顯示繁體中文摘要 |
| 3 | LO 按需分析 | 點「解釋這組邏輯」→ 同上流程 → 回傳合法 BatchMethodSummary JSON → 前端顯示 MethodRole badge + 繁體中文摘要 |
| 4 | DJ 按需分析 | 點「解釋這條資料流」→ 同上流程 → 回傳合法 ChainExplanation JSON → 前端顯示中文描述 + INPUT/OUTPUT/TRANSFORM |
| 5 | AI 成功率 | 在 CodeAtlas 自身專案（44 方法 / 26 目錄 / 35 端點）上測試，使用 Claude API 或 Gemini API 時，成功產出**合法 zod schema 結果**的比例 ≥90% |
| 6 | 回應速度 | 雲端 Provider（Claude/Gemini）：單次分析 95th percentile <10s。本地 Provider（Ollama）：不保證速度，但不 timeout（≤300s） |
| 7 | 快取持久化 | 分析結果存入 .codeatlas/cache/ai-results.json → 重啟 server → GET /api/graph 回傳含 AI 欄位 → 不重新呼叫 AI |
| 8 | 快取失效 | 切換 Provider → 舊結果保留顯示（標記 stale provider）→ 重新分析時用新 provider |
| 9 | 純按需 | server 啟動 → 不自動觸發任何 AI 分析 → 只載入磁碟快取 |
| 10 | 視覺區分 | AI 區塊有獨立背景色（非透明）+ 標題前有 ✨ icon + 字級 ≥13px |

### 降級驗收

| 情境 | 預期行為 |
|------|---------|
| AI disabled | 規則引擎 methodRole 正常、AI 按鈕保留但 disabled 狀態（灰色 + tooltip「請先在設定中啟用 AI Provider」）、無 AI 結果區塊 |
| Provider 呼叫失敗 | 錯誤 toast「AI 分析失敗，請檢查設定」+ 保留結構視圖 |
| JSON parse 失敗 | 記錄 raw response 到 log + job 狀態 failed + 前端顯示錯誤 |
| .codeatlas.json 寫入失敗 | 降級為 session memory + toast「設定未持久化」 |
| 快取檔案損壞 | try-catch → 重建空快取 + warning log |

### 回歸

- [ ] 現有 1707+ tests 全通過
- [ ] pnpm build 全通過
- [ ] AI disabled 時全部功能正常（等同 Sprint 13 行為）

---

## 8. 風險評估

| 風險 | 影響 | 等級 | 緩解方式 |
|------|------|------|---------|
| UX 設計不佳 — 按需流程讓用戶困惑 | 不知道怎麼觸發 AI | 中 | G1 圖稿審核 + 具體按鈕文案 + hover tooltip |
| Claude API 費用 | 雲端呼叫有成本 | 低 | 按需（不自動掃全量）+ 快取持久化 |
| .codeatlas.json 寫入權限 | 某些目錄沒權限 | 低 | try-catch + 降級 session memory |
| Prompt 中文化 token 增加 | 中文 token 比英文多 | 低 | Budget 機制控制上限 |
| 不同 Provider 輸出格式差異 | Ollama 可能不穩定 | 中 | 結構化輸出規範 + zod 驗證 + fallback |

---

## 9. 團隊

| 角色 | Agent | 職責 |
|------|-------|------|
| L1 領導 | tech-lead | 架構設計、Review、整體協調 |
| AI 工程 | ai-engineer | Prompt 中文化 + 結構化輸出 + Claude CLI 穩定化 |
| 後端開發 | backend-architect | analyze API + configure API + 快取持久化 + Job 模型 |
| 前端開發 | frontend-developer | 按需按鈕 + 視覺強化 + 控制面板 |
| UI 設計 | ui-designer | G1 圖稿 |
| 測試 | test-writer-fixer | 端到端 + 降級 + 快取測試 |

---

## 10. 現有 AI 設定 UI 現況（前端參考）

目前 `SettingsPopover.tsx` 已有：
- Provider 下拉選擇器（6 選項）
- API Key 輸入（雲端 Provider 時顯示）
- 隱私標示（本地 / 雲端）
- 測試連線按鈕（真實 fetch）
- AI 功能 toggle（方法摘要 / 角色分類）
- LO 隱藏角色 checkbox

Sprint 16 改造重點：
- 選擇器 onChange → 加 `POST /api/ai/configure` 通知後端
- 加「分析全部 / 分析核心」按鈕到分析工具區域
- 三視角元件各加按需分析按鈕

---

## 11. Provider 能力矩陣

| Provider | 品質 | 中文 | 速度 | 成本 | 推薦場景 |
|----------|------|------|------|------|---------|
| Claude Code CLI | ★★★★★ | 優 | 快 | 免費（已安裝） | **首選推薦** |
| Gemini API | ★★★★ | 優 | 快 | 低 | 推薦（雲端） |
| OpenAI API | ★★★★ | 優 | 快 | 中 | 推薦（雲端） |
| Anthropic API | ★★★★★ | 優 | 快 | 中 | 推薦（雲端） |
| Ollama（gemma3:4b） | ★★ | 弱 | 慢 | 免費 | 實驗性，僅基本摘要 |
| Disabled | — | — | — | — | 純結構模式 |

> 前端 Settings 在 Provider 選擇器旁顯示推薦標記。Claude Code CLI 的「首選推薦」僅在偵測到 CLI 可用且連線測試成功時顯示，否則推薦 Gemini API。

---

## 12. 安全與隱私邊界

| 項目 | 規則 |
|------|------|
| **雲端 Provider 送什麼** | 預設不送完整原始碼。送「最小必要上下文」：function signature（名稱、參數、回傳型別）+ 檔案路徑 + 呼叫關係 + **必要時的短片段 normalized snippet**（如方法 body 前 200 字元，用於提升摘要品質）。單次 token 受 Prompt Budget 機制限制：Small ≤2K、Medium ≤8K、Large ≤20K。**絕不送完整檔案原始碼**。 |
| **本地 Provider** | 所有資料不離開本機。Claude Code CLI = 本地 spawn。Ollama = localhost:11434。 |
| **API Key 儲存** | 寫入 .codeatlas.json，明文儲存（local-first 工具，使用者自己的機器）。不加密，但 .codeatlas/ 目錄應加入專案 .gitignore 防止意外提交。**MVP 接受此風險**。後續可考慮 OS keychain 整合或環境變數 indirection。 |
| **隱私標示** | 前端 Settings 已有標示（🔒 本地處理 / ☁️ 雲端服務）。 |

---

## 附錄 A：Job 狀態機（S16-1 規格）

### POST /api/ai/analyze

**Request:**
```json
{
  "scope": "directory",
  "target": "src/services",
  "force": false
}
```

| 欄位 | 型別 | 說明 |
|------|------|------|
| scope | `'directory' \| 'endpoint' \| 'method-group' \| 'all' \| 'core'` | 分析範圍 |
| target | `string?` | scope 為 directory/endpoint/method-group 時必填，all/core 時忽略 |
| force | `boolean?` | true = 忽略快取強制重新分析，預設 false |

**Response:**
```json
{
  "jobId": "job-1712456789-src-services",
  "status": "queued",
  "cacheHit": false,
  "existingResultAvailable": false
}
```

> **cacheHit = true** 時：仍回傳 jobId，但 status 直接為 `"cached"` + result 包含快取結果。
> 前端流程統一 — **一律走 job polling**，不分叉。cache hit 只是 job 瞬間完成。

### Job 狀態流轉

```
queued → running → succeeded
                 → failed
queued → canceled（使用者取消或 server 重啟）

特殊：cache hit 時
  POST /api/ai/analyze → 建立 job（status: "cached", result: {...}）
  前端 polling GET /api/ai/jobs/:jobId → 拿到 status="cached" + result → 直接渲染
  （前端不需要區分 cached 和 succeeded，統一當「完成」處理）
```

> **server 重啟處理**：啟動時掃描 in-flight jobs（queued/running），一律標為 canceled。partial result 不寫入快取。

| 狀態 | 說明 |
|------|------|
| `queued` | 已排入佇列，等待執行 |
| `running` | AI Provider 正在處理 |
| `succeeded` | 分析完成，結果已寫入快取 |
| `failed` | 分析失敗（Provider 錯誤、JSON parse 失敗等） |
| `cached` | 快取命中，不需要新 job |
| `canceled` | 被取消 |

### 重複提交策略

| 情境 | 行為 |
|------|------|
| 同一 target 已有 `queued` 或 `running` job | 忽略新請求，回傳現有 jobId + status |
| 同一 target 已有 `succeeded` 結果 + force=false | 直接回 cacheHit=true + 快取結果 |
| 同一 target 已有 `succeeded` 結果 + force=true | 建立新 job，舊結果保留到新結果成功 |
| 同一 target 前次 `failed` | 建立新 job |

### GET /api/ai/jobs/:jobId

**Response:**
```json
{
  "jobId": "job-1712456789-src-services",
  "status": "running",
  "scope": "directory",
  "target": "src/services",
  "progress": "分析 3/8 個方法...",
  "createdAt": "2026-04-07T10:30:00Z",
  "updatedAt": "2026-04-07T10:30:05Z",
  "result": null,
  "error": null
}
```

> 前端 polling 此端點，每 2s 檢查一次。`status in ['succeeded', 'cached']` 時 `result` 必須非 null，包含分析結果。前端統一視為「完成」。

### scope=core 定義

「核心」= 既有 heuristic 角色分類為 `business-logic` 或 `cross-cutting` 的 DirectoryNode。

來源：`packages/core/src/analyzer/role-classifier.ts` 的 `classifyNodeRole()` — Sprint 10 實作的規則引擎。

規則：
- 遍歷 directoryGraph.nodes
- 篩選 `node.role === 'business-logic' || node.role === 'cross-cutting'`
- 對篩選結果逐一觸發 scope=directory 分析
- 未標角色的目錄（role undefined）→ 歸為 `infrastructure`，不在 core 範圍內
- 使用者不可自訂覆蓋（MVP 不做，後續可加）

---

## 附錄 B：Provider 設定 API（S16-2 規格）

### POST /api/ai/configure

**Request:**
```json
{
  "provider": "gemini",
  "apiKey": "AIzaSy..."
}
```

**Response:**
```json
{
  "ok": true,
  "provider": "gemini",
  "persisted": true,
  "message": "設定已儲存至 .codeatlas.json"
}
```

**失敗回應（寫入失敗）:**
```json
{
  "ok": true,
  "provider": "gemini",
  "persisted": false,
  "message": "設定已套用（本次有效），但無法寫入 .codeatlas.json"
}
```

**行為**：
1. 更新 server 內部的 AI Provider（立即生效）
2. 寫入 `.codeatlas.json` 的 `aiProvider` 和 `aiKey` 欄位
3. 寫入失敗 → 降級為 session memory → 回傳 persisted=false

### .codeatlas.json schema（擴充）

```json
{
  "ignore": ["dist", "coverage"],
  "aiProvider": "gemini",
  "aiKey": "AIzaSy...",
  "aiModel": null
}
```

### Provider 切換後的快取行為

- 切換 Provider 後，舊結果**保留顯示**（不清空）
- 舊結果在 UI 上標記小字 `(by ollama)`，讓用戶知道來源
- 用戶點「重新分析」時用新 Provider 覆蓋

---

## 附錄 C：快取契約（S16-3 規格）

### 快取檔案

位置：`.codeatlas/cache/ai-results.json`

### 單筆快取結構

```typescript
interface AICacheEntry {
  /** Cache key = scope:targetId:provider:promptVersion */
  key: string;
  scope: 'directory' | 'endpoint' | 'method-group';
  targetId: string;               // 如 'src/services' 或 'POST /api/users'
  provider: string;               // 如 'gemini'
  model: string;                  // 如 'gemini-2.0-flash'
  promptVersion: string;          // 如 'v16.0' — Prompt 模板版本
  contentHash: string;            // 分析對象的內容指紋（見下方）
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
  status: 'succeeded' | 'failed';
  result: object | null;          // 合法 zod schema 結果
  error: string | null;           // 失敗時的錯誤訊息
  confidence: number | null;      // 結果信心度 0-1
}
```

### Cache key 規則

```
key = `${scope}:${targetId}:${provider}:${promptVersion}`
```

| 組件 | 說明 |
|------|------|
| scope | 分析範圍類型 |
| targetId | 分析對象識別 |
| provider | AI Provider 名稱 |
| promptVersion | Prompt 模板版本號（硬編碼在 prompt-templates.ts） |

> **同一 target 不同 provider 的結果共存**，各自獨立。

### contentHash 計算

> **MVP 限制聲明**：contentHash 為近似指紋，非 AST-level fingerprint。可能存在 false positive（程式碼語意變了但 hash 不變）和 false negative（只改格式但觸發失效）。後續 Sprint 可升級為 AST-level fingerprint。MVP 足夠覆蓋絕大多數場景。

```typescript
// 目錄：檔案 path + size + mtime
contentHash = md5(dirFiles.map(f => `${f.path}:${f.size}:${f.mtime}`).sort().join('\n'))

// 方法：signature + body excerpt（前 200 字元 normalized）
contentHash = md5(methods.map(m =>
  `${m.name}:${m.params}:${m.returnType}:${normalizeBody(m.body, 200)}`
).sort().join('\n'))

// 端點：chain step ids + route metadata
contentHash = md5(`${endpoint.id}:${endpoint.method}:${endpoint.path}:${
  chain.steps.map(s => `${s.fileId}#${s.name}`).join(',')
}`)
```

### 快取失效規則

| 條件 | 行為 |
|------|------|
| contentHash 改變（原始碼變了） | 標記 stale，下次分析時強制重跑 |
| promptVersion 改變（Prompt 模板更新） | 強制失效，不使用舊結果 |
| Provider 改變 | 不失效，保留舊結果，新 Provider 結果另存 |
| force=true | 忽略快取，強制重跑 |
| 快取檔案損壞 | try-catch → 重建空快取 + warning log |

### 檔案大小控制

- 單筆 result 最大 2KB
- 整個 ai-results.json 最大 5MB
- 超過 5MB → LRU 淘汰最舊的 entries

---

## 附錄 D：Prompt 結構化輸出規範（S16-4 規格）

### 所有 Prompt 共用規則

每個 Prompt 模板結尾必須包含以下指令區塊：

```
回覆規則：
1. 使用繁體中文
2. 只輸出 JSON，不加 markdown 包裹（不要 ```json）
3. 嚴格遵循以下 JSON 結構
4. 字數上限見各欄位 maxLength
5. 不得虛構未觀察到的內容
6. 若無法判斷，confidence 設為 0.5 以下
```

### 各 schema 輸出範例

**Method Summary（LO 用）：**
```json
{
  "id": "src/billing/usage.ts#reset_usage_if_needed",
  "role": "business_core",
  "confidence": 0.84,
  "oneLineSummary": "若計費週期已結束，重置使用者的用量計數器",
  "evidence": ["name:reset_usage_if_needed", "caller:billing/controller"]
}
```

**Directory Summary（SF 用）：**
```json
{
  "directoryPath": "src/services",
  "role": "服務層",
  "oneLineSummary": "核心業務邏輯的服務編排與整合",
  "keyResponsibilities": ["使用者管理", "計費處理", "通知發送"],
  "confidence": 0.9
}
```

**Endpoint Description（DJ 用）：**
```json
{
  "endpointId": "POST /api/v1/videos/upload",
  "method": "POST",
  "path": "/api/v1/videos/upload",
  "chineseDescription": "影片上傳",
  "purpose": "接收使用者上傳的影片檔案，驗證格式與大小後存入儲存服務",
  "confidence": 0.92
}
```

**Step Detail（DJ 右面板用）：**
```json
{
  "stepIndex": 0,
  "methodId": "src/middleware/auth.ts#validateToken",
  "description": "驗證 JWT token 是否有效",
  "input": "Authorization header",
  "output": "解碼後的使用者資訊",
  "transform": "JWT 解碼 + 過期檢查"
}
```

### Provider 容錯策略

| Provider 行為 | 處理 |
|--------------|------|
| 回傳自然語言（非 JSON） | 嘗試 regex 提取 JSON → 失敗則 job failed |
| 回傳 JSON 但夾帶 markdown | 移除 ``` 包裹後再 parse |
| 回傳 JSON 但缺欄位 | zod `.partial()` 容許 optional 欄位 → 有值的照用 |
| 回傳 null 值 | zod `.nullable()` 容許 → 前端顯示 fallback |
| 回傳英文 | 不強制失敗（某些 Provider 可能回英文）→ 照用 |

### promptVersion 管理

在 `prompt-templates.ts` 頂部宣告常數：

```typescript
export const PROMPT_VERSION = 'v16.0';
```

每次修改 Prompt 內容時遞增版本號，確保快取自動失效。

---

## 附錄 E：按需分析按鈕 UX 規格（S16-5 規格）

### 按鈕文案（非通用「AI 分析」）

| 視角 | 按鈕文案 | Hover tooltip |
|------|---------|--------------|
| SF 目錄卡片 | ✨ 分析此目錄 | 用 AI 分析這個目錄的角色與職責 |
| LO 方法群組 | ✨ 解釋邏輯 | 用 AI 解釋這組方法的業務邏輯 |
| DJ 端點卡片 | ✨ 解釋資料流 | 用 AI 解釋這條 API 的請求處理流程 |

### 按鈕狀態

| 狀態 | 顯示 |
|------|------|
| 未分析 | `✨ 分析此目錄`（藍色邊框按鈕） |
| 分析中 | spinner + `分析中...`（按鈕 disabled） |
| 已分析 | 不顯示按鈕，改為 AI 結果區塊。右上角小圖示 🔄 + tooltip「重新分析（目前結果由 gemini 產生於 2 分鐘前）」 |
| 分析失敗 | `⚠️ 分析失敗，點擊重試` |

### 已分析後的資訊透明度

已分析的結果區塊底部顯示一行小字（11px, inkMuted）：

```
✨ gemini · 2 分鐘前 · 🔄 重新分析
```

包含：provider 名稱、分析時間、重新分析連結。

---

## 附錄 F：觀測指標

| 指標 | 來源 | 成功門檻 | 異常信號 |
|------|------|---------|---------|
| cache_hit_rate | cli server | ≥40% | <20% 代表快取機制無效或 contentHash 太敏感 |
| configure_success_rate | cli server | ≥95% | <90% 代表 .codeatlas.json 寫入有系統性問題 |
| analyze_success_rate（雲端） | cli server | ≥90% | <80% 代表 Prompt 或 Provider 有問題 |
| analyze_success_rate（本地） | cli server | ≥60% | <40% 代表本地模型品質不足（可接受，已標明實驗性） |
| avg_time_to_first_result（雲端） | cli server | <8s | >15s 代表 Provider 回應過慢或 context 太大 |
| reanalyze_rate | 前端 | <20% | >20% 代表結果可信度或穩定性有問題 |
| analyze_button_click_count | 前端 | — | 趨勢觀察，無硬門檻 |

> 指標透過 `/api/ai/status` 擴充回傳（新增 `metrics` 欄位），前端 Settings 的 AI 區域可顯示。
> Sprint Review 時以上述門檻判斷 Sprint 16 成效。

---

## G0 審核

### 審核人回饋對照（8 個規格問題）

| # | 問題 | 回答位置 |
|---|------|---------|
| 1 | Job 狀態 API 是什麼？ | §附錄 A — Job 狀態機 + GET /api/ai/jobs/:jobId |
| 2 | 何時 cache hit，何時重跑？ | §附錄 C — 快取失效規則 |
| 3 | Provider 切換後舊結果保留嗎？ | §附錄 B — 保留顯示，標記 `(by oldProvider)` |
| 4 | .codeatlas.json 與 ai-results.json 的 schema？ | §附錄 B + §附錄 C |
| 5 | 雲端 Provider 送出的最大上下文範圍？ | §12 安全與隱私邊界 — 送最小必要上下文（signature + call relation + 必要 normalized snippet），不送完整檔案原始碼，受 Prompt Budget 限制 |
| 6 | Prompt 是否強制 JSON 輸出？ | §附錄 D — 是，強制 JSON + 容錯策略 |
| 7 | scope=core 的規則來源？ | §附錄 A — 既有 heuristic 角色分類（Sprint 10） |
| 8 | 成功率 >90% 的測量方法？ | §7 驗收 #5 — CodeAtlas 自身專案，合法 zod schema |

---

### 第二輪審核回饋處理（4 項缺口 + 3 項次要）

| # | 缺口 | 處理 |
|---|------|------|
| 1 | cacheHit 流程不統一 | ✅ 已修 — cache hit 仍回 jobId，前端一律走 polling，不分叉 |
| 2 | contentHash 精度不足 | ✅ 已修 — 升級為 path+size+mtime / signature+body excerpt / step ids+route。補 MVP 限制聲明 |
| 3 | 雲端 context 規格過死 | ✅ 已修 — 改為「最小必要上下文」，允許 normalized snippet，不送完整檔案 |
| 4 | metrics 無成功門檻 | ✅ 已修 — 補 cache_hit ≥40%、analyze_success 雲端 ≥90% 本地 ≥60%、time <8s 等 |
| 5 | AI disabled 按鈕消失 | ✅ 已修 — 保留 disabled 狀態按鈕 + tooltip |
| 6 | API Key 明文風險 | ✅ 已修 — 補 MVP 接受聲明 + 後續 keychain 方向 |
| 7 | Claude CLI 首選推薦太絕對 | ✅ 已修 — 條件化：CLI 可用才推薦，否則推薦 Gemini |

---

**老闆決策**: [x] 通過

**審核意見**: 老闆 2026-04-07 確認通過。經兩輪外部審核（GPT 5.4），補齊 Job 狀態機、快取契約、Prompt 結構化輸出、metrics 門檻等規格。

**確認的流程**: 需求 → 設計 → UI 圖稿 → G1 → 實作 → G2 → 測試 → G3 → 文件 → G4
