/**
 * Audits the frontend against the checkable Golden Rules of docs/DESIGN.md §15.
 * Run: node scripts/audit-kit.mjs
 *
 * Only rules a static check can honestly verify are listed. Anything needing a
 * running browser (contrast on real pixels, focus order) is out of scope here.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const R = process.cwd();
const files = [];
const walk = (d) => {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) { if (!['node_modules', 'dist', 'api', 'docs', 'scripts'].includes(e)) walk(p); }
    else if (/\.tsx?$/.test(e)) files.push(p);
  }
};
walk(R);
const src = files.map(f => [f.slice(R.length + 1), readFileSync(f, 'utf8')]);

const findings = [];
const flag = (rule, file, detail) => findings.push({ rule, file, detail });

/** The arbitrary sizes the kit sanctions. Named steps up to 2xl are fine. */
const SIZE_OK = new Set(['[13px]', '[11px]', '[10px]', '[9px]', '[8px]']);

/* Dark mode works by redefining palette steps inside `.dark` in index.css, so a
   step used in the app but missing there stays at its LIGHT value — a white
   block on a dark page. Read the actual declarations instead of hardcoding a
   list, so this can never drift from the stylesheet. */
const CSS = readFileSync(`${R}/index.css`, 'utf8');
const DARK_BLOCK = CSS.split('.dark').slice(1).join('.dark');
const REMAPPED = new Set(
  [...DARK_BLOCK.matchAll(/--color-([a-z]+)-(\d{2,3})\s*:/g)].map(m => `${m[1]}-${m[2]}`)
);
/* Steps that carry surfaces or foreground text and therefore must flip. 300/400/500
   are mid tones (dots, icons, focus rings) that read on either canvas, and some
   sit on the brand sidebar, which does not follow the theme. */
const MUST_FLIP = new Set(['50', '100', '200', '600', '700', '800', '900']);
const FAMILIES = /^(red|amber|emerald|indigo|blue|sky|violet|orange|purple|green|teal|cyan|rose|pink|lime|yellow|fuchsia)$/;

for (const [file, s] of src) {
  const lines = s.split(/\r?\n/);

  lines.forEach((line, i) => {
    const at = `${file}:${i + 1}`;

    // Prose is not code. Without this, a comment that *names* the anti-pattern
    // ("the kit ships z-[99999], do not copy it") reports itself as a finding.
    if (/^\s*(\/\/|\/\*|\*)/.test(line)) return;

    // 1 — one icon set: no hand-rolled SVGs imitating lucide
    if (/<svg[^>]*viewBox="0 0 24 24"/.test(line) && !file.includes('favicon')) {
      flag(1, at, 'SVG a mano en vez de lucide-react');
    }
    // 4 — money must not use type="number"
    if (/type="number"/.test(line) && /precio|price|monto|importe|total/i.test(line)) {
      flag(4, at, 'type="number" en un campo de dinero');
    }
    // 19 — z-index scale
    if (/z-\[(9{3,}|[0-9]{4,})\]/.test(line)) {
      flag(19, at, 'z-index fuera de escala');
    }
    // 24 — icon-only buttons need a name
    if (/<button/.test(line) && /size="icon"|aria-hidden/.test(line) === false) {
      const hasName = /aria-label=|title=/.test(line);
      const iconOnly = /size="icon"/.test(line);
      if (iconOnly && !hasName) flag(24, at, 'botón-ícono sin aria-label ni title');
    }
    // Kit palette: green is a duplicate of emerald (§1.4)
    if (/\b(bg|text|border|ring)-green-\d+/.test(line)) {
      flag('1.4', at, 'usa green-* (el kit usa emerald)');
    }
    // Neutrals must come from tokens
    if (/\b(bg|text|border)-(slate|zinc|gray)-\d+/.test(line)) {
      flag('1.4', at, 'color neutro hardcodeado en vez de token');
    }
    // Typography — one family. font-mono is for amounts in grids/totals, and
    // every past use was on identifiers, so the second webfont was dead weight.
    if (/\bfont-mono\b/.test(line)) {
      flag('tipo', at, 'font-mono: el kit usa Inter salvo montos en grillas');
    }
    // Typography — one scale (DESIGN.md §Tipografía). 3xl+ and the weights the
    // kit does not list are how the app drifted to 14 sizes in the first place.
    const size = line.match(/(?<![\w-])text-(\[[\d.]+(?:px|rem)\]|[3-9]xl)(?![\w-])/);
    if (size && !SIZE_OK.has(size[1]) && !file.includes('Login')) {
      flag('tipo', at, `tamaño fuera de escala: text-${size[1]}`);
    }
    const weight = line.match(/(?<![\w-])font-(thin|extralight|light|normal|extrabold|black)(?![\w-])/);
    if (weight) flag('tipo', at, `peso fuera de escala: font-${weight[1]}`);
    // A variant for a breakpoint that does not exist emits no CSS at all, so
    // `hidden xs:inline` hides the element at every width — silently.
    const bp = line.match(/(?<![\w-])(xs|2xs|3xl):/);
    if (bp) flag('tipo', at, `breakpoint inexistente en este proyecto: ${bp[1]}:`);

    // Dark mode — every surface/text palette step must be redefined in `.dark`.
    for (const m of line.matchAll(/(?<![\w-])(?:bg|text|border|divide|ring)-([a-z]+)-(\d{2,3})(?![\w-])/g)) {
      const [, family, step] = m;
      if (!FAMILIES.test(family) || !MUST_FLIP.has(step)) continue;
      if (!REMAPPED.has(`${family}-${step}`)) {
        flag('dark', at, `${family}-${step} no está redefinido en .dark (queda claro en modo oscuro)`);
      }
    }
  });

  // 5 — modals must portal
  if (/fixed inset-0[^"]*z-\[?60/.test(s) && !/createPortal/.test(s)) {
    flag(5, file, 'overlay de modal sin createPortal');
  }
  // 9 — a desktop-only table needs a mobile counterpart
  if (/hidden md:(block|flex|table)/.test(s) && /<table/.test(s) && !/md:hidden/.test(s)) {
    flag(9, file, 'tabla desktop sin vista mobile');
  }
}

const byRule = findings.reduce((acc, f) => { (acc[f.rule] ??= []).push(f); return acc; }, {});
const total = findings.length;

console.log(`\nAuditoría del kit — ${src.length} archivos\n${'='.repeat(52)}`);
if (!total) {
  console.log('Sin hallazgos.');
} else {
  for (const rule of Object.keys(byRule).sort()) {
    const list = byRule[rule];
    console.log(`\nRegla ${rule} — ${list.length} hallazgo(s)`);
    for (const f of list.slice(0, 8)) console.log(`  ${f.file}  ${f.detail}`);
    if (list.length > 8) console.log(`  … y ${list.length - 8} más`);
  }
}
console.log(`\n${'='.repeat(52)}\nTOTAL: ${total}`);
process.exit(total ? 1 : 0);
