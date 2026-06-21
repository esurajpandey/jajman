import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';
import { useSessionStore, MOCK_OTP } from '../store/sessionStore';
import { usePanditOnboardingStore } from '../store/panditOnboardingStore';
import { useDataStore } from '../store/dataStore';
import { seedCategories, seedPujas, seedPandits, seedReviews } from '../mock/seed';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  usePanditOnboardingStore.setState(usePanditOnboardingStore.getInitialState());
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
  useSessionStore.getState().setPendingPhone('9999999999');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
});

describe('pandit onboarding flow (integration)', () => {
  it('intro → submit (prefilled draft) → pending → simulate approval → dashboard', () => {
    // prefill the draft so we can jump to the review step
    const s = usePanditOnboardingStore.getState();
    s.patchProfile({ name: 'Pandit Test', about: 'Experienced vedic scholar', languages: ['Hindi'], specializations: ['Katha'], city: 'Pune' });
    s.addSupportedPuja({ pujaId: 'puja-ganesh', charge: 900, durationMins: 90 });

    const router = createMemoryRouter(routes, { initialEntries: ['/pandit/onboarding/submit'] });
    render(<RouterProvider router={router} />);

    fireEvent.click(screen.getByLabelText('Information is accurate'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit for approval' }));
    expect(screen.getByText('Pending admin approval')).toBeInTheDocument();
    expect(useSessionStore.getState().panditStatus).toBe('pending');
    expect(useSessionStore.getState().user?.roles).toContain('pandit');

    fireEvent.click(screen.getByRole('button', { name: 'Simulate approval' }));
    expect(screen.getByText(/Namaste/)).toBeInTheDocument();
    expect(useSessionStore.getState().panditStatus).toBe('approved');
  });
});
