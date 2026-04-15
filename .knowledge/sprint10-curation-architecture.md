# Sprint 10 — 智慧策展 + 效能 + 3D 空間 架構設計

> **版本**: v1.0
> **撰寫者**: Tech Lead (L1)
> **日期**: 2026-04-01
> **Sprint**: 10
> **提案書**: `proposal/sprint10-proposal.md`

---

## 1. 架構概覽

Sprint 10 跨 core + web 兩層：

```
core 層（新增）
  analyzer/role-classifier.ts  ← 純函式，節點角色分類
  graph-builder.ts             ← 呼叫 classifyNodeRole 填入 role
  types.ts                     ← +NodeRole type + NodeMetadata.role

web 層（修改）
  types/graph.ts               ← +NodeRole + role 同步
  adapters/graph-adapter.ts    ← +applyCuration() 策展函式
  hooks/useGraphData.ts        ← 策展整合呼叫點
  contexts/ViewStateContext.tsx ← +pinnedNodeIds + selector 機制
  components/NeonNode.tsx      ← infrastructure opacity 淡化
  components/FilterPanel.tsx   ← 已隱藏節點區段 + PIN/UNPIN
  components/Graph3DCanvas.tsx ← +GridHelper +AxesHelper +軸標示 +力導向調參
  components/GraphCanvas.tsx   ← useMemo 精確化
```

**資料流**：
```
core analyze → classifyNodeRole(每個 node) → role 填入 NodeMetadata
  ↓
API /api/graph → 含 role 欄位（自動，core 已填）
  ↓
web useGraphData → applyViewMode → applyCuration → filterNodes/filterEdges → styled output
```

---

## 2. 節點重要度分析（core 層）

### 2.1 角色分類型別

```typescript
// packages/core/src/types.ts
export type NodeRole = 'business-logic' | 'cross-cutting' | 'infrastructure' | 'utility' | 'noise';
```

### 2.2 Heuristic 演算法設計

**檔案**：`packages/core/src/analyzer/role-classifier.ts`

**函式簽名**：
```typescript
export function classifyNodeRole(node: GraphNode, allEdges: GraphEdge[]): NodeRole;
```

**5 步判定流程**：

```
Step 1 — 路徑模式匹配（最高優先）
  ┌─────────────────────────────────────────────────────────────────┐
  │ 匹配路徑片段（大小寫不敏感）：                                    │
  │   __tests__/, test/, tests/, spec/, specs/, __mocks__,         │
  │   fixtures/, dist/, build/, .github/, scripts/, coverage/      │
  │ → 命中任一 = noise，直接返回                                     │
  └─────────────────────────────────────────────────────────────────┘

Step 2 — 檔名模式匹配
  ┌─────────────────────────────────────────────────────────────────┐
  │ 配置檔（basename 匹配）：                                        │
  │   *.config.*, .env*, tsconfig.*, package.json, *.setup.*,      │
  │   jest.config.*, vite.config.*, webpack.config.*,              │
  │   .eslintrc.*, .prettierrc*, babel.config.*                    │
  │ → infrastructure                                               │
  │                                                                 │
  │ 型別定義檔：                                                     │
  │   *.d.ts, types.ts, types/*.ts, interfaces.ts, enums.ts,      │
  │   constants.ts, consts.ts                                      │
  │ → utility                                                      │
  │                                                                 │
  │ 測試檔（檔名匹配）：                                              │
  │   *.test.*, *.spec.*, *.e2e.*                                  │
  │ → noise                                                        │
  └─────────────────────────────────────────────────────────────────┘

Step 3 — 目錄名模式匹配
  ┌─────────────────────────────────────────────────────────────────┐
  │ 業務邏輯目錄：                                                   │
  │   routes/, controllers/, services/, models/, handlers/,        │
  │   pages/, views/, features/, modules/, api/, domains/,         │
  │   commands/, components/, screens/                              │
  │ → business-logic                                               │
  │                                                                 │
  │ 橫向切面目錄：                                                   │
  │   middleware/, middlewares/, auth/, logging/, validation/,      │
  │   validators/, guards/, interceptors/, pipes/, filters/,       │
  │   decorators/, plugins/                                        │
  │ → cross-cutting                                                │
  │                                                                 │
  │ 基礎設施目錄：                                                   │
  │   config/, configs/, database/, db/, migrations/, seeds/,      │
  │   setup/, bootstrap/, server/, infra/, infrastructure/         │
  │ → infrastructure                                               │
  │                                                                 │
  │ 輔助目錄：                                                       │
  │   utils/, helpers/, lib/, shared/, common/, tools/,            │
  │   utilities/, support/                                         │
  │ → utility                                                      │
  └─────────────────────────────────────────────────────────────────┘

Step 4 — 依賴度分析（路徑/目錄無法判斷時）
  ┌─────────────────────────────────────────────────────────────────┐
  │ 計算：                                                           │
  │   inDegree = 被其他節點 import 的次數（node.metadata.dependencyCount）│
  │   outDegree = import 其他節點的次數（node.metadata.importCount）   │
  │                                                                 │
  │ 計算全體 file 節點的 inDegree 75th percentile（p75）             │
  │                                                                 │
  │ 規則：                                                           │
  │   inDegree > p75 且 outDegree <= median → business-logic       │
  │   inDegree <= 1 且 outDegree > p75    → utility                │
  │   其餘 → infrastructure                                        │
  └─────────────────────────────────────────────────────────────────┘

  注意：p75 和 median 需在 classifyNodeRole 外計算後傳入，
  避免每次呼叫都重新計算。函式簽名實際為：

  ```typescript
  export interface DependencyStats {
    inDegreeP75: number;
    outDegreeMedian: number;
  }

  export function classifyNodeRole(
    node: GraphNode,
    depStats: DependencyStats | null,
  ): NodeRole;

  export function computeDependencyStats(
    nodes: GraphNode[],
  ): DependencyStats;
  ```

Step 5 — 預設值
  → infrastructure（保守策略：淡化但不隱藏）
```

**設計原則**：寧可多顯示不確定的（歸為 infrastructure 淡化），也不漏掉重要的。

### 2.3 整合點

`graph-builder.ts` 的 `buildGraph()` 函式末尾、`dependencyCount` 計算完成後：

```typescript
// --- Sprint 10: Classify node roles ---
import { classifyNodeRole, computeDependencyStats } from './role-classifier.js';

const depStats = computeDependencyStats(fileNodes);
for (const node of nodes) {
  if (node.type === 'file' || node.type === 'directory') {
    node.metadata.role = classifyNodeRole(node, depStats);
  }
  // function/class nodes 繼承 parent file 的 role（或不分類）
}
```

---

## 3. 智慧策展（web 層）

### 3.1 三層過濾架構

```
原始資料 (rawNodes/rawEdges)
  │
  ▼
① applyViewMode(nodes, edges, activeViewMode)      ← Sprint 9 既有
  │  按視圖模式過濾（全景/依賴/資料流/呼叫鏈）
  ▼
② applyCuration(nodes, edges, pinnedNodeIds)        ← Sprint 10 新增
  │  按角色過濾（隱藏 utility + noise，淡化 infrastructure）
  ▼
③ filterNodes(nodes, filter) + filterEdges(edges, nodeIds, filter)  ← Sprint 8 既有
  │  按使用者手動過濾（目錄、節點類型、邊類型）
  ▼
styled output (React Flow nodes/edges)
```

### 3.2 applyCuration 實作

**位置**：`packages/web/src/adapters/graph-adapter.ts`

```typescript
export function applyCuration(
  nodes: GraphNode[],
  edges: GraphEdge[],
  pinnedNodeIds: Set<string>,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  // 策展規則
  const visibleNodes = nodes.filter(node => {
    const role = node.metadata.role ?? 'infrastructure'; // undefined → infrastructure

    // business-logic + cross-cutting → 顯示
    if (role === 'business-logic' || role === 'cross-cutting') return true;

    // infrastructure → 顯示（opacity 由 NeonNode 處理）
    if (role === 'infrastructure') return true;

    // utility + noise → 隱藏（除非被釘選）
    if (pinnedNodeIds.has(node.id)) return true;

    return false;
  });

  // 安全閥：策展後 < 5 節點 → 放寬，顯示全部非 noise
  if (visibleNodes.length < 5) {
    const relaxedNodes = nodes.filter(node => {
      const role = node.metadata.role ?? 'infrastructure';
      return role !== 'noise' || pinnedNodeIds.has(node.id);
    });
    const relaxedIds = new Set(relaxedNodes.map(n => n.id));
    const relaxedEdges = edges.filter(e => relaxedIds.has(e.source) && relaxedIds.has(e.target));
    return { nodes: relaxedNodes, edges: relaxedEdges };
  }

  // 邊過濾：source + target 都在顯示集合
  const visibleIds = new Set(visibleNodes.map(n => n.id));
  const visibleEdges = edges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target));

  return { nodes: visibleNodes, edges: visibleEdges };
}
```

**無「全部顯示」**：產品方向決策，不實作全部顯示按鈕。

### 3.3 整合呼叫點

`useGraphData.ts` 或 `GraphCanvas.tsx` 中消費 rawNodes/rawEdges 時的 useMemo：

```
// In GraphCanvas / useGraphData
const curatedData = useMemo(() => {
  const modeFiltered = applyViewMode(rawNodes, rawEdges, activeViewMode);
  const curated = applyCuration(modeFiltered.nodes, modeFiltered.edges, new Set(pinnedNodeIds));
  return curated;
}, [rawNodes, rawEdges, activeViewMode, pinnedNodeIds]);
```

### 3.4 NeonNode 淡化

infrastructure 角色節點的 NeonNode 渲染 opacity 降低：

```typescript
// NeonNode.tsx
const role = data.metadata.role;
const isInfrastructure = role === 'infrastructure' || (!role && data.nodeType === 'file');
// opacity: isInfrastructure ? 0.5 : 1.0
```

---

## 4. 手動微調（PIN/UNPIN）

### 4.1 ViewState 擴充

```typescript
// ViewStateContext.tsx
interface ViewState {
  // ...existing...
  pinnedNodeIds: string[];  // Sprint 10: 手動釘選的被隱藏節點
}

type ViewAction =
  // ...existing...
  | { type: 'PIN_NODE'; nodeId: string }
  | { type: 'UNPIN_NODE'; nodeId: string };
```

### 4.2 FilterPanel 升級

新增「已隱藏節點」區段：
- 列出所有被 applyCuration 隱藏的 utility + noise 節點
- 每個節點旁有「釘選」圖標按鈕
- 已釘選的節點有「取消釘選」按鈕
- **不提供一鍵全開按鈕**

---

## 5. ViewState 效能優化

### 5.1 問題分析

當前 ViewStateContext 含 20+ 個 state 欄位，使用 useReducer + Context。任何 dispatch 都建立新的 state object，觸發所有 `useViewState()` consumer re-render。

### 5.2 Selector 機制

新增 `useViewStateSelector` hook：

```typescript
export function useViewStateSelector<T>(
  selector: (state: ViewState) => T,
): T;
```

**實作方式**：

```typescript
// 在 ViewStateProvider 中額外建立 store reference
const stateRef = useRef(state);
stateRef.current = state;

// listeners Set
const listenersRef = useRef(new Set<() => void>());

// subscribe function
const subscribe = useCallback((listener: () => void) => {
  listenersRef.current.add(listener);
  return () => listenersRef.current.delete(listener);
}, []);

// getSnapshot
const getSnapshot = useCallback(() => stateRef.current, []);

// 每次 state 變化通知 listeners
useEffect(() => {
  listenersRef.current.forEach(l => l());
}, [state]);
```

Consumer 端：

```typescript
export function useViewStateSelector<T>(selector: (state: ViewState) => T): T {
  const { subscribe, getSnapshot } = useContext(ViewStoreSyncContext);
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
  );
}
```

shallow compare 由 `useSyncExternalStore` 的 snapshot 比較自動處理 — 只要 selector 回傳值 reference 不變就不 re-render。

### 5.3 漸進式遷移

1. 先在高頻元件使用：GraphCanvas, NeonNode, NeonEdge, Graph3DCanvas
2. 既有 `useViewState()` 保持不變，返回完整 state + dispatch
3. 893 tests 作為保護網

---

## 6. 3D 空間參考系

### 6.1 元件設計

在 `Graph3DCanvas.tsx` 中，3d-force-graph 初始化後注入 Three.js 物件：

```typescript
// Access the Three.js scene via graph.scene()
const scene = graph.scene();

// GridHelper — 地板網格
const gridHelper = new THREE.GridHelper(1000, 50, 0x00D4FF, 0x00D4FF);
gridHelper.position.y = -200;
gridHelper.material.opacity = 0.06;
gridHelper.material.transparent = true;
scene.add(gridHelper);

// AxesHelper — 自訂顏色軸線
const axesLength = 500;
// 使用 LineBasicMaterial 自訂各軸顏色和透明度
// X axis: red (255,80,80,0.4)
// Y axis: green (80,255,80,0.4)
// Z axis: blue (80,80,255,0.4)

// 軸標示文字 — Canvas texture sprite
function createAxisLabel(text: string, position: THREE.Vector3, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.font = '24px monospace';
  ctx.fillText(text, 8, 24);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.6 });
  const sprite = new THREE.Sprite(material);
  sprite.position.copy(position);
  sprite.scale.set(30, 15, 1);
  return sprite;
}

scene.add(createAxisLabel('X', new THREE.Vector3(axesLength + 20, 0, 0), 'rgba(255,80,80,0.8)'));
scene.add(createAxisLabel('Y', new THREE.Vector3(0, axesLength + 20, 0), 'rgba(80,255,80,0.8)'));
scene.add(createAxisLabel('Z', new THREE.Vector3(0, 0, axesLength + 20), 'rgba(80,80,255,0.8)'));
```

### 6.2 只限 3D 模式

這些 Three.js 物件直接加到 3d-force-graph 的 scene，只有 3D 模式下才存在。2D 模式（React Flow）完全不受影響。

### 6.3 力導向參數調整

```typescript
// 節點減少後（30~50 個），增加斥力和連結距離
graph.d3Force('charge')?.strength(-300);
graph.d3Force('link')?.distance(120);

// 添加碰撞力避免重疊
import { forceCollide } from 'd3-force-3d';
graph.d3Force('collision', forceCollide().radius(30));
```

---

## 7. Graph JSON 擴充

### 7.1 資料模型變更

| 欄位 | 型別 | 位置 | 向下相容 |
|------|------|------|---------|
| `NodeRole` | `'business-logic' \| 'cross-cutting' \| 'infrastructure' \| 'utility' \| 'noise'` | types.ts | 新增 type |
| `NodeMetadata.role` | `NodeRole \| undefined` | types.ts | optional，不破壞 |

### 7.2 API 回傳

`GET /api/graph` 回傳的 `AnalysisResult.graph.nodes[].metadata.role` 自動含值（因 core buildGraph 已填入）。無需修改 `cli/server.ts`。

---

## 8. 錯誤處理與邊界條件

| 場景 | 處理 |
|------|------|
| role 為 undefined（舊版 Graph JSON） | 當 infrastructure（淡化但不隱藏） |
| 策展後節點 < 5 | 自動放寬：顯示全部非 noise |
| heuristic Step 5 fallback | 歸為 infrastructure |
| pinnedNodeIds 中節點不存在 | 靜默忽略 |
| 3D GridHelper 效能問題 | Three.js 輕量物件，幾乎零影響 |
| ViewState selector 回傳值比較 | useSyncExternalStore 自動 shallow compare |
| profiling 未發現瓶頸 | 仍做 selector 作為架構改善 |
| directory 節點角色 | directory 不分類 role（不參與策展） |
| function/class 子節點 | 不參與策展（由 zoom-into-file 控制顯示） |

---

## 9. 設計決策記錄

| 決策 | 選擇 | 理由 |
|------|------|------|
| 角色分類位置 | core 層純函式 | 單一職責，可獨立測試，web 不需要重新分類 |
| 策展位置 | web graph-adapter | 策展是渲染層決策，core 只負責分類不負責顯示控制 |
| 無「全部顯示」 | 產品方向 | 老闆決策：預設只顯示核心節點，強制策展 |
| role optional | 向下相容 | 不破壞任何現有消費端，undefined 等同 infrastructure |
| selector vs context split | selector | 對外 API 不變，風險更低，893 tests 保護 |
| 3D 網格樣式 | 淡 cyan 半透明 | 配合深色霓虹主題，不搶節點視覺 |
| 力導向參數 | charge -300, distance 120 | 節點數降至 30~50，需要更大間距 |
