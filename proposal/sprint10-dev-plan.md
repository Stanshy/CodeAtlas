# 開發計畫書: Sprint 10 — 智慧策展 + 效能 + 3D 空間

> **撰寫者**: Tech Lead（L1）
> **日期**: 2026-04-01
> **專案**: CodeAtlas
> **Sprint 提案書**: `proposal/sprint10-proposal.md`
> **狀態**: 待執行

---

> 本文件在 G0 通過後由 L1 撰寫，依據提案書中勾選的步驟展開技術細節。

## 1. 需求摘要

Sprint 1-9 累積了完整的解析引擎 + 互動 UI + 控制面板，但核心體驗問題浮現：① 所有檔案一律顯示，500+ 節點淹沒架構重點 ② 9 次 ViewState 擴充導致全局 re-render 卡頓 ③ 3D 模式純黑背景無空間感，節點擠成一團。Sprint 10 從資料源頭解決：core 層新增節點重要度分析，自動分類角色（業務邏輯 / 橫向切面 / 基礎設施 / 輔助 / 噪音），預設只顯示核心節點（30~50 個而非 500 個）。搭配 ViewState 效能優化和 3D 空間參考系，讓體驗從「功能堆疊」升級為「一目了然」。

**一句話驗收**：打開 CodeAtlas → 只看到核心模組（30~50 個節點而非 500 個）→ 3D 有軸線和網格 → 操作流暢不卡 → 「終於看得清楚架構了」。

### 確認的流程

需求 → 設計 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）

> **無 G1** — 無新 UI 面板設計，3D 網格/軸線為 Three.js 標準元件。
> **core + web 雙層改動** — core 先行產出 role 資料，web 消費 role 做策展。
> **無額外阻斷規則**。

---

## 2. 技術方案

### 2.1 節點重要度分析（S10-1 + S10-7）

#### 角色分類定義

| 角色 | 值 | 說明 | 策展行為 |
|------|-----|------|---------|
| 業務邏輯 | `business-logic` | route / controller / service / model / handler / page / view | ✅ 預設顯示 |
| 橫向切面 | `cross-cutting` | middleware / auth / logging / validation / error-handling / guard | ✅ 預設顯示 |
| 基礎設施 | `infrastructure` | config / db / server / connection / setup / bootstrap / migration | 淡化但不隱藏（opacity 降低） |
| 輔助 | `utility` | utils / helpers / constants / types / interfaces / enums / shared | ❌ 預設隱藏 |
| 噪音 | `noise` | test / spec / mock / fixture / build / CI / script / dist | ❌ 預設隱藏 |

#### Heuristic 演算法

純函式 `classifyNodeRole(node: GraphNode, edges: GraphEdge[]): NodeRole`，放在 `packages/core/src/analyzer/role-classifier.ts`：

```
輸入：node（GraphNode）+ 全局 edges（GraphEdge[]）
輸出：NodeRole（'business-logic' | 'cross-cutting' | 'infrastructure' | 'utility' | 'noise'）

Step 1 — 路徑模式匹配（最高優先）
  噪音路徑：__tests__/, test/, spec/, __mocks__, fixtures/, dist/, build/, .github/, scripts/
  → 命中 = noise，直接返回

Step 2 — 檔名模式匹配
  配置檔：*.config.*, .env*, tsconfig.*, package.json, *.setup.*
  → infrastructure

  型別檔：*.d.ts, types.ts, interfaces.ts, enums.ts, constants.ts
  → utility

Step 3 — 目錄名模式匹配
  業務：routes/, controllers/, services/, models/, handlers/, pages/, views/, features/, modules/, api/
  → business-logic

  橫向：middleware/, middlewares/, auth/, logging/, validation/, validators/, guards/, interceptors/, pipes/, filters/
  → cross-cutting

  基礎：config/, configs/, database/, db/, migrations/, seeds/, setup/, bootstrap/, server/
  → infrastructure

  輔助：utils/, helpers/, lib/, shared/, common/, tools/
  → utility

Step 4 — 依賴度分析（路徑/目錄無法判斷時）
  計算 inDegree（被其他節點 import 的次數）和 outDegree（import 其他節點的次數）

  高 inDegree（> 75th percentile）且 低 outDegree → 被廣泛依賴的核心模組 → business-logic
  低 inDegree 且 高 outDegree → 消費型模組 → 依具體路徑再判，預設 utility
  中等 inDegree + outDegree → infrastructure

Step 5 — 預設值
  無法分類 → infrastructure（保守策略：淡化但不隱藏）
```

> **設計原則**：寧可多顯示不確定的（歸為 infrastructure 淡化），也不漏掉重要的。

#### 資料模型擴充

**core types.ts 擴充**：
```typescript
// Sprint 10: Node Role
export type NodeRole = 'business-logic' | 'cross-cutting' | 'infrastructure' | 'utility' | 'noise';

interface NodeMetadata {
  // ...existing fields...
  role?: NodeRole;  // Sprint 10 — optional for backward compat
}
```

**web types/graph.ts 同步擴充**：新增 `NodeRole` 型別和 `NodeMetadata.role` optional 欄位。

**向下相容**：`role` 為 optional，不破壞任何現有消費端。舊版前端讀不到 role 等同不策展，全部顯示。

### 2.2 智慧策展（S10-2）

在 `graph-adapter.ts` 新增策展函式：

```typescript
export function applyCuration(
  nodes: GraphNode[],
  edges: GraphEdge[],
  pinnedNodeIds: Set<string>,  // 手動加入的節點
): { nodes: GraphNode[]; edges: GraphEdge[] }
```

策展規則：
1. `business-logic` + `cross-cutting` → 顯示
2. `infrastructure` → 顯示（但 NeonNode 渲染時 opacity 降低）
3. `utility` + `noise` → 隱藏（除非在 pinnedNodeIds 中）
4. `role` 為 undefined → 當 infrastructure 處理
5. 邊：source 和 target 都在顯示集合中才保留

**無「全部顯示」**：這是產品方向決策，graph-adapter 層強制過濾。

**與既有過濾疊加**：applyViewMode → applyCuration → filterNodes/filterEdges（三層過濾）。

### 2.3 手動微調（S10-3）

ViewState 新增：
```typescript
pinnedNodeIds: string[];  // 使用者手動加入的被隱藏節點
```

新增 actions：
```typescript
| { type: 'PIN_NODE'; nodeId: string }
| { type: 'UNPIN_NODE'; nodeId: string }
```

FilterPanel 升級：新增「已隱藏節點」區段，顯示 utility + noise 節點列表，可點擊「釘選」加入畫面。不可一鍵全開。

### 2.4 3D 空間參考系（S10-4）

在 `Graph3DCanvas.tsx` 中新增 Three.js 元件：

```
GridHelper:
  - 地板網格 size=1000, divisions=50
  - 材質 color: rgba(0, 212, 255, 0.06)（淡 cyan）
  - linewidth: 1
  - 位置 y=-200（節點下方）

AxesHelper:
  - 長度 500
  - X = red (rgba(255,80,80,0.4))
  - Y = green (rgba(80,255,80,0.4))
  - Z = blue (rgba(80,80,255,0.4))
  - 淡色半透明不搶視覺

軸標示文字（CSS2DRenderer 或 Canvas texture sprite）:
  - X, Y, Z 文字在軸末端
  - 白色半透明，fontSize 小
  - 旋轉時始終可見（billboard 朝向相機）
```

**只限 3D 模式**，2D 模式不受影響。

### 2.5 效能優化（S10-5）

#### Step 1：Profiling（先量測再優化）

使用 React DevTools Profiler + console.time 量測：
1. ViewState dispatch → re-render 範圍（哪些元件被觸發）
2. graph-adapter 計算耗時（filterNodes/filterEdges/applyViewMode）
3. Graph3DCanvas useEffect 觸發頻率
4. styledNodes/styledEdges useMemo 命中率

#### Step 2：ViewState 拆分

當前問題：單一 ViewStateContext 含 20+ 個 state 欄位，任何 dispatch 都觸發全部 consumer re-render。

方案：**Selector 機制**（對外 API 不變，893 tests 保護）

```typescript
// 新增 useViewStateSelector hook
export function useViewStateSelector<T>(selector: (state: ViewState) => T): T;
```

- 內部使用 `useSyncExternalStore` 或 `useRef` + shallow compare
- 元件只在 selector 回傳值變化時 re-render
- 既有 `useViewState()` 保持不變（回傳完整 state + dispatch）
- 漸進式遷移：先在高頻元件（GraphCanvas, NeonNode, NeonEdge）使用 selector

#### Step 3：graph-adapter 快取精確化

- `styledNodes` useMemo 依賴項精確化（拆分為多個小 useMemo）
- `styledEdges` 同上
- `applyViewMode` 結果獨立快取（activeViewMode + nodes hash）

#### Step 4：3D useEffect 減量

- 合併相關 useEffect（e2eTracing highlight + restore 合併為 1 個）
- 避免 object/array 直接放 deps（用 JSON stable key 或 useRef）

### 2.6 3D 佈局改善（S10-6）

調整 3d-force-graph 力導向參數：

```typescript
graph.d3Force('charge')?.strength(-300);     // 目前可能 -120
graph.d3Force('link')?.distance(120);        // 目前可能 30-60
graph.d3Force('collision')?.radius(30);       // 添加碰撞力
```

節點減少後空間自然改善，但仍需調參確保不擠成一團。

### 2.7 異常處理

| 場景 | 處理 |
|------|------|
| role 為 undefined（舊版 Graph JSON） | 當 infrastructure 處理（淡化但不隱藏） |
| 策展後節點數 < 5 | 自動放寬：顯示 infrastructure 全部 |
| heuristic 無法判斷（Step 5 fallback） | 歸為 infrastructure（保守） |
| pinnedNodeIds 中的節點不存在 | 靜默忽略 |
| 3D GridHelper 影響效能 | Three.js 輕量物件，若仍有問題可加 LOD |
| ViewState selector 回傳值比較 | shallow compare object，避免 reference 變化 |
| profiling 未發現瓶頸 | 仍做 selector 機制作為架構改善 |

---

## 3. 異常處理

同 §2.7。

---

## 4. 檔案變更清單

### 新增檔案

| 檔案 | 說明 | 任務 |
|------|------|------|
| `.knowledge/sprint10-curation-architecture.md` | 架構設計文件 | T1 |
| `packages/core/src/analyzer/role-classifier.ts` | 節點角色分類純函式 | T2 |
| `packages/core/__tests__/role-classifier.test.ts` | 角色分類單元測試 | T2 |

### 修改檔案

| 檔案 | 修改 | 任務 |
|------|------|------|
| `packages/core/src/types.ts` | +NodeRole type, +NodeMetadata.role | T3 |
| `packages/core/src/analyzer/graph-builder.ts` | 呼叫 classifyNodeRole 填入 role | T3 |
| `packages/core/src/index.ts` | re-export NodeRole | T3 |
| `packages/cli/src/server.ts` | /api/graph 回傳含 role（自動，因 core 已填） | T3 |
| `packages/web/src/types/graph.ts` | +NodeRole, +NodeMetadata.role | T4 |
| `packages/web/src/adapters/graph-adapter.ts` | +applyCuration() 策展函式 | T5 |
| `packages/web/src/hooks/useGraphData.ts` | 策展整合（applyCuration 呼叫點） | T5 |
| `packages/web/src/components/FilterPanel.tsx` | +已隱藏節點區段 + PIN_NODE 功能 | T6 |
| `packages/web/src/contexts/ViewStateContext.tsx` | +pinnedNodeIds + PIN/UNPIN actions + selector 機制 | T6+T7 |
| `packages/web/src/components/Graph3DCanvas.tsx` | +GridHelper +AxesHelper +軸標示 +力導向參數 | T8+T9 |
| `packages/web/src/components/GraphCanvas.tsx` | useMemo 精確化 | T10 |
| `packages/web/src/components/NeonNode.tsx` | infrastructure opacity 淡化 | T5 |
| `.knowledge/specs/data-model.md` | v4.0：+NodeRole, +NodeMetadata.role | T1 |
| `.knowledge/specs/feature-spec.md` | v10.0：+F72-F78 | T1 |

### 不改動

| 檔案 | 原因 |
|------|------|
| `packages/web/src/components/Toolbar.tsx` | 不改 Toolbar |
| `packages/web/src/components/ControlPanel.tsx` | 不改控制面板結構 |
| `packages/web/src/components/E2EPanel.tsx` | 不改 E2E 面板 |

---

## 5. 規範文件索引

| 規範 | 路徑 | 版本 |
|------|------|------|
| 功能規格 | `.knowledge/specs/feature-spec.md` | v10.0（本 Sprint 更新） |
| 資料模型 | `.knowledge/specs/data-model.md` | v4.0（本 Sprint 更新） |
| API 設計 | `.knowledge/specs/api-design.md` | v4.0（不改動） |
| 架構設計 | `.knowledge/sprint10-curation-architecture.md` | v1.0（新建） |
| Sprint 9 架構 | `.knowledge/sprint9-controlpanel-architecture.md` | v1.0（參考） |

---

## 6. 任務拆解

### 任務清單

| ID | 任務 | 指派 | 優先級 | 預估 | 依賴 |
|----|------|------|--------|------|------|
| T1 | 架構設計：策展演算法 + 效能策略 + 3D 空間 + 規範文件更新 | tech-lead | P0 | 3h | — |
| T2 | core 節點角色分類器（classifyNodeRole 純函式 + 單元測試） | backend-architect | P0 | 3h | T1 |
| T3 | core 資料模型擴充（NodeRole type + graph-builder 整合 + re-export） | backend-architect | P0 | 1.5h | T2 |
| T4 | web 型別同步 + graph-adapter applyCuration 策展函式 | frontend-developer | P0 | 2.5h | T3 |
| T5 | NeonNode infrastructure 淡化 + useGraphData 策展整合 | frontend-developer | P0 | 1.5h | T4 |
| T6 | FilterPanel 手動微調（已隱藏節點區段 + PIN_NODE/UNPIN_NODE） | frontend-developer | P0 | 2h | T4 |
| T7 | ViewState 效能優化（selector 機制 + profiling） | frontend-developer | P0 | 3h | T5 |
| T8 | 3D 空間參考系（GridHelper + AxesHelper + 軸標示文字） | frontend-developer | P0 | 2.5h | T1 |
| T9 | 3D 佈局改善（力導向參數調整 + 碰撞力） | frontend-developer | P0 | 1.5h | T8 |
| T10 | graph-adapter + GraphCanvas useMemo 精確化 + 3D useEffect 減量 | frontend-developer | P0 | 2h | T7 |
| T11 | AI 輔助角色分類（P1，復用 AI Provider） | backend-architect | P1 | 2.5h | T3 |
| T12 | Sprint 9 P1 收尾：AI 設定 UI + Onboarding（P1） | frontend-developer | P1 | 3h | T7 |
| T13 | 測試 + 回歸（角色分類 + 策展 + 效能 + 893+ 回歸） | test-writer-fixer | P0 | 4h | T10,T9 |

### 依賴圖

```
T1（設計，tech-lead）
 ├── T2（角色分類器，backend-architect）
 │    └── T3（資料模型擴充，backend-architect）
 │         ├── T4（web 型別 + applyCuration，frontend-developer）
 │         │    ├── T5（NeonNode 淡化 + 策展整合）
 │         │    │    └── T7（ViewState 效能優化）
 │         │    │         └── T10（useMemo/useEffect 優化）
 │         │    └── T6（FilterPanel 手動微調）
 │         └── T11（P1 AI 輔助分類）
 ├── T8（3D 空間參考系，frontend-developer）
 │    └── T9（3D 佈局改善）
 └── T12（P1 Sprint 9 收尾，依賴 T7）

T13（測試）← T10 + T9 完成後
```

### 執行順序建議

```
Phase 0: 設計
  T1（設計，tech-lead）

Phase 1: Core 層（core 先行，web 消費 core 產出）
  T2（角色分類器 + 測試）→ T3（資料模型 + graph-builder 整合）

Phase 2: Web 基礎 + 3D（可平行）
  T4（web 型別 + applyCuration）+ T8（3D 空間參考系）
  → T5（NeonNode 淡化 + 策展整合）+ T6（FilterPanel 微調）+ T9（3D 佈局）

Phase 3: 效能優化
  T7（ViewState selector）→ T10（useMemo/useEffect）

Phase 4: P1 + 測試
  T11（P1 AI 輔助）+ T12（P1 Sprint 9 收尾）— 視時間
  T13（測試 + 回歸）

→ /review → G2 → G3
```

---

## 7. 測試計畫

### 單元測試

| 測試對象 | 測試要點 | 任務 |
|---------|---------|------|
| `classifyNodeRole` 純函式 | 5 種角色各 2+ cases、路徑模式、檔名模式、目錄模式、依賴度分析、fallback | T2 |
| `applyCuration` | 策展過濾正確、pinnedNodeIds 加入、role undefined 處理、空圖、邊過濾 | T13 |
| ViewState reducer 新 actions | PIN_NODE + UNPIN_NODE | T13 |
| `useViewStateSelector` | selector 回傳值穩定性、shallow compare、re-render 最小化 | T13 |

### 整合測試

| 測試場景 | 描述 | 任務 |
|---------|------|------|
| 策展 + 手動過濾疊加 | applyCuration → filterNodes → 結果正確 | T13 |
| 策展 + 視圖模式疊加 | applyViewMode → applyCuration → 結果正確 | T13 |
| pinnedNodeIds 持久性 | PIN 後切換視圖，pinned 狀態保持 | T13 |

### 效能測試

| 測試場景 | 描述 | 任務 |
|---------|------|------|
| ViewState dispatch re-render 範圍 | 驗證 selector 機制減少不必要 re-render | T7 |
| graph-adapter 計算耗時 | useMemo 命中率 > 80% | T10 |

### 回歸測試

- 893+ 既有 tests 零回歸
- `pnpm build` 全通過
- Sprint 1-9 所有功能不受影響
- 2D 模式不受 3D 空間參考系影響

---

## 8. 驗收標準

### S10-1 節點重要度分析

- [ ] core 分析結果中每個節點含 role 欄位
- [ ] 5 種角色分類正確（business-logic / cross-cutting / infrastructure / utility / noise）
- [ ] heuristic 演算法覆蓋路徑、檔名、目錄名、依賴度四層
- [ ] heuristic 分類準確率 > 80%
- [ ] classifyNodeRole 為純函式，有獨立單元測試

### S10-2 智慧策展

- [ ] 預設只顯示 business-logic + cross-cutting 節點
- [ ] infrastructure 節點淡化但不隱藏
- [ ] utility + noise 節點預設隱藏
- [ ] 無「全部顯示」按鈕或選項
- [ ] 策展後節點數 < 80（典型全端專案）
- [ ] role undefined → 當 infrastructure 處理

### S10-3 手動微調

- [ ] 過濾面板顯示已隱藏節點列表
- [ ] 可釘選特定隱藏節點到畫面
- [ ] 可取消釘選
- [ ] 不可一鍵全開

### S10-4 3D 空間參考系

- [ ] 3D 模式顯示 XYZ 軸線 + 背景網格
- [ ] 軸線有 X/Y/Z 標示文字
- [ ] 深色主題下網格淡色半透明，不搶節點視覺
- [ ] 旋轉時軸線和網格始終可見
- [ ] 只限 3D 模式，2D 不受影響

### S10-5 效能優化

- [ ] ViewState selector 機制可用（useViewStateSelector hook）
- [ ] 對外 API 不變（useViewState 保持相容）
- [ ] 高頻元件 re-render 減少（profiling 驗證）
- [ ] graph-adapter useMemo 命中率提升

### S10-6 3D 佈局改善

- [ ] 節點分佈有空間感，不擠成一團
- [ ] 力導向參數調整後穩定收斂

### S10-7 Graph JSON 擴充

- [ ] GraphNode 新增 role optional 欄位
- [ ] Graph JSON 格式向下相容
- [ ] API /api/graph 回傳含 role
- [ ] 舊版前端讀不到 role 不影響功能

### 回歸

- [ ] 893+ tests 全部通過
- [ ] Sprint 1-9 功能不受影響
- [ ] pnpm build 全通過

---

## 9. 時程預估

| 階段 | 任務 | 預估 | 累計 |
|------|------|------|------|
| 設計 | T1 架構設計 + 規範文件 | 3h | 3h |
| Core | T2 角色分類器 + T3 資料模型 | 4.5h | 7.5h |
| Web 策展 | T4 applyCuration + T5 NeonNode + T6 FilterPanel | 6h | 13.5h |
| 3D | T8 空間參考系 + T9 佈局改善 | 4h | 17.5h |
| 效能 | T7 ViewState selector + T10 useMemo/useEffect | 5h | 22.5h |
| P1 | T11 AI 輔助 + T12 Sprint 9 收尾 | 5.5h | 28h |
| 測試 | T13 測試 + 回歸 | 4h | 32h |

> 總預估 ~32h（含 P1）。P0 核心路徑 ~22.5h。若時程緊張，T11 + T12 可延後。

---

## 10. 任務與審核紀錄（備查）

> 每個任務完成後記錄結果，每次 Review/Gate 通過後記錄決策。本區作為 Sprint 完整稽核軌跡。

### 任務完成紀錄

| 任務 | 完成日期 | 結果 | 備註 |
|------|---------|------|------|
| T1 | 2026-04-01 | ✅ 完成 | 架構文件 + feature-spec v10.0 + data-model v4.0 |
| T2 | 2026-04-01 | ✅ 完成 | role-classifier.ts 純函式 + 48 tests，5步 heuristic 全覆蓋 |
| T3 | 2026-04-01 | ✅ 完成 | NodeRole type + NodeMetadata.role + graph-builder 整合 + re-export |
| T4 | 2026-04-01 | ✅ 完成 | web types NodeRole + applyCuration 策展函式（三層過濾、安全閥、無全部顯示） |
| T5 | 2026-04-01 | ✅ 完成 | NeonNode infrastructure opacity 0.5 + GraphCanvas/Graph3DCanvas 策展整合 |
| T6 | 2026-04-01 | ✅ 完成 | ViewState pinnedNodeIds + PIN/UNPIN + FilterPanel 已隱藏節點區段（embedded+expanded） |
| T7 | 2026-04-01 | ✅ 完成 | useViewStateSelector + useViewStateDispatch + useSyncExternalStore，useViewState() 不變 |
| T8 | 2026-04-01 | ✅ 完成 | GridHelper + 自訂軸線 + Canvas sprite 軸標示，2D 不受影響 |
| T9 | 2026-04-01 | ✅ 完成 | charge -300 + link distance 120，try-catch 保護 |
| T10 | 2026-04-01 | ✅ 完成 | GraphCanvas 6 個 useMemo 合併為統一 pipeline（rawGraph→filter→viewMode→curation），消除重複轉換 |
| T11 | — | ⏸ 延後 | P1，視時間 |
| T12 | — | ⏸ 延後 | P1，視時間 |
| T13 | 2026-04-01 | ✅ 完成 | 2 test files，42 new tests，983 total（+90），零回歸 |

### Review 紀錄

| Review 步驟 | 日期 | 結果 | Review 文件連結 |
|------------|------|------|---------------|
| 設計 Review | 2026-04-01 | 通過 | Blocker:0 Major:0 Minor:0 — 架構文件 + 規範文件完整 |
| 實作 Review（第一輪） | 2026-04-01 | 不通過 | Blocker:4 Major:2 Minor:2 — GraphCanvas.tsx 陳舊變數 filteredInitialNodes；Graph3DCanvas 策展未生效（deps 不同步 + 使用未策展資料）；11 task 缺時間戳；10 task 驗收未勾選 |
| 實作 Review（第二輪） | 2026-04-01 | 通過 | Blocker:0 Major:0 Minor:2 — 修復: filteredInitialNodes→curationFilteredNodes、Graph3DCanvas 改用 curatedData、task files 補齊時間戳+驗收勾選。983 tests 零回歸 |
| 測試 Review | 2026-04-01 | 通過 | Blocker:0 Major:0 Minor:0 — 983 tests 零回歸 |

### Gate 紀錄

| Gate | 日期 | 決策 | 審核意見 |
|------|------|------|---------|
| G0 | 2026-04-01 | ✅ 通過 | 老闆確認通過，無調整 |
| G2 | 2026-04-01 | ✅ 通過 | 第一輪 Review 發現 4 Blocker + 2 Major → 修復 → 第二輪通過 Blocker:0 Major:0 Minor:2。修復項：GraphCanvas 陳舊變數、Graph3DCanvas 策展整合、task files 完整性。983 tests 零回歸 |
| G3 | 2026-04-01 | ✅ 通過 | 983 tests（+90 新增），48 test files，零回歸。策展 22 tests + ViewState/selector 20 tests + core 角色分類 48 tests |

---

**確認**: [x] L1 確認 / [x] Tech Lead 確認

**老闆決策**: ✅ 通過（2026-04-01）
