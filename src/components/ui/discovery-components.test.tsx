import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomSheet } from './BottomSheet';
import { Chip } from './Chip';
import { RatingSummary } from './RatingSummary';

describe('discovery components', () => {
  it('BottomSheet renders children when open and calls onClose on the close button', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="Filters">
        <div>sheet body</div>
      </BottomSheet>,
    );
    expect(screen.getByText('sheet body')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('BottomSheet renders nothing when closed', () => {
    const { container } = render(
      <BottomSheet open={false} onClose={() => {}}>
        <div>hidden</div>
      </BottomSheet>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('Chip reflects selected state and reports clicks', () => {
    const onClick = vi.fn();
    render(<Chip label="Katha" selected onClick={onClick} />);
    const chip = screen.getByRole('button', { name: 'Katha' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(chip);
    expect(onClick).toHaveBeenCalled();
  });

  it('RatingSummary shows value and review count', () => {
    render(<RatingSummary value={4.9} count={212} />);
    expect(screen.getByText('4.9')).toBeInTheDocument();
    expect(screen.getByText('212 reviews')).toBeInTheDocument();
  });
});
