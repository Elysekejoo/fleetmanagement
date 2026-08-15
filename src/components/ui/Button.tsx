import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'navy' | 'outline' | 'success' | 'danger' | 'ghost' | 'gold';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-blue text-white border-blue hover:bg-blue-md',
  navy: 'bg-navy text-white border-navy hover:bg-navy-2',
  gold: 'bg-gold text-navy border-gold hover:bg-gold-light',
  outline: 'bg-white text-ink-2 border-line-dark hover:bg-bg-2 hover:text-ink',
  success: 'bg-ok text-white border-ok hover:bg-ok/90',
  danger: 'bg-danger text-white border-danger hover:bg-danger/90',
  ghost: 'bg-transparent text-ink-3 border-transparent hover:bg-bg-2 hover:text-ink',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-9 px-4 text-[13px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg border font-semibold transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue',
        'disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';