# T2 core 節點角色分類器（classifyNodeRole 純函式 + 單元測試）

| 欄位 | 值 |
|------|-----|
| ID | T2 |
| 專案 | CodeAtlas |
| Sprint | Sprint 10 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T1 |
| 預估 | 3h |
| 建立時間 | 2026-04-01T14:00:00.000Z |
| 開始時間 | 2026-04-01T14:30:00.000Z |
| 完工時間 | 2026-04-01T20:00:00.000Z |

---

## 任務描述

在 `packages/core/src/analyzer/role-classifier.ts` 實作純函式 `classifyNodeRole(node, edges)`。

### Heuristic 5 步演算法

1. **路徑模式**（最高優先）：`__tests__/`, `test/`, `spec/`, `dist/`, `build/`, `.github/`, `scripts/` → noise
2. **檔名模式**：`*.config.*`, `.env*`, `tsconfig.*`, `package.json` → infrastructure；`*.d.ts`, `types.ts`, `constants.ts` → utility
3. **目錄名模式**：`routes/`, `controllers/`, `services/`, `models/`, `handlers/`, `pages/`, `views/` → business-logic；`middleware/`, `auth/`, `guards/` → cross-cutting；`config/`, `database/`, `migrations/` → infrastructure；`utils/`, `helpers/`, `lib/` → utility
4. **依賴度分析**：高 inDegree（>75th percentile）且低 outDegree → business-logic；中等 → infrastructure；其餘 → utility
5. **預設值**：無法分類 → infrastructure（保守策略）

### 輸出

- `packages/core/src/analyzer/role-classifier.ts`
- `packages/core/__tests__/role-classifier.test.ts`（5 種角色各 2+ cases）

## 驗收標準

- [x] classifyNodeRole 為純函式，無副作用
- [x] 5 種角色分類正確
- [x] 路徑、檔名、目錄、依賴度四層 heuristic 覆蓋
- [x] 單元測試 5 種角色各 2+ cases
- [x] fallback 為 infrastructure（保守）
- [x] 所有測試通過

---

## 事件紀錄

### 2026-04-01T14:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-01T20:00:00.000Z — 完成任務
任務完成，所有驗收標準通過。
