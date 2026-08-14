import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './UIComponents';

/**
 * Kit variants are `default | destructive | outline | secondary | ghost | link`
 * and sizes `default | sm | lg | icon` (DESIGN.md §3.2). The app was written
 * against an older API, so `primary`/`danger`/`md` are kept as aliases instead
 * of rewriting every call site.
 */
type KitVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type KitSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: KitVariant | 'primary' | 'danger';
  size?: KitSize | 'md';
  isLoading?: boolean;
}

const VARIANT_ALIASES: Record<string, KitVariant> = { primary: 'default', danger: 'destructive' };
const SIZE_ALIASES: Record<string, KitSize> = { md: 'default' };

/**
 * OVERRIDE: the kit's default button is `primary` (near-black). With a
 * brand-coloured shell a black CTA reads as disconnected, so the primary action
 * carries the brand. See docs/design-overrides.md.
 */
const VARIANTS: Record<KitVariant, string> = {
  default: 'bg-brand text-brand-foreground shadow-sm hover:bg-brand/90 active:scale-[0.98]',
  destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98]',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-brand underline-offset-4 hover:underline',
};

// Primary controls sit at 44px on touch screens (§5.13) and settle back to the
// kit's 40px from `md` up, where a pointer makes the extra height unnecessary.
const SIZES: Record<KitSize, string> = {
  default: 'h-11 px-4 py-2 md:h-10',
  sm: 'h-9 rounded-md px-3',
  lg: 'h-12 rounded-md px-8 md:h-11',
  icon: 'h-11 w-11 md:h-10 md:w-10',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', isLoading = false, disabled, children, ...props }, ref) => {
    const v = VARIANT_ALIASES[variant] ?? (variant as KitVariant);
    const s = SIZE_ALIASES[size] ?? (size as KitSize);
    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          VARIANTS[v], SIZES[s], className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
