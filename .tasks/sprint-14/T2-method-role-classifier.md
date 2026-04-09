# MethodRole 規則引擎

| 欄位 | 值 |
|------|-----|
| ID | T2 |
| 專案 | CodeAtlas |
| Sprint | Sprint 14 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T1 |
| 預估 | 3h |
| 建立時間 | 2026-04-05T10:00:00.000Z |
| 開始時間 | 2026-04-05T13:00:00.000Z |
| 完工時間 | 2026-04-05T13:30:00.000Z |

---

## 任務描述

建立 `packages/core/src/ai/method-role-classifier.ts`：

基於 AST 特徵判斷 MethodRole，不依賴 AI。判斷邏輯（按優先級）：
1. entrypoint: export + handler/middleware pattern 或 route decorator
2. io_adapter: 包含 db.*/fetch/fs.*/axios.*/request pattern
3. validation: 函式名 validate*/check*/assert*
4. domain_rule: 函式名包含 rule/policy/calculate/compute
5. orchestration: 呼叫 3+ 個其他方法且不做 I/O
6. business_core: export + 非以上任一
7. infra: config/setup/register/middleware 註冊
8. framework_glue: ORM chain (select/where/join/orderBy) 或框架 builder
9. utility: 以上皆非的內部函式

confidence 基於匹配的 signal 數量（1=0.6, 2=0.8, 3+=0.95）。

整合到 endpoint-detector.ts 取代 PYTHON_SKIP_METHODS。

參照：計畫書 §2.2

## 驗收標準

- [x] 9 種角色各至少有明確的匹配規則
- [x] confidence 基於 signal 數量正確計算
- [x] 整合到 endpoint-detector 取代 PYTHON_SKIP_METHODS
- [x] VideoBrief 驗證：Routes handler→entrypoint, db.*→io_adapter
- [x] TypeScript 編譯無錯誤

---

## 事件紀錄

### 2026-04-05T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-05T05:37:03.998Z — 批次補正紀錄
⚠️ 本任務執行期間未依規範呼叫 /task-start 與 /task-done，導致開始/完工時間為估計值、事件紀錄缺失。
以下為補正：
- 狀態變更 → in_progress：由 backend-architect 執行，建立 method-role-classifier.ts + export role-classifier.ts 常數
- 狀態變更 → in_review：9 條規則引擎完成，confidence 計算就緒
- 狀態變更 → done：L1 Review 通過
