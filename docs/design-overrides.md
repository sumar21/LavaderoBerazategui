# Lavadero Berazategui — Divergencias del Sumar UI Kit

`docs/DESIGN.md` es el **Sumar UI Kit canónico**, vendoreado acá como **referencia
read-only** (`docs/DESIGN.md:3`). No se edita: su valor es ser un espejo exacto del kit
del estudio.

Este archivo registra dónde **Lavadero Berazategui se desvía a propósito**. Regla general:
al crear o modificar UI, **DESIGN.md manda salvo lo listado acá**. Cada override tiene qué
dice el kit, qué hacemos nosotros, dónde vive el cambio y por qué.

---

## 1. Color de marca — azul, no wine

- **Kit**: brand token = wine `#800020` (`docs/DESIGN.md:305`).
- **Nosotros**: azul `#173F8C` (`--brand: 219 72% 32%`). Es el ÚNICO color de marca.
- **Dónde vive**: `index.css` (token `--brand`) y `api/templates/emails.ts` (constante `BRAND`).
  Son los dos únicos lugares, como pide la regla de oro 2 (el tercero, `dashboard/shared.tsx`,
  no aplica: esta app todavía no tiene charts).
- **Por qué**: es el azul de la identidad del cliente, ya presente en el logo y en los mails.

## 2. Tailwind 4, no Tailwind 3

- **Kit**: asume Tailwind 3 con `tailwind.config.js`, `@tailwind base/components/utilities`
  y el plugin `tailwindcss-animate` (`docs/DESIGN.md:193`, `docs/DESIGN.md:1.1`).
- **Nosotros**: Tailwind 4. Los mismos tokens se declaran con `@theme` en `index.css`, y
  `tw-animate-css` reemplaza a `tailwindcss-animate`.
- **Dónde vive**: `index.css`, `package.json`, `vite.config.ts` (plugin `@tailwindcss/vite`).
- **Por qué**: la app ya corría en v4 y funcionaba. Bajar a v3 es riesgo de build sin ninguna
  ganancia: los nombres de token y las clases utilitarias del kit son idénticos en ambas
  versiones — sólo cambia dónde se declaran.

## 3. Sidebar sobre el color de marca (shell de marca)

- **Kit**: el aside es `bg-card` (blanco) con el NavItem activo en `bg-primary` (negro), y la
  regla de oro 3 dice que `primary` no se toca entre clientes (`docs/DESIGN.md:1562`,
  `docs/DESIGN.md:1572`, `docs/DESIGN.md:2892`).
- **Nosotros**: el sidebar usa el **color de marca como fondo** (`bg-sidebar` = `#173F8C`),
  con texto blanco y el item activo un escalón más claro del mismo hue.
- **Dónde vive**: tokens `--sidebar*` en `index.css`; `components/Sidebar.tsx`.
- **Por qué**: es el patrón de las otras apps del estudio con shell de marca (p. ej. RH360,
  que usa su verde de la misma forma). El resto de los usos de `primary` (botones, focus
  rings, controles) se mantienen en negro según el kit.
- **Contraste verificado**: blanco sobre el azul 9.77:1; labels inactivos (`--sidebar-muted`)
  5.97:1; el item activo se apoya en `52%` de luminosidad — 2.03:1 contra el fondo, que es lo
  máximo que permite mantener el texto blanco encima en AA (4.83:1). Más claro y el label falla.

## 3b. Sidebar colapsable

- **Kit**: lo pide (`isCollapsed ? "w-16" : "w-64"`, `docs/DESIGN.md:1562`); se documenta acá
  sólo el detalle propio.
- **Nosotros**: el estado se persiste en `localStorage` (`sidebar_collapsed`), y un item con
  submenú, si el rail está colapsado, primero lo expande y después abre el submenú.
- **Por qué**: un flyout para un único menú con hijos sería un segundo sistema de popovers
  para un solo caso. En colapsado, los items llevan `title` y el `TooltipHost` global les
  pone el pill (regla de oro 10).

## 4. Fondo del área de contenido — `bg-muted`, no `bg-secondary/30`

- **Kit**: el área de contenido va sobre `bg-secondary/30` (`docs/DESIGN.md:330`, `docs/DESIGN.md:1568`).
- **Nosotros**: `bg-muted` sólido.
- **Dónde vive**: `App.tsx` — el `<main>`.
- **Por qué**: `secondary` es `#f4f4f5`; al 30% sobre un `background` blanco resuelve a
  ~`#fbfbfb`, indistinguible del blanco. Las `Card` (que son `bg-card` = blanco puro) se
  perdían contra el lienzo. Con `bg-muted` sólido las tarjetas recuperan separación sin
  tocar los tokens.

## 5. Touch targets a 44px en mobile

- **Kit**: controles a `h-9`/`h-10`, y §5.13 reconoce que quedan **por debajo del mínimo
  táctil de 44px**, dejándolo como deuda a cubrir (`docs/DESIGN.md:2165`).
- **Nosotros**: los controles primarios son `h-11 md:h-10` — 44px en táctil, altura del kit
  de `md` para arriba.
- **Dónde vive**: `components/ui/Button.tsx`, `components/ui/Input.tsx`.
- **Por qué**: el kit mismo lo recomienda para una app táctil-first, y esta se usa en el
  piso de la planta desde el celular.

## 6. Loader con el isotipo del cliente

- **Kit**: el `Loader` trae un `<Mountain>` de lucide con el comentario "reemplazar por el
  ícono/isotipo del cliente" (`docs/DESIGN.md:844`).
- **Nosotros**: la burbuja del logo (`/favicon.svg`), invertida con
  `filter: invert(1) hue-rotate(180deg)` para leerse sobre fondo claro.
- **Dónde vive**: `components/ui/Loader.tsx`.
- **Por qué**: es exactamente lo que el kit indica hacer; se registra para que quede claro
  que el `<Mountain>` no se olvidó.

## 7. Escala de z-index propia

- **Kit**: la regla de oro 19 prohíbe los `z-[9999]`/`z-[999999]` del código legacy… pero sus
  propios snippets de `Toast` y `Tooltip` usan `z-[99999]` y `z-[100000]`
  (`docs/DESIGN.md:928`, `docs/DESIGN.md:1045`).
- **Nosotros**: una escala tipada — nav 20 · drawer 50 · modal 60 · confirm 70 · toast 80 · tooltip 90.
- **Dónde vive**: `components/ui/zLayers.ts`.
- **Por qué**: se sigue la regla, no el ejemplo. Mismo orden relativo, valores sanos.

---

> Si aparece una divergencia nueva respecto del kit, se agrega como un bloque más acá
> (misma estructura: kit → nosotros → dónde → por qué), no editando `docs/DESIGN.md`.
