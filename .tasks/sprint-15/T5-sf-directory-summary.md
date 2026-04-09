# SF 目錄摘要 + 色條 + 角色分類

| 欄位 | 值 |
|------|-----|
| ID | T5 |
| 專案 | CodeAtlas |
| Sprint | Sprint 15 |
| 指派給 | frontend-developer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T1,T2,T3 |
| 預估 | 2h |
| 建立時間 | 2026-04-05T05:49:01.061Z |
| 開始時間 | 2026-04-05T06:21:15.558Z |
| 完工時間 | 2026-04-05T06:21:15.558Z |

---

## 任務描述

修改 `packages/web/src/components/DirectoryCard.tsx`：

1. **左側 5px 色條**（基於目錄角色分類）：
   - Frontend 紫 `#7b1fa2`
   - Backend 藍 `#1565c0`
   - Infra 灰 `#546e7a`
   - 預設灰 `#90a4ae`（未分類）
   - 色條使用 CSS `borderLeft: '5px solid {color}'`

2. **AI 摘要行**（卡片下方）：
   - 灰色字 14px，顯示 DirectorySummary.oneLineSummary
   - AI 關閉時不顯示此行
   - Loading 時顯示 placeholder（如 `...`）

3. **角色分類**：
   - 使用規則引擎判斷目錄角色（路徑匹配）：
     - routes/controllers/api → 路由層（Backend 藍）
     - models/db/prisma → 資料層（Backend 藍）
     - services/features → 服務層（Backend 藍）
     - components/pages/views → 前端（Frontend 紫）
     - config/infra/setup/docker → 基礎設施（Infra 灰）
   - AI 摘要中的 role 僅作為補充顯示

4. DirectoryCard data interface 擴展：
   - `aiSummary?: string`
   - `directoryRole?: string`
   - `roleConfidence?: number`

參照：計畫書 §2.4

## 驗收標準

- [x] 每張目錄卡片左側有 5px 色條
- [x] 色條顏色基於角色分類（前端紫/後端藍/基礎設施灰）
- [x] AI 啟用時顯示摘要行
- [x] AI 關閉時不顯示摘要行
- [x] TypeScript 編譯無錯誤

---

## 事件紀錄

### 2026-04-05T05:49:01.061Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-05T06:09:41.161Z — 狀態變更 → done
L1 Review 通過，所有驗收標準確認
