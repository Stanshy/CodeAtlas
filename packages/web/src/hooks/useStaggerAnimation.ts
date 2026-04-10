/**
 * CodeAtlas — useStaggerAnimation
 *
 * Controls the step-by-step reveal animation for the data-journey perspective.
 * Each step "appears" (opacity 0 → 1) rather than just highlighting.
 *
 * Sprint 12 — T7 (reworked from Sprint 11):
 *   - revealedSteps: number — how many steps have appeared so far
 *   - Nodes NOT in revealed steps → opacity 0 (invisible, not dimmed)
 *   - Edges NOT in revealed steps → stroke-dashoffset: 200 (not drawn)
 *   - Each step appears after 350ms delay
 *   - >30 steps: auto-accelerate to 100ms/step
 *   - replay() resets and restarts animation
 *   - isPlaying state exposed for UI
 *
 * Rules (boss-approved):
 *   - stepDuration: 350ms (fixed)
 *   - >30 nodes: auto-accelerate to 100ms (only exception)
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

export interface StaggerState {
  currentStep: number;
  totalSteps: number;
  /** How many steps have been revealed (0 = none, totalSteps = all) */
  revealedSteps: number;
  isPlaying: boolean;
  visibleNodes: Set<string>;
  visibleEdges: Set<string>;
}

export interface StaggerControls {
  play: () => void;
  pause: () => void;
  replay: () => void;
}

/**
 * Controls stagger playback along a node/edge path.
 *
 * @param path         Ordered node IDs to reveal
 * @param pathEdges    Ordered edge IDs to reveal (pathEdges[i] connects path[i] → path[i+1])
 * @param stepDuration Duration per step in ms (default 350ms, boss-approved)
 */
export function useStaggerAnimation(
  path: string[],
  pathEdges: string[],
  stepDuration: number = 350,
): StaggerState & StaggerControls {
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // >30 nodes: auto-accelerate (only exception to the 350ms rule)
  const effectiveDuration = path.length > 30 ? 100 : stepDuration;

  // Clear interval helper
  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const play = useCallback(() => {
    clearTimer();

    // If already at end, do nothing (user should use replay)
    const startStep = currentStep < 0 ? 0 : currentStep;
    if (startStep >= path.length) return;

    setIsPlaying(true);
    setCurrentStep(startStep);

    let step = startStep;
    intervalRef.current = setInterval(() => {
      step++;
      if (step >= path.length) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setCurrentStep(path.length - 1);
        setIsPlaying(false);
        return;
      }
      setCurrentStep(step);
    }, effectiveDuration);
  }, [clearTimer, currentStep, path.length, effectiveDuration]);

  const pause = useCallback(() => {
    clearTimer();
    setIsPlaying(false);
  }, [clearTimer]);

  const replay = useCallback(() => {
    clearTimer();
    setCurrentStep(-1);
    setIsPlaying(false);

    // Start from 0 on next tick
    setTimeout(() => {
      setCurrentStep(0);
      setIsPlaying(true);

      let step = 0;
      intervalRef.current = setInterval(() => {
        step++;
        if (step >= path.length) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setCurrentStep(path.length - 1);
          setIsPlaying(false);
          return;
        }
        setCurrentStep(step);
      }, effectiveDuration);
    }, 0);
  }, [clearTimer, path.length, effectiveDuration]);

  // Cleanup on unmount or path change
  useEffect(() => {
    return () => { clearTimer(); };
  }, [clearTimer]);

  // Reset when path changes
  useEffect(() => {
    clearTimer();
    setCurrentStep(-1);
    setIsPlaying(false);
  }, [path, clearTimer]);

  const visibleNodes = useMemo(() => {
    if (currentStep < 0) return new Set<string>();
    return new Set(path.slice(0, currentStep + 1));
  }, [path, currentStep]);

  const visibleEdges = useMemo(() => {
    if (currentStep < 1) return new Set<string>();
    return new Set(pathEdges.slice(0, currentStep));
  }, [pathEdges, currentStep]);

  // revealedSteps: 0 when nothing shown, N = currentStep+1 when playing/done
  const revealedSteps = currentStep < 0 ? 0 : currentStep + 1;

  return {
    currentStep,
    totalSteps: path.length,
    revealedSteps,
    isPlaying,
    visibleNodes,
    visibleEdges,
    play,
    pause,
    replay,
  };
}
