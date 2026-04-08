/**
 * CodeAtlas — Core Type Definitions
 *
 * All data model types for graph nodes, edges, analysis results,
 * and AI summary provider contracts.
 */

// === Node Types ===

export type NodeType = 'directory' | 'file' | 'function' | 'class';

// Sprint 10: Node Role Classification
export type NodeRole = 'business-logic' | 'cross-cutting' | 'infrastructure' | 'utility' | 'noise';

// Sprint 18: Multi-language support
export type SupportedLanguage = 'javascript' | 'typescript' | 'python' | 'java';

// Sprint 7: function parameter descriptor
export interface FunctionParam {
  name: string;
  type?: string;
  isOptional?: boolean;
  isRest?: boolean;
}

export interface NodeMetadata {
  fileSize?: number;           // bytes
  language?: string;           // 'javascript' | 'typescript'
  exportCount?: number;        // export 數量
  importCount?: number;        // import 數量
  dependencyCount?: number;    // 被依賴次數
  lastModified?: string;       // ISO 8601

  // Sprint 10: Node role classification
  role?: NodeRole;

  // Sprint 7: function/class node metadata
  parentFileId?: string;
  kind?: 'function' | 'method' | 'getter' | 'setter' | 'constructor' | 'class';
  parameters?: FunctionParam[];
  returnType?: string;
  lineCount?: number;
  startLine?: number;          // 0-based line number of function/class start
  endLine?: number;            // 0-based line number of function/class end
  isAsync?: boolean;
  isExported?: boolean;
  methodCount?: number;

  // Sprint 14: AI method analysis
  methodRole?: string;        // MethodRole enum value
  roleConfidence?: number;    // 0-1 confidence score
  aiSummary?: string;         // AI one-line summary
}

export interface GraphNode {
  id: string;                  // 唯一識別（使用相對檔案路徑）
  type: NodeType;              // 'directory' | 'file' | 'function' | 'class'
  label: string;               // 顯示名稱
  filePath: string;            // 相對於專案根目錄的路徑
  metadata: NodeMetadata;      // 附加資訊
}

// === Edge Types ===

export type EdgeType = 'import' | 'export' | 'data-flow' | 'call';

export interface EdgeMetadata {
  importedSymbols?: string[];  // 被 import 的 symbol 名稱
  isDefault?: boolean;         // 是否為 default import
  isDynamic?: boolean;         // 是否為 dynamic import
  confidence?: 'high' | 'medium' | 'low'; // 分析信心度

  // Sprint 7: call edge metadata
  callerName?: string;
  calleeName?: string;
  callType?: 'direct' | 'method' | 'new';
}

export interface GraphEdge {
  id: string;                  // 唯一識別
  source: string;              // 來源 node id
  target: string;              // 目標 node id
  type: EdgeType;              // 'import' | 'export' | 'data-flow' | 'call'
  metadata: EdgeMetadata;      // 附加資訊
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

  // Sprint 7: function-level stats
  totalFunctions?: number;
  totalClasses?: number;
  totalCallEdges?: number;
}

export interface AnalysisError {
  filePath: string;
  error: string;
  phase: 'scan' | 'parse' | 'analyze';
}

export interface AnalysisResult {
  version: string;             // schema 版本
  projectPath: string;         // 專案根目錄
  analyzedAt: string;          // ISO 8601 分析時間
  stats: AnalysisStats;        // 統計資訊
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  errors: AnalysisError[];     // 解析失敗的檔案
}

// === AI Summary Provider ===

export interface SummaryContext {
  filePath: string;
  language: string;
  imports: string[];
  exports: string[];
}

export interface SummaryProvider {
  name: string;
  isConfigured(): boolean;
  summarize(code: string, context: SummaryContext): Promise<string>;
}
