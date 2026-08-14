import React from 'react';
import { cn } from './UIComponents';

/**
 * Kit badge (DESIGN.md §3.4): pill shape, `px-2.5 py-0.5 text-xs font-semibold`.
 *
 * The semantic variants the app already uses are kept, remapped onto the kit's
 * canonical palette (§1.4): emerald = positive, amber = warning, red = error,
 * blue = info, indigo = in progress, violet = dispatched, slate = neutral.
 * `orange` and `purple` are aliases — the kit deliberately has no orange, and
 * violet is its "dispatched" hue.
 */
type BadgeVariant =
  | 'default' | 'secondary' | 'destructive' | 'outline' | 'success'
  | 'danger' | 'warning' | 'info' | 'indigo' | 'violet' | 'purple' | 'orange' | 'neutral';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const VARIANTS: Record<BadgeVariant, string> = {
  default: 'border-transparent bg-primary text-primary-foreground',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  destructive: 'border-transparent bg-destructive text-destructive-foreground',
  outline: 'text-foreground border-border',
  success: 'border-transparent bg-emerald-100 text-emerald-800',
  danger: 'border-transparent bg-red-100 text-red-700',
  warning: 'border-transparent bg-amber-100 text-amber-700',
  info: 'border-transparent bg-brand/10 text-brand',
  indigo: 'border-transparent bg-indigo-100 text-indigo-700',
  violet: 'border-transparent bg-violet-100 text-violet-700',
  purple: 'border-transparent bg-violet-100 text-violet-700',
  orange: 'border-transparent bg-amber-100 text-amber-700',
  neutral: 'border-transparent bg-muted text-muted-foreground',
};

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', ...props }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
      VARIANTS[variant],
      className
    )}
    {...props}
  />
);
