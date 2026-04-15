# 3D Bloom 後處理（P1）

| 欄位 | 值 |
|------|-----|
| ID | T9 |
| 專案 | CodeAtlas |
| Sprint | Sprint 11 |
| 指派給 | frontend-developer |
| 優先級 | P1 |
| 狀態 | created |
| 依賴 | T8 |
| 預估 | 2h |
| 建立時間 | 2026-04-01T14:00:00.000Z |

---

## 任務描述

Three.js UnrealBloomPass，資料旅程視角中選中路徑 Bloom 發光效果：

- EffectComposer + RenderPass + UnrealBloomPass
- 參數：strength 0.6, radius 0.4, threshold 0.85
- 只在資料旅程 + 3D + 有選中路徑時啟用
- 切換視角時關閉 Bloom
- WebGL 不支援 → 靜默降級

## 驗收標準

- [ ] 資料旅程 3D 路徑有 Bloom 效果
- [ ] 不影響其他視角
- [ ] 切換視角時正確關閉
- [ ] WebGL 降級不報錯

---

## 事件紀錄

### 2026-04-01T14:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
