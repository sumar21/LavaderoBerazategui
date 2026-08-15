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
- **Nosotros**: una escala tipada — nav 20 · drawer 50 · modal 60 · confirm 70 · **popover 75** ·
  toast 80 · tooltip 90 (`components/ui/zLayers.ts:16`).
- **Dónde vive**: `components/ui/zLayers.ts`.
- **Por qué**: se sigue la regla, no el ejemplo. Mismo orden relativo, valores sanos.
  `popover` no está en el kit: los desplegables portaleados (`Select`, `Combobox`,
  `MultiSelect`) se abren **desde adentro** de un diálogo, así que tienen que quedar por
  encima de cualquier modal y por debajo del feedback transitorio.

## 8. `font-mono` no se usa para identificadores

- **Kit**: `font-mono` es para **montos en grillas y totales** (`docs/DESIGN.md:345`).
- **Nosotros**: `font-mono` no se usa en ningún lado, y JetBrains Mono **no se descarga**.
  La app es Inter y nada más (`index.css:4`, `index.css:44`).
- **Dónde vive**: `index.css` (sin `@import` de la mono; `--font-mono` apunta a la del sistema
  por si alguna vez hace falta).
- **Por qué**: estaba aplicada en 29 lugares y los 29 eran identificadores —SKU, ID, teléfono,
  código—, ninguno un monto. Era una segunda familia tipográfica bajándose en cada carga para
  contradecir al kit. Si en el futuro aparece una grilla de dinero, `font-mono` vuelve a ser
  la opción correcta **para esa columna**.

## 9. Escala tipográfica verificada por script

- **Kit**: define la escala en `docs/DESIGN.md:332-345`, sin herramienta que la haga cumplir.
- **Nosotros**: `scripts/audit-kit.mjs` falla ante tamaños o pesos fuera de escala, ante
  `font-mono`, y ante variantes de breakpoints inexistentes (`xs:`, `3xl:`)
  (`scripts/audit-kit.mjs:27`, `scripts/audit-kit.mjs:73`).
- **Dónde vive**: `scripts/audit-kit.mjs`. Se corre con `node scripts/audit-kit.mjs`.
- **Por qué**: la app había derivado sola a 14 tamaños y 5 pesos. Los breakpoints inexistentes
  son el caso más traicionero: **no emiten CSS**, así que `hidden xs:inline` oculta el elemento
  en todos los anchos y falla en silencio. Este proyecto es Tailwind 4 sin archivo de config,
  así que `xs` no existe. Única excepción registrada: el hero del login (`text-3xl lg:text-4xl`),
  que el script exceptúa por archivo.

## 10. Capitalización en presentación, nunca en el dato

- **Kit**: no lo trata.
- **Nosotros**: `capitalizeFirst()` en el punto de render (`utils/text.ts:14`), incluido dentro
  de `Select`, `Combobox` y `MultiSelect` para que toda lista de opciones lo herede.
- **Dónde vive**: `utils/text.ts` y los tres primitivos de desplegable.
- **Por qué**: los registros llegan de SharePoint con la mayúscula que puso quien los cargó
  ("sumar test"). **No se puede normalizar el dato**: `pages/Compras.tsx` matchea proveedores
  con igualdad exacta (`p.name === targetData.providerId`), así que reescribirlos rompería la
  búsqueda en silencio. Solo la primera letra: `text-transform: capitalize` capitaliza cada
  palabra ("Zalea De Tela") y bajar el resto destruiría acrónimos ("TRADINGTEXT S.A").

## 11. Un solo lugar resuelve el color de estado

- **Kit**: regla de oro 7 — el color sale del estado canónico, no del texto traducido
  (`docs/DESIGN.md:§3.11`).
- **Nosotros**: `resolveStatus()` traduce el estado crudo de la API a clave canónica + etiqueta,
  y vive **dentro** de `StatusBadge` (`components/ui/StatusBadge.tsx:75`).
- **Dónde vive**: `components/ui/StatusBadge.tsx`. Ninguna página traduce estados por su cuenta.
- **Por qué**: esa traducción vivía privada en `Compras.tsx` y `ViewOrderModal.tsx` tenía una
  **tercera paleta propia**, así que la misma orden salía de un color en la grilla, de otro en
  el modal de detalle y gris en Home. El orden de los alias importa: "Pendiente Ingreso"
  contiene PENDIENTE pero no es una aprobación.

## 12. Safe areas de iOS

- **Kit**: menciona `pb-[env(safe-area-inset-bottom)]` en §5.13 sin exigir el meta tag.
- **Nosotros**: `viewport-fit=cover` en `index.html:6`, y el header fijo de mobile crece con el
  inset superior (`components/Sidebar.tsx:257`).
- **Dónde vive**: `index.html`, `components/Sidebar.tsx`, `App.tsx` (el `mt-` de `<main>` acompaña).
- **Por qué**: sin `viewport-fit=cover` los `env(safe-area-inset-*)` **valen cero** y todo el
  esfuerzo es decorativo. Con él, la página se mete abajo del notch de verdad y el header hay
  que compensarlo.

## 13. Modo oscuro implementado de verdad

- **Kit**: `darkMode: 'class'` en el config, pero **nunca se activa**: ni toggle ni bloque `.dark`,
  y ~22 clases `dark:` sueltas que no hacen nada. El kit deja elegir: (a) implementarlo o
  (b) borrar las clases muertas — "no lo dejes a medias" (`docs/DESIGN.md:394`).
- **Nosotros**: opción (a). Bloque `.dark` en `index.css`, hook `useTheme`, y un switch en el
  sidebar arriba del bloque de usuario.
- **Dónde vive**: `index.css` (tokens + palette), `components/useTheme.ts`, `components/Sidebar.tsx`,
  `index.html` (script inline anti-FOUC).
- **Por qué / cómo**:
  - **Tailwind 4 compila el palette a variables** (`.bg-red-50{background-color:var(--color-red-50)}`),
    así que redefinir el paso dentro de `.dark` voltea los **354 colores literales de la app sin
    tocar una sola `className`**. No hay 354 pares `dark:` que mantener.
  - Solo voltean **50/100/200** (superficies) y **600→900** (texto sobre esas superficies).
    **300/400/500 quedan fijos**: son puntitos, íconos y anillos de foco que se leen sobre
    cualquier fondo, y algunos viven sobre el sidebar de marca, que no sigue al tema.
  - `--brand` (#173F8C, 32% de luminosidad) **se aclara a 62% en oscuro**: como color de texto
    desaparecía sobre el canvas. El texto que va ENCIMA del brand pasa a casi negro
    (`--brand-foreground`), igual que hace shadcn con su `primary` oscuro.
  - El arte de marca es **blanco** y se invierte por CSS para leerse sobre fondo claro. En
    oscuro esa inversión **tiene que levantarse** o el logo se traga con el fondo: por eso es la
    clase `.brand-art-on-surface` y no un `style` inline, que no puede reaccionar al tema.
  - `color-scheme` en `:root`/`.dark` para que el cromo del navegador (scrollbars, controles
    nativos, overscroll) acompañe.
  - El script del `<head>` es **bloqueante e inline a propósito**: aplicado desde React, la
    página pinta un frame en claro y recién ahí voltea — el flash blanco clásico.
- **Verificación**: todos los pares de tokens en oscuro dan ≥4.4:1 y ninguno baja de 3:1;
  `scripts/audit-kit.mjs` falla si se usa un paso de palette que no esté redefinido en `.dark`
  (lee las declaraciones reales del CSS, así que no puede quedar desincronizado).

---

> Si aparece una divergencia nueva respecto del kit, se agrega como un bloque más acá
> (misma estructura: kit → nosotros → dónde → por qué), no editando `docs/DESIGN.md`.
