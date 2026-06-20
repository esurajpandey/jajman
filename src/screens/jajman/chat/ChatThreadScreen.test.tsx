import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ChatThreadScreen } from './ChatThreadScreen';
import { useChatStore } from '../../../store/chatStore';

beforeEach(() => useChatStore.setState(useChatStore.getInitialState()));

describe('ChatThreadScreen', () => {
  it('shows messages and sends a new one', () => {
    render(
      <MemoryRouter initialEntries={['/app/chat/thr-1']}>
        <Routes><Route path="/app/chat/:threadId" element={<ChatThreadScreen />} /></Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/Looking forward to it/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Great, thanks!' } });
    fireEvent.click(screen.getByLabelText('Send'));
    expect(screen.getByText('Great, thanks!')).toBeInTheDocument();
  });

  it('toggles phone sharing', () => {
    render(
      <MemoryRouter initialEntries={['/app/chat/thr-1']}>
        <Routes><Route path="/app/chat/:threadId" element={<ChatThreadScreen />} /></Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/Phone number hidden/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Toggle phone sharing'));
    expect(screen.getByText(/phone number is shared/)).toBeInTheDocument();
  });
});
