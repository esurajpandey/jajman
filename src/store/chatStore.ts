import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { ChatThread } from '../mock/types';
import { seedThreads } from './../mock/seed';

interface ChatState {
  threads: ChatThread[];
  getThread: (id: string) => ChatThread | undefined;
  getThreadForBooking: (bookingId: string) => ChatThread | undefined;
  ensureThreadForBooking: (bookingId: string, panditId: string) => ChatThread;
  sendMessage: (threadId: string, senderId: string, text: string, attachmentName?: string) => void;
  togglePhoneShared: (threadId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  threads: seedThreads,
  getThread: (id) => get().threads.find((t) => t.id === id),
  getThreadForBooking: (bookingId) => get().threads.find((t) => t.bookingId === bookingId),
  ensureThreadForBooking: (bookingId, panditId) => {
    const existing = get().getThreadForBooking(bookingId);
    if (existing) return existing;
    const thread: ChatThread = { id: `thr-${nanoid(6)}`, bookingId, panditId, phoneShared: false, messages: [] };
    set((s) => ({ threads: [thread, ...s.threads] }));
    return thread;
  },
  sendMessage: (threadId, senderId, text, attachmentName) =>
    set((s) => ({
      threads: s.threads.map((t) =>
        t.id === threadId
          ? { ...t, messages: [...t.messages, { id: `m-${nanoid(6)}`, senderId, text, sentAt: new Date().toISOString(), attachmentName }] }
          : t,
      ),
    })),
  togglePhoneShared: (threadId) =>
    set((s) => ({ threads: s.threads.map((t) => (t.id === threadId ? { ...t, phoneShared: !t.phoneShared } : t)) })),
}));
