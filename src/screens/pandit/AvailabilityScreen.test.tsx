import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AvailabilityScreen } from './AvailabilityScreen';
import { usePanditAvailabilityStore } from '../../store/panditAvailabilityStore';
import { useSessionStore } from '../../store/sessionStore';
import { seedPanditAvailability } from '../../mock/seed';

beforeEach(() => {
  usePanditAvailabilityStore.setState({ recurring: seedPanditAvailability.recurring, slots: seedPanditAvailability.slots, leaves: seedPanditAvailability.leaves });
  useSessionStore.setState(useSessionStore.getInitialState());
});

describe('AvailabilityScreen', () => {
  it('toggles a recurring weekday in the store', () => {
    render(<MemoryRouter><AvailabilityScreen /></MemoryRouter>);
    fireEvent.click(screen.getByRole('switch', { name: 'Tue' }));
    expect(usePanditAvailabilityStore.getState().recurring.some((r) => r.weekday === 2)).toBe(true);
  });
  it('shows an overlap error when adding a conflicting specific slot', () => {
    render(<MemoryRouter><AvailabilityScreen /></MemoryRouter>);
    fireEvent.click(screen.getByRole('tab', { name: 'Specific dates' }));
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-06-28' } });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '11:00' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '14:00' } }); // overlaps av-1 10:00-13:00
    fireEvent.click(screen.getByRole('button', { name: '+ Add slot' }));
    expect(screen.getByText(/overlaps an existing slot/)).toBeInTheDocument();
  });
});
