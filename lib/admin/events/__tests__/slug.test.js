import { baseSlug } from '../../slug';

describe('baseSlug', () => {
  test('removes stopwords and normalizes', () => {
    expect(baseSlug('The Big Night Of The RAGE')).toMatch(/^big-night-rage$/);
  });
  test('fallback when name empty after filtering', () => {
    const s = baseSlug('The The And Of');
    expect(s).toBe(''); // upstream generator will add random suffix if empty
  });
});
