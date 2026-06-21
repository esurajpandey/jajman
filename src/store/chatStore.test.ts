import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from './chatStore';
import { useUiStore } from './uiStore';

beforeEach(() => useChatStore.setState(useChatStore.getInitialState()));

describe('chatStore', () => {
  it('seeds threads and resolves by id and booking', () => {
    const s = useChatStore.getState();
    expect(s.threads.length).toBeGreaterThan(0);
    expect(s.getThread('thr-1')?.bookingId).toBe('bkg-demo-2');
    expect(s.getThreadForBooking('bkg-demo-1')?.id).toBe('thr-2');
  });

  it('ensureThreadForBooking returns the existing thread or creates one', () => {
    const existing = useChatStore.getState().ensureThreadForBooking('bkg-demo-1', 'pnd-2');
    expect(existing.id).toBe('thr-2');
    const created = useChatStore.getState().ensureThreadForBooking('bkg-new', 'pnd-3');
    expect(created.bookingId).toBe('bkg-new');
    expect(useChatStore.getState().getThread(created.id)).toBeTruthy();
  });

  it('sendMessage appends a message', () => {
    const before = useChatStore.getState().getThread('thr-1')!.messages.length;
    useChatStore.getState().sendMessage('thr-1', 'me', 'See you then!');
    expect(useChatStore.getState().getThread('thr-1')!.messages.length).toBe(before + 1);
    expect(useChatStore.getState().getThread('thr-1')!.messages.at(-1)?.text).toBe('See you then!');
  });

  it('togglePhoneShared flips the flag', () => {
    const before = useChatStore.getState().getThread('thr-1')!.phoneShared;
    useChatStore.getState().togglePhoneShared('thr-1');
    expect(useChatStore.getState().getThread('thr-1')!.phoneShared).toBe(!before);
  });
});

describe('phone-visibility default (P2c wiring)', () => {
  beforeEach(() => {
    useChatStore.setState(useChatStore.getInitialState());
    useUiStore.setState(useUiStore.getInitialState());
  });

  it('new threads inherit uiStore.phoneShareDefault = true', () => {
    useUiStore.getState().setPhoneShareDefault(true);
    const t = useChatStore.getState().ensureThreadForBooking('bkg-new-1', 'pnd-1');
    expect(t.phoneShared).toBe(true);
  });

  it('new threads default to hidden when phoneShareDefault = false', () => {
    const t = useChatStore.getState().ensureThreadForBooking('bkg-new-2', 'pnd-1');
    expect(t.phoneShared).toBe(false);
  });
});
