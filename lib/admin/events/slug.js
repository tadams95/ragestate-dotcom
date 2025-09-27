// Slug utilities for events
// NOTE: Avoid importing firebase-admin at module load so simple slug helpers can be unit tested
// without pulling in ESM dependencies that Jest may not transform. We lazy import inside functions
// that actually need Firestore.

const STOPWORDS = ['the', 'a', 'an', 'and', 'of', 'for'];

export function baseSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/['`”"“]/g, '')
    .split(/\s+/)
    .filter((w) => !STOPWORDS.includes(w))
    .join('-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');
}

function randomSuffix(len = 5) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function generateUniqueSlug(name, maxAttempts = 5) {
  const { firestoreAdmin } = await import('../../server/firebaseAdmin.js');
  const base = baseSlug(name) || randomSuffix();
  let attempt = 0;
  let slug = base;
  while (attempt < maxAttempts) {
    const doc = await firestoreAdmin.collection('events').doc(slug).get();
    if (!doc.exists) return slug;
    slug = `${base}-${randomSuffix(6)}`;
    attempt++;
  }
  throw new Error('SLUG_GENERATION_FAILED');
}
