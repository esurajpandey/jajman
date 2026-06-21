import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelpScreen } from './HelpScreen';

describe('HelpScreen', () => {
  it('filters FAQs by search', () => {
    render(<MemoryRouter><HelpScreen /></MemoryRouter>);
    expect(screen.getByText('How do I book a pandit?')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search FAQs'), { target: { value: 'refund' } });
    expect(screen.getByText('How do refunds work if I cancel?')).toBeInTheDocument();
    expect(screen.queryByText('How do I book a pandit?')).not.toBeInTheDocument();
  });

  it('submits a mock support ticket', () => {
    render(<MemoryRouter><HelpScreen /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Contact support' }));
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Cannot pay' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Payment fails at the last step.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit ticket' }));
    expect(screen.getByText('Ticket #1234 created (demo)')).toBeInTheDocument();
  });
});
