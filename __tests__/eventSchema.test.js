import { coerceAndValidate } from '../lib/admin/events/schema';

describe('eventCreateSchema', () => {
  const base = {
    name: 'Sample Event',
    description: 'This is a sufficiently long description for testing purposes',
    imgURL: 'https://example.com/image.jpg',
    price: 10,
    dateTime: new Date(Date.now() + 3600_000).toISOString(),
    location: '123 Test St',
    quantity: 100,
  };
  it('validates happy path', () => {
    const res = coerceAndValidate(base);
    expect(res.ok).toBe(true);
  });
  it('rejects short name', () => {
    const res = coerceAndValidate({ ...base, name: 'abc' });
    expect(res.ok).toBe(false);
    expect(res.code).toBe('NAME_INVALID');
  });
});
