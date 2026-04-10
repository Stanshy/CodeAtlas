/**
 * useHeatmap hook unit tests
 *
 * Tests the heatmap mapping logic and toggle behaviour.
 * Uses renderHook wrapped in ViewStateProvider.
 *
 * Mapping table (from useHeatmap.ts §5.3):
 *   symbolCount | strokeWidth | opacity
 *   ≤0          |     1       |  0.3
 *   1–2         |     1       |  0.4
 *   3–5         |     2       |  0.6
 *   6–10        |     3       |  0.8
 *   11+         |     4       |  1.0
 *
 * Sprint 5 — T9: Unit + Integration Tests
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ViewStateProvider } from '../src/contexts/ViewStateContext';
import { useHeatmap } from '../src/hooks/useHeatmap';

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(ViewStateProvider, null, children);
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('useHeatmap — initial state', () => {
  it('isEnabled is false initially', () => {
    const { result } = renderHook(() => useHeatmap(), { wrapper });
    expect(result.current.isEnabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------

describe('useHeatmap — toggle', () => {
  it('toggle() flips isEnabled from false to true', () => {
    const { result } = renderHook(() => useHeatmap(), { wrapper });
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isEnabled).toBe(true);
  });

  it('toggle() flips isEnabled back to false on second call', () => {
    const { result } = renderHook(() => useHeatmap(), { wrapper });
    act(() => {
      result.current.toggle();
    });
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isEnabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getEdgeStyle — mapping table
// ---------------------------------------------------------------------------

describe('useHeatmap — getEdgeStyle(0)', () => {
  it('strokeWidth is 1', () => {
    const { result } = renderHook(() => useHeatmap(), { wrapper });
    expect(result.current.getEdgeStyle(0).strokeWidth).toBe(1);
  });

  it('opacity is 0.3', () => {
    const { result } = renderHook(() => useHeatmap(), { wrapper });
    expect(result.current.getEdgeStyle(0).opacity).toBe(0.3);
  });
});

describe('useHeatmap — getEdgeStyle(1)', () => {
  it('strokeWidth is 1', () => {
    const { result } = renderHook(() => useHeatmap(), { wrapper });
    expect(result.current.getEdgeStyle(1).strokeWidth).toBe(1);
  });

  it('opacity is 0.4', () => {
    const { result } = renderHook(() => useHeatmap(), { wrapper });
    expect(result.current.getEdgeStyle(1).opacity).toBe(0.4);
  });
});

describe('useHeatmap — getEdgeStyle(3)', () => {
  it('strokeWidth is 2', () => {
    const { result } = renderHook(() => useHeatmap(), { wrapper });
    expect(result.current.getEdgeStyle(3).strokeWidth).toBe(2);
  });

  it('opacity is 0.6', () => {
    const { result } = renderHook(() => useHeatmap(), { wrapper });
    expect(result.current.getEdgeStyle(3).opacity).toBe(0.6);
  });
});

describe('useHeatmap — getEdgeStyle(6)', () => {
  it('strokeWidth is 3', () => {
    const { result } = renderHook(() => useHeatmap(), { wrapper });
    expect(result.current.getEdgeStyle(6).strokeWidth).toBe(3);
  });

  it('opacity is 0.8', () => {
    const { result } = renderHook(() => useHeatmap(), { wrapper });
    expect(result.current.getEdgeStyle(6).opacity).toBe(0.8);
  });
});

describe('useHeatmap — getEdgeStyle(11)', () => {
  it('strokeWidth is 4', () => {
    const { result } = renderHook(() => useHeatmap(), { wrapper });
    expect(result.current.getEdgeStyle(11).strokeWidth).toBe(4);
  });

  it('opacity is 1.0', () => {
    const { result } = renderHook(() => useHeatmap(), { wrapper });
    expect(result.current.getEdgeStyle(11).opacity).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// Boundary: negative count
// ---------------------------------------------------------------------------

describe('useHeatmap — getEdgeStyle(-1) boundary', () => {
  it('returns minimum strokeWidth of 1 for negative count', () => {
    const { result } = renderHook(() => useHeatmap(), { wrapper });
    expect(result.current.getEdgeStyle(-1).strokeWidth).toBe(1);
  });

  it('returns minimum opacity of 0.3 for negative count', () => {
    const { result } = renderHook(() => useHeatmap(), { wrapper });
    expect(result.current.getEdgeStyle(-1).opacity).toBe(0.3);
  });
});

// ---------------------------------------------------------------------------
// Boundary: edge of each tier
// ---------------------------------------------------------------------------

describe('useHeatmap — tier boundary values', () => {
  it('getEdgeStyle(2) returns tier 1-2 (strokeWidth=1, opacity=0.4)', () => {
    const { result } = renderHook(() => useHeatmap(), { wrapper });
    const style = result.current.getEdgeStyle(2);
    expect(style.strokeWidth).toBe(1);
    expect(style.opacity).toBe(0.4);
  });

  it('getEdgeStyle(5) returns tier 3-5 (strokeWidth=2, opacity=0.6)', () => {
    const { result } = renderHook(() => useHeatmap(), { wrapper });
    const style = result.current.getEdgeStyle(5);
    expect(style.strokeWidth).toBe(2);
    expect(style.opacity).toBe(0.6);
  });

  it('getEdgeStyle(10) returns tier 6-10 (strokeWidth=3, opacity=0.8)', () => {
    const { result } = renderHook(() => useHeatmap(), { wrapper });
    const style = result.current.getEdgeStyle(10);
    expect(style.strokeWidth).toBe(3);
    expect(style.opacity).toBe(0.8);
  });
});
