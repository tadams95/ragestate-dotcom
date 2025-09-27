import { baseSlug } from '../lib/admin/events/slug';

describe('baseSlug', () => {
  it('removes stopwords and normalizes', () => {
    expect(baseSlug('The Big And Grand Opening')).toBe('big-grand-opening');
  });
  it('collapses dashes', () => {
    expect(baseSlug('Hello  ---  World')).toBe('hello-world');
  });
});
