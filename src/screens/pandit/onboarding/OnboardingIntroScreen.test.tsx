import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingIntroScreen } from './OnboardingIntroScreen';

describe('OnboardingIntroScreen', () => {
  it('shows the value props and a Get started CTA', () => {
    render(<MemoryRouter><OnboardingIntroScreen /></MemoryRouter>);
    expect(screen.getByText('Offer your seva to families near you')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get started' })).toBeInTheDocument();
  });
});
