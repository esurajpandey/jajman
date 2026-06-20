import { cn } from '../../lib/cn';

export interface Segment<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: {
  segments: Segment<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" className="flex rounded-md bg-surface-2 p-1">
      {segments.map((s) => (
        <button
          key={s.value}
          role="tab"
          type="button"
          aria-selected={value === s.value}
          onClick={() => onChange(s.value)}
          className={cn(
            'flex-1 rounded-[8px] py-2 text-sm font-medium transition',
            value === s.value ? 'bg-surface text-text shadow-card' : 'text-muted',
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
