# T7 三種右側面板 + 視角切換整合

| 欄位 | 值 |
|------|-----|
| ID | T7 |
| 專案 | CodeAtlas |
| Sprint | Sprint 13 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T4,T5,T6 |
| 預估 | 3h |
| 建立時間 | 2026-04-02T10:00:00.000Z |

---

## 任務描述

整合三種視角的右側面板 + 視角切換 + SVG 動態尺寸。

### 改造項目

1. **新增 `RightPanel.tsx`**（面板切換容器）：
   ```typescript
   function RightPanel({ perspective, ...props }) {
     switch (perspective) {
       case 'system-framework': return <SFDetailPanel {...props} />;
       case 'logic-operation': return <LODetailPanel {...props} />;
       case 'data-journey': return <DJPanel {...props} />;
     }
   }
   ```

2. **視角切換時面板自動切換**：無閃爍，狀態正確重置

3. **SVG 動態尺寸策略**：
   - 超出視窗時動態調整 viewBox + height
   - canvasWrap 加 scrollable class
   - LO 縮放控制：右下角 +/-/⊞（每次 ±15%）

4. **PerspectivePreset 更新**：
   - system-framework: interaction='sf-click-select', dataSource='directory'
   - logic-operation: interaction='lo-category-drill', dataSource='method'
   - data-journey: interaction='dj-endpoint-play', dataSource='endpoint'

5. **GraphCanvas.tsx 整合**：三種新渲染邏輯 + 面板切換

6. **2D/3D 適配**：3D 模式回退邏輯

## 驗收標準

- [ ] 三種面板正確切換
- [ ] SVG 超長內容可滾動
- [ ] 視角切換無閃爍
- [ ] PerspectivePreset 正確更新
- [ ] 2D/3D 回退正常

---

## 事件紀錄

### 2026-04-02T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
