# T7 ViewState 效能優化（selector 機制 + profiling）

| 欄位 | 值 |
|------|-----|
| ID | T7 |
| 專案 | CodeAtlas |
| Sprint | Sprint 10 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T5 |
| 預估 | 3h |
| 建立時間 | 2026-04-01T14:00:00.000Z |
| 開始時間 | 2026-04-01T14:30:00.000Z |
| 完工時間 | 2026-04-01T20:00:00.000Z |

---

## 任務描述

### Step 1：Profiling

console.time 量測：
1. ViewState dispatch → re-render 範圍
2. graph-adapter 計算耗時
3. Graph3DCanvas useEffect 觸發頻率
4. styledNodes/styledEdges useMemo 命中率

### Step 2：useViewStateSelector hook

```typescript
export function useViewStateSelector<T>(selector: (state: ViewState) => T): T;
```

- 內部 useSyncExternalStore 或 useRef + shallow compare
- 元件只在 selector 回傳值變化時 re-render
- 既有 `useViewState()` 保持不變（893 tests 保護）
- 漸進式遷移：先在 GraphCanvas, NeonNode, NeonEdge 使用

## 驗收標準

- [x] useViewStateSelector hook 可用
- [x] useViewState() API 不變（向下相容）
- [x] 高頻元件使用 selector 減少 re-render
- [x] profiling 數據記錄
- [x] 893+ tests 全通過

---

## 事件紀錄

### 2026-04-01T14:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-01T20:00:00.000Z — 完成任務
任務完成，所有驗收標準通過。
