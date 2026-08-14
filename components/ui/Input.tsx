import React, { forwardRef, useId } from 'react';
import { cn } from './UIComponents';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * Kit input (DESIGN.md §3.3) plus the optional label/error the app relies on.
 * Label styling follows the kit's field-label convention; errors carry
 * `aria-invalid` + `role="alert"` per golden rule 24.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const errorId = `${inputId}-error`;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground mb-1 block">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            // h-11 on touch, back to the kit's h-10 from md up (§5.13)
            'flex h-11 md:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          {...props}
        />
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
