/**
 * CodeAtlas Web — useSearch Hook
 *
 * Front-end search: filters nodes by label/filePath,
 * manages keyboard navigation (ArrowUp/Down, Enter, Escape, Ctrl+K).
 * Sprint 8: Natural language detection + AI keyword search.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Node } from '@xyflow/react';
import type { NeonNodeData } from '../adapters/graph-adapter';
import { useViewState } from '../contexts/ViewStateContext';
import { fetchSearchKeywords } from '../api/ai';

const MAX_RESULTS = 10;
const AI_DEBOUNCE_MS = 300;

export interface SearchResult {
  id: string;
  label: string;
  filePath: string;
  nodeType: string;
}

export interface UseSearchOptions {
  nodes: Node<NeonNodeData>[];
  onSelect: (nodeId: string) => void;
  allEdges?: Array<{ id: string; source: string; target: string }>; // Sprint 8: for search focus
}

export interface UseSearchResult {
  query: string;
  setQuery: (q: string) => void;
  results: SearchResult[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  selectedIndex: number;
  selectResult: (nodeId: string) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  isAiSearching: boolean; // Sprint 8: AI 搜尋中
}

/**
 * Detect whether the query looks like natural language rather than a code
 * identifier.  Triggers on Chinese characters, 3+ whitespace-separated words,
 * or sentence-ending punctuation.
 */
function isNaturalLanguage(query: string): boolean {
  // 中文字元
  if (/[\u4e00-\u9fff]/.test(query)) return true;
  // 多個空格（2+個空白分隔的單字）
  if (query.trim().split(/\s+/).length >= 3) return true;
  // 句號、問號、驚嘆號
  if (/[.?!。？！]/.test(query)) return true;
  return false;
}

/**
 * OR-logic multi-keyword match against a node's label and filePath.
 */
function matchesKeywords(keywords: string[], label: string, filePath: string): boolean {
  const lowerLabel = label.toLowerCase();
  const lowerPath = filePath.toLowerCase();
  return keywords.some((kw) => {
    const lowerKw = kw.toLowerCase();
    return lowerLabel.includes(lowerKw) || lowerPath.includes(lowerKw);
  });
}

export function useSearch({ nodes, onSelect, allEdges = [] }: UseSearchOptions): UseSearchResult {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [aiKeywords, setAiKeywords] = useState<string[] | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const { dispatch } = useViewState();

  // Debounced AI keyword fetch for natural language queries
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const trimmed = query.trim();

    // Clear previous AI keywords whenever query changes
    setAiKeywords(null);

    if (!trimmed || !isNaturalLanguage(trimmed)) {
      setIsAiSearching(false);
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      return;
    }

    // Natural language detected — debounce the API call
    setIsAiSearching(true);

    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      void (async () => {
        try {
          const result = await fetchSearchKeywords(trimmed);
          if (result.ok) {
            setAiKeywords(result.data.keywords);
          } else {
            // API failed → fall back to whitespace split (null keeps fallback path)
            setAiKeywords(null);
          }
        } catch {
          // Unexpected error → fallback
          setAiKeywords(null);
        } finally {
          setIsAiSearching(false);
        }
      })();
    }, AI_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [query]);

  // Filter nodes — handles both plain and natural-language queries
  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];

    const trimmed = query.trim();
    const nlQuery = isNaturalLanguage(trimmed);
    const matched: SearchResult[] = [];

    // Determine which keywords to use
    let keywords: string[] | null = null;
    if (nlQuery) {
      if (aiKeywords !== null) {
        // AI returned keywords
        keywords = aiKeywords;
      } else {
        // Fallback: split by whitespace
        keywords = trimmed.split(/\s+/).filter(Boolean);
      }
    }

    for (const node of nodes) {
      const data = node.data;
      if (!data) continue;

      const label = data.label ?? '';
      const filePath = data.filePath ?? '';

      const isMatch = nlQuery && keywords !== null
        ? matchesKeywords(keywords, label, filePath)
        : label.toLowerCase().includes(trimmed.toLowerCase()) ||
          filePath.toLowerCase().includes(trimmed.toLowerCase());

      if (isMatch) {
        matched.push({
          id: node.id,
          label: label || node.id,
          filePath: filePath || node.id,
          nodeType: data.nodeType ?? 'file',
        });
      }

      if (matched.length >= MAX_RESULTS) break;
    }

    return matched;
  }, [query, nodes, aiKeywords]);

  // === Sprint 8: Search Focus Mode ===
  useEffect(() => {
    if (results.length > 0 && query.trim()) {
      // Compute matching node IDs
      const matchingNodeIds = results.map((r) => r.id);

      // Compute directly connected edges
      const matchingNodeSet = new Set(matchingNodeIds);
      const directEdgeIds = allEdges
        .filter((e) => matchingNodeSet.has(e.source) || matchingNodeSet.has(e.target))
        .map((e) => e.id);

      dispatch({ type: 'ENTER_SEARCH_FOCUS', nodeIds: matchingNodeIds, edgeIds: directEdgeIds });
    } else {
      // No results or empty query → exit focus
      dispatch({ type: 'EXIT_SEARCH_FOCUS' });
    }
  }, [results, query, allEdges, dispatch]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
    dispatch({ type: 'EXIT_SEARCH_FOCUS' });
  }, [dispatch]);

  const selectResult = useCallback(
    (nodeId: string) => {
      onSelect(nodeId);
      close();
    },
    [onSelect, close],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results.length > 0 && selectedIndex < results.length) {
          selectResult(results[selectedIndex].id);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    },
    [results, selectedIndex, selectResult, close],
  );

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return {
    query,
    setQuery,
    results,
    isOpen,
    open,
    close,
    selectedIndex,
    selectResult,
    handleKeyDown,
    isAiSearching,
  };
}
