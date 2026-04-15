# E2EPanel 元件 + ContextMenu 新增選項

| 欄位 | 值 |
|------|-----|
| ID | T8 |
| 專案 | CodeAtlas |
| Sprint | Sprint 9 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T7 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T22:00:00.000Z |

---

## 任務描述

1. 新建 `E2EPanel.tsx`：右側面板，與 NodePanel / TracingPanel 互斥
   - 頂部：起點名稱 + 總步數 + 截斷提示
   - depth slider（1-20，預設 10）
   - 每步列表：nodeLabel + edgeType badge + symbol 名稱
   - 可點擊任一步驟 → dispatch FOCUS_NODE 聚焦到該節點
   - 「結束追蹤」按鈕 → dispatch CLEAR_E2E_TRACING
   - Framer Motion 右側滑入動畫
2. 修改 `ContextMenu.tsx`：新增「端到端追蹤」選項
   - 點擊後呼叫 useE2ETracing().startTracing(nodeId)

## 驗收標準

- [x] E2EPanel.tsx 完成（步驟列表 + depth slider）
- [x] 每步顯示 nodeLabel + edgeType + symbols
- [x] 點擊步驟可聚焦節點
- [x] depth slider 調整後重新追蹤
- [x] ContextMenu 新增「端到端追蹤」選項
- [x] tsc 編譯通過

---

## 事件紀錄

### 2026-03-31T22:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
