import React, { forwardRef, useId } from 'react';
import { cn } from './UIComponents';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
  /** Leading icon inside the field. */
  icon?: React.ElementType;
}

/**
 * Field label shared by Input, Select, Combobox and MultiSelect. It must stay
 * one element: a taller label on any of them pushes that control below its
 * neighbours in a grid.
 */
export const FIELD_LABEL = 'mb-1.5 block text-sm font-medium text-foreground';

/** Leading icon slot, shared by the same four controls. */
export const FIELD_ICON = 'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground';

/**
 * Kit input (DESIGN.md §3.3) plus the optional label/error the app relies on.
 * Errors carry `aria-invalid` + `role="alert"` per golden rule 24.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon: Icon, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const errorId = `${inputId}-error`;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className={FIELD_LABEL}>
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && <Icon className={FIELD_ICON} aria-hidden="true" />}
          <input
            id={inputId}
            ref={ref}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              // h-11 on touch, back to the kit's h-10 from md up (§5.13)
              'flex h-11 md:h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              Icon && 'pl-9',
              error && 'border-destructive focus-visible:ring-destructive',
              className
            )}
            {...props}
          />
        </div>
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
