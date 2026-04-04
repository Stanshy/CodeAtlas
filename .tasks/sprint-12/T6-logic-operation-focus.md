# 邏輯運作 = 聚焦模式

| 欄位 | 值 |
|------|-----|
| ID | T6 |
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

邏輯運作核心重做：hover 高亮 → click 聚焦。嚴格對照圖稿 Tab 2。

### 預設狀態（無選中）
- 所有節點 dimmed：opacity 0.08
- 所有邊：opacity 0（完全不可見）
- 中央提示（PerspectiveHint.tsx 新增）：虛線圓圈 + 「點擊任一節點查看呼叫鏈」+ ★ 推薦入口
- pointer-events: none

### useBfsClickFocus.ts 新增
- 觸發：onClick（非 onMouseEnter）
- BFS maxDepth 5
- 保持選中直到重置
- 重置：點擊空白處 / 點擊「清除選取」

### Click 聚焦行為
1. click 節點 → BFS 找呼叫鏈
2. 鏈上節點 active（fill: category-bg, stroke-width: 2.5）
3. 非鏈節點 dimmed（opacity: 0.08）
4. 鏈上邊 visible（opacity: 1）
5. 其他邊保持 opacity: 0
6. 中央提示消失
7. 底部面板出現（ChainInfoPanel.tsx 新增）

### ChainInfoPanel.tsx
`[鏈名稱 bold] [8 個節點 muted] [清除選取 button]`
bottom: 24px, left: 50%, transform: translateX(-50%)

### 節點分類色彩
| 分類 | border | active bg |
|------|--------|-----------|
| routes | #1565c0 | #e3f2fd |
| services | #7b1fa2 | #f3e5f5 |
| controllers | #e65100 | #fff3e0 |
| models | #4e342e | #efebe9 |
| utils | #546e7a | #eceff1 |
| middleware | #00838f | #e0f7fa |

### ★ 推薦入口
business-logic 且為 route/API 入口：黃色 #f59e0b 10px ★

### 底部 Legend Bar
六色分類 + 「點擊節點展開呼叫鏈 · 點擊空白重置」

## 驗收標準

- [x] 預設全 dimmed (0.08) + 中央提示
- [x] click 展開呼叫鏈，非相關 0.08 近乎消失
- [x] 底部 ChainInfoPanel 正確顯示
- [x] ★ 推薦入口標示可見
- [x] 重置正常（空白 click + 清除按鈕）
- [x] 六色分類正確
- [x] 與圖稿 Tab 2 一致

---

## 事件紀錄

### 2026-04-01T19:10:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
