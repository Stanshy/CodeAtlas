/**
 * CodeAtlas — useToast Hook
 *
 * Sprint 16 T10: Manages the toast notification stack.
 * show(type, title, desc) → adds toast, auto-removes after 3s
 * dismiss(id) → manual removal
 */

import { useCallback, useState } from 'react';
import type { ToastItem } from '../components/Toast';

let nextId = 1;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (type: ToastItem['type'], title: string, description: string) => {
      const id = String(nextId++);
      setToasts((prev) => [...prev, { id, type, title, description }]);
    },
    [],
  );

  return { toasts, show, dismiss };
}
