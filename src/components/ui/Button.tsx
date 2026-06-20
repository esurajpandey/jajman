import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-600',
  secondary: 'bg-secondary text-secondary-fg',
  ghost: 'bg-transparent text-text hover:bg-surface-2',
  outline: 'border border-border text-text hover:bg-surface-2',
};

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex min-h-[44px] h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition active:scale-[0.98] disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
