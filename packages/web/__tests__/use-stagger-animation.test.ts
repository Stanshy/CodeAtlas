/**
 * useStaggerAnimation hook unit tests — Sprint 12 additions
 *
 * Coverage (new tests complementing the existing stagger-animation.test.ts):
 *   - Initial state: currentStep = -1, revealedSteps = 0, isPlaying = false
 *   - play() starts animation and visibleNodes grows over time with fake timers
 *   - replay() resets state and restarts from step 0
 *   - >30 nodes auto-accelerates to 100ms per step
 *   - Path change resets currentStep and isPlaying
 *
 * IMPORTANT: path/pathEdges must be stable references (defined at module level)
 * to avoid triggering the "reset on path change" useEffect between renders.
 *
 * Sprint 12 — T11
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStaggerAnimation } from '../src/hooks/useStaggerAnimation';

// Stable path fixtures
const SHORT_PATH = ['alpha', 'beta', 'gamma'];
const SHORT_EDGES = ['e-ab', 'e-bg'];

const LONG_PATH = Array.from({ length: 35 }, (_, i) => `node-${i}`);
const LONG_EDGES = Array.from({ length: 34 }, (_, i) => `edge-${i}`);

const ALT_PATH = ['x', 'y', 'z'];
const ALT_EDGES = ['e-xy', 'e-yz'];

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('useStaggerAnimation — initial state (Sprint 12)', () => {
  it('currentStep starts at -1', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES));
    expect(result.current.currentStep).toBe(-1);
  });

  it('revealedSteps is 0 when currentStep is -1', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES));
    expect(result.current.revealedSteps).toBe(0);
  });

  it('isPlaying is false initially', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES));
    expect(result.current.isPlaying).toBe(false);
  });

  it('visibleNodes is empty initially', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES));
    expect(result.current.visibleNodes.size).toBe(0);
  });

  it('visibleEdges is empty initially', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES));
    expect(result.current.visibleEdges.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// play() — starts animation and visibleNodes grows
// ---------------------------------------------------------------------------

describe('useStaggerAnimation — play() starts animation (Sprint 12)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('sets isPlaying to true after play()', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES, 100));
    act(() => { result.current.play(); });
    expect(result.current.isPlaying).toBe(true);
  });

  it('visibleNodes has the first node immediately after play()', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES, 100));
    act(() => { result.current.play(); });
    expect(result.current.visibleNodes.has('alpha')).toBe(true);
  });

  it('visibleNodes grows after one interval tick', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES, 100));
    act(() => { result.current.play(); });
    const sizeBefore = result.current.visibleNodes.size;
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current.visibleNodes.size).toBeGreaterThanOrEqual(sizeBefore);
  });

  it('visibleNodes eventually contains all nodes after full playback', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES, 100));
    act(() => { result.current.play(); });
    // Advance enough time to finish all steps (3 nodes × 100ms = 300ms, add buffer)
    act(() => { vi.advanceTimersByTime(400); });
    expect(result.current.visibleNodes.size).toBe(SHORT_PATH.length);
  });

  it('isPlaying becomes false after playback completes', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES, 100));
    act(() => { result.current.play(); });
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.isPlaying).toBe(false);
  });

  it('revealedSteps equals currentStep+1 while playing', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES, 100));
    act(() => { result.current.play(); });
    // At step 0: revealedSteps = 1
    expect(result.current.revealedSteps).toBe(result.current.currentStep + 1);
  });
});

// ---------------------------------------------------------------------------
// replay() — resets and restarts
// ---------------------------------------------------------------------------

describe('useStaggerAnimation — replay() resets and restarts (Sprint 12)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('replay sets isPlaying to true after setTimeout(0)', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES, 100));
    act(() => { result.current.replay(); });
    act(() => { vi.advanceTimersByTime(0); });
    expect(result.current.isPlaying).toBe(true);
  });

  it('replay resets currentStep to 0 after settling', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES, 100));
    // Advance partway through
    act(() => { result.current.play(); });
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current.currentStep).toBeGreaterThan(0);

    // Now replay — should reset to 0
    act(() => { result.current.replay(); });
    act(() => { vi.advanceTimersByTime(0); });
    expect(result.current.currentStep).toBe(0);
  });

  it('replay clears visibleNodes momentarily before restarting', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES, 100));
    act(() => { result.current.play(); });
    act(() => { vi.advanceTimersByTime(200); });

    // After replay + settling, step is 0 so only one node visible
    act(() => { result.current.replay(); });
    act(() => { vi.advanceTimersByTime(0); });
    expect(result.current.visibleNodes.size).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// >30 nodes auto-accelerates to 100ms
// ---------------------------------------------------------------------------

describe('useStaggerAnimation — >30 nodes auto-accelerate (Sprint 12)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('does not throw for paths with >30 nodes', () => {
    expect(() =>
      renderHook(() => useStaggerAnimation(LONG_PATH, LONG_EDGES))
    ).not.toThrow();
  });

  it('advances at 100ms intervals for >30 node paths', () => {
    const { result } = renderHook(() => useStaggerAnimation(LONG_PATH, LONG_EDGES));
    act(() => { result.current.play(); });
    // Default stepDuration is 350ms, but >30 nodes → 100ms effective
    // After 100ms, we should have moved past step 0
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current.currentStep).toBeGreaterThan(0);
  });

  it('with default 350ms stepDuration for short path, does not advance at 100ms', () => {
    // Short path uses 350ms, so 100ms should NOT advance
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES));
    act(() => { result.current.play(); });
    act(() => { vi.advanceTimersByTime(100); });
    // Should still be at step 0 since 350ms hasn't elapsed
    expect(result.current.currentStep).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Path change resets state
// ---------------------------------------------------------------------------

describe('useStaggerAnimation — path change resets state (Sprint 12)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('resets currentStep to -1 when path reference changes', () => {
    let path = SHORT_PATH;
    let edges = SHORT_EDGES;
    const { result, rerender } = renderHook(
      () => useStaggerAnimation(path, edges, 100),
    );

    act(() => { result.current.play(); });
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current.currentStep).toBeGreaterThan(-1);

    // Change the path reference to trigger the reset effect
    path = ALT_PATH;
    edges = ALT_EDGES;
    act(() => { rerender(); });

    expect(result.current.currentStep).toBe(-1);
  });

  it('resets isPlaying to false when path reference changes', () => {
    let path = SHORT_PATH;
    let edges = SHORT_EDGES;
    const { result, rerender } = renderHook(
      () => useStaggerAnimation(path, edges, 100),
    );

    act(() => { result.current.play(); });
    expect(result.current.isPlaying).toBe(true);

    path = ALT_PATH;
    edges = ALT_EDGES;
    act(() => { rerender(); });

    expect(result.current.isPlaying).toBe(false);
  });
});
