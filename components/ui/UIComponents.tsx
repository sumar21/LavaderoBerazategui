/**
 * Sumar UI Kit — shared utilities and base primitives (DESIGN.md §2 and §3).
 *
 * Button, Input, Badge, Select, Combobox and MultiSelect keep their own files
 * (the app already imports them from there) and are re-exported at the bottom,
 * so `components/ui/UIComponents` is the single entry point the kit describes.
 */
import React, { useState, useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { LucideIcon } from 'lucide-react';

/** Combines Tailwind classes, resolving conflicts. Use in EVERY component. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MODAL_DURATION = 200;

/**
 * Keeps a modal mounted for the length of its exit animation. Returns:
 *   visible      → whether to render (stays true while exiting)
 *   overlayClass → 'overlay-enter' | 'overlay-exit'
 *   modalClass   → 'modal-enter'   | 'modal-exit'
 * Pair with the CSS rules in index.css.
 */
export function useModalAnimation(isOpen: boolean) {
  const [visible, setVisible] = useState(isOpen);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (isOpen) { setVisible(true); setClosing(false); }
    else if (visible) {
      setClosing(true);
      const t = setTimeout(() => { setVisible(false); setClosing(false); }, MODAL_DURATION);
      return () => clearTimeout(t);
    }
  }, [isOpen]);
  return {
    visible,
    overlayClass: closing ? 'overlay-exit' : 'overlay-enter',
    modalClass: closing ? 'modal-exit' : 'modal-enter',
  };
}

/* ── Card ──────────────────────────────────────────────────────────── */

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...props} />
));
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props} />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';

/* ── Table ─────────────────────────────────────────────────────────── */

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table ref={ref} className={cn('w-full caption-bottom text-[13px]', className)} {...props} />
  </div>
));
Table.displayName = 'Table';

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('[&_tr]:border-b', className)} {...props} />
));
TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
));
TableBody.displayName = 'TableBody';

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(({ className, ...props }, ref) => (
  <tr ref={ref} className={cn('border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted', className)} {...props} />
));
TableRow.displayName = 'TableRow';

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => (
  <th ref={ref} className={cn('h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0', className)} {...props} />
));
TableHead.displayName = 'TableHead';

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => (
  <td ref={ref} className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)} {...props} />
));
TableCell.displayName = 'TableCell';

/* ── Avatar ────────────────────────────────────────────────────────── */

export const Avatar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)} {...props} />
));
Avatar.displayName = 'Avatar';

export const AvatarFallback = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex h-full w-full items-center justify-center rounded-full bg-muted', className)} {...props} />
));
AvatarFallback.displayName = 'AvatarFallback';

/* ── Tabs ──────────────────────────────────────────────────────────── */

const TabsContext = React.createContext<{ activeTab: string; setActiveTab: (v: string) => void } | null>(null);

interface TabsProps {
  className?: string;
  children: React.ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ className, children, defaultValue, value, onValueChange }) => {
  const [internalTab, setInternalTab] = React.useState(defaultValue ?? '');
  const activeTab = value !== undefined ? value : internalTab;
  const handleTabChange = (v: string) => { if (value === undefined) setInternalTab(v); onValueChange?.(v); };
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <div className={cn('', className)}>{children}</div>
    </TabsContext.Provider>
  );
};

export const TabsList: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn('inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground', className)}>{children}</div>
);

export const TabsTrigger: React.FC<{ className?: string; value: string; children: React.ReactNode }> = ({ className, value, children }) => {
  const ctx = React.useContext(TabsContext);
  if (!ctx) return null;
  const active = ctx.activeTab === value;
  return (
    <button
      type="button"
      data-state={active ? 'active' : 'inactive'}
      onClick={() => ctx.setActiveTab(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        active ? 'bg-background text-foreground shadow-sm' : 'hover:bg-background/50 hover:text-foreground',
        className
      )}
    >
      {children}
    </button>
  );
};

export const TabsContent: React.FC<{ className?: string; value: string; children: React.ReactNode }> = ({ className, value, children }) => {
  const ctx = React.useContext(TabsContext);
  if (!ctx || value !== ctx.activeTab) return null;
  return <div className={cn('mt-2 ring-offset-background animate-in fade-in slide-in-from-bottom-2', className)}>{children}</div>;
};

/* ── StatCard ──────────────────────────────────────────────────────── */

export const StatCard: React.FC<{
  title: string; value: string; icon: LucideIcon; subtext?: string; trend?: 'up' | 'down';
}> = ({ title, value, icon: Icon, subtext, trend }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtext && (
        <p className={cn('text-xs mt-1', trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground')}>
          {subtext}
        </p>
      )}
    </CardContent>
  </Card>
);

/* ── Re-exports so this file is the kit's single entry point ───────── */
export { Button } from './Button';
export { Input } from './Input';
export { Badge } from './Badge';
export { Select } from './Select';
export { Combobox } from './Combobox';
export { MultiSelect } from './MultiSelect';
