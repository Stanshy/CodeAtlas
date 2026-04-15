# 架構設計 + 規範文件更新

| 欄位 | 值 |
|------|-----|
| ID | T1 |
| 專案 | CodeAtlas |
| Sprint | Sprint 12 |
| 指派給 | tech-lead |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 2h |
| 建立時間 | 2026-04-01T19:10:00.000Z |
| 開始時間 | 2026-04-01T19:10:00.000Z |
| 完工時間 | 2026-04-01T19:30:00.000Z |

---

## 任務描述

Sprint 12 架構設計文件撰寫，包含：

1. **架構文件** `.knowledge/sprint12-visual-architecture.md`
   - 目錄聚合引擎設計（aggregateByDirectory）
   - 白紙黑格主題替換策略
   - 三種呈現邏輯框架（目錄鳥瞰、聚焦模式、播放模式）
   - 圖稿 design tokens 完整對照表

2. **規範文件更新**
   - `feature-spec.md` v12.0（+Sprint 12 功能 F88-F100）
   - `data-model.md` v5.0（+DirectoryNode/DirectoryEdge/DirectoryGraph）
   - `api-design.md` v5.0（/api/graph +directoryGraph 欄位）

## 驗收標準

- [x] `.knowledge/sprint12-visual-architecture.md` 完整且含三層設計
- [x] feature-spec.md 更新至 v12.0
- [x] data-model.md 更新至 v5.0，含 DirectoryGraph 型別
- [x] api-design.md 更新至 v5.0，含 directoryGraph API 欄位
- [x] 圖稿 design tokens 對照表（每個 CSS 變數 → theme.ts 常數映射）

---

## 事件紀錄

### 2026-04-01T19:10:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
