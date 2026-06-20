import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PanditCard } from './PanditCard';
import { seedPandits } from '../../mock/seed';

describe('PanditCard', () => {
  it('renders the pandit name, distance, and starting price', () => {
    render(<PanditCard p={seedPandits[0]} />);
    expect(screen.getByText('Pandit Ramesh Sharma')).toBeInTheDocument();
    expect(screen.getByText('2.4 km')).toBeInTheDocument();
    expect(screen.getByText('₹1100')).toBeInTheDocument();
  });
});
