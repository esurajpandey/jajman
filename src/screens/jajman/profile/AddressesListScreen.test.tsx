import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AddressesListScreen } from './AddressesListScreen';
import { useBookingStore } from '../../../store/bookingStore';
import { seedAddresses } from '../../../mock/seed';

beforeEach(() => useBookingStore.setState({ addresses: seedAddresses }));

describe('AddressesListScreen', () => {
  it('lists seeded addresses and marks the default', () => {
    render(<MemoryRouter><AddressesListScreen /></MemoryRouter>);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Community temple')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('can delete an address', () => {
    render(<MemoryRouter><AddressesListScreen /></MemoryRouter>);
    const templeCard = screen.getByText('Community temple').closest('div');
    fireEvent.click(screen.getAllByText('Delete')[2]); // temple is the 3rd card
    expect(screen.queryByText('Community temple')).not.toBeInTheDocument();
    expect(templeCard).not.toBeInTheDocument();
  });
});
