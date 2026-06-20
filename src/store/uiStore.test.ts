import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from './uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    useUiStore.setState({ theme: 'light', language: 'en', connectivitySim: 'online' });
  });

  it('defaults to light/en/online', () => {
    const s = useUiStore.getState();
    expect(s.theme).toBe('light');
    expect(s.language).toBe('en');
    expect(s.connectivitySim).toBe('online');
  });

  it('toggleTheme flips light <-> dark', () => {
    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe('dark');
    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe('light');
  });

  it('setLanguage updates language', () => {
    useUiStore.getState().setLanguage('hi');
    expect(useUiStore.getState().language).toBe('hi');
  });

  it('setTheme sets the theme directly', () => {
    useUiStore.getState().setTheme('dark');
    expect(useUiStore.getState().theme).toBe('dark');
  });

  it('setConnectivity sets the connectivity sim', () => {
    useUiStore.getState().setConnectivity('offline');
    expect(useUiStore.getState().connectivitySim).toBe('offline');
  });
});
