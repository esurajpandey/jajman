import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';
export type Language = 'en' | 'hi' | 'sa';
export type Connectivity = 'online' | 'offline';

interface UiState {
  theme: ThemeMode;
  language: Language;
  connectivitySim: Connectivity;
  toggleTheme: () => void;
  setTheme: (t: ThemeMode) => void;
  setLanguage: (l: Language) => void;
  setConnectivity: (c: Connectivity) => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: 'light',
  language: 'en',
  connectivitySim: 'online',
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),
  setConnectivity: (connectivitySim) => set({ connectivitySim }),
}));
