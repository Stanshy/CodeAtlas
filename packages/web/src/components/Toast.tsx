/**
 * CodeAtlas — Toast Notification Component
 *
 * Sprint 16 T10: Provider onChange feedback toast.
 * Position: fixed top:60px right:16px
 * Auto-dismiss after 3 seconds with bottom progress bar animation.
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { THEME } from '../styles/theme';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ToastProps {
  type: 'success' | 'warning' | 'error';
  title: string;
  description: string;
  onDismiss: () => void;
  duration?: number;
}

// ---------------------------------------------------------------------------
// Design tokens per type
// ---------------------------------------------------------------------------

const TOAST_CONFIG = {
  success: {
    icon: '✅',
    borderColor: '#2e7d32',
    timerColor: '#2e7d32',
  },
  warning: {
    icon: '⚠️',
    borderColor: '#f59e0b',
    timerColor: '#f59e0b',
  },
  error: {
    icon: '❌',
    borderColor: '#c62828',
    timerColor: '#c62828',
  },
} as const;

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

export function Toast({ type, title, description, onDismiss, duration = 3000 }: ToastProps) {
  const [timerWidth, setTimerWidth] = useState(100);
  const startTimeRef = useRef<number>(Date.now());
  const rafRef = useRef<number | null>(null);
  const config = TOAST_CONFIG[type];

  useEffect(() => {
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setTimerWidth(remaining);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);

    const timer = setTimeout(onDismiss, duration);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      clearTimeout(timer);
    };
  }, [duration, onDismiss]);

  const containerStyle: CSSProperties = {
    position: 'relative',
    background: '#ffffff',
    borderRadius: 8,
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    borderLeft: `3px solid ${config.borderColor}`,
    fontSize: 13,
    minWidth: 280,
    maxWidth: 320,
    overflow: 'hidden',
    fontFamily: THEME.fontUi,
  };

  const timerStyle: CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    width: `${timerWidth}%`,
    background: config.timerColor,
    borderBottomLeftRadius: 8,
    transition: 'none',
  };

  return (
    <div style={containerStyle} role="alert" aria-live="polite">
      <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1, marginTop: 1 }}>
        {config.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: THEME.inkPrimary, fontSize: 13 }}>{title}</div>
        <div style={{ fontSize: 11, color: THEME.inkSecondary, marginTop: 1, lineHeight: 1.4 }}>
          {description}
        </div>
      </div>
      <button
        onClick={onDismiss}
        aria-label="關閉通知"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 14,
          color: THEME.inkMuted,
          flexShrink: 0,
          lineHeight: 1,
          marginTop: 1,
          padding: 0,
          fontFamily: THEME.fontUi,
        }}
      >
        ×
      </button>
      <div style={timerStyle} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ToastStack — renders all active toasts at the fixed position
// ---------------------------------------------------------------------------

export interface ToastItem {
  id: string;
  type: 'success' | 'warning' | 'error';
  title: string;
  description: string;
}

interface ToastStackProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;

  const stackStyle: CSSProperties = {
    position: 'fixed',
    top: 60,
    right: 16,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    pointerEvents: 'none',
  };

  return (
    <div style={stackStyle} aria-label="通知區域">
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <Toast
            type={t.type}
            title={t.title}
            description={t.description}
            onDismiss={() => onDismiss(t.id)}
          />
        </div>
      ))}
    </div>
  );
}
