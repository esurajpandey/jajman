import type { BookingCharges } from '../../mock/types';

function Row({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1 text-sm ${strong ? 'font-semibold' : ''} ${accent ? 'text-primary' : ''}`}>
      <span className={strong || accent ? '' : 'text-muted'}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function MoneyBreakdown({
  charges,
  advance,
  remaining,
  highlightAdvance = true,
}: {
  charges: BookingCharges;
  advance: number;
  remaining: number;
  highlightAdvance?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <Row label="Puja charge" value={`₹${charges.base}`} />
      <Row label="Travel (estimate)" value={`₹${charges.travel}`} />
      {charges.emergencySurcharge > 0 && <Row label="Urgent surcharge" value={`₹${charges.emergencySurcharge}`} />}
      <div className="my-1 border-t border-border" />
      <Row label="Total" value={`₹${charges.subtotal}`} strong />
      <Row label="Advance now (est.)" value={`₹${advance}`} accent={highlightAdvance} />
      <Row label="Remaining after puja" value={`₹${remaining}`} />
    </div>
  );
}
