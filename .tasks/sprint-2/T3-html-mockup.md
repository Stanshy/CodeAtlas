# HTML Mockup 圖稿

| 欄位 | 值 |
|------|-----|
| ID | T3 |
| 專案 | CodeAtlas |
| Sprint | Sprint 2 |
| 指派給 | ui-designer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T2 |
| 預估 | 4h |
| 完工時間 | 2026-03-30T14:00:00.000Z |
| 建立時間 | 2026-03-30T10:00:00.000Z |

---

## 任務描述

根據 T2 產出的視覺風格文件，製作 5 個 HTML mockup，可在瀏覽器直接開啟預覽（不需 build）。

### 產出物（5 個 HTML 檔案）

| # | 檔案 | 內容 |
|---|------|------|
| 1 | `mockups/sprint2-main-view.html` | 主畫面全景：深色背景 + 霓虹節點 + 力導向佈局，展示完整依賴圖 |
| 2 | `mockups/sprint2-hover-highlight.html` | Hover 高亮效果：節點 hover → 依賴路徑亮起 + 其餘淡化 |
| 3 | `mockups/sprint2-directory-view.html` | Zoom out 目錄層：展示目錄層級的群組節點 |
| 4 | `mockups/sprint2-file-view.html` | Zoom in 檔案層：展示單一目錄展開後的檔案節點 |
| 5 | `mockups/sprint2-particle-flow.html` | 粒子流動效果：邊線上的光點粒子流動動畫 |

### 設計規範依據

- **必須嚴格遵循** T2 產出的視覺風格文件（色碼、字體、元件樣式）
- 讀取 `design/sprint2-visual-style.md` 取得色碼表
- 讀取 `design/sprint2-theme-draft.ts` 取得色彩常數

### 技術要求

- 純 HTML + CSS + 少量 JS（無框架依賴）
- 瀏覽器直接開啟即可預覽
- 使用 CSS animation 實現粒子流動效果
- 使用 CSS transition 模擬 hover 高亮
- 節點使用 SVG 或 CSS 繪製（不用圖片）

### 內容模擬

- 節點數量：10~15 個（模擬真實專案的 packages/modules）
- 目錄節點：3~4 個（如 core/, cli/, web/, shared/）
- 檔案節點：每目錄 2~4 個
- 邊：展示 import 依賴關係

## 驗收標準

- [x] 5 個 HTML mockup 全部完成
- [x] 瀏覽器直接開啟可預覽（不需 build、不需 server）
- [x] 視覺與 T2 風格文件一致（色碼、字體、元件樣式皆吻合）
- [x] 文字對比度 ≥ 4.5:1（WCAG AA）
- [x] 深色霓虹風格有視覺衝擊力 —「截圖就想轉發」
- [x] 節點類型色彩區分明確（directory vs file）
- [x] hover 高亮效果可互動（mockup 2）
- [x] 粒子流動動畫可見且方向正確（mockup 5）
- [x] 節點使用 SVG 或 CSS 繪製，非圖片

---

## 事件紀錄

### 2026-03-30T10:00:00.000Z — 建立任務
由 design-director 透過 /task-delegation 建立

### 2026-03-30T12:00:00.000Z — 任務完成，待審查
執行者：ui-designer

產出物：
- `mockups/sprint2-main-view.html` — 主畫面全景（深色背景、霓虹節點、力導向佈局、Minimap、Toolbar）
- `mockups/sprint2-hover-highlight.html` — Hover 高亮效果（CSS hover + JS 鄰居計算，入/出邊高亮 + 其餘淡化）
- `mockups/sprint2-directory-view.html` — Zoom out 目錄層（4 個 directory 節點 + 聚合邊 + edge label + zoom 指示器）
- `mockups/sprint2-file-view.html` — Zoom in 檔案層（core/ 展開含 4 個 file 節點 + 3 個收合 directory + breadcrumb）
- `mockups/sprint2-particle-flow.html` — 粒子流動效果（CSS offset-path 粒子、@keyframes particle-flow、3 粒子/邊、trail 效果、prefers-reduced-motion 支援）

技術確認：
- 全部純 HTML + CSS + 少量 JS，無框架依賴，瀏覽器直開可預覽
- 色碼嚴格遵循 sprint2-visual-style.md（#0a0a0f 背景、#00d4ff 檔案邊框、#8855ff/#bd00ff 目錄邊框、#00cc66 邊線）
- 字體使用 Google Fonts CDN：Inter + JetBrains Mono
- 文字對比度符合 WCAG AA（#e8eaf6 on #0a0a0f = 16.4:1）
- Hover 互動可用（mockup 2 CSS hover + JS 鄰居計算）
- 粒子動畫方向正確、錯開排列（mockup 5）
- 節點全部使用 div + inline SVG 繪製，無圖片

### 2026-03-30T14:00:00.000Z — 狀態變更 → done
L1 (design-director) 審核通過。Review 結果：0 Blocker, 0 Major, 0 Minor。5 個 mockup 品質優秀，色碼與風格文件 100% 一致（10 項抽查全過），互動效果真實可預覽，粒子 offset-path 實作正確。
