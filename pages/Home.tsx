import React, { useEffect, useMemo, useState } from 'react';
import {
  Shirt, AlertTriangle, Clock, ShoppingCart,
  AlertCircle, PackageSearch, Inbox,
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
/* The two working lists are the whole point of this screen, so they get as many
   rows as the fold allows. It was 5 while a row of nav shortcuts sat underneath. */
const LIST_SIZE = 9;

/** SharePoint hands back either casing depending on the list. */
const qtyOf = (item: any) => {
  const qty = parseFloat(item?.stockFinal || item?.StockFinal || '0');
  return Number.isNaN(qty) ? 0 : qty;
};

const SectionHeading: React.FC<{ children: React.ReactNode; action?: React.ReactNode }> = ({ children, action }) => (
  <div className="mb-3 flex items-center justify-between gap-3">
    <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      <span className="h-3.5 w-1 rounded-full bg-brand" aria-hidden="true" />
      {children}
    </h2>
    {action}
  </div>
);

const EmptyRow: React.FC<{ icon: React.ElementType; children: React.ReactNode }> = ({ icon: Icon, children }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
    <Icon className="h-6 w-6 text-muted-foreground/50" aria-hidden="true" />
    <p className="text-xs text-muted-foreground">{children}</p>
  </div>
);

export const Home: React.FC<HomeProps> = ({ onViewChange, orders }) => {
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
    { icon: Shirt, label: 'Stock total', value: stats.total.toLocaleString('es-AR'), sub: 'unidades activas', tone: 'brand', view: 'stock' },
    { icon: AlertTriangle, label: 'Stock bajo', value: stats.low.length, sub: `menos de ${LOW_STOCK_THRESHOLD} un.`, tone: stats.low.length > 0 ? 'warning' : 'success', view: 'stock' },
    { icon: Clock, label: 'Aprobaciones', value: stats.pending, sub: stats.pending > 0 ? 'órdenes pendientes' : 'todo al día', tone: stats.pending > 0 ? 'warning' : 'success', view: 'aprobaciones' },
    { icon: ShoppingCart, label: 'Órdenes', value: orders.length, sub: 'en el sistema', tone: 'info', view: 'compras' },
  ];

  return (
    <div className="h-full overflow-y-auto p-3 md:p-6">
      <div className="mx-auto max-w-[1400px] space-y-5">

        <PageHeader title="Panel de control" subtitle="Resumen de stock, compras y aprobaciones." />

        {/* KPI row (§5.3), entering one after the other */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 stagger-in" style={{ '--stagger-index': 4 } as React.CSSProperties}>
          <section>
            <SectionHeading
              action={
                stats.low.length > LIST_SIZE ? (
                  <button type="button" onClick={() => onViewChange?.('stock')} className="text-xs font-medium text-brand hover:underline">
                    Ver los {stats.low.length}
                  </button>
                ) : undefined
              }
            >
              Stock crítico
            </SectionHeading>
            <Card>
              <CardContent className="p-0">
                {stats.low.length === 0 ? (
                  <EmptyRow icon={PackageSearch}>Ningún artículo por debajo de {LOW_STOCK_THRESHOLD} unidades.</EmptyRow>
                ) : (
                  <ul className="divide-y divide-border">
                    {stats.low.slice(0, LIST_SIZE).map(item => {
                      const qty = qtyOf(item);
                      return (
                        <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/60">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{capitalizeFirst(item.concat || item.articulo || item.sku)}</p>
                            <p className="truncate text-[11px] text-muted-foreground">{item.subdeposito || item.sku}</p>
                          </div>
                          <span className={cn('shrink-0 text-sm font-bold tabular-nums', qty === 0 ? 'text-red-600' : 'text-amber-600')}>
                            {qty.toLocaleString('es-AR')}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <SectionHeading
              action={
                <button type="button" onClick={() => onViewChange?.('compras')} className="text-xs font-medium text-brand hover:underline">
                  Ver todas
                </button>
              }
            >
              Últimas órdenes
            </SectionHeading>
            <Card>
              <CardContent className="p-0">
                {stats.recent.length === 0 ? (
                  <EmptyRow icon={Inbox}>Todavía no hay órdenes de compra.</EmptyRow>
                ) : (
                  <ul className="divide-y divide-border">
                    {stats.recent.map(order => (
                      <li key={order.id} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/60">
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">#{order.sharepointId}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium">{capitalizeFirst(order.providerName) || 'Sin proveedor'}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{order.date}</p>
                        </div>
                        {order.status && <StatusBadge status={order.status} className="shrink-0" />}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        </div>

      </div>
    </div>
  );
};
