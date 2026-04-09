# CLI 訊息 i18n

| 欄位 | 值 |
|------|-----|
| ID | T10 |
| 專案 | CodeAtlas |
| Sprint | Sprint 21 |
| 指派給 | backend-architect |
| 優先級 | P2 |
| 狀態 | assigned |
| 依賴 | T9 |
| 預估 | 2h |
| 建立時間 | 2026-04-09T08:56:57.895Z |

---

## 任務描述

CLI 終端訊息 i18n 化：

1. **新增 `packages/cli/src/i18n.ts`**：
   - 輕量翻譯載入器（不引 i18next）
   - 讀取 JSON 翻譯檔
   - 提供 `t(key)` 函式
   - locale 解析：`--lang flag > .codeatlas.json > CODEATLAS_LANG env > 'en'`

2. **新增翻譯檔**：
   - `packages/cli/src/locales/en.json`（CLI 英文訊息）
   - `packages/cli/src/locales/zh-TW.json`（CLI 中文訊息）

3. **`packages/cli/src/index.ts`**：
   - 全域 `--lang` 選項（`-l, --lang <locale>`）

4. **`packages/cli/src/commands/web.ts`**：
   - locale 解析 + 傳遞給 server

5. **終端輸出 i18n 化**：
   - 進度訊息、錯誤訊息、幫助文字

## 驗收標準

- [ ] `--lang en` 切換 CLI 為英文輸出
- [ ] `--lang zh-TW` 切換 CLI 為中文輸出
- [ ] 預設英文
- [ ] 輕量載入器不依賴 i18next
- [ ] `pnpm build` 零錯誤

---

## 事件紀錄

### 2026-04-09T08:56:57.895Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
