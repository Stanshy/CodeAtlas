# 測試

| 欄位 | 值 |
|------|-----|
| ID | T11 |
| 專案 | CodeAtlas |
| Sprint | Sprint 18 |
| 指派給 | test-writer-fixer |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-04-08T02:28:11.000Z |
| 完工時間 | 2026-04-08T02:33:53.000Z |
| 依賴 | T1,T2,T3,T4,T5,T6,T7,T8 |
| 預估 | 3h |
| 建立時間 | 2026-04-08T01:58:28.859Z |

---

## 任務描述

Python/Java parser + extractor 單元測試 + JS/TS 回歸。目標 >=30 新測試。

### 測試範圍

| 範圍 | 案例數 | 說明 |
|------|--------|------|
| Python import | 8+ | 絕對、from、relative（1 dot）、relative（2 dots）、wildcard、__init__.py、多重 import、alias |
| Python function | 6+ | def、class、async def、decorator、method（self）、*args/**kwargs |
| Java import | 6+ | import、static import、wildcard、package、多重 import、nested scoped |
| Java function | 6+ | class、method、constructor、interface、enum、annotation |
| 語言偵測 | 4+ | .py → python、.java → java、.ts → typescript、unknown → null |
| call-analyzer | 4+ | Python self.method()、Python function()、Java this.method()、Java static call |

### 回歸確認

- pnpm build 零錯誤
- pnpm test 零失敗（含全部既有測試）
- JS/TS import/function/call 功能不受影響

## 驗收標準

- [x] >=30 新測試案例（65 個新測試）
- [x] Python import 測試 8+ 通過（10 個）
- [x] Python function 測試 6+ 通過（11 個）
- [x] Java import 測試 6+ 通過（8 個）
- [x] Java function 測試 6+ 通過（10 個）
- [x] 語言偵測測試 4+ 通過（12 個）
- [x] pnpm build 零錯誤
- [x] pnpm test 零失敗（784 pass, 0 fail）

---

## 事件紀錄

### 2026-04-08T01:58:28.859Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-08T02:33:53.000Z — 完成（done）
4 test files created: python-extractor(21), java-extractor(18), language-detection(12), call-analyzer-multilang(14). Total 65 new tests. 784/784 pass, 0 fail, 0 regression.
