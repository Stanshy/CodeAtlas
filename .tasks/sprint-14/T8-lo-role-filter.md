# LO 方法角色分類 + 噪音過濾

| 欄位 | 值 |
|------|-----|
| ID | T8 |
| 專案 | CodeAtlas |
| Sprint | Sprint 14 |
| 指派給 | frontend-developer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T2,T7 |
| 預估 | 3h |
| 建立時間 | 2026-04-05T10:00:00.000Z |
| 開始時間 | 2026-04-05T15:00:00.000Z |
| 完工時間 | 2026-04-05T15:30:00.000Z |

---

## 任務描述

1. LOCategoryCardNode 整合 MethodRole 過濾：
   - 隱藏 utility/framework_glue（依 ViewState hiddenMethodRoles）
   - 底部顯示「+N 個工具方法」可展開
   - 展開後顯示被隱藏的方法（灰色字）

2. GraphCanvas LO 資料管線整合：
   - 從 endpointGraph 取得方法的 MethodRole
   - 規則引擎分類結果作為預設
   - AI 分類結果覆蓋規則結果（若 AI 啟用）

3. AI 關閉時規則過濾仍生效

參照：計畫書 §2.7

## 驗收標準

- [x] LO 群組只顯示業務方法（214→40-60 個）
- [x] 「+N 個工具方法」可展開查看
- [x] AI 關閉時規則過濾仍生效
- [x] hiddenMethodRoles 設定正確反映
- [x] TypeScript 編譯無錯誤

---

## 事件紀錄

### 2026-04-05T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-05T05:37:03.998Z — 批次補正紀錄
⚠️ 本任務執行期間未依規範呼叫 /task-start 與 /task-done，導致開始/完工時間為估計值、事件紀錄缺失。
以下為補正：
- 狀態變更 → in_progress：由 frontend-developer 執行，LOCategoryCardNode 整合 MethodRole 過濾 + GraphCanvas LO 資料管線
- 狀態變更 → in_review：「+N 個工具方法」展開、hiddenMethodRoles 過濾完成
- 狀態變更 → done：L1 Review 通過
