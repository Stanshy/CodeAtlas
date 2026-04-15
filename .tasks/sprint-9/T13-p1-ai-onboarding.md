# AI 設定 UI + Onboarding overlay（P1）

| 欄位 | 值 |
|------|-----|
| ID | T13 |
| 專案 | CodeAtlas |
| Sprint | Sprint 9 |
| 指派給 | frontend-developer |
| 優先級 | P1 |
| 狀態 | deferred |
| 依賴 | T5,T9 |
| 預估 | 3h |
| 建立時間 | 2026-03-31T22:00:00.000Z |

---

## 任務描述

### S9-7 AI 設定 UI
- ControlPanel 第 5 區段「AI 設定」內容：
  - Provider 指示器：讀取 GET /api/ai/status，顯示當前 provider + mode
  - 隱私模式 badge：復用 PrivacyBadge 邏輯
  - 連線狀態燈號：green（connected）/ red（disconnected）/ gray（disabled）
  - Ollama 模型名稱顯示
- **不做**：runtime provider 切換（需 POST /api/settings 端點，延後）

### S9-8 Onboarding overlay
- 首次使用偵測：localStorage `codeatlas_onboarding_completed`
- 半透明 overlay（z-index: 100）
- spotlight 標註 5 個功能入口
- 「不再顯示」checkbox + 關閉按鈕
- Escape 可關閉

## 驗收標準

- [ ] AI 設定區段顯示 provider + mode + 連線狀態
- [ ] 隱私 badge 正確
- [ ] Onboarding overlay 首次使用顯示
- [ ] 可關閉 + 不再顯示
- [ ] localStorage flag 正確設定
- [ ] tsc 編譯通過

---

## 事件紀錄

### 2026-03-31T22:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-01T00:00:00.000Z — 延後至 Sprint 10
P1 任務，Sprint 9 時程內未執行。已移至 Sprint 10 開發計畫書 T12（S10-9）。
