import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnbAvailabilityScreen } from './OnbAvailabilityScreen';
import { usePanditOnboardingStore } from '../../../store/panditOnboardingStore';

beforeEach(() => usePanditOnboardingStore.setState(usePanditOnboardingStore.getInitialState()));

describe('OnbAvailabilityScreen', () => {
  it('toggles a recurring weekday into the draft', () => {
    render(<MemoryRouter><OnbAvailabilityScreen /></MemoryRouter>);
    fireEvent.click(screen.getByRole('switch', { name: 'Mon' }));
    expect(usePanditOnboardingStore.getState().draft.availability.recurring.some((r) => r.weekday === 1)).toBe(true);
  });
});
