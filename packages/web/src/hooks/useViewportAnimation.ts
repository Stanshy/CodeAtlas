/**
 * CodeAtlas — useViewportAnimation Hook
 *
 * Provides smooth viewport transitions for node focus (zoom to node).
 * Uses React Flow's setCenter / fitView with animation duration.
 */

import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { animation } from '../styles/theme';

export function useViewportAnimation() {
  const { setCenter, fitView } = useReactFlow();

  /**
   * Smoothly move viewport to center on a specific node.
   * Zoom level: 1.2x for focused view.
   */
  const focusNode = useCallback(
    (_nodeId: string, x: number, y: number) => {
      setCenter(x, y, {
        zoom: 1.2,
        duration: animation.nodeFocus.duration * 1000,
      });
    },
    [setCenter],
  );

  /**
   * Smoothly fit all nodes in view after expand/collapse.
   */
  const fitAllNodes = useCallback(() => {
    fitView({
      padding: 0.2,
      duration: animation.directoryToggle.duration * 1000,
    });
  }, [fitView]);

  return { focusNode, fitAllNodes };
}
