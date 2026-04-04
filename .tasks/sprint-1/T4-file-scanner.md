# 檔案掃描器（Scanner）

| 欄位 | 值 |
|------|-----|
| ID | T4 |
| 專案 | CodeAtlas |
| Sprint | Sprint 1 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T2 |
| 預估 | 2h |
| 建立時間 | 2026-03-30T10:00:00.000Z |

---

## 任務描述

實作 `packages/core/src/scanner/index.ts`，遞迴掃描目標目錄，輸出 file/directory node 清單。

### 具體工作

1. 讀取 `.knowledge/specs/feature-spec.md` Scanner 區段
2. 實作遞迴目錄掃描
3. 過濾規則：忽略 `node_modules`、`.git`、`dist`、`build` 等
4. 支援自訂忽略規則（讀取 `.codeatlas.ignore` 或設定參數）
5. 輸出 GraphNode[] 格式（FileNode + DirectoryNode）
6. 處理邊界：空目錄、symlink 跳過、權限錯誤

### 規範參考

- `.knowledge/specs/feature-spec.md` Scanner 區段
- `.knowledge/specs/data-model.md` GraphNode 型別
- `packages/core/src/types.ts`（T2 產出）

## 驗收標準

- [x] 掃描含 JS/TS 檔案的目錄，輸出正確的檔案清單
- [x] 正確忽略 node_modules、.git 等目錄
- [x] 忽略非 JS/TS 檔案（圖片、.json 等，除非設定允許）
- [x] 空目錄正確處理（不拋錯，不建立 node）
- [x] symlink 跳過（isSymbolicLink 前置檢查）
- [x] 輸出格式符合 data-model.md 的 GraphNode 型別

---

## 事件紀錄

### 2026-03-30T10:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-30T11:40:00.000Z — 狀態變更 → in_review
backend-architect 完成。遞迴掃描 + 忽略規則 + symlink 跳過 + 大檔 warning + 空目錄跳過。路徑統一 `/` 分隔。

### 2026-03-30T11:41:00.000Z — 狀態變更 → done
L1 審核通過。邊界條件處理完整，parent-before-children 排序設計合理。
