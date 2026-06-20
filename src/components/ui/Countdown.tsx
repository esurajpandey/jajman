import { useEffect, useState } from 'react';
import dayjs from 'dayjs';

export function Countdown({ deadlineISO, nowISO }: { deadlineISO: string; nowISO?: string }) {
  const [now, setNow] = useState(() => (nowISO ? dayjs(nowISO) : dayjs()));
  useEffect(() => {
    if (nowISO) return; // fixed clock (tests) — don't tick
    const t = setInterval(() => setNow(dayjs()), 60000);
    return () => clearInterval(t);
  }, [nowISO]);

  const diffMin = Math.max(0, dayjs(deadlineISO).diff(now, 'minute'));
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  const expired = diffMin <= 0;
  return (
    <span className={expired ? 'text-error' : 'text-text'}>
      {expired ? 'Expired' : `${h}h ${m}m left`}
    </span>
  );
}
