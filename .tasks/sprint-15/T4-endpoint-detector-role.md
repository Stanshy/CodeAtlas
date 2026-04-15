# endpoint-detector 整合 MethodRole

| 欄位 | 值 |
|------|-----|
| ID | T4 |
| 專案 | CodeAtlas |
| Sprint | Sprint 15 |
| 指派給 | ai-engineer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 2h |
| 建立時間 | 2026-04-05T05:49:01.061Z |
| 開始時間 | 2026-04-05T06:21:15.558Z |
| 完工時間 | 2026-04-05T06:21:15.558Z |

---

## 任務描述

修改 `packages/core/src/analyzers/endpoint-detector.ts`：

1. 在 `buildPythonChainSteps` / `buildJSChainSteps` 建構 chain step 時，呼叫 `classifyMethodRole()` 為每步分類
2. ChainStep 新增欄位：`role: MethodRole` + `roleConfidence: number`
3. 不影響現有 PYTHON_SKIP_METHODS / skip list 邏輯（兩者互補）
4. import `classifyMethodRole` from `../ai/method-role-classifier`

注意：
- `classifyMethodRole()` 輸入需要 `MethodClassificationInput`，需從 ChainStep 已有的資訊映射
- 映射邏輯：name→step.name, filePath→step.fileId, isExported→node?.isExported, callOutDegree→從 graph 計算
- 若資訊不足（找不到對應 node），預設 role='utility', confidence=0.5

參照：計畫書 §2.6

## 驗收標準

- [x] buildPythonChainSteps 每步附帶 MethodRole
- [x] buildJSChainSteps 每步附帶 MethodRole
- [x] ChainStep type 已擴展 role + roleConfidence 欄位
- [x] 現有 skip list 邏輯不受影響
- [x] TypeScript 編譯無錯誤

---

## 事件紀錄

### 2026-04-05T05:49:01.061Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-05T06:09:41.161Z — 狀態變更 → done
L1 Review 通過，所有驗收標準確認
