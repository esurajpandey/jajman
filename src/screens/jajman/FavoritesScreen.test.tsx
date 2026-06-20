import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FavoritesScreen } from './FavoritesScreen';
import { useDataStore } from '../../store/dataStore';
import { seedCategories, seedPujas, seedPandits, seedReviews } from '../../mock/seed';

beforeEach(() => useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews }));

describe('FavoritesScreen', () => {
  it('lists favourited pandits (pnd-1, pnd-6 seeded favourite) and can unfavourite', () => {
    render(<MemoryRouter><FavoritesScreen /></MemoryRouter>);
    expect(screen.getByText('Pandit Ramesh Sharma')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Remove Pandit Ramesh Sharma from favourites'));
    expect(screen.queryByText('Pandit Ramesh Sharma')).not.toBeInTheDocument();
  });
});
