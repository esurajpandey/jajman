export function CalendarLegend() {
  const item = (color: string, label: string) => (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      <span className={`h-2 w-2 rounded-full ${color}`} />{label}
    </span>
  );
  return (
    <div className="flex flex-wrap gap-3 px-1 py-2">
      {item('bg-secondary', 'Booking')}
      {item('bg-primary', 'Open slot')}
      {item('bg-muted', 'Leave')}
    </div>
  );
}
