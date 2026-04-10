/**
 * SFDetailPanel component unit tests
 *
 * Coverage:
 *   - Shows empty state when no node is selected
 *   - Shows statistics section (Files, Lines) when node is selected
 *   - Shows functions count in statistics when functions are present
 *   - Shows files list for the selected directory
 *   - Expands a file row to show its functions on click
 *   - Shows upstream/downstream directory sections
 *   - Shows "No upstream dependencies" when none exist
 *   - Shows "No downstream dependencies" when none exist
 *   - Shows upstream directory names
 *   - Shows downstream directory names
 *   - Shows the selected directory label in the header
 *
 * Sprint 13 — T8
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SFDetailPanel } from '../src/components/SFDetailPanel';
import type { DirectoryGraph, GraphNode, GraphEdge } from '../src/types/graph';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeDirectoryGraph(
  nodes: Array<{ id: string; label: string }>,
  edges: Array<{ source: string; target: string }> = [],
): DirectoryGraph {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      label: n.label,
      type: 'logic' as const,
      fileCount: 3,
      files: [],
      role: 'logic',
    })),
    edges: edges.map((e) => ({ source: e.source, target: e.target, weight: 1 })),
  };
}

function makeFileNode(id: string, filePath: string): GraphNode {
  return {
    id,
    type: 'file',
    label: filePath.split('/').pop() ?? filePath,
    filePath,
    metadata: {},
  };
}

function makeFunctionNode(id: string, label: string, parentFileId: string): GraphNode {
  return {
    id,
    type: 'function',
    label,
    filePath: 'src/controllers/user.ts',
    metadata: {
      parentFileId,
      kind: 'function',
    },
  };
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('SFDetailPanel — empty state', () => {
  it('shows empty state message when selectedNodeId is null', () => {
    render(
      React.createElement(SFDetailPanel, {
        selectedNodeId: null,
        directoryGraph: null,
        graphNodes: [],
        graphEdges: [],
      }),
    );
    expect(screen.getByText('Click a directory card to view details')).toBeTruthy();
  });

  it('shows empty state when selectedNodeId is set but directoryGraph is null', () => {
    render(
      React.createElement(SFDetailPanel, {
        selectedNodeId: 'src/controllers',
        directoryGraph: null,
        graphNodes: [],
        graphEdges: [],
      }),
    );
    expect(screen.getByText('Click a directory card to view details')).toBeTruthy();
  });

  it('shows empty state when node id not found in directoryGraph', () => {
    const graph = makeDirectoryGraph([{ id: 'other-dir', label: 'OtherDir' }]);
    render(
      React.createElement(SFDetailPanel, {
        selectedNodeId: 'src/controllers',
        directoryGraph: graph,
        graphNodes: [],
        graphEdges: [],
      }),
    );
    expect(screen.getByText('Click a directory card to view details')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

describe('SFDetailPanel — header', () => {
  it('shows the selected directory label in the header', () => {
    const graph = makeDirectoryGraph([{ id: 'src/controllers', label: 'controllers' }]);
    render(
      React.createElement(SFDetailPanel, {
        selectedNodeId: 'src/controllers',
        directoryGraph: graph,
        graphNodes: [],
        graphEdges: [],
      }),
    );
    expect(screen.getByText('controllers')).toBeTruthy();
  });

  it('shows a different directory label correctly', () => {
    const graph = makeDirectoryGraph([{ id: 'src/services', label: 'services' }]);
    render(
      React.createElement(SFDetailPanel, {
        selectedNodeId: 'src/services',
        directoryGraph: graph,
        graphNodes: [],
        graphEdges: [],
      }),
    );
    expect(screen.getByText('services')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Statistics section
// ---------------------------------------------------------------------------

describe('SFDetailPanel — statistics section', () => {
  it('shows Statistics section heading', () => {
    const graph = makeDirectoryGraph([{ id: 'src/routes', label: 'routes' }]);
    render(
      React.createElement(SFDetailPanel, {
        selectedNodeId: 'src/routes',
        directoryGraph: graph,
        graphNodes: [],
        graphEdges: [],
      }),
    );
    expect(screen.getByText('Statistics')).toBeTruthy();
  });

  it('shows Files row in statistics', () => {
    const graph = makeDirectoryGraph([{ id: 'src/routes', label: 'routes' }]);
    render(
      React.createElement(SFDetailPanel, {
        selectedNodeId: 'src/routes',
        directoryGraph: graph,
        graphNodes: [],
        graphEdges: [],
      }),
    );
    expect(screen.getByText('Files')).toBeTruthy();
  });

  it('shows Lines row in statistics', () => {
    const graph = makeDirectoryGraph([{ id: 'src/routes', label: 'routes' }]);
    render(
      React.createElement(SFDetailPanel, {
        selectedNodeId: 'src/routes',
        directoryGraph: graph,
        graphNodes: [],
        graphEdges: [],
      }),
    );
    expect(screen.getByText('Lines')).toBeTruthy();
  });

  it('shows function count in statistics when functions exist', () => {
    const graph = makeDirectoryGraph([{ id: 'src/routes', label: 'routes' }]);
    const fileNode = makeFileNode('file-1', 'src/routes/api.ts');
    const fnNode = makeFunctionNode('fn-1', 'getItems', 'file-1');
    render(
      React.createElement(SFDetailPanel, {
        selectedNodeId: 'src/routes',
        directoryGraph: graph,
        graphNodes: [fileNode, fnNode],
        graphEdges: [],
      }),
    );
    expect(screen.getByText('Functions')).toBeTruthy();
  });

  it('shows Functions row with dash when no functions exist', () => {
    const graph = makeDirectoryGraph([{ id: 'src/routes', label: 'routes' }]);
    render(
      React.createElement(SFDetailPanel, {
        selectedNodeId: 'src/routes',
        directoryGraph: graph,
        graphNodes: [],
        graphEdges: [],
      }),
    );
    // Functions stat row is always rendered; value shows '—' when count is 0
    expect(screen.getByText('Functions')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Files section
// ---------------------------------------------------------------------------

describe('SFDetailPanel — files section', () => {
  it('shows Files section heading when directory has file nodes', () => {
    const graph = makeDirectoryGraph([{ id: 'src/routes', label: 'routes' }]);
    const fileNode = makeFileNode('file-1', 'src/routes/api.ts');
    render(
      React.createElement(SFDetailPanel, {
        selectedNodeId: 'src/routes',
        directoryGraph: graph,
        graphNodes: [fileNode],
        graphEdges: [],
      }),
    );
    expect(screen.getByText('File list')).toBeTruthy();
  });

  it('shows file names in the files list', () => {
    const graph = makeDirectoryGraph([{ id: 'src/routes', label: 'routes' }]);
    const fileNode = makeFileNode('file-1', 'src/routes/api.ts');
    render(
      React.createElement(SFDetailPanel, {
        selectedNodeId: 'src/routes',
        directoryGraph: graph,
        graphNodes: [fileNode],
        graphEdges: [],
      }),
    );
    expect(screen.getByText('api.ts')).toBeTruthy();
  });

  it('expands a file row to show its functions on click', () => {
    const graph = makeDirectoryGraph([{ id: 'src/controllers', label: 'controllers' }]);
    const fileNode = makeFileNode('file-1', 'src/controllers/user.ts');
    const fnNode = makeFunctionNode('fn-1', 'createUser', 'file-1');
    render(
      React.createElement(SFDetailPanel, {
        selectedNodeId: 'src/controllers',
        directoryGraph: graph,
        graphNodes: [fileNode, fnNode],
        graphEdges: [],
      }),
    );

    // Function label is rendered as "createUser()" (with parens)
    expect(screen.queryByText('createUser()')).toBeNull();

    // Sprint 16: panel now includes an AI button — use getAllByRole and pick the
    // file row (role="button" div), which is always the first button element
    const buttons = screen.getAllByRole('button');
    const fileRow = buttons[0]!;
    fireEvent.click(fileRow);

    // Function should now be visible (rendered as fn.label + "()")
    expect(screen.getByText('createUser()')).toBeTruthy();
  });

  it('collapses an expanded file row on second click', () => {
    const graph = makeDirectoryGraph([{ id: 'src/controllers', label: 'controllers' }]);
    const fileNode = makeFileNode('file-1', 'src/controllers/user.ts');
    const fnNode = makeFunctionNode('fn-1', 'deleteUser', 'file-1');
    render(
      React.createElement(SFDetailPanel, {
        selectedNodeId: 'src/controllers',
        directoryGraph: graph,
        graphNodes: [fileNode, fnNode],
        graphEdges: [],
      }),
    );

    // Sprint 16: panel now includes an AI button — pick the file row (first button)
    const fileRow = screen.getAllByRole('button')[0]!;
    fireEvent.click(fileRow);
    // Function label rendered as "deleteUser()"
    expect(screen.getByText('deleteUser()')).toBeTruthy();

    fireEvent.click(fileRow);
    expect(screen.queryByText('deleteUser()')).toBeNull();
  });

  it('shows fns count badge for a file with functions', () => {
    const graph = makeDirectoryGraph([{ id: 'src/routes', label: 'routes' }]);
    const fileNode = makeFileNode('file-1', 'src/routes/items.ts');
    const fn1 = makeFunctionNode('fn-1', 'getItems', 'file-1');
    const fn2 = makeFunctionNode('fn-2', 'postItem', 'file-1');
    render(
      React.createElement(SFDetailPanel, {
        selectedNodeId: 'src/routes',
        directoryGraph: graph,
        graphNodes: [fileNode, fn1, fn2],
        graphEdges: [],
      }),
    );
    expect(screen.getByText('2 fns')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Upstream / Downstream sections
// ---------------------------------------------------------------------------

describe('SFDetailPanel — upstream section', () => {
  it('shows Upstream section heading', () => {
    const graph = makeDirectoryGraph([{ id: 'src/routes', label: 'routes' }]);
    const { container } = render(
      React.createElement(SFDetailPanel, {
        selectedNodeId: 'src/routes',
        directoryGraph: graph,
        graphNodes: [],
        graphEdges: [],
      }),
    );
    expect(container.textContent).toContain('Upstream dependencies');
  });

  it('shows "No upstream dependencies" when no upstream edges', () => {
    const graph = makeDirectoryGraph([{ id: 'src/routes', label: 'routes' }]);
    render(
      React.createElement(SFDetailPanel, {
        selectedNodeId: 'src/routes',
        directoryGraph: graph,
        graphNodes: [],
        graphEdges: [],
      }),
    );
    expect(screen.getByText('No upstream dependencies')).toBeTruthy();
  });

  it('shows upstream directory when edge targets the selected node', () => {
    const graph = makeDirectoryGraph(
      [
        { id: 'src/routes', label: 'routes' },
        { id: 'src/controllers', label: 'controllers' },
      ],
      [{ source: 'src/controllers', target: 'src/routes' }],
    );
    render(
      React.createElement(SFDetailPanel, {
        selectedNodeId: 'src/routes',
        directoryGraph: graph,
        graphNodes: [],
        graphEdges: [],
      }),
    );
    expect(screen.getByText('src/controllers')).toBeTruthy();
  });
});

describe('SFDetailPanel — downstream section', () => {
  it('shows Downstream section heading', () => {
    const graph = makeDirectoryGraph([{ id: 'src/routes', label: 'routes' }]);
    const { container } = render(
      React.createElement(SFDetailPanel, {
        selectedNodeId: 'src/routes',
        directoryGraph: graph,
        graphNodes: [],
        graphEdges: [],
      }),
    );
    expect(container.textContent).toContain('Downstream dependencies');
  });

  it('shows "No downstream dependencies" when no downstream edges', () => {
    const graph = makeDirectoryGraph([{ id: 'src/routes', label: 'routes' }]);
    render(
      React.createElement(SFDetailPanel, {
        selectedNodeId: 'src/routes',
        directoryGraph: graph,
        graphNodes: [],
        graphEdges: [],
      }),
    );
    expect(screen.getByText('No downstream dependencies')).toBeTruthy();
  });

  it('shows downstream directory when edge originates from selected node', () => {
    const graph = makeDirectoryGraph(
      [
        { id: 'src/routes', label: 'routes' },
        { id: 'src/services', label: 'services' },
      ],
      [{ source: 'src/routes', target: 'src/services' }],
    );
    render(
      React.createElement(SFDetailPanel, {
        selectedNodeId: 'src/routes',
        directoryGraph: graph,
        graphNodes: [],
        graphEdges: [],
      }),
    );
    expect(screen.getByText('src/services')).toBeTruthy();
  });

  it('shows multiple downstream directories', () => {
    const graph = makeDirectoryGraph(
      [
        { id: 'src/routes', label: 'routes' },
        { id: 'src/services', label: 'services' },
        { id: 'src/models', label: 'models' },
      ],
      [
        { source: 'src/routes', target: 'src/services' },
        { source: 'src/routes', target: 'src/models' },
      ],
    );
    render(
      React.createElement(SFDetailPanel, {
        selectedNodeId: 'src/routes',
        directoryGraph: graph,
        graphNodes: [],
        graphEdges: [],
      }),
    );
    expect(screen.getByText('src/services')).toBeTruthy();
    expect(screen.getByText('src/models')).toBeTruthy();
  });
});
