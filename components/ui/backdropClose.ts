import type { MouseEvent } from 'react';

/**
 * Closes ONLY when both the mousedown and the click land on the overlay itself,
 * so a text selection that starts inside the modal and is released over the
 * backdrop does not close it. It is a FUNCTION, not a hook, so it can be used
 * inside conditional JSX without breaking the rules of hooks.
 * Usage: <div className="fixed inset-0 …" {...backdropClose(onClose)}> … </div>
 */
export function backdropClose(onClose: () => void) {
  let pressedOnBackdrop = false;
  return {
    onMouseDown: (e: MouseEvent) => { pressedOnBackdrop = e.target === e.currentTarget; },
    onClick: (e: MouseEvent) => {
      if (pressedOnBackdrop && e.target === e.currentTarget) onClose();
      pressedOnBackdrop = false;
    },
  };
}
