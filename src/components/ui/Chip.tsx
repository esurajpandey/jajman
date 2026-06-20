import { cn } from '../../lib/cn';

export function Chip({
  label,
  selected = false,
  onClick,
}: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-sm transition',
        selected ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-text',
      )}
    >
      {label}
    </button>
  );
}
