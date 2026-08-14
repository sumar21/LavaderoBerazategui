/**
 * Uppercase the first letter for display.
 *
 * Presentation only — never store the result. Records arrive from SharePoint
 * with whatever casing whoever loaded them used ("sumar test"), and several
 * lookups still compare those strings exactly: Compras matches a provider with
 * `p.name === targetData.providerId`, so rewriting the data would silently stop
 * finding it.
 *
 * Only the first character is touched. `text-transform: capitalize` would
 * uppercase every word ("Zalea De Tela"), and lowercasing the rest would wreck
 * the acronyms these names are full of ("TRADINGTEXT S.A").
 */
export const capitalizeFirst = (value?: string | null): string => {
  const s = String(value ?? '');
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
};
