/**
 * Renders both email templates to ./preview-*.html and asserts the parts that
 * are easy to break silently. Run with: npm run mail:preview
 *
 * Nothing here touches Graph — no mail is sent.
 *
 * ---
 * Refreshing logo.ts after a logo change: assets/images.ts stores the brand mark
 * as an SVG that Figma exported as a `<pattern>` wrapping a base64 PNG. Decode
 * the SVG, pull the PNG out of its `xlink:href`, and write those base64 bytes
 * back into logo.ts:
 *
 *   const svg = Buffer.from(<the base64 after `data:image/svg+xml;base64,`>, 'base64').toString();
 *   const png = svg.match(/href="data:image\/png;base64,([A-Za-z0-9+/=]+)"/)[1];
 */
import assert from 'node:assert';
import { writeFileSync } from 'node:fs';
import { purchaseOrderEmail, credentialsEmail, escapeHtml } from './emails.js';
import { buildMessage, parseAddressList } from '../services/mail.js';
import { LOGO_CID, LOGO_PNG_BASE64 } from './logo.js';

const order = purchaseOrderEmail({
  orderNumber: 131,
  orderDate: '14/08/2026',
  notes: 'Entregar en horario de mañana.\nCoordinar con depósito.',
  items: [
    { sku: 'ART-001', articulo: 'Detergente', descripcion: 'Detergente industrial 20L', cantidad: 12 },
    { sku: 'ART-002', articulo: 'Suavizante', descripcion: 'Suavizante concentrado 5L', cantidad: 40 },
    // Hostile input: must render as text, never as markup.
    { sku: '<script>alert(1)</script>', articulo: 'x', descripcion: 'Bolsas "premium" & etiquetas', cantidad: 5 },
  ],
});

const credentials = credentialsEmail({
  name: 'Facundo Rombola',
  username: 'frombola',
  password: 'ClaveDePrueba123',
});

// --- escaping ---
assert.strictEqual(escapeHtml('<b>&"\''), '&lt;b&gt;&amp;&quot;&#39;', 'escapeHtml must cover all five entities');
assert.ok(!order.includes('<script>'), 'hostile SKU leaked into the markup unescaped');
assert.ok(order.includes('&lt;script&gt;'), 'hostile SKU should appear escaped');
assert.ok(order.includes('&quot;premium&quot;') && order.includes('&amp;'), 'quotes and ampersands must be escaped');

// --- purchase order content ---
assert.ok(order.includes('Orden N° 131'), 'order number missing');
assert.ok(order.includes('14/08/2026'), 'order date missing');
assert.ok(order.includes('Detergente industrial 20L'), 'item description missing');
// Scope these to the items table only — the layout's footer also carries a
// border-top, and matching against the whole document counts it by mistake.
const itemsTable = order.match(/<table[^>]*border-collapse:[\s\S]*?<\/table>/)?.[0] ?? '';
assert.ok(itemsTable, 'items table not found');

// It must keep BOTH its grid lines and its rounded frame. Those only coexist
// under border-collapse:separate — `collapse` merges the cell borders into the
// table's own, and the radius then clips them away.
assert.ok(itemsTable.includes('border-collapse:separate'), 'collapse would clip the rounded corners');
assert.ok(itemsTable.includes('border-spacing:0'), 'separate without zero spacing leaves gaps between cells');
assert.ok(itemsTable.includes('border-radius'), 'the rounded frame was lost');

// Dividers sit on trailing edges only, so adjacent cells never double up to 2px.
assert.strictEqual((itemsTable.match(/border-right:1px solid/g) ?? []).length, 8,
  '2 header + 6 body cells carry a right divider; the last column must not');
assert.strictEqual((itemsTable.match(/border-top:1px solid/g) ?? []).length, 9,
  'every body cell needs a top divider');
assert.ok(!itemsTable.includes('border-bottom'), 'a bottom divider would double against the next row\'s top');
assert.ok(order.includes('Aclaraciones adicionales'), 'notes block missing when notes are present');
assert.ok(order.includes('white-space:pre-wrap'), 'notes must keep their line breaks');

// notes are optional
assert.ok(
  !purchaseOrderEmail({ orderNumber: 1, orderDate: 'x', items: [] }).includes('Aclaraciones adicionales'),
  'notes block must be omitted when there are no notes'
);

// --- credentials content ---
assert.ok(credentials.includes('frombola') && credentials.includes('ClaveDePrueba123'), 'credentials missing');
assert.ok(credentials.includes('Facundo Rombola'), 'name missing');

// --- both share the shell ---
for (const [name, html] of Object.entries({ order, credentials })) {
  assert.ok(html.startsWith('\n<!DOCTYPE html>'), `${name}: missing doctype`);
  assert.ok(html.includes(`src="cid:${LOGO_CID}"`), `${name}: logo must be referenced by Content-ID`);
  assert.ok(!/<img[^>]+src="data:/.test(html), `${name}: data: image sources are blocked by Outlook`);
  assert.ok(/<img[^>]+width="\d+"[^>]+height="\d+"/.test(html), `${name}: Outlook needs explicit img width/height`);
  assert.ok(!/<p[^>]*>\s*<(div|table)/.test(html), `${name}: block element nested inside <p> (invalid HTML)`);
}

// --- address parsing ---
assert.deepStrictEqual(parseAddressList('a@x.com;b@y.com'), ['a@x.com', 'b@y.com']);
assert.deepStrictEqual(parseAddressList(' a@x.com , b@y.com '), ['a@x.com', 'b@y.com'], 'commas and padding');
assert.deepStrictEqual(parseAddressList('a@x.com;;'), ['a@x.com'], 'trailing separators produce no empty entries');
assert.deepStrictEqual(parseAddressList(undefined), [], 'unset env var yields an empty list');

// --- Graph payload: cc/bcc are independent, and empty lists are omitted ---
const base = { to: ['p@proveedor.com'], subject: 's', html: 'h' };

const full = buildMessage({ ...base, cc: ['visible@x.com'], bcc: ['oculto@x.com'] }).message as any;
assert.deepStrictEqual(full.ccRecipients, [{ emailAddress: { address: 'visible@x.com' } }]);
assert.deepStrictEqual(full.bccRecipients, [{ emailAddress: { address: 'oculto@x.com' } }]);

const onlyBcc = buildMessage({ ...base, bcc: ['oculto@x.com'] }).message as any;
assert.ok(!('ccRecipients' in onlyBcc), 'cc must be absent, not empty — Graph rejects empty arrays');
assert.ok('bccRecipients' in onlyBcc, 'bcc should survive on its own');

const neither = buildMessage({ ...base, cc: [], bcc: [] }).message as any;
assert.ok(!('ccRecipients' in neither) && !('bccRecipients' in neither), 'empty lists must be omitted');
assert.deepStrictEqual(neither.toRecipients, [{ emailAddress: { address: 'p@proveedor.com' } }]);
assert.strictEqual(neither.body.contentType, 'HTML');

// --- the logo actually travels with the message ---
const attachments = (buildMessage({ ...base, html: order }) as any).message.attachments;
assert.strictEqual(attachments.length, 1, 'exactly one inline attachment expected');
assert.strictEqual(attachments[0].contentId, LOGO_CID, 'contentId must match the cid: the HTML references');
assert.strictEqual(attachments[0].isInline, true, 'a non-inline logo shows up as a file the recipient must open');
assert.strictEqual(attachments[0].contentType, 'image/png', 'Outlook renders no SVG');
assert.ok(Buffer.from(LOGO_PNG_BASE64, 'base64').subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])),
  'logo bytes are not a real PNG');

// Browsers cannot resolve cid:, so the on-disk previews inline the same bytes.
// The sent mail keeps the cid: reference — only these local files differ.
const forBrowser = (html: string) =>
  html.replace(`cid:${LOGO_CID}`, `data:image/png;base64,${LOGO_PNG_BASE64}`);

writeFileSync('preview-orden-compra.html', forBrowser(order));
writeFileSync('preview-credenciales.html', forBrowser(credentials));

console.log('OK — todos los checks pasaron.');
console.log('Abrí preview-orden-compra.html y preview-credenciales.html en el navegador.');
