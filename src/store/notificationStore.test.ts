import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore } from './notificationStore';
import { seedNotifications } from '../mock/seed';

beforeEach(() => useNotificationStore.setState({ notifications: seedNotifications }));

describe('notificationStore', () => {
  it('unreadCount counts unread notifications', () => {
    expect(useNotificationStore.getState().unreadCount()).toBe(2);
  });
  it('markRead marks one read', () => {
    useNotificationStore.getState().markRead('ntf-1');
    expect(useNotificationStore.getState().unreadCount()).toBe(1);
  });
  it('markAllRead clears the unread count', () => {
    useNotificationStore.getState().markAllRead();
    expect(useNotificationStore.getState().unreadCount()).toBe(0);
  });
  it('getNotifications returns newest first', () => {
    const list = useNotificationStore.getState().getNotifications();
    expect(list[0].createdAt >= list[list.length - 1].createdAt).toBe(true);
  });
});
