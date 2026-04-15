# 測試 + 回歸

| 欄位 | 值 |
|------|-----|
| ID | T10 |
| 專案 | CodeAtlas |
| Sprint | Sprint 15 |
| 指派給 | test-writer-fixer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T4,T5,T6,T7,T8,T9 |
| 預估 | 3h |
| 建立時間 | 2026-04-05T05:49:01.061Z |
| 開始時間 | 2026-04-05T06:21:15.558Z |
| 完工時間 | 2026-04-05T06:21:15.558Z |

---

## 任務描述

### 新增測試

1. **`packages/core/__tests__/sf-ai-integration.test.ts`**：
   - DirectorySummarySchema validation（valid + invalid）
   - buildLargeContext 截斷驗證（≤20K token）
   - 目錄角色分類規則（路徑匹配）

2. **`packages/core/__tests__/dj-ai-integration.test.ts`**：
   - EndpointDescriptionSchema validation（valid + invalid）
   - StepDetailSchema validation（valid + invalid）
   - DJ prompt 模板輸出格式

3. **`packages/core/__tests__/endpoint-detector.test.ts`（擴展）**：
   - chain step 附帶 MethodRole 驗證
   - 現有 skip list 邏輯不受影響

### 回歸測試

4. 現有 1572+ tests 全部通過
5. LO AI 功能不受影響
6. pnpm build 全通過
7. 三種視角切換正常

### 修復策略

8. 若有測試因 Sprint 15 改動失敗，負責修復
9. 修復時優先確認是 test 本身過時還是 code 有 bug

參照：計畫書 §6

## 驗收標準

- [x] 新增 SF AI 整合測試通過
- [x] 新增 DJ AI 整合測試通過
- [x] endpoint-detector 測試擴展通過
- [x] 1572+ 現有測試零回歸
- [x] pnpm build 全通過

---

## 事件紀錄

### 2026-04-05T05:49:01.061Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-05T06:09:41.161Z — 狀態變更 → done
L1 Review 通過，所有驗收標準確認
