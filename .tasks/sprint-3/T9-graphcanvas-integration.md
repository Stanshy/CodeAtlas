# GraphCanvas 整合

| 欄位 | 值 |
|------|-----|
| ID | T9 |
| 專案 | CodeAtlas |
| Sprint | Sprint 3 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 完工時間 | 2026-03-31T13:00:00.000Z |
| 依賴 | T4,T7 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T10:00:00.000Z |

---

## 任務描述

修改 GraphCanvas.tsx + App.tsx，整合 NodePanel + SearchBar。

### 具體工作

1. `packages/web/src/components/GraphCanvas.tsx`：
   - 新增 `onNodeClick` prop → 傳遞給 ReactFlow
   - `onNodeClick` 回調觸發面板開啟，傳遞 nodeId

2. `packages/web/src/App.tsx`：
   - 管理全局狀態：`selectedNodeId`, `isPanelOpen`, `isSearchOpen`
   - 整合 `<NodePanel>` — 傳入 selectedNodeId
   - 整合 `<SearchBar>` — 傳入 nodes + 聚焦回調
   - 確保三大功能協同：點擊節點開面板、搜尋聚焦、hover 高亮互不衝突

3. 狀態衝突處理：
   - 搜尋聚焦後 → 自動開啟面板
   - 面板開啟時 hover 高亮仍運作
   - 面板外點擊 → 關閉面板

### 共用檔案風險

- App.tsx 是高衝突檔案，T9 統一整合 T4/T7 的元件
- GraphCanvas.tsx 只加 onNodeClick，最小改動

## 驗收標準

- [x] 節點 onClick → 面板滑出顯示詳情
- [x] SearchBar 選擇 → 聚焦 + 面板開啟
- [x] 三大功能（面板 + 搜尋 + hover 高亮）同時運作無衝突
- [x] 面板/搜尋狀態管理正確

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-31T12:32:00.000Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-31T12:55:00.000Z — 狀態變更 → in_review
完成。GraphCanvas 新增 onNodeClick prop，App.tsx 重寫整合 NodePanel + SearchBar + CodePreview + AiSummary。AppInner 使用 useReactFlow context，focusNode setCenter 聚焦。三大功能狀態互不衝突。

### 2026-03-31T13:00:00.000Z — 狀態變更 → done
L1 審核通過。pnpm build 通過，App.tsx 整合乾淨。
