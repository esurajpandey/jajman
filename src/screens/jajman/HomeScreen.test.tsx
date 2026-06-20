import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomeScreen } from './HomeScreen';

function renderHome() {
  return render(
    <MemoryRouter>
      <HomeScreen />
    </MemoryRouter>,
  );
}

describe('HomeScreen', () => {
  it('shows the Featured Pandits section', () => {
    renderHome();
    expect(screen.getByText('Featured Pandits')).toBeInTheDocument();
  });

  it('renders a seeded category and at least one approved pandit', () => {
    renderHome();
    expect(screen.getByText('Katha')).toBeInTheDocument();
    expect(screen.getByText('Pandit Ramesh Sharma')).toBeInTheDocument();
  });

  it('does not show the pending (unapproved) pandit', () => {
    renderHome();
    expect(screen.queryByText('Pandit Naveen Pandey')).not.toBeInTheDocument();
  });
});
