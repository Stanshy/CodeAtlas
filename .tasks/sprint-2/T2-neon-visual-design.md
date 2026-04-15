# 深色霓虹視覺設計

| 欄位 | 值 |
|------|-----|
| ID | T2 |
| 專案 | CodeAtlas |
| Sprint | Sprint 2 |
| 指派給 | brand-guardian |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 3h |
| 完工時間 | 2026-03-30T13:00:00.000Z |
| 建立時間 | 2026-03-30T10:00:00.000Z |

---

## 任務描述

定義 CodeAtlas 的深色霓虹視覺設計語言，產出完整的視覺風格文件與 `theme.ts` 設計稿。

### 產出物

1. **視覺風格文件** (`design/sprint2-visual-style.md`)
   - 設計理念與情緒板描述
   - 色彩系統（背景色、主色、輔色、霓虹色碼、glow 參數）
   - 節點視覺規格（directory 節點 vs file 節點的色彩、形狀、圓角、邊線粗細、陰影/glow）
   - 邊視覺規格（顏色、粗細、流動動畫粒子色碼）
   - 字體規範（字型、字重、大小層級）
   - 元件樣式規範（hover 狀態、active 狀態、disabled 狀態）

2. **theme.ts 設計稿** (`design/sprint2-theme-draft.ts`)
   - 可直接引用的色彩常數
   - 節點樣式常數
   - 邊樣式常數
   - glow 效果參數
   - 動畫參數

### 設計約束

- 背景色：深色（#0a0a0f ~ #1a1a2e 範圍）
- 霓虹色：需要至少 4 個霓虹色（主色、輔色、強調色、警告色）
- 文字對比度 ≥ 4.5:1（WCAG AA 標準）
- 節點類型需有明確色彩區分（directory = 一個色系，file = 另一個色系）
- glow 效果不能過度（防止視覺疲勞）
- 整體風格目標：「截圖就想轉發」的視覺衝擊力

### 參考技術棧

- React Flow v12（自訂節點/邊）
- Framer Motion（動畫過渡）
- CSS Animation（粒子流動）

## 驗收標準

- [x] 色彩系統完整（背景色、主色、輔色、霓虹色碼、glow 參數皆有定義）
- [x] 節點/邊視覺規格明確（directory vs file 色彩區分清楚）
- [x] 字體規範完整（字型、字重、大小層級）
- [x] 元件樣式規範含 hover/active 狀態
- [x] theme.ts 設計稿可直接被開發引用（色彩常數 + 樣式常數）
- [x] 文字對比度 ≥ 4.5:1（WCAG AA）
- [x] 視覺風格有「深色霓虹」衝擊力

---

## 事件紀錄

### 2026-03-30T10:00:00.000Z — 建立任務
由 design-director 透過 /task-delegation 建立

### 2026-03-30T11:00:00.000Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-30T12:30:00.000Z — 狀態變更 → in_review
產出 design/sprint2-visual-style.md（視覺風格文件，6 章節）與 design/sprint2-theme-draft.ts（TypeScript 主題設計稿）。所有驗收標準已通過：色彩系統完整（背景色 5 色、4 系霓虹色、glow 三級）、節點/邊視覺規格明確（Cyan vs Magenta/Purple 色彩分離）、WCAG AA 對比度驗證完成（text-primary 16.4:1）、theme.ts 可直接引用。

### 2026-03-30T13:00:00.000Z — 狀態變更 → done
L1 (design-director) 審核通過。Review 結果：0 Blocker, 0 Major, 0 Minor。色彩系統專業、層次分明，WCAG AA 全達標，theme.ts 開發可直接引用。
