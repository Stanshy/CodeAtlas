/**
 * CodeAtlas — DirectoryNode Component
 *
 * Custom React Flow node for directory-type nodes (Magenta/Purple neon theme).
 * Features accent bar, Framer Motion expand/collapse animation, glow effects.
 */

import { memo, useState, type CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NeonNodeData } from '../adapters/graph-adapter';
import { nodeStyles, glow, animation } from '../styles/theme';
import { NodeIOBadge } from './NodeIOBadge';

const dirStyle = nodeStyles.directory;

/** Framer Motion variants for the child area expand/collapse */
const childAreaVariants = {
  collapsed: {
    height: 0,
    opacity: 0,
    marginTop: 0,
    transition: {
      duration: animation.directoryToggle.duration,
      ease: animation.directoryToggle.easing,
    },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    marginTop: 8,
    transition: {
      duration: animation.directoryToggle.duration,
      ease: animation.directoryToggle.easing,
    },
  },
};

function getDirectoryStyle(selected: boolean): CSSProperties {
  const base: CSSProperties = {
    minWidth: dirStyle.minWidth,
    maxWidth: dirStyle.maxWidth,
    borderRadius: dirStyle.borderRadius,
    padding: dirStyle.padding,
    border: `${dirStyle.border.normal.width} solid ${dirStyle.border.normal.color}`,
    background: dirStyle.background.normal,
    boxShadow: glow.directory.subtle.boxShadow,
    filter: glow.directory.subtle.filter,
    cursor: 'pointer',
    transition: `all ${animation.nodeHover.duration} ${animation.nodeHover.easing}`,
    position: 'relative',
    overflow: 'hidden',
  };

  if (selected) {
    base.border = `${dirStyle.border.active.width} solid ${dirStyle.border.active.color}`;
    base.background = dirStyle.background.active;
    base.boxShadow = glow.directory.intense.boxShadow;
    base.filter = glow.directory.intense.filter;
  }

  return base;
}

function DirectoryNodeInner({ data, selected = false }: NodeProps) {
  const nodeData = data as unknown as NeonNodeData;
  const [isExpanded, setIsExpanded] = useState(false);

  const style = getDirectoryStyle(selected);
  const childCount = nodeData.metadata.importCount ?? 0;

  const importCount = nodeData.metadata?.importCount ?? 0;
  const exportCount = nodeData.metadata?.exportCount ?? 0;

  return (
    <div className="directory-node" style={{ ...style, position: 'relative' }}>
      {/* Top accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: dirStyle.accentBarHeight,
          background: dirStyle.accentBarColor,
          borderRadius: `${dirStyle.borderRadius} ${dirStyle.borderRadius} 0 0`,
        }}
      />

      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div
            style={{
              fontFamily: dirStyle.label.fontFamily,
              fontWeight: dirStyle.label.fontWeight,
              fontSize: dirStyle.label.fontSize,
              color: dirStyle.label.color,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {nodeData.label}
          </div>
          <div
            style={{
              fontSize: dirStyle.subLabel.fontSize,
              color: dirStyle.subLabel.color,
              marginTop: '2px',
            }}
          >
            {childCount} files
          </div>
        </div>

        {/* Expand/collapse toggle with rotation animation */}
        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded((prev) => !prev);
          }}
          animate={{ rotate: isExpanded ? 45 : 0 }}
          transition={{ duration: animation.directoryToggle.duration }}
          style={{
            width: dirStyle.toggleButton.size,
            height: dirStyle.toggleButton.size,
            borderRadius: dirStyle.toggleButton.borderRadius,
            background: dirStyle.toggleButton.background,
            color: dirStyle.toggleButton.color,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 700,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          +
        </motion.button>
      </div>

      {/* Animated expand/collapse child area */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={childAreaVariants}
            style={{
              padding: '8px',
              background: dirStyle.background.childArea,
              borderRadius: '6px',
              minHeight: 40,
              overflow: 'hidden',
            }}
          />
        )}
      </AnimatePresence>

      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />

      {/* I/O badge overlay — shows import/export counts below the node */}
      <NodeIOBadge importCount={importCount} exportCount={exportCount} />
    </div>
  );
}

export const DirectoryNode = memo(DirectoryNodeInner);
