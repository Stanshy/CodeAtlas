# 控制面板分析操作

| 欄位 | 值 |
|------|-----|
| ID | T9 |
| 專案 | CodeAtlas |
| Sprint | Sprint 16 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T1,T6,G1 |
| 預估 | 2h |
| 建立時間 | 2026-04-07T18:00:00.000Z |
| 開始時間 | 2026-04-07T20:40:00.000Z |
| 完工時間 | 2026-04-07T21:20:00.000Z |

---

## 任務描述

修改 `packages/web/src/components/SettingsPopover.tsx` 分析工具區域新增：
- 「分析全部」按鈕 → POST /api/ai/analyze { scope: 'all' }
- 「分析核心目錄」按鈕 → POST /api/ai/analyze { scope: 'core' }
- 進度顯示：「已分析 N/M 目錄」— M 從前端 directoryGraph.nodes.length 取

## 驗收標準

- [x] 兩個按鈕觸發正確 scope
- [x] 進度顯示正確（N/M 格式）
- [x] 分析中按鈕 disabled
- [x] 分析完成後進度更新
- [x] pnpm build 通過

---

## 事件紀錄

### 2026-04-07T18:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-07T20:40:00.000Z — 開始執行
frontend-developer 開始執行（與 T10 合併）

### 2026-04-07T21:20:00.000Z — 完成交付
分析全部 + 分析核心目錄按鈕 + 進度條 + polling

### 2026-04-07T21:25:00.000Z — L1 Review 通過
0 Blocker / 0 Major / 0 Minor
