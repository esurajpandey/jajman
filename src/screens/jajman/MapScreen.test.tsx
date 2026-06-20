import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MapScreen } from './MapScreen';

describe('MapScreen', () => {
  it('renders pandit pins and a selected pandit card', () => {
    render(<MemoryRouter><MapScreen /></MemoryRouter>);
    expect(screen.getAllByLabelText(/^Pandit /).length).toBeGreaterThan(0);
    expect(screen.getByText('Nearby pandits')).toBeInTheDocument();
  });
});
