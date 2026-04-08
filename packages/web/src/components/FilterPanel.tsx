/**
 * CodeAtlas — FilterPanel Component
 *
 * Left-side collapsible panel for filtering graph nodes and edges.
 * Three filter sections: directories, node types, edge types.
 * Sprint 8 — S8-4.
 */

import { memo, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useViewState } from '../contexts/ViewStateContext';
import { colors } from '../styles/theme';
import type { GraphNode, NodeType, EdgeType, NodeRole } from '../types/graph';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FilterPanelProps {
  isOpen?: boolean;
  onToggle?: () => void;
  allNodes: GraphNode[];
  /** When true, render filter content inline (no fixed position, no header, no collapse button).
   * Used when embedded inside SettingsPopover. */
  embedded?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NODE_TYPES: NodeType[] = ['file', 'directory', 'function', 'class'];
const EDGE_TYPES: EdgeType[] = ['import', 'export', 'data-flow', 'call'];

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  file: '檔案',
  directory: '目錄',
  function: '函式',
  class: '類別',
};

const EDGE_TYPE_LABELS: Record<EdgeType, string> = {
  import: 'Import',
  export: 'Export',
  'data-flow': '資料流',
  call: '函式呼叫',
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const panelStyles: React.CSSProperties = {
  position: 'fixed',
  left: 0,
  top: 60,
  bottom: 0,
  width: 260,
  background: colors.bg.overlay,
  borderRight: '1px solid rgba(255, 255, 255, 0.08)',
  backdropFilter: 'blur(12px)',
  zIndex: 30,
  overflowY: 'auto',
  padding: '16px 12px',
};

const sectionTitleStyles: React.CSSProperties = {
  color: colors.text.muted,
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 8,
  marginTop: 16,
};

const checkboxLabelStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 8px',
  fontSize: 13,
  color: colors.text.primary,
  cursor: 'pointer',
  borderRadius: 4,
  transition: 'background 0.1s',
};

const collapsedButtonStyles: React.CSSProperties = {
  position: 'fixed',
  left: 0,
  top: 60,
  bottom: 0,
  width: 40,
  background: colors.bg.overlay,
  borderRight: '1px solid rgba(255, 255, 255, 0.08)',
  backdropFilter: 'blur(12px)',
  zIndex: 30,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  paddingTop: 16,
};

const panelHeaderStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 4,
};

const panelTitleStyles: React.CSSProperties = {
  color: colors.text.primary,
  fontSize: 14,
  fontWeight: 600,
};

const resetButtonStyles: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: colors.text.muted,
  fontSize: 11,
  cursor: 'pointer',
  padding: '2px 6px',
  borderRadius: 4,
  transition: 'color 0.1s',
};

const emptyStateStyles: React.CSSProperties = {
  color: colors.text.muted,
  fontSize: 12,
  padding: '8px 8px',
  fontStyle: 'italic',
};

const iconButtonStyles: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 4,
  color: colors.text.secondary,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

// Sprint 10: Hidden node item styles
const hiddenNodeItemStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '3px 8px',
  fontSize: 12,
  color: colors.text.primary,
  borderRadius: 4,
};

const hiddenNodeLabelStyles: React.CSSProperties = {
  flex: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 12,
};

const roleTagStyles: React.CSSProperties = {
  fontSize: 10,
  color: colors.text.muted,
  background: 'rgba(255,255,255,0.06)',
  padding: '1px 5px',
  borderRadius: 3,
  flexShrink: 0,
};

const pinButtonStyles: React.CSSProperties = {
  background: 'none',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 3,
  cursor: 'pointer',
  padding: '1px 6px',
  color: colors.text.secondary,
  fontSize: 12,
  flexShrink: 0,
  transition: 'color 0.1s, border-color 0.1s',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Simple SVG filter icon */
function FilterIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 3h12M4 7h8M6 11h4"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Close / collapse icon */
function CloseIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 4L4 10M4 4l6 6"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// CheckboxItem
// ---------------------------------------------------------------------------

interface CheckboxItemProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  indent?: number;
}

const CheckboxItem = memo(function CheckboxItem({
  label,
  checked,
  onChange,
  indent = 0,
}: CheckboxItemProps) {
  return (
    <label
      style={{
        ...checkboxLabelStyles,
        paddingLeft: 8 + indent * 16,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: colors.primary.DEFAULT, cursor: 'pointer' }}
      />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </label>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const FilterPanel = memo(function FilterPanel({
  isOpen,
  onToggle,
  allNodes,
  embedded = false,
}: FilterPanelProps) {
  const { state, dispatch } = useViewState();
  const filter = state.filter;

  // -----------------------------------------------------------------------
  // Directory list: extract directory nodes, sort by filePath
  // -----------------------------------------------------------------------

  const directoryNodes = useMemo(
    () =>
      allNodes
        .filter((n) => n.type === 'directory')
        .sort((a, b) => a.filePath.localeCompare(b.filePath)),
    [allNodes],
  );

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleDirectoryChange = useCallback(
    (dirId: string, checked: boolean) => {
      const current = filter.directories;
      const next = checked
        ? [...current, dirId]
        : current.filter((d) => d !== dirId);

      // All directories selected → store empty array (= select all)
      const allDirIds = directoryNodes.map((n) => n.id);
      const effectiveNext =
        allDirIds.length > 0 && next.length === allDirIds.length ? [] : next;

      dispatch({ type: 'SET_FILTER', filter: { directories: effectiveNext } });
    },
    [filter.directories, directoryNodes, dispatch],
  );

  const handleNodeTypeChange = useCallback(
    (nodeType: NodeType, checked: boolean) => {
      const current = filter.nodeTypes;
      const next = checked
        ? [...current, nodeType]
        : current.filter((t) => t !== nodeType);

      // All types selected → store empty array
      const effectiveNext = next.length === NODE_TYPES.length ? [] : next;
      dispatch({ type: 'SET_FILTER', filter: { nodeTypes: effectiveNext } });
    },
    [filter.nodeTypes, dispatch],
  );

  const handleEdgeTypeChange = useCallback(
    (edgeType: EdgeType, checked: boolean) => {
      const current = filter.edgeTypes;
      const next = checked
        ? [...current, edgeType]
        : current.filter((t) => t !== edgeType);

      // All types selected → store empty array
      const effectiveNext = next.length === EDGE_TYPES.length ? [] : next;
      dispatch({ type: 'SET_FILTER', filter: { edgeTypes: effectiveNext } });
    },
    [filter.edgeTypes, dispatch],
  );

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET_FILTER' });
  }, [dispatch]);

  // -----------------------------------------------------------------------
  // Derived state: is a directory checked?
  // empty filter.directories means all selected
  // -----------------------------------------------------------------------

  const isDirChecked = useCallback(
    (dirId: string): boolean => {
      if (filter.directories.length === 0) return true;
      return filter.directories.includes(dirId);
    },
    [filter.directories],
  );

  const isNodeTypeChecked = useCallback(
    (nodeType: NodeType): boolean => {
      if (filter.nodeTypes.length === 0) return true;
      return filter.nodeTypes.includes(nodeType);
    },
    [filter.nodeTypes],
  );

  const isEdgeTypeChecked = useCallback(
    (edgeType: EdgeType): boolean => {
      if (filter.edgeTypes.length === 0) return true;
      return filter.edgeTypes.includes(edgeType);
    },
    [filter.edgeTypes],
  );

  // -----------------------------------------------------------------------
  // Sprint 10: Hidden nodes (utility + noise) for pinning
  // -----------------------------------------------------------------------

  const hiddenNodes = useMemo(
    () =>
      allNodes
        .filter((n) => {
          const role = (n.metadata.role as NodeRole | undefined) ?? undefined;
          return role === 'utility' || role === 'noise';
        })
        .sort((a, b) => a.label.localeCompare(b.label)),
    [allNodes],
  );

  const pinnedNodeIds = state.pinnedNodeIds;

  const unpinnedHiddenNodes = useMemo(
    () => hiddenNodes.filter((n) => !pinnedNodeIds.includes(n.id)),
    [hiddenNodes, pinnedNodeIds],
  );

  const pinnedHiddenNodes = useMemo(
    () => hiddenNodes.filter((n) => pinnedNodeIds.includes(n.id)),
    [hiddenNodes, pinnedNodeIds],
  );

  const handlePinNode = useCallback(
    (nodeId: string) => {
      dispatch({ type: 'PIN_NODE', nodeId });
    },
    [dispatch],
  );

  const handleUnpinNode = useCallback(
    (nodeId: string) => {
      dispatch({ type: 'UNPIN_NODE', nodeId });
    },
    [dispatch],
  );

  // -----------------------------------------------------------------------
  // Has active filters?
  // -----------------------------------------------------------------------
  const hasActiveFilters =
    filter.directories.length > 0 ||
    filter.nodeTypes.length > 0 ||
    filter.edgeTypes.length > 0;

  // -----------------------------------------------------------------------
  // Render: embedded mode (inside SettingsPopover)
  // -----------------------------------------------------------------------

  if (embedded) {
    return (
      <div style={{ padding: '4px 12px 8px' }}>
        {/* Directory section */}
        {directoryNodes.length > 0 && (
          <>
            <p style={{ ...sectionTitleStyles, marginTop: 4 }}>目錄</p>
            {directoryNodes.map((dirNode) => {
              const depth = dirNode.filePath.split('/').length - 1;
              return (
                <CheckboxItem
                  key={dirNode.id}
                  label={dirNode.label}
                  checked={isDirChecked(dirNode.id)}
                  onChange={(checked) => handleDirectoryChange(dirNode.id, checked)}
                  indent={depth}
                />
              );
            })}
          </>
        )}

        {/* Node type section */}
        <p style={{ ...sectionTitleStyles, marginTop: directoryNodes.length > 0 ? 12 : 4 }}>節點類型</p>
        {NODE_TYPES.map((nodeType) => (
          <CheckboxItem
            key={nodeType}
            label={NODE_TYPE_LABELS[nodeType]}
            checked={isNodeTypeChecked(nodeType)}
            onChange={(checked) => handleNodeTypeChange(nodeType, checked)}
          />
        ))}

        {/* Edge type section */}
        <p style={{ ...sectionTitleStyles, marginTop: 12 }}>邊類型</p>
        {EDGE_TYPES.map((edgeType) => (
          <CheckboxItem
            key={edgeType}
            label={EDGE_TYPE_LABELS[edgeType]}
            checked={isEdgeTypeChecked(edgeType)}
            onChange={(checked) => handleEdgeTypeChange(edgeType, checked)}
          />
        ))}

        {/* Sprint 10: Hidden nodes section (pinned) */}
        {pinnedHiddenNodes.length > 0 && (
          <>
            <p style={{ ...sectionTitleStyles, marginTop: 12 }}>已釘選的隱藏節點</p>
            {pinnedHiddenNodes.map((node) => (
              <div key={node.id} style={hiddenNodeItemStyles}>
                <span style={hiddenNodeLabelStyles} title={node.filePath}>
                  {node.label}
                </span>
                <span style={roleTagStyles}>{node.metadata.role === 'noise' ? 'noise' : 'utility'}</span>
                <button
                  style={pinButtonStyles}
                  onClick={() => handleUnpinNode(node.id)}
                  title="取消釘選"
                >
                  ✕
                </button>
              </div>
            ))}
          </>
        )}

        {/* Sprint 10: Hidden nodes section (available to pin) */}
        {unpinnedHiddenNodes.length > 0 && (
          <>
            <p style={{ ...sectionTitleStyles, marginTop: 12 }}>已隱藏節點</p>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {unpinnedHiddenNodes.map((node) => (
                <div key={node.id} style={hiddenNodeItemStyles}>
                  <span style={hiddenNodeLabelStyles} title={node.filePath}>
                    {node.label}
                  </span>
                  <span style={roleTagStyles}>{node.metadata.role === 'noise' ? 'noise' : 'utility'}</span>
                  <button
                    style={pinButtonStyles}
                    onClick={() => handlePinNode(node.id)}
                    title="釘選到畫面"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Reset button */}
        {hasActiveFilters && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              style={{
                ...resetButtonStyles,
                padding: '4px 8px',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 4,
              }}
              onClick={handleReset}
              title="重設所有過濾條件"
            >
              重設過濾
            </button>
          </div>
        )}
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render: collapsed state
  // -----------------------------------------------------------------------

  if (!isOpen) {
    return (
      <div style={collapsedButtonStyles}>
        <button
          style={iconButtonStyles}
          onClick={onToggle}
          title="展開過濾面板"
          aria-label="展開過濾面板"
        >
          <FilterIcon
            size={18}
            color={hasActiveFilters ? colors.primary.DEFAULT : colors.text.secondary}
          />
        </button>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render: expanded state
  // -----------------------------------------------------------------------

  return (
    <AnimatePresence>
      <motion.div
        key="filter-panel"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style={panelStyles as any}
        initial={{ x: -260, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -260, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        role="complementary"
        aria-label="圖譜過濾面板"
      >
        {/* Header */}
        <div style={panelHeaderStyles}>
          <span style={panelTitleStyles}>
            <FilterIcon
              size={14}
              color={hasActiveFilters ? colors.primary.DEFAULT : colors.text.primary}
            />
            {' '}過濾
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {hasActiveFilters && (
              <button
                style={resetButtonStyles}
                onClick={handleReset}
                title="重設所有過濾條件"
              >
                重設過濾
              </button>
            )}
            <button
              style={iconButtonStyles}
              onClick={onToggle}
              title="收合過濾面板"
              aria-label="收合過濾面板"
            >
              <CloseIcon size={14} color={colors.text.muted} />
            </button>
          </div>
        </div>

        {/* ---- Directory filter ---- */}
        <p style={sectionTitleStyles}>目錄</p>
        {directoryNodes.length === 0 ? (
          <p style={emptyStateStyles}>無目錄節點</p>
        ) : (
          directoryNodes.map((dirNode) => {
            // Calculate indent based on path depth
            const depth = dirNode.filePath.split('/').length - 1;
            return (
              <CheckboxItem
                key={dirNode.id}
                label={dirNode.label}
                checked={isDirChecked(dirNode.id)}
                onChange={(checked) => handleDirectoryChange(dirNode.id, checked)}
                indent={depth}
              />
            );
          })
        )}

        {/* ---- Node type filter ---- */}
        <p style={sectionTitleStyles}>節點類型</p>
        {NODE_TYPES.map((nodeType) => (
          <CheckboxItem
            key={nodeType}
            label={NODE_TYPE_LABELS[nodeType]}
            checked={isNodeTypeChecked(nodeType)}
            onChange={(checked) => handleNodeTypeChange(nodeType, checked)}
          />
        ))}

        {/* ---- Edge type filter ---- */}
        <p style={sectionTitleStyles}>邊類型</p>
        {EDGE_TYPES.map((edgeType) => (
          <CheckboxItem
            key={edgeType}
            label={EDGE_TYPE_LABELS[edgeType]}
            checked={isEdgeTypeChecked(edgeType)}
            onChange={(checked) => handleEdgeTypeChange(edgeType, checked)}
          />
        ))}

        {/* ---- Sprint 10: Pinned hidden nodes ---- */}
        {pinnedHiddenNodes.length > 0 && (
          <>
            <p style={sectionTitleStyles}>已釘選的隱藏節點</p>
            {pinnedHiddenNodes.map((node) => (
              <div key={node.id} style={hiddenNodeItemStyles}>
                <span style={hiddenNodeLabelStyles} title={node.filePath}>
                  {node.label}
                </span>
                <span style={roleTagStyles}>{node.metadata.role === 'noise' ? 'noise' : 'utility'}</span>
                <button
                  style={pinButtonStyles}
                  onClick={() => handleUnpinNode(node.id)}
                  title="取消釘選"
                >
                  ✕
                </button>
              </div>
            ))}
          </>
        )}

        {/* ---- Sprint 10: Available hidden nodes to pin ---- */}
        {unpinnedHiddenNodes.length > 0 && (
          <>
            <p style={sectionTitleStyles}>已隱藏節點</p>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {unpinnedHiddenNodes.map((node) => (
                <div key={node.id} style={hiddenNodeItemStyles}>
                  <span style={hiddenNodeLabelStyles} title={node.filePath}>
                    {node.label}
                  </span>
                  <span style={roleTagStyles}>{node.metadata.role === 'noise' ? 'noise' : 'utility'}</span>
                  <button
                    style={pinButtonStyles}
                    onClick={() => handlePinNode(node.id)}
                    title="釘選到畫面"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
});
