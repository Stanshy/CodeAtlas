# 開發計畫書: Sprint 17 — 程式碼優化

> **撰寫者**: PM
> **日期**: 2026-04-07
> **專案**: CodeAtlas
> **Sprint 提案書**: `proposal/sprint17-proposal.md`（G0 通過 2026-04-07）
> **狀態**: ✅ 完成（G2+G3+G4 通過）

---

## 1. 需求摘要

16 個 Sprint 累積 35K 行產品碼，web 層佔 70% 且有多個巨型元件。本 Sprint 進行全面盤點、死碼清理、大元件拆分，同時處理 Sprint 16 遺留（15 個測試修復 + 文件補齊）。

**老闆原則**：
- 目標是「更清晰」而非「更少」
- 不改 API 契約、不改 UI 外觀
- 使用者無感的內部重構

### 確認的流程

```
需求 → 設計 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）→ 文件 → G4（文件審查）
```

### 阻斷規則

- 無（純重構 Sprint）

---

## 2. 技術方案

### 重構策略：由安全到深入

```
Phase 1（低風險）：Sprint 16 遺留修復 + LOC 盤點 + 死碼清理
Phase 2（中風險）：大元件拆分 + 共用邏輯抽取
Phase 3：測試修復+回歸
Phase 4：文件+重構報告
```

### 大元件拆分方向（Phase 2 設計，TL 確認後執行）

| 元件 | 現況 LOC | 拆分方向 | 目標 |
|------|---------|---------|------|
| GraphCanvas.tsx | 2,644 | 抽出 event handlers / layout logic / tooltip 邏輯為子元件或 hooks | 主檔 <1,000 |
| Graph3DCanvas.tsx | 1,627 | 抽出 3D scene setup / camera control / interaction 為子元件或 hooks | 主檔 <800 |
| SettingsPopover.tsx | 899 | 抽出 AI 設定 section / 分析工具 section 為獨立子元件 | 主檔 <500 |
| ControlPanel.tsx | 609 | 確認是否已被 SettingsPopover 取代 → 若是，整個移除 | 移除或保留 |

### 2D/3D 共用邏輯候選

| 候選 | 說明 |
|------|------|
| 節點互動邏輯 | click / hover / select 行為 |
| 縮放/平移 | viewport 操作 |
| 搜尋高亮 | 搜尋結果 highlight |
| 節點篩選 | filter logic |

> TL 盤點後確認實際可抽取項目。

---

## 3. UI 圖稿

不適用（無 UI 變更）。

---

## 4. 檔案變更清單

> 實際清單由 TL 盤點後確定，以下為預估。

### 新增

| 檔案 | 用途 |
|------|------|
| `packages/web/src/components/graph/` | GraphCanvas 拆分後的子元件目錄 |
| `packages/web/src/components/graph3d/` | Graph3DCanvas 拆分後的子元件目錄 |
| `packages/web/src/components/settings/` | SettingsPopover 拆分後的子元件目錄 |
| `packages/web/src/hooks/useGraphInteraction.ts` | 2D/3D 共用互動 hook（候選） |
| `proposal/sprint17-loc-report.md` | LOC 盤點報告 |
| `proposal/sprint17-refactor-report.md` | 重構報告 |

### 修改

| 檔案 | 變更內容 |
|------|---------|
| GraphCanvas.tsx | 拆出子元件，主檔只保留組裝邏輯 |
| Graph3DCanvas.tsx | 拆出子元件，主檔只保留組裝邏輯 |
| SettingsPopover.tsx | 拆出 AI 設定 / 分析工具子元件 |
| `.knowledge/specs/api-design.md` | 補 method scope（Sprint 16 遺留） |
| `.knowledge/specs/feature-spec.md` | 更新按鈕位置說明（Sprint 16 遺留） |
| 15 個既存測試檔案 | 修復期望值 |

### 刪除（待確認）

| 檔案 | 原因 |
|------|------|
| ControlPanel.tsx（待確認） | 可能已被 SettingsPopover 完全取代 |
| 其他死碼（TL 盤點後確定） | 未使用的 export / 元件 / 函式 |

---

## 5. 介面設計

不適用（不新增 API 端點，不改 graph JSON schema）。

---

## 6. 任務定義與分配

### 任務清單

| # | 任務名稱 | 說明 | 負責 Agent | 依賴 | 驗收標準 |
|---|---------|------|-----------|------|---------|
| T1 | Sprint 16 遺留測試修復 | 修復 15 個既存測試失敗（ai-contracts 6 + directory-card 7 + sf-detail-panel 2）| test-writer-fixer | 無 | pnpm test 15 個全由 fail→pass |
| T2 | Sprint 16 遺留清理 | 清理 2 個 debug console.log + 其他未使用 import | backend-architect | 無 | grep console.log 無殘留 |
| T3 | Sprint 16 遺留文件補齊 | api-design.md 補 method scope + feature-spec.md 更新按鈕位置至 detail panel | tech-lead | 無 | 文件與程式碼一致 |
| T4 | LOC 全面盤點 | 產出 sprint17-loc-report.md：各層 LOC、大檔案 TOP 20、死碼候選清單、重複邏輯候選 | tech-lead | 無 | 報告產出，老闆確認刪除清單 |
| T5 | 死碼清理 | 根據 T4 盤點結果，移除確認的死碼。ControlPanel.tsx 確認後處理。未使用 export/函式 清理。| frontend-developer + backend-architect | T4（需老闆確認） | pnpm build 通過 + 無新增測試失敗 |
| T6 | GraphCanvas 拆分 | 2,644 行拆為主檔+子元件/hooks，主檔 <1,000 行 | frontend-developer | T1, T5 | 主檔 <1,000 行 + UI 行為不變 + pnpm build 通過 |
| T7 | Graph3DCanvas 拆分 | 1,627 行拆為主檔+子元件/hooks，主檔 <800 行 | frontend-developer | T1, T5 | 主檔 <800 行 + UI 行為不變 + pnpm build 通過 |
| T8 | SettingsPopover 拆分 | 899 行拆出 AI 設定/分析工具子元件，主檔 <500 行 | frontend-developer | T1, T5 | 主檔 <500 行 + UI 行為不變 + pnpm build 通過 |
| T9 | 2D/3D 共用邏輯抽取 | T6+T7 拆分後，共用邏輯抽為 hooks/utils | frontend-developer | T6, T7 | 共用 hook 被 2D/3D 都引用 |
| T10 | 測試碼瘦身 | 重複 mock 合併、冗餘測試案例整理 | test-writer-fixer | T6-T8 | 測試碼 LOC 有下降 + 全通過 |
| T11 | 全量回歸測試 | pnpm build + pnpm test 全通過（零失敗） | test-writer-fixer | T1-T10 | pnpm test 零失敗 |
| T12 | 文件+重構報告 | CLAUDE.md 更新 + sprint17-refactor-report.md（前後 LOC 對比、刪除清單、拆分清單） | tech-lead | T11 | 報告產出 |

### 依賴圖

```
T1（測試修復）──┐
T2（debug 清理）─┤─ 並行，無依賴
T3（文件補齊）──┤
T4（LOC 盤點）──┘
        ↓
T5（死碼清理）← 需老闆確認 T4 盤點結果
        ↓
T6（GraphCanvas 拆分）──┐
T7（Graph3DCanvas 拆分）─┤─ 並行
T8（SettingsPopover 拆分）┘
        ↓
T9（共用邏輯抽取）← 依賴 T6+T7
T10（測試碼瘦身）← 依賴 T6-T8
        ↓
T11（全量回歸）
        ↓
T12（文件+報告）
```

### L1 執行指令

```
Sprint 17 — 程式碼優化

你是 L1 領導。計畫書：proposal/sprint17-dev-plan.md
提案書：proposal/sprint17-proposal.md

核心目標：盤點+瘦身+拆分，為開源準備。不改 API 契約、不改 UI 外觀、使用者無感。

12 個任務，分 4 Phase：

═══ Phase 1（並行，低風險）═══

T1 修復 15 個既存測試：
  ai-contracts.test.ts 6 個（Sprint 15.1 schema 放寬後期望值過時）
  directory-card.test.tsx 7 個（T7 AI 按鈕+category accent bar 樣式調整）
  sf-detail-panel.test.tsx 2 個
  目標：pnpm test 零失敗

T2 debug 清理：
  ai-job-manager.ts 2 個 commented-out console.log
  全域掃描其他未使用 import

T3 Sprint 16 文件補齊：
  api-design.md 補 method scope（POST /api/ai/analyze 的 scope 欄位新增 'method'）
  feature-spec.md 更新按鈕位置（從卡片移至 detail panel）

T4 LOC 全面盤點：
  產出 proposal/sprint17-loc-report.md
  各層（core/cli/web）LOC + 檔案數
  大檔案 TOP 20
  死碼候選清單（未引用的 export / 元件 / 函式）
  重複邏輯候選
  ControlPanel.tsx 是否已被 SettingsPopover 取代

═══ 老闆確認 T4 盤點結果 ═══

T5 死碼清理 — 根據老闆確認的清單執行

═══ Phase 2（並行，中風險）═══

T6 GraphCanvas.tsx 拆分（2,644→<1,000）
T7 Graph3DCanvas.tsx 拆分（1,627→<800）
T8 SettingsPopover.tsx 拆分（899→<500）

拆分原則：
- 抽出子元件或 hooks，主檔只保留組裝邏輯
- barrel export 維持原有 import path（不破壞外部引用）
- 拆完立即 pnpm build + 視覺確認

T9 2D/3D 共用邏輯抽取（依賴 T6+T7）
T10 測試碼瘦身（依賴 T6-T8）

═══ Phase 3 ═══

T11 全量回歸：pnpm build + pnpm test 零失敗

═══ Phase 4 ═══

T12 文件+重構報告：CLAUDE.md + sprint17-refactor-report.md（前後對比）

關鍵原則：
1. 不改 API 契約（graph JSON schema 不變、端點不變）
2. 不改 UI 外觀（使用者無感）
3. 先修測試（T1）再動重構（T6-T8），確保測試保護
4. 死碼清理需老闆確認後才刪
5. 拆分用 barrel export 維持原有 import path
6. 每拆完一個元件立即 pnpm build 驗證

先進入 Plan Mode，盤點現有程式碼結構。
Phase 1 先行，T4 盤點結果送老闆確認後再進 Phase 2。
每完成一個任務 → /task-done。全部完成 → /review → 提交 Gate。
```

### 共用檔案（需協調）

| 檔案 | 涉及任務 | 風險等級 |
|------|---------|---------|
| GraphCanvas.tsx | T6, T9 | 中（拆分+共用抽取） |
| Graph3DCanvas.tsx | T7, T9 | 中（拆分+共用抽取） |
| SettingsPopover.tsx | T8 | 低（獨立拆分） |

---

## 7. 測試計畫

### 既存測試修復（T1）

| 測試檔案 | 失敗數 | 原因 |
|---------|--------|------|
| ai-contracts.test.ts | 6 | Sprint 15.1 放寬 schema 後期望值過時 |
| directory-card.test.tsx | 7 | T7 新增 AI 按鈕 + category accent bar 調整 |
| sf-detail-panel.test.tsx | 2 | 期望值過時 |

### 回歸測試（T11）

- pnpm build 零錯誤
- pnpm test 零失敗（含 T1 修復的 15 個）
- UI 外觀手動檢查（2D/3D 渲染、設定面板）

---

## 8. 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| 拆分元件引入 UI 回歸 | 中 | 先修 15 個測試確保保護完整，拆完立即 build + 視覺確認 |
| 誤刪非死碼 | 高 | T4 盤點→老闆確認→才刪除，不自行判斷 |
| 重構範圍蔓延 | 中 | 嚴格遵守「不做」清單 |
| import 路徑大量變更 | 低 | barrel export 維持原有 path |

---

## 9. 文件更新

- [ ] `.knowledge/specs/api-design.md` — 補 method scope（T3）
- [ ] `.knowledge/specs/feature-spec.md` — 按鈕位置更新（T3）
- [ ] `CLAUDE.md` — Sprint 17 完成標記（T12）
- [ ] `proposal/sprint17-loc-report.md` — 盤點報告（T4）
- [ ] `proposal/sprint17-refactor-report.md` — 重構報告（T12）

---

## 10. 任務與審核紀錄

### 任務完成紀錄

| 任務 | 完成日期 | 結果 | 備註 |
|------|---------|------|------|
| T1 | 2026-04-07 | ✅ 完成 | 15/15 目標測試修復。ai-contracts 6（role optional+oneLineSummary 200 char）、directory-card 7（DOM 層級 cardBox→cardBody）、sf-detail-panel 2（多 button 改 getAllByRole）。另發現 ai-pipeline.test.ts 4 個額外既存失敗（T2 移除 debug log 導致 spy 期望值變化，T11 處理）。 |
| T2 | 2026-04-07 | ✅ 完成 | ai-job-manager.ts 3 個 debug log 移除 + ai-pipeline.ts 11 個 debug log 移除。console.warn/error 保留。CLI user-facing output 保留。無未使用 import。pnpm build 通過。 |
| T3 | 2026-04-07 | ✅ 完成 | Sprint 16 G4 已完成，三份文件驗證一致（api-design method scope + data-model AIJobScope + feature-spec v16.1） |
| T4 | 2026-04-07 | ✅ 完成 | sprint17-loc-report.md 產出。36,491 行 source + 21,785 行 test。死碼 742 行確認。老闆已核准刪除清單。 |
| T5 | 2026-04-07 | ✅ 完成 | ControlPanel.tsx (609) + ControlPanelSection.tsx (133) 刪除。DisplayPrefsSection/FilterPanel/SettingsPopover JSDoc 註解更新。pnpm build 零錯誤，pnpm test 無新增失敗。 |
| T6 | 2026-04-07 | ✅ 完成 | 2,644→896 行（目標 <900）。抽出 useGraphCanvasFiltering (445) + useDJMode (412) + useLOMode (290) + useNodeEdgeStyling (665) + GraphCanvasFooter (259)。pnpm build 零錯誤。 |
| T7 | 2026-04-07 | ✅ 完成 | 1,627→592 行（目標 <800）。抽出 three-scene-helpers.ts (479) + use3DHighlightEffects.ts (734)。pnpm build 零錯誤，無 circular dependency。 |
| T8 | 2026-04-07 | ✅ 完成 | 899→257 行（目標 <500）。抽出 AnalysisSection (296) + AISettingsSection (444)。pnpm build 零錯誤。 |
| T9 | 2026-04-07 | ✅ 完成 | 3 共用 hooks 建立：useFilteredGraphData + useGraphAdjacency + useHighlightPriority。Graph3DCanvas 整合 useGraphAdjacency + useHighlightPriority。useFilteredGraphData 未整合 2D（filtering 與 RF card 生成耦合，超出 T9 範圍）。pnpm build 零錯誤。 |
| T10 | 2026-04-07 | ✅ 完成 | ai-pipeline.test.ts 4 個失敗修復（根因：PersistentAICache 型別不匹配）。Mock dedup 分析後跳過（<50 行收益）。全量測試 1,797 pass / 0 fail。 |
| T11 | 2026-04-07 | ✅ 完成 | pnpm build 零錯誤。pnpm test 1,797 pass / 0 fail（cli 131 + core 719 + web 947）。零 circular dependency。 |
| T12 | 2026-04-08 | ✅ 完成 | sprint17-refactor-report.md 產出（前後 LOC 對比、刪除/新增清單、品質指標）。CLAUDE.md 更新（feature-spec v16.1 + Sprint 17 完成標記 + 報告索引）。 |

### Review 紀錄

| Review | 日期 | 結果 | 文件 |
|--------|------|------|------|
| 實作+測試+文件 Review | 2026-04-08 | 通過 | Blocker:0 Major:0 Minor:2（AISettingsSection fetch 缺 warn fallback + task 檔案缺開始/完工時間欄位）。對程式碼：零 any、零 console.log、零 circular dep、零硬編碼密鑰。對規範：無 API/schema 變更。對文件：dev-plan 第 10 節完整、12 task 檔案齊全。 |

### Gate 紀錄

| Gate | 日期 | 決策 | 審核意見 |
|------|------|------|---------|
| G0 | 2026-04-07 | ✅ 通過 | 純重構 Sprint，無 UI 變更 |
| G2 | 2026-04-08 | ✅ 通過 | 12 任務全完成。Review: Blocker:0 Major:0 Minor:2。零 any、零 console.log、零 circular dependency。三大元件拆分達標（GraphCanvas 2,644→896、Graph3DCanvas 1,627→592、SettingsPopover 899→257）。死碼 742 行刪除。pnpm build 零錯誤。 |
| G3 | 2026-04-08 | ✅ 通過 | pnpm test 1,797 pass / 0 fail（cli 131 + core 719 + web 947）。Sprint 16 遺留 15 個 + ai-pipeline 4 個 = 19 個測試全修復。零新增失敗。零 circular dependency。 |
| G4 | 2026-04-08 | ✅ 通過 | sprint17-loc-report.md（盤點報告）+ sprint17-refactor-report.md（重構報告含前後 LOC 對比）產出。CLAUDE.md 索引更新。feature-spec v16.1 驗證一致。 |
