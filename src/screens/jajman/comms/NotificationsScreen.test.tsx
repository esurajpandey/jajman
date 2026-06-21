import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationsScreen } from './NotificationsScreen';
import { useNotificationStore } from '../../../store/notificationStore';
import { seedNotifications } from '../../../mock/seed';

beforeEach(() => useNotificationStore.setState({ notifications: seedNotifications }));

describe('NotificationsScreen', () => {
  it('lists notifications and clears unread on Mark all read', () => {
    render(<MemoryRouter><NotificationsScreen /></MemoryRouter>);
    expect(screen.getByText('Booking accepted')).toBeInTheDocument();
    expect(useNotificationStore.getState().unreadCount()).toBe(2);
    fireEvent.click(screen.getByText('Mark all read'));
    expect(useNotificationStore.getState().unreadCount()).toBe(0);
  });
});
