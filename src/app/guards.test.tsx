import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth, RequireGuest } from './guards';
import { useSessionStore } from '../store/sessionStore';

beforeEach(() => useSessionStore.setState(useSessionStore.getInitialState()));

function harness(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/auth/login" element={<div>LOGIN</div>} />
        <Route path="/app/home" element={<div>HOME</div>} />
        <Route path="/protected" element={<RequireAuth><div>SECRET</div></RequireAuth>} />
        <Route path="/guest" element={<RequireGuest><div>GUESTONLY</div></RequireGuest>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('guards', () => {
  it('RequireAuth redirects a guest to login', () => {
    harness('/protected');
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
  });

  it('RequireAuth renders children when authed', () => {
    useSessionStore.getState().setPendingPhone('9');
    useSessionStore.getState().verifyOtp('123456');
    harness('/protected');
    expect(screen.getByText('SECRET')).toBeInTheDocument();
  });

  it('RequireGuest redirects an authed user to home', () => {
    useSessionStore.getState().setPendingPhone('9');
    useSessionStore.getState().verifyOtp('123456');
    harness('/guest');
    expect(screen.getByText('HOME')).toBeInTheDocument();
  });
});
