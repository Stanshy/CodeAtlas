/**
 * CodeAtlas — RecentProjects
 *
 * Fetches GET /api/project/recent and renders a list of recent projects.
 * Each row shows: folder icon, name, path, language badges, file count,
 * relative time, and an 開啟 button. DELETE /api/project/recent/:index
 * removes an entry.
 *
 * Sprint 20 — T10
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppState } from '../contexts/AppStateContext';

// ---------------------------------------------------------------------------
// Types (re-declared locally)
// ---------------------------------------------------------------------------

interface RecentProject {
  path: string;
  name: string;
  lastOpened: string;
  stats?: { fileCount: number; languages: string[] };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1)  return '剛才';
  if (minutes < 60) return `${minutes} 分鐘前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  if (days === 1)   return '昨天';
  return `${days} 天前`;
}

const LANG_MAP: Record<string, { label: string; bg: string; color: string; border: string }> = {
  typescript:  { label: 'TypeScript', bg: 'rgba(59,130,246,0.1)',  color: '#2563eb', border: 'rgba(59,130,246,0.25)' },
  javascript:  { label: 'JavaScript', bg: 'rgba(245,158,11,0.1)', color: '#d97706', border: 'rgba(245,158,11,0.25)' },
  python:      { label: 'Python',     bg: 'rgba(34,197,94,0.1)',  color: '#16a34a', border: 'rgba(34,197,94,0.25)' },
  java:        { label: 'Java',       bg: 'rgba(230,81,0,0.1)',   color: '#e65100', border: 'rgba(230,81,0,0.25)' },
};

function LangBadge({ lang, isDark }: { lang: string; isDark: boolean }) {
  const meta = LANG_MAP[lang.toLowerCase()];
  if (!meta) return null;

  const style: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: 99,
    whiteSpace: 'nowrap',
    background: isDark
      ? meta.bg.replace('0.1)', '0.15)').replace('0.1,', '0.15,')
      : meta.bg,
    color: isDark ? meta.color.replace('#2563eb', '#60a5fa').replace('#d97706', '#fbbf24').replace('#16a34a', '#4ade80').replace('#e65100', '#fb923c') : meta.color,
    border: `1px solid ${isDark ? meta.border.replace('0.25)', '0.3)').replace('0.25,', '0.3,') : meta.border}`,
  };

  return <span style={style}>{meta.label}</span>;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RecentProjectsProps {
  isDark?: boolean;
}

// ---------------------------------------------------------------------------
// RecentProjects
// ---------------------------------------------------------------------------

export function RecentProjects({ isDark = true }: RecentProjectsProps) {
  const { startAnalysis, setPage } = useAppState();
  const [projects, setProjects] = useState<RecentProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openingIndex, setOpeningIndex] = useState<number | null>(null);

  const fetchRecent = useCallback(async () => {
    try {
      const res = await fetch('/api/project/recent');
      if (!res.ok) { setProjects([]); return; }
      const data: RecentProject[] = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecent(); }, [fetchRecent]);

  const handleOpen = async (project: RecentProject, index: number) => {
    setOpeningIndex(index);
    try {
      const res = await fetch('/api/project/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: project.path }),
      });
      let data: { jobId?: string; status?: string };
      try { data = await res.json(); } catch { data = {}; }
      if (data.status === 'completed') {
        // Server already has this project ready — skip progress, go straight to analysis
        setPage('analysis');
      } else if (data.jobId) {
        startAnalysis(project.path, data.jobId);
      }
    } catch {
      // silently fall through
    } finally {
      setOpeningIndex(null);
    }
  };

  const handleDelete = async (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/project/recent/${index}`, { method: 'DELETE' });
      setProjects((prev) => prev.filter((_, i) => i !== index));
    } catch {
      // silently ignore
    }
  };

  // ── Styles ──────────────────────────────────────────────────────────────

  const sectionStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 480,
  };

  const headerStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    marginBottom: 10,
    color: isDark ? '#6868aa' : '#8888aa',
  };

  const emptyStyle: React.CSSProperties = {
    borderRadius: 10,
    padding: 24,
    textAlign: 'center',
    fontSize: 13,
    background: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5',
    color: isDark ? '#6868aa' : '#8888aa',
  };

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={sectionStyle}>
        <p style={headerStyle}>最近開啟的專案</p>
        <div style={emptyStyle}>載入中...</div>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────

  if (projects.length === 0) {
    return (
      <div style={sectionStyle}>
        <p style={headerStyle}>最近開啟的專案</p>
        <div style={emptyStyle}>
          尚無最近開啟的專案，輸入路徑開始你的第一個分析
        </div>
      </div>
    );
  }

  // ── List ─────────────────────────────────────────────────────────────────

  return (
    <div style={sectionStyle}>
      <p style={headerStyle}>最近開啟的專案</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {projects.map((project, index) => (
          <RecentItem
            key={`${project.path}-${index}`}
            project={project}
            index={index}
            isDark={isDark}
            isOpening={openingIndex === index}
            onOpen={() => handleOpen(project, index)}
            onDelete={(e) => handleDelete(index, e)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecentItem
// ---------------------------------------------------------------------------

interface RecentItemProps {
  project: RecentProject;
  index: number;
  isDark: boolean;
  isOpening: boolean;
  onOpen: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function RecentItem({ project, isDark, isOpening, onOpen, onDelete }: RecentItemProps) {
  const [hovered, setHovered] = useState(false);

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.12s, border-color 0.12s',
    border: '1px solid',
    borderColor: hovered
      ? isDark ? 'rgba(74,144,217,0.25)' : 'rgba(25,118,210,0.2)'
      : isDark ? '#3a3a5a' : '#d0d0d8',
    background: hovered
      ? isDark ? '#2e2e50' : '#f5f8ff'
      : isDark ? '#252540' : '#ffffff',
  };

  const nameStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: isDark ? '#e8e8f0' : '#1a1a2e',
  };

  const pathStyle: React.CSSProperties = {
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: isDark ? '#6868aa' : '#8888aa',
  };

  const metaStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  };

  const fileCountStyle: React.CSSProperties = {
    fontSize: 11,
    whiteSpace: 'nowrap',
    color: isDark ? '#6868aa' : '#8888aa',
  };

  const timeStyle: React.CSSProperties = {
    fontSize: 11,
    whiteSpace: 'nowrap',
    color: isDark ? 'rgba(104,104,170,0.7)' : '#bbbbcc',
  };

  const openBtnStyle: React.CSSProperties = {
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 6,
    cursor: isOpening ? 'not-allowed' : 'pointer',
    fontFamily: "'Inter', sans-serif",
    whiteSpace: 'nowrap',
    transition: 'all 0.12s',
    background: 'transparent',
    color: isDark ? '#a0a0c0' : '#4a4a6a',
    border: `1px solid ${isDark ? '#3a3a5a' : '#d0d0d8'}`,
    opacity: isOpening ? 0.7 : 1,
  };

  const deleteBtnStyle: React.CSSProperties = {
    width: 20,
    height: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    border: 'none',
    background: 'transparent',
    color: isDark ? '#6868aa' : '#8888aa',
    cursor: 'pointer',
    fontSize: 14,
    padding: 0,
    transition: 'color 0.12s, background 0.12s',
    flexShrink: 0,
  };

  // Truncate path for display
  const displayPath = project.path.length > 30
    ? '~/' + project.path.split(/[\\/]/).slice(-2).join('/')
    : project.path;

  return (
    <div
      role="button"
      tabIndex={0}
      style={itemStyle}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`開啟 ${project.name}`}
    >
      {/* Folder icon */}
      <span style={{ fontSize: 18, flexShrink: 0 }}>📁</span>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={nameStyle}>{project.name}</div>
        <div style={pathStyle} title={project.path}>{displayPath}</div>
      </div>

      {/* Meta: badges + file count + time */}
      <div style={metaStyle}>
        {project.stats && project.stats.languages.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {project.stats.languages.slice(0, 2).map((lang) => (
              <LangBadge key={lang} lang={lang} isDark={isDark} />
            ))}
          </div>
        )}
        {project.stats && (
          <span style={fileCountStyle}>{project.stats.fileCount} 檔案</span>
        )}
        <span style={timeStyle}>{relativeTime(project.lastOpened)}</span>

        {/* Open button */}
        <button
          type="button"
          style={openBtnStyle}
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          disabled={isOpening}
          aria-label={`開啟 ${project.name}`}
          onMouseEnter={(e) => {
            if (!isOpening) {
              (e.currentTarget as HTMLButtonElement).style.background =
                isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f8';
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                isDark ? '#5a5a7a' : '#b0b0c0';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              isDark ? '#3a3a5a' : '#d0d0d8';
          }}
        >
          {isOpening ? '開啟中...' : '開啟'}
        </button>

        {/* Delete button */}
        <button
          type="button"
          style={deleteBtnStyle}
          onClick={onDelete}
          aria-label={`移除 ${project.name}`}
          title="從清單移除"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
            (e.currentTarget as HTMLButtonElement).style.background =
              isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.06)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              isDark ? '#6868aa' : '#8888aa';
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
