import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageBubble } from './MessageBubble';
import { ChatComposer } from './ChatComposer';
import { AddressForm } from '../booking/AddressForm';

describe('chat + address components', () => {
  it('MessageBubble renders text and attachment', () => {
    render(<MessageBubble message={{ id: 'x', senderId: 'me', text: 'Hello', sentAt: '2026-06-20T09:00:00.000Z', attachmentName: 'venue.jpg' }} mine />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('venue.jpg')).toBeInTheDocument();
  });
  it('ChatComposer sends trimmed text and clears', () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} onAttach={() => {}} />);
    const input = screen.getByLabelText('Message');
    fireEvent.change(input, { target: { value: '  hi  ' } });
    fireEvent.click(screen.getByLabelText('Send'));
    expect(onSend).toHaveBeenCalledWith('hi');
    expect((input as HTMLInputElement).value).toBe('');
  });
  it('AddressForm validates required fields then saves', () => {
    const onSave = vi.fn();
    render(<AddressForm onSave={onSave} />);
    const save = screen.getByRole('button', { name: 'Save address' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Home' } });
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: '12 Tulsi Apt' } });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Pune' } });
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ label: 'Home', city: 'Pune', type: 'home' }));
  });
});
