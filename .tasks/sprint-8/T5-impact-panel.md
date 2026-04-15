# ImpactPanel 元件：影響結果分層展示 + depth slider + 節點導航

| 欄位 | 值 |
|------|-----|
| ID | T5 |
| 專案 | CodeAtlas |
| Sprint | Sprint 8 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T3,T4 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T16:00:00.000Z |
| 開始時間 | 2026-03-31T17:05:00.000Z |
| 結束時間 | 2026-03-31T17:25:00.000Z |

---

## 任務描述

1. 新增 `packages/web/src/components/ImpactPanel.tsx`
2. 面板內容：
   - 頂部：方向標題（「正向影響分析」/「反向依賴分析」）+ 目標節點名
   - 統計行：「影響 N 個節點」+ 截斷提示（> 50 時顯示）
   - Depth slider：1-10，預設 5，即時重新計算
   - 分層列表：按 BFS 深度分組（第1層、第2層...），每層內按 label 排序
   - 每個節點可點擊 → 導航聚焦（dispatch SELECT_NODE + FIT_VIEW）
   - 關閉按鈕 → dispatch CLEAR_IMPACT
3. 在 NodePanel 中整合：
   - 影響分析啟動時（impactAnalysis.active === true）→ 替換面板內容為 ImpactPanel
   - 關閉 ImpactPanel → 回到原始 NodePanel

## 驗收標準

- [x] 方向標題 + 目標節點名正確顯示
- [x] 統計行顯示影響節點數
- [x] 截斷 > 50 時顯示提示
- [x] Depth slider 1-10 可調整，即時重算
- [x] 分層列表按 BFS 深度分組
- [x] 節點可點擊導航
- [x] 關閉按鈕清除影響分析
- [x] NodePanel 整合正確（T11 整合時處理）
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T16:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T17:00:00.000Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-31T17:30:00.000Z — 元件完成
建立 packages/web/src/components/ImpactPanel.tsx
- ImpactPanelProps 介面完整對應設計規格
- NodeItem 子元件處理 hover 狀態
- useMemo 分層分組邏輯（BFS depth 分組 + label 排序）

### 2026-03-31T17:25:00.000Z — done
ImpactPanel 完成。方向標題/統計/截斷提示/depth slider/分層列表/節點點擊/空狀態。tsc clean。
