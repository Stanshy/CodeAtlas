# Sprint 13 圖稿校正差異報告

> **日期**: 2026-04-03
> **對照圖稿**: `proposal/references/sprint13/method-level-mockup.html`
> **對照規格**: `proposal/references/sprint13/method-level-mockup-spec.md`

---

## 一、系統框架 (SF)

### SF-1: 卡片缺少左側色條 🔴
- **圖稿**: 每張卡片左側有 5px 色條區分類別（Frontend 紫 `#7b1fa2`、Backend 藍 `#1565c0`、Infra 灰 `#546e7a`）
- **目前**: 卡片沒有色條，僅靠邊框顏色微弱區分
- **影響檔案**: `DirectoryCard.tsx`

### SF-2: 卡片缺少 📁 圖標 🟡
- **圖稿**: 卡片右下角有 📁 資料夾圖標
- **目前**: 沒有圖標
- **影響檔案**: `DirectoryCard.tsx`

### SF-3: 節點之間沒有連接線 🔴
- **圖稿**: 目錄節點之間有藍色 Bezier 曲線表示 import 依賴關係
- **目前**: 節點之間完全沒有邊線（edge）
- **影響檔案**: `GraphCanvas.tsx`（dagre effect）、`graph-adapter.ts`（applyPerspective SF 分支）

### SF-4: 右側面板缺少 FUNCTIONS 統計 🟡
- **圖稿**: 右側面板顯示三項統計：FILES / FUNCTIONS / LINES
- **目前**: 只有 Files 和 Lines，缺少 Functions 數量
- **影響檔案**: SF 右側面板元件

### SF-5: 右側面板 FILES 列表缺少各檔案的 function 數量與展開 🔴
- **圖稿**: 每個檔案旁顯示 `4 fn`，點擊 ▶ 可展開顯示該檔案所有函式名稱（如 `fn_1()`, `fn_2()`）
- **目前**: 檔案列表有 ▶ 按鈕但展開後沒有函式內容，也沒有顯示 fn 數量
- **影響檔案**: SF 右側面板元件、core 分析引擎（需提供 per-file function 資訊）

---

## 二、邏輯運作 (LO)

### LO-1: 方法列表充滿噪音（最嚴重） 🔴🔴
- **圖稿**: Routes 16 個方法、Services 25 個、Middleware 2 個 — 全是有意義的業務方法（`upload()`, `googleLogin()` 等）
- **目前**: Routes 顯示 **214 個方法**，充斥 Python/SQLAlchemy 內部呼叫：`db.execute()`, `stmt.where()`, `select_from()`, `func.count()`, `datetime.combine()`, `total_users_result.scalar_one()` 等
- **根因**: `endpoint-detector.ts` 的 `buildPythonChainSteps` regex 抓取了所有函式呼叫，缺少足夠的過濾規則
- **影響檔案**: `packages/core/src/analyzers/endpoint-detector.ts`
- **同時影響**: LO 群組卡片 + DJ 步驟品質

### LO-2: 卡片點擊失效 🔴
- **圖稿**: 點擊方法名 → 進入呼叫鏈視圖
- **目前**: 點擊卡片顯示「No node found with id "lo-cat-routes"」— 右側面板嘗試查找原始 graph node，但 LO category card 使用合成 ID
- **影響檔案**: `GraphCanvas.tsx`（handleNodeClick 對 loCategoryCard 的處理）

### LO-3: 佈局層級順序不同 🟡
- **圖稿**: Middleware（頂）→ Services（中）→ Routes + Models + Utils（底）
- **目前**: Routes（右上）→ Services（被擠到中間）→ 佈局不一致
- **影響檔案**: `GraphCanvas.tsx`（useMemo 中 LO layers 定義）

### LO-4: 方法列表缺少來源檔案名稱 🟡
- **圖稿**: 每個方法旁邊顯示來源（如 `video-api`, `auth-api`, `billing-api`）
- **目前**: 只顯示方法名，沒有來源標註
- **影響檔案**: `LOCategoryCardNode.tsx`

### LO-5: 缺少 ★ 推薦入口標記 🟡
- **圖稿**: 部分方法前有 ★ 標記，代表推薦入口
- **目前**: 沒有此標記
- **影響檔案**: `LOCategoryCardNode.tsx`、LO 資料管線

### LO-6: 缺少頂部提示文字 🟡
- **圖稿**: 頂部顯示「點擊任一方法查看呼叫鏈 · ★ 為推薦入口」
- **目前**: 有 PerspectiveHint 但內容可能不同
- **影響檔案**: `PerspectiveHint` 元件

---

## 三、資料旅程 (DJ)

### DJ-1: 步驟充滿噪音 🔴🔴
- **圖稿**: 每條鏈 6-9 個有意義的步驟（`POST /videos/process`, `get_current_user()`, `extract_audio()` 等）
- **目前**: 一條鏈有 **19 個步驟**，充斥 SQLAlchemy 語法：`select()`, `outerjoin()`, `stmt.where()`, `VideoStatus()`, `func.count()`, `rows.scalars()` 等
- **根因**: 與 LO-1 相同 — `buildPythonChainSteps` 過濾不足
- **影響檔案**: `packages/core/src/analyzers/endpoint-detector.ts`

### DJ-2: 步驟描述只重複方法名 🟡
- **圖稿**: 每個步驟有中文描述（如「JWT Token 驗證」、「查詢影片記錄」、「推入 Celery 佇列」）
- **目前**: 描述欄位只顯示方法名重複（`request()` / `request()`）
- **影響檔案**: `DJStepNode.tsx` 或 chain 資料結構中的 description 欄位

### DJ-3: 右側面板缺少 INPUT/OUTPUT/TRANSFORM 區塊 🟡
- **圖稿**: 點擊步驟後右面板顯示 INPUT、OUTPUT、TRANSFORM、METHOD 四個區塊
- **目前**: 右面板只顯示 Location 基本資訊
- **影響檔案**: DJ 右側面板元件

### DJ-4: 選擇器卡片缺少中文描述 🟡
- **圖稿**: 端點卡片有中文描述（如「影片上傳」、「觸發處理」、「Google 登入」）
- **目前**: 端點卡片只有 HTTP method + path，無中文描述
- **影響檔案**: `DJSelectorCardNode.tsx`、endpoint-detector 資料

---

## 四、共通 UI 問題

### UI-1: 缺少「清除選取」按鈕 🔴
- **圖稿**: LO 呼叫鏈底部有「清除選取」按鈕，DJ 播放面板右側有「清除選取」按鈕
- **目前**: 兩個視角都沒有明顯的「清除選取」按鈕，用戶無法返回上一層
- **影響檔案**: `GraphCanvas.tsx`（LO chain 底部列）、DJ 面板元件

---

## 五、共通資料問題

### SHARED-1: Python chain step 過濾不足 🔴🔴（影響 LO + DJ）
- **根因**: `buildPythonChainSteps` 使用的 regex `(?:await\s+)?(?:(\w+)\.)?(\w+)\s*\(` 抓取了所有函式呼叫
- **skip list** 缺少大量 Python 內建/標準庫/ORM 方法
- **需要加入 skip list 的類型**:
  - Python 內建: `print`, `len`, `range`, `int`, `str`, `dict`, `list`, `set`, `type`, `isinstance`, `sorted`, `enumerate` 等
  - SQLAlchemy: `select`, `where`, `join`, `outerjoin`, `order_by`, `limit`, `offset`, `scalar_one`, `scalars`, `execute`, `subquery`, `desc`, `asc`, `func.*`, `and_`, `or_` 等
  - Pydantic/FastAPI: `BaseModel`, `Field`, `Depends`, `HTTPException`, `status` 等
  - datetime: `datetime.*`, `date.*`, `time.*`, `timedelta` 等
  - 通用 noise: `request`, `response`, `result`, `value`, `name`, `update`, `all`, `page` 等不具業務意義的單字方法

---

## 五、優先順序建議

| 優先級 | 項目 | 理由 |
|--------|------|------|
| P0 | SHARED-1 | 一次修好 LO-1 + DJ-1，影響最大 |
| P1 | SF-3 | SF 沒有連接線，結構關係看不出來 |
| P1 | LO-2 | LO 卡片點擊完全失效 |
| P1 | UI-1 | 沒有「清除選取」按鈕，無法返回 |
| P1 | SF-5 | 右面板檔案展開沒有 function 資訊 |
| P2 | SF-1 | 色條視覺區分 |
| P2 | LO-3 | 佈局層級順序 |
| P2 | LO-4 | 方法來源標註 |
| P2 | DJ-2 | 步驟描述 |
| P3 | SF-2, SF-4, LO-5, LO-6, DJ-3, DJ-4 | 細節完善 |
