import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SearchScreen } from './SearchScreen';
import { useDiscoveryStore, emptyFilters } from '../../store/discoveryStore';

beforeEach(() => useDiscoveryStore.setState({ query: '', filters: { ...emptyFilters }, sort: 'relevance' }));

function renderSearch() {
  return render(<MemoryRouter><SearchScreen /></MemoryRouter>);
}

describe('SearchScreen', () => {
  it('lists approved pandits by default', () => {
    renderSearch();
    expect(screen.getByText('Pandit Ramesh Sharma')).toBeInTheDocument();
    expect(screen.queryByText('Pandit Naveen Pandey')).not.toBeInTheDocument(); // pending excluded
  });

  it('typing a query filters the list', () => {
    renderSearch();
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'acharya' } });
    expect(screen.getByText('Acharya Vinod Dubey')).toBeInTheDocument();
    expect(screen.queryByText('Pandit Ramesh Sharma')).not.toBeInTheDocument();
  });

  it('shows the alternate-suggestions link when nothing matches', () => {
    renderSearch();
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'zzzznomatch' } });
    expect(screen.getByText('See alternate suggestions')).toBeInTheDocument();
  });
});
