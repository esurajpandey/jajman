import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LeaveScreen } from './LeaveScreen';
import { usePanditAvailabilityStore } from '../../store/panditAvailabilityStore';
import { seedPanditAvailability } from '../../mock/seed';

beforeEach(() => usePanditAvailabilityStore.setState({ recurring: seedPanditAvailability.recurring, slots: seedPanditAvailability.slots, leaves: seedPanditAvailability.leaves }));

describe('LeaveScreen', () => {
  it('lists the seeded leave and can add a date block', () => {
    render(<MemoryRouter><LeaveScreen /></MemoryRouter>);
    expect(screen.getByText(/2026-07-10/)).toBeInTheDocument();
    const before = usePanditAvailabilityStore.getState().leaves.length;
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-08-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add block' }));
    expect(usePanditAvailabilityStore.getState().leaves.length).toBe(before + 1);
  });
});
