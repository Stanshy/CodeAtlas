# Python Base Adapter

| 欄位 | 值 |
|------|-----|
| ID | T6 |
| 專案 | CodeAtlas |
| Sprint | Sprint 24 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T2 |
| 預估 | 2h |
| 建立時間 | 2026-04-14T05:24:59.365Z |

---

## 任務描述

建立 `packages/core/src/analyzers/adapters/python-base-adapter.ts`，從 endpoint-detector.ts 抽出 Python 共用邏輯：

1. **Python decorator regex**：`@app.route()`, `@router.get()` 等模式
2. **Python skip sets**：排除非端點的 decorator（`@login_required`, `@staticmethod` 等）
3. **heuristic chain builder**：Python 呼叫鏈啟發式建構（函式內呼叫追蹤）
4. **detect() 基礎實作**：檢查 requirements.txt / setup.py / pyproject.toml

此為 Flask/FastAPI/Django adapter 的共用基類（`extends BaseAdapter`），子類再各自實作框架特定邏輯。

必須含單元測試 `packages/core/__tests__/adapters/python-base-adapter.test.ts`

## 驗收標準

- [x] Python decorator 模式識別與舊 endpoint-detector 邏輯一致
- [x] skip sets 正確排除非端點 decorator（3 sets 原封搬移）
- [x] heuristic chain builder 可被子類使用（buildPythonChainSteps protected）
- [ ] 單元測試通過（T20 整合驗證）

---

## 事件紀錄

### 2026-04-14T05:24:59.365Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
