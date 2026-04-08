/**
 * CodeAtlas Web — Graph Type Definitions
 *
 * Re-defined from @codeatlas/core types for web package isolation.
 * Web package does not directly depend on core — it consumes data via API.
 */

// === Node Types ===

export type NodeType = 'directory' | 'file' | 'function' | 'class';

// Sprint 10: Node Role Classification
export type NodeRole = 'business-logic' | 'cross-cutting' | 'infrastructure' | 'utility' | 'noise';

// Sprint 7: Function-level types
export interface FunctionParam {
  name: string;
  type?: string;
  isOptional?: boolean;
  isRest?: boolean;
}

export interface NodeMetadata {
  fileSize?: number;
  language?: string;
  exportCount?: number;
  importCount?: number;
  dependencyCount?: number;
  lastModified?: string;

  // Sprint 10: Node role classification
  role?: NodeRole;

  // Sprint 7 additions
  parentFileId?: string;
  kind?: 'function' | 'method' | 'getter' | 'setter' | 'constructor' | 'class';
  parameters?: FunctionParam[];
  returnType?: string;
  lineCount?: number;
  isAsync?: boolean;
  isExported?: boolean;
  methodCount?: number;

  // Sprint 14: AI method analysis
  methodRole?: string;        // MethodRole enum value
  roleConfidence?: number;    // 0-1 confidence score
  aiSummary?: string;         // AI one-line summary
}

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  filePath: string;
  metadata: NodeMetadata;
}

// === Edge Types ===

export type EdgeType = 'import' | 'export' | 'data-flow' | 'call';

export interface EdgeMetadata {
  importedSymbols?: string[];
  isDefault?: boolean;
  isDynamic?: boolean;
  confidence?: 'high' | 'medium' | 'low';

  // Sprint 7 additions
  callerName?: string;
  calleeName?: string;
  callType?: 'direct' | 'method' | 'new';
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  metadata: EdgeMetadata;
}

// === Analysis Result ===

export interface AnalysisStats {
  totalFiles: number;
  analyzedFiles: number;
  skippedFiles: number;
  failedFiles: number;
  totalNodes: number;
  totalEdges: number;
  analysisDurationMs: number;
}

export interface AnalysisError {
  filePath: string;
  error: string;
  phase: 'scan' | 'parse' | 'analyze';
}

// === Sprint 13: Endpoint Graph Types ===

export interface EndpointNode {
  id: string;
  label: string;
  method?: string;
  path?: string;
  filePath: string;
  kind: 'endpoint' | 'method' | 'handler';
  /** Sprint 15.1: AI-generated description */
  description?: string;
}

export interface EndpointEdge {
  source: string;
  target: string;
  weight: number;
}

export interface EndpointGraph {
  nodes: EndpointNode[];
  edges: EndpointEdge[];
}

// === Sprint 13: DJ Chain Types ===

export interface DJChainStep {
  name: string;
  desc: string;
  input?: string;
  output?: string;
  transform?: string;
  method?: string;
  file?: string;
}

export interface EndpointChain {
  id: string;
  method: string;
  path: string;
  desc: string;
  steps: DJChainStep[];
}

export interface AnalysisResult {
  version: string;
  projectPath: string;
  analyzedAt: string;
  stats: AnalysisStats;
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  /** Sprint 12: optional directory-level graph for system-framework perspective */
  directoryGraph?: DirectoryGraph;
  /** Sprint 13: optional endpoint-level graph for data-journey / logic-operation perspectives */
  endpointGraph?: EndpointGraph;
  errors: AnalysisError[];
}

// === API Response Types ===

export interface NodeDetailResponse {
  node: GraphNode;
  edges: GraphEdge[];
  sourceCode: string | null;
}

// === Sprint 7: Function Nodes Response ===

export interface FunctionNodesResponse {
  fileId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// === AI Response Types ===

export interface AiSummaryResponse {
  nodeId: string;
  summary: string;
  provider: string;
  cached: boolean;
}

export interface AiStatusResponse {
  enabled: boolean;
  provider: string;
  mode?: 'disabled' | 'local' | 'cloud';
  privacyLevel?: 'none' | 'full' | 'partial';
  model?: string | null;
}

// === Sprint 8: Impact Analysis Types ===

export interface ImpactAnalysisResult {
  impactedNodes: string[];
  impactedEdges: string[];
  depthMap: Record<string, number>;
  truncated: boolean;
}

// === Sprint 8: Filter Types ===

export interface FilterState {
  directories: string[];
  nodeTypes: NodeType[];
  edgeTypes: EdgeType[];
}

// === Sprint 8: AI Overview Types ===

export interface StructureInfo {
  totalFiles: number;
  totalFunctions: number;
  totalClasses: number;
  topModules: Array<{
    path: string;
    dependencyCount: number;
    importCount: number;
    exportCount: number;
  }>;
  moduleRelationships: Array<{
    source: string;
    target: string;
    edgeCount: number;
  }>;
}

export interface AiOverviewResponse {
  overview: string;
  provider: string;
  cached: boolean;
  structureInfo: {
    totalFiles: number;
    totalFunctions: number;
    topModules: Array<{ path: string; dependencyCount: number }>;
  };
}

export interface AiSearchKeywordsResponse {
  keywords: string[];
  originalQuery: string;
}

// === Sprint 9: View Mode Types ===

/**
 * @deprecated Use PerspectiveName instead. ViewModeName will be removed in Sprint 12+.
 */
export type ViewModeName = 'panorama' | 'dependency' | 'dataflow' | 'callchain';

// === Sprint 11: Perspective (Story View) Types ===

export type PerspectiveName = 'system-framework' | 'logic-operation' | 'data-journey';

export type LayoutEngine = 'dagre-hierarchical' | 'force-directed' | 'path-tracing';
export type ColorScheme =
  | 'cyan-monochrome'
  | 'neon-multicolor'
  | 'green-monochrome'
  | 'blue-paper'
  | 'multi-paper'
  | 'green-paper';
export type InteractionMode =
  | 'static-hierarchy'
  | 'bfs-hover-highlight'
  | 'stagger-playback'
  | 'directory-hover'
  | 'bfs-click-focus'
  | 'stagger-appear'
  | 'sf-click-select'   // Sprint 13: system-framework click-select + BFS highlight
  | 'lo-category-drill' // Sprint 13: logic-operation category drill
  | 'dj-endpoint-play'; // Sprint 13: data-journey endpoint playback

// === Sprint 12: DataSource ===

export type DataSource = 'directory' | 'file' | 'endpoint' | 'method';

// === Sprint 12: Directory-level Graph Types ===

export type DirectoryType = 'entry' | 'logic' | 'data' | 'support';

/** Sprint 13: category for the directory (frontend / backend / infra) */
export type DirectoryCategory = 'frontend' | 'backend' | 'infra';

export interface DirectoryNode {
  id: string;
  label: string;
  type: DirectoryType;
  fileCount: number;
  files: string[];
  role: string;
  /** Sprint 13: full path shown below the card label */
  sublabel?: string;
  /** Sprint 13: logical category for left-border color accent */
  category?: DirectoryCategory;
  /** Sprint 13: true when smart aggregation chose to auto-expand this node */
  autoExpand?: boolean;
}

export interface DirectoryEdge {
  source: string;
  target: string;
  weight: number;
}

export interface DirectoryGraph {
  nodes: DirectoryNode[];
  edges: DirectoryEdge[];
}

export interface PerspectivePreset {
  name: PerspectiveName;
  label: string;
  description: string;
  layout: LayoutEngine;
  colorScheme: ColorScheme;
  interaction: InteractionMode;
  supports3D: boolean;
  /** Sprint 12: which data source this perspective reads from */
  dataSource: DataSource;
  filter: {
    nodeTypes: NodeType[];
    edgeTypes: EdgeType[];
  };
  display: {
    showHeatmap: boolean;
    showEdgeLabels: boolean;
    showParticles: boolean;
    labelDensity: 'all' | 'smart' | 'none';
    expandFiles: boolean;
  };
}

export interface DisplayPrefs {
  showEdgeLabels: boolean;
  showParticles: boolean;
  labelDensity: 'all' | 'smart' | 'none';
  impactDefaultDepth: number;
}

// === Sprint 13: LO Call Chain Types ===

export type LoCategory = 'routes' | 'middleware' | 'services' | 'models' | 'utils';

export interface ChainStep {
  /** Unique id within the chain (used as React key) */
  id: string;
  /** Display name of the method */
  methodName: string;
  /** Category of the method (determines color bar) */
  category: LoCategory;
  /** Source file path (for sub-label) */
  filePath: string;
  /** Class or module name (optional) */
  className?: string;
  /** 0-based layer index */
  depth: number;
}

export interface E2EStep {
  nodeId: string;
  nodeLabel: string;
  edgeId: string | null;
  edgeType: string | null;
  symbols: string[];
  depth: number;
}

export interface E2ETracingResult {
  path: string[];
  edges: string[];
  steps: E2EStep[];
  truncated: boolean;
}

export interface E2ETracingState {
  active: boolean;
  startNodeId: string | null;
  path: string[];
  edges: string[];
  steps: E2EStep[];
  maxDepth: number;
  truncated: boolean;
}

// ---------------------------------------------------------------------------
// Sprint 16: AI Job & Configure types
// ---------------------------------------------------------------------------

export type AIJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cached' | 'canceled';

export type AIJobScope = 'directory' | 'method' | 'method-group' | 'endpoint' | 'all' | 'core';

export interface AIJob {
  jobId: string;
  scope: AIJobScope;
  target?: string;
  status: AIJobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  force: boolean;
  /** AI analysis result (populated on succeeded/cached) */
  result?: Record<string, unknown> | null;
}

export interface AIAnalyzeResponse {
  ok: boolean;
  job: AIJob;
}

export interface AIJobResponse {
  ok: boolean;
  job: AIJob;
}

export interface AIConfigureResult {
  ok: boolean;
  provider: string;
  persisted: boolean;
  message: string;
}

export interface AIJobMetrics {
  totalJobs: number;
  successCount: number;
  failCount: number;
  cacheHitCount: number;
  cacheHitRate: number;
  analyzeSuccessRate: number;
}
