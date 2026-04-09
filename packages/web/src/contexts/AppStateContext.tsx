/**
 * CodeAtlas — AppStateContext
 *
 * Manages the top-level application page state:
 *   welcome  → user picks a project
 *   progress → analysis running
 *   analysis → graph ready to view
 *
 * Sprint 20 — T9
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Types (re-declared from core — web does not import core directly)
// ---------------------------------------------------------------------------

export type ServerMode = 'idle' | 'analyzing' | 'ready';

export interface ServerStatus {
  mode: ServerMode;
  currentPath?: string;
  projectName?: string;
}

export type AppPage = 'welcome' | 'progress' | 'analysis';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface AppStateContextValue {
  page: AppPage;
  projectPath: string | null;
  projectName: string | null;
  jobId: string | null;
  setPage: (page: AppPage) => void;
  startAnalysis: (path: string, jobId: string) => void;
  returnToWelcome: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AppStateContext = createContext<AppStateContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<AppPage>('welcome');
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  // On mount: check server status to determine initial page
  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      try {
        const res = await fetch('/api/project/status');
        if (!res.ok || cancelled) return;
        const data: ServerStatus = await res.json();

        if (cancelled) return;

        if (data.mode === 'ready') {
          setProjectPath(data.currentPath ?? null);
          setProjectName(data.projectName ?? null);
          setPage('analysis');
        } else if (data.mode === 'analyzing') {
          setProjectPath(data.currentPath ?? null);
          setProjectName(data.projectName ?? null);
          setPage('progress');
        } else {
          // 'idle' — show welcome
          setPage('welcome');
        }
      } catch {
        // Server not ready or /api/project/status not implemented yet — default to welcome
        setPage('welcome');
      }
    };

    checkStatus();
    return () => { cancelled = true; };
  }, []);

  const startAnalysis = useCallback((path: string, jid: string) => {
    const name = path.split('/').pop() ?? path.split('\\').pop() ?? path;
    setProjectPath(path);
    setProjectName(name);
    setJobId(jid);
    setPage('progress');
  }, []);

  const returnToWelcome = useCallback(() => {
    setPage('welcome');
    setProjectPath(null);
    setProjectName(null);
    setJobId(null);
  }, []);

  return (
    <AppStateContext.Provider
      value={{
        page,
        projectPath,
        projectName,
        jobId,
        setPage,
        startAnalysis,
        returnToWelcome,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return ctx;
}
