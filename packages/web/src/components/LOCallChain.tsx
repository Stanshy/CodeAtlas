/**
 * CodeAtlas — LOCallChain utilities (Sprint 13 T5)
 *
 * Pure utility functions for building call chains from endpointGraph.
 * The rendering is now handled by LOChainNode (React Flow custom node)
 * inside GraphCanvas, mirroring the DJ stagger playback approach.
 *
 * Sprint 13 — T5 (revised).
 */

import type { EndpointGraph, ChainStep, LoCategory } from '../types/graph';

// ---------------------------------------------------------------------------
// File path → category classifier
// ---------------------------------------------------------------------------

function classifyFilePath(filePath: string): LoCategory {
  const p = filePath.toLowerCase().replace(/\\/g, '/');
  if (/\/routes?\/|\/router\/|\/api\/|\/endpoints?\//.test(p)) return 'routes';
  if (/\/middlewares?\/|\/auth\/|\/guards?\//.test(p)) return 'middleware';
  if (/\/services?\/|\/handlers?\/|\/controllers?\//.test(p)) return 'services';
  if (/\/models?\/|\/db\/|\/database\/|\/entities\/|\/schemas?\/|\/migrations?\//.test(p)) return 'models';
  if (/\/utils?\/|\/helpers?\/|\/lib\/|\/tasks?\/|\/jobs?\/|\/workers?\//.test(p)) return 'utils';
  const fileName = p.split('/').pop() ?? '';
  if (/route|router|controller|endpoint/.test(fileName)) return 'routes';
  if (/service|handler|provider/.test(fileName)) return 'services';
  if (/model|entity|schema|migration/.test(fileName)) return 'models';
  if (/middleware|guard|auth/.test(fileName)) return 'middleware';
  return 'utils';
}

// ---------------------------------------------------------------------------
// Build call chain from endpointGraph
// ---------------------------------------------------------------------------

/** Return value includes the full chain + the endpoint title. */
export interface ChainResult {
  steps: ChainStep[];
  /** Endpoint label, e.g. "GET /videos" */
  endpointLabel: string;
}

export function buildChainFromEndpointGraph(
  methodName: string,
  endpointGraph: EndpointGraph,
): ChainResult {
  const empty: ChainResult = { steps: [], endpointLabel: '' };

  // Normalise: strip trailing () for matching
  const bare = methodName.replace(/\(\)$/, '');

  // Build forward adjacency map
  const adjForward = new Map<string, string[]>();
  endpointGraph.edges.forEach((e) => {
    if (!adjForward.has(e.source)) adjForward.set(e.source, []);
    adjForward.get(e.source)!.push(e.target);
  });

  // Find all endpoint nodes (kind === 'endpoint')
  const endpoints = endpointGraph.nodes.filter((n) => n.kind === 'endpoint');

  // For each endpoint, BFS to collect the full chain; check if our method is in it
  for (const ep of endpoints) {
    const visited = new Set<string>();
    const ordered: Array<{ id: string; depth: number }> = [];
    const queue: Array<{ id: string; depth: number }> = [{ id: ep.id, depth: 0 }];
    visited.add(ep.id);

    while (queue.length > 0 && ordered.length < 30) {
      const curr = queue.shift()!;
      ordered.push(curr);
      for (const nb of adjForward.get(curr.id) ?? []) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push({ id: nb, depth: curr.depth + 1 });
        }
      }
    }

    // Check if the clicked method is in this chain
    const matchNode = ordered.find((item) => {
      const node = endpointGraph.nodes.find((n) => n.id === item.id);
      if (!node) return false;
      const lbl = node.label.replace(/\(\)$/, '');
      return lbl === bare;
    });

    if (!matchNode) continue;

    // Found! Build ChainStep[] from the full chain (starting from endpoint)
    const steps: ChainStep[] = [];
    for (const item of ordered) {
      const node = endpointGraph.nodes.find((n) => n.id === item.id);
      if (!node) continue;
      const fileParts = node.filePath.replace(/\\/g, '/').split('/');
      const className = fileParts.length >= 2
        ? fileParts.slice(-2).join('/')
        : fileParts.pop() ?? '';

      steps.push({
        id: item.id,
        methodName: node.label.replace(/\(\)\(\)$/, '()'),
        category: classifyFilePath(node.filePath),
        filePath: node.filePath,
        className,
        depth: item.depth,
      });
    }

    return { steps, endpointLabel: ep.label ?? ep.id };
  }

  // Fallback: method not found in any endpoint chain — try direct BFS from the node itself
  const startNode = endpointGraph.nodes.find(
    (n) => n.label.replace(/\(\)$/, '') === bare,
  );
  if (!startNode) return empty;

  const visited = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [{ id: startNode.id, depth: 0 }];
  visited.add(startNode.id);
  const steps: ChainStep[] = [];

  while (queue.length > 0 && steps.length < 20) {
    const curr = queue.shift()!;
    const node = endpointGraph.nodes.find((n) => n.id === curr.id);
    if (!node) continue;
    const fileParts = node.filePath.replace(/\\/g, '/').split('/');
    const className = fileParts.length >= 2
      ? fileParts.slice(-2).join('/')
      : fileParts.pop() ?? '';
    steps.push({
      id: curr.id,
      methodName: node.label.replace(/\(\)\(\)$/, '()'),
      category: classifyFilePath(node.filePath),
      filePath: node.filePath,
      className,
      depth: curr.depth,
    });
    for (const nb of adjForward.get(curr.id) ?? []) {
      if (!visited.has(nb)) {
        visited.add(nb);
        queue.push({ id: nb, depth: curr.depth + 1 });
      }
    }
  }

  return { steps, endpointLabel: startNode.label };
}
