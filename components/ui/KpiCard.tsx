import React from 'react';
import { Card, CardContent, cn } from './UIComponents';

export type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  /** Colours the icon tile and the watermark. Defaults to neutral. */
  tone?: Tone;
  badge?: string;
  sub?: React.ReactNode;
  onClick?: () => void;
}

/**
 * One row per tone so a card never ends up half-coloured: the icon tile, the
 * accent rail, the background wash, the value and the hover shadow all move
 * together. `neutral` is deliberately the only colourless row — reach for it
 * when there is genuinely nothing to signal.
 */
const TONES: Record<Tone, { tile: string; rail: string; wash: string; value: string; hover: string; mark: string }> = {
  brand:   { tile: 'bg-brand/10 text-brand ring-brand/20',            rail: 'bg-brand',       wash: 'from-brand/[0.07]',    value: 'text-brand',       hover: 'hover:border-brand/40 hover:shadow-brand/15',       mark: 'text-brand' },
  success: { tile: 'bg-emerald-100 text-emerald-600 ring-emerald-200', rail: 'bg-emerald-500', wash: 'from-emerald-500/[0.07]', value: 'text-emerald-600', hover: 'hover:border-emerald-300 hover:shadow-emerald-500/15', mark: 'text-emerald-500' },
  warning: { tile: 'bg-amber-100 text-amber-600 ring-amber-200',       rail: 'bg-amber-500',   wash: 'from-amber-500/[0.09]',   value: 'text-amber-600',   hover: 'hover:border-amber-300 hover:shadow-amber-500/15',     mark: 'text-amber-500' },
  danger:  { tile: 'bg-red-100 text-red-600 ring-red-200',             rail: 'bg-red-500',     wash: 'from-red-500/[0.08]',     value: 'text-red-600',     hover: 'hover:border-red-300 hover:shadow-red-500/15',         mark: 'text-red-500' },
  info:    { tile: 'bg-indigo-100 text-indigo-600 ring-indigo-200',    rail: 'bg-indigo-500',  wash: 'from-indigo-500/[0.07]',  value: 'text-indigo-600',  hover: 'hover:border-indigo-300 hover:shadow-indigo-500/15',   mark: 'text-indigo-500' },
  neutral: { tile: 'bg-muted text-muted-foreground ring-border',       rail: 'bg-border',      wash: 'from-transparent',        value: 'text-foreground',  hover: 'hover:border-brand/30 hover:shadow-brand/10',          mark: 'text-muted-foreground' },
};

/**
 * Canonical metric tile (DESIGN.md §4.6, golden rule 20).
 *
 * Stacked layout with an oversized watermark of the same icon bleeding off the
 * right edge — the shape the studio's other dashboards use, rather than the
 * kit's compact inline-icon header. Budget/attainment/delta footers from the
 * kit are omitted until this app has a dashboard that needs them.
 */
export const KpiCard: React.FC<KpiCardProps> = ({
  icon: Icon, label, value, tone = 'neutral', badge, sub, onClick,
}) => {
  const t = TONES[tone];
  const card = (
    <Card
      className={cn(
        'group/kpi relative h-full overflow-hidden border-border transition-all duration-200',
        onClick && cn('hover:-translate-y-1 hover:shadow-lg', t.hover)
      )}
    >
      {/* Tone wash + accent rail: what makes a card read as "this is the warning
          one" from across the room, before anyone reads the label. */}
      <span className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent', t.wash)} aria-hidden="true" />
      <span className={cn('absolute inset-y-0 left-0 w-1 origin-top scale-y-0 transition-transform duration-300 group-hover/kpi:scale-y-100', t.rail)} aria-hidden="true" />

      {/* Watermark: decorative only, never announced and never clickable. */}
      <Icon
        className={cn(
          'pointer-events-none absolute -right-3 -top-3 h-20 w-20 opacity-[0.07] transition-all duration-300 group-hover/kpi:-rotate-6 group-hover/kpi:scale-110 group-hover/kpi:opacity-[0.13]',
          t.mark
        )}
        aria-hidden="true"
      />
      <CardContent className="relative p-4">
        <div className="flex items-center gap-2.5">
          <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 transition-transform duration-200 group-hover/kpi:scale-110', t.tile)}>
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
      className="w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {card}
    </button>
  );
};
