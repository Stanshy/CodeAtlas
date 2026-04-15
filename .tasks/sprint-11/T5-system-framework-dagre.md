# 系統框架視角（dagre 分層佈局）

| 欄位 | 值 |
|------|-----|
| ID | T5 |
| 專案 | CodeAtlas |
| Sprint | Sprint 11 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T4 |
| 預估 | 4h |
| 建立時間 | 2026-04-01T14:00:00.000Z |

---

## 任務描述

實作系統框架視角的完整功能：

1. **dagre-layout.ts provider**：
   - dagre.layout TB 方向（Top-to-Bottom）
   - 參數：rankdir=TB, nodesep=60, ranksep=100, marginx=40, marginy=40
   - 節點寬 180px 高 50px
   - dagre 失敗 → 回退力導向 + console.warn

2. **Cyan #00d4ff 色調**：
   - NeonNode 色調切換：系統框架時 Cyan 單色調
   - theme.ts 新增 Cyan 單色調色彩定義

3. **目錄群組卡片**：
   - directory 節點渲染為群組卡片
   - 背景 `rgba(0, 212, 255, 0.05)` + 虛線邊框 + 圓角
   - 顯示目錄名 + 子元素計數（如 `services/ (8)`）

4. **2D 專用限制**：
   - 3D 模式下選系統框架 → 自動提示 + 切換至 2D
   - 從系統框架切至 3D → 自動切回邏輯運作

## 驗收標準

- [ ] dagre 分層佈局正確渲染（TB 方向）
- [ ] Cyan #00d4ff 色調
- [ ] 目錄群組卡片顯示目錄名 + 子元素計數
- [ ] 節點按層次分佈
- [ ] 2D 專用：3D 切換時回退為邏輯運作
- [ ] dagre 失敗時回退力導向

---

## 事件紀錄

### 2026-04-01T14:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
