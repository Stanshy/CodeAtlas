# Sprint 提案書: Sprint 13 — 方法/端點級三視角

> **提案人**: PM
> **日期**: 2026-04-02
> **專案**: CodeAtlas
> **Sprint 類型**: 核心體驗升級
> **六問診斷**: `proposal/sprint13-diagnosis.md`（全部通過，Q6 中等風險需監控）
> **前置 Sprint**: Sprint 12 — 白紙黑格 + 呈現邏輯重做（✅ 已完成，1235 tests）
> **方向決策**: 老闆決策 #19（2026-04-02）— 三種視角從檔案級升級為方法/端點級
> **核准圖稿**: `proposal/references/sprint13/method-level-mockup.html`（老闆已核准：「現在這版圖稿通過了 我要的就是這樣的效果」）
> **技術規格書**: `proposal/references/sprint13/method-level-mockup-spec.md`（11 章完整規格）

---

## 1. 目標

Sprint 12 讓畫面「好看了」，但老闆用 VideoBrief 實測後發現：資料旅程入口是檔案不是端點、邏輯運作追蹤檔案不是方法、系統框架聚合粒度太粗。三種視角無法正確呈現真實專案的架構。

Sprint 13 做一件大事：
1. **三種視角從「檔案級」升級為「方法/端點級」** — 讓使用者真正看懂程式邏輯，而不只是看到一堆檔案名

**一句話驗收**：用 VideoBrief 實測，資料旅程入口顯示 `POST /api/v1/videos/upload` 而非 `video-api.ts`；邏輯運作 click 方法後顯示流程圖；系統框架 frontend 自動展開子目錄。

---

## 2. 確認的流程

```
需求 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）
```

> **無 G1** — 核准圖稿（`proposal/references/sprint13/method-level-mockup.html`，2346 行完整 HTML）+ 技術規格書（11 章）已包含所有設計意圖、互動流程、資料結構與技術細節，TL 直接參照實作，無需額外設計階段。
> **core + web 雙層改動** — core 新增 API 端點識別，web 三種視角資料源從檔案級改為方法/端點級。

### 阻斷規則

- 無

---

## 3. 功能清單

### P0（必做）

| # | 功能 | 描述 |
|---|------|------|
| S13-1 | API 端點識別（core 層） | core 新增端點識別模組（`endpoint-detector.ts`）。解析 Express/Fastify 的 `router.get()` / `app.post()` 等 pattern，識別 API 端點定義。輸出端點列表（`POST /api/v1/videos/upload`、`GET /api/videos`）。型別 `ApiEndpoint`（PascalCase）。非標準框架 fallback 為檔案級 |
| S13-2 | 資料旅程 = API 端點入口 | **入口從檔案改為端點**。顯示 `POST /api/v1/videos/upload` 而非 `video-api.ts`。以 URL prefix 分類端點（`/api/v1/videos/*`、`/api/v1/auth/*`）。點擊端點 → 追蹤整條請求鏈（endpoint → middleware → controller → service → model → response）。350ms stagger animation 保留。右側面板：資料轉換面板（input / output / transform 三區，隨步驟切換） |
| S13-3 | 邏輯運作 = 分類群組 + 方法呼叫鏈流程圖 | **初始畫面**：方法按分類群組顯示（routes / services / controllers / models / middleware），每組一張卡片，內列方法名。**點擊方法** → 群組卡片消失 → 呼叫鏈以 dagre TB 分層佈局展開（每層 = 一個呼叫深度，像流程圖）。多色分類保留。右側面板：方法簽名面板（class + callers / callees + 複雜度指標） |
| S13-4 | 系統框架 = 智慧目錄聚合 | 自動展開不均衡大目錄（如 frontend 114 files，檔案占比 >70% → 展開為子目錄卡片）。保持 5~17 張目錄卡片。目錄間依賴箭頭正確計算。BFS highlight 保留。右側面板：目錄詳情面板（檔案清單 + 依賴統計 + 程式碼行數） |
| S13-5 | 三種右側面板 | 三種視角各自不同的右側面板內容。系統框架：目錄詳情（files + deps + stats）。邏輯運作：方法簽名（class + callers/callees + metrics）。資料旅程：資料轉換（input / output / transform per step）。面板隨視角切換自動切換 |
| S13-6 | 方法→位置映射 | 點擊任何方法節點 → 面板顯示：方法名 + 所屬 class + 所在檔案路徑。邏輯運作和資料旅程的方法節點都適用 |

### P1（應做，視時間）

| # | 功能 | 描述 |
|---|------|------|
| S13-7 | P1 累積收尾 | AI 輔助角色分類 + AI 設定 UI + Onboarding overlay（已延 4+ Sprint） |

---

## 4. 範圍界定

### 做

- core 新增 API 端點識別模組（Express/Fastify pattern matching）
- 資料旅程入口改為 API 端點，追蹤整條請求鏈
- 邏輯運作初始畫面改為分類群組卡片，click 展開方法呼叫鏈流程圖（dagre TB）
- 系統框架智慧聚合（自動展開不均衡大目錄）
- 三種視角各自獨立的右側面板
- 方法→位置映射（方法名 + class + 檔案路徑）
- **嚴格按照核准圖稿 + 技術規格書實作**

### 不做

- 多語言 Python/Java（Phase 5，Sprint 14）
- 自訂主題
- 變數級 taint analysis
- 動態分析（runtime trace）
- P1 累積收尾（再延一次，視時間處理）
- 非標準 API 框架的完整支援（fallback 為檔案級即可）
- 呼叫鏈深度 >10 層的完整展開（截斷 + 提示）

---

## 5. 團隊

| 角色 | Agent | 職責 |
|------|-------|------|
| L1 領導 | tech-lead | 端點識別架構設計、三視角方法級改造策略、Review、Gate 回報 |
| 前端開發 | frontend-developer | 三視角渲染改造（分類群組 + 流程圖 + 端點入口 + 智慧聚合）、三種右側面板、方法→位置映射 |
| 後端架構 | backend-architect | core 層端點識別模組（`endpoint-detector.ts`）、Graph JSON 擴充（endpoint 欄位） |
| 測試 | test-writer-fixer | 端點識別測試、三視角方法級測試、右側面板測試、全面回歸 |

---

## 6. 驗收標準

### API 端點識別驗收（S13-1）

- [ ] core 正確識別 Express `router.get/post/put/delete()` 端點
- [ ] core 正確識別 Fastify `app.get/post()` 端點
- [ ] 輸出格式包含 HTTP method + URL path（如 `POST /api/v1/videos/upload`）
- [ ] 非標準框架 graceful fallback 為檔案級
- [ ] 型別定義 `ApiEndpoint` 符合命名規範
- [ ] Graph JSON 擴充 endpoint 欄位
- [ ] 單元測試覆蓋（含 fallback 場景）
- [ ] 用 VideoBrief 驗證：能識別出 42 個 API 端點

### 資料旅程驗收（S13-2）

- [ ] 入口顯示 API 端點（`POST /api/v1/videos/upload`）而非檔案名
- [ ] 端點以 URL prefix 分類
- [ ] 點擊端點 → 追蹤完整請求鏈（endpoint → middleware → controller → service → model）
- [ ] 350ms stagger animation 正常
- [ ] 右側面板顯示資料轉換（input / output / transform），隨步驟切換
- [ ] 綠色色調保持（`#2e7d32` 邊框 + `#e8f5e9` 背景）
- [ ] 與核准圖稿一致

### 邏輯運作驗收（S13-3）

- [ ] 初始畫面：方法按分類群組顯示（5 類卡片：routes/services/controllers/models/middleware）
- [ ] 每張群組卡片內列方法名
- [ ] 點擊方法 → 群組消失 → 呼叫鏈以 dagre TB 佈局展開（每層 = 呼叫深度）
- [ ] 多色分類正確
- [ ] 右側面板顯示方法簽名（class + callers/callees + 複雜度指標）
- [ ] 與核准圖稿一致

### 系統框架驗收（S13-4）

- [ ] 不均衡大目錄自動展開（檔案占比 >70% → 展開子目錄）
- [ ] 目錄卡片數保持 5~17 張
- [ ] 目錄間依賴箭頭正確
- [ ] BFS highlight 正常運作
- [ ] 右側面板顯示目錄詳情（檔案清單 + 依賴統計 + 程式碼行數）
- [ ] 與核准圖稿一致
- [ ] 用 VideoBrief 驗證：frontend 展開為 7 個子目錄

### 右側面板驗收（S13-5）

- [ ] 三種視角各自顯示不同面板內容
- [ ] 系統框架：目錄詳情（files + deps + stats）
- [ ] 邏輯運作：方法簽名（class + callers/callees + metrics）
- [ ] 資料旅程：資料轉換（input / output / transform per step）
- [ ] 視角切換時面板自動切換

### 方法→位置映射驗收（S13-6）

- [ ] 點擊方法節點 → 面板顯示方法名 + 所屬 class + 所在檔案路徑
- [ ] 邏輯運作和資料旅程的方法節點都適用

### 回歸驗收

- [ ] 現有 1235+ tests 全部通過，零回歸
- [ ] Sprint 1-12 核心功能不受影響
- [ ] pnpm build 全通過

---

## 7. 風險

| 風險 | 等級 | 緩解方式 |
|------|------|---------|
| API 端點識別依賴 pattern matching | 中 | 僅支援 Express/Fastify 標準寫法，非標準框架 fallback 為檔案級。未來擴充 pattern |
| 三視角資料源從檔案級改為方法/端點級 | 中高 | 影響範圍大但圖稿 + 技術規格書已備齊，減少探索時間。1235 tests 保護回歸 |
| 邏輯運作初始畫面全新設計（分類群組） | 中 | 技術規格書第六章已定義完整互動流程和資料結構，TL 照規格實作 |
| 呼叫鏈可能很深（>10 層） | 低 | 截斷 + 提示，規格書已定義邊界情況處理 |
| 扁平專案無明確分層 | 低 | 智慧聚合回退機制，與 Sprint 12 一致 |
| core 新增模組影響既有解析 | 低 | 端點識別為獨立模組（`endpoint-detector.ts`），不影響既有 tree-sitter 解析 |

---

## 8. 初步時程

| 階段 | 任務 | 預估 |
|------|------|------|
| 設計 | 端點識別架構 + 三視角方法級改造策略（TL 參照核准圖稿 + 技術規格書） | 0.5 天 |
| 實作 — core | API 端點識別模組 + Graph JSON 擴充 | 1 天 |
| 實作 — 系統框架 | 智慧目錄聚合（自動展開不均衡大目錄）+ 目錄詳情面板 | 1 天 |
| 實作 — 邏輯運作 | 分類群組初始畫面 + click 展開呼叫鏈流程圖（dagre TB）+ 方法簽名面板 | 1.5 天 |
| 實作 — 資料旅程 | 端點入口 + 請求鏈追蹤 + 資料轉換面板 | 1.5 天 |
| 實作 — 共用 | 方法→位置映射 + 三種右側面板切換 + 視角切換適配 | 0.5 天 |
| 測試 | 端點識別 + 三視角方法級 + 右側面板 + 全面回歸 | 1 天 |

---

## 9. 關鍵指令：與 Sprint 12 的差異

> **⚠️ 本節為 TL 必讀。Sprint 13 不是視覺調整，是內容顆粒度的根本升級。**

### 資料旅程：從「檔案入口」到「API 端點入口」

| | Sprint 12 | Sprint 13 |
|---|-----------|-----------|
| 入口顯示 | 檔案名（`video-api.ts`） | API 端點（`POST /api/v1/videos/upload`） |
| 入口分類 | 無 | URL prefix 分類（`/api/v1/videos/*`） |
| 追蹤粒度 | 檔案間依賴 | 方法呼叫鏈（endpoint → middleware → controller → service → model） |
| 右側面板 | 步驟同步 | 資料轉換面板（input / output / transform） |

### 邏輯運作：從「dimmed + click 聚焦」到「分類群組 + 流程圖」

| | Sprint 12 | Sprint 13 |
|---|-----------|-----------|
| 初始畫面 | 所有節點 dimmed（opacity 0.08）+ 提示 | 方法按 5 類分群，每類一張卡片 |
| 節點內容 | 檔案節點 | 方法節點（`createVideo()`、`validateInput()`） |
| click 後 | 呼叫鏈亮起，非相關 opacity 0.08 | 群組消失 → dagre TB 流程圖展開 |
| 佈局 | 力導向 | dagre TB 分層（每層 = 呼叫深度） |
| 右側面板 | 呼叫鏈資訊 | 方法簽名（class + callers/callees + metrics） |

### 系統框架：從「固定聚合」到「智慧聚合」

| | Sprint 12 | Sprint 13 |
|---|-----------|-----------|
| 聚合策略 | 固定目錄聚合（所有目錄同等對待） | 智慧聚合（檔案占比 >70% 的大目錄自動展開子目錄） |
| 卡片數 | 5~15 | 5~17（大目錄展開後卡片更多） |
| 右側面板 | hover 子檔案列表 | 目錄詳情（檔案清單 + 依賴統計 + 程式碼行數） |

### 全視角：新增方法→位置映射

| | Sprint 12 | Sprint 13 |
|---|-----------|-----------|
| 節點資訊 | 檔案名 | 方法名 + class + 檔案路徑 |
| 右側面板 | 三種視角面板相同 | 三種視角面板各自不同 |

---

## 10. 參考文件

| 文件 | 說明 |
|------|------|
| `proposal/references/sprint13/method-level-mockup.html` | 核准圖稿（2346 行，VideoBrief 真實數據） |
| `proposal/references/sprint13/method-level-mockup-spec.md` | 技術規格書（11 章完整規格） |
| `proposal/sprint13-diagnosis.md` | 六問診斷報告 |
| `proposal/roadmap.md` | 路線圖 v4.0（Phase 4 = Sprint 13） |
| `.knowledge/sprint7-function-architecture.md` | Sprint 7 函式級解析架構（core 已有 FunctionNode/ClassNode） |

---

## G0 審核

**老闆決策**: [x] 通過

**審核意見**: 老闆 2026-04-02 確認通過。無需額外設計圖稿階段，核准 HTML 圖稿 + 技術規格書直接作為實作規範。

**確認的流程**: 需求 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）
