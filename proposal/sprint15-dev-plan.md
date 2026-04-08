# 開發計畫書: Sprint 15 — SF + DJ 視角 AI 整合

> **撰寫者**: PM
> **日期**: 2026-04-05
> **專案**: CodeAtlas
> **Sprint 提案書**: `proposal/sprint15-proposal.md`（G0 通過 2026-04-05）
> **狀態**: G0 通過，待執行

---

## 1. 需求摘要

Sprint 14 完成 AI 基礎層（Contract + Provider + Prompt Budget）+ LO 視角 AI 整合。Sprint 15 將 AI 分析覆蓋剩餘兩個視角（SF + DJ），達成三視角 AI 體驗一致。同時修復 Sprint 14 遺留的 2 項 Minor。

### 確認的流程

```
需求 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）→ 文件 → G4（文件審查）
```

### 阻斷規則

- 無

---

## 2. 技術方案

### 2.1 AI Contract 擴展

在 `packages/core/src/ai/contracts.ts` 新增 3 個 zod schema：

```typescript
/** 目錄摘要 — SF 用 */
export const DirectorySummarySchema = z.object({
  directoryPath: z.string(),
  role: z.string(),               // 路由層/資料層/服務層/前端/基礎設施 等
  oneLineSummary: z.string().max(30),
  keyResponsibilities: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1),
});
export type DirectorySummary = z.infer<typeof DirectorySummarySchema>;

/** 端點描述 — DJ 用 */
export const EndpointDescriptionSchema = z.object({
  endpointId: z.string(),
  method: z.string(),             // GET/POST/PUT/DELETE
  path: z.string(),
  chineseDescription: z.string().max(20),  // 如「影片上傳」
  purpose: z.string(),
  confidence: z.number().min(0).max(1),
});
export type EndpointDescription = z.infer<typeof EndpointDescriptionSchema>;

/** 步驟詳情 — DJ 右面板用 */
export const StepDetailSchema = z.object({
  stepIndex: z.number(),
  methodId: z.string(),
  description: z.string().max(30),
  input: z.string(),              // 輸入參數描述
  output: z.string(),             // 回傳值描述
  transform: z.string(),          // 資料轉換邏輯描述
});
export type StepDetail = z.infer<typeof StepDetailSchema>;
```

### 2.2 Prompt 模板擴展

在 `packages/core/src/ai/prompt-templates.ts` 新增：

- **SF 目錄摘要 prompt**：輸入目錄結構 + 關鍵檔案列表（Large budget），要求輸出 DirectorySummary JSON
- **DJ 端點描述 prompt**：輸入端點 method + path + handler 方法 signature（Small budget），要求輸出中文描述
- **DJ 步驟詳情 prompt**：輸入一條 chain 所有步驟（Medium budget），要求輸出每步的 description + input + output + transform

### 2.3 buildLargeContext 實作

Sprint 14 預留了 Large budget 的介面，Sprint 15 實作：

```typescript
// packages/core/src/ai/prompt-budget.ts

/**
 * buildLargeContext(directory: DirectoryInfo): string
 * 
 * 建構 ~20K token context：
 * 1. 目錄樹結構（深度 3 層）
 * 2. 每個檔案的 exports 列表
 * 3. 前 5 個最大/最重要檔案的 function signatures
 * 4. 截斷至 20K token
 */
```

### 2.4 SF 前端整合

**DirectoryCard 改動**：
- 卡片下方新增 AI 摘要行（灰色字，14px）
- 左側新增 5px 色條（基於目錄角色：Frontend 紫 `#7b1fa2`、Backend 藍 `#1565c0`、Infra 灰 `#546e7a`）

**SFDetailPanel 改動**：
- 統計區新增 FUNCTIONS 數量（FILES / **FUNCTIONS** / LINES）
- 檔案列表每項旁顯示 `N fn`
- 點擊 ▶ 展開 → 顯示該檔案所有函式名 + AI 摘要 + MethodRole badge

### 2.5 DJ 前端整合

**DJSelectorCardNode 改動**：
- 端點名（`POST /api/v1/videos/upload`）下方新增中文描述（灰色字）

**DJStepNode 改動**：
- 步驟名稱下方顯示 AI 描述（取代方法名重複）

**DJPanel（右面板）改動**：
- 點擊步驟 → 新增四個區塊：
  ```
  ┌─ INPUT ──────────────────────┐
  │ req.body: { file, title }    │
  ├─ OUTPUT ─────────────────────┤
  │ { videoId, status, url }     │
  ├─ TRANSFORM ──────────────────┤
  │ 驗證檔案格式 → 產生 UUID →  │
  │ 寫入 S3 → 建立 DB 記錄      │
  ├─ METHOD ─────────────────────┤
  │ uploadVideo() @ video-api.ts │
  └──────────────────────────────┘
  ```

### 2.6 endpoint-detector 整合 MethodRole

`packages/core/src/analyzers/endpoint-detector.ts` 改動：
- `buildPythonChainSteps` / `buildJSChainSteps` 建構 chain step 時呼叫 `classifyMethodRole()`
- 每個 ChainStep 附帶 `role: MethodRole` + `roleConfidence: number`
- 不影響現有 skip list 邏輯（互補）

### 2.7 Settings 測試連線真實化

`packages/web/src/components/SettingsPopover.tsx` 改動：
- 「測試連線」按鈕改為呼叫真實 Provider：
  - Claude Code CLI → spawn 偵測 + 簡單 prompt 測試
  - Gemini → API key 驗證呼叫
  - Ollama → `GET /api/tags` 確認服務存活
  - OpenAI/Anthropic → API key 驗證
  - Disabled → 直接回傳成功
- 顯示真實結果（成功/失敗/錯誤訊息）

---

## 3. 檔案變更清單

### 新增

| 檔案 | 用途 |
|------|------|
| `packages/core/src/__tests__/sf-ai-integration.test.ts` | SF AI 整合測試 |
| `packages/core/src/__tests__/dj-ai-integration.test.ts` | DJ AI 整合測試 |

### 修改

| 檔案 | 變更內容 |
|------|---------|
| `packages/core/src/ai/contracts.ts` | 新增 DirectorySummary / EndpointDescription / StepDetail schema |
| `packages/core/src/ai/prompt-templates.ts` | 新增 SF 目錄摘要 / DJ 端點描述 / DJ 步驟詳情 prompt 模板 |
| `packages/core/src/ai/prompt-budget.ts` | 實作 buildLargeContext() |
| `packages/core/src/ai/index.ts` | export 新增 schema + types |
| `packages/core/src/analyzers/endpoint-detector.ts` | chain step 附帶 MethodRole 分類 |
| `packages/web/src/components/DirectoryCard.tsx` | AI 摘要 + 左側色條 |
| `packages/web/src/components/SFDetailPanel.tsx` | FUNCTIONS 統計 + 檔案展開函式列表 |
| `packages/web/src/components/DJSelectorCardNode.tsx` | 端點中文描述 |
| `packages/web/src/components/DJStepNode.tsx` | 步驟 AI 描述 |
| `packages/web/src/components/DJPanel.tsx` | INPUT/OUTPUT/TRANSFORM/METHOD 四區塊 |
| `packages/web/src/components/SettingsPopover.tsx` | 測試連線真實化 |

---

## 4. 規範文件索引

| 文件 | 更新內容 |
|------|---------|
| `.knowledge/specs/feature-spec.md` | 新增 Sprint 15 功能規格（SF/DJ AI） |
| `.knowledge/specs/data-model.md` | 新增 DirectorySummary / EndpointDescription / StepDetail 型別 |

---

## 5. 任務定義與分配

### 任務清單

| # | 任務名稱 | 說明 | 負責 Agent | 依賴 | 驗收標準 |
|---|---------|------|-----------|------|---------|
| T1 | AI Contract 擴展 | contracts.ts 新增 DirectorySummary / EndpointDescription / StepDetail 三個 zod schema + types export | ai-engineer | 無 | 三個 schema 可 parse + validate |
| T2 | SF/DJ Prompt 模板 | prompt-templates.ts 新增目錄摘要 / 端點描述 / 步驟詳情三個 prompt 模板 | ai-engineer | T1 | prompt 輸出格式符合新 schema |
| T3 | buildLargeContext 實作 | prompt-budget.ts 實作 Large 級 context builder（目錄結構 + exports + signatures）| ai-engineer | 無 | Large context ≤20K token，正確截斷 |
| T4 | endpoint-detector 整合 MethodRole | endpoint-detector.ts chain step 建構時呼叫 classifyMethodRole()，附帶 role + confidence | ai-engineer | 無 | chain step 有 MethodRole，不破壞現有邏輯 |
| T5 | SF 目錄摘要 + 色條 + 角色分類 | DirectoryCard 新增 AI 摘要行 + 左側 5px 色條（基於角色分類）| frontend-developer | T1, T2, T3 | 每張目錄卡片有摘要 + 色條 |
| T6 | SF FUNCTIONS 區塊 | SFDetailPanel 新增 FUNCTIONS 統計 + 檔案展開顯示函式列表 + AI 摘要 + MethodRole badge | frontend-developer | T5 | 檔案展開有函式列表 + 摘要 |
| T7 | DJ 端點中文描述 | DJSelectorCardNode 端點名下方顯示 AI 中文描述 | frontend-developer | T1, T2 | 每個端點有中文描述 |
| T8 | DJ 步驟描述 + INPUT/OUTPUT | DJStepNode AI 描述 + DJPanel 新增 INPUT/OUTPUT/TRANSFORM/METHOD 四區塊 | frontend-developer | T2, T7 | 步驟有描述，右面板有四區塊 |
| T9 | Settings 測試連線真實化 | SettingsPopover 測試連線改為呼叫真實 Provider | frontend-developer | 無 | 測試連線顯示真實結果 |
| T10 | 測試 + 回歸 | SF/DJ AI 整合測試 + 1572+ 現有測試全通過 | test-writer-fixer | T4-T9 | 新增測試通過，零回歸 |
| T11 | 文件更新 | feature-spec v15.0 + data-model 更新 + CLAUDE.md 索引 | tech-lead | T10 | 所有文件已更新 |

### 依賴圖

```
T1（Contract 擴展）─┬─→ T2（Prompt 模板）─┬─→ T5（SF 摘要+色條）→ T6（SF FUNCTIONS）
                    │                      └─→ T7（DJ 端點描述）→ T8（DJ 步驟+I/O）
T3（buildLarge）────→ T5
T4（endpoint-detector）──────────────────────────────┐
T9（Settings 連線）──────────────────────────────────┤
                                                     ↓
                                              T10（測試+回歸）→ T11（文件）
```

### 執行順序建議

```
Phase 1（並行）: T1 + T3 + T4 + T9
Phase 2: T2
Phase 3（並行）: T5 + T7
Phase 4（並行）: T6 + T8
Phase 5: T10
Phase 6: T11
```

### L1 執行指令

```
請執行 Sprint 15 — SF + DJ 視角 AI 整合 開發計畫。

📄 計畫書：proposal/sprint15-dev-plan.md
📋 提案書：proposal/sprint15-proposal.md

📋 你負責的任務：T11（文件更新）
🤖 委派 ai-engineer：T1（Contract 擴展）、T2（Prompt 模板）、T3（buildLarge）、T4（endpoint-detector 整合）
🎨 委派 frontend-developer：T5（SF 摘要+色條）、T6（SF FUNCTIONS）、T7（DJ 端點描述）、T8（DJ 步驟+I/O）、T9（Settings 連線）
🧪 委派 test-writer-fixer：T10（測試+回歸）

⚠️ 無阻斷規則，但注意依賴：T1 完成後才做 T2/T5/T7，T2 完成後才做 T5/T7/T8。

📌 關鍵參考：
- Sprint 14 AI 架構：`.knowledge/sprint14-ai-architecture.md`
- 現有 AI Contract：`packages/core/src/ai/contracts.ts`
- 現有 Prompt Budget：`packages/core/src/ai/prompt-budget.ts`
- Sprint 13 差異報告：`proposal/sprint13-diff-report.md`（SF-1/4/5, DJ-2/3/4）

📌 設計原則（延續 Sprint 14）：
- 規則先分類、AI 後解釋
- AI 關閉時不 block 功能
- AI 輸出經 zod schema validation
- 非阻塞 UI（先顯示靜態資訊，AI 回來後更新）

第一步請先執行 /task-delegation 建立任務檔案。
```

### 共用檔案（需協調）

| 檔案 | 涉及任務 | 風險等級 |
|------|---------|---------|
| `packages/core/src/ai/contracts.ts` | T1 | 低（T1 獨佔修改） |
| `packages/core/src/ai/prompt-templates.ts` | T2 | 低（T2 獨佔修改） |

---

## 6. 測試計畫

### 單元測試

| 測試檔案 | 測試案例 |
|---------|---------|
| `sf-ai-integration.test.ts` | DirectorySummary schema validation、目錄角色分類規則、buildLargeContext 截斷 |
| `dj-ai-integration.test.ts` | EndpointDescription schema validation、StepDetail schema validation、DJ prompt 輸出格式 |
| `endpoint-detector.test.ts`（擴展） | chain step 附帶 MethodRole 驗證 |

### 回歸測試

- 現有 1572+ tests 全部通過
- LO AI 功能不受影響
- pnpm build 全通過

---

## 7. 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| Large budget 觸及 token limit | 低 | buildLargeContext 已有截斷策略 |
| DJ INPUT/OUTPUT 不準確 | 低 | AI 生成標示「AI 生成，僅供參考」 |
| Settings 真實連線可能 timeout | 低 | 設 5s timeout + loading 狀態 + 錯誤訊息 |

---

## 8. 文件更新

- [x] `.knowledge/specs/feature-spec.md` — v15.0
- [x] `.knowledge/specs/data-model.md` — 新增 DirectorySummary / EndpointDescription / StepDetail
- [x] `CLAUDE.md` — Sprint 15 索引

---

## 10. 任務與審核紀錄（備查）

> 每個任務完成後記錄結果，每次 Review/Gate 通過後記錄決策。本區作為 Sprint 完整稽核軌跡。

### 任務完成紀錄

| 任務 | 完成日期 | 結果 | 備註 |
|------|---------|------|------|
| T1 | 2026-04-05 | ✅ 完成 | DirectorySummary / EndpointDescription / StepDetail 三個 zod schema + validators |
| T2 | 2026-04-05 | ✅ 完成 | 三個 prompt 模板：目錄摘要 / 端點描述 / 步驟詳情 |
| T3 | 2026-04-05 | ✅ 完成 | buildLargeContext 2-phase 建構，≤20K token |
| T4 | 2026-04-05 | ✅ 完成 | ChainStep +role/roleConfidence，Python+JS 兩個 builder |
| T5 | 2026-04-05 | ✅ 完成 | DirectoryCard AI 摘要行 + 角色色條 + directoryRole fallback |
| T6 | 2026-04-05 | ✅ 完成 | SFDetailPanel 函式列表 + AI 摘要 + MethodRole badge |
| T7 | 2026-04-05 | ✅ 完成 | DJSelectorCardNode aiDescription 中文描述欄位 |
| T8 | 2026-04-05 | ✅ 完成 | DJStepNode AI 描述 + DJPanel INPUT/OUTPUT/TRANSFORM/METHOD 四區塊 |
| T9 | 2026-04-05 | ✅ 完成 | SettingsPopover 真實 fetch + 5s timeout + 404 graceful |
| T10 | 2026-04-05 | ✅ 完成 | 87 新測試（sf-ai: 66, dj-ai: 21）+ 1659 現有測試零回歸 |
| T11 | 2026-04-05 | ✅ 完成 | feature-spec v15.0 + data-model v8.0 + CLAUDE.md 索引 |

### Review 紀錄

| Review 步驟 | 日期 | 結果 | Review 文件連結 |
|------------|------|------|---------------|
| 實作 Review（後端 T1-T4） | 2026-04-05 | 通過 | Blocker:0 Major:0 Minor:0 — zod schema 正確、prompt 模板完整、buildLargeContext 2-phase、endpoint-detector 純新增不破壞 |
| 實作 Review（前端 T5-T9） | 2026-04-05 | 通過 | Blocker:0 Major:0 Minor:0 — DirectoryCard/SFDetailPanel/DJStepNode/DJPanel/SettingsPopover 改動合規、無 any 型別 |
| 測試 Review（T10） | 2026-04-05 | 通過 | Blocker:0 Major:0 Minor:0 — 87 新測試 + 1659 零回歸、pnpm build clean |
| 文件 Review（T11） | 2026-04-05 | 通過 | Blocker:0 Major:0 Minor:0 — feature-spec v15.0、data-model v8.0、CLAUDE.md 已更新 |

### Gate 紀錄

| Gate | 日期 | 決策 | 審核意見 |
|------|------|------|---------|
| G0 | 2026-04-05 | ✅ 通過 | `proposal/sprint15-proposal.md` |
| G2 | 2026-04-05 | ✅ 通過 | 實作 Review 通過（0 Blocker, 0 Major），pnpm build clean |
| G3 | 2026-04-05 | ✅ 通過 | 87 新測試 + 1659 既有零回歸，pnpm test 全通過 |
| G4 | 2026-04-05 | ✅ 通過 | feature-spec v15.0 + data-model v8.0 + CLAUDE.md 索引已更新 |

---

**確認**: [x] L1 確認 / [x] Tech Lead 確認
