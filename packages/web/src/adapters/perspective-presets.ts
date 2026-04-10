/**
 * CodeAtlas — Perspective Presets
 *
 * Three story-driven perspectives replacing Sprint 9 ViewMode presets.
 * Sprint 11 — T3.
 * Sprint 12 — T4: updated colorScheme/interaction values + dataSource field.
 * Sprint 19 — T13: wiki perspective entry added.
 */

import type { PerspectiveName, PerspectivePreset, DataSource } from '../types/graph';

export const PERSPECTIVE_PRESETS: Record<PerspectiveName, PerspectivePreset> = {
  'system-framework': {
    name: 'system-framework',
    label: 'perspective.systemFramework.label',
    description: 'perspective.systemFramework.description',
    layout: 'dagre-hierarchical',
    colorScheme: 'blue-paper',
    interaction: 'sf-click-select',   // Sprint 13: click-select + BFS highlight
    supports3D: false,
    dataSource: 'directory' as DataSource,
    filter: { nodeTypes: [], edgeTypes: ['import', 'export'] },
    display: {
      showHeatmap: false,
      showEdgeLabels: false,
      showParticles: false,
      labelDensity: 'all',
      expandFiles: false,
    },
  },
  'logic-operation': {
    name: 'logic-operation',
    label: 'perspective.logicOperation.label',
    description: 'perspective.logicOperation.description',
    layout: 'dagre-hierarchical',
    colorScheme: 'multi-paper',
    interaction: 'lo-category-drill', // Sprint 13: category drill
    supports3D: true,
    dataSource: 'method' as DataSource,  // Sprint 13: method-level data
    filter: { nodeTypes: [], edgeTypes: [] },
    display: {
      showHeatmap: false,
      showEdgeLabels: true,
      showParticles: true,
      labelDensity: 'smart',
      expandFiles: false,
    },
  },
  'data-journey': {
    name: 'data-journey',
    label: 'perspective.dataJourney.label',
    description: 'perspective.dataJourney.description',
    layout: 'path-tracing',
    colorScheme: 'green-paper',
    interaction: 'dj-endpoint-play',  // Sprint 13: endpoint playback
    supports3D: true,
    dataSource: 'endpoint' as DataSource, // Sprint 13: endpoint-level data
    filter: { nodeTypes: [], edgeTypes: [] },
    display: {
      showHeatmap: false,
      showEdgeLabels: true,
      showParticles: true,
      labelDensity: 'smart',
      expandFiles: false,
    },
  },
  // Sprint 19 T13: Wiki Knowledge Graph — D3 force graph, no ReactFlow
  wiki: {
    name: 'wiki',
    label: 'perspective.wiki.label',
    description: 'perspective.wiki.description',
    layout: 'force-directed',
    colorScheme: 'blue-paper',
    interaction: 'static-hierarchy',
    supports3D: false,
    dataSource: 'file' as DataSource,
    filter: { nodeTypes: [], edgeTypes: [] },
    display: {
      showHeatmap: false,
      showEdgeLabels: false,
      showParticles: false,
      labelDensity: 'all',
      expandFiles: false,
    },
  },
};
