import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore, MOCK_OTP } from './sessionStore';
import { defaultNotificationPrefs } from './sessionStore';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
});

describe('sessionStore', () => {
  it('starts unauthenticated as a guest jajman', () => {
    const s = useSessionStore.getState();
    expect(s.authed).toBe(false);
    expect(s.user).toBeNull();
    expect(s.activeRole).toBe('jajman');
  });

  it('verifyOtp succeeds with the mock code and authenticates a jajman', () => {
    const s = useSessionStore.getState();
    s.setPendingPhone('9876543210');
    const ok = useSessionStore.getState().verifyOtp(MOCK_OTP);
    expect(ok).toBe(true);
    const after = useSessionStore.getState();
    expect(after.authed).toBe(true);
    expect(after.user?.phone).toBe('9876543210');
    expect(after.user?.roles).toContain('jajman');
  });

  it('verifyOtp fails with a wrong code and stays unauthenticated', () => {
    useSessionStore.getState().setPendingPhone('9876543210');
    expect(useSessionStore.getState().verifyOtp('000000')).toBe(false);
    expect(useSessionStore.getState().authed).toBe(false);
  });

  it('loginAdmin authenticates with admin role + isAdmin', () => {
    useSessionStore.getState().loginAdmin();
    const s = useSessionStore.getState();
    expect(s.authed).toBe(true);
    expect(s.isAdmin).toBe(true);
    expect(s.activeRole).toBe('admin');
  });

  it('becomePandit adds the pandit role with pending status and switchMode works', () => {
    useSessionStore.getState().setPendingPhone('9876543210');
    useSessionStore.getState().verifyOtp(MOCK_OTP);
    useSessionStore.getState().becomePandit();
    expect(useSessionStore.getState().user?.roles).toContain('pandit');
    expect(useSessionStore.getState().panditStatus).toBe('pending');
    useSessionStore.getState().switchMode('pandit');
    expect(useSessionStore.getState().activeRole).toBe('pandit');
  });

  it('logout resets to guest', () => {
    useSessionStore.getState().loginAdmin();
    useSessionStore.getState().logout();
    expect(useSessionStore.getState().authed).toBe(false);
    expect(useSessionStore.getState().isAdmin).toBe(false);
  });
});

describe('profile + notification prefs (P2b)', () => {
  beforeEach(() => {
    useSessionStore.setState(useSessionStore.getInitialState());
    useSessionStore.getState().setPendingPhone('9999999999');
    useSessionStore.getState().verifyOtp('123456');
  });

  it('updateProfile merges fields without clearing the session', () => {
    useSessionStore.getState().updateProfile({ name: 'Ravi', email: 'ravi@example.com' });
    expect(useSessionStore.getState().user?.name).toBe('Ravi');
    expect(useSessionStore.getState().user?.email).toBe('ravi@example.com');
    expect(useSessionStore.getState().authed).toBe(true);
  });

  it('setNotificationPref toggles a single preference', () => {
    expect(useSessionStore.getState().notificationPrefs.promotions).toBe(defaultNotificationPrefs.promotions);
    useSessionStore.getState().setNotificationPref('promotions', true);
    expect(useSessionStore.getState().notificationPrefs.promotions).toBe(true);
  });
});

describe('setPanditStatus (P3a)', () => {
  beforeEach(() => {
    useSessionStore.setState(useSessionStore.getInitialState());
    useSessionStore.getState().setPendingPhone('9999999999');
    useSessionStore.getState().verifyOtp('123456');
  });
  it('updates panditStatus', () => {
    useSessionStore.getState().setPanditStatus('approved');
    expect(useSessionStore.getState().panditStatus).toBe('approved');
  });
});
