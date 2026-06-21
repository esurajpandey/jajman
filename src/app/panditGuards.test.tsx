import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';
import { useSessionStore, MOCK_OTP } from '../store/sessionStore';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useSessionStore.getState().setPendingPhone('9999999999');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
  useSessionStore.getState().becomePandit(); // roles += pandit, status pending
  useSessionStore.getState().switchMode('pandit');
});

describe('pandit gating (§0.6)', () => {
  it('pending pandit visiting the dashboard is redirected to pending-approval', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/pandit/dashboard'] });
    render(<RouterProvider router={router} />);
    expect(screen.getByText('Pending admin approval')).toBeInTheDocument();
  });

  it('approved pandit reaches the dashboard', () => {
    useSessionStore.getState().setPanditStatus('approved');
    const router = createMemoryRouter(routes, { initialEntries: ['/pandit/dashboard'] });
    render(<RouterProvider router={router} />);
    expect(screen.getByText(/Namaste/)).toBeInTheDocument();
  });
});
