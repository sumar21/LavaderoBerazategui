import React from 'react';
import { Card, CardContent, cn } from './UIComponents';

export type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  /** Colours the surface, the icon tile, the value and the watermark. Defaults to neutral. */
  tone?: Tone;
  badge?: string;
  sub?: React.ReactNode;
  onClick?: () => void;
}

/**
 * One row per tone so a card never ends up half-coloured: the surface tint, the
 * icon tile, the value and the hover all move together. `brand` and `neutral`
 * stay on the plain card surface — a tinted card is reserved for a state.
 */
const TONES: Record<Tone, { surface: string; tile: string; value: string; hover: string; mark: string }> = {
  brand:   { surface: 'bg-card border-border',           tile: 'bg-brand/10 text-brand',            value: 'text-brand',       hover: 'hover:border-brand/40 hover:shadow-brand/15',       mark: 'text-brand' },
  success: { surface: 'bg-emerald-50 border-emerald-100', tile: 'bg-emerald-100 text-emerald-600',   value: 'text-emerald-600', hover: 'hover:border-emerald-200 hover:shadow-emerald-500/15', mark: 'text-emerald-500' },
  warning: { surface: 'bg-amber-50 border-amber-100',     tile: 'bg-amber-100 text-amber-600',       value: 'text-amber-600',   hover: 'hover:border-amber-200 hover:shadow-amber-500/15',     mark: 'text-amber-500' },
  danger:  { surface: 'bg-red-50 border-red-100',         tile: 'bg-red-100 text-red-600',           value: 'text-red-600',     hover: 'hover:border-red-200 hover:shadow-red-500/15',         mark: 'text-red-500' },
  info:    { surface: 'bg-indigo-50 border-indigo-100',   tile: 'bg-indigo-100 text-indigo-600',     value: 'text-indigo-600',  hover: 'hover:border-indigo-200 hover:shadow-indigo-500/15',   mark: 'text-indigo-500' },
  neutral: { surface: 'bg-card border-border',           tile: 'bg-muted text-muted-foreground',    value: 'text-foreground',  hover: 'hover:border-brand/30 hover:shadow-brand/10',          mark: 'text-muted-foreground' },
};

/**
 * Canonical metric tile (DESIGN.md §4.6, golden rule 20).
 *
 * Stacked layout on a tone-tinted surface, with an oversized watermark of the
 * same icon at the right edge — the shape the studio's other dashboards use,
 * rather than the kit's compact inline-icon header.
 */
export const KpiCard: React.FC<KpiCardProps> = ({
  icon: Icon, label, value, tone = 'neutral', badge, sub, onClick,
}) => {
  const t = TONES[tone];
  const card = (
    <Card
      className={cn(
        'group/kpi relative h-full overflow-hidden transition-all duration-200',
        t.surface,
        onClick && cn('hover:-translate-y-1 hover:shadow-lg', t.hover)
      )}
    >
      {/* Watermark: decorative only, never announced and never clickable. */}
      <Icon
        className={cn(
          'pointer-events-none absolute -right-2 top-1/2 h-20 w-20 -translate-y-1/2 opacity-[0.08] transition-all duration-300 group-hover/kpi:-rotate-6 group-hover/kpi:scale-110 group-hover/kpi:opacity-[0.14]',
          t.mark
        )}
        strokeWidth={1.75}
        aria-hidden="true"
      />
      {/* Compact on purpose: every pixel here is a row the lists below lose. */}
      <CardContent className="relative p-4">
        <div className="flex items-center gap-2.5">
          <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover/kpi:scale-110', t.tile)}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className={cn('text-2xl font-bold tabular-nums tracking-tight', t.value)}>{value}</span>
          {badge && (
            <span className="shrink-0 rounded-md bg-brand px-1.5 py-0.5 text-xs font-bold text-brand-foreground">{badge}</span>
          )}
        </div>
        {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );

  if (!onClick) return card;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {card}
    </button>
  );
};
