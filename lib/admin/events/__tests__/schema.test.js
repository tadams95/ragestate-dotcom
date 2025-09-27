import { coerceAndValidate } from '../../schema';

function baseValid() {
  return {
    name: 'Sample Event',
    description: 'This is a sufficiently long description with more than twenty chars.',
    imgURL: 'https://firebasestorage.googleapis.com/v0/b/test/o/hero.png?alt=media',
    price: 10,
    age: 18,
    dateTime: new Date(Date.now() + 60_000).toISOString(),
    location: 'Test Venue',
    quantity: 50,
    isDigital: true,
    active: true,
  };
}

describe('eventCreateSchema', () => {
  test('accepts valid payload', () => {
    const r = coerceAndValidate(baseValid());
    expect(r.ok).toBe(true);
  });

  test('rejects short name', () => {
    const r = coerceAndValidate({ ...baseValid(), name: 'abc' });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('NAME_INVALID');
  });

  test('rejects description too short', () => {
    const r = coerceAndValidate({ ...baseValid(), description: 'short desc' });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('DESCRIPTION_INVALID');
  });

  test('rejects price too high', () => {
    const r = coerceAndValidate({ ...baseValid(), price: 5001 });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('PRICE_INVALID');
  });
});
