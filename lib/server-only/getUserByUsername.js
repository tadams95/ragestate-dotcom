'use server';

import { firestoreAdmin } from '../server/firebaseAdmin';

/**
 * Server-only function to check if a username exists in Firestore.
 * Returns the uid if found, null otherwise.
 * @param {string} username - The username to look up (case-insensitive)
 * @returns {Promise<{uid: string} | null>}
 */
export async function getUserByUsername(username) {
  const usernameLower = String(username || '')
    .trim()
    .toLowerCase();

  if (!usernameLower) {
    return null;
  }

  try {
    const usernameDoc = await firestoreAdmin.collection('usernames').doc(usernameLower).get();

    if (!usernameDoc.exists) {
      return null;
    }

    const data = usernameDoc.data();
    return { uid: data?.uid || null };
  } catch (error) {
    console.error('[getUserByUsername] Error looking up username:', error);
    return null;
  }
}
