# i18n 框架建立

| 欄位 | 值 |
|------|-----|
| ID | T3 |
| 專案 | CodeAtlas |
| Sprint | Sprint 21 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | assigned |
| 依賴 | T2 |
| 預估 | 1h |
| 建立時間 | 2026-04-09T08:56:57.895Z |

---

## 任務描述

安裝 react-i18next + i18next，建立 Web i18n 基礎框架：

1. **安裝依賴**：`pnpm --filter @codeatlas/web add react-i18next i18next`
2. **建立 `packages/web/src/locales/index.ts`**：
   - i18next 初始化
   - 語言偵測順序：`localStorage('codeatlas-locale') → navigator.language → 'en'`
   - `navigator.language` 為 `'zh-TW'` 或 `'zh'` 時映射為 `'zh-TW'`
   - fallbackLng: `'en'`
3. **建立空骨架**：`en.json` 和 `zh-TW.json`（基本結構，key 待 T4/T5 填充）
4. **App.tsx 引入**：`import './locales'`
5. 確保 `useTranslation()` 可在任意元件使用

## 驗收標準

- [ ] `react-i18next` 和 `i18next` 已安裝
- [ ] `packages/web/src/locales/index.ts` 初始化完成
- [ ] 語言偵測邏輯正確（localStorage > navigator > 'en'）
- [ ] `App.tsx` 已引入 i18n 初始化
- [ ] `useTranslation()` 可在任意元件使用
- [ ] `pnpm build` 零錯誤

---

## 事件紀錄

### 2026-04-09T08:56:57.895Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
