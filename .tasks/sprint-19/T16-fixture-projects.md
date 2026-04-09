# 四語言 Fixture

| 欄位 | 值 |
|------|-----|
| ID | T16 |
| 專案 | CodeAtlas |
| Sprint | Sprint 19 |
| 指派給 | test-writer-fixer |
| 優先級 | P0 |
| 狀態 | assigned |
| 依賴 | T6 |
| 預估 | 3h |
| 建立時間 | 2026-04-08T07:25:25.000Z |
| 開始時間 | — |
| 完工時間 | — |

---

## 任務描述

建立四語言 fixture 專案（提案書附錄 E）：

| Fixture | 語言 | 結構 | 預期規模 |
|---------|------|------|---------|
| `fixtures/wiki-ts-sample` | TypeScript | Express-like：routes/ + services/ + models/ | 8-12 檔案 |
| `fixtures/wiki-js-sample` | JavaScript | 簡單 Node.js：lib/ + utils/ + index.js | 5-8 檔案 |
| `fixtures/wiki-py-sample` | Python | Flask-like：app/ + models/ + routes/ + `__init__.py` | 8-12 檔案 |
| `fixtures/wiki-java-sample` | Java | Spring Boot-like：controller/ + service/ + model/ | 8-12 檔案 |

每個 fixture 附 `expected-manifest.json` 作為唯一驗收基準：
- page count / link count / endpoint count / anchor completeness

## 驗收標準

- [ ] 四個 fixture 專案建立完成
- [ ] 每個附 expected-manifest.json
- [ ] 可被 CodeAtlas analyze + wiki 正確處理

---

## 事件紀錄

### 2026-04-08T07:25:25.000Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
