/**
 * Sane stacking scale (DESIGN.md §8.2, golden rule 19).
 *
 * The kit's own Toast/Tooltip snippets ship `z-[99999]`/`z-[100000]`, which is
 * the legacy pattern rule 19 tells you not to copy. These are the same relative
 * order at sane values — nav below drawers, drawers below modals, transient
 * feedback on top.
 */
export const Z = {
  nav: 20,
  drawer: 50,
  modal: 60,
  confirm: 70,
  // Portaled dropdowns (Select, Combobox, MultiSelect). Above every dialog,
  // because they are opened from inside one; below the transient feedback.
  popover: 75,
  toast: 80,
  tooltip: 90,
} as const;
