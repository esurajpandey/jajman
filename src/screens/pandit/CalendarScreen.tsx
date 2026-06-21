import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import dayjs from 'dayjs';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppBar } from '../../components/ui/AppBar';
import { Button } from '../../components/ui/Button';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { MonthGrid, type DayMark } from '../../components/pandit/MonthGrid';
import { CalendarLegend } from '../../components/pandit/CalendarLegend';
import { DayAgenda } from '../../components/pandit/DayAgenda';
import { usePanditAvailabilityStore } from '../../store/panditAvailabilityStore';
import { usePanditBookingStore } from '../../store/panditBookingStore';
import { useDataStore } from '../../store/dataStore';

type View = 'month' | 'day';

export function CalendarScreen() {
  const navigate = useNavigate();
  const todayISO = dayjs(new Date()).format('YYYY-MM-DD');
  const [view, setView] = useState<View>('month');
  const [month, setMonth] = useState(() => dayjs(new Date()).format('YYYY-MM-01'));
  const [selected, setSelected] = useState(todayISO);
  const [addOpen, setAddOpen] = useState(false);

  const bookings = usePanditBookingStore(useShallow((s) => s.bookings));
  const slotsStore = usePanditAvailabilityStore(useShallow((s) => s.slots));
  const leavesStore = usePanditAvailabilityStore(useShallow((s) => s.leaves));
  const getSlotsForDate = usePanditAvailabilityStore((s) => s.getSlotsForDate);
  const isOnLeave = usePanditAvailabilityStore((s) => s.isOnLeave);
  const getPuja = useDataStore((s) => s.getPuja);

  // marks for the visible month
  const marks: Record<string, DayMark> = {};
  const mark = (iso: string, key: keyof DayMark) => { (marks[iso] ??= {})[key] = true; };
  bookings.forEach((b) => mark(dayjs(b.pujaStartISO).format('YYYY-MM-DD'), 'booking'));
  slotsStore.forEach((s) => mark(s.date, 'slot'));
  leavesStore.forEach((l) => {
    let d = dayjs(l.fromDate); const end = dayjs(l.toDate ?? l.fromDate);
    while (d.isSame(end, 'day') || d.isBefore(end, 'day')) { mark(d.format('YYYY-MM-DD'), 'leave'); d = d.add(1, 'day'); }
  });

  const dayBookings = bookings.filter((b) => dayjs(b.pujaStartISO).format('YYYY-MM-DD') === selected);
  const daySlots = getSlotsForDate(selected);

  return (
    <>
      <AppBar
        title="Calendar"
        right={<button type="button" aria-label="Add" onClick={() => setAddOpen(true)} className="p-2 text-primary"><Plus size={20} /></button>}
      />
      <div className="flex-1 overflow-y-auto p-4">
        <SegmentedControl<View> segments={[{ value: 'month', label: 'Month' }, { value: 'day', label: 'Day' }]} value={view} onChange={setView} />

        {view === 'month' && (
          <>
            <div className="mt-3 flex items-center justify-between">
              <button type="button" aria-label="Previous month" onClick={() => setMonth(dayjs(month).subtract(1, 'month').format('YYYY-MM-01'))}><ChevronLeft size={20} /></button>
              <span className="text-sm font-medium">{dayjs(month).format('MMMM YYYY')}</span>
              <button type="button" aria-label="Next month" onClick={() => setMonth(dayjs(month).add(1, 'month').format('YYYY-MM-01'))}><ChevronRight size={20} /></button>
            </div>
            <div className="mt-2"><MonthGrid monthISO={month} selectedISO={selected} marks={marks} onSelect={setSelected} /></div>
            <CalendarLegend />
          </>
        )}

        <h2 className="mb-1 mt-3 text-sm font-semibold">{dayjs(selected).format('ddd, D MMM')}</h2>
        <DayAgenda
          bookings={dayBookings}
          slots={daySlots}
          onLeave={isOnLeave(selected)}
          getPujaName={(id) => getPuja(id)?.name ?? 'Puja'}
        />
      </div>

      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="Add to calendar">
        <div className="flex flex-col gap-2">
          <Button onClick={() => { setAddOpen(false); navigate('/pandit/calendar/availability'); }}>Manage availability</Button>
          <Button variant="outline" onClick={() => { setAddOpen(false); navigate('/pandit/calendar/leave'); }}>Add leave / block</Button>
        </div>
      </BottomSheet>
    </>
  );
}
