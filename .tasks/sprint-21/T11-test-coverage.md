# 測試覆蓋

| 欄位 | 值 |
|------|-----|
| ID | T11 |
| 專案 | CodeAtlas |
| Sprint | Sprint 21 |
| 指派給 | test-writer-fixer |
| 優先級 | P0 |
| 狀態 | assigned |
| 依賴 | T7,T10 |
| 預估 | 3h |
| 建立時間 | 2026-04-09T08:56:57.895Z |

---

## 任務描述

i18n 相關測試：

1. **`packages/web/__tests__/i18n-setup.test.ts`**：
   - i18n 初始化測試
   - 語言偵測測試（localStorage > navigator > fallback）
   - changeLanguage 即時切換

2. **`packages/web/__tests__/i18n-completeness.test.ts`**：
   - en.json / zh-TW.json key 1:1 一致性（自動比對）
   - 無缺失 key、無多餘 key

3. **`packages/web/__tests__/i18n-components.test.tsx`**：
   - 關鍵元件雙語渲染（Toolbar, TabBar, WelcomePage, Settings）
   - 切換語言後 UI 文字更新

4. **`packages/core/__tests__/prompt-locale.test.ts`**：
   - Prompt 模板雙語輸出
   - 中文 Prompt 包含中文指令
   - 英文 Prompt 包含英文指令

5. **`packages/cli/__tests__/cli-i18n.test.ts`**：
   - CLI 翻譯載入器測試
   - `--lang` flag 解析測試

6. **整合測試**：
   - `packages/cli/__tests__/locale-chain.test.ts`：locale 傳遞鏈
   - `packages/cli/__tests__/server-locale.test.ts`：API locale 參數

7. **回歸測試**：確保舊測試零回歸

## 驗收標準

- [ ] 所有新測試通過
- [ ] 翻譯完整性 100%（en/zh-TW key 一致）
- [ ] `pnpm build` 零錯誤
- [ ] 舊測試零回歸
- [ ] `pnpm -r run test` 全通過

---

## 事件紀錄

### 2026-04-09T08:56:57.895Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
