import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CategoryBrowseScreen } from './CategoryBrowseScreen';

describe('CategoryBrowseScreen', () => {
  it('shows pandits for the routed category', () => {
    render(
      <MemoryRouter initialEntries={['/app/category/cat-katha']}>
        <Routes>
          <Route path="/app/category/:categoryId" element={<CategoryBrowseScreen />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getAllByText(/Katha/).length).toBeGreaterThan(0);
    expect(screen.getByText(/pandits available/)).toBeInTheDocument();
  });
});
