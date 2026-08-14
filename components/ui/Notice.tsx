import React, { useEffect } from 'react';
import { useToast } from './Toast';

type NoticeKind = 'success' | 'error' | 'warning' | 'info';

// Module-level dispatch so callers just write `notify.error(msg)` — no hook to
// thread through every component, and non-React callers work too.
let dispatch: (kind: NoticeKind, message: string) => void = () => {};

const emit = (kind: NoticeKind) => (message: string) => dispatch(kind, message);

export const notify = {
  success: emit('success'),
  error: emit('error'),
  warning: emit('warning'),
  info: emit('info'),
};

/**
 * Bridges the module-level `notify` API onto the kit's ToastProvider
 * (DESIGN.md §3.13). Mount once, inside <ToastProvider>.
 */
export const NoticeHost: React.FC = () => {
  const { showToast } = useToast();

  useEffect(() => {
    dispatch = (kind, message) => showToast(message, kind);
    return () => { dispatch = () => {}; };
  }, [showToast]);

  return null;
};
