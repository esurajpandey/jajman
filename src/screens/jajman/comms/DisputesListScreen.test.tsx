import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DisputesListScreen } from './DisputesListScreen';
import { useDisputeStore } from '../../../store/disputeStore';
import { seedDisputes } from '../../../mock/seed';

beforeEach(() => useDisputeStore.setState({ disputes: seedDisputes }));

describe('DisputesListScreen', () => {
  it('lists seeded disputes with reason + status', () => {
    render(<MemoryRouter><DisputesListScreen /></MemoryRouter>);
    expect(screen.getByText('Puja incomplete')).toBeInTheDocument();
    expect(screen.getByText('Payment issue')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });
});
