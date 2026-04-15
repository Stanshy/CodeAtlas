# T3 Core 層智慧目錄聚合升級

| 欄位 | 值 |
|------|-----|
| ID | T3 |
| 專案 | CodeAtlas |
| Sprint | Sprint 13 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T1 |
| 預估 | 3h |
| 建立時間 | 2026-04-02T10:00:00.000Z |
| 開始時間 | 2026-04-02T10:00:00.000Z |
| 完工時間 | 2026-04-02T23:59:00.000Z |

---

## 任務描述

修改 `packages/core/src/analyzers/directory-aggregator.ts`，智慧聚合升級：

1. **智慧展開規則**：
   - 先按第一層目錄聚合（與 Sprint 12 相同）
   - 計算每個目錄的檔案占比
   - 占比 >70% 的目錄自動展開為子目錄
   - 展開後的子目錄成為獨立卡片
   - 維持目錄間依賴正確計算

2. **DirectoryNode 型別擴充**：
   - 新增 `category: 'frontend' | 'backend' | 'infra'`
   - 新增 `sublabel: string`（完整路徑，如 `frontend/src/services/`）
   - 新增 `autoExpand: boolean`

3. **分類邏輯**：
   - 含 frontend/client/web/app/src 的路徑 → `frontend`
   - 含 backend/server/api/routes/models 的路徑 → `backend`
   - 其餘 → `infra`

4. **預期 VideoBrief 結果**：
   - frontend（102 files, 63%）→ 展開為 7 子目錄
   - backend（59 files, 37%）→ 展開為 6 子目錄
   - nginx、relay → 保持獨立卡片
   - 總計 ~17 張卡片

5. **單元測試更新**

## 驗收標準

- [x] VideoBrief：frontend 展開為子目錄
- [x] VideoBrief：backend 展開為子目錄
- [x] 總卡片數 5~17 範圍
- [x] 依賴箭頭正確
- [x] category/sublabel/autoExpand 欄位正確填充
- [x] 單元測試通過

---

## 事件紀錄

### 2026-04-02T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-02T23:59:00.000Z — 狀態變更 → done
任務完成，所有驗收標準通過
