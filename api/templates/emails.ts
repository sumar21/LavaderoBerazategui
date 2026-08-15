/**
 * Email templates.
 *
 * Table-based layout with inline styles on purpose: Outlook (the primary client
 * on this tenant) ignores flexbox, grid and most <style> blocks.
 */

import { LOGO_CID } from './logo.js';

const BRAND = '#173F8C';
/** Header cell dividers: visible against BRAND without fighting it. */
const BRAND_LIGHT = '#3563B4';
const INK = '#111111';
const MUTED = '#5A6472';
const LINE = '#E5E7EB';
const FONT = "'Segoe UI', Arial, Helvetica, sans-serif";

export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Wraps content in the shared shell: brand header, white card, footer. */
const layout = (title: string, content: string): string => `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F4F6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid ${LINE};">

        <tr><td style="background:${BRAND};padding:18px 28px;">
          <!-- Explicit width/height: Outlook ignores CSS sizing on images.
               Native artwork is 482x122, so 138x35 keeps the ratio. -->
          <img src="cid:${LOGO_CID}" width="138" height="35" alt="Lavadero Berazategui"
               style="display:block;border:0;outline:none;text-decoration:none;">
        </td></tr>

        <tr><td style="padding:28px;font-family:${FONT};font-size:15px;line-height:1.6;color:${INK};">
          <h1 style="margin:0 0 18px 0;font-size:21px;font-weight:700;color:${INK};">${escapeHtml(title)}</h1>
          ${content}
        </td></tr>

        <tr><td style="padding:18px 28px;border-top:1px solid ${LINE};background:#FAFAFA;">
          <p style="margin:0;font-family:${FONT};font-size:12px;color:${MUTED};">
            Mensaje automático de Lavadero Berazategui. Por favor no respondas a esta casilla.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

const noteBlock = (notes: string): string => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
    <tr><td style="background:#F5F7FB;border-left:4px solid ${BRAND};border-radius:0 6px 6px 0;padding:14px 16px;">
      <p style="margin:0 0 4px 0;font-family:${FONT};font-size:13px;font-weight:600;color:${BRAND};">Aclaraciones adicionales</p>
      <p style="margin:0;font-family:${FONT};font-size:14px;color:${INK};white-space:pre-wrap;">${escapeHtml(notes)}</p>
    </td></tr>
  </table>`;

export interface OrderItemRow {
  sku: unknown;
  articulo: unknown;
  descripcion: unknown;
  cantidad: unknown;
}

const itemsTable = (items: OrderItemRow[]): string => {
  // `border-collapse:collapse` cannot coexist with rounded corners — collapsing
  // merges cell borders into the table's own, and the radius then clips them.
  // With `separate` + zero spacing the cells keep their own borders, so the
  // rounded frame survives. To avoid doubled 1px lines, dividers live only on
  // the trailing edges: border-right on every column but the last, border-top
  // on every row (the header's background separates it from the first row).
  const th = `padding:10px 12px;text-align:left;font-family:${FONT};font-size:12px;font-weight:600;color:#FFFFFF;background:${BRAND};text-transform:uppercase;letter-spacing:.4px;`;
  const td = `padding:10px 12px;font-family:${FONT};font-size:14px;color:${INK};border-top:1px solid ${LINE};`;
  const thDivider = `border-right:1px solid ${BRAND_LIGHT};`;
  const tdDivider = `border-right:1px solid ${LINE};`;

  const rows = items.map((item) => `
      <tr>
        <td style="${td}${tdDivider}">${escapeHtml(item.sku)}</td>
        <td style="${td}${tdDivider}">${escapeHtml(item.descripcion || item.articulo)}</td>
        <td style="${td}text-align:right;font-weight:600;white-space:nowrap;">${escapeHtml(item.cantidad)}</td>
      </tr>`).join('');

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;border:1px solid ${LINE};border-radius:8px;overflow:hidden;margin:0 0 20px 0;">
    <tr>
      <th style="${th}${thDivider}">SKU</th>
      <th style="${th}${thDivider}">Artículo</th>
      <th style="${th}text-align:right;">Cantidad</th>
    </tr>${rows}
  </table>`;
};

export interface PurchaseOrderMailData {
  orderNumber: unknown;
  orderDate: unknown;
  notes?: string;
  items: OrderItemRow[];
}

export const purchaseOrderEmail = ({ orderNumber, orderDate, notes, items }: PurchaseOrderMailData) =>
  layout('Solicitud de presupuesto', `
    <p style="margin:0 0 16px 0;">
      Solicitamos presupuesto para los ítems de la <b>Orden N° ${escapeHtml(orderNumber)}</b>
      del <b>${escapeHtml(orderDate)}</b>.
    </p>
    <p style="margin:0 0 20px 0;color:${MUTED};">
      Por favor cotizar disponibilidad, plazo de entrega, condiciones de pago y validez de la cotización.
    </p>
    ${notes && notes.trim() ? noteBlock(notes.trim()) : ''}
    ${itemsTable(items)}
    <p style="margin:0;">Quedamos atentos. Muchas gracias.</p>
  `);

export interface CredentialsMailData {
  name: unknown;
  username: unknown;
  password: unknown;
}

export const credentialsEmail = ({ name, username, password }: CredentialsMailData) =>
  layout('Tus credenciales de acceso', `
    <p style="margin:0 0 16px 0;">Hola ${escapeHtml(name)},</p>
    <p style="margin:0 0 20px 0;">Según tu solicitud, te compartimos tus credenciales de acceso:</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;border:1px solid ${LINE};border-radius:8px;">
      <tr><td style="padding:14px 16px;border-bottom:1px solid ${LINE};">
        <p style="margin:0 0 2px 0;font-family:${FONT};font-size:12px;color:${MUTED};text-transform:uppercase;letter-spacing:.4px;">Usuario</p>
        <p style="margin:0;font-family:${FONT};font-size:16px;font-weight:600;color:${INK};">${escapeHtml(username)}</p>
      </td></tr>
      <tr><td style="padding:14px 16px;">
        <p style="margin:0 0 2px 0;font-family:${FONT};font-size:12px;color:${MUTED};text-transform:uppercase;letter-spacing:.4px;">Contraseña</p>
        <p style="margin:0;font-family:${FONT};font-size:16px;font-weight:600;color:${INK};">${escapeHtml(password)}</p>
      </td></tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
      <tr><td style="background:#FFF7ED;border-left:4px solid #D97706;border-radius:0 6px 6px 0;padding:14px 16px;">
        <p style="margin:0;font-family:${FONT};font-size:14px;color:#7C2D12;">
          Por seguridad, iniciá sesión y cambiá la contraseña apenas puedas.
        </p>
      </td></tr>
    </table>

    <p style="margin:0;color:${MUTED};font-size:14px;">
      Si no solicitaste este correo, comunicate con nuestro equipo.
    </p>
  `);
