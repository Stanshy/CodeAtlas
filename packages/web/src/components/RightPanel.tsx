/**
 * CodeAtlas — RightPanel Component (Sprint 13 T7)
 *
 * Container that switches between the three right-side panels
 * based on the active perspective:
 *   - system-framework  → SFDetailPanel (300px, directory stats + files + up/downstream)
 *   - logic-operation   → LODetailPanel (300px, method signature + class/file)
 *   - data-journey      → DJPanel       (300px, step list with 3 states + detail expand)
 *
 * Returns null when no content is available for the current perspective,
 * ensuring only ONE panel is ever visible at a time.
 *
 * Sprint 13 — T7
 */

import React from 'react';
import { SFDetailPanel } from './SFDetailPanel';
import { LODetailPanel } from './LODetailPanel';
import { DJPanel } from './DJPanel';
import type { SFDetailPanelProps } from './SFDetailPanel';
import type { LODetailPanelProps } from './LODetailPanel';
import type { DJPanelProps } from './DJPanel';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface RightPanelProps {
  perspective: string;

  // SF props
  sfSelectedNodeId: SFDetailPanelProps['selectedNodeId'];
  sfDirectoryGraph: SFDetailPanelProps['directoryGraph'];
  sfGraphNodes: SFDetailPanelProps['graphNodes'];
  sfGraphEdges: SFDetailPanelProps['graphEdges'];

  // LO props
  loSelectedStep: LODetailPanelProps['selectedStep'];
  loGraphNodes: LODetailPanelProps['graphNodes'];
  loGraphEdges: LODetailPanelProps['graphEdges'];

  // DJ props
  djEndpointId: DJPanelProps['endpointId'] | null;
  djChain: DJPanelProps['chain'] | null;
  djCurrentStep: DJPanelProps['currentStep'];
  djIsPlaying: DJPanelProps['isPlaying'];
  onDjReplay: DJPanelProps['onReplay'];
  onDjClear: DJPanelProps['onClear'];
  onDjStepClick: DJPanelProps['onStepClick'];
}

// ---------------------------------------------------------------------------
// Container style — 300px absolute right panel, full height
// ---------------------------------------------------------------------------

const panelWrapStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  zIndex: 20,
  display: 'flex',
  pointerEvents: 'auto',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RightPanel({
  perspective,
  sfSelectedNodeId,
  sfDirectoryGraph,
  sfGraphNodes,
  sfGraphEdges,
  loSelectedStep,
  loGraphNodes,
  loGraphEdges,
  djEndpointId,
  djChain,
  djCurrentStep,
  djIsPlaying,
  onDjReplay,
  onDjClear,
  onDjStepClick,
}: RightPanelProps) {
  switch (perspective) {
    case 'system-framework':
      // Always render the wrapper so SFDetailPanel can handle its own null-selection state
      return (
        <div style={panelWrapStyle}>
          <SFDetailPanel
            selectedNodeId={sfSelectedNodeId}
            directoryGraph={sfDirectoryGraph}
            graphNodes={sfGraphNodes}
            graphEdges={sfGraphEdges}
          />
        </div>
      );

    case 'logic-operation':
      if (!loSelectedStep) return null;
      return (
        <div style={panelWrapStyle}>
          <LODetailPanel
            selectedStep={loSelectedStep}
            graphNodes={loGraphNodes}
            graphEdges={loGraphEdges}
          />
        </div>
      );

    case 'data-journey':
      if (!djEndpointId || !djChain) return null;
      return (
        <div style={panelWrapStyle}>
          <DJPanel
            endpointId={djEndpointId}
            chain={djChain}
            currentStep={djCurrentStep}
            isPlaying={djIsPlaying}
            onReplay={onDjReplay}
            onClear={onDjClear}
            onStepClick={onDjStepClick}
          />
        </div>
      );

    default:
      return null;
  }
}
