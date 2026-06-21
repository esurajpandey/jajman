import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ReferralScreen } from './ReferralScreen';
import { useReferralStore } from '../../../store/referralStore';
import { seedReferrals, referralCode } from '../../../mock/seed';

beforeEach(() => useReferralStore.setState({ code: referralCode, history: seedReferrals }));

describe('ReferralScreen', () => {
  it('shows the code and referral history, and copy gives feedback', () => {
    render(<MemoryRouter><ReferralScreen /></MemoryRouter>);
    expect(screen.getByText('SURAJ2026')).toBeInTheDocument();
    expect(screen.getByText('Ananya G.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Copy/ }));
    expect(screen.getByText('Copied')).toBeInTheDocument();
  });
});
