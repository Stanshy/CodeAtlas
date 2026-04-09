/**
 * CodeAtlas -- SettingsPopover
 *
 * White-themed popover opened via the gear icon in the Toolbar.
 * Contains 5 collapsible sections: filters, display preferences, and settings.
 *
 * Sub-components (extracted for Sprint 17 refactoring):
 *   - AnalysisSection    → settings/AnalysisSection.tsx
 *   - AISettingsSection  → settings/AISettingsSection.tsx
 */

import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { useViewState } from '../contexts/ViewStateContext';

import { FilterPanel } from './FilterPanel';
import { THEME } from '../styles/theme';
import { AnalysisSection } from './settings/AnalysisSection';
import { AISettingsSection } from './settings/AISettingsSection';
import type { GraphNode, DirectoryGraph } from '../types/graph';
import type { ToastItem } from './Toast';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SettingsPopoverProps {
  graphNodes: GraphNode[];
  directoryGraph: DirectoryGraph | null;
  onClose: () => void;
  onShowToast: (type: ToastItem['type'], title: string, description: string) => void;
}

// ---------------------------------------------------------------------------
// SVG Icon primitives (white-themed versions)
// ---------------------------------------------------------------------------

function GraphIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="3" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="13" cy="3" r="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="13" cy="13" r="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 8l6-4M5 8l6 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 3h12M4 7h8M6 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function SparklesIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 2l1.2 3.3L13 6l-3.3 1.2L8 10.5 6.8 7.2 3 6l3.3-1.2L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M3 11l.8 1.2L5 13l-1.2.8L3 15l-.8-1.2L1 13l1.2-.8L3 11z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        flexShrink: 0,
        transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s ease-out',
      }}
    >
      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Collapsible Section (white-themed, no framer-motion dependency)
// ---------------------------------------------------------------------------

function Section({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={{ borderBottom: `1px solid ${THEME.borderDefault}` }}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '10px 14px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: isOpen ? THEME.inkPrimary : THEME.inkSecondary,
          fontSize: 13,
          fontWeight: 500,
          fontFamily: THEME.fontUi,
          textAlign: 'left',
          transition: 'color 0.15s ease-out',
          userSelect: 'none',
        }}
        aria-expanded={isOpen}
      >
        <span
          style={{
            color: isOpen ? THEME.sfAccent : THEME.inkMuted,
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            transition: 'color 0.15s ease-out',
          }}
        >
          {icon}
        </span>
        <span style={{ flex: 1 }}>{title}</span>
        <span style={{ color: THEME.inkMuted, display: 'flex', alignItems: 'center' }}>
          <ChevronIcon isOpen={isOpen} />
        </span>
      </button>
      {isOpen && (
        <div style={{ padding: '0 0 8px 0', overflow: 'hidden' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SettingsPopover
// ---------------------------------------------------------------------------

export const SettingsPopover = memo(function SettingsPopover({
  graphNodes,
  directoryGraph,
  onClose,
  onShowToast,
}: SettingsPopoverProps) {
  const { dispatch } = useViewState();
  const popoverRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        // Don't close if clicking the gear button itself (it toggles)
        const target = e.target as HTMLElement;
        if (target.closest('[data-settings-trigger]')) return;
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="設定面板"
      style={{
        position: 'fixed',
        top: 48,
        left: 8,
        zIndex: 45,
        width: 300,
        maxHeight: 'calc(100vh - 96px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: '#ffffff',
        border: `1px solid ${THEME.borderDefault}`,
        borderRadius: THEME.radiusMd,
        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
        fontFamily: THEME.fontUi,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 14px 12px',
          borderBottom: `1px solid ${THEME.borderDefault}`,
        }}
      >
        <span style={{ color: THEME.sfAccent, fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em', userSelect: 'none' }}>
          CodeAtlas
        </span>
        <button
          onClick={onClose}
          title="關閉設定"
          aria-label="關閉設定"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: THEME.inkMuted,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4,
            borderRadius: 4,
            transition: 'color 0.15s ease-out',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = THEME.inkPrimary; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = THEME.inkMuted; }}
        >
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 4L4 10M4 4l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Sections — 分析工具 & 過濾器 hidden per boss directive (Sprint 20) */}

      <Section title="AI 設定" icon={<SparklesIcon />} defaultOpen>
        <AISettingsSection onShowToast={onShowToast} />
      </Section>
    </div>
  );
});
