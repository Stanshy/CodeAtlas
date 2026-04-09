/**
 * CodeAtlas — ProjectInput
 *
 * Path input field + 開始分析 button. Calls POST /api/project/validate
 * on submit and surfaces errors below the input (screenshot 04).
 *
 * Sprint 20 — T10
 */

import { useState, useRef } from 'react';
import { useAppState } from '../contexts/AppStateContext';

// ---------------------------------------------------------------------------
// Types (re-declared locally — web does not import core directly)
// ---------------------------------------------------------------------------

interface ValidateResponse {
  valid: boolean;
  reason?: string;
  stats?: { fileCount: number; languages: string[] };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function reasonToMessage(reason: string | undefined): string {
  switch (reason) {
    case 'not_found':        return '路徑不存在 — 請確認路徑是否正確';
    case 'not_directory':    return '不是目錄 — 請指定一個資料夾，而非檔案';
    case 'no_source_files':  return '找不到可分析的原始碼 — 此目錄沒有 .ts/.js/.py/.java 檔案';
    case 'path_too_long':    return '路徑過長 — 路徑長度超過限制';
    default:                 return reason ?? '驗證失敗，請再試一次';
  }
}

// ---------------------------------------------------------------------------
// FolderIcon
// ---------------------------------------------------------------------------

function FolderIcon() {
  return (
    <span style={{ fontSize: 16, opacity: 0.45, pointerEvents: 'none', userSelect: 'none' }}>
      📁
    </span>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProjectInputProps {
  isDark?: boolean;
}

// ---------------------------------------------------------------------------
// ProjectInput
// ---------------------------------------------------------------------------

export function ProjectInput({ isDark = true }: ProjectInputProps) {
  const { startAnalysis, setPage } = useAppState();
  const [path, setPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasError = error !== null;

  // ── Styles ──────────────────────────────────────────────────────────────

  const wrapStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 480,
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const inputWrapStyle: React.CSSProperties = {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    left: 12,
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 44,
    padding: '0 12px 0 38px',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    background: isDark ? '#252540' : '#ffffff',
    border: hasError
      ? '1px solid #ef4444'
      : inputFocused
        ? `1px solid ${isDark ? '#4a90d9' : '#1976d2'}`
        : `1px solid ${isDark ? '#3a3a5a' : '#d0d0d8'}`,
    color: isDark ? '#e8e8f0' : '#1a1a2e',
    boxShadow: hasError
      ? '0 0 0 3px rgba(239,68,68,0.08)'
      : inputFocused
        ? isDark
          ? '0 0 0 3px rgba(74,144,217,0.12)'
          : '0 0 0 3px rgba(25,118,210,0.08)'
        : 'none',
  };

  const btnStyle: React.CSSProperties = {
    height: 44,
    padding: '0 20px',
    background: isValidating ? '#1565c0' : '#1976d2',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: isValidating ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background 0.15s',
    fontFamily: "'Inter', sans-serif",
    opacity: isValidating ? 0.75 : 1,
  };

  const errorMsgStyle: React.CSSProperties = {
    marginTop: 6,
    fontSize: 13,
    color: '#ef4444',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  };

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const trimmed = path.trim();
    if (!trimmed) {
      setError('請輸入專案路徑');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const res = await fetch('/api/project/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: trimmed }),
      });

      let data: ValidateResponse;
      try {
        data = await res.json();
      } catch {
        setError('伺服器回應無效，請再試一次');
        setIsValidating(false);
        return;
      }

      if (!data.valid) {
        setError(reasonToMessage(data.reason));
        setIsValidating(false);
        return;
      }

      // Valid — trigger analysis
      const analyzeRes = await fetch('/api/project/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: trimmed }),
      });

      let analyzeData: { jobId?: string; status?: string };
      try {
        analyzeData = await analyzeRes.json();
      } catch {
        setError('無法啟動分析，請再試一次');
        setIsValidating(false);
        return;
      }

      // Server already has this project ready — skip progress, go straight to analysis
      if (analyzeData.status === 'completed') {
        setPage('analysis');
        return;
      }

      if (!analyzeData.jobId) {
        setError('無法取得分析工作 ID，請再試一次');
        setIsValidating(false);
        return;
      }

      startAnalysis(trimmed, analyzeData.jobId);
    } catch {
      setError('無法連線至伺服器，請確認服務已啟動');
      setIsValidating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={wrapStyle}>
      <div style={rowStyle}>
        {/* Input */}
        <div style={inputWrapStyle}>
          <span style={iconStyle}>
            <FolderIcon />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={path}
            onChange={(e) => {
              setPath(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="輸入或貼上專案路徑..."
            style={inputStyle}
            aria-label="專案路徑"
            aria-invalid={hasError}
            aria-describedby={hasError ? 'path-error' : undefined}
            disabled={isValidating}
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        {/* Button */}
        <button
          type="button"
          style={btnStyle}
          onClick={handleSubmit}
          disabled={isValidating}
          aria-label="開始分析專案"
          onMouseEnter={(e) => {
            if (!isValidating) {
              (e.currentTarget as HTMLButtonElement).style.background = '#1565c0';
            }
          }}
          onMouseLeave={(e) => {
            if (!isValidating) {
              (e.currentTarget as HTMLButtonElement).style.background = '#1976d2';
            }
          }}
        >
          {isValidating ? '驗證中...' : '開始分析'}
        </button>
      </div>

      {/* Error message */}
      {hasError && (
        <p id="path-error" style={errorMsgStyle} role="alert">
          <span aria-hidden="true">✕</span>
          {error}
        </p>
      )}
    </div>
  );
}
