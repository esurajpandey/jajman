import { describe, it, expect } from 'vitest';
import { translate } from './index';

describe('translate', () => {
  it('returns the English string for a known key', () => {
    expect(translate('home.featured', 'en')).toBe('Featured Pandits');
  });

  it('falls back to English when the language lacks the key', () => {
    expect(translate('home.featured', 'hi')).toBe('Featured Pandits');
  });

  it('falls back to the key itself when unknown everywhere', () => {
    expect(translate('does.not.exist', 'en')).toBe('does.not.exist');
  });
});
