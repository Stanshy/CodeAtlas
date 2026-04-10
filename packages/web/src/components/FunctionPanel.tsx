/**
 * CodeAtlas — FunctionPanel Component
 *
 * Detail panel for function/class nodes. Shows:
 * - Full function signature with async modifier, params, and return type
 * - Parameter list with types
 * - Call chain: callers and callees (clickable to navigate)
 * - For class nodes: method count summary
 *
 * Sprint 7 — T11
 */

import { memo, useMemo } from 'react';
import { colors } from '../styles/theme';
import type { GraphNode, GraphEdge, FunctionParam } from '../types/graph';
import { traceCallChain } from '../hooks/useCallChain';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const sectionTitleStyles: React.CSSProperties = {
  color: colors.text.secondary,
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  marginBottom: 8,
  marginTop: 20,
};

const metaRowStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '3px 0',
  fontSize: 12,
  color: colors.text.primary,
};

const metaLabelStyles: React.CSSProperties = {
  color: colors.text.muted,
};

const monoStyles: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  fontSize: 12,
  color: colors.text.primary,
  background: 'rgba(255, 255, 255, 0.04)',
  borderRadius: 4,
  padding: '8px 10px',
  wordBreak: 'break-all',
  lineHeight: 1.6,
};

const linkStyles: React.CSSProperties = {
  color: colors.primary.DEFAULT,
  cursor: 'pointer',
  fontSize: 12,
  textDecoration: 'none',
  display: 'block',
  padding: '2px 0',
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
};

const badgeStyles: React.CSSProperties = {
  display: 'inline-block',
  fontSize: 9,
  fontWeight: 600,
  borderRadius: 3,
  padding: '1px 5px',
  marginRight: 4,
};

// ---------------------------------------------------------------------------
// Helper: build function signature string
// ---------------------------------------------------------------------------

function buildSignature(node: GraphNode): string {
  const meta = node.metadata;
  const parts: string[] = [];

  if (meta.isAsync) parts.push('async');
  if (meta.kind === 'class') {
    parts.push(`class ${node.label}`);
    return parts.join(' ');
  }

  parts.push(`function ${node.label}`);

  if (meta.parameters && meta.parameters.length > 0) {
    const paramStr = meta.parameters
      .map((p) => {
        let s = p.isRest ? `...${p.name}` : p.name;
        if (p.isOptional) s += '?';
        if (p.type) s += `: ${p.type}`;
        return s;
      })
      .join(', ');
    // Replace "function name" with "function name(params)"
    const last = parts.pop() ?? '';
    parts.push(`${last}(${paramStr})`);
  } else {
    const last = parts.pop() ?? '';
    parts.push(`${last}()`);
  }

  if (meta.returnType) {
    parts[parts.length - 1] += `: ${meta.returnType}`;
  }

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FunctionPanelProps {
  node: GraphNode;
  allNodes: GraphNode[];
  allEdges: GraphEdge[];
  onNavigate?: ((nodeId: string) => void) | undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function FunctionPanelInner({
  node,
  allNodes,
  allEdges,
  onNavigate,
}: FunctionPanelProps) {
  const meta = node.metadata;

  // Build call chain
  const { path: callerPath, edges: callerEdgeIds } = useMemo(
    () => traceCallChain(node.id, allEdges, 'callers', 3),
    [node.id, allEdges],
  );
  const { path: calleePath, edges: calleeEdgeIds } = useMemo(
    () => traceCallChain(node.id, allEdges, 'callees', 3),
    [node.id, allEdges],
  );

  // Remove the start node from both paths
  const callerIds = callerPath.filter((id) => id !== node.id);
  const calleeIds = calleePath.filter((id) => id !== node.id);

  // Suppress unused edge ID arrays — they're derived and available for future use
  void callerEdgeIds;
  void calleeEdgeIds;

  // Build label lookup
  const nodeLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of allNodes) {
      map.set(n.id, n.label);
    }
    return map;
  }, [allNodes]);

  const params = meta.parameters;
  const isClass = node.type === 'class';

  return (
    <div>
      {/* Function Signature */}
      <div style={{ ...sectionTitleStyles, marginTop: 0 }}>Signature</div>
      <pre style={monoStyles}>{buildSignature(node)}</pre>

      {/* Badges */}
      <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {meta.isAsync && (
          <span
            style={{
              ...badgeStyles,
              color: colors.neon.cyan.dim,
              background: 'rgba(0, 153, 204, 0.15)',
            }}
          >
            async
          </span>
        )}
        {meta.isExported && (
          <span
            style={{
              ...badgeStyles,
              color: '#84cc16',
              background: 'rgba(163, 230, 53, 0.12)',
            }}
          >
            exported
          </span>
        )}
        {meta.kind && (
          <span
            style={{
              ...badgeStyles,
              color: colors.text.secondary,
              background: 'rgba(255, 255, 255, 0.07)',
            }}
          >
            {meta.kind}
          </span>
        )}
      </div>

      {/* Metadata */}
      <div style={sectionTitleStyles}>Info</div>
      {meta.lineCount !== undefined && (
        <div style={metaRowStyles}>
          <span style={metaLabelStyles}>Lines</span>
          <span>{meta.lineCount}</span>
        </div>
      )}
      {isClass && meta.methodCount !== undefined && (
        <div style={metaRowStyles}>
          <span style={metaLabelStyles}>Methods</span>
          <span>{meta.methodCount}</span>
        </div>
      )}
      {meta.parentFileId && (
        <div style={metaRowStyles}>
          <span style={metaLabelStyles}>File</span>
          <span
            style={{
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 220,
            }}
          >
            {meta.parentFileId}
          </span>
        </div>
      )}

      {/* Parameters */}
      {!isClass && params && params.length > 0 && (
        <>
          <div style={sectionTitleStyles}>Parameters ({params.length})</div>
          {params.map((p, i) => (
            <div
              key={`param-${i}-${p.name}`}
              style={{
                ...metaRowStyles,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontSize: 11,
              }}
            >
              <span style={{ color: colors.text.primary }}>
                {p.isRest ? '...' : ''}{p.name}{p.isOptional ? '?' : ''}
              </span>
              {p.type && (
                <span style={{ color: colors.text.muted }}>{p.type}</span>
              )}
            </div>
          ))}
        </>
      )}

      {/* Return type */}
      {!isClass && meta.returnType && (
        <>
          <div style={sectionTitleStyles}>Return Type</div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: 12,
              color: colors.text.primary,
            }}
          >
            {meta.returnType}
          </div>
        </>
      )}

      {/* Callers */}
      {callerIds.length > 0 && (
        <>
          <div style={sectionTitleStyles}>Called By ({callerIds.length})</div>
          {callerIds.map((id) => (
            <div
              key={id}
              style={linkStyles}
              onClick={() => onNavigate?.(id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onNavigate?.(id)}
              aria-label={`Navigate to caller: ${nodeLabels.get(id) ?? id}`}
            >
              {nodeLabels.get(id) ?? id}
            </div>
          ))}
        </>
      )}

      {/* Callees */}
      {calleeIds.length > 0 && (
        <>
          <div style={sectionTitleStyles}>Calls ({calleeIds.length})</div>
          {calleeIds.map((id) => (
            <div
              key={id}
              style={linkStyles}
              onClick={() => onNavigate?.(id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onNavigate?.(id)}
              aria-label={`Navigate to callee: ${nodeLabels.get(id) ?? id}`}
            >
              {nodeLabels.get(id) ?? id}
            </div>
          ))}
        </>
      )}

      {callerIds.length === 0 && calleeIds.length === 0 && (
        <div
          style={{
            color: colors.text.muted,
            fontSize: 12,
            marginTop: 16,
            fontStyle: 'italic',
          }}
        >
          No call relationships found.
        </div>
      )}
    </div>
  );
}

export const FunctionPanel = memo(FunctionPanelInner);
