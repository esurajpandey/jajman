import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusPill } from '../ui/StatusPill';
import { RefundBreakdown } from '../ui/RefundBreakdown';
import { RatingInput } from '../ui/RatingInput';
import { BookingCard } from './BookingCard';
import { seedBookings } from '../../mock/seed';

describe('lifecycle components', () => {
  it('StatusPill labels a status', () => {
    render(<StatusPill status="scheduled" />);
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  });
  it('RefundBreakdown shows amount paid, cut, and refund', () => {
    render(<RefundBreakdown amountPaid={288} platformCut={14} refundAmount={274} />);
    expect(screen.getByText('Amount paid')).toBeInTheDocument();
    expect(screen.getByText('−₹14')).toBeInTheDocument();
    expect(screen.getByText('₹274')).toBeInTheDocument();
  });
  it('RatingInput reports the chosen star', () => {
    const onChange = vi.fn();
    render(<RatingInput value={0} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '4 stars' }));
    expect(onChange).toHaveBeenCalledWith(4);
  });
  it('BookingCard shows puja, pandit, and status', () => {
    render(<BookingCard booking={seedBookings[0]} />);
    expect(screen.getByText('Ganesh Puja')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
});
