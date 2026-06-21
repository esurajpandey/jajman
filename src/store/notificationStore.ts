import { create } from 'zustand';
import type { AppNotification } from '../mock/types';
import { seedNotifications } from '../mock/seed';

interface NotificationState {
  notifications: AppNotification[];
  getNotifications: () => AppNotification[];
  unreadCount: () => number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: seedNotifications,
  getNotifications: () => [...get().notifications].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,
  markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
  markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
}));
