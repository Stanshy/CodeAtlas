# 資料旅程視角（stagger + 邊動畫 + E2E 同步）

| 欄位 | 值 |
|------|-----|
| ID | T7 |
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

實作資料旅程視角的完整功能：

1. **useStaggerAnimation.ts hook**：
   - 每步 350ms（老闆核准，不可更改）
   - >30 節點自動加速至 100ms/步
   - 狀態：currentStep / totalSteps / isPlaying / visibleNodes / visibleEdges
   - API：play() / pause() / replay()

2. **Green #00ff88 色調**：
   - NeonNode 色調切換：資料旅程時 Green 單色調
   - theme.ts 新增 Green 單色調色彩定義

3. **邊流動動畫**：
   - stagger-animation.css：stroke-dasharray 8 4 + stroke-dashoffset 動畫
   - NeonEdge 加入 dash animation class

4. **path-tracing-layout.ts provider**：
   - 力導向基礎 + 選中路徑節點鎖定位置
   - 路徑節點排列為線性序列

5. **E2E 面板同步**：
   - E2EPanel 高亮 currentStep 對應條目
   - 步驟條目滾動跟隨
   - 新增「重播」按鈕

6. **2D + 3D 適配**：
   - 2D：CSS animation + React Flow style
   - 3D：Three.js material 控制

## 驗收標準

- [ ] stagger 350ms 逐步亮起
- [ ] >30 節點加速至 100ms/步
- [ ] Green #00ff88 色調
- [ ] stroke-dashoffset 邊流動動畫
- [ ] E2E 面板同步高亮 + 滾動跟隨
- [ ] 重播按鈕可用
- [ ] 2D + 3D 皆可用

---

## 事件紀錄

### 2026-04-01T14:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
