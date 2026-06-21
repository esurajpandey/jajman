import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationPrefsScreen } from './NotificationPrefsScreen';
import { LanguagePrefScreen } from './LanguagePrefScreen';
import { useSessionStore } from '../../../store/sessionStore';
import { useUiStore } from '../../../store/uiStore';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useUiStore.setState(useUiStore.getInitialState());
});

describe('NotificationPrefsScreen', () => {
  it('toggles a preference in the session store', () => {
    render(<MemoryRouter><NotificationPrefsScreen /></MemoryRouter>);
    expect(useSessionStore.getState().notificationPrefs.promotions).toBe(false);
    fireEvent.click(screen.getByRole('switch', { name: 'Promotions' }));
    expect(useSessionStore.getState().notificationPrefs.promotions).toBe(true);
  });
});

describe('LanguagePrefScreen', () => {
  it('sets the app language to Hindi', () => {
    render(<MemoryRouter><LanguagePrefScreen /></MemoryRouter>);
    fireEvent.click(screen.getByText('हिन्दी (Hindi)'));
    expect(useUiStore.getState().language).toBe('hi');
  });
});
