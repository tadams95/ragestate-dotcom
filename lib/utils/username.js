import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

/**
 * Normalize a username input to lowercase alphanumeric + dot/underscore, max 20 chars.
 * @param {string} input
 * @returns {string}
 */
export function normalizeUsername(input) {
  const v = String(input || '')
    .trim()
    .toLowerCase();
  return v.replace(/[^a-z0-9._]/g, '').slice(0, 20);
}

/**
 * Validate a normalized username.
 * @param {string} username - Already-normalized username
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateUsername(username) {
  if (!username || username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters.' };
  }
  return { valid: true, error: null };
}

/**
 * Generate a default username from a user's name.
 * Example: "Tyrelle Smith" -> "tyrelle.smith4821"
 * @param {string} firstName
 * @param {string} [lastName]
 * @returns {string}
 */
export function generateDefaultUsername(firstName, lastName) {
  const raw = firstName + (lastName ? '.' + lastName : '');
  let base = normalizeUsername(raw).slice(0, 15);
  if (base.length < 2) base = 'user';
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return base + suffix;
}

/**
 * Check if a username is available.
 * @param {string} desired - Normalized username to check
 * @param {string} [currentUserId] - Current user's UID (considered available if owned by same user)
 * @returns {Promise<'available' | 'taken' | 'error'>}
 */
export async function checkUsernameAvailability(desired, currentUserId) {
  try {
    const snap = await getDoc(doc(db, 'usernames', desired));
    if (!snap.exists()) return 'available';
    const data = snap.data();
    if (currentUserId && data?.uid === currentUserId) return 'available';
    return 'taken';
  } catch (_) {
    return 'error';
  }
}

/**
 * Claim a username atomically via Firestore transaction.
 * Writes to both `usernames/{desired}` and `profiles/{uid}`.
 * @param {string} uid - Firebase Auth UID
 * @param {string} desired - Normalized username to claim
 * @param {Object} [profileDefaults] - Extra fields to merge into the profile doc
 * @returns {Promise<void>}
 * @throws {Error} If the username is taken by another user
 */
export async function claimUsername(uid, desired, profileDefaults = {}) {
  await runTransaction(db, async (tx) => {
    const usernameRef = doc(db, 'usernames', desired);
    const existing = await tx.get(usernameRef);

    if (existing.exists()) {
      const data = existing.data();
      if (data.uid !== uid) {
        throw new Error('That username is taken.');
      }
    } else {
      tx.set(usernameRef, { uid, createdAt: serverTimestamp() });
    }

    const profileRef = doc(db, 'profiles', uid);
    tx.set(
      profileRef,
      {
        ...profileDefaults,
        usernameLower: desired,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
}
