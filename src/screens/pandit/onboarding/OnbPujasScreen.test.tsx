import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnbPujasScreen } from './OnbPujasScreen';
import { useDataStore } from '../../../store/dataStore';
import { usePanditOnboardingStore } from '../../../store/panditOnboardingStore';
import { seedCategories, seedPujas, seedPandits, seedReviews } from '../../../mock/seed';

beforeEach(() => {
  useDataStore.setState({ categories: seedCategories, pujas: seedPujas, pandits: seedPandits, reviews: seedReviews });
  usePanditOnboardingStore.setState(usePanditOnboardingStore.getInitialState());
});

describe('OnbPujasScreen', () => {
  it('adds a puja via the charge sheet and enables continue', () => {
    render(<MemoryRouter><OnbPujasScreen /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Save & continue' })).toBeDisabled();
    fireEvent.click(screen.getAllByRole('button', { name: /Add/ })[0]); // open sheet for first puja
    fireEvent.change(screen.getByLabelText('Your charge (₹)'), { target: { value: '1500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add this puja' }));
    expect(usePanditOnboardingStore.getState().draft.supportedPujas).toHaveLength(1);
    expect(screen.getByText(/Selected \(1\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save & continue' })).not.toBeDisabled();
  });
});
