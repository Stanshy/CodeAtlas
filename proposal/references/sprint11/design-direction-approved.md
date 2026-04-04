# Sprint 11 視覺方向決策報告

> **發文者**: design-director (L1)
> **收文者**: PM
> **日期**: 2026-03-31
> **狀態**: 老闆已核准，請納入 Sprint 11 規劃

---

## 一、決策摘要

老闆已審閱互動式圖稿並核准 Sprint 11「三種故事視角」的視覺方向：

**「三視角、三佈局、三色調」**

| 故事視角 | 佈局引擎 | 主色調 | 視覺風格 |
|---------|---------|--------|---------|
| **系統框架** (System Framework) | dagre 分層佈局 (Hierarchical) | Cyan `#00d4ff` | 靜態、層次分明、目錄群組卡片 |
| **邏輯運作** (Logic Operation) | 力導向佈局 (Force-Directed) | 多色霓虹（現有配色） | 粒子流動、BFS hover 高亮、非相關淡化 |
| **資料旅程** (Data Journey) | 力導向 + 路徑鎖定 (Path Tracing) | Green `#00ff88` | Stagger animation (350ms)、Bloom 發光、E2E 面板同步 |

---

## 二、核准圖稿

**檔案位置**: `proposal/references/sprint11/three-perspectives-mockup.html`

請在瀏覽器開啟查看三個分頁的互動效果：
- Tab 1：系統框架 — dagre 分層 + 目錄卡片 + 子元素計數
- Tab 2：邏輯運作 — 力導向 + CSS offset-path 粒子 + BFS 多跳 hover 高亮
- Tab 3：資料旅程 — stagger 逐節點亮起 (350ms) + stroke-dashoffset 邊動畫 + E2E 面板 + 重播按鈕

老闆原話：「這個效果非常好，我要改成這個」

---

## 三、技術可行性評估

### 新增工作量：約 3-4 天

| 項目 | 工作量 | 說明 |
|------|--------|------|
| dagre 分層佈局 | 0.5 天 | React Flow 原生支援 dagre，不需新增依賴 |
| 視角切換框架 | 1 天 | ViewMode 狀態管理 + 佈局引擎切換邏輯 |
| hover 高亮 + 淡化 | 0.5 天 | BFS 遍歷 + opacity transition |
| stagger animation | 0.5 天 | Framer Motion `staggerChildren`，每步 350ms |
| 路徑鎖定 + E2E 面板 | 0.5 天 | 基於 Sprint 9 端到端追蹤，加入動畫 |
| 3D Bloom 後處理 | 0.5 天 | Three.js UnrealBloomPass（可選，視覺加分） |

### 無需新增的依賴

- `dagre` — React Flow 已內建支援
- `framer-motion` — 專案已安裝
- `three` — 專案已安裝（3D 模式）

### 基於現有基礎

- Sprint 9 控制面板已有 ViewMode 切換 UI（四種視圖 radio group）
- Sprint 9 端到端追蹤已有路徑選取邏輯
- Sprint 2 深色霓虹色彩系統已定義所有色碼

---

## 四、對 Sprint 11 提案的建議

1. **將「三種故事視角」作為 Sprint 11 核心交付項目**
2. **優先順序建議**: 系統框架（最明確）→ 邏輯運作（強化現有）→ 資料旅程（最炫但依賴前兩者）
3. **驗收標準建議**:
   - 使用者可在 Toolbar 切換三種視角
   - 切換時佈局引擎、色調、互動行為同步變化
   - 系統框架視角能清楚顯示模組層次
   - 邏輯運作視角 hover 時高亮依賴路徑
   - 資料旅程視角有 stagger animation 逐步展示

---

## 五、參考資料

| 文件 | 說明 |
|------|------|
| `proposal/references/sprint11/three-perspectives-mockup.html` | 老闆核准的互動式圖稿 |
| `proposal/references/sprint11/visual-gallery.html` | 業界視覺參考圖集 |
| `proposal/references/sprint11/README.md` | 參考圖集索引 + 設計總監建議 |
| `.knowledge/research-industry-visualization.md` | trend-researcher 業界調研報告 |

---

*設計總監已完成視覺方向定案，請 PM 納入 Sprint 11 規劃。*
