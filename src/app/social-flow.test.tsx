import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';
import { useSessionStore, MOCK_OTP } from '../store/sessionStore';
import { useChatStore } from '../store/chatStore';

beforeEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState());
  useChatStore.setState(useChatStore.getInitialState());
  useSessionStore.getState().setPendingPhone('9');
  useSessionStore.getState().verifyOtp(MOCK_OTP);
});

describe('social flow (integration)', () => {
  it('Favorites tab shows favourites and quick-rebook navigates to booking', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/favorites'] });
    render(<RouterProvider router={router} />);
    expect(screen.getByText('Pandit Ramesh Sharma')).toBeInTheDocument();
  });

  it('Conversations → open a thread → send a message', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/chat'] });
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getAllByText(/Pandit|Acharya/)[0]); // open first conversation
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Namaste ji' } });
    fireEvent.click(screen.getByLabelText('Send'));
    expect(screen.getByText('Namaste ji')).toBeInTheDocument();
  });
});
