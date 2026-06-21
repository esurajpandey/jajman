import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';
export type Language = 'en' | 'hi' | 'sa';
export type Connectivity = 'online' | 'offline';

interface UiState {
  theme: ThemeMode;
  language: Language;
  languageChosen: boolean;
  connectivitySim: Connectivity;
  phoneShareDefault: boolean;
  toggleTheme: () => void;
  setTheme: (t: ThemeMode) => void;
  setLanguage: (l: Language) => void;
  chooseLanguage: (l: Language) => void;
  setConnectivity: (c: Connectivity) => void;
  setPhoneShareDefault: (b: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: 'light',
  language: 'en',
  languageChosen: false,
  connectivitySim: 'online',
  phoneShareDefault: false,
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),
  chooseLanguage: (language) => set({ language, languageChosen: true }),
  setConnectivity: (connectivitySim) => set({ connectivitySim }),
  setPhoneShareDefault: (phoneShareDefault) => set({ phoneShareDefault }),
}));
