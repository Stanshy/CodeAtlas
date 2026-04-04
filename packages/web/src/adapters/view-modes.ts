/**
 * CodeAtlas — View Mode Presets
 *
 * Each view mode is a combination of filter + display settings.
 * Sprint 9 — S9-2.
 *
 * @deprecated This module is deprecated as of Sprint 11.
 * Use `perspective-presets.ts` and `PerspectiveName` instead.
 * This file will be removed in Sprint 12+.
 */

import type { ViewModeName, NodeType, EdgeType } from '../types/graph';

export interface ViewModePreset {
  name: ViewModeName;
  label: string;
  description: string;
  filter: {
    nodeTypes: NodeType[];   // empty = select all
    edgeTypes: EdgeType[];   // empty = select all
  };
  display: {
    showHeatmap: boolean;
    showEdgeLabels: boolean;
    showParticles: boolean;
    labelDensity: 'all' | 'smart' | 'none';
    expandFiles: boolean;
  };
}

export const VIEW_MODE_PRESETS: Record<ViewModeName, ViewModePreset> = {
  panorama: {
    name: 'panorama',
    label: '全景模式',
    description: '所有節點 + 所有邊，預設佈局',
    filter: { nodeTypes: [], edgeTypes: [] },
    display: {
      showHeatmap: false,
      showEdgeLabels: false,
      showParticles: true,
      labelDensity: 'smart',
      expandFiles: false,
    },
  },
  dependency: {
    name: 'dependency',
    label: '依賴視圖',
    description: '聚焦 import/export 邊，dim 其他',
    filter: { nodeTypes: [], edgeTypes: ['import', 'export'] },
    display: {
      showHeatmap: false,
      showEdgeLabels: false,
      showParticles: true,
      labelDensity: 'smart',
      expandFiles: false,
    },
  },
  dataflow: {
    name: 'dataflow',
    label: '資料流視圖',
    description: '聚焦 data-flow + export 邊 + symbol 標籤 + heatmap',
    filter: { nodeTypes: [], edgeTypes: ['data-flow', 'export'] },
    display: {
      showHeatmap: true,
      showEdgeLabels: true,
      showParticles: true,
      labelDensity: 'all',
      expandFiles: false,
    },
  },
  callchain: {
    name: 'callchain',
    label: '呼叫鏈視圖',
    description: '聚焦 call 邊 + 函式節點，自動展開檔案',
    filter: { nodeTypes: ['function', 'class', 'file'], edgeTypes: ['call'] },
    display: {
      showHeatmap: false,
      showEdgeLabels: true,
      showParticles: false,
      labelDensity: 'all',
      expandFiles: true,
    },
  },
};
