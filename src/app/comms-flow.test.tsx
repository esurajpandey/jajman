import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';
import { useSessionStore, MOCK_OTP } from '../store/sessionStore';
import { useNotificationStore } from '../store/notificationStore';
import { useDisputeStore } from '../store/disputeStore';
import { seedNotifications } from '../mock/seed';
import { seedDisputes } from '../mock/seed';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useNotificationStore.setState({ notifications: seedNotifications });
  useDisputeStore.setState({ disputes: seedDisputes });
  useSessionStore.getState().setPendingPhone('9999999999');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
});

describe('comms flow (integration)', () => {
  it('Profile → Disputes shows the seeded disputes', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/profile'] });
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByText('Disputes'));
    expect(screen.getByText('Puja incomplete')).toBeInTheDocument();
  });

  it('Notifications center marks all read', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/notifications'] });
    render(<RouterProvider router={router} />);
    expect(useNotificationStore.getState().unreadCount()).toBe(2);
    fireEvent.click(screen.getByText('Mark all read'));
    expect(useNotificationStore.getState().unreadCount()).toBe(0);
  });

  it('Profile → Referral shows the code', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/profile'] });
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByText('Referral'));
    expect(screen.getByText('SURAJ2026')).toBeInTheDocument();
  });
});
