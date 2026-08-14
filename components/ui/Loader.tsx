import React from 'react';
import { cn } from './UIComponents';

interface LoaderProps { text?: string; subtext?: string; size?: 'sm' | 'md' | 'lg'; className?: string; }

const SIZES = {
  sm: { ring: 'h-14 w-14', bubble: 'h-10 w-10', icon: 'h-5 w-5', text: 'text-xs' },
  md: { ring: 'h-[4.5rem] w-[4.5rem]', bubble: 'h-14 w-14', icon: 'h-7 w-7', text: 'text-sm' },
  lg: { ring: 'h-24 w-24', bubble: 'h-[4.5rem] w-[4.5rem]', icon: 'h-10 w-10', text: 'text-base' },
} as const;

/**
 * Canonical page/list loading state (DESIGN.md §3.12).
 *
 * The kit ships a lucide `<Mountain>` and tells you to swap in the client's
 * isotype — here that is the bubble from the favicon. The artwork is white
 * (drawn for dark backgrounds), so it is inverted to read on the light bubble,
 * the same trick Logo.tsx uses for its `dark` variant.
 */
export const Loader: React.FC<LoaderProps> = ({ text, subtext, size = 'md', className = '' }) => {
  const s = SIZES[size];
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={text ?? 'Cargando'}
      className={cn('flex flex-col items-center justify-center text-center animate-in fade-in duration-500', className)}
    >
      <div className={cn('relative', s.ring)}>
        <span className="absolute inset-0 rounded-full bg-brand/10 animate-ping" />
        <span className="absolute inset-0 rounded-full border-2 border-brand/15 border-t-brand animate-spin" />
        <div className={cn('absolute inset-0 m-auto rounded-full bg-background border border-brand/10 shadow-sm flex items-center justify-center', s.bubble)}>
          <img
            src="/favicon.svg"
            alt=""
            aria-hidden="true"
            className={cn('object-contain animate-pulse', s.icon)}
            style={{ filter: 'invert(1) hue-rotate(180deg)' }}
          />
        </div>
      </div>
      {text && <p className={cn('mt-4 font-medium text-muted-foreground', s.text)}>{text}</p>}
      {subtext && <p className="mt-1 text-xs text-muted-foreground/70">{subtext}</p>}
    </div>
  );
};
