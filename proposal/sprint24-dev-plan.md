# 開發計畫書: Sprint 24 — 分析器通用化

> **撰寫者**: Tech Lead
> **日期**: 2026-04-13
> **專案**: CodeAtlas（packages/core）
> **Sprint 提案書**: proposal/sprint24-proposal.md
> **狀態**: 📝 待審核

---

> 本文件在 G0 通過後由 L1 撰寫，依據提案書中勾選的步驟展開技術細節。

## 1. 需求摘要

CodeAtlas 的 endpoint-detector 硬編碼 Express / Fastify / Python decorator 三種 regex 模式。使用 NestJS、Django、Spring Boot 等框架的專案端點識別完全失效，呼叫鏈為空。產品宣稱「5 分鐘看懂任何專案」卻只支援 3 種框架模式，是 P0 問題。

**核心目標**：
1. 重構為 FrameworkAdapter Plugin 機制（統一 interface）
2. 支援 9 個框架 adapter（5 JS/TS + 3 Python + 1 Java）
3. AI 全面兜底（端點識別 + 呼叫鏈補充 + 方法角色 + middleware）
4. 三層 fallback：規則 Plugin → AI → 純靜態降級
5. 現有 Express / Fastify 零回歸

### 確認的流程

```
需求(G0✅) → 設計+實作(G2) → 測試(G3)
```

**排除的 Gate**：
- G1（圖稿）不需要 — 純 core 改動，無 UI 變更
- G4（文件）不另設獨立 Gate — 文件更新（第 9 節）併入 G2 交付物一起驗收
- G5/G6 不需要 — 不另外部署

---

## 2. 技術方案

### 2.1 三層 Fallback 架構

```
detectEndpoints(analysis)
  │
  ▼
Layer 1: AdapterRegistry → 匹配的 FrameworkAdapter.extractEndpoints()
  │       ├─ Express Adapter (規則引擎)
  │       ├─ Fastify Adapter (規則引擎)
  │       ├─ NestJS Adapter (規則引擎)
  │       ├─ Koa / Hono Adapter (規則引擎)
  │       ├─ Django / Flask / FastAPI Adapter (規則引擎)
  │       └─ Spring Boot Adapter (規則引擎)
  │
  ▼ 無結果或結果不足
Layer 2: AI Fallback Adapter → AI Provider 分析原始碼識別端點
  │
  ▼ AI 未設定或失敗
Layer 3: 靜態降級 → 返回空 EndpointGraph，UI 提示設定 AI
```

### 2.2 FrameworkAdapter Interface

```typescript
interface FrameworkAdapter {
  readonly name: string;              // 'express' | 'nestjs' | 'django' ...
  readonly displayName: string;       // 'Express.js' | 'NestJS' ...
  readonly language: SupportedLanguage;

  /** 偵測專案是否使用此框架（檢查 package.json / requirements.txt / pom.xml） */
  detect(analysis: AnalysisResult): FrameworkDetection | null;

  /** 從原始碼提取 API 端點 */
  extractEndpoints(ctx: AdapterContext): ApiEndpoint[];

  /** 從端點建構呼叫鏈（預設：BFS 追蹤 call edges） */
  buildChains(endpoints: ApiEndpoint[], ctx: AdapterContext): EndpointChain[];

  /** 提取 middleware 註冊（可選） */
  extractMiddleware?(ctx: AdapterContext): MiddlewareDescriptor[];
}
```

### 2.3 AdapterContext（預建共用 lookup，避免每個 adapter 重複計算）

```typescript
interface AdapterContext {
  analysis: AnalysisResult;
  nodeMap: Map<string, GraphNode>;              // 所有 node by id
  callAdjacency: Map<string, string[]>;         // caller → [callee...]
  functionsByLabel: Map<string, GraphNode[]>;   // function name → nodes
  functionNodes: GraphNode[];                    // type=function|class
}
```

### 2.4 AdapterRegistry

```typescript
class AdapterRegistry {
  register(adapter: FrameworkAdapter): void;
  detectFrameworks(analysis: AnalysisResult): FrameworkDetection[];
  getMatchedAdapters(analysis: AnalysisResult): FrameworkAdapter[];
}

function createDefaultRegistry(): AdapterRegistry {
  // 註冊 9 個框架 adapter + AI fallback（最後）
}
```

### 2.5 重構後的 detectEndpoints()

```typescript
export function detectEndpoints(analysis: AnalysisResult): EndpointGraph | null {
  const registry = createDefaultRegistry();
  const ctx = buildAdapterContext(analysis);
  const matched = registry.getMatchedAdapters(analysis);

  const endpoints: ApiEndpoint[] = [];
  const chains: EndpointChain[] = [];

  for (const adapter of matched) {
    const eps = adapter.extractEndpoints(ctx);
    for (const ep of eps) {
      if (!endpoints.some(e => e.id === ep.id)) endpoints.push(ep);  // dedup
    }
    chains.push(...adapter.buildChains(eps, ctx));
  }

  if (endpoints.length === 0) return null;
  return { endpoints, chains };
}
```

**公開 API 簽名不變**，確保零回歸。另新增 `detectEndpointsAsync()` 供 AI fallback 路徑使用。

### 2.6 各框架偵測與端點模式

| 框架 | detect() 依據 | 端點模式 | 語言 |
|------|--------------|---------|------|
| Express | `package.json` → `express` | `router.get('/path', handler)`, `app.post(...)` | JS/TS |
| Fastify | `package.json` → `fastify` | `fastify.get(...)`, `fastify.route({...})` | JS/TS |
| NestJS | `package.json` → `@nestjs/common` | `@Get()`, `@Post()` + `@Controller('/prefix')` | TS |
| Koa | `package.json` → `koa` / `@koa/router` | `router.get('/path', handler)` | JS/TS |
| Hono | `package.json` → `hono` | `app.get('/path', handler)` | JS/TS |
| Django | `requirements.txt` → `django` | `urlpatterns`, `path()`, `@api_view` | Python |
| Flask | `requirements.txt` → `flask` | `@app.route()`, `@blueprint.route()` | Python |
| FastAPI | `requirements.txt` → `fastapi` | `@router.get()`, `@app.post()` | Python |
| Spring Boot | `pom.xml` → `spring-boot-starter-web` | `@GetMapping`, `@PostMapping`, `@RequestMapping` | Java |

### 2.7 BaseAdapter 共用邏輯（從 endpoint-detector 抽出）

| 方法 | 說明 |
|------|------|
| `normaliseMethod()` | HTTP method 正規化 |
| `parseHandlerArgs()` | handler / middleware 名稱解析 |
| `readSourceCode()` | 從磁碟讀取檔案原始碼 |
| `buildChainSteps()` | BFS 追蹤 call edges |
| `findEnclosingFunction()` | 匿名 handler → 找包裹函式 |
| `classifyStepRole()` | 方法角色分類 |

### 2.8 AI 兜底機制

| 項目 | 說明 |
|------|------|
| AI 端點偵測 | 新增 `AIEndpointDetectionSchema` (Zod) + `buildEndpointDetectionPrompt()` |
| AI Fallback Adapter | 只在所有規則 adapter 返回 0 端點時觸發 |
| `detectEndpointsAsync()` | 新增 async 版本含 AI 路徑，`server.ts` 改用此版本 |
| 靜態降級 | AI 未設定 → 返回空 EndpointGraph，不 crash |

### 替代方案比較

| 方案 | 優點 | 缺點 | 結論 |
|------|------|------|------|
| A: Adapter Plugin | 擴展性好、職責清晰、可獨立測試 | 需要重構 endpoint-detector | ✅ 選定 |
| B: 加 regex 到現有架構 | 改動小 | 檔案爆大、難維護、無法擴展 | ❌ 排除 |
| C: 全靠 AI | 最通用 | 需要 API key、延遲高、離線不可用 | ❌ 排除 |

---

## 3. 零回歸策略

| 策略 | 說明 |
|------|------|
| 現有測試不動 | `endpoint-detector.test.ts` 全部保留，必須全通過 |
| Shadow test | 同一輸入跑舊/新路徑，比對結果一致 |
| API 簽名不變 | `detectEndpoints(analysis) => EndpointGraph \| null` |
| Shorthand regex 共用 | Express 和 Fastify 共用 `router\|app\|fastify` regex，dedup by endpoint id |
| Rollback flag | `LEGACY_ENDPOINT_DETECTION=true` env var 走舊路徑 |

---

## 4. 檔案變更清單

### 新增

| 檔案 | 用途 |
|------|------|
| `packages/core/src/analyzers/adapters/types.ts` | FrameworkAdapter interface + 共用型別 |
| `packages/core/src/analyzers/adapters/registry.ts` | AdapterRegistry + createDefaultRegistry() |
| `packages/core/src/analyzers/adapters/base-adapter.ts` | 抽象基類（共用 BFS、handler 解析等） |
| `packages/core/src/analyzers/adapters/express-adapter.ts` | Express adapter |
| `packages/core/src/analyzers/adapters/fastify-adapter.ts` | Fastify adapter |
| `packages/core/src/analyzers/adapters/python-base-adapter.ts` | Python 共用基類（skip sets + heuristic chain） |
| `packages/core/src/analyzers/adapters/nestjs-adapter.ts` | NestJS adapter |
| `packages/core/src/analyzers/adapters/koa-adapter.ts` | Koa adapter |
| `packages/core/src/analyzers/adapters/hono-adapter.ts` | Hono adapter |
| `packages/core/src/analyzers/adapters/django-adapter.ts` | Django adapter |
| `packages/core/src/analyzers/adapters/flask-adapter.ts` | Flask adapter（extends python-base） |
| `packages/core/src/analyzers/adapters/fastapi-adapter.ts` | FastAPI adapter（extends python-base） |
| `packages/core/src/analyzers/adapters/spring-boot-adapter.ts` | Spring Boot adapter |
| `packages/core/src/analyzers/adapters/ai-fallback-adapter.ts` | AI 兜底 adapter |
| `packages/core/src/analyzers/adapters/index.ts` | barrel export |
| `packages/core/__tests__/adapters/*.test.ts` | 各 adapter 單元測試（12+ 檔案） |

### 修改

| 檔案 | 變更內容 |
|------|---------|
| `packages/core/src/analyzers/endpoint-detector.ts` | 重構為薄 orchestrator，邏輯移到 adapter |
| `packages/core/src/ai/contracts.ts` | 新增 `AIEndpointDetectionSchema` |
| `packages/core/src/ai/prompt-templates.ts` | 新增 `buildEndpointDetectionPrompt()` |
| `packages/core/src/index.ts` | 更新 barrel exports（adapter 型別 + registry） |
| `packages/cli/src/server.ts` | `detectEndpoints` → `detectEndpointsAsync`（AI 路徑） |

### 不修改

| 檔案 | 原因 |
|------|------|
| `packages/core/__tests__/endpoint-detector.test.ts` | 零回歸驗證，不動 |
| `packages/web/` | 無 UI 變更 |

---

## 5. 介面設計

> 本 Sprint 無 UI 變更，無新 API 端點。`/api/graph` 回傳的 `endpointGraph` 結構（`EndpointGraph`）不變。

唯一變更：`server.ts` 呼叫 `detectEndpointsAsync()` 取代同步版本（已是 async handler，無影響）。

---

## 6. 任務定義與分配

> L1 讀取本節後按依賴順序執行。第一步先執行 `/task-delegation` 建立 `.tasks/` 檔案，系統自動追蹤進度。

### 任務清單

#### Phase A：基礎設施

| # | 任務名稱 | 說明 | 負責 Agent | 依賴 | 優先級 | 並行組 | 驗收標準 |
|---|---------|------|-----------|------|--------|--------|---------|
| T1 | Adapter 型別定義 | 建立 `adapters/types.ts`：FrameworkAdapter interface、AdapterContext、FrameworkDetection、MiddlewareDescriptor | backend-architect | — | P0 | A | TypeScript 編譯通過、所有型別 export |
| T2 | BaseAdapter 抽象基類 | 建立 `adapters/base-adapter.ts`：從 endpoint-detector 抽出共用邏輯（normaliseMethod、parseHandlerArgs、BFS chain builder、readSourceCode、findEnclosingFunction、classifyStepRole） | backend-architect | — | P0 | A | 所有方法可被子類呼叫、含 JSDoc |
| T3 | AdapterRegistry | 建立 `adapters/registry.ts`：register/detect/getMatchedAdapters + createDefaultRegistry() | backend-architect | T1 | P0 | A | 可註冊/查找 adapter、按 confidence 排序 |

#### Phase B：抽出現有 Adapter + 重構

| # | 任務名稱 | 說明 | 負責 Agent | 依賴 | 優先級 | 並行組 | 驗收標準 |
|---|---------|------|-----------|------|--------|--------|---------|
| T4 | Express Adapter | 建立 `express-adapter.ts`：detect（package.json 有 express）、extractEndpoints（shorthand regex）、buildChains（BFS） | backend-architect | T2 | P0 | B | detect 正確判斷 Express 專案、端點提取與舊邏輯一致 |
| T5 | Fastify Adapter | 建立 `fastify-adapter.ts`：detect、extractEndpoints（shorthand + route block regex）、buildChains | backend-architect | T2 | P0 | B | detect 正確判斷 Fastify 專案、含 fastify.route({}) 支援 |
| T6 | Python Base Adapter | 建立 `python-base-adapter.ts`：從 endpoint-detector 抽出 Python decorator regex、skip sets、heuristic chain builder | backend-architect | T2 | P0 | B | Python decorator 模式識別與舊邏輯一致 |
| T7 | Orchestrator 重構 | 重構 `endpoint-detector.ts` 為薄 orchestrator：使用 AdapterRegistry、buildAdapterContext、dedup 邏輯 | backend-architect | T3, T4, T5, T6 | P0 | — | `detectEndpoints()` 簽名不變、輸出等價 |
| T8 | 零回歸驗證 | 跑現有 `endpoint-detector.test.ts` 全通過 + Shadow test 比對舊/新路徑輸出一致 | backend-architect | T7 | P0 | — | 所有現有測試 PASS、shadow 比對零差異 |

#### Phase C：新框架 Adapter（並行）

| # | 任務名稱 | 說明 | 負責 Agent | 依賴 | 優先級 | 並行組 | 驗收標準 |
|---|---------|------|-----------|------|--------|--------|---------|
| T9 | NestJS Adapter + 測試 | `@Controller` + `@Get/@Post` decorator 模式、path prefix 組合、DI 呼叫追蹤 | backend-architect | T2 | P0 | C | NestJS 範例專案端點識別率 > 80% |
| T10 | Koa Adapter + 測試 | `@koa/router` 的 `router.get()` 模式 | backend-architect | T2 | P0 | C | Koa examples 端點全識別 |
| T11 | Hono Adapter + 測試 | `app.get()` + `app.route()` 模式 | backend-architect | T2 | P1 | C | Hono 範例端點全識別 |
| T12 | Django Adapter + 測試 | `urlpatterns`、`path()`、`re_path()`、`include()`、DRF `@api_view`、`ViewSet` | backend-architect | T6 | P0 | C | Django 範例端點識別率 > 80% |
| T13 | Flask Adapter + 測試 | `@app.route()`、`@blueprint.route()`（extends python-base） | backend-architect | T6 | P0 | C | Flask 範例端點全識別 |
| T14 | FastAPI Adapter + 測試 | `@router.get()`、`@app.post()`（extends python-base）+ Pydantic model | backend-architect | T6 | P0 | C | FastAPI 範例端點識別率 > 80% |
| T15 | Spring Boot Adapter + 測試 | `@RestController` + `@GetMapping/@PostMapping/@RequestMapping` 模式 | backend-architect | T2 | P0 | C | Spring PetClinic 端點識別率 > 80% |

#### Phase D：AI 兜底

| # | 任務名稱 | 說明 | 負責 Agent | 依賴 | 優先級 | 並行組 | 驗收標準 |
|---|---------|------|-----------|------|--------|--------|---------|
| T16 | AI Schema + Prompt | 新增 `AIEndpointDetectionSchema` 到 contracts.ts + `buildEndpointDetectionPrompt()` 到 prompt-templates.ts | backend-architect | — | P0 | D | Zod schema 驗證通過、endpoint detection prompt 正常運作 |
| T17 | AI Fallback Adapter | 建立 `ai-fallback-adapter.ts`：detect 永遠低 confidence 命中、extractEndpoints 呼叫 AI Provider | backend-architect | T2, T16 | P0 | D | AI 啟用時能識別未知框架端點、AI 關閉時優雅降級 |
| T18 | Async 整合 | 新增 `detectEndpointsAsync()`、更新 server.ts 呼叫 async 版本 | backend-architect | T7, T17 | P0 | — | server.ts 正常運作、AI 路徑可觸發 |

#### Phase E：整合測試 + 收尾

| # | 任務名稱 | 說明 | 負責 Agent | 依賴 | 優先級 | 並行組 | 驗收標準 |
|---|---------|------|-----------|------|--------|--------|---------|
| T19 | Barrel Export 更新 | 更新 `packages/core/src/index.ts`，export adapter 型別和 registry | backend-architect | T3 | P0 | — | import from '@codeatlas/core' 可取得所有新型別 |
| T20 | 5 個真實專案整合測試 | NestJS、FastAPI、Spring PetClinic、Koa examples、Django — 端對端驗證（含 async/AI fallback 路徑） | backend-architect | T7~T18 | P0 | — | 每個專案端點識別率 > 80% |
| T21 | G2 Code Review | L1 Review 所有程式碼 | tech-lead | T20 | P0 | — | 0 Blocker + 0 Major |

### 依賴圖

```
Phase A（基礎，可並行）:
  T1 ──→ T3
  T2 ──→ T4, T5, T6, T9, T10, T11, T15

Phase B（重構，循序）:
  T3 + T4 + T5 + T6 ──→ T7 ──→ T8

Phase C（新 adapter，並行組 C）:
  T2 ──→ T9（NestJS）
  T2 ──→ T10（Koa）
  T2 ──→ T11（Hono）
  T6 ──→ T12（Django）
  T6 ──→ T13（Flask）
  T6 ──→ T14（FastAPI）
  T2 ──→ T15（Spring Boot）

Phase D（AI 兜底，與 C 並行）:
  T16 ──→ T17
  T7 + T17 ──→ T18

Phase E（整合）:
  T3 ──→ T19
  T7~T18 ──→ T20 ──→ T21
```

### L1 執行指令

> PM 產出此區塊，老闆複製貼入 L1 session 即可啟動。

```
請執行 Sprint 24 分析器通用化開發計畫。

📄 計畫書：proposal/sprint24-dev-plan.md
📋 提案書：proposal/sprint24-proposal.md

🔧 Phase A（基礎設施，可立即並行）：
  - T1：backend-architect Adapter 型別定義
  - T2：backend-architect BaseAdapter 抽象基類
  - T3：backend-architect AdapterRegistry（依賴 T1）

🔄 Phase B（重構，循序執行）：
  - T4：backend-architect Express Adapter
  - T5：backend-architect Fastify Adapter
  - T6：backend-architect Python Base Adapter
  - T7：backend-architect Orchestrator 重構（依賴 T3~T6）
  - T8：backend-architect 零回歸驗證（依賴 T7）

🌐 Phase C（新 adapter，並行組 C，Phase B 的 T2/T6 完成後可開始）：
  - T9：NestJS   - T10：Koa     - T11：Hono
  - T12：Django   - T13：Flask   - T14：FastAPI
  - T15：Spring Boot

🤖 Phase D（AI 兜底，與 Phase C 並行）：
  - T16：AI Schema + Prompt
  - T17：AI Fallback Adapter（依賴 T16）
  - T18：Async 整合（依賴 T7 + T17）

✅ Phase E（整合測試）：
  - T19：Barrel Export 更新
  - T20：5 個真實專案整合測試
  - T21：G2 Code Review

⚠️ 阻斷規則：
  - T7 阻斷：T4/T5/T6 全部完成前不得開始
  - T20 阻斷：所有 adapter（T4~T15）+ AI 整合（T18）完成前不得開始
  - T21 阻斷：T20 通過前不得提交 G2

Sprint 分支從 master 切：git checkout -b sprint-24
第一步請先執行 /task-delegation 建立任務檔案。
```

### 共用檔案（需協調）

| 檔案 | 涉及任務 | 風險等級 |
|------|---------|---------|
| `adapters/types.ts` | T1, T2, T3, T4~T15, T17 | 高 — T1 先定義，所有 adapter 依賴 |
| `adapters/base-adapter.ts` | T2, T4~T15 | 高 — T2 先建，所有 adapter 繼承 |
| `endpoint-detector.ts` | T7 | 高 — 單人重構，不並行修改 |
| `packages/core/src/index.ts` | T19 | 低 — 最後統一更新 |

---

## 7. 測試計畫

### 單元測試（每個 adapter 獨立）

| 測試檔案 | 覆蓋範圍 |
|---------|---------|
| `adapter-registry.test.ts` | registry 註冊、偵測、優先序、fallback |
| `express-adapter.test.ts` | Express shorthand 所有模式 |
| `fastify-adapter.test.ts` | Fastify shorthand + route block |
| `python-base-adapter.test.ts` | Python decorator 模式 + skip sets |
| `nestjs-adapter.test.ts` | NestJS decorator + controller prefix |
| `koa-adapter.test.ts` | Koa router 模式 |
| `hono-adapter.test.ts` | Hono app 模式 |
| `django-adapter.test.ts` | urlpatterns + DRF |
| `flask-adapter.test.ts` | Flask route decorator |
| `fastapi-adapter.test.ts` | FastAPI decorator |
| `spring-boot-adapter.test.ts` | Spring annotations |
| `ai-fallback-adapter.test.ts` | AI 啟用/關閉、降級 |

### 整合測試（5 個真實專案）

**Fixture 取得策略**：使用 pinned commit 的精簡 fixture snapshot（只取路由定義相關檔案，不 clone 完整 repo）。Fixture 檔案固定版本 commit 進 `packages/core/__tests__/fixtures/frameworks/`，CI 不依賴外部網路。每個 fixture 附 `README.md` 記錄來源 repo + commit hash。

| # | 專案 | 框架 | 語言 | 目標識別率 |
|---|------|------|------|----------|
| 1 | nestjs/nest 範例 | NestJS | TS | > 80% |
| 2 | tiangolo/fastapi 範例 | FastAPI | Python | > 80% |
| 3 | spring-projects/spring-petclinic | Spring Boot | Java | > 80% |
| 4 | koajs/examples | Koa | JS | > 80% |
| 5 | django/djangoproject.com | Django | Python | > 80% |

### 回歸測試

| 項目 | 檢查方式 | 驗收標準 |
|------|---------|---------|
| 現有測試 | `endpoint-detector.test.ts` 不修改 | 全部 PASS |
| Shadow 比對 | 同一輸入跑舊/新路徑 | JSON.stringify 一致 |
| MorningGo | 重新分析 Fastify 專案 | chain steps ≥ 54/66（不低於修復前） |
| Build | `pnpm --filter @codeatlas/core build` | 零錯誤 |
| 全套測試 | `pnpm --filter @codeatlas/core test` | 全部 PASS |

---

## 8. 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| Express/Fastify regex 分流後漏端點 | 現有使用者受影響 | Shadow test + dedup by endpoint id + rollback flag |
| NestJS decorator 解析困難 | 端點識別率低 | tree-sitter 已支援 decorator 語法，提前驗證 |
| Django urlpatterns 模式複雜 | 漏抓端點 | 支援 path() + re_path() + include()，覆蓋 90% |
| AI 兜底品質不穩定 | 使用者體驗不一致 | AI 結果標記 confidence，低信心提示使用者 |
| Adapter 數量多（9 個） | 延期 | 按 P0/P1 排序，Hono 可延後 |
| 各框架版本差異 | 識別率低 | 優先支援最新版，舊版作為後續改進 |

---

## 9. 文件更新（併入 G2 交付物）

完成後需同步更新的文件（隨 G2 一併驗收，不另設 G4）：

- [ ] `.knowledge/specs/feature-spec.md` — 新增框架 adapter 功能描述
- [ ] `.knowledge/architecture.md` — 更新 core/analyzers 模組結構
- [ ] `CLAUDE.md` — 更新踩坑紀錄（如有新發現）

---

## 10. 任務與審核紀錄（備查）

> 每個任務完成後記錄結果，每次 Review/Gate 通過後記錄決策。本區作為 Sprint 完整稽核軌跡。

### 任務完成紀錄

| 任務 | 完成日期 | 結果 | 備註 |
|------|---------|------|------|
| T1 | 2026-04-14 | ✅ 完成 | 型別定義完成，含 JSDoc |
| T2 | 2026-04-14 | ✅ 完成 | BaseAdapter 抽象基類，6 protected methods + 預設 buildChains |
| T3 | 2026-04-14 | ✅ 完成 | AdapterRegistry + createDefaultRegistry |
| T4 | 2026-04-14 | ✅ 完成 | Express adapter，shorthand + peek-ahead |
| T5 | 2026-04-14 | ✅ 完成 | Fastify adapter，shorthand + route block |
| T6 | 2026-04-14 | ✅ 完成 | PythonBaseAdapter，skip sets + heuristic chains + disk scanner |
| T7 | 2026-04-14 | ✅ 完成 | Orchestrator 薄化 + legacy rollback + registry 整合 |
| T8 | 2026-04-14 | ✅ 完成 | 零回歸：build clean + 10/10 endpoint-detector tests pass |
| T9 | 2026-04-14 | ✅ 完成 | NestJS adapter，@Controller + @Get/@Post decorator 解析 |
| T10 | 2026-04-14 | ✅ 完成 | Koa adapter，@koa/router 模式 + inline handler fix |
| T11 | 2026-04-14 | ✅ 完成 | Hono adapter，app.get + app.route 模式 |
| T12 | 2026-04-14 | ✅ 完成 | Django adapter，urlpatterns + DRF ViewSet + include() |
| T13 | 2026-04-14 | ✅ 完成 | Flask adapter，@app.route + blueprint + method shortcuts |
| T14 | 2026-04-14 | ✅ 完成 | FastAPI adapter，@app.get/@router.post + APIRouter prefix |
| T15 | 2026-04-14 | ✅ 完成 | Spring Boot adapter，@RestController + @GetMapping + @RequestMapping |
| T16 | 2026-04-14 | ✅ 完成 | AIEndpointDetectionSchema + buildEndpointDetectionPrompt |
| T17 | 2026-04-14 | ✅ 完成 | AI Fallback Adapter，detect 0.1 confidence + async AI 路徑 + 優雅降級 |
| T18 | 2026-04-14 | ✅ 完成 | detectEndpointsAsync() 三層 fallback + server.ts 3 call sites 更新 |
| T19 | 2026-04-14 | ✅ 完成 | adapters/index.ts + core/index.ts barrel exports |
| T20 | 2026-04-14 | ✅ 完成 | 21 integration tests，5 框架 100% detection rate，144 total tests pass |
| T21 | 2026-04-14 | ✅ 完成 | G2 Code Review: 0 Blocker, 0 Major, 6 Minor |

### Review / Gate 紀錄

| Gate | 日期 | 結果 | 審查者 | 備註 |
|------|------|------|--------|------|
| G0 | 2026-04-13 | ✅ 通過 | 老闆 | |
| G2 | 2026-04-14 | ✅ 通過 | tech-lead | 0 Blocker, 0 Major, 6 Minor。144 tests pass, build clean |
| G3 | | | | |
