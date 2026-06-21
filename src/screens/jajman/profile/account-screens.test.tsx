import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EditProfileScreen } from './EditProfileScreen';
import { SettingsScreen } from './SettingsScreen';
import { useSessionStore } from '../../../store/sessionStore';
import { useUiStore } from '../../../store/uiStore';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useUiStore.setState(useUiStore.getInitialState());
  useSessionStore.getState().setPendingPhone('9999999999');
  useSessionStore.getState().verifyOtp('123456');
});

describe('EditProfileScreen', () => {
  it('saves an updated name to the session store', () => {
    render(<MemoryRouter><EditProfileScreen /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Ravi Kumar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(useSessionStore.getState().user?.name).toBe('Ravi Kumar');
  });
});

describe('SettingsScreen', () => {
  it('switches the theme to dark', () => {
    render(<MemoryRouter><SettingsScreen /></MemoryRouter>);
    fireEvent.click(screen.getByRole('tab', { name: 'Dark' }));
    expect(useUiStore.getState().theme).toBe('dark');
  });

  it('logs out from the Account section', () => {
    render(<MemoryRouter><SettingsScreen /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    expect(useSessionStore.getState().authed).toBe(false);
  });
});
