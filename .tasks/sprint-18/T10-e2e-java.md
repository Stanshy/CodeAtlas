# 端到端驗證 — Java

| 欄位 | 值 |
|------|-----|
| ID | T10 |
| 專案 | CodeAtlas |
| Sprint | Sprint 18 |
| 指派給 | test-writer-fixer |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-04-08T02:28:11.000Z |
| 完工時間 | 2026-04-08T02:33:53.000Z |
| 依賴 | T1,T3,T6,T7,T8 |
| 預估 | 2h |
| 建立時間 | 2026-04-08T01:58:28.859Z |

---

## 任務描述

建立小型 Spring Boot-like Java fixture 專案，跑端到端分析，驗證三視角（SF/LO/DJ）產出正確。

### 執行步驟

1. 建立 fixture：小型 Spring Boot-like Java 專案（5-10 檔案）
   - 包含 package 宣告、static import、interface、enum、annotation
   - 模擬真實目錄結構（com/example/controller/、com/example/service/、com/example/model/）
2. 跑 `analyze()` → 產出 graph JSON
3. 驗證 graph JSON：
   - SF（System Framework）：package 結構有 nodes
   - LO（Logic Operation）：方法列表有 nodes
   - DJ（Data Journey）：REST 端點有 edges
4. 確認無 crash、無 undefined 節點

## 驗收標準

- [x] Java fixture 專案已建立（5-10 檔案）
- [x] analyze() 成功產出 graph JSON
- [x] SF 視角有 package 結構節點
- [x] LO 視角有方法列表節點
- [x] DJ 視角有 REST 端點邊
- [x] 無 crash、無 undefined

---

## 事件紀錄

### 2026-04-08T01:58:28.859Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-08T02:33:53.000Z — 完成（done）
java-extractor.test.ts 18 tests（import 8 + function 10）。含 availability guard。784 total pass。
