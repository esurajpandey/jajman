import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Home } from 'lucide-react';
import { ToggleRow } from '../ui/ToggleRow';
import { MenuRow } from './MenuRow';
import { AddressCard } from './AddressCard';
import type { Address } from '../../mock/types';

const addr: Address = { id: 'a1', label: 'Home', type: 'home', line: '12 Tulsi Apartments', city: 'Pune', isDefault: true };

describe('account primitives', () => {
  it('ToggleRow fires onChange with the flipped value', () => {
    const onChange = vi.fn();
    render(<ToggleRow label="Promotions" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Promotions' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('MenuRow renders its label and fires onClick', () => {
    const onClick = vi.fn();
    render(<MenuRow icon={Home} label="Addresses" onClick={onClick} />);
    fireEvent.click(screen.getByText('Addresses'));
    expect(onClick).toHaveBeenCalled();
  });

  it('AddressCard shows the default badge and hides "Set default" for the default address', () => {
    render(<AddressCard address={addr} onEdit={() => {}} onDelete={() => {}} onSetDefault={() => {}} />);
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.queryByText('Set default')).not.toBeInTheDocument();
  });

  it('AddressCard fires onSetDefault for a non-default address', () => {
    const onSetDefault = vi.fn();
    render(<AddressCard address={{ ...addr, isDefault: false }} onEdit={() => {}} onDelete={() => {}} onSetDefault={onSetDefault} />);
    fireEvent.click(screen.getByText('Set default'));
    expect(onSetDefault).toHaveBeenCalled();
  });
});
