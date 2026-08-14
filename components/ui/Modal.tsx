import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn, useModalAnimation } from './UIComponents';
import { backdropClose } from './backdropClose';
import { Loader } from './Loader';
import { Z } from './zLayers';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  /** Swaps the body for a centred spinner while data loads or a save is in flight. */
  loading?: boolean;
  loadingText?: string;
}

const MAX_WIDTHS = {
  sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl',
  '2xl': 'max-w-2xl', '3xl': 'max-w-3xl', '4xl': 'max-w-4xl',
} as const;

/**
 * Kit modal (DESIGN.md §4.1, golden rules 5 and 16).
 *
 * Portaled to <body>, animated through useModalAnimation, closed via
 * backdropClose so a text selection released on the backdrop does not dismiss
 * it. On mobile it stays a centred card — never full-screen — with a `p-4`
 * gutter and a body that scrolls inside `max-h-[90vh]`.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen, onClose, title, description, children, footer, maxWidth = 'lg',
  loading = false, loadingText = 'Cargando datos…',
}) => {
  const { visible, overlayClass, modalClass } = useModalAnimation(isOpen);

  // Lock the page behind the modal, and close on Escape.
  useEffect(() => {
    if (!visible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  return createPortal(
    <div
      style={{ zIndex: Z.modal }}
      className={cn('fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm', overlayClass)}
      {...backdropClose(onClose)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl shadow-black/25 max-h-[90vh]',
          MAX_WIDTHS[maxWidth],
          modalClass
        )}
      >
        {/* Brand hairline: ties the dialog to the shell without shouting. */}
        <div className="h-1 shrink-0 bg-gradient-to-r from-brand via-sidebar-accent to-brand" aria-hidden="true" />

        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
          <div className="min-w-0 pr-6">
            <h3 className="truncate text-lg font-bold leading-tight text-foreground">{title}</h3>
            {description && <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-2 top-3 flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:right-3 md:top-4 md:h-9 md:w-9"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* A half-drawn form behind a blur reads as broken. While the dialog is
            busy the body is empty and the spinner is the only thing in it. */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="flex min-h-[14rem] items-center justify-center py-10">
              <Loader text={loadingText} />
            </div>
          ) : (
            children
          )}
        </div>

        {footer && (
          <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-muted/40 p-4 sm:flex-row sm:justify-end sm:gap-3 sm:p-5 [&>*]:w-full sm:[&>*]:w-auto">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
