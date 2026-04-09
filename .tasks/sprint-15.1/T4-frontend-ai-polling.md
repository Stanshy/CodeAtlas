# 前端 AI 狀態感知

| 欄位 | 值 |
|------|-----|
| ID | T4 |
| 專案 | CodeAtlas |
| Sprint | Sprint 15.1 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 完工時間 | 2026-04-05T07:25:44.995Z |
| 開始時間 | 2026-04-05T07:24:19.271Z |
| 依賴 | T3 |
| 預估 | 1.5h |
| 建立時間 | 2026-04-05T07:15:28.003Z |

---

## 任務描述

1. 在 App 或 GraphContainer 層級 polling `/api/ai/status`，AI ready 後自動 re-fetch `/api/graph`
2. AI 分析中時三視角顯示 loading 狀態
3. AI disabled 時不 poll

**修改檔案**: `packages/web/src/` 相關元件

## 驗收標準

- [x] 啟動後看到 AI loading → 完成後自動刷新顯示 AI 內容
- [x] AI disabled 時不 poll、不顯示 loading
- [x] polling 間隔 3s，AI done 後停止
- [x] pnpm build 通過

---

## 事件紀錄

### 2026-04-05T07:15:28.003Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-05T07:24:19.271Z — 狀態變更 → in_progress
開始：App.tsx 加入 AI status polling + auto-refresh + progress indicator

### 2026-04-05T07:25:44.995Z — 狀態變更 → done
完成：polling 3s 間隔 + AI done 後 refetch + 底部進度條 + pnpm build 通過
