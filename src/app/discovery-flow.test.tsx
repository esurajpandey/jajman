import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';
import { useSessionStore, MOCK_OTP } from '../store/sessionStore';
import { useDiscoveryStore, emptyFilters } from '../store/discoveryStore';
import { useDataStore } from '../store/dataStore';
import { seedCategories, seedPujas, seedPandits, seedReviews } from '../mock/seed';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useDiscoveryStore.setState({ query: '', filters: { ...emptyFilters }, sort: 'relevance' });
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
  // authenticate directly
  useSessionStore.getState().setPendingPhone('9876543210');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
});

describe('discovery flow', () => {
  it('Home → Explore → open a pandit detail → see reviews', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/home'] });
    render(<RouterProvider router={router} />);

    // Home shows featured; tap the first pandit card
    fireEvent.click(await screen.findByText('Pandit Ramesh Sharma'));

    // Pandit detail
    expect(await screen.findByText('About')).toBeInTheDocument();
    expect(screen.getByText('Pujas offered')).toBeInTheDocument();

    // Go to all reviews
    fireEvent.click(screen.getByText(/See all .* reviews/));
    expect(await screen.findByText('Reviews')).toBeInTheDocument();
  });

  it('favorite toggle on detail flips the store flag', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/pandit/pnd-2'] });
    render(<RouterProvider router={router} />);
    const before = useDataStore.getState().getPandit('pnd-2')!.favorite;
    fireEvent.click(await screen.findByLabelText('Toggle favorite'));
    expect(useDataStore.getState().getPandit('pnd-2')!.favorite).toBe(!before);
  });
});
