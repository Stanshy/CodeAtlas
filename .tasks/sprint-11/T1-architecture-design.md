# 架構設計 + 規範文件更新

| 欄位 | 值 |
|------|-----|
| ID | T1 |
| 專案 | CodeAtlas |
| Sprint | Sprint 11 |
| 指派給 | tech-lead |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 3h |
| 建立時間 | 2026-04-01T14:00:00.000Z |

---

## 任務描述

撰寫 Sprint 11 架構設計文件 `.knowledge/sprint11-perspectives-architecture.md`，涵蓋：
- 佈局引擎框架設計（可擴展 LAYOUT_PROVIDERS 註冊表）
- 三種故事視角預設定義（PerspectiveName + PerspectivePreset）
- 視圖模式遷移策略（ViewModeName → PerspectiveName，四對三對照）
- 2D/3D 適配策略（系統框架 2D only，邏輯運作/資料旅程 2D+3D）
- 三層過濾順序：perspective → curation → manual filter

更新功能規格 `.knowledge/specs/feature-spec.md` → v11.0（+F79-F87）。

## 驗收標準

- [ ] `.knowledge/sprint11-perspectives-architecture.md` 架構文件完整
- [ ] 遷移策略：四種 ViewMode 到三種 Perspective 逐一對照表
- [ ] 佈局引擎框架可擴展設計說明
- [ ] 2D/3D 適配策略明確
- [ ] feature-spec.md 已更新至 v11.0（F79-F87）

---

## 事件紀錄

### 2026-04-01T14:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
