import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RequestCard } from './RequestCard';
import { CountdownChip } from './CountdownChip';
import type { Booking, Puja } from '../../mock/types';

const now = '2026-06-21T09:00:00.000Z';
const req: Booking = {
  id: 'preq-1', panditId: 'pnd-self', pujaId: 'puja-ganesh', type: 'single', status: 'requested',
  pujaStartISO: '2026-06-21T15:00:00.000Z', slotLabel: '21 Jun · 03:00 PM', addressId: 'addr-home',
  attachments: [], notes: '', isEmergency: true,
  charges: { base: 1800, travel: 0, emergencySurcharge: 360, subtotal: 2160 },
  advanceAmount: 648, remainingAmount: 1512, amountPaid: 0,
  createdAt: now, requestExpiresAt: '2026-06-21T13:00:00.000Z', isDisputed: false, jajmanName: 'Anita Kulkarni',
};
const puja: Puja = { id: 'puja-ganesh', categoryId: 'cat-festival', name: 'Ganesh Puja', suggestedDurationMins: 90, minAmount: 800, maxAmount: 3100 };

describe('request components', () => {
  it('RequestCard shows jajman, puja, urgent badge, amount, and fires onClick', () => {
    const onClick = vi.fn();
    render(<RequestCard request={req} puja={puja} onClick={onClick} nowISO={now} />);
    expect(screen.getByText('Anita Kulkarni')).toBeInTheDocument();
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.getByText('₹2160')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Anita Kulkarni'));
    expect(onClick).toHaveBeenCalled();
  });
  it('CountdownChip shows remaining time', () => {
    render(<CountdownChip deadlineISO="2026-06-21T13:00:00.000Z" nowISO={now} />);
    expect(screen.getByText('4h 0m left')).toBeInTheDocument();
  });
});
