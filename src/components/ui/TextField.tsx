import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leading?: ReactNode;
}

export function TextField({ label, hint, error, leading, className, id, ...props }: TextFieldProps) {
  const inputId = id ?? props.name ?? label;
  return (
    <label htmlFor={inputId} className="block">
      {label && <span className="mb-1 block text-sm font-medium text-text">{label}</span>}
      <span
        className={cn(
          'flex h-12 items-center gap-2 rounded-md border bg-surface px-3',
          error ? 'border-error' : 'border-border focus-within:border-primary',
        )}
      >
        {leading && <span className="text-muted">{leading}</span>}
        <input
          id={inputId}
          className={cn('h-full w-full bg-transparent text-text outline-none placeholder:text-muted', className)}
          {...props}
        />
      </span>
      {error ? (
        <span className="mt-1 block text-xs text-error">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}
