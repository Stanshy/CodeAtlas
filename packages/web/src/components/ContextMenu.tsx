/**
 * CodeAtlas — ContextMenu Component
 *
 * Right-click context menu for graph nodes (2D and 3D modes).
 * Pure UI component — all state and handlers are passed in via props.
 * Parent components (GraphCanvas / Graph3DCanvas) are responsible for
 * triggering visibility and providing handlers.
 *
 * Sprint 8 — T4: ContextMenu 元件
 */

import { memo, useEffect, useRef, useState, useCallback } from 'react';
import { colors } from '../styles/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  nodeId: string | null;
  onClose: () => void;
  onImpactForward: (nodeId: string) => void;
  onImpactReverse: (nodeId: string) => void;
  onCopyPath: (nodeId: string) => void;
  onOpenInPanel: (nodeId: string) => void;
  onStartE2ETracing?: (nodeId: string) => void;
}

// ---------------------------------------------------------------------------
// Static styles
// ---------------------------------------------------------------------------

const menuStyles: React.CSSProperties = {
  position: 'fixed',
  zIndex: 50,
  minWidth: 200,
  background: colors.bg.overlay,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 8,
  padding: '4px 0',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
};

const menuItemStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 14px',
  color: colors.text.primary,
  fontSize: 13,
  cursor: 'pointer',
  transition: 'background 0.1s',
  border: 'none',
  background: 'transparent',
  width: '100%',
  textAlign: 'left',
  fontFamily: "'Inter', system-ui, sans-serif",
};

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

function IconArrowRight() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M2 7h10M7 2l5 5-5 5"
        stroke={colors.text.secondary}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconArrowLeft() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M12 7H2M7 2L2 7l5 5"
        stroke={colors.text.secondary}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect
        x="4"
        y="3"
        width="8"
        height="10"
        rx="1.5"
        stroke={colors.text.secondary}
        strokeWidth="1.5"
      />
      <path
        d="M4 5H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-1"
        stroke={colors.text.secondary}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6 3V2.5A1.5 1.5 0 0 1 9 2.5V3"
        stroke={colors.text.secondary}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSidebar() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect
        x="1"
        y="2"
        width="12"
        height="10"
        rx="1.5"
        stroke={colors.text.secondary}
        strokeWidth="1.5"
      />
      <line
        x1="9"
        y1="2.5"
        x2="9"
        y2="11.5"
        stroke={colors.text.secondary}
        strokeWidth="1.5"
      />
    </svg>
  );
}

function IconE2E() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="2.5" cy="7" r="1.5" stroke={colors.text.secondary} strokeWidth="1.5" />
      <circle cx="11.5" cy="7" r="1.5" stroke={colors.text.secondary} strokeWidth="1.5" />
      <path
        d="M4 7h2.5M7.5 7H10"
        stroke={colors.text.secondary}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7 4.5L9.5 7 7 9.5"
        stroke={colors.text.secondary}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// MenuItem sub-component
// ---------------------------------------------------------------------------

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function MenuItem({ icon, label, onClick }: MenuItemProps) {
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);

  return (
    <button
      type="button"
      style={{
        ...menuItemStyles,
        background: hovered ? colors.primary.ghost : 'transparent',
      }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// ContextMenu
// ---------------------------------------------------------------------------

export const ContextMenu = memo(function ContextMenu({
  visible,
  x,
  y,
  nodeId,
  onClose,
  onImpactForward,
  onImpactReverse,
  onCopyPath,
  onOpenInPanel,
  onStartE2ETracing,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!visible) return;

    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [visible, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!visible) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  // Do not render when invisible or no target node
  if (!visible || nodeId === null) return null;

  // ---------------------------------------------------------------------------
  // Boundary detection — adjust position if menu overflows the viewport
  // ---------------------------------------------------------------------------

  const MENU_WIDTH = 200;
  const MENU_HEIGHT = 5 * 36 + 8; // ~5 items × ~36px + padding

  const adjustedX =
    x + MENU_WIDTH > window.innerWidth ? window.innerWidth - MENU_WIDTH - 8 : x;
  const adjustedY =
    y + MENU_HEIGHT > window.innerHeight ? window.innerHeight - MENU_HEIGHT - 8 : y;

  // ---------------------------------------------------------------------------
  // Item handlers — execute callback then close menu
  // ---------------------------------------------------------------------------

  function handleImpactForward() {
    onImpactForward(nodeId as string);
    onClose();
  }

  function handleImpactReverse() {
    onImpactReverse(nodeId as string);
    onClose();
  }

  function handleCopyPath() {
    onCopyPath(nodeId as string);
    onClose();
  }

  function handleOpenInPanel() {
    onOpenInPanel(nodeId as string);
    onClose();
  }

  function handleStartE2ETracing() {
    onStartE2ETracing?.(nodeId as string);
    onClose();
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Node context menu"
      style={{ ...menuStyles, left: adjustedX, top: adjustedY }}
    >
      <MenuItem
        icon={<IconArrowRight />}
        label="影響分析（下游）"
        onClick={handleImpactForward}
      />
      <MenuItem
        icon={<IconArrowLeft />}
        label="依賴分析（上游）"
        onClick={handleImpactReverse}
      />
      <MenuItem
        icon={<IconClipboard />}
        label="複製路徑"
        onClick={handleCopyPath}
      />
      <MenuItem
        icon={<IconSidebar />}
        label="在面板中開啟"
        onClick={handleOpenInPanel}
      />
      <MenuItem
        icon={<IconE2E />}
        label="端到端追蹤"
        onClick={handleStartE2ETracing}
      />
    </div>
  );
});
