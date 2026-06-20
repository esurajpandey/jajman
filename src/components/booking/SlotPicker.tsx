import dayjs from 'dayjs';
import { Chip } from '../ui/Chip';

const TIMES = ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM', '06:00 PM'];

export function SlotPicker({
  baseDateISO,
  selectedISO,
  onSelect,
}: {
  baseDateISO: string; // a fixed "today" for deterministic rendering/tests
  selectedISO: string | null;
  onSelect: (iso: string, label: string) => void;
}) {
  const base = dayjs(baseDateISO);
  const days = Array.from({ length: 7 }, (_, i) => base.add(i, 'day'));

  const pick = (day: dayjs.Dayjs, time: string) => {
    const [hm, ap] = time.split(' ');
    let [hh, mm] = hm.split(':').map(Number);
    if (ap === 'PM' && hh !== 12) hh += 12;
    if (ap === 'AM' && hh === 12) hh = 0;
    const iso = day.hour(hh).minute(mm).second(0).millisecond(0).toISOString();
    onSelect(iso, `${day.format('D MMM')} · ${time}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold">Date</h3>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {days.map((d) => {
            const active = selectedISO != null && dayjs(selectedISO).isSame(d, 'day');
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => pick(d, TIMES[0])}
                className={`flex w-14 shrink-0 flex-col items-center rounded-md border px-2 py-2 ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}
              >
                <span className="text-[10px] uppercase text-muted">{d.format('ddd')}</span>
                <span className="text-base font-semibold">{d.format('D')}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold">Time</h3>
        <div className="flex flex-wrap gap-2">
          {TIMES.map((t) => {
            const day = selectedISO ? dayjs(selectedISO) : days[0];
            const active = selectedISO != null && dayjs(selectedISO).format('hh:mm A') === t;
            return <Chip key={t} label={t} selected={active} onClick={() => pick(day, t)} />;
          })}
        </div>
      </div>
    </div>
  );
}
