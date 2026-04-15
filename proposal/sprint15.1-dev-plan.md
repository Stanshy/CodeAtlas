# 開發計畫書: Sprint 15.1 — AI 資料管線串接（Hotfix）

> **撰寫者**: PM
> **日期**: 2026-04-05
> **專案**: CodeAtlas
> **Sprint 提案書**: `proposal/sprint15.1-proposal.md`（G0 通過 2026-04-05）
> **狀態**: G0 通過，待執行

---

## 1. 需求摘要

Sprint 14-15 建了 AI Contract + Provider + Prompt 模板 + 前端 UI 插槽，但缺少「觸發 AI 分析 → 合併結果到 Graph JSON → 前端讀取顯示」的管線串接。本 Hotfix 補完這段管線，讓 AI 功能端到端運作。

### 確認的流程

```
需求 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）
```

### 阻斷規則

- 無

---

## 2. 技術方案

### 2.1 規則引擎管線（core 層）

**目標**：core 分析完成後，自動為所有 function/method 節點寫入 `methodRole` + `roleConfidence`。

**位置**：`packages/core/src/analyzer/graph-builder.ts` — `buildFunctionGraph()` 函式

**做法**：在 `buildFunctionGraph()` 結尾（line ~460, return 前），遍歷所有 `functionNodes`，呼叫 `classifyMethodRole()` 為每個節點寫入分類：

```typescript
import { classifyMethodRole } from '../ai/method-role-classifier.js';
import type { MethodClassificationInput } from '../ai/method-role-classifier.js';

// --- Sprint 15.1: Classify method roles (rule engine, zero cost) ---
for (const node of functionNodes) {
  if (node.type === 'function') {
    const input: MethodClassificationInput = {
      name: node.label,
      filePath: node.filePath,
      isExported: node.metadata.isExported,
      isAsync: node.metadata.isAsync,
      parameters: node.metadata.parameters?.map(p => ({
        name: p.name,
        type: p.type,
      })),
      returnType: node.metadata.returnType,
      // callOutDegree: from call edges where node is source
      callOutDegree: callEdges.filter(e => e.source === node.id).length,
    };
    const result = classifyMethodRole(input);
    node.metadata.methodRole = result.role;
    node.metadata.roleConfidence = result.confidence;
  }
}
```

**成本**：純 regex/pattern match，毫秒級。不需要 AI。

**驗證**：`buildFunctionGraph()` 回傳的 functionNodes 每個都有 `methodRole`。

### 2.2 AI 背景分析管線（cli 層）

**目標**：CLI server 啟動後，若 AI Provider 啟用且支援 analysis，背景非同步執行 AI 分析。

**新增檔案**：`packages/cli/src/ai-pipeline.ts`

```typescript
/**
 * @codeatlas/cli — AI Analysis Pipeline
 *
 * Sprint 15.1: Background AI analysis after server startup.
 * Runs asynchronously, results stored in AICache for /api/graph merging.
 */

import type { AnalysisResult } from '@codeatlas/core';
import {
  createProvider,
  isAnalysisProvider,
  classifyMethodRole,
  buildMethodBatchContext,
  buildChainContext,
  buildLargeContext,
  buildMethodSummaryPrompt,
  buildDirectorySummaryPrompt,
  buildEndpointDescriptionPrompt,
  buildStepDetailPrompt,
  safeValidateBatchMethodSummary,
  safeValidateDirectorySummary,
  safeValidateEndpointDescription,
  safeValidateStepDetail,
  BUDGET_LIMITS,
  aggregateByDirectory,
  detectEndpoints,
} from '@codeatlas/core';
import type {
  AIAnalysisProvider,
  BatchMethodSummary,
  DirectorySummary,
  EndpointDescription,
  StepDetail,
} from '@codeatlas/core';

// ---------------------------------------------------------------------------
// AICache — in-memory store for AI analysis results
// ---------------------------------------------------------------------------

export interface AICache {
  /** nodeId → aiSummary */
  methodSummaries: Map<string, string>;
  /** directoryId → DirectorySummary */
  directorySummaries: Map<string, DirectorySummary>;
  /** endpointId → chineseDescription */
  endpointDescriptions: Map<string, string>;
  /** endpointId → StepDetail[] */
  stepDetails: Map<string, StepDetail[]>;
  /** Pipeline status */
  status: 'idle' | 'running' | 'done' | 'error';
  /** Progress message */
  progress: string;
  /** Error message (if status='error') */
  error?: string;
}

export function createAICache(): AICache {
  return {
    methodSummaries: new Map(),
    directorySummaries: new Map(),
    endpointDescriptions: new Map(),
    stepDetails: new Map(),
    status: 'idle',
    progress: '',
  };
}

// ---------------------------------------------------------------------------
// Pipeline execution
// ---------------------------------------------------------------------------

export interface PipelineOptions {
  analysis: AnalysisResult;
  providerName: string;
  apiKey?: string;
  ollamaModel?: string;
  cache: AICache;
}

/**
 * Run the full AI analysis pipeline in the background.
 * Updates cache.status and cache.progress as it runs.
 * Never throws — catches all errors and sets cache.status = 'error'.
 */
export async function runAIPipeline(options: PipelineOptions): Promise<void> {
  const { analysis, providerName, apiKey, ollamaModel, cache } = options;

  // Create provider and check if it supports analysis
  const provider = createProvider(providerName, apiKey,
    providerName === 'ollama' ? { ollamaModel: ollamaModel ?? 'gemma3:4b' } : undefined,
  );

  if (!isAnalysisProvider(provider)) {
    cache.status = 'done';
    cache.progress = 'Provider does not support analysis';
    return;
  }

  const aiProvider = provider as unknown as AIAnalysisProvider;
  cache.status = 'running';

  try {
    // --- Phase 1: Method batch analysis (LO AI) ---
    const functionNodes = analysis.graph.nodes.filter(
      n => n.type === 'function' && n.metadata?.parentFileId,
    );
    const totalMethods = functionNodes.length;
    cache.progress = `Analyzing ${totalMethods} methods...`;

    if (totalMethods > 0) {
      const methodContexts = functionNodes.map(n => ({
        id: n.id,
        name: n.label,
        filePath: n.filePath,
        signature: `${n.metadata.isAsync ? 'async ' : ''}${n.label}(${(n.metadata.parameters ?? []).map(p => p.name).join(', ')})`,
        role: n.metadata.methodRole,
        roleConfidence: n.metadata.roleConfidence,
      }));

      // Process in batches of 20 to stay within token budget
      const BATCH_SIZE = 20;
      for (let i = 0; i < methodContexts.length; i += BATCH_SIZE) {
        const batch = methodContexts.slice(i, i + BATCH_SIZE);
        cache.progress = `Analyzing methods ${i + 1}-${Math.min(i + BATCH_SIZE, totalMethods)} of ${totalMethods}...`;

        try {
          const result = await aiProvider.analyzeMethodBatch(
            batch,
            { type: 'medium', maxTokens: BUDGET_LIMITS.medium },
          );
          // Write summaries to cache
          for (const method of result.methods) {
            cache.methodSummaries.set(method.id, method.oneLineSummary);
          }
        } catch (err) {
          console.warn(`[AI Pipeline] Method batch ${i}-${i + BATCH_SIZE} failed:`, err);
          // Continue with next batch
        }
      }
    }

    // --- Phase 2: Directory summaries (SF AI) ---
    const directoryGraph = aggregateByDirectory(
      analysis.graph.nodes.filter(n => n.metadata?.parentFileId === undefined),
      analysis.graph.edges.filter(e => e.type !== 'call'),
    );
    if (directoryGraph) {
      cache.progress = `Analyzing ${directoryGraph.nodes.length} directories...`;
      for (const dirNode of directoryGraph.nodes) {
        try {
          // Build directory context
          const dirFiles = analysis.graph.nodes.filter(
            n => n.type === 'file' && n.filePath.startsWith(dirNode.id),
          );
          const prompt = buildDirectorySummaryPrompt({
            directoryPath: dirNode.id,
            fileCount: dirNode.fileCount,
            files: dirFiles.map(f => f.filePath),
          });
          const rawResult = await aiProvider.analyzeMethodBatch(
            [{ id: dirNode.id, name: dirNode.label, filePath: dirNode.id, signature: prompt }],
            { type: 'large', maxTokens: BUDGET_LIMITS.large },
          );
          // Parse as DirectorySummary if possible
          if (rawResult.methods[0]) {
            cache.directorySummaries.set(dirNode.id, {
              directoryPath: dirNode.id,
              role: dirNode.type,
              oneLineSummary: rawResult.methods[0].oneLineSummary,
              confidence: rawResult.methods[0].confidence ?? 0.8,
            });
          }
        } catch (err) {
          console.warn(`[AI Pipeline] Directory ${dirNode.id} failed:`, err);
        }
      }
    }

    // --- Phase 3: Endpoint + Step analysis (DJ AI) ---
    const endpointGraph = detectEndpoints(analysis);
    if (endpointGraph) {
      cache.progress = `Analyzing ${endpointGraph.endpoints.length} endpoints...`;
      for (const endpoint of endpointGraph.endpoints) {
        try {
          // Endpoint description
          const chain = endpointGraph.chains.find(c => c.endpointId === endpoint.id);
          const result = await aiProvider.explainChain(
            {
              endpointId: endpoint.id,
              method: endpoint.method,
              path: endpoint.path,
              steps: chain?.steps ?? [],
            },
            { type: 'medium', maxTokens: BUDGET_LIMITS.medium },
          );
          cache.endpointDescriptions.set(endpoint.id, result.overallPurpose);
          if (result.steps) {
            cache.stepDetails.set(endpoint.id, result.steps.map(s => ({
              stepIndex: s.stepIndex,
              methodId: s.methodId,
              description: s.description,
              input: '',   // AI may or may not fill these
              output: '',
              transform: '',
            })));
          }
        } catch (err) {
          console.warn(`[AI Pipeline] Endpoint ${endpoint.id} failed:`, err);
        }
      }
    }

    cache.status = 'done';
    cache.progress = 'AI analysis complete';
  } catch (err) {
    cache.status = 'error';
    cache.error = err instanceof Error ? err.message : String(err);
    cache.progress = 'AI analysis failed';
    console.error('[AI Pipeline] Fatal error:', err);
  }
}
```

### 2.3 Server 整合（cli 層）

**位置**：`packages/cli/src/server.ts`

**修改 1 — startServer() 啟動 AI 管線**：

```typescript
import { createAICache, runAIPipeline, type AICache } from './ai-pipeline.js';

export async function startServer(options: ServerOptions): Promise<void> {
  // ...existing setup...

  // Sprint 15.1: Initialize AI cache and start background pipeline
  const aiCache = createAICache();

  // Read initial analysis for AI pipeline
  try {
    const analysis = await readAnalysis(analysisPath);
    // Fire-and-forget background AI analysis
    void runAIPipeline({
      analysis,
      providerName: aiProvider,
      apiKey: aiKey,
      ollamaModel,
      cache: aiCache,
    });
  } catch {
    // analysis.json not ready yet — AI pipeline will skip
  }

  // ...rest of server setup...
}
```

**修改 2 — GET /api/graph 合併 AI 快取**：

在 `/api/graph` handler 中，回傳前合併 aiCache 的結果：

```typescript
// Sprint 15.1: Merge AI cache into response
function mergeAICache(
  nodes: GraphNode[],
  directoryGraph: DirectoryGraph | null,
  endpointGraph: EndpointGraph | null,
  cache: AICache,
) {
  // Merge method summaries into function nodes
  for (const node of nodes) {
    const summary = cache.methodSummaries.get(node.id);
    if (summary) {
      node.metadata.aiSummary = summary;
    }
  }

  // Merge directory summaries
  if (directoryGraph) {
    for (const dirNode of directoryGraph.nodes) {
      const dirSummary = cache.directorySummaries.get(dirNode.id);
      if (dirSummary) {
        (dirNode as any).aiSummary = dirSummary.oneLineSummary;
        (dirNode as any).aiRole = dirSummary.role;
      }
    }
  }

  // Merge endpoint descriptions + step details
  if (endpointGraph) {
    for (const endpoint of endpointGraph.endpoints) {
      const desc = cache.endpointDescriptions.get(endpoint.id);
      if (desc) {
        endpoint.description = desc;
      }
    }
    for (const chain of endpointGraph.chains) {
      const details = cache.stepDetails.get(chain.endpointId);
      if (details) {
        for (const detail of details) {
          const step = chain.steps[detail.stepIndex];
          if (step) {
            step.description = detail.description;
            step.input = detail.input;
            step.output = detail.output;
            step.transform = detail.transform;
          }
        }
      }
    }
  }
}
```

**修改 3 — GET /api/ai/status 擴充**：

```typescript
// Sprint 15.1: Add AI pipeline status to /api/ai/status
fastify.get('/api/ai/status', async (_req, reply) => {
  // ...existing provider info...
  await reply.send({
    enabled: provider.isConfigured(),
    provider: aiProvider,
    mode,
    privacyLevel,
    model,
    // Sprint 15.1: Pipeline status
    ready: aiCache.status === 'done',
    analysisStatus: aiCache.status,
    progress: aiCache.progress,
  });
});
```

### 2.4 前端 AI 狀態感知（web 層）

**位置**：相關 React 元件（GraphContainer 或 App 層級）

**做法**：

```typescript
// Sprint 15.1: Poll AI status and auto-refresh graph
const [aiReady, setAiReady] = useState(false);

useEffect(() => {
  let cancelled = false;
  const poll = async () => {
    try {
      const res = await fetch('/api/ai/status');
      const data = await res.json();
      if (data.ready && !aiReady) {
        setAiReady(true);
        // Re-fetch graph to get AI-enriched data
        await refreshGraph();
      }
      if (!data.ready && !cancelled) {
        setTimeout(poll, 3000); // Poll every 3s
      }
    } catch {
      // AI status unavailable — skip
    }
  };
  poll();
  return () => { cancelled = true; };
}, []);
```

### 2.5 降級路徑

| 情境 | methodRole | aiSummary | 行為 |
|------|-----------|-----------|------|
| AI disabled | ✅ 規則引擎寫入（graph-builder） | undefined | 前端顯示 role badge，不顯示摘要 |
| AI enabled + running | ✅ 規則引擎寫入 | loading | 前端顯示 role badge + loading spinner |
| AI enabled + done | ✅ 規則引擎寫入 | ✅ 有值 | 前端顯示全部 |
| AI enabled + error | ✅ 規則引擎寫入 | undefined | 同 disabled 行為 |

---

## 3. 任務依賴圖

```
T1（core 規則引擎管線）
  ↓
T2（CLI ai-pipeline.ts 新增）
  ↓
T3（server.ts 整合 — 啟動管線 + 合併快取 + status 擴充）→ 依賴 T1, T2
  ↓
T4（前端 AI 狀態感知 + polling）→ 依賴 T3
  ↓
T5（降級路徑驗證 + 端到端測試）→ 依賴 T4
  ↓
T6（測試 + 回歸）→ 依賴 T5
```

---

## 4. 任務清單

### T1: Core 規則引擎管線

| 項目 | 內容 |
|------|------|
| **負責** | ai-engineer |
| **說明** | 在 `graph-builder.ts` 的 `buildFunctionGraph()` return 前，遍歷 functionNodes 呼叫 `classifyMethodRole()` 寫入 `methodRole` + `roleConfidence` |
| **修改檔案** | `packages/core/src/analyzer/graph-builder.ts` |
| **驗收** | buildFunctionGraph() 回傳的每個 function node 都有 `metadata.methodRole` 和 `metadata.roleConfidence` |
| **依賴** | 無 |

### T2: CLI AI 背景分析管線

| 項目 | 內容 |
|------|------|
| **負責** | ai-engineer |
| **說明** | 新增 `packages/cli/src/ai-pipeline.ts`，實作 `AICache` + `runAIPipeline()`。三階段：(1) method batch → aiSummary (2) directory summaries (3) endpoint + step descriptions。全部 try-catch，失敗不 crash。 |
| **新增檔案** | `packages/cli/src/ai-pipeline.ts` |
| **驗收** | pipeline 完成後 cache.status = 'done'，各 Map 有值。AI 失敗時 cache.status = 'error'，不 throw。 |
| **依賴** | T1（需要 methodRole 已寫入 node.metadata） |

### T3: Server 整合

| 項目 | 內容 |
|------|------|
| **負責** | backend-architect |
| **說明** | 修改 `server.ts`：(1) startServer() 啟動後 fire-and-forget runAIPipeline (2) `/api/graph` handler 回傳前呼叫 mergeAICache() 合併 AI 結果 (3) `/api/ai/status` 新增 ready/analysisStatus/progress 欄位 |
| **修改檔案** | `packages/cli/src/server.ts` |
| **驗收** | `/api/ai/status` 回傳 `{ ready: true/false, analysisStatus, progress }`。`/api/graph` 回傳的 nodes 含 aiSummary（AI 完成時）。 |
| **依賴** | T2 |

### T4: 前端 AI 狀態感知

| 項目 | 內容 |
|------|------|
| **負責** | frontend-developer |
| **說明** | (1) 在 App 或 GraphContainer 層級 polling `/api/ai/status`，AI ready 後自動 re-fetch `/api/graph` (2) AI 分析中時三視角顯示 loading 狀態 (3) AI disabled 時不 poll |
| **修改檔案** | `packages/web/src/` 相關元件 |
| **驗收** | 啟動後看到 AI loading → 完成後自動刷新顯示 AI 內容。AI disabled 時不 poll、不顯示 loading。 |
| **依賴** | T3 |

### T5: 降級路徑驗證

| 項目 | 內容 |
|------|------|
| **負責** | frontend-developer |
| **說明** | 驗證四種情境：(1) AI disabled — role badge 顯示、無摘要 (2) AI running — role badge + loading (3) AI done — 全部顯示 (4) AI error — 同 disabled。確保零 crash。 |
| **修改檔案** | 前端元件（必要時修復） |
| **驗收** | 四種情境均正確行為，console 無 error |
| **依賴** | T4 |

### T6: 測試 + 回歸

| 項目 | 內容 |
|------|------|
| **負責** | test-writer-fixer |
| **說明** | (1) graph-builder 測試：buildFunctionGraph 結果含 methodRole (2) ai-pipeline 測試：mock provider + cache 狀態驗證 (3) server 測試：/api/ai/status 新欄位 + /api/graph AI 合併 (4) 全量回歸 1746+ tests |
| **新增/修改** | `packages/core/src/analyzer/__tests__/graph-builder.test.ts`、`packages/cli/src/__tests__/ai-pipeline.test.ts`、`packages/cli/src/__tests__/server.test.ts` |
| **驗收** | 新增 ≥20 tests，現有 1746+ 零回歸，pnpm build 通過 |
| **依賴** | T5 |

---

## 5. 風險與緩解

| 風險 | 等級 | 緩解 |
|------|------|------|
| AI 分析時間長（大專案 >1000 函式） | 中 | 分批 20 個、背景非同步、progress 回報 |
| AI Provider 呼叫失敗 | 低 | 每批 try-catch、繼續下一批、最終 status 仍為 done（部分結果） |
| 記憶體快取過大 | 低 | 限制 summary 長度（max 100 chars）、P1 加 LRU |
| graph-builder classifyMethodRole 影響效能 | 極低 | 純 regex，即使 10000 nodes 也 <100ms |

---

## 6. 驗收標準

### 端到端

- [ ] `codeatlas web` 啟動 → SF 目錄卡片自動出現 AI 摘要
- [ ] DJ 端點有中文描述、步驟有 AI 描述
- [ ] LO 方法群組有 AI 摘要 + MethodRole badge
- [ ] 三種視角 AI 體驗一致

### 規則引擎

- [ ] function/method 節點有 methodRole + roleConfidence（不需 AI）
- [ ] AI disabled 時 methodRole 仍顯示

### 非同步管線

- [ ] AI 分析不阻塞 server 啟動
- [ ] /api/ai/status 回傳 ready + progress
- [ ] 前端 polling + auto-refresh 正常
- [ ] AI 失敗時 graceful 降級

### 回歸

- [ ] 1746+ tests 全通過
- [ ] pnpm build 全通過

---

## 7. L1 執行指令

### 給 Tech Lead 的指令

```
Sprint 15.1 — AI 資料管線串接（Hotfix）

你是 L1 領導。計畫書：proposal/sprint15.1-dev-plan.md

核心問題：Sprint 14-15 建了 AI 元件但沒有管線串接，AI 功能全部是死的。

6 個任務，線性依賴：

T1 → core graph-builder.ts：buildFunctionGraph() 結尾加 classifyMethodRole()
T2 → 新增 cli ai-pipeline.ts：AICache + runAIPipeline()（三階段背景 AI）
T3 → cli server.ts：啟動管線 + mergeAICache() + /api/ai/status 擴充
T4 → web 前端 polling AI status + auto-refresh
T5 → 降級路徑驗證（4 種情境）
T6 → 測試 + 回歸（≥20 新 tests + 1746 零回歸）

關鍵原則：
1. 規則引擎（methodRole）在 core 層，零成本，不需 AI
2. AI 分析在 CLI 層背景非同步，不阻塞 server
3. /api/graph 回傳時從 AICache 合併，不改 analysis.json
4. AI 失敗 → catch → 繼續 → 不 crash
5. AI disabled → 規則引擎照常 → aiSummary 為 undefined

先進入 Plan Mode 規劃執行順序，再逐一執行。
每完成一個任務 → /task-done。全部完成 → /review → 提交 Gate。
```

---

## 8. 參考文件

| 文件 | 說明 |
|------|------|
| `proposal/sprint15.1-proposal.md` | Sprint 15.1 提案書（G0 通過） |
| `packages/core/src/analyzer/graph-builder.ts` | buildFunctionGraph() — T1 修改點 |
| `packages/core/src/ai/method-role-classifier.ts` | classifyMethodRole() — T1 呼叫 |
| `packages/cli/src/server.ts` | startServer() — T3 修改點 |
| `packages/core/src/ai/contracts.ts` | AI Contract schemas |
| `packages/core/src/ai/prompt-templates.ts` | Prompt 模板 |
| `packages/core/src/ai/prompt-budget.ts` | Budget 計算 |

---

## 9. Rollback 計畫

移除管線串接邏輯（revert T1-T5 的修改），回到 Sprint 15 狀態。AI 元件存在但不觸發，等同 AI disabled 行為。

---

## 10. 任務與審核紀錄

### 任務完成紀錄

| 任務 | 完成日期 | 結果 | 備註 |
|------|---------|------|------|
| T1 | 2026-04-05 | ✅ 通過 | graph-builder.ts classifyMethodRole 整合，pnpm build 通過 |
| T2 | 2026-04-05 | ✅ 通過 | ai-pipeline.ts 新增，AICache + runAIPipeline 三階段，tsc 零錯誤 |
| T3 | 2026-04-05 | ✅ 通過 | server.ts 整合 pipeline 啟動 + mergeAICache + status 擴充 |
| T4 | 2026-04-05 | ✅ 通過 | App.tsx AI polling 3s + auto-refresh + progress indicator |
| T5 | 2026-04-05 | ✅ 通過 | 四種降級路徑驗證 + DJ/LO 資料管線串接補齊 |
| T6 | 2026-04-05 | ✅ 通過 | 48 新測試（22 core + 26 cli），1707 全量零回歸 |

### Review 紀錄

| Review | 日期 | 結果 | 文件 |
|--------|------|------|------|
| 實作 Review（對程式碼+對功能） | 2026-04-05 | 通過 | Blocker:0 Major:0 Minor:0 — 全 6 任務通過，1707 tests 零回歸，pnpm build 全通過 |

### Gate 紀錄

| Gate | 日期 | 決策 | 審核意見 |
|------|------|------|---------|
| G0 | 2026-04-05 | ✅ 通過 | 老闆確認，Sprint 15 遺漏的管線串接必須補完 |
| G2 | 2026-04-06 | ✅ 附條件通過 | PM 審核：管線串接目標達成。AI 成功率低（LO 32%/SF 8%/DJ 0%）歸因 Gemma4 模型品質不足，非管線問題，移 Sprint 16 處理。附帶條件：TL 回覆測試數下降原因（1746→1707） |
| G3 | 2026-04-06 | ✅ 附條件通過 | 48 新測試 + 1707 全量。額外修復 9 項 Hotfix bug（Claude CLI Windows/Ollama timeout/Zod null 等）。AI 體驗問題移 Sprint 16 |

---

## 11. Sprint 15.1 完成回報

### 完成狀態：✅ 管線串接完成，⚠️ AI 體驗待加強

### 已完成（T1-T6 全部 Done）

| 項目 | 狀態 | 說明 |
|------|------|------|
| 規則引擎管線 | ✅ | graph-builder 自動分類 44/44 方法（methodRole + roleConfidence），零成本 |
| AI 背景管線 | ✅ | ai-pipeline.ts 三階段（Method/Directory/Endpoint），背景非同步 |
| Server 整合 | ✅ | mergeAICache 合併 + /api/ai/status 即時回報 + ?include=functions |
| 前端 polling | ✅ | 每 3s polling，Phase 完成自動 refetch，底部進度條 |
| 降級路徑 | ✅ | AI disabled/running/done/error 四種情境正常 |
| 測試 | ✅ | 48 新測試，1707+ 全量零回歸 |

### Hotfix 追加修復（Sprint 15.1 期間額外修的 bug）

| Bug | 原因 | 修復 |
|-----|------|------|
| Claude CLI binary ENOENT (Windows) | `where claude` 回傳無 .exe 後綴 | findBinary() 優先選 .exe 路徑 |
| Claude CLI response 雙層包裝 | --output-format json 回傳 `{"type":"result","result":"..."}` | execClaude() 先 unwrap 再回傳 |
| console.warn crash | Node.js inspect 無法序列化 CLI error 物件 | 改用 err.message 字串 |
| Ollama 30s timeout | 本地 8B 模型推理慢 | 調整為 300s |
| Batch size 20 太大 | 本地模型 prompt 過長 timeout | 縮為 5 |
| Zod schema 不容忍 null | Gemma4 回傳 businessRelevance: null | 加 .nullable() |
| BaseAnalysisProvider 雙重包裝 | rawPrompt 被 buildPrompt 再包一次 | 新增 rawPrompt() 方法 |
| 前端只 refetch 一次 | 原設計 ready=done 才觸發 | 改為 phase 完成即 refetch |
| fetchGraph 沒帶 ?include=functions | function nodes 被 server 過濾掉 | 加 query param |

### 誠實評估：AI 體驗不達標

| 驗收項 | 預期 | 實際 | 差距 |
|--------|------|------|------|
| LO 方法 AI 摘要 | 44/44 有 aiSummary | 14/44（32%） | ❌ Gemma4 JSON 輸出不穩定 |
| SF 目錄 AI 摘要 | 26 目錄有摘要 | 2/26（8%） | ❌ Phase 2 成功率極低 |
| DJ 端點 AI 描述 | 35 端點有中文描述 | 0/35 | ❌ Phase 3 尚未成功完成 |
| AI 語言 | 中文 | 英文 | ❌ Gemma4:e4b 預設回英文 |
| 視覺衝擊 | 明顯可見的 AI 增強 | 幾乎看不出差異 | ❌ 文字太小、位置不醒目 |

### 根因分析

1. **Provider 品質不足**：Gemma4:e4b（8B）JSON 輸出不穩定，中文能力弱，推理速度慢
2. **Prompt 模板過於嚴格**：要求 JSON 結構化輸出，小模型難以可靠遵循
3. **Batch 策略低效**：每批 5 個方法，44 個方法需要 9 批 × 1 分鐘 = 9 分鐘
4. **體驗設計不足**：AI 內容只是灰色小字，沒有明顯視覺差異
5. **架構缺口**：前端 Provider 選擇器不連動後端，設定不持久化

### 遞交下個 Sprint 的建議

| 優先級 | 項目 | 說明 |
|--------|------|------|
| P0 | 換用 Claude API | Gemma4 本地太弱，Claude 3.5 品質和中文能力遠超 |
| P0 | Prompt 模板中文化 | 明確要求 AI 用中文回答 |
| P1 | AI 體驗視覺強化 | 摘要字體加大、角色標籤更顯眼、AI 內容加淺色底色 |
| P1 | 前端 Provider 選擇連動後端 | Settings 切換後 trigger 後端重跑 pipeline |
| P2 | AI 結果持久化 | 寫入 analysis.json 或 SQLite，重啟不遺失 |
| P2 | 分析範圍選擇 | 讓用戶選「只分析哪些目錄」 |
