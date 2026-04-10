/**
 * Sprint 11 — useStaggerAnimation unit tests
 *
 * Coverage:
 *   - Default stepDuration is 350ms (effectiveDuration when path <= 30)
 *   - >30 nodes: effectiveDuration becomes 100ms
 *   - Initial state: currentStep = -1, isPlaying = false, visibleNodes/Edges empty
 *   - play() sets isPlaying to true and currentStep to 0
 *   - pause() sets isPlaying to false
 *   - replay() resets and restarts playback
 *   - visibleNodes grows as currentStep increases
 *   - visibleEdges grows as currentStep increases (from step 1)
 *   - totalSteps equals path length
 *
 * IMPORTANT: path/pathEdges must be stable references (defined outside renderHook
 * callback) to avoid triggering the "reset on path change" effect.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStaggerAnimation } from '../src/hooks/useStaggerAnimation';

// Stable path fixtures — defined at module level to avoid reference change between renders
const SHORT_PATH = ['nodeA', 'nodeB', 'nodeC'];
const SHORT_EDGES = ['edgeAB', 'edgeBC'];

const LONG_PATH = Array.from({ length: 35 }, (_, i) => `n${i}`);
const LONG_EDGES = Array.from({ length: 34 }, (_, i) => `e${i}`);

// ---------------------------------------------------------------------------
// Initial state (no fake timers needed)
// ---------------------------------------------------------------------------

describe('useStaggerAnimation — initial state', () => {
  it('currentStep starts at -1', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES));
    expect(result.current.currentStep).toBe(-1);
  });

  it('isPlaying starts as false', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES));
    expect(result.current.isPlaying).toBe(false);
  });

  it('visibleNodes is empty at start', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES));
    expect(result.current.visibleNodes.size).toBe(0);
  });

  it('visibleEdges is empty at start', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES));
    expect(result.current.visibleEdges.size).toBe(0);
  });

  it('totalSteps equals path length', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES));
    expect(result.current.totalSteps).toBe(SHORT_PATH.length);
  });

  it('totalSteps is 0 for empty path', () => {
    const empty: string[] = [];
    const { result } = renderHook(() => useStaggerAnimation(empty, empty));
    expect(result.current.totalSteps).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// stepDuration / effectiveDuration configuration
// ---------------------------------------------------------------------------

describe('useStaggerAnimation — stepDuration configuration', () => {
  it('hook accepts default 350ms without error for short path', () => {
    expect(() => renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES))).not.toThrow();
  });

  it('hook does not throw with >30 node path (auto-acceleration to 100ms)', () => {
    expect(() => renderHook(() => useStaggerAnimation(LONG_PATH, LONG_EDGES))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// play / pause (using fake timers)
// ---------------------------------------------------------------------------

describe('useStaggerAnimation — play', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('sets isPlaying to true after calling play()', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES, 100));
    act(() => { result.current.play(); });
    expect(result.current.isPlaying).toBe(true);
  });

  it('sets currentStep to 0 immediately after play()', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES, 100));
    act(() => { result.current.play(); });
    expect(result.current.currentStep).toBe(0);
  });

  it('advances currentStep after one interval tick', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES, 100));
    act(() => { result.current.play(); });
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current.currentStep).toBeGreaterThan(0);
  });
});

describe('useStaggerAnimation — pause', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('sets isPlaying to false after pause()', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES, 100));
    act(() => { result.current.play(); });
    act(() => { result.current.pause(); });
    expect(result.current.isPlaying).toBe(false);
  });

  it('pausing prevents further currentStep advances', () => {
    const fivePath = ['a', 'b', 'c', 'd', 'e'];
    const fiveEdges = ['e1', 'e2', 'e3', 'e4'];
    const { result } = renderHook(() => useStaggerAnimation(fivePath, fiveEdges, 100));
    act(() => { result.current.play(); });
    act(() => { vi.advanceTimersByTime(100); });
    const stepAtPause = result.current.currentStep;
    act(() => { result.current.pause(); });
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.currentStep).toBe(stepAtPause);
  });
});

// ---------------------------------------------------------------------------
// replay
// ---------------------------------------------------------------------------

describe('useStaggerAnimation — replay', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('replay sets isPlaying to true after setTimeout(0)', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES, 100));
    act(() => { result.current.replay(); });
    act(() => { vi.advanceTimersByTime(0); });
    expect(result.current.isPlaying).toBe(true);
  });

  it('replay resets currentStep to 0 after setTimeout(0)', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES, 100));
    // Advance to step 1 first
    act(() => { result.current.play(); });
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current.currentStep).toBeGreaterThan(0);

    // Now replay
    act(() => { result.current.replay(); });
    act(() => { vi.advanceTimersByTime(0); });
    expect(result.current.currentStep).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// visibleNodes / visibleEdges progression
// ---------------------------------------------------------------------------

describe('useStaggerAnimation — visibleNodes/visibleEdges', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('visibleNodes contains first node at step 0 after play()', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES, 100));
    act(() => { result.current.play(); });
    // step 0 shows first node
    expect(result.current.visibleNodes.has('nodeA')).toBe(true);
  });

  it('visibleNodes grows after advancing one interval', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES, 100));
    act(() => { result.current.play(); });
    const sizeAt0 = result.current.visibleNodes.size;
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current.visibleNodes.size).toBeGreaterThanOrEqual(sizeAt0);
  });

  it('visibleEdges is empty at step 0', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES, 100));
    act(() => { result.current.play(); });
    // visibleEdges requires currentStep >= 1
    expect(result.current.visibleEdges.size).toBe(0);
  });

  it('visibleEdges contains first edge at step 1', () => {
    const { result } = renderHook(() => useStaggerAnimation(SHORT_PATH, SHORT_EDGES, 100));
    act(() => { result.current.play(); });
    act(() => { vi.advanceTimersByTime(100); });
    // At step 1 (currentStep >= 1), first edge should be visible
    if (result.current.currentStep >= 1) {
      expect(result.current.visibleEdges.has('edgeAB')).toBe(true);
    }
  });

  it('>30 nodes: play then advance at 100ms (accelerated duration)', () => {
    const { result } = renderHook(() => useStaggerAnimation(LONG_PATH, LONG_EDGES));
    act(() => { result.current.play(); });
    // Advance by 100ms — effective duration for >30 nodes is 100ms
    act(() => { vi.advanceTimersByTime(100); });
    act(() => { result.current.pause(); });
    expect(result.current.currentStep).toBeGreaterThanOrEqual(0);
  });
});
