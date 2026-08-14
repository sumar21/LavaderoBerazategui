import React, { useState, useCallback, useRef, useEffect, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { cn } from './UIComponents';
import { Z } from './zLayers';

type ToastType = 'success' | 'error' | 'warning' | 'info';
interface Toast { id: string; message: string; type: ToastType; duration: number; }
interface ToastContextType { showToast: (message: string, type?: ToastType, duration?: number) => void; }

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

const ICONS: Record<ToastType, React.ElementType> = { success: CheckCircle2, error: AlertCircle, warning: AlertTriangle, info: Info };
const STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};
const ICON_COLORS: Record<ToastType, string> = {
  success: 'text-emerald-500', error: 'text-red-500', warning: 'text-amber-500', info: 'text-blue-500',
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const Icon = ICONS[toast.type];
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    timerRef.current = setTimeout(() => onRemove(toast.id), toast.duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [toast.id, toast.duration, onRemove]);
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg w-full sm:max-w-md animate-in slide-in-from-top-2 fade-in duration-200',
        STYLES[toast.type]
      )}
    >
      <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', ICON_COLORS[toast.type])} aria-hidden="true" />
      <p className="text-sm font-medium flex-1 whitespace-pre-line">{toast.message}</p>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        aria-label="Cerrar aviso"
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * Kit toast provider (DESIGN.md §3.13). Mount once at the root.
 *
 * The stack is pinned to the top on mobile so it clears the fixed nav header
 * and never covers a thumb-reachable control; from `sm` up it sits top-right
 * as the kit specifies.
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    seq.current += 1;
    setToasts(prev => [...prev, { id: `toast-${seq.current}`, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && createPortal(
        <div
          className="fixed left-4 right-4 top-4 flex flex-col gap-2 sm:left-auto sm:right-4 sm:items-end"
          style={{ zIndex: Z.toast }}
        >
          {toasts.map(t => <ToastItem key={t.id} toast={t} onRemove={removeToast} />)}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};
