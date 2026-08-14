import React from 'react';
import { cn } from './UIComponents';

/**
 * Status pill whose colour derives from the canonical status, not from the
 * translated text (DESIGN.md §3.11, golden rule 7). Pass `status` for colour
 * and `label` for the already-translated wording.
 *
 * Statuses beyond the kit's list are this app's own purchase/stock workflow,
 * mapped onto the same canonical palette (§1.4).
 */
const STATUS_COLORS: Record<string, string> = {
  // Kit baseline
  'pendiente': 'bg-amber-100 text-amber-700',
  'en proceso': 'bg-indigo-100 text-indigo-700',
  'off season': 'bg-sky-100 text-sky-700',
  'pospuesto': 'bg-sky-100 text-sky-700',
  'listo para enviar': 'bg-emerald-100 text-emerald-700',
  'resuelto': 'bg-emerald-100 text-emerald-700',
  'despachado': 'bg-violet-100 text-violet-700',
  'anulado': 'bg-muted text-muted-foreground',
  'cerrada': 'bg-muted text-muted-foreground',
  'cerrado': 'bg-muted text-muted-foreground',
  // Lavadero Berazategui workflow — every OrdenCompra['Status'] in types.ts
  // must have an entry here, otherwise it falls back to grey and reads as
  // "inactive" (that is what happened to "Completada").
  'esperando presupuesto': 'bg-amber-100 text-amber-700',
  'presupuestada': 'bg-brand/10 text-brand',
  'pendiente aprobacion': 'bg-amber-100 text-amber-700',
  'pendiente ingreso': 'bg-indigo-100 text-indigo-700',
  'aprobada': 'bg-emerald-100 text-emerald-700',
  // Brand blue, not emerald: "aprobada" and "completada" are different steps of
  // the flow and must not share a colour (golden rule 7).
  'completada': 'bg-brand/10 text-brand',
  'rechazada': 'bg-red-100 text-red-700',
  'recibida': 'bg-emerald-100 text-emerald-700',
  'recepcion parcial': 'bg-indigo-100 text-indigo-700',
  'en transito': 'bg-indigo-100 text-indigo-700',
  'finalizada': 'bg-muted text-muted-foreground',
  'activo': 'bg-emerald-100 text-emerald-700',
  'inactivo': 'bg-muted text-muted-foreground',
};

/**
 * Accent-insensitive so "recepción" and "recepcion" resolve alike. The class is
 * the combining-marks block, invisible in an editor — do not "clean it up".
 */
const normalize = (status: string) =>
  String(status || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

/**
 * Raw API status → canonical key + the wording to show.
 *
 * This lived privately inside Compras, so every other screen rendered the raw
 * value straight into the colour map and missed: "Presupuesto" is not
 * "esperando presupuesto", so Home fell through to grey. Order matters —
 * "Pendiente Ingreso" contains PENDIENTE but is not an approval.
 */
const ALIASES: Array<[(s: string) => boolean, string, string]> = [
  [s => s.includes('PRESUPUESTO'), 'esperando presupuesto', 'Esperando Presupuesto'],
  [s => (s.includes('PENDIENTE') && s.includes('APROBACION')) || s === 'PENDIENTE' || s === 'PENDIENTE_APROBACION',
    'pendiente', 'Pendiente Aprobación'],
  [s => s.includes('APROBADA') || s.includes('APROBADO'), 'aprobada', 'Aprobada'],
  [s => s.includes('RECHAZADA') || s.includes('RECHAZADO'), 'rechazada', 'Rechazada'],
  [s => s.includes('INGRESO'), 'en proceso', 'Pendiente Ingreso'],
  [s => s.includes('RECEPCION'), 'recepcion parcial', 'En Recepción'],
  [s => s.includes('COMPLETADA') || s.includes('COMPLETADO'), 'completada', 'Completada'],
];

/** Resolves any raw status to the canonical key and its display wording. */
export const resolveStatus = (status: string): { canonical: string; label: string } => {
  if (!status) return { canonical: 'desconocido', label: 'Desconocido' };
  // Accents stripped before matching, so "Recepción" hits the RECEPCION rule.
  const s = normalize(status).toUpperCase();
  for (const [test, canonical, label] of ALIASES) {
    if (test(s)) return { canonical, label };
  }
  return { canonical: status, label: status };
};

export const statusColor = (status: string): string =>
  STATUS_COLORS[normalize(status)] || 'bg-muted text-muted-foreground';

export const StatusBadge: React.FC<{ status: string; label?: string; className?: string }> = ({ status, label, className }) => {
  const resolved = resolveStatus(status);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap',
        statusColor(resolved.canonical),
        className
      )}
    >
      {label ?? resolved.label}
    </span>
  );
};

export default StatusBadge;
