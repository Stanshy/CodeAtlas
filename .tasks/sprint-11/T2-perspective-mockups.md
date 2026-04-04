# 三種視角細化圖稿

| 欄位 | 值 |
|------|-----|
| ID | T2 |
| 專案 | CodeAtlas |
| Sprint | Sprint 11 |
| 指派給 | design-director |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T1 |
| 預估 | 4h |
| 建立時間 | 2026-04-01T14:00:00.000Z |

---

## 任務描述

基於已核准方向（`proposal/references/sprint11/three-perspectives-mockup.html`），細化三種視角的互動圖稿：

1. **系統框架**：dagre 分層佈局 + 目錄群組卡片（目錄名 + 子元素計數） + 層次標示 + Cyan #00d4ff 色調
2. **邏輯運作**：力導向 + BFS 多跳 hover 高亮 + 非相關淡化至 opacity 0.15 + 多色霓虹
3. **資料旅程**：stagger 350ms 逐節點亮起 + stroke-dashoffset 邊動畫 + E2E 面板同步 + 重播按鈕 + Green #00ff88

圖稿需包含：視角切換 UI（三選一按鈕 + 色標）、切換過渡動畫說明、2D/3D 適配標示。

## 驗收標準

- [ ] 三種視角各有完整互動圖稿
- [ ] 與核准方向 three-perspectives-mockup.html 一致
- [ ] stagger 350ms 節奏正確（老闆核准）
- [ ] 視角切換 UI 圖稿完整（三選一 + 色標）
- [ ] 2D/3D 適配標示（系統框架標示 2D only）

---

## 事件紀錄

### 2026-04-01T14:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
