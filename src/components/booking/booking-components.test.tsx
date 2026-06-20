import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MoneyBreakdown } from '../ui/MoneyBreakdown';
import { StatusStepper } from '../ui/StatusStepper';
import { Countdown } from '../ui/Countdown';
import { SlotPicker } from './SlotPicker';

describe('booking components', () => {
  it('MoneyBreakdown shows charges, advance, and the surcharge only when present', () => {
    const { rerender } = render(
      <MoneyBreakdown charges={{ base: 1000, travel: 200, emergencySurcharge: 0, subtotal: 1200 }} advance={360} remaining={840} />,
    );
    expect(screen.getByText('₹1200')).toBeInTheDocument();
    expect(screen.queryByText('Urgent surcharge')).not.toBeInTheDocument();
    rerender(<MoneyBreakdown charges={{ base: 1000, travel: 200, emergencySurcharge: 200, subtotal: 1400 }} advance={420} remaining={980} />);
    expect(screen.getByText('Urgent surcharge')).toBeInTheDocument();
  });

  it('StatusStepper marks steps up to the current status', () => {
    render(<StatusStepper status="advance_paid" />);
    expect(screen.getByText('Requested')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('Countdown shows time left for a future deadline and Expired for a past one', () => {
    const now = '2026-06-20T09:00:00.000Z';
    render(<Countdown deadlineISO="2026-06-21T09:00:00.000Z" nowISO={now} />);
    expect(screen.getByText('24h 0m left')).toBeInTheDocument();
  });

  it('SlotPicker emits an ISO + label when a time is chosen', () => {
    const onSelect = vi.fn();
    render(<SlotPicker baseDateISO="2026-06-20T00:00:00.000Z" selectedISO={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: '11:00 AM' }));
    expect(onSelect).toHaveBeenCalled();
    expect(onSelect.mock.calls[0][1]).toMatch(/11:00 AM/);
  });
});
