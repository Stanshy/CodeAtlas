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
    label: 'perspective.panorama.label',
    description: 'perspective.panorama.description',
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
    label: 'perspective.dependency.label',
    description: 'perspective.dependency.description',
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
    label: 'perspective.dataflow.label',
    description: 'perspective.dataflow.description',
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
    label: 'perspective.callchain.label',
    description: 'perspective.callchain.description',
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
