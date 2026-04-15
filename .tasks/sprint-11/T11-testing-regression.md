# 測試 + 全面回歸

| 欄位 | 值 |
|------|-----|
| ID | T11 |
| 專案 | CodeAtlas |
| Sprint | Sprint 11 |
| 指派給 | test-writer-fixer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T8 |
| 預估 | 5h |
| 建立時間 | 2026-04-01T14:00:00.000Z |

---

## 任務描述

Sprint 11 測試計畫：

### 單元測試
- PERSPECTIVE_PRESETS 三種預設值正確
- applyPerspective() 三種視角過濾結果
- computeLayout() 三種引擎路由
- dagre-layout provider 佈局計算 + 失敗回退
- useBfsHoverHighlight BFS 多跳 + 深度限制
- useStaggerAnimation 步進 + 加速 + play/pause/replay
- ViewState reducer SET_PERSPECTIVE 清除衝突
- Perspective → ViewMode 遷移覆蓋

### 整合測試
- 三層過濾疊加：perspective → curation → manual filter
- 策展 + 三視角一致
- 視角切換 + pinnedNodeIds 保持
- 2D/3D + 視角交互（系統框架回退）
- 影響分析 + 視角
- 搜尋聚焦 + 視角

### 回歸測試
- 983+ tests 零回歸
- pnpm build 全通過
- Sprint 1-10 功能不受影響

## 驗收標準

- [ ] 983+ tests 零回歸
- [ ] 新增視角相關測試（覆蓋全部新功能）
- [ ] pnpm build 全通過
- [ ] 2D/3D 切換正常
- [ ] 策展 + 手動釘選正常

---

## 事件紀錄

### 2026-04-01T14:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
