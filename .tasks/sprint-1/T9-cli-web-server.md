# CLI `web` 指令 + 本地 Server

| 欄位 | 值 |
|------|-----|
| ID | T9 |
| 專案 | CodeAtlas |
| Sprint | Sprint 1 |
| 指派給 | frontend-developer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T6,T8 |
| 預估 | 2h |
| 建立時間 | 2026-03-30T10:00:00.000Z |

---

## 任務描述

實作 `codeatlas web` CLI 指令，啟動 Fastify 本地 server，serve 佔位頁 + Graph JSON API。

### 具體工作

1. 讀取 `.knowledge/specs/api-design.md` Server API 區段
2. 實作 `packages/cli/src/server.ts`：
   - 使用 Fastify 建立 HTTP server
   - 靜態檔案 serve：`packages/web/` 目錄
   - API endpoint: `GET /api/graph` — 回傳 `.codeatlas/analysis.json`
   - API endpoint: `GET /api/health` — 健康檢查
3. 實作 `packages/cli/src/commands/web.ts`：
   - 啟動 server，預設 port 3000
   - 自動開啟瀏覽器
   - 支援 `--port` 參數
4. 在 `packages/cli/src/index.ts` 註冊 `web` 子指令
5. 確保 `packages/web/index.html` 佔位頁可正常顯示

### 規範參考

- `.knowledge/specs/api-design.md` Server API 區段
- `.knowledge/specs/feature-spec.md` CLI web 區段

## 驗收標準

- [x] `codeatlas web` 可啟動本地 server（Fastify v5）
- [x] 瀏覽器開啟可見佔位頁（GitHub Dark 主題，含 stats cards + JSON 預覽）
- [x] `GET /api/graph` 回傳 analysis.json 內容
- [x] `GET /api/health` 回傳 `{ status: "ok", version: "0.1.0" }`
- [x] `--port` 參數可自訂 port（含 1-65535 驗證）
- [x] Server 啟動/關閉時有清楚的 console 輸出（含 SIGINT 優雅關閉）

---

## 事件紀錄

### 2026-03-30T10:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-30T13:00:00.000Z — 狀態變更 → in_review
frontend-developer 完成。Fastify server 4 端點 + @fastify/static + 自動 analyze + 自動開瀏覽器 + 佔位頁 fetch stats/graph。

### 2026-03-30T13:01:00.000Z — 狀態變更 → done
L1 審核通過。API 端點符合 api-design.md，錯誤碼正確（503/404），佔位頁互動良好。
