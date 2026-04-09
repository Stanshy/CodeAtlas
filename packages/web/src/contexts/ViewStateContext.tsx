/**
 * CodeAtlas — ViewStateContext
 *
 * Centralised view state for node selection/hover,
 * search, panel open/close, path tracing, and heatmap.
 *
 * Sprint 4 — T3: initial integration
 * Sprint 5 — T2: ViewState 擴充（路徑追蹤 + 熱力圖 + 邊 hover）
 * Sprint 19 — T12: 3D removal — SET_3D_MODE removed, mode locked to '2d'
 * Sprint 19 — T13: Wiki tab — selectedWikiNode + SET_WIKI_NODE added
 */

import {
  createContext,
  useContext,
  useReducer,
  useRef,
  useEffect,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
  type Dispatch,
} from 'react';
import type { GraphNode, GraphEdge, NodeType, EdgeType, FilterState, ViewModeName, PerspectiveName, DisplayPrefs, E2EStep, E2ETracingState } from '../types/graph';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ViewMode = '2d' | '3d';

export type CameraPresetName = 'default' | 'topDown' | 'sideView' | null;

export interface ViewState {
  // === Existing fields (Sprint 4) ===
  mode: ViewMode;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  searchQuery: string;
  searchResults: string[];
  isSearchOpen: boolean;
  isPanelOpen: boolean;
  focusNodeId: string | null;
  cameraPreset: CameraPresetName;

  // === Sprint 5 additions ===
  /** Symbol name currently being traced (null = not in tracing mode) */
  tracingSymbol: string | null;
  /** Ordered list of node IDs on the traced path */
  tracingPath: string[];
  /** List of edge IDs on the traced path */
  tracingEdges: string[];
  /** Heatmap toggle (default false) */
  isHeatmapEnabled: boolean;
  /** Currently hovered edge ID (for edge label display) */
  hoveredEdgeId: string | null;

  // === Sprint 7: Zoom into file ===
  /** Currently expanded file ID (null = not expanded) */
  expandedFileId: string | null;
  /** Function/class nodes loaded when a file is expanded */
  expandedNodes: GraphNode[];
  /** Call edges loaded when a file is expanded */
  expandedEdges: GraphEdge[];

  // === Sprint 8: Impact Analysis ===
  impactAnalysis: {
    active: boolean;
    direction: 'forward' | 'reverse' | null;
    targetNodeId: string | null;
    impactedNodes: string[];
    impactedEdges: string[];
    depthMap: Record<string, number>;
    maxDepth: number;
  } | null;

  // === Sprint 8: Filter ===
  filter: {
    directories: string[];    // 空 = 全選
    nodeTypes: NodeType[];    // 空 = 全選
    edgeTypes: EdgeType[];    // 空 = 全選
  };

  // === Sprint 8: Search Focus ===
  isSearchFocused: boolean;
  searchFocusNodes: string[];
  searchFocusEdges: string[];

  // === Sprint 8: Context Menu ===
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
    nodeId: string | null;
  } | null;

  // === Sprint 9: Control Panel + View Modes + E2E Tracing ===
  /** @deprecated Use activePerspective instead */
  activeViewMode: ViewModeName;
  // === Sprint 11: Perspective (Story View) ===
  activePerspective: PerspectiveName;
  isSettingsPanelOpen: boolean;
  displayPrefs: DisplayPrefs;
  e2eTracing: E2ETracingState | null;
  isE2ESelecting: boolean;

  // Sprint 10: Smart Curation — pinned hidden nodes
  pinnedNodeIds: string[];

  // Sprint 14: AI Settings
  aiProvider: string;           // 'claude-code' | 'gemini' | 'ollama' | 'openai' | 'anthropic' | 'disabled'
  aiApiKey: string;             // API key for cloud providers
  enableAiSummary: boolean;     // Toggle AI method summaries
  enableAiRoleClassification: boolean; // Toggle AI role classification
  hiddenMethodRoles: string[];  // Roles to hide in LO view (default: ['utility', 'framework_glue'])

  // Sprint 19: Wiki tab
  /** Currently selected wiki node slug (null = nothing selected) */
  selectedWikiNode: string | null;
}

export type ViewAction =
  // === Existing actions (Sprint 4) ===
  | { type: 'SET_MODE'; mode: ViewMode }
  | { type: 'SELECT_NODE'; nodeId: string | null }
  | { type: 'HOVER_NODE'; nodeId: string | null }
  | { type: 'SET_SEARCH_QUERY'; query: string }
  | { type: 'SET_SEARCH_RESULTS'; results: string[] }
  | { type: 'SET_SEARCH_OPEN'; open: boolean }
  | { type: 'FOCUS_NODE'; nodeId: string }
  | { type: 'CLEAR_FOCUS' }
  | { type: 'OPEN_PANEL' }
  | { type: 'CLOSE_PANEL' }
  | { type: 'SET_CAMERA_PRESET'; preset: CameraPresetName }
  | { type: 'CLEAR_CAMERA_PRESET' }
  // === Sprint 5 additions ===
  | { type: 'START_TRACING'; symbol: string; path: string[]; edges: string[] }
  | { type: 'STOP_TRACING' }
  | { type: 'TOGGLE_HEATMAP' }
  | { type: 'HOVER_EDGE'; edgeId: string | null }
  // === Sprint 7: Zoom into file + call chain ===
  | { type: 'ZOOM_INTO_FILE'; fileId: string; nodes: GraphNode[]; edges: GraphEdge[] }
  | { type: 'ZOOM_OUT_FILE' }
  | { type: 'START_CALL_TRACING'; functionId: string; path: string[]; edges: string[] }
  | { type: 'STOP_CALL_TRACING' }
  // === Sprint 8: Impact Analysis + Filter + Search Focus + Context Menu ===
  | { type: 'IMPACT_ANALYZE'; direction: 'forward' | 'reverse'; targetNodeId: string;
      impactedNodes: string[]; impactedEdges: string[]; depthMap: Record<string, number> }
  | { type: 'UPDATE_IMPACT_DEPTH'; maxDepth: number; impactedNodes: string[];
      impactedEdges: string[]; depthMap: Record<string, number> }
  | { type: 'CLEAR_IMPACT' }
  | { type: 'SET_FILTER'; filter: Partial<FilterState> }
  | { type: 'RESET_FILTER' }
  | { type: 'ENTER_SEARCH_FOCUS'; nodeIds: string[]; edgeIds: string[] }
  | { type: 'EXIT_SEARCH_FOCUS' }
  | { type: 'SHOW_CONTEXT_MENU'; x: number; y: number; nodeId: string }
  | { type: 'HIDE_CONTEXT_MENU' }
  // === Sprint 9: Control Panel + View Modes + E2E Tracing ===
  /** @deprecated Use SET_PERSPECTIVE instead */
  | { type: 'SET_VIEW_MODE'; mode: ViewModeName }
  // === Sprint 11: Perspective ===
  | { type: 'SET_PERSPECTIVE'; perspective: PerspectiveName }
  | { type: 'TOGGLE_SETTINGS_PANEL' }
  | { type: 'SET_DISPLAY_PREFS'; prefs: Partial<DisplayPrefs> }
  | { type: 'START_E2E_TRACING'; startNodeId: string;
      path: string[]; edges: string[]; steps: E2EStep[]; truncated: boolean }
  | { type: 'UPDATE_E2E_DEPTH'; maxDepth: number;
      path: string[]; edges: string[]; steps: E2EStep[]; truncated: boolean }
  | { type: 'CLEAR_E2E_TRACING' }
  | { type: 'SET_E2E_SELECTING'; selecting: boolean }
  // Sprint 10: Pin/Unpin hidden nodes
  | { type: 'PIN_NODE'; nodeId: string }
  | { type: 'UNPIN_NODE'; nodeId: string }
  // Sprint 14: AI Settings
  | { type: 'SET_AI_PROVIDER'; provider: string }
  | { type: 'SET_AI_API_KEY'; apiKey: string }
  | { type: 'SET_ENABLE_AI_SUMMARY'; enabled: boolean }
  | { type: 'SET_ENABLE_AI_ROLE_CLASSIFICATION'; enabled: boolean }
  | { type: 'SET_HIDDEN_METHOD_ROLES'; roles: string[] }
  | { type: 'TOGGLE_HIDDEN_METHOD_ROLE'; role: string }
  // Sprint 19: Wiki tab
  | { type: 'SET_WIKI_NODE'; slug: string | null };

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: ViewState = {
  // Existing fields
  mode: '2d',
  selectedNodeId: null,
  hoveredNodeId: null,
  searchQuery: '',
  searchResults: [],
  isSearchOpen: false,
  isPanelOpen: false,
  focusNodeId: null,
  cameraPreset: null,
  // Sprint 5 additions
  tracingSymbol: null,
  tracingPath: [],
  tracingEdges: [],
  isHeatmapEnabled: false,
  hoveredEdgeId: null,
  // Sprint 7 additions
  expandedFileId: null,
  expandedNodes: [],
  expandedEdges: [],
  // Sprint 8 additions
  impactAnalysis: null,
  filter: { directories: [], nodeTypes: [], edgeTypes: [] },
  isSearchFocused: false,
  searchFocusNodes: [],
  searchFocusEdges: [],
  contextMenu: null,
  // Sprint 9 additions
  activeViewMode: 'panorama' as ViewModeName,
  // Sprint 11 additions
  activePerspective: 'logic-operation' as PerspectiveName,
  isSettingsPanelOpen: false,
  displayPrefs: {
    showEdgeLabels: false,
    showParticles: true,
    labelDensity: 'smart' as const,
    impactDefaultDepth: 5,
  },
  e2eTracing: null,
  isE2ESelecting: false,
  pinnedNodeIds: [],
  // Sprint 14: AI Settings
  aiProvider: 'disabled',
  aiApiKey: '',
  enableAiSummary: false,
  enableAiRoleClassification: false,
  hiddenMethodRoles: ['utility', 'framework_glue'],
  // Sprint 19: Wiki tab
  selectedWikiNode: null,
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function viewStateReducer(state: ViewState, action: ViewAction): ViewState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.mode };

    case 'SELECT_NODE':
      return {
        ...state,
        selectedNodeId: action.nodeId,
        isPanelOpen: action.nodeId !== null,
      };

    case 'HOVER_NODE':
      return { ...state, hoveredNodeId: action.nodeId };

    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.query };

    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.results };

    case 'SET_SEARCH_OPEN':
      return { ...state, isSearchOpen: action.open };

    case 'FOCUS_NODE':
      return { ...state, focusNodeId: action.nodeId };

    case 'CLEAR_FOCUS':
      return { ...state, focusNodeId: null };

    case 'OPEN_PANEL':
      return { ...state, isPanelOpen: true };

    case 'CLOSE_PANEL':
      return { ...state, isPanelOpen: false, selectedNodeId: null };

    case 'SET_CAMERA_PRESET':
      return { ...state, cameraPreset: action.preset };

    case 'CLEAR_CAMERA_PRESET':
      return { ...state, cameraPreset: null };

    // --- Sprint 5 ---

    case 'START_TRACING':
      return {
        ...state,
        tracingSymbol: action.symbol,
        tracingPath: action.path,
        tracingEdges: action.edges,
        isPanelOpen: true, // auto-open panel to show tracing results
      };

    case 'STOP_TRACING':
      return {
        ...state,
        tracingSymbol: null,
        tracingPath: [],
        tracingEdges: [],
      };

    case 'TOGGLE_HEATMAP':
      return { ...state, isHeatmapEnabled: !state.isHeatmapEnabled };

    case 'HOVER_EDGE':
      return { ...state, hoveredEdgeId: action.edgeId };

    // --- Sprint 7 ---

    case 'ZOOM_INTO_FILE':
      return {
        ...state,
        expandedFileId: action.fileId,
        expandedNodes: action.nodes,
        expandedEdges: action.edges,
      };

    case 'ZOOM_OUT_FILE':
      return { ...state, expandedFileId: null, expandedNodes: [], expandedEdges: [] };

    case 'START_CALL_TRACING':
      return {
        ...state,
        tracingSymbol: action.functionId,
        tracingPath: action.path,
        tracingEdges: action.edges,
      };

    case 'STOP_CALL_TRACING':
      return { ...state, tracingSymbol: null, tracingPath: [], tracingEdges: [] };

    // --- Sprint 8 ---

    case 'IMPACT_ANALYZE':
      return {
        ...state,
        impactAnalysis: {
          active: true,
          direction: action.direction,
          targetNodeId: action.targetNodeId,
          impactedNodes: action.impactedNodes,
          impactedEdges: action.impactedEdges,
          depthMap: action.depthMap,
          maxDepth: state.impactAnalysis?.maxDepth ?? 5,
        },
        isPanelOpen: true,
      };

    case 'UPDATE_IMPACT_DEPTH':
      return {
        ...state,
        impactAnalysis: state.impactAnalysis
          ? {
              ...state.impactAnalysis,
              maxDepth: action.maxDepth,
              impactedNodes: action.impactedNodes,
              impactedEdges: action.impactedEdges,
              depthMap: action.depthMap,
            }
          : null,
      };

    case 'CLEAR_IMPACT':
      return { ...state, impactAnalysis: null };

    case 'SET_FILTER':
      return {
        ...state,
        filter: { ...state.filter, ...action.filter },
      };

    case 'RESET_FILTER':
      return {
        ...state,
        filter: { directories: [], nodeTypes: [], edgeTypes: [] },
      };

    case 'ENTER_SEARCH_FOCUS':
      return {
        ...state,
        isSearchFocused: true,
        searchFocusNodes: action.nodeIds,
        searchFocusEdges: action.edgeIds,
      };

    case 'EXIT_SEARCH_FOCUS':
      return {
        ...state,
        isSearchFocused: false,
        searchFocusNodes: [],
        searchFocusEdges: [],
      };

    case 'SHOW_CONTEXT_MENU':
      return {
        ...state,
        contextMenu: {
          visible: true,
          x: action.x,
          y: action.y,
          nodeId: action.nodeId,
        },
      };

    case 'HIDE_CONTEXT_MENU':
      return { ...state, contextMenu: null };

    // --- Sprint 9 ---

    case 'SET_VIEW_MODE':
      return {
        ...state,
        activeViewMode: action.mode,
        // Clear conflicting states when switching view mode
        impactAnalysis: null,
        isSearchFocused: false,
        searchFocusNodes: [],
        searchFocusEdges: [],
        e2eTracing: null,
        isE2ESelecting: false,
        filter: { directories: [], nodeTypes: [], edgeTypes: [] },
      };

    // --- Sprint 11: Perspective ---

    case 'SET_PERSPECTIVE': {
      const perspective = action.perspective;

      return {
        ...state,
        activePerspective: perspective,
        // Clear conflicting states
        impactAnalysis: null,
        isSearchFocused: false,
        searchFocusNodes: [],
        searchFocusEdges: [],
        e2eTracing: null,
        isE2ESelecting: false,
        filter: { directories: [], nodeTypes: [], edgeTypes: [] },
      };
    }

    case 'TOGGLE_SETTINGS_PANEL':
      return { ...state, isSettingsPanelOpen: !state.isSettingsPanelOpen };

    case 'SET_DISPLAY_PREFS':
      return {
        ...state,
        displayPrefs: { ...state.displayPrefs, ...action.prefs },
      };

    case 'START_E2E_TRACING':
      return {
        ...state,
        e2eTracing: {
          active: true,
          startNodeId: action.startNodeId,
          path: action.path,
          edges: action.edges,
          steps: action.steps,
          maxDepth: state.e2eTracing?.maxDepth ?? 10,
          truncated: action.truncated,
        },
        isE2ESelecting: false,
        // Clear other analysis modes
        impactAnalysis: null,
        tracingSymbol: null,
        tracingPath: [],
        tracingEdges: [],
      };

    case 'UPDATE_E2E_DEPTH':
      return {
        ...state,
        e2eTracing: state.e2eTracing
          ? {
              ...state.e2eTracing,
              maxDepth: action.maxDepth,
              path: action.path,
              edges: action.edges,
              steps: action.steps,
              truncated: action.truncated,
            }
          : null,
      };

    case 'CLEAR_E2E_TRACING':
      return { ...state, e2eTracing: null, isE2ESelecting: false };

    case 'SET_E2E_SELECTING':
      return { ...state, isE2ESelecting: action.selecting };

    // --- Sprint 10 ---

    case 'PIN_NODE':
      return {
        ...state,
        pinnedNodeIds: state.pinnedNodeIds.includes(action.nodeId)
          ? state.pinnedNodeIds
          : [...state.pinnedNodeIds, action.nodeId],
      };

    case 'UNPIN_NODE':
      return {
        ...state,
        pinnedNodeIds: state.pinnedNodeIds.filter(id => id !== action.nodeId),
      };

    // --- Sprint 14: AI Settings ---

    case 'SET_AI_PROVIDER':
      return { ...state, aiProvider: action.provider };
    case 'SET_AI_API_KEY':
      return { ...state, aiApiKey: action.apiKey };
    case 'SET_ENABLE_AI_SUMMARY':
      return { ...state, enableAiSummary: action.enabled };
    case 'SET_ENABLE_AI_ROLE_CLASSIFICATION':
      return { ...state, enableAiRoleClassification: action.enabled };
    case 'SET_HIDDEN_METHOD_ROLES':
      return { ...state, hiddenMethodRoles: action.roles };
    case 'TOGGLE_HIDDEN_METHOD_ROLE':
      return {
        ...state,
        hiddenMethodRoles: state.hiddenMethodRoles.includes(action.role)
          ? state.hiddenMethodRoles.filter(r => r !== action.role)
          : [...state.hiddenMethodRoles, action.role],
      };

    // --- Sprint 19: Wiki tab ---

    case 'SET_WIKI_NODE':
      return { ...state, selectedWikiNode: action.slug };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ViewStateContextValue {
  state: ViewState;
  dispatch: Dispatch<ViewAction>;
}

const ViewStateContext = createContext<ViewStateContextValue | null>(null);

// ---------------------------------------------------------------------------
// Sprint 10 — Selector Store Context
// Provides subscribe/getSnapshot for useSyncExternalStore-based selectors.
// ---------------------------------------------------------------------------

interface ViewStoreSyncValue {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => ViewState;
  dispatch: Dispatch<ViewAction>;
}

const ViewStoreSyncContext = createContext<ViewStoreSyncValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface ViewStateProviderProps {
  children: ReactNode;
}

export function ViewStateProvider({ children }: ViewStateProviderProps) {
  const [state, dispatch] = useReducer(viewStateReducer, initialState);

  // Sprint 10: Store ref for selector mechanism
  const stateRef = useRef(state);
  stateRef.current = state;

  const listenersRef = useRef(new Set<() => void>());

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => { listenersRef.current.delete(listener); };
  }, []);

  const getSnapshot = useCallback(() => stateRef.current, []);

  // Notify listeners on every state change
  useEffect(() => {
    listenersRef.current.forEach((l) => l());
  }, [state]);

  const syncValue: ViewStoreSyncValue = { subscribe, getSnapshot, dispatch };

  return (
    <ViewStateContext.Provider value={{ state, dispatch }}>
      <ViewStoreSyncContext.Provider value={syncValue}>
        {children}
      </ViewStoreSyncContext.Provider>
    </ViewStateContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook — useViewState (backward compatible, returns full state + dispatch)
// ---------------------------------------------------------------------------

export function useViewState(): ViewStateContextValue {
  const ctx = useContext(ViewStateContext);
  if (ctx === null) {
    throw new Error('useViewState must be used inside <ViewStateProvider>');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Hook — useViewStateSelector (Sprint 10: selective re-render)
// Components only re-render when the selected slice changes.
// ---------------------------------------------------------------------------

/**
 * Subscribe to a specific slice of ViewState.
 * The component only re-renders when the selector return value changes
 * (by reference equality, same as useSyncExternalStore).
 *
 * @example
 *   const mode = useViewStateSelector(s => s.mode);
 *   const hoveredNodeId = useViewStateSelector(s => s.hoveredNodeId);
 */
export function useViewStateSelector<T>(selector: (state: ViewState) => T): T {
  const ctx = useContext(ViewStoreSyncContext);
  if (ctx === null) {
    throw new Error('useViewStateSelector must be used inside <ViewStateProvider>');
  }
  const { subscribe, getSnapshot } = ctx;
  return useSyncExternalStore(subscribe, () => selector(getSnapshot()));
}

/**
 * Get only the dispatch function (no state subscription, never triggers re-render).
 */
export function useViewStateDispatch(): Dispatch<ViewAction> {
  const ctx = useContext(ViewStoreSyncContext);
  if (ctx === null) {
    throw new Error('useViewStateDispatch must be used inside <ViewStateProvider>');
  }
  return ctx.dispatch;
}
