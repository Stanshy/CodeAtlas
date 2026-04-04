/**
 * useEdgeSymbols hook unit tests
 *
 * Tests the pure formatting hook useEdgeSymbols for all symbol count cases:
 * - 0 symbols → label is null
 * - 1 symbol → label = symbol name
 * - 3 symbols → comma-separated
 * - 4 symbols → first 3 + "+1 more"
 * - 6 symbols → "+3 more"
 * - undefined input → null
 * - Special characters in symbol name
 *
 * Sprint 5 — T9: Unit + Integration Tests
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEdgeSymbols } from '../src/hooks/useEdgeSymbols';

describe('useEdgeSymbols — 0 symbols', () => {
  it('returns null label for empty array', () => {
    const { result } = renderHook(() => useEdgeSymbols([]));
    expect(result.current.label).toBeNull();
  });

  it('returns empty symbols array for empty input', () => {
    const { result } = renderHook(() => useEdgeSymbols([]));
    expect(result.current.symbols).toEqual([]);
  });

  it('returns empty allSymbols for empty input', () => {
    const { result } = renderHook(() => useEdgeSymbols([]));
    expect(result.current.allSymbols).toEqual([]);
  });
});

describe('useEdgeSymbols — undefined input', () => {
  it('returns null label for undefined', () => {
    const { result } = renderHook(() => useEdgeSymbols(undefined));
    expect(result.current.label).toBeNull();
  });

  it('returns empty allSymbols for undefined', () => {
    const { result } = renderHook(() => useEdgeSymbols(undefined));
    expect(result.current.allSymbols).toEqual([]);
  });
});

describe('useEdgeSymbols — 1 symbol', () => {
  it('returns the symbol name as label', () => {
    const { result } = renderHook(() => useEdgeSymbols(['Foo']));
    expect(result.current.label).toBe('Foo');
  });

  it('symbols array contains the single symbol', () => {
    const { result } = renderHook(() => useEdgeSymbols(['Foo']));
    expect(result.current.symbols).toEqual(['Foo']);
  });

  it('allSymbols contains the single symbol', () => {
    const { result } = renderHook(() => useEdgeSymbols(['Foo']));
    expect(result.current.allSymbols).toEqual(['Foo']);
  });
});

describe('useEdgeSymbols — 3 symbols', () => {
  it('returns comma-separated label for exactly 3 symbols', () => {
    const { result } = renderHook(() => useEdgeSymbols(['Foo', 'Bar', 'Baz']));
    expect(result.current.label).toBe('Foo, Bar, Baz');
  });

  it('symbols array has all 3 entries', () => {
    const { result } = renderHook(() => useEdgeSymbols(['Foo', 'Bar', 'Baz']));
    expect(result.current.symbols).toHaveLength(3);
  });

  it('does not append "+N more" for exactly 3 symbols', () => {
    const { result } = renderHook(() => useEdgeSymbols(['Foo', 'Bar', 'Baz']));
    expect(result.current.label).not.toContain('more');
  });
});

describe('useEdgeSymbols — 4 symbols', () => {
  it('label shows first 3 + "+1 more"', () => {
    const { result } = renderHook(() => useEdgeSymbols(['Foo', 'Bar', 'Baz', 'Qux']));
    expect(result.current.label).toBe('Foo, Bar, Baz, +1 more');
  });

  it('symbols array has only 3 entries', () => {
    const { result } = renderHook(() => useEdgeSymbols(['Foo', 'Bar', 'Baz', 'Qux']));
    expect(result.current.symbols).toHaveLength(3);
  });

  it('allSymbols array has all 4 entries', () => {
    const { result } = renderHook(() => useEdgeSymbols(['Foo', 'Bar', 'Baz', 'Qux']));
    expect(result.current.allSymbols).toHaveLength(4);
  });
});

describe('useEdgeSymbols — 6 symbols', () => {
  it('label shows first 3 + "+3 more"', () => {
    const { result } = renderHook(() =>
      useEdgeSymbols(['A', 'B', 'C', 'D', 'E', 'F']),
    );
    expect(result.current.label).toBe('A, B, C, +3 more');
  });

  it('allSymbols has all 6 entries', () => {
    const { result } = renderHook(() =>
      useEdgeSymbols(['A', 'B', 'C', 'D', 'E', 'F']),
    );
    expect(result.current.allSymbols).toHaveLength(6);
  });
});

describe('useEdgeSymbols — special characters in symbol name', () => {
  it('handles symbols with angle brackets', () => {
    const { result } = renderHook(() => useEdgeSymbols(['Array<string>']));
    expect(result.current.label).toBe('Array<string>');
  });

  it('handles symbols with underscores and numbers', () => {
    const { result } = renderHook(() => useEdgeSymbols(['__my_symbol_2']));
    expect(result.current.label).toBe('__my_symbol_2');
  });

  it('handles symbols with dots (namespace-style)', () => {
    const { result } = renderHook(() => useEdgeSymbols(['Ns.SubNs.Fn']));
    expect(result.current.label).toBe('Ns.SubNs.Fn');
  });
});
