/**
 * CodeAtlas — useForceLayout Hook
 *
 * D3 force simulation for automatic node positioning.
 * Uses forceLink + forceManyBody + forceCenter + forceCollide.
 * Stops simulation when layout stabilizes (alpha < alphaMin).
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';
import type { Node, Edge } from '@xyflow/react';
import type { NeonNodeData, NeonEdgeData } from '../adapters/graph-adapter';

/** D3 simulation node with position */
interface SimNode extends SimulationNodeDatum {
  id: string;
}

/** Layout configuration */
interface ForceLayoutOptions {
  /** Charge strength (negative = repulsion). Default: -400 */
  chargeStrength?: number;
  /** Link distance. Default: 150 */
  linkDistance?: number;
  /** Collision radius padding around each node. Default: 40 */
  collisionRadius?: number;
  /** Alpha threshold to stop simulation. Default: 0.01 */
  alphaMin?: number;
}

const DEFAULTS: Required<ForceLayoutOptions> = {
  chargeStrength: -400,
  linkDistance: 150,
  collisionRadius: 40,
  alphaMin: 0.01,
};

/**
 * Hook that runs D3 force simulation and returns positioned nodes.
 *
 * @param nodes - React Flow nodes (positions will be updated)
 * @param edges - React Flow edges (used for link forces)
 * @param onPositionsUpdate - Callback with repositioned nodes on each tick
 * @param options - Force layout configuration
 */
export function useForceLayout(
  nodes: Node<NeonNodeData>[],
  edges: Edge<NeonEdgeData>[],
  onPositionsUpdate: (nodes: Node<NeonNodeData>[]) => void,
  options?: ForceLayoutOptions,
) {
  const simulationRef = useRef<Simulation<SimNode, SimulationLinkDatum<SimNode>> | null>(null);
  const nodesRef = useRef(nodes);
  const onUpdateRef = useRef(onPositionsUpdate);

  // Keep refs current
  onUpdateRef.current = onPositionsUpdate;
  nodesRef.current = nodes;

  const stopSimulation = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.stop();
      simulationRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (nodes.length === 0) return;

    const config = { ...DEFAULTS, ...options };

    // Create simulation nodes
    const simNodes: SimNode[] = nodes.map((n) => ({
      id: n.id,
      x: n.position.x || Math.random() * 500,
      y: n.position.y || Math.random() * 500,
    }));

    // Build id→index map
    const nodeIndexMap = new Map<string, number>();
    simNodes.forEach((n, i) => nodeIndexMap.set(n.id, i));

    // Create links (only for edges where both source/target exist)
    const links: SimulationLinkDatum<SimNode>[] = edges
      .filter((e) => nodeIndexMap.has(e.source) && nodeIndexMap.has(e.target))
      .map((e) => ({
        source: simNodes[nodeIndexMap.get(e.source)!],
        target: simNodes[nodeIndexMap.get(e.target)!],
      }));

    // Stop any existing simulation
    stopSimulation();

    const simulation = forceSimulation<SimNode>(simNodes)
      .force(
        'link',
        forceLink<SimNode, SimulationLinkDatum<SimNode>>(links)
          .id((d) => d.id)
          .distance(config.linkDistance),
      )
      .force('charge', forceManyBody<SimNode>().strength(config.chargeStrength))
      .force('center', forceCenter(0, 0))
      .force('collide', forceCollide<SimNode>(config.collisionRadius))
      .alphaMin(config.alphaMin)
      .on('tick', () => {
        const currentNodes = nodesRef.current;
        const updated = currentNodes.map((node) => {
          const simNode = simNodes[nodeIndexMap.get(node.id) ?? -1];
          if (!simNode) return node;
          return {
            ...node,
            position: { x: simNode.x ?? 0, y: simNode.y ?? 0 },
          };
        });
        onUpdateRef.current(updated);
      })
      .on('end', () => {
        // Simulation converged — no further CPU usage
      });

    simulationRef.current = simulation;

    return () => {
      stopSimulation();
    };
  }, [nodes.length, edges.length, stopSimulation, options, nodes, edges]);

  return { stopSimulation };
}
