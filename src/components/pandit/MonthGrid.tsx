import dayjs from 'dayjs';
import { cn } from '../../lib/cn';

export interface DayMark { booking?: boolean; slot?: boolean; leave?: boolean }

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function MonthGrid({
  monthISO,
  selectedISO,
  marks,
  onSelect,
}: {
  monthISO: string;
  selectedISO: string;
  marks: Record<string, DayMark>;
  onSelect: (dateISO: string) => void;
}) {
  const start = dayjs(monthISO).startOf('month');
  const lead = start.day();
  const days = start.daysInMonth();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => start.add(i, 'day').format('YYYY-MM-DD')),
  ];

  return (
    <div>
      <div className="grid grid-cols-7 text-center text-[11px] text-muted">
        {WEEK.map((d, i) => <div key={i} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((iso, i) => {
          if (!iso) return <div key={i} />;
          const m = marks[iso] ?? {};
          const selected = iso === selectedISO;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(iso)}
              className={cn('flex aspect-square flex-col items-center justify-center rounded-md text-sm', selected ? 'bg-primary text-primary-fg' : 'hover:bg-surface-2')}
            >
              <span>{dayjs(iso).date()}</span>
              <span className="mt-0.5 flex gap-0.5">
                {m.booking && <span className={cn('h-1 w-1 rounded-full', selected ? 'bg-primary-fg' : 'bg-secondary')} />}
                {m.slot && <span className={cn('h-1 w-1 rounded-full', selected ? 'bg-primary-fg' : 'bg-primary')} />}
                {m.leave && <span className={cn('h-1 w-1 rounded-full', selected ? 'bg-primary-fg' : 'bg-muted')} />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
