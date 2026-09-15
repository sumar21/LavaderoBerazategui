import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, AlertTriangle, Clock, ShoppingCart, CircleCheck,
  AlertCircle, PackageSearch, Inbox, Calendar, ArrowRight,
} from 'lucide-react';
import { Card, CardContent, cn } from '../components/ui/UIComponents';
import { KpiCard, type Tone as KpiTone } from '../components/ui/KpiCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Loader } from '../components/ui/Loader';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { stockService } from '../services/stockService';
import { Stock, PurchaseOrder } from '@/types';
import { capitalizeFirst } from '../utils/text';
import { useUserProfile } from '../components/useUserProfile';

interface HomeProps {
  onViewChange?: (view: string) => void;
  /**
   * Already-resolved orders from App. Home used to fetch raw ones itself and
   * print `Proveedor`, which is the provider ID — the name only exists after
   * App looks it up against the providers list.
   */
  orders: PurchaseOrder[];
}

const LOW_STOCK_THRESHOLD = 50;
/* How many rows each list holds — a data cap, not a layout one. The cards get
   their height from the viewport, so a longer list scrolls instead of pushing
   the page down. Anything past this is behind "Ver todas". */
const LIST_SIZE = 9;

/** SharePoint hands back either casing depending on the list. */
const qtyOf = (item: any) => {
  const qty = parseFloat(item?.stockFinal || item?.StockFinal || '0');
  return Number.isNaN(qty) ? 0 : qty;
};

/** "Martes, 16 de Septiembre de 2026" — es-AR lowercases weekday and month. */
const longDate = (d: Date) => {
  const part = (options: Intl.DateTimeFormatOptions) => capitalizeFirst(d.toLocaleDateString('es-AR', options));
  return `${part({ weekday: 'long' })}, ${d.getDate()} de ${part({ month: 'long' })} de ${d.getFullYear()}`;
};

const greeting = (hour: number) => (hour < 5 || hour >= 20 ? 'Buenas noches' : hour < 13 ? 'Buenos días' : 'Buenas tardes');

const TONE_TILE = {
  danger: 'bg-red-50 text-red-600 ring-red-100',
  brand: 'bg-brand/10 text-brand ring-brand/15',
} as const;

/** List card: icon tile, title and subtitle, with the "see all" link on the right. */
const ListCard: React.FC<{
  icon: React.ElementType;
  tone: keyof typeof TONE_TILE;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon: Icon, tone, title, subtitle, action, children }) => (
  <Card className="relative flex min-h-0 flex-col overflow-hidden lg:flex-1">
    {tone === 'danger' && <span className="absolute left-0 top-0 h-[4.5rem] w-1 bg-red-500" aria-hidden="true" />}
    <div className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-4">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1', TONE_TILE[tone])}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-lg font-bold leading-tight">{title}</h2>
        <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
      </div>
      {action}
    </div>
    <CardContent className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">{children}</CardContent>
  </Card>
);

const SeeAll: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline">
    {children}
    <ArrowRight className="h-4 w-4" aria-hidden="true" />
  </button>
);

/** Header cells of both lists: a muted band with rounded ends, stuck to the top while the rows scroll. */
const TH = 'sticky top-0 z-10 h-10 bg-muted px-3 text-left text-sm font-medium text-muted-foreground first:rounded-l-lg last:rounded-r-lg';

const EmptyRow: React.FC<{ icon: React.ElementType; children: React.ReactNode }> = ({ icon: Icon, children }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
    <Icon className="h-6 w-6 text-muted-foreground/50" aria-hidden="true" />
    <p className="text-xs text-muted-foreground">{children}</p>
  </div>
);

export const Home: React.FC<HomeProps> = ({ onViewChange, orders }) => {
  const user = useUserProfile();
  const [stock, setStock] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(false);
    try {
      setStock(await stockService.getStock());
    } catch (err) {
      console.error('Error fetching home data', err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const stats = useMemo(() => {
    const active = stock.filter(i => (i.status ?? (i as any).Status) === 'Activo');
    const low = active
      .filter(i => qtyOf(i) < LOW_STOCK_THRESHOLD)
      .sort((a, b) => qtyOf(a) - qtyOf(b));

    return {
      total: active.reduce((acc, i) => acc + qtyOf(i), 0),
      low,
      // Same test Aprobaciones filters by, so the KPI and that screen agree.
      pending: orders.filter(o => {
        const s = (o.status ?? '').toUpperCase();
        return s === 'PENDIENTE' || s.includes('PENDIENTE APROBACION') || s.includes('PENDIENTE_APROBACION') || s.includes('PENDIENTE APROBACIÓN');
      }).length,
      // Newest first: IDs are sequential, and dates arrive as dd/mm/yyyy strings.
      recent: [...orders].sort((a, b) => Number(b.sharepointId ?? 0) - Number(a.sharepointId ?? 0)).slice(0, LIST_SIZE),
    };
  }, [stock, orders]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Loader text="Cargando panel…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <AlertCircle className="h-6 w-6 text-red-500" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold">No pudimos cargar el panel</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">Revisá tu conexión e intentá de nuevo.</p>
        <Button variant="outline" onClick={fetchData}>Reintentar</Button>
      </div>
    );
  }

  // Built here (not inline) so the tone ternaries keep their union type.
  const KPIS: Array<{ icon: React.ElementType; label: string; value: React.ReactNode; sub: string; tone: KpiTone; view: string }> = [
    // Zero is good news on the two alert tiles, so they go green rather than
    // grey — a colourless KPI reads as "no data", not as "nothing to do".
    { icon: Box, label: 'Stock total', value: stats.total.toLocaleString('es-AR'), sub: 'unidades activas', tone: 'brand', view: 'stock' },
    { icon: AlertTriangle, label: 'Stock bajo', value: stats.low.length, sub: `menos de ${LOW_STOCK_THRESHOLD} un.`, tone: stats.low.length > 0 ? 'warning' : 'success', view: 'stock' },
    { icon: stats.pending > 0 ? Clock : CircleCheck, label: 'Aprobaciones', value: stats.pending, sub: stats.pending > 0 ? 'órdenes pendientes' : 'todo al día', tone: stats.pending > 0 ? 'warning' : 'success', view: 'aprobaciones' },
    { icon: ShoppingCart, label: 'Órdenes', value: orders.length, sub: 'en el sistema', tone: 'info', view: 'compras' },
  ];

  return (
    /* From lg up the panel is exactly one screen tall: header and KPIs keep their
       size, the two lists split what is left and scroll inside their own card.
       Sizing by row count instead meant picking a number that fit one laptop and
       overflowed the next. Below lg the lists stack, so the page scrolls. */
    <div className="h-full overflow-y-auto p-4 md:px-8 md:py-6 lg:overflow-hidden">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 lg:h-full lg:gap-5">

        <PageHeader
          className="shrink-0"
          title="Panel de control"
          subtitle="Resumen de stock, compras y aprobaciones."
          actions={
            <div className="hidden items-center gap-3 rounded-xl border border-border bg-card py-2.5 pl-3 pr-5 shadow-sm sm:flex">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <Calendar className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold">{longDate(new Date())}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">{greeting(new Date().getHours())}, {capitalizeFirst(user.name)}</p>
              </div>
            </div>
          }
        />

        {/* KPI row (§5.3), entering one after the other */}
        <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {KPIS.map((kpi, i) => (
            <div key={kpi.label} className="stagger-in" style={{ '--stagger-index': i } as React.CSSProperties}>
              <KpiCard
                icon={kpi.icon}
                label={kpi.label}
                value={kpi.value}
                sub={kpi.sub}
                tone={kpi.tone}
                onClick={() => onViewChange?.(kpi.view)}
              />
            </div>
          ))}
        </div>

        {/* Two working lists — the panel's actual value, not just counters */}
        <div className="grid grid-cols-1 gap-4 stagger-in lg:min-h-0 lg:flex-1 lg:grid-cols-2" style={{ '--stagger-index': 4 } as React.CSSProperties}>
          <ListCard
            icon={AlertTriangle}
            tone="danger"
            title="Stock crítico"
            subtitle="Artículos con stock por debajo del mínimo recomendado."
            action={stats.low.length > LIST_SIZE ? <SeeAll onClick={() => onViewChange?.('stock')}>Ver los {stats.low.length}</SeeAll> : undefined}
          >
            {stats.low.length === 0 ? (
              <EmptyRow icon={PackageSearch}>Ningún artículo por debajo de {LOW_STOCK_THRESHOLD} unidades.</EmptyRow>
            ) : (
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr>
                    <th className={TH}>Artículo</th>
                    <th className={cn(TH, 'w-20 text-center')}>Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.low.slice(0, LIST_SIZE).map(item => {
                    const qty = qtyOf(item);
                    return (
                      <tr key={item.id} className="transition-colors hover:bg-accent/60">
                        <td className="px-3 py-1.5">
                          <p className="truncate font-medium">{capitalizeFirst(item.concat || item.articulo || item.sku)}</p>
                          <p className="truncate text-xs text-muted-foreground">{capitalizeFirst(item.subdeposito) || item.sku}</p>
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <span className={cn('inline-flex min-w-11 justify-center rounded-md px-2 py-0.5 font-semibold tabular-nums', qty === 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600')}>
                            {qty.toLocaleString('es-AR')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </ListCard>

          <ListCard
            icon={Clock}
            tone="brand"
            title="Últimas órdenes"
            subtitle="Órdenes de compra más recientes del sistema."
            action={<SeeAll onClick={() => onViewChange?.('compras')}>Ver todas</SeeAll>}
          >
            {stats.recent.length === 0 ? (
              <EmptyRow icon={Inbox}>Todavía no hay órdenes de compra.</EmptyRow>
            ) : (
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr>
                    <th className={cn(TH, 'w-16')}>#</th>
                    <th className={TH}>Proveedor</th>
                    <th className={cn(TH, 'hidden w-28 sm:table-cell')}>Fecha</th>
                    <th className={cn(TH, 'w-48')}>Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.recent.map(order => (
                    <tr key={order.id} className="transition-colors hover:bg-accent/60">
                      <td className="px-2 py-2">
                        <span className="inline-block rounded-md bg-muted px-2 py-1 text-xs font-semibold tabular-nums text-muted-foreground">#{order.sharepointId}</span>
                      </td>
                      <td className="px-3 py-2">
                        <p className="truncate" title={capitalizeFirst(order.providerName)}>{capitalizeFirst(order.providerName) || 'Sin proveedor'}</p>
                        <p className="truncate text-xs text-muted-foreground sm:hidden">{order.date}</p>
                      </td>
                      <td className="hidden px-3 py-2 tabular-nums text-muted-foreground sm:table-cell">{order.date}</td>
                      <td className="px-3 py-2">
                        {order.status && <StatusBadge status={order.status} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ListCard>
        </div>

      </div>
    </div>
  );
};
