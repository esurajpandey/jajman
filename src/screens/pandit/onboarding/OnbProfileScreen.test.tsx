import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnbProfileScreen } from './OnbProfileScreen';
import { usePanditOnboardingStore } from '../../../store/panditOnboardingStore';

beforeEach(() => usePanditOnboardingStore.setState(usePanditOnboardingStore.getInitialState()));

describe('OnbProfileScreen', () => {
  it('disables continue until required fields are valid, then saves to the draft', () => {
    render(<MemoryRouter><OnbProfileScreen /></MemoryRouter>);
    const cta = screen.getByRole('button', { name: 'Save & continue' });
    expect(cta).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Pandit Ramesh' } });
    fireEvent.change(screen.getByLabelText('About'), { target: { value: 'Vedic scholar with experience.' } });
    fireEvent.click(screen.getByText('Hindi'));
    fireEvent.click(screen.getByText('Katha'));
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Pune' } });
    expect(cta).not.toBeDisabled();
    fireEvent.click(cta);
    expect(usePanditOnboardingStore.getState().draft.profile.name).toBe('Pandit Ramesh');
    expect(usePanditOnboardingStore.getState().draft.profile.languages).toContain('Hindi');
  });
});
