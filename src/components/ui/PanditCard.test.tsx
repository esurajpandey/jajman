import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PanditCard } from './PanditCard';
import { seedPandits } from '../../mock/seed';

describe('PanditCard', () => {
  it('renders the pandit name, distance, and starting price', () => {
    render(<PanditCard p={seedPandits[0]} />);
    expect(screen.getByText('Pandit Ramesh Sharma')).toBeInTheDocument();
    expect(screen.getByText('2.4 km')).toBeInTheDocument();
    expect(screen.getByText('₹1100')).toBeInTheDocument();
  });

  it('fires onClick on click and on Enter/Space key', () => {
    const onClick = vi.fn();
    render(<PanditCard p={seedPandits[0]} onClick={onClick} />);
    const card = screen.getByRole('button', { name: /View Pandit Ramesh Sharma/ });
    fireEvent.click(card);
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(3);
  });
});
