# 金鑰安全措施

| 欄位 | 值 |
|------|-----|
| ID | T8 |
| 專案 | CodeAtlas |
| Sprint | Sprint 6 |
| 指派給 | backend-architect |
| 優先級 | P1 |
| 狀態 | done |
| 開始時間 | 2026-03-31T10:15:00.000Z |
| 完工時間 | 2026-03-31T10:25:00.000Z |
| 依賴 | T3 |
| 預估 | 0.5h |
| 建立時間 | 2026-03-31T10:00:00.000Z |

---

## 任務描述

1. config.ts 中 readConfigFile：
   - 偵測 JSON 物件含 key/secret/token 欄位 → console.warn 提示不要存金鑰
2. CLI --ai-key flag help 文字：
   - 加入「(not recommended - key visible in shell history, prefer environment variables)」
3. 文件提示：
   - 確認 .codeatlas.json 不存金鑰的設計在 config.ts 中有效

## 驗收標準

- [x] config.ts 偵測 key/secret/token 欄位 → 警告
- [x] --ai-key help 顯示不建議警告
- [x] 金鑰不存入 .codeatlas.json 設計正確

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T10:15:00.000Z — 狀態變更 → in_progress
T3 實作時已涵蓋全部金鑰安全措施，與 T3 同步完成

### 2026-03-31T10:25:00.000Z — 狀態變更 → done
金鑰安全完成：SENSITIVE_KEY_PATTERNS 偵測 key/secret/token → console.warn，--ai-key help 含 shell history 警告，config.ts 不儲存金鑰設計正確
