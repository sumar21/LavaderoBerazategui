/**
 * Coercion for numeric inputs. Nothing in this app — no quantity, no price —
 * may be negative, and no unit price may exceed MAX_UNIT_PRICE.
 *
 * `min`/`max` on the element do NOT enforce that. They only bound the spinner's
 * steps and mark the field for native form validation, which never runs here:
 * these are controlled inputs and nothing is submitted through a <form>. Typing
 * or pasting "-8" goes straight into state.
 *
 * Clamping in the change handler is what actually holds. When the clamp rejects
 * a keystroke React restores the field from state, so the character never
 * sticks and the field visibly refuses to grow past the ceiling. Keep `min` and
 * `max` on the elements anyway — they drive the spinner and the mobile keypad.
 */

/**
 * Ceiling for any unit price, in ARS. Set with the business: nothing this
 * operation buys costs this much, so a larger figure is a typo or a test.
 */
export const MAX_UNIT_PRICE = 999_999_999;

/** Non-negative amount from an input's raw value. Empty or unparseable → 0. */
const toAmount = (raw: string): number => Math.max(0, Number(raw) || 0);

/** Non-negative whole count. Things you can hold are never fractional. */
export const toCount = (raw: string): number => Math.floor(toAmount(raw));

/** A unit price: non-negative and capped at MAX_UNIT_PRICE. */
export const toPrice = (raw: string): number => Math.min(MAX_UNIT_PRICE, toAmount(raw));

/**
 * For price fields that keep the raw string in state rather than a number:
 * returns the value unchanged, or the previous one when it would fall outside
 * the allowed range. Rejecting rather than clamping keeps the digits the user
 * typed intact instead of silently rewriting them.
 */
export const keepPriceText = (raw: string, previous: string): string => {
  if (raw === '') return raw;
  const n = Number(raw);
  return n >= 0 && n <= MAX_UNIT_PRICE ? raw : previous;
};
