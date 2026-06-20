import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PhoneFrame } from './PhoneFrame';

describe('PhoneFrame', () => {
  it('renders its children inside the device frame', () => {
    render(
      <PhoneFrame>
        <div>hello inside</div>
      </PhoneFrame>,
    );
    expect(screen.getByText('hello inside')).toBeInTheDocument();
  });
});
