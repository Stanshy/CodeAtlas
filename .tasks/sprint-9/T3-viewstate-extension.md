# ViewState 擴充 + 型別定義（第 5 次）

| 欄位 | 值 |
|------|-----|
| ID | T3 |
| 專案 | CodeAtlas |
| Sprint | Sprint 9 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T1 |
| 預估 | 1.5h |
| 建立時間 | 2026-03-31T22:00:00.000Z |

---

## 任務描述

### 1. types/graph.ts 新增型別

```typescript
// 視圖模式
export type ViewModeName = 'panorama' | 'dependency' | 'dataflow' | 'callchain';

// 顯示偏好
export interface DisplayPrefs {
  showEdgeLabels: boolean;
  showParticles: boolean;
  labelDensity: 'all' | 'smart' | 'none';
  impactDefaultDepth: number;
}

// 端到端追蹤步驟
export interface E2EStep {
  nodeId: string;
  nodeLabel: string;
  edgeId: string | null;
  edgeType: string | null;
  symbols: string[];
  depth: number;
}

// 端到端追蹤結果
export interface E2ETracingResult {
  path: string[];
  edges: string[];
  steps: E2EStep[];
  truncated: boolean;
}

// 端到端追蹤狀態
export interface E2ETracingState {
  active: boolean;
  startNodeId: string | null;
  path: string[];
  edges: string[];
  steps: E2EStep[];
  maxDepth: number;
  truncated: boolean;
}
```

### 2. ViewStateContext.tsx 擴充

新增 state:
- `activeViewMode: ViewModeName` — 預設 'panorama'
- `isControlPanelOpen: boolean` — 預設 true
- `displayPrefs: DisplayPrefs` — 預設 { showEdgeLabels: false, showParticles: true, labelDensity: 'smart', impactDefaultDepth: 5 }
- `e2eTracing: E2ETracingState | null` — 預設 null

新增 7 個 actions:
- `SET_VIEW_MODE` — 切換視圖 + 清除衝突狀態
- `TOGGLE_CONTROL_PANEL` — 控制面板展開/收合
- `SET_DISPLAY_PREFS` — 更新顯示偏好
- `START_E2E_TRACING` — 啟動端到端追蹤
- `UPDATE_E2E_DEPTH` — 調整追蹤深度
- `CLEAR_E2E_TRACING` — 清除追蹤
- `SET_E2E_SELECTING` — 進入節點選取模式

注意 SET_VIEW_MODE reducer 邏輯：
- 清除 impactAnalysis（CLEAR_IMPACT 等效）
- 清除 searchFocus（EXIT_SEARCH_FOCUS 等效）
- 清除 e2eTracing
- 重置 filter（RESET_FILTER 等效）

## 驗收標準

- [x] types/graph.ts 新增 ViewModeName, DisplayPrefs, E2EStep, E2ETracingResult, E2ETracingState
- [x] ViewState 新增 activeViewMode, isControlPanelOpen, displayPrefs, e2eTracing
- [x] 7 個新 action 全部定義
- [x] SET_VIEW_MODE reducer 正確清除衝突狀態
- [x] initialState 預設值正確
- [x] tsc 編譯通過

---

## 事件紀錄

### 2026-03-31T22:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T23:00:00.000Z — done
types/graph.ts 新增 5 型別（ViewModeName, DisplayPrefs, E2EStep, E2ETracingResult, E2ETracingState）。ViewStateContext.tsx 新增 5 state 欄位 + 7 actions + 7 reducer cases。SET_VIEW_MODE 清除衝突狀態、START_E2E_TRACING 清除其他分析模式。tsc --noEmit 零錯誤。
