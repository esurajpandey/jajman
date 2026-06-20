import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';
import { Avatar } from './Avatar';
import { RatingStars } from './RatingStars';

describe('ui primitives', () => {
  it('Button renders its label', () => {
    render(<Button>Book now</Button>);
    expect(screen.getByRole('button', { name: 'Book now' })).toBeInTheDocument();
  });

  it('Avatar derives initials from the name (stripping honorifics)', () => {
    render(<Avatar name="Pandit Ramesh Sharma" />);
    expect(screen.getByText('RS')).toBeInTheDocument();
  });

  it('RatingStars shows the value and count', () => {
    render(<RatingStars value={4.9} count={212} />);
    expect(screen.getByText('4.9')).toBeInTheDocument();
    expect(screen.getByText('(212)')).toBeInTheDocument();
  });
});
