/**
 * CodeAtlas — SearchBar Component
 *
 * Top-center search bar with instant filtering and keyboard navigation.
 * Opens with Ctrl+K / Cmd+K, closes with Escape.
 */

import { memo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors } from '../styles/theme';
import type { UseSearchResult } from '../hooks/useSearch';

interface SearchBarProps {
  search: UseSearchResult;
}

const overlayStyles: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(0, 0, 0, 0.4)',
  zIndex: 40,
};

const containerStyles: React.CSSProperties = {
  position: 'fixed',
  top: 80,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 480,
  maxWidth: 'calc(100vw - 32px)',
  zIndex: 45,
};

const inputContainerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  background: colors.bg.overlay,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 12,
  padding: '12px 16px',
  backdropFilter: 'blur(12px)',
  gap: 10,
};

const inputStyles: React.CSSProperties = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: colors.text.primary,
  fontSize: 15,
  fontFamily: 'inherit',
};

const shortcutBadgeStyles: React.CSSProperties = {
  color: colors.text.muted,
  fontSize: 11,
  padding: '2px 6px',
  border: `1px solid ${colors.text.disabled}`,
  borderRadius: 4,
  flexShrink: 0,
};

const dropdownStyles: React.CSSProperties = {
  marginTop: 4,
  background: colors.bg.overlay,
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: 10,
  overflow: 'hidden',
  backdropFilter: 'blur(12px)',
};

const resultItemStyles: React.CSSProperties = {
  padding: '10px 16px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontSize: 13,
  transition: 'background 0.1s',
};

const nodeTypeIconStyles: React.CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  flexShrink: 0,
  fontWeight: 600,
};

/** Small spinning indicator shown while AI keyword extraction is in progress */
function AiSpinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-label="AI searching"
      style={{ flexShrink: 0, animation: 'spin 0.8s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle
        cx="7"
        cy="7"
        r="5.5"
        stroke={colors.primary.DEFAULT}
        strokeWidth="1.5"
        strokeDasharray="22 8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NodeTypeIcon({ type }: { type: string }) {
  const isDir = type === 'directory';
  return (
    <div
      style={{
        ...nodeTypeIconStyles,
        background: isDir ? colors.secondary.ghost : colors.primary.ghost,
        color: isDir ? colors.secondary.DEFAULT : colors.primary.DEFAULT,
      }}
    >
      {isDir ? 'D' : 'F'}
    </div>
  );
}

export const SearchBar = memo(function SearchBar({ search }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (search.isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [search.isOpen]);

  return (
    <AnimatePresence>
      {search.isOpen && (
        <>
          {/* Backdrop overlay */}
          <div style={overlayStyles} onClick={search.close} role="presentation" />

          {/* Search container */}
          <motion.div
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Framer Motion MotionStyle incompatible with exactOptionalPropertyTypes
            style={containerStyles as any}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {/* Input */}
            <div style={inputContainerStyles}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.text.muted}
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search.query}
                onChange={(e) => search.setQuery(e.target.value)}
                onKeyDown={search.handleKeyDown}
                placeholder="Search files and modules..."
                style={inputStyles}
              />
              {search.isAiSearching ? (
                <AiSpinner />
              ) : (
                <span style={shortcutBadgeStyles}>ESC</span>
              )}
            </div>

            {/* Results dropdown */}
            {search.query.trim() && (
              <div style={dropdownStyles}>
                {search.results.length === 0 ? (
                  <div
                    style={{
                      padding: '16px',
                      textAlign: 'center',
                      color: colors.text.muted,
                      fontSize: 13,
                    }}
                  >
                    No results found
                  </div>
                ) : (
                  search.results.map((result, index) => (
                    <div
                      key={result.id}
                      style={{
                        ...resultItemStyles,
                        background:
                          index === search.selectedIndex
                            ? colors.primary.ghost
                            : 'transparent',
                      }}
                      onClick={() => search.selectResult(result.id)}
                      onMouseEnter={() => {
                        // Update selected index on hover for visual feedback
                      }}
                      role="option"
                      aria-selected={index === search.selectedIndex}
                    >
                      <NodeTypeIcon type={result.nodeType} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            color: colors.text.primary,
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {result.label}
                        </div>
                        <div
                          style={{
                            color: colors.text.muted,
                            fontSize: 11,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {result.filePath}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
