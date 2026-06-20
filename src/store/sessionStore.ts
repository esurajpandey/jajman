import { create } from 'zustand';
import { nanoid } from 'nanoid';

export type Role = 'jajman' | 'pandit' | 'admin';
export type PanditStatus = 'none' | 'pending' | 'approved' | 'rejected';

/** Mock OTP — any login uses this fixed code (no real SMS in the prototype). */
export const MOCK_OTP = '123456';

export interface SessionUser {
  id: string;
  name: string;
  phone: string;
  roles: Role[];
  profileComplete: boolean;
}

interface SessionState {
  authed: boolean;
  user: SessionUser | null;
  activeRole: Exclude<Role, 'admin'> | 'admin';
  isAdmin: boolean;
  panditStatus: PanditStatus;
  pendingPhone: string | null;
  pendingName: string | null; // set during register before OTP
  setPendingPhone: (phone: string | null) => void;
  setPendingName: (name: string | null) => void;
  verifyOtp: (code: string) => boolean;
  loginWithPassword: (phone: string, password: string) => boolean;
  loginAdmin: () => void;
  becomePandit: () => void;
  switchMode: (role: 'jajman' | 'pandit') => void;
  completeProfile: (patch?: Partial<SessionUser>) => void;
  logout: () => void;
}

function makeUser(phone: string, name: string): SessionUser {
  return { id: nanoid(8), name: name || 'Devotee', phone, roles: ['jajman'], profileComplete: false };
}

export const useSessionStore = create<SessionState>((set, get) => ({
  authed: false,
  user: null,
  activeRole: 'jajman',
  isAdmin: false,
  panditStatus: 'none',
  pendingPhone: null,
  pendingName: null,

  setPendingPhone: (pendingPhone) => set({ pendingPhone }),
  setPendingName: (pendingName) => set({ pendingName }),

  verifyOtp: (code) => {
    if (code !== MOCK_OTP) return false;
    const phone = get().pendingPhone ?? '0000000000';
    const name = get().pendingName ?? 'Devotee';
    set({
      authed: true,
      user: makeUser(phone, name),
      activeRole: 'jajman',
      isAdmin: false,
      pendingPhone: null,
      pendingName: null,
    });
    return true;
  },

  loginWithPassword: (phone, password) => {
    if (!phone || password.length < 4) return false;
    set({ authed: true, user: makeUser(phone, 'Devotee'), activeRole: 'jajman', isAdmin: false });
    return true;
  },

  loginAdmin: () =>
    set({
      authed: true,
      user: { id: 'admin', name: 'Administrator', phone: '', roles: ['admin'], profileComplete: true },
      activeRole: 'admin',
      isAdmin: true,
    }),

  becomePandit: () =>
    set((s) => ({
      panditStatus: 'pending',
      user: s.user ? { ...s.user, roles: Array.from(new Set([...s.user.roles, 'pandit' as Role])) } : s.user,
    })),

  switchMode: (role) => set({ activeRole: role }),

  completeProfile: (patch) =>
    set((s) => ({ user: s.user ? { ...s.user, ...patch, profileComplete: true } : s.user })),

  logout: () =>
    set({
      authed: false,
      user: null,
      activeRole: 'jajman',
      isAdmin: false,
      panditStatus: 'none',
      pendingPhone: null,
      pendingName: null,
    }),
}));
