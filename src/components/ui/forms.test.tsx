import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextField } from './TextField';
import { OtpInput } from './OtpInput';
import { SegmentedControl } from './SegmentedControl';

describe('auth form primitives', () => {
  it('TextField renders label and shows error over hint', () => {
    render(<TextField label="Mobile number" hint="10 digits" error="Required" name="mobile" />);
    expect(screen.getByText('Mobile number')).toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.queryByText('10 digits')).not.toBeInTheDocument();
  });

  it('OtpInput reports typed digits', () => {
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Digit 1'), { target: { value: '1' } });
    expect(onChange).toHaveBeenCalledWith('1');
  });

  it('SegmentedControl marks the selected segment and reports changes', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        segments={[{ value: 'otp', label: 'OTP' }, { value: 'pwd', label: 'Password' }]}
        value="otp"
        onChange={onChange}
      />,
    );
    const pwd = screen.getByRole('tab', { name: 'Password' });
    expect(pwd).toHaveAttribute('aria-selected', 'false');
    fireEvent.click(pwd);
    expect(onChange).toHaveBeenCalledWith('pwd');
  });
});
