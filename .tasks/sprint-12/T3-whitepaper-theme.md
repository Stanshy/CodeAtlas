# 白紙黑格全局主題替換

| 欄位 | 值 |
|------|-----|
| ID | T3 |
| 專案 | CodeAtlas |
| Sprint | Sprint 12 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T1 |
| 預估 | 4h |
| 建立時間 | 2026-04-01T19:10:00.000Z |
| 開始時間 | 2026-04-01T19:30:00.000Z |
| 完工時間 | 2026-04-01T20:00:00.000Z |

---

## 任務描述

深色霓虹 → 白紙黑格全局主題替換。**所有顏色值必須與核准圖稿 CSS 變數完全一致。**

### theme.ts 全面重寫
見計畫書 §2.1 的 `THEME` 物件。所有 design tokens 從圖稿 `:root` 提取。

### 新增 global.css
CSS 變數定義（見計畫書 §2.1）+ 雙層網格背景 `.grid-bg`。

### 元件樣式修改（保留命名，只改樣式）
| 元件 | 新風格 |
|------|--------|
| NeonNode | fill:#ffffff + stroke:{color} 實線 + stroke-width:1.5 + shadow |
| NeonEdge | stroke:#9aa8bc + stroke-width:1.5 + 無 glow |
| ControlPanel | background:#ffffff + border:1.5px solid var(--border-default) |
| Toolbar | background:#ffffff + border-bottom:1.5px solid var(--border-default) |
| GraphCanvas | .grid-bg class（雙層網格） |
| Header | background:#ffffff + height:60px + border-bottom |

## 驗收標準

- [x] 背景 #fafafa，雙層網格可見（20px + 100px）
- [x] 所有元件白底實線，無殘留霓虹元素
- [x] CSS 變數與圖稿 `:root` 完全一致
- [x] NeonNode/NeonEdge 保留命名，樣式改白底
- [x] theme.ts 完全重寫為 THEME 物件
- [x] global.css 含所有 CSS 變數

---

## 事件紀錄

### 2026-04-01T19:10:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
