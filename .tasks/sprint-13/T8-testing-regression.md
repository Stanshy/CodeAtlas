# T8 測試 + 全面回歸

| 欄位 | 值 |
|------|-----|
| ID | T8 |
| 專案 | CodeAtlas |
| Sprint | Sprint 13 |
| 指派給 | test-writer-fixer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T7 |
| 預估 | 4h |
| 建立時間 | 2026-04-02T10:00:00.000Z |
| 開始時間 | 2026-04-02T10:00:00.000Z |
| 完工時間 | 2026-04-02T23:59:00.000Z |

---

## 任務描述

Sprint 13 新增 + 回歸測試，確保 1235+ tests 零回歸。

### 測試範圍

#### Core 單元測試
- `detectEndpoints()`: Express/Fastify pattern 正確識別、handler 解析、非標準框架回退 null
- `buildEndpointChains()`: 從 handler BFS 追蹤請求鏈、步驟正確、深度限制
- `aggregateByDirectory()` 升級: 智慧展開 >70% 目錄、category/sublabel/autoExpand、展開後依賴

#### Web 單元測試
- `LOCategoryGroup`: 5 分類渲染、>5 收合、展開切換
- `LOCallChain`: dagre TB 佈局、節點點擊、方法→位置映射
- `LODetailPanel`: 方法簽名、class/file、callers/callees
- `DJEndpointSelector`: 端點分類、卡片渲染、click 觸發
- `DJStepNode`: 步驟號+方法名+描述、尺寸
- `DJPanel`: 三態、明細展開（I/O/Transform）、重播
- `SFDetailPanel`: Stats + Files 展開 + Upstream/Downstream
- `RightPanel`: 三視角切換正確
- `applyPerspective()`: endpoint/method 分流

#### 整合測試
- SF 智慧聚合: 載入 → 正確卡片數
- SF click 選取: BFS 高亮 + 面板
- LO 初始群組: 5 分類群組
- LO 鑽取: 方法 → 流程圖
- LO 清除重建
- DJ 端點選擇: 分類展示
- DJ 播放: stagger + 面板同步
- 視角切換: 無閃爍

#### 回歸
- 1235+ 既有 tests 零回歸
- pnpm build 全通過

## 驗收標準

- [x] 所有新增測試通過
- [x] 1235+ 既有測試零回歸
- [x] pnpm build 全通過
- [x] 無 TypeScript 編譯錯誤

---

## 事件紀錄

### 2026-04-02T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-02T23:59:00.000Z — 狀態變更 → done
任務完成，所有驗收標準通過
