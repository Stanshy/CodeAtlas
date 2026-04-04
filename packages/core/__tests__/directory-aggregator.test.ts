/**
 * Unit tests for directory-aggregator.ts (Sprint 12 / T2 + Sprint 13 / T3)
 *
 * Coverage targets:
 *   - Basic aggregation (3+ directories) → correct nodes and edges
 *   - Edge weight calculation (multiple file-level edges sum correctly)
 *   - Self-loop removal (intra-directory edges are excluded)
 *   - Flat project fallback (≤ 2 dirs → null)
 *   - Entry classification (directory contains index.ts)
 *   - Logic classification (services directory)
 *   - Data classification (models directory)
 *   - Support classification (utils directory)
 *   - Root-level files handling (files with no directory → "root" bucket)
 *   - Files directly in src/ → "src" bucket
 *   - Monorepo paths (packages/{name}/src/{dir}/...) → first-level segment
 *   - Small directory merging (≤ 2 files → "其他")
 *   - Empty input → null
 *   - Directory role inheritance from children's metadata.role
 *
 * Sprint 13 additions:
 *   - Smart expansion: directory >70% files gets auto-expanded
 *   - sublabel field populated on all directory nodes
 *   - category detection (frontend / backend / infra)
 *   - autoExpand flag set on child nodes produced by expansion
 *   - Edges are correctly reassigned after expansion (no dangling refs)
 *   - Total card count stays in 5~17 range
 *
 * NOTE: getDirKey() now strips the src/ (or packages/{name}/src/) prefix and
 * returns only the FIRST-LEVEL directory segment, e.g.:
 *   "src/services/user.ts"  → bucket "services"
 *   "src/models/user.ts"    → bucket "models"
 *   "src/index.ts"          → bucket "src"
 *   "index.ts"              → bucket "root"
 *   "packages/web/src/components/NeonNode.tsx" → bucket "components"
 */

import { describe, it, expect } from 'vitest';
import { aggregateByDirectory } from '../src/analyzers/directory-aggregator.js';
import type { GraphNode, GraphEdge } from '../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let nodeCounter = 0;

function makeFileNode(
  filePath: string,
  opts: { role?: GraphNode['metadata']['role'] } = {},
): GraphNode {
  return {
    id: filePath,
    type: 'file',
    label: filePath.split('/').pop() ?? filePath,
    filePath,
    metadata: {
      role: opts.role,
    },
  };
}

function makeEdge(
  source: string,
  target: string,
  type: GraphEdge['type'] = 'import',
): GraphEdge {
  nodeCounter += 1;
  return {
    id: `edge-${nodeCounter}`,
    source,
    target,
    type,
    metadata: {},
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('aggregateByDirectory', () => {
  // 1. Empty input → null
  it('returns null for empty node list', () => {
    expect(aggregateByDirectory([], [])).toBeNull();
  });

  // 2. Flat project fallback — only 1 directory
  it('returns null when all files share one directory (≤ 2 dirs)', () => {
    const nodes = [
      makeFileNode('src/a.ts'),
      makeFileNode('src/b.ts'),
    ];
    // Both map to bucket "src" → only 1 bucket → null
    expect(aggregateByDirectory(nodes, [])).toBeNull();
  });

  // 3. Flat project fallback — exactly 2 directories
  it('returns null when there are exactly 2 directories', () => {
    const nodes = [
      makeFileNode('src/services/a.ts'),  // → "services"
      makeFileNode('src/models/b.ts'),    // → "models"
    ];
    expect(aggregateByDirectory(nodes, [])).toBeNull();
  });

  // 4. Basic aggregation with 3 directories → correct nodes returned
  it('returns a DirectoryGraph when there are 3+ directories', () => {
    const nodes = [
      makeFileNode('src/services/user.ts'),   // → "services"
      makeFileNode('src/models/user.ts'),     // → "models"
      makeFileNode('src/utils/format.ts'),    // → "utils"
    ];
    const result = aggregateByDirectory(nodes, []);
    expect(result).not.toBeNull();
    expect(result!.nodes).toHaveLength(3);
    const ids = result!.nodes.map((n) => n.id);
    expect(ids).toContain('services');
    expect(ids).toContain('models');
    expect(ids).toContain('utils');
  });

  // 5. Edge weight calculation — two file edges between same pair of dirs
  it('aggregates multiple file-level edges into a single directory edge with correct weight', () => {
    const nodes = [
      makeFileNode('src/routes/user.ts'),    // → "routes"
      makeFileNode('src/routes/post.ts'),    // → "routes"
      makeFileNode('src/services/user.ts'),  // → "services"
      makeFileNode('src/models/user.ts'),    // → "models"
    ];
    const edges: GraphEdge[] = [
      makeEdge('src/routes/user.ts', 'src/services/user.ts'),
      makeEdge('src/routes/post.ts', 'src/services/user.ts'),
    ];
    const result = aggregateByDirectory(nodes, edges);
    expect(result).not.toBeNull();
    const dirEdge = result!.edges.find(
      (e) => e.source === 'routes' && e.target === 'services',
    );
    expect(dirEdge).toBeDefined();
    expect(dirEdge!.weight).toBe(2);
  });

  // 6. Self-loop removal — intra-directory edges must not appear
  it('removes self-loop edges (same source and target directory)', () => {
    const nodes = [
      makeFileNode('src/services/user.ts'),  // → "services"
      makeFileNode('src/services/post.ts'),  // → "services"
      makeFileNode('src/models/user.ts'),    // → "models"
      makeFileNode('src/utils/log.ts'),      // → "utils"
    ];
    const edges: GraphEdge[] = [
      // intra-directory edge (should be removed — both in "services")
      makeEdge('src/services/user.ts', 'src/services/post.ts'),
      // cross-directory edge (should be kept)
      makeEdge('src/services/user.ts', 'src/models/user.ts'),
    ];
    const result = aggregateByDirectory(nodes, edges);
    expect(result).not.toBeNull();
    const selfLoops = result!.edges.filter((e) => e.source === e.target);
    expect(selfLoops).toHaveLength(0);
    expect(result!.edges).toHaveLength(1);
    expect(result!.edges[0].source).toBe('services');
    expect(result!.edges[0].target).toBe('models');
  });

  // 7. Entry classification — directory containing index.ts → "entry"
  it('classifies a directory containing index.ts as "entry"', () => {
    const nodes = [
      makeFileNode('src/index.ts'),          // → "src" bucket
      makeFileNode('src/services/user.ts'),  // → "services"
      makeFileNode('src/utils/log.ts'),      // → "utils"
    ];
    const result = aggregateByDirectory(nodes, []);
    expect(result).not.toBeNull();
    // "src" bucket contains index.ts → entry
    const srcNode = result!.nodes.find((n) => n.id === 'src');
    expect(srcNode?.type).toBe('entry');
  });

  // 8. Logic classification — "services" bucket
  it('classifies the "services" bucket as "logic"', () => {
    const nodes = [
      makeFileNode('src/services/user.ts'),
      makeFileNode('src/models/user.ts'),
      makeFileNode('src/utils/log.ts'),
    ];
    const result = aggregateByDirectory(nodes, []);
    expect(result).not.toBeNull();
    const servicesNode = result!.nodes.find((n) => n.id === 'services');
    expect(servicesNode?.type).toBe('logic');
  });

  // 9. Data classification — "models" bucket
  it('classifies the "models" bucket as "data"', () => {
    const nodes = [
      makeFileNode('src/services/user.ts'),
      makeFileNode('src/models/user.ts'),
      makeFileNode('src/utils/log.ts'),
    ];
    const result = aggregateByDirectory(nodes, []);
    expect(result).not.toBeNull();
    const modelsNode = result!.nodes.find((n) => n.id === 'models');
    expect(modelsNode?.type).toBe('data');
  });

  // 10. Support classification — "utils" bucket
  it('classifies an unrecognised bucket (utils) as "support"', () => {
    const nodes = [
      makeFileNode('src/services/user.ts'),
      makeFileNode('src/models/user.ts'),
      makeFileNode('src/utils/log.ts'),
    ];
    const result = aggregateByDirectory(nodes, []);
    expect(result).not.toBeNull();
    const utilsNode = result!.nodes.find((n) => n.id === 'utils');
    expect(utilsNode?.type).toBe('support');
  });

  // 11. Root-level files — files with no directory go into "root" bucket
  it('groups root-level files (no directory) under the "root" bucket', () => {
    const nodes = [
      makeFileNode('index.ts'),              // root
      makeFileNode('server.ts'),             // root
      makeFileNode('src/services/a.ts'),     // → "services"
      makeFileNode('src/models/b.ts'),       // → "models"
    ];
    const result = aggregateByDirectory(nodes, []);
    expect(result).not.toBeNull();
    const rootNode = result!.nodes.find((n) => n.id === 'root');
    expect(rootNode).toBeDefined();
    expect(rootNode!.fileCount).toBe(2);
    // Root has server.ts so it should be classified as "entry"
    expect(rootNode!.type).toBe('entry');
  });

  // 12. Files directly in src/ (no subdirectory) → "src" bucket
  it('groups files directly in src/ (no subdirectory) under the "src" bucket', () => {
    const nodes = [
      makeFileNode('src/main.ts'),           // → "src"
      makeFileNode('src/services/user.ts'),  // → "services"
      makeFileNode('src/models/user.ts'),    // → "models"
    ];
    const result = aggregateByDirectory(nodes, []);
    expect(result).not.toBeNull();
    const srcNode = result!.nodes.find((n) => n.id === 'src');
    expect(srcNode).toBeDefined();
    // main.ts is an ENTRY_FILENAME → entry
    expect(srcNode!.type).toBe('entry');
  });

  // 13. Monorepo paths — packages/{name}/src/{dir}/... → first-level segment
  it('strips monorepo prefix and returns first-level segment as bucket id', () => {
    const nodes = [
      makeFileNode('packages/web/src/components/NeonNode.tsx'),   // → "components"
      makeFileNode('packages/web/src/hooks/useForce.ts'),         // → "hooks"
      makeFileNode('packages/core/src/analyzers/dir-agg.ts'),     // → "analyzers"
    ];
    const result = aggregateByDirectory(nodes, []);
    expect(result).not.toBeNull();
    const ids = result!.nodes.map((n) => n.id);
    expect(ids).toContain('components');
    expect(ids).toContain('hooks');
    expect(ids).toContain('analyzers');
  });

  // 14. Small directory merging — buckets with ≤ 2 files merge into "其他"
  it('merges small buckets (≤ 2 files) into "其他" when enough dirs remain', () => {
    const nodes = [
      // Large buckets
      makeFileNode('src/services/a.ts'),
      makeFileNode('src/services/b.ts'),
      makeFileNode('src/services/c.ts'),
      makeFileNode('src/models/a.ts'),
      makeFileNode('src/models/b.ts'),
      makeFileNode('src/models/c.ts'),
      makeFileNode('src/controllers/a.ts'),
      makeFileNode('src/controllers/b.ts'),
      makeFileNode('src/controllers/c.ts'),
      makeFileNode('src/routes/a.ts'),
      makeFileNode('src/routes/b.ts'),
      makeFileNode('src/routes/c.ts'),
      // Small buckets (≤ 2 files each — should be merged)
      makeFileNode('src/utils/helper.ts'),
      makeFileNode('src/config/env.ts'),
    ];
    const result = aggregateByDirectory(nodes, []);
    expect(result).not.toBeNull();
    // utils and config have 1 file each — merged into "其他"
    const ids = result!.nodes.map((n) => n.id);
    expect(ids).not.toContain('utils');
    expect(ids).not.toContain('config');
    expect(ids).toContain('其他');
    const otherNode = result!.nodes.find((n) => n.id === '其他');
    expect(otherNode!.fileCount).toBe(2);
  });

  // 15. Small directory merging is skipped when it would leave < 4 directories
  it('skips small-bucket merging when the result would have fewer than 4 directories', () => {
    // 4 directories, 2 of which are small — merging would leave 3 → skip
    const nodes = [
      makeFileNode('src/services/a.ts'),
      makeFileNode('src/services/b.ts'),
      makeFileNode('src/services/c.ts'),
      makeFileNode('src/models/a.ts'),
      makeFileNode('src/models/b.ts'),
      makeFileNode('src/models/c.ts'),
      makeFileNode('src/utils/helper.ts'),   // small (1 file)
      makeFileNode('src/config/env.ts'),     // small (1 file)
    ];
    const result = aggregateByDirectory(nodes, []);
    expect(result).not.toBeNull();
    // 4 buckets total, 2 small → merging gives 3 total → below threshold → skip
    const ids = result!.nodes.map((n) => n.id);
    expect(ids).toContain('utils');
    expect(ids).toContain('config');
    expect(ids).not.toContain('其他');
  });

  // 16. Directory role inheritance from children metadata.role (majority wins)
  it('assigns directory role from majority child metadata.role', () => {
    const nodes = [
      makeFileNode('src/services/user.ts',   { role: 'business-logic' }),
      makeFileNode('src/services/post.ts',   { role: 'business-logic' }),
      makeFileNode('src/services/util.ts',   { role: 'utility' }),
      makeFileNode('src/models/user.ts',     { role: 'infrastructure' }),
      makeFileNode('src/utils/log.ts',       { role: 'utility' }),
    ];
    const result = aggregateByDirectory(nodes, []);
    expect(result).not.toBeNull();
    const servicesNode = result!.nodes.find((n) => n.id === 'services');
    // 2 × "business-logic" vs 1 × "utility" → "business-logic" wins
    expect(servicesNode?.role).toBe('business-logic');
  });

  // 17. fileCount and files array populated correctly
  it('populates fileCount and files array correctly on each directory node', () => {
    const nodes = [
      makeFileNode('src/services/a.ts'),
      makeFileNode('src/services/b.ts'),
      makeFileNode('src/models/c.ts'),
      makeFileNode('src/utils/d.ts'),
    ];
    const result = aggregateByDirectory(nodes, []);
    expect(result).not.toBeNull();
    const servicesNode = result!.nodes.find((n) => n.id === 'services');
    expect(servicesNode!.fileCount).toBe(2);
    expect(servicesNode!.files).toContain('src/services/a.ts');
    expect(servicesNode!.files).toContain('src/services/b.ts');
  });

  // 18. Call edges are excluded from directory edge calculation
  it('ignores call-type edges when computing directory edges', () => {
    const nodes = [
      makeFileNode('src/services/a.ts'),
      makeFileNode('src/models/b.ts'),
      makeFileNode('src/utils/c.ts'),
    ];
    const edges: GraphEdge[] = [
      makeEdge('src/services/a.ts', 'src/models/b.ts', 'call'),
    ];
    const result = aggregateByDirectory(nodes, edges);
    expect(result).not.toBeNull();
    expect(result!.edges).toHaveLength(0);
  });

  // 19. label is the directory bucket id (single segment after prefix stripping)
  it('uses the bucket id as the directory node label', () => {
    const nodes = [
      makeFileNode('src/services/user.ts'),
      makeFileNode('src/models/post.ts'),
      makeFileNode('src/utils/format.ts'),
    ];
    const result = aggregateByDirectory(nodes, []);
    expect(result).not.toBeNull();
    const servicesNode = result!.nodes.find((n) => n.id === 'services');
    // label = dirSegment(id) = "services" (single-segment id → identity)
    expect(servicesNode!.label).toBe('services');
  });

  // ---------------------------------------------------------------------------
  // Sprint 13 / T3: Smart expansion, sublabel, category, autoExpand
  // ---------------------------------------------------------------------------

  // 20. sublabel is populated for every directory node
  it('populates sublabel with a trailing slash on every directory node', () => {
    const nodes = [
      makeFileNode('src/services/user.ts'),
      makeFileNode('src/models/post.ts'),
      makeFileNode('src/utils/format.ts'),
    ];
    const result = aggregateByDirectory(nodes, []);
    expect(result).not.toBeNull();
    for (const node of result!.nodes) {
      expect(node.sublabel).toBeDefined();
      expect(node.sublabel).toMatch(/\/$/);
    }
  });

  // 21. category detection — path containing 'frontend' → 'frontend'
  it('assigns category "frontend" to a directory whose key contains "frontend"', () => {
    // Create a mix where frontend/ has many files and other dirs are smallish
    const nodes = [
      makeFileNode('frontend/components/Button.tsx'),
      makeFileNode('frontend/components/Input.tsx'),
      makeFileNode('frontend/components/Modal.tsx'),
      makeFileNode('frontend/pages/Home.tsx'),
      makeFileNode('frontend/pages/Login.tsx'),
      makeFileNode('nginx/nginx.conf'),
      makeFileNode('scripts/deploy.sh'),
      makeFileNode('config/env.ts'),
    ];
    const result = aggregateByDirectory(nodes, []);
    expect(result).not.toBeNull();
    // After potential expansion the "frontend" subtree nodes should carry
    // category === 'frontend', while nginx/scripts/config → 'infra'
    const frontendNodes = result!.nodes.filter((n) =>
      n.id === 'frontend' || n.id.startsWith('frontend/'),
    );
    for (const n of frontendNodes) {
      expect(n.category).toBe('frontend');
    }
  });

  // 22. category detection — explicit frontend/backend split
  it('assigns correct categories when both frontend/ and backend/ top-level dirs exist', () => {
    // Build a project with explicit frontend/ and backend/ top-level dirs.
    // Neither should dominate (we cap both under 70%) so no expansion occurs —
    // this lets us check category assignment without expansion side-effects.
    const frontendFiles = Array.from({ length: 5 }, (_, i) =>
      makeFileNode(`frontend/src/components/Comp${i}.tsx`),
    );
    const backendFiles = Array.from({ length: 4 }, (_, i) =>
      makeFileNode(`backend/services/svc${i}.ts`),
    );
    const infraFiles = [
      makeFileNode('nginx/nginx.conf'),
      makeFileNode('scripts/deploy.sh'),
      makeFileNode('docker/Dockerfile'),
    ];
    const nodes = [...frontendFiles, ...backendFiles, ...infraFiles];
    const result = aggregateByDirectory(nodes, []);
    expect(result).not.toBeNull();

    // All nodes that resolved to "frontend" bucket → category frontend
    const feNode = result!.nodes.find((n) => n.id === 'frontend');
    if (feNode) {
      expect(feNode.category).toBe('frontend');
    }

    // All nodes that resolved to "backend" bucket → category backend
    const beNode = result!.nodes.find((n) => n.id === 'backend');
    if (beNode) {
      expect(beNode.category).toBe('backend');
    }

    // nginx / scripts / docker → infra
    for (const id of ['nginx', 'scripts', 'docker']) {
      const node = result!.nodes.find((n) => n.id === id);
      if (node) {
        expect(node.category).toBe('infra');
      }
    }
  });

  // 23. Smart expansion: a directory with >70% of files gets expanded
  it('auto-expands a directory that contains >70% of total files', () => {
    // 10 files in frontend/src/*, 1 file each in nginx/ and scripts/ (3 total non-frontend)
    // frontend share = 10/12 ≈ 83% → should expand
    const frontendFiles = [
      makeFileNode('frontend/src/components/Button.tsx'),
      makeFileNode('frontend/src/components/Input.tsx'),
      makeFileNode('frontend/src/pages/Home.tsx'),
      makeFileNode('frontend/src/pages/Login.tsx'),
      makeFileNode('frontend/src/hooks/useAuth.ts'),
      makeFileNode('frontend/src/hooks/useTheme.ts'),
      makeFileNode('frontend/src/services/api.ts'),
      makeFileNode('frontend/src/services/auth.ts'),
      makeFileNode('frontend/src/utils/format.ts'),
      makeFileNode('frontend/src/utils/validate.ts'),
    ];
    const otherFiles = [
      makeFileNode('nginx/nginx.conf'),
      makeFileNode('scripts/deploy.sh'),
    ];
    const nodes = [...frontendFiles, ...otherFiles];
    const result = aggregateByDirectory(nodes, []);
    expect(result).not.toBeNull();

    // The "frontend" directory itself should have been replaced by children
    const frontendNode = result!.nodes.find((n) => n.id === 'frontend');
    expect(frontendNode).toBeUndefined();

    // Child nodes should exist (sub-dirs of frontend/)
    const expandedChildren = result!.nodes.filter(
      (n) => n.id.startsWith('frontend/') && n.autoExpand === true,
    );
    expect(expandedChildren.length).toBeGreaterThan(1);
  });

  // 24. autoExpand flag is set on expanded child nodes
  it('sets autoExpand: true only on nodes produced by smart expansion', () => {
    const frontendFiles = [
      makeFileNode('frontend/src/components/Button.tsx'),
      makeFileNode('frontend/src/components/Input.tsx'),
      makeFileNode('frontend/src/pages/Home.tsx'),
      makeFileNode('frontend/src/pages/Login.tsx'),
      makeFileNode('frontend/src/hooks/useAuth.ts'),
      makeFileNode('frontend/src/services/api.ts'),
      makeFileNode('frontend/src/utils/format.ts'),
    ];
    const otherFiles = [
      makeFileNode('nginx/nginx.conf'),
      makeFileNode('scripts/deploy.sh'),
    ];
    const nodes = [...frontendFiles, ...otherFiles];
    const result = aggregateByDirectory(nodes, []);
    expect(result).not.toBeNull();

    // Nodes that were NOT expanded (nginx, scripts) must NOT have autoExpand
    for (const node of result!.nodes) {
      if (!node.id.startsWith('frontend/')) {
        expect(node.autoExpand).toBeFalsy();
      }
    }

    // Nodes that came from expansion must have autoExpand === true
    const autoExpandedNodes = result!.nodes.filter(
      (n) => n.id.startsWith('frontend/') && n.autoExpand === true,
    );
    expect(autoExpandedNodes.length).toBeGreaterThan(0);
  });

  // 25. Edges are correctly reassigned after expansion
  it('reassigns edges from the expanded parent to the appropriate child nodes', () => {
    // frontend/ contains 80% of files → will be expanded
    // nginx/ → frontend/src/services/ edge should become nginx/ → frontend/src/services/
    const frontendFiles = [
      makeFileNode('frontend/src/components/Button.tsx'),
      makeFileNode('frontend/src/components/Input.tsx'),
      makeFileNode('frontend/src/services/api.ts'),
      makeFileNode('frontend/src/services/auth.ts'),
      makeFileNode('frontend/src/hooks/useAuth.ts'),
      makeFileNode('frontend/src/utils/format.ts'),
      makeFileNode('frontend/src/pages/Home.tsx'),
      makeFileNode('frontend/src/pages/Login.tsx'),
    ];
    const otherFiles = [
      makeFileNode('nginx/nginx.conf'),
      makeFileNode('scripts/deploy.sh'),
    ];
    const nodes = [...frontendFiles, ...otherFiles];

    // File-level edges: nginx → frontend/src/services files
    const fileEdges: GraphEdge[] = [
      makeEdge('nginx/nginx.conf', 'frontend/src/services/api.ts', 'import'),
    ];

    const result = aggregateByDirectory(nodes, fileEdges);
    expect(result).not.toBeNull();

    // After expansion, there must be no edge referencing the old "frontend" bucket
    const danglingEdges = result!.edges.filter(
      (e) => e.source === 'frontend' || e.target === 'frontend',
    );
    expect(danglingEdges).toHaveLength(0);
  });

  // 26. Total card count stays in 5~17 range after expansion
  it('keeps total card count between 5 and 17 after smart expansion', () => {
    // Build a large project where frontend/ dominates
    const frontendFiles = Array.from({ length: 20 }, (_, i) =>
      makeFileNode(`frontend/src/sub${i % 5}/file${i}.tsx`),
    );
    const otherFiles = [
      makeFileNode('nginx/nginx.conf'),
      makeFileNode('scripts/build.sh'),
      makeFileNode('docker/Dockerfile'),
    ];
    const nodes = [...frontendFiles, ...otherFiles];
    const result = aggregateByDirectory(nodes, []);
    expect(result).not.toBeNull();
    expect(result!.nodes.length).toBeGreaterThanOrEqual(5);
    expect(result!.nodes.length).toBeLessThanOrEqual(17);
  });

  // 27. Non-expanded directories still receive sublabel and category
  it('assigns sublabel and category to non-expanded directories', () => {
    // All three dirs have roughly equal share → none dominates → no expansion
    const nodes = [
      makeFileNode('src/services/a.ts'),
      makeFileNode('src/services/b.ts'),
      makeFileNode('src/services/c.ts'),
      makeFileNode('src/models/a.ts'),
      makeFileNode('src/models/b.ts'),
      makeFileNode('src/models/c.ts'),
      makeFileNode('src/utils/a.ts'),
      makeFileNode('src/utils/b.ts'),
      makeFileNode('src/utils/c.ts'),
    ];
    const result = aggregateByDirectory(nodes, []);
    expect(result).not.toBeNull();
    for (const node of result!.nodes) {
      expect(node.sublabel).toBeDefined();
      expect(typeof node.sublabel).toBe('string');
      expect(node.category).toBeDefined();
    }
  });
});
