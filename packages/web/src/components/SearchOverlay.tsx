/**
 * CodeAtlas — SearchOverlay (Command Palette)
 *
 * Global search across all perspectives: methods, endpoints, directories, wiki pages.
 * Triggered by Ctrl+K or toolbar search icon.
 * Selecting a result navigates to the corresponding tab and focuses the item.
 */

import { useState, useEffect, useRef, useMemo, useCallback, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { GraphNode, DirectoryGraph, EndpointGraph, PerspectiveName } from '../types/graph';
import type { LoCategory } from './LOCategoryGroup';
import { classifyByRole, classifyPath } from './LOCategoryGroup';
import { THEME } from '../styles/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchResult {
  id: string;
  label: string;
  sublabel: string;
  type: 'method' | 'endpoint' | 'directory' | 'wiki' | 'file';
  /** For methods: has a call chain (★) */
  hasChain?: boolean;
  /** For methods: LO category */
  loCategory?: LoCategory;
  /** Target perspective to navigate to */
  targetPerspective: PerspectiveName;
  /** Extra data for navigation */
  nodeId?: string;
  endpointId?: string;
  wikiSlug?: string;
}

export interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
  graphNodes: GraphNode[];
  directoryGraph: DirectoryGraph | null;
  endpointGraph: EndpointGraph | null;
  wikiPages: Array<{ slug: string; title: string }>;
  /** Chain method labels for ★ marking */
  chainMethodLabels?: Set<string>;
  onSelect: (result: SearchResult) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractFilename(fp: string): string {
  return fp.replace(/\\/g, '/').split('/').pop() ?? fp;
}

// i18n keys for LO category labels — resolved at render time via t()
const CATEGORY_LABEL_KEYS: Record<LoCategory, string> = {
  routes: 'lo.category.routes',
  middleware: 'lo.category.middleware',
  services: 'lo.category.services',
  models: 'lo.category.models',
  utils: 'lo.category.utils',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SearchOverlay({
  open,
  onClose,
  graphNodes,
  directoryGraph,
  endpointGraph,
  wikiPages,
  chainMethodLabels,
  onSelect,
}: SearchOverlayProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build search index
  const allResults = useMemo<SearchResult[]>(() => {
    const results: SearchResult[] = [];

    // Methods (function nodes)
    graphNodes
      .filter((n) => n.type === 'function' || n.metadata?.kind === 'method' || n.metadata?.kind === 'function')
      .forEach((n) => {
        const cat = classifyByRole(n.metadata?.methodRole) ?? classifyPath(n.filePath);
        const bare = n.label.replace(/\(\)$/, '');
        results.push({
          id: `method:${n.id}`,
          label: `${bare}()`,
          sublabel: `${extractFilename(n.filePath)} · ${t(CATEGORY_LABEL_KEYS[cat], { defaultValue: cat })}`,
          type: 'method',
          hasChain: chainMethodLabels?.has(bare),
          loCategory: cat,
          targetPerspective: 'logic-operation',
          nodeId: n.id,
        });
      });

    // Endpoints
    if (endpointGraph) {
      endpointGraph.nodes
        .filter((n) => n.kind === 'endpoint')
        .forEach((n) => {
          const desc = n.method ? `${n.method} ${n.path ?? n.label}` : n.label;
          results.push({
            id: `endpoint:${n.id}`,
            label: desc,
            sublabel: `${n.filePath ? extractFilename(n.filePath) : ''}`,
            type: 'endpoint',
            targetPerspective: 'data-journey',
            endpointId: n.id,
          });
        });
    }

    // Directories
    if (directoryGraph) {
      directoryGraph.nodes.forEach((n) => {
        results.push({
          id: `dir:${n.id}`,
          label: n.label,
          sublabel: n.id,
          type: 'directory',
          targetPerspective: 'system-framework',
          nodeId: n.id,
        });
      });
    }

    // Wiki pages
    wikiPages.forEach((p) => {
      results.push({
        id: `wiki:${p.slug}`,
        label: p.title,
        sublabel: p.slug,
        type: 'wiki',
        targetPerspective: 'wiki',
        wikiSlug: p.slug,
      });
    });

    return results;
  }, [graphNodes, directoryGraph, endpointGraph, wikiPages, chainMethodLabels, t]);

  // Filter results by query
  const filtered = useMemo(() => {
    if (!query.trim()) return allResults.slice(0, 50);
    const q = query.toLowerCase();
    return allResults
      .filter((r) => r.label.toLowerCase().includes(q) || r.sublabel.toLowerCase().includes(q))
      .slice(0, 50);
  }, [allResults, query]);

  // Group by type
  const grouped = useMemo(() => {
    const groups: Record<string, { label: string; icon: string; items: SearchResult[] }> = {
      method: { label: t('search.methods', { defaultValue: 'Methods' }), icon: '🔧', items: [] },
      endpoint: { label: t('search.endpoints', { defaultValue: 'Endpoints' }), icon: '🌐', items: [] },
      directory: { label: t('search.directories', { defaultValue: 'Directories' }), icon: '📂', items: [] },
      wiki: { label: t('search.wiki', { defaultValue: 'Wiki' }), icon: '📖', items: [] },
      file: { label: t('search.files', { defaultValue: 'Files' }), icon: '📄', items: [] },
    };
    filtered.forEach((r) => {
      if (groups[r.type]) groups[r.type].items.push(r);
    });
    return Object.values(groups).filter((g) => g.items.length > 0);
  }, [filtered, t]);

  // Flat list for keyboard navigation
  const flatItems = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && flatItems[selectedIndex]) {
        e.preventDefault();
        onSelect(flatItems[selectedIndex]);
        onClose();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [flatItems, selectedIndex, onSelect, onClose],
  );

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIndex}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Global Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (!open) {
          // Will be handled by parent — dispatch SET_SEARCH_OPEN
        } else {
          inputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  if (!open) return null;

  // Track flat index across groups
  let flatIdx = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 10000,
          backdropFilter: 'blur(2px)',
        }}
        onClick={onClose}
      />
      {/* Palette */}
      <div
        style={{
          position: 'fixed',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 480,
          maxHeight: '60vh',
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
          zIndex: 10001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: THEME.fontUi,
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid #e8e8e8',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16, color: '#9e9e9e' }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('search.placeholder', { defaultValue: 'Search methods, endpoints, files...' })}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 14,
              fontFamily: THEME.fontUi,
              background: 'transparent',
              color: '#1a1a2e',
            }}
          />
          <kbd
            style={{
              fontSize: 10,
              color: '#9e9e9e',
              background: '#f5f5f5',
              borderRadius: 4,
              padding: '2px 6px',
              border: '1px solid #e0e0e0',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          style={{
            overflowY: 'auto',
            flex: 1,
            padding: '4px 0',
          }}
        >
          {flatItems.length === 0 && (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                color: '#9e9e9e',
                fontSize: 13,
              }}
            >
              {t('search.noResults', { defaultValue: 'No results found' })}
            </div>
          )}
          {grouped.map((group) => (
            <div key={group.label}>
              {/* Group header */}
              <div
                style={{
                  padding: '6px 16px 4px',
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#9e9e9e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {group.icon} {group.label} ({group.items.length})
              </div>
              {/* Items */}
              {group.items.map((item) => {
                const idx = flatIdx++;
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    data-idx={idx}
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      padding: '6px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      background: isSelected ? '#f0f4ff' : 'transparent',
                      borderLeft: isSelected ? '3px solid #648cff' : '3px solid transparent',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#1a1a2e',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {item.hasChain && (
                          <span style={{ color: '#f59e0b', fontSize: 11 }}>★</span>
                        )}
                        <span>{item.label}</span>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: '#9e9e9e',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.sublabel}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
