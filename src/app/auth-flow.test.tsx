import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { useSessionStore } from '../store/sessionStore';
import { useUiStore } from '../store/uiStore';

// Rebuild the route tree against a memory router for testing.
import { routes } from './router';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useUiStore.setState({ ...useUiStore.getState(), languageChosen: true, language: 'en' });
});

describe('auth flow', () => {
  it('logs in via OTP and lands on Home', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/auth/login'] });
    render(<RouterProvider router={router} />);

    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '9876543210' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }));

    // OTP screen
    await screen.findByText(/Verify your number/);
    for (let i = 0; i < 6; i++) {
      fireEvent.change(screen.getByLabelText(`Digit ${i + 1}`), { target: { value: '1' } });
    }
    // value is now 111111 -> wrong; fix by typing the mock code 123456
    '123456'.split('').forEach((d, i) => {
      fireEvent.change(screen.getByLabelText(`Digit ${i + 1}`), { target: { value: d } });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify & continue' }));

    // Role select -> continue -> permissions -> profile setup -> home
    await screen.findByText(/How will you use Pandit Seva/);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByText(/A couple of permissions/);
    fireEvent.click(screen.getByRole('button', { name: 'Allow & continue' }));
    await screen.findByText(/Set up your profile/);
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

    await waitFor(() => expect(screen.getByText('Featured Pandits')).toBeInTheDocument());
    expect(useSessionStore.getState().authed).toBe(true);
  });
});
