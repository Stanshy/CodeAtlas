# Settings onChange 連動

| 欄位 | 值 |
|------|-----|
| ID | T10 |
| 專案 | CodeAtlas |
| Sprint | Sprint 16 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T2,T6,G1 |
| 預估 | 2h |
| 建立時間 | 2026-04-07T18:00:00.000Z |
| 開始時間 | 2026-04-07T20:40:00.000Z |
| 完工時間 | 2026-04-07T21:20:00.000Z |

---

## 任務描述

修改 `packages/web/src/components/SettingsPopover.tsx`：
- Provider 選擇器 onChange → postAIConfigure() → toast 回饋
- persisted=true → toast「設定已儲存」
- persisted=false → toast「設定已套用（本次有效），無法寫入設定檔」
- Provider 推薦標記（Claude CLI 可用→推薦 Claude，否則→推薦 Gemini）

## 驗收標準

- [x] 選 Provider → 後端切換成功 → 不刷新頁面即生效
- [x] .codeatlas.json 正確更新
- [x] persisted=true/false 對應正確 toast 文案
- [x] Provider 推薦標記正確顯示
- [x] pnpm build 通過

---

## 事件紀錄

### 2026-04-07T18:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-07T20:40:00.000Z — 開始執行
frontend-developer 開始執行（與 T9 合併）

### 2026-04-07T21:20:00.000Z — 完成交付
Provider select onChange + postAIConfigure + Toast 三色 + 推薦 badge

### 2026-04-07T21:25:00.000Z — L1 Review 通過
0 Blocker / 0 Major / 0 Minor — Toast 文案照圖稿
