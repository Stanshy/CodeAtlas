/**
 * CodeAtlas — SFDetailPanel Component (Sprint 13)
 *
 * 300px-wide right-side panel for the System Framework perspective.
 * Shown when a directory card is selected (click-select).
 *
 * Sections:
 *   1. Statistics: files / functions / lines
 *   2. Files: expandable list with function sub-rows
 *   3. Upstream: directories that import FROM this directory
 *   4. Downstream: directories this directory imports
 *
 * Design: white-paper theme (#fafafa background), consistent with Sprint 12.
 *
 * Sprint 13 — T4.
 */

import { useState, useMemo, type CSSProperties } from 'react';
import type { DirectoryGraph, GraphNode, GraphEdge } from '../types/graph';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SFDetailPanelProps {
  selectedNodeId: string | null;
  directoryGraph: DirectoryGraph | null;
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Estimate lines of code from fileSize (stored as fileCount in metadata) */
function estimateLines(fileCount: number): string {
  if (fileCount === 0) return '—';
  // Rough heuristic: ~170 lines per file on average
  const est = fileCount * 170;
  if (est >= 1000) return `~${Math.round(est / 100) * 100}`;
  return `~${est}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface FileRowProps {
  filePath: string;
  functions: GraphNode[];
}

function FileRow({ filePath, functions }: FileRowProps) {
  const [expanded, setExpanded] = useState(false);
  const fileName = filePath.split('/').pop() ?? filePath;
  const hasFunctions = functions.length > 0;

  const rowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 0',
    cursor: hasFunctions ? 'pointer' : 'default',
    userSelect: 'none',
  };

  const toggleStyle: CSSProperties = {
    width: 14,
    height: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    color: hasFunctions ? '#1565c0' : '#bdbdbd',
    flexShrink: 0,
    transition: 'transform 0.15s',
    transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
  };

  const fileNameStyle: CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: '#1a1a2e',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const countStyle: CSSProperties = {
    fontSize: 10,
    color: '#757575',
    flexShrink: 0,
  };

  return (
    <div>
      <div
        style={rowStyle}
        onClick={() => hasFunctions && setExpanded((v) => !v)}
        role={hasFunctions ? 'button' : undefined}
        tabIndex={hasFunctions ? 0 : undefined}
        onKeyDown={(e) => {
          if (hasFunctions && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        aria-expanded={hasFunctions ? expanded : undefined}
      >
        <span style={toggleStyle}>▶</span>
        <span style={fileNameStyle} title={filePath}>{fileName}</span>
        {hasFunctions && (
          <span style={countStyle}>{functions.length} fn{functions.length !== 1 ? 's' : ''}</span>
        )}
      </div>
      {expanded && hasFunctions && (
        <div style={{ paddingLeft: 20, borderLeft: '1px solid #e0e0e0', marginLeft: 7 }}>
          {functions.map((fn) => (
            <div
              key={fn.id}
              style={{
                padding: '2px 0 2px 8px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: '#424242',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={fn.label}
            >
              {fn.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SFDetailPanel({ selectedNodeId, directoryGraph, graphNodes, graphEdges }: SFDetailPanelProps) {
  // Which file paths expanded for function list
  const [_expandedFiles] = useState<Set<string>>(new Set());

  // Resolve selected directory node from directoryGraph
  const selectedDirNode = useMemo(() => {
    if (!selectedNodeId || !directoryGraph) return null;
    return directoryGraph.nodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [selectedNodeId, directoryGraph]);

  // Files in this directory: filter graphNodes to those whose filePath starts with selectedNodeId
  const dirFiles = useMemo<GraphNode[]>(() => {
    if (!selectedNodeId) return [];
    return graphNodes.filter((n) => {
      if (n.type !== 'file') return false;
      return n.filePath.startsWith(selectedNodeId + '/') || n.filePath === selectedNodeId;
    });
  }, [selectedNodeId, graphNodes]);

  // Function nodes: graphNodes with type 'function' that belong to the dir files
  const dirFileIds = useMemo(() => new Set(dirFiles.map((f) => f.id)), [dirFiles]);
  const dirFunctions = useMemo<GraphNode[]>(() => {
    return graphNodes.filter(
      (n) => n.type === 'function' && n.metadata?.parentFileId && dirFileIds.has(n.metadata.parentFileId),
    );
  }, [graphNodes, dirFileIds]);

  // Group functions by parent file id
  const functionsByFileId = useMemo<Map<string, GraphNode[]>>(() => {
    const map = new Map<string, GraphNode[]>();
    for (const fn of dirFunctions) {
      const fileId = fn.metadata.parentFileId!;
      if (!map.has(fileId)) map.set(fileId, []);
      map.get(fileId)!.push(fn);
    }
    return map;
  }, [dirFunctions]);

  // Statistics
  const fileCount = selectedDirNode?.fileCount ?? dirFiles.length;
  const functionCount = dirFunctions.length;
  const linesEstimate = estimateLines(fileCount);

  // Upstream: directoryGraph edges where target === selectedNodeId
  const upstreamDirs = useMemo<string[]>(() => {
    if (!selectedNodeId || !directoryGraph) return [];
    const sources = directoryGraph.edges
      .filter((e) => e.target === selectedNodeId)
      .map((e) => e.source);
    return [...new Set(sources)];
  }, [selectedNodeId, directoryGraph]);

  // Downstream: directoryGraph edges where source === selectedNodeId
  const downstreamDirs = useMemo<string[]>(() => {
    if (!selectedNodeId || !directoryGraph) return [];
    const targets = directoryGraph.edges
      .filter((e) => e.source === selectedNodeId)
      .map((e) => e.target);
    return [...new Set(targets)];
  }, [selectedNodeId, directoryGraph]);

  // Suppress unused
  void _expandedFiles;
  void graphEdges;

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  const panelStyle: CSSProperties = {
    width: 300,
    height: '100%',
    background: '#fafafa',
    borderLeft: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Inter', sans-serif",
    fontSize: 12,
    color: '#1a1a2e',
    overflowY: 'auto',
    flexShrink: 0,
  };

  const emptyStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9e9e9e',
    fontSize: 12,
    padding: 24,
    textAlign: 'center',
    gap: 8,
  };

  const headerStyle: CSSProperties = {
    padding: '14px 16px 10px',
    borderBottom: '1px solid #e8e8e8',
    fontWeight: 700,
    fontSize: 13,
    color: '#1565c0',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  };

  const sectionStyle: CSSProperties = {
    padding: '10px 16px',
    borderBottom: '1px solid #f0f0f0',
  };

  const sectionTitleStyle: CSSProperties = {
    fontWeight: 600,
    fontSize: 11,
    color: '#757575',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  };

  const statRowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '2px 0',
    fontSize: 12,
  };

  const statLabelStyle: CSSProperties = {
    color: '#616161',
  };

  const statValueStyle: CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 600,
    fontSize: 11,
    color: '#1a1a2e',
  };

  const depListStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  };

  const depItemStyle: CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: '#424242',
    background: '#f5f5f5',
    borderRadius: 3,
    padding: '2px 6px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const emptyDepStyle: CSSProperties = {
    fontSize: 11,
    color: '#bdbdbd',
    fontStyle: 'italic',
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!selectedNodeId || !selectedDirNode) {
    return (
      <div style={panelStyle}>
        <div style={emptyStyle}>
          <span style={{ fontSize: 24 }}>📂</span>
          <span>點擊目錄卡片查看詳情</span>
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span>📂</span>
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
          title={selectedNodeId}
        >
          {selectedDirNode.label}
        </span>
      </div>

      {/* Statistics section */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span>📊</span>
          <span>統計</span>
        </div>
        <div style={statRowStyle}>
          <span style={statLabelStyle}>檔案</span>
          <span style={statValueStyle}>{fileCount}</span>
        </div>
        <div style={statRowStyle}>
          <span style={statLabelStyle}>函式</span>
          <span style={statValueStyle}>{functionCount > 0 ? functionCount : '—'}</span>
        </div>
        <div style={statRowStyle}>
          <span style={statLabelStyle}>行數</span>
          <span style={statValueStyle}>{linesEstimate}</span>
        </div>
      </div>

      {/* Files section */}
      {dirFiles.length > 0 && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <span>📄</span>
            <span>檔案列表</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {dirFiles.map((file) => (
              <FileRow
                key={file.id}
                filePath={file.filePath}
                functions={functionsByFileId.get(file.id) ?? []}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upstream section */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span>⬆</span>
          <span>上游依賴 ({upstreamDirs.length})</span>
        </div>
        {upstreamDirs.length === 0 ? (
          <span style={emptyDepStyle}>無上游依賴</span>
        ) : (
          <div style={depListStyle}>
            {upstreamDirs.map((dir) => (
              <div key={dir} style={depItemStyle} title={dir}>
                {dir}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Downstream section */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span>⬇</span>
          <span>下游依賴 ({downstreamDirs.length})</span>
        </div>
        {downstreamDirs.length === 0 ? (
          <span style={emptyDepStyle}>無下游依賴</span>
        ) : (
          <div style={depListStyle}>
            {downstreamDirs.map((dir) => (
              <div key={dir} style={depItemStyle} title={dir}>
                {dir}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
