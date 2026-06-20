import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BookingDetailScreen } from './BookingDetailScreen';
import { PaymentScreen } from './PaymentScreen';
import { useBookingStore } from '../../../store/bookingStore';

beforeEach(() => useBookingStore.setState(useBookingStore.getInitialState()));

function harness(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/booking/:bookingId" element={<BookingDetailScreen />} />
        <Route path="/app/booking/:bookingId/pay/:kind" element={<PaymentScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('payment flow', () => {
  it('accepted booking → pay advance → scheduled with advance recorded', async () => {
    vi.useFakeTimers();
    // create + accept a booking
    const s = useBookingStore.getState();
    s.startDraft('pnd-1');
    s.patchDraft({ pujaId: 'puja-satyanarayan', pujaStartISO: '2026-07-01T09:00:00.000Z', slotLabel: 'x', addressId: 'addr-home' });
    const b = useBookingStore.getState().createBookingFromDraft('2026-06-20T09:00:00.000Z');
    useBookingStore.getState().simulateAccept(b.id);

    harness(`/app/booking/${b.id}/pay/advance`);
    fireEvent.click(screen.getByRole('button', { name: /Pay ₹/ }));
    await act(async () => { vi.runAllTimers(); });
    expect(screen.getByText('Payment successful')).toBeInTheDocument();
    expect(useBookingStore.getState().getBooking(b.id)?.status).toBe('scheduled');
    vi.useRealTimers();
  });

  it('completed demo booking shows pay-remaining CTA', () => {
    harness('/app/booking/bkg-demo-1');
    expect(screen.getByRole('button', { name: /Pay remaining/ })).toBeInTheDocument();
  });
});
