import React from 'react';
import { cn } from './UIComponents';

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  /** Search, filters and the primary action — they sit on the same row as the title. */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standard page header (DESIGN.md §4.4 + §5.2).
 *
 * Title and toolbar share one row on desktop and stack on mobile. There is no
 * separate top bar above it: a strip holding only the avatar wasted a band of
 * screen and pushed the real heading down.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, className }) => (
  <div className={cn('flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between', className)}>
    <div className="min-w-0">
      <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div>}
  </div>
);
