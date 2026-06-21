import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProfileScreen } from './ProfileScreen';
import { useSessionStore } from '../../store/sessionStore';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useSessionStore.getState().setPendingPhone('9999999999');
  useSessionStore.getState().verifyOtp('123456');
});

describe('ProfileScreen', () => {
  it('renders the account menu rows', () => {
    render(<MemoryRouter><ProfileScreen /></MemoryRouter>);
    expect(screen.getByText('Addresses')).toBeInTheDocument();
    expect(screen.getByText('My reviews')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('shows "Become a Pandit" for a jajman-only account', () => {
    render(<MemoryRouter><ProfileScreen /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Become a Pandit' })).toBeInTheDocument();
  });
});
