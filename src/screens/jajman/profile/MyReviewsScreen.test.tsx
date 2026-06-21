import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MyReviewsScreen } from './MyReviewsScreen';
import { useDataStore } from '../../../store/dataStore';
import { seedCategories, seedPujas, seedPandits, seedReviews } from '../../../mock/seed';

beforeEach(() => {
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
});

describe('MyReviewsScreen', () => {
  it('shows the seeded authored review and can delete it', () => {
    render(<MemoryRouter><MyReviewsScreen /></MemoryRouter>);
    // rev-mine-1 is authored for pnd-6 (Pandit Anil Shastri)
    expect(screen.getByText('Pandit Anil Shastri')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Delete'));
    expect(screen.queryByText('Pandit Anil Shastri')).not.toBeInTheDocument();
    expect(screen.getByText("You haven't reviewed any puja yet.")).toBeInTheDocument();
  });
});
