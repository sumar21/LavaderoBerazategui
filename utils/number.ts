/**
 * Coercion for numeric inputs. Nothing in this app — no quantity, no price —
 * may be negative.
 *
 * `min="0"` on the element does NOT enforce that. It only stops the spinner
 * from stepping below zero and marks the field for native form validation,
 * which never runs here: these are controlled inputs and nothing is submitted
 * through a <form>. Typing or pasting "-8" goes straight into state.
 *
 * Clamping in the change handler is what actually holds. When the clamp rejects
 * a keystroke React restores the field from state, so the character never
 * sticks. Keep `min` on the elements anyway — it is what drives the spinner and
 * the mobile keypad.
 */

/** Non-negative amount from an input's raw value. Empty or unparseable → 0. */
export const toAmount = (raw: string): number => Math.max(0, Number(raw) || 0);

/** Non-negative whole count. Things you can hold are never fractional. */
export const toCount = (raw: string): number => Math.floor(toAmount(raw));

/**
 * For fields that keep the raw string in state rather than a number: returns
 * the value unchanged, or the previous one when it would go negative.
 */
export const keepNonNegative = (raw: string, previous: string): string =>
  raw === '' || Number(raw) >= 0 ? raw : previous;
