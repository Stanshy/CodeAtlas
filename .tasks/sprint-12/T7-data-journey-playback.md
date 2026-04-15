# 資料旅程 = 播放模式

| 欄位 | 值 |
|------|-----|
| ID | T7 |
| 專案 | CodeAtlas |
| Sprint | Sprint 12 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T4 |
| 預估 | 4h |
| 建立時間 | 2026-04-01T19:10:00.000Z |
| 開始時間 | 2026-04-01T20:10:00.000Z |
| 完工時間 | 2026-04-01T20:50:00.000Z |

---

## 任務描述

資料旅程核心重做：逐步亮起 → 逐步出現。嚴格對照圖稿 Tab 3。

### 初始狀態（無選中旅程）
- Entry 節點顯示（綠色框 + 脈衝動畫）
- 中央提示（PerspectiveHint.tsx 共用）：虛線框 + 「選擇資料入口開始追蹤」
- 其他節點不存在（不是 dimmed，是不渲染）

### Entry 節點樣式
- fill: #e8f5e9, stroke: #2e7d32, stroke-width: 2
- 脈衝：stroke: #43a047, stroke-width: 1.5, opacity: 0.4
- 文字：JetBrains Mono 12px bold, color: #1b5e20
- 副標：「點擊開始追蹤」10px, color: #388e3c

### JourneyPanel.tsx 新增（右側 280px）
見計畫書 §2.5：步驟列表 + active/done/inactive 三態 + 重播按鈕

### Click Entry → 播放動畫
1. 隱藏中央提示
2. 所有節點初始 opacity: 0
3. 所有邊初始 stroke-dashoffset: 200
4. 每 350ms 亮起一個節點（opacity 0→1, transition 0.25s）
5. 同時畫出前邊（stroke-dashoffset 200→0, transition 0.45s）
6. current 節點：fill:#e8f5e9, stroke:#2e7d32, stroke-width:3, drop-shadow
7. lit 節點：fill:#e8f5e9, stroke-width:2.5, 較弱 shadow
8. 面板同步：active/done/inactive
9. >30 步加速至 100ms
10. 播放完成 → 顯示「重播此旅程」按鈕

### useStaggerAnimation 修改
改為「出現」邏輯（revealedSteps → opacity 0→1，非高亮）

## 驗收標準

- [x] 初始顯示 entry 選擇 + 中央提示
- [x] click 開始播放，節點逐步出現（不是高亮）
- [x] 邊 stroke-dashoffset 動畫正確
- [x] JourneyPanel 同步正確（active/done/inactive 三態）
- [x] 重播可用
- [x] >30 步加速至 100ms
- [x] 與圖稿 Tab 3 一致

---

## 事件紀錄

### 2026-04-01T19:10:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
