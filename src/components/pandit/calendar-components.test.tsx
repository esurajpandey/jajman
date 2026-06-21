import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MonthGrid } from './MonthGrid';
import { DayAgenda } from './DayAgenda';
import type { OnboardingSlot } from '../../mock/types';

describe('MonthGrid', () => {
  it('renders the month days and fires onSelect with the clicked date', () => {
    const onSelect = vi.fn();
    render(<MonthGrid monthISO="2026-07-01" selectedISO="2026-07-01" marks={{ '2026-07-10': { leave: true } }} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('15'));
    expect(onSelect).toHaveBeenCalledWith('2026-07-15');
  });
});

describe('DayAgenda', () => {
  const slot: OnboardingSlot = { id: 's1', date: '2026-07-01', start: '09:00', end: '12:00' };
  it('shows open slots and the leave banner', () => {
    render(<DayAgenda bookings={[]} slots={[slot]} onLeave getPujaName={() => 'Puja'} />);
    expect(screen.getByText('09:00–12:00')).toBeInTheDocument();
    expect(screen.getByText('🌴 On leave this day')).toBeInTheDocument();
  });
  it('shows empty state when nothing scheduled', () => {
    render(<DayAgenda bookings={[]} slots={[]} onLeave={false} getPujaName={() => 'Puja'} />);
    expect(screen.getByText('Nothing scheduled.')).toBeInTheDocument();
  });
});
