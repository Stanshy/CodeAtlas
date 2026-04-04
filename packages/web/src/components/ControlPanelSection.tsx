/**
 * CodeAtlas — ControlPanelSection
 * Collapsible section inside ControlPanel.
 * Sprint 9 — T5.
 */

import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors } from '../styles/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ControlPanelSectionProps {
  title: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

// ---------------------------------------------------------------------------
// ChevronIcon
// ---------------------------------------------------------------------------

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <motion.svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      animate={{ rotate: isOpen ? 90 : 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{ flexShrink: 0 }}
    >
      <path
        d="M5 3l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}

// ---------------------------------------------------------------------------
// ControlPanelSection
// ---------------------------------------------------------------------------

export function ControlPanelSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: ControlPanelSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Section header */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '10px 12px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: isOpen ? colors.text.primary : colors.text.secondary,
          fontSize: 13,
          fontWeight: 500,
          textAlign: 'left',
          transition: 'color 0.15s ease-out',
          userSelect: 'none',
        }}
        aria-expanded={isOpen}
      >
        {/* Icon */}
        <span
          style={{
            color: isOpen ? colors.primary.DEFAULT : colors.text.muted,
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            transition: 'color 0.15s ease-out',
          }}
        >
          {icon}
        </span>

        {/* Title */}
        <span style={{ flex: 1 }}>{title}</span>

        {/* Chevron */}
        <span
          style={{
            color: colors.text.muted,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronIcon isOpen={isOpen} />
        </span>
      </button>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="section-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 0 8px 0' }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
