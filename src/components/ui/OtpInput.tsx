import { useRef } from 'react';
import { cn } from '../../lib/cn';

export function OtpInput({
  value,
  onChange,
  length = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const setChar = (i: number, ch: string) => {
    const idx = Math.min(i, value.length); // no gaps: keeps the compact value positionally correct
    const digits = value.split('');
    digits[idx] = ch;
    const next = digits.join('').slice(0, length);
    onChange(next);
    if (ch && idx < length - 1) refs.current[idx + 1]?.focus();
  };

  return (
    <div className="flex justify-between gap-2">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          inputMode="numeric"
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          value={value[i] ?? ''}
          onChange={(e) => setChar(i, e.target.value.replace(/\D/g, '').slice(-1))}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          className={cn(
            'h-12 w-11 rounded-md border border-border bg-surface text-center text-lg font-semibold text-text outline-none focus:border-primary',
          )}
        />
      ))}
    </div>
  );
}
