# tree-sitter 整合 + Windows 驗證

| 欄位 | 值 |
|------|-----|
| ID | T3 |
| 專案 | CodeAtlas |
| Sprint | Sprint 1 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T1 |
| 預估 | 2h |
| 建立時間 | 2026-03-30T10:00:00.000Z |

---

## 任務描述

安裝 tree-sitter Node.js binding + JS/TS grammar，驗證 Windows 平台相容性。若原生 binding 失敗，切換 WASM 備案。

### 具體工作

1. 在 `packages/core` 安裝 `tree-sitter` + `tree-sitter-javascript` + `tree-sitter-typescript`
2. 撰寫簡單驗證腳本：解析一段 JS/TS 程式碼並輸出 AST
3. 在 Windows 上執行驗證，確認原生編譯成功
4. 若失敗：切換 `web-tree-sitter`（WASM 版），重新驗證
5. 若 WASM 也失敗：記錄問題，使用 Babel parser 作為最後防線
6. 記錄最終選擇的方案到任務完成備註

### 風險

- tree-sitter 原生編譯需要 C++ toolchain（Windows 上需 VS Build Tools）
- 備案路徑：native → WASM → Babel

### 規範參考

- 計畫書第 2 節替代方案比較
- 計畫書第 8 節風險與緩解

## 驗收標準

- [x] 能解析一段 JS 程式碼並產出 AST
- [x] 能解析一段 TS 程式碼並產出 AST
- [x] Windows 上可正常運行（預建二進位檔，無需 C++ 編譯）
- [x] 記錄最終使用的方案：**native tree-sitter**（首選方案成功）

---

## 事件紀錄

### 2026-03-30T10:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-30T11:00:00.000Z — 狀態變更 → in_review
backend-architect 完成。最終方案：native tree-sitter（win32-x64 prebuild）。建立三層 Provider 抽象（native→WASM→TS Compiler）。驗證腳本 JS/TS 解析皆成功。修復 tsup+composite 衝突。

### 2026-03-30T11:01:00.000Z — 狀態變更 → done
L1 審核通過。驗收標準全數達成，抽象層設計良好（T5 可直接使用 parseSource API）。
