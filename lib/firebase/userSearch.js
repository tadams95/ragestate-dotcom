import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

/**
 * @typedef {Object} MentionUser
 * @property {string} uid - Firebase UID
 * @property {string} username - Username (lowercase)
 * @property {string} displayName - Display name
 * @property {string|null} profilePicture - Avatar URL
 * @property {boolean} verified - Verification status
 * @property {string} [email] - Email address (only included when searching by email)
 */

/**
 * Search users by username prefix using Firestore
 * Uses the same prefix search strategy as mobile app
 *
 * @param {string} searchTerm - Username prefix to search
 * @param {number} [maxResults=10] - Maximum results to return
 * @returns {Promise<MentionUser[]>} Array of matching users
 */
export async function searchUsersByUsername(searchTerm, maxResults = 10) {
  if (!searchTerm || searchTerm.length < 1) {
    return [];
  }

  const normalizedTerm = searchTerm.toLowerCase();
  const usernamesRef = collection(db, 'usernames');

  // Firestore prefix search using document ID
  const q = query(
    usernamesRef,
    where('__name__', '>=', normalizedTerm),
    where('__name__', '<=', normalizedTerm + '\uf8ff'),
    limit(maxResults),
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return [];
  }

  // Fetch user details from customers collection in parallel
  const users = await Promise.all(
    snapshot.docs.map(async (usernameDoc) => {
      const data = usernameDoc.data();
      const uid = data.uid;
      // Document ID is the lowercase username
      const username = usernameDoc.id;

      // Fetch display info from customers collection
      let customer = {};
      try {
        const customerDoc = await getDoc(doc(db, 'customers', uid));
        if (customerDoc.exists()) {
          customer = customerDoc.data();
        }
      } catch (err) {
        // If customer doc doesn't exist or fails, continue with defaults
        console.warn(`Failed to fetch customer data for ${uid}:`, err);
      }

      return {
        uid,
        username,
        displayName: customer.displayName || username,
        profilePicture: customer.profilePicture || null,
        verified: customer.verificationStatus === 'verified',
      };
    }),
  );

  return users;
}

/**
 * Search users by email prefix in the customers collection
 *
 * @param {string} searchTerm - Email prefix to search
 * @param {number} [maxResults=10] - Maximum results to return
 * @returns {Promise<MentionUser[]>} Array of matching users
 */
export async function searchUsersByEmail(searchTerm, maxResults = 10) {
  if (!searchTerm || searchTerm.length < 2) {
    return [];
  }

  const normalizedTerm = searchTerm.toLowerCase().trim();
  const customersRef = collection(db, 'customers');

  const q = query(
    customersRef,
    where('email', '>=', normalizedTerm),
    where('email', '<=', normalizedTerm + '\uf8ff'),
    orderBy('email'),
    limit(maxResults),
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return [];
  }

  // Fetch username from usernames collection to stay consistent with MentionUser shape
  const users = await Promise.all(
    snapshot.docs.map(async (customerDoc) => {
      const uid = customerDoc.id;
      const data = customerDoc.data();

      // Resolve username
      let username = data.username || '';
      if (!username) {
        try {
          const profileDoc = await getDoc(doc(db, 'profiles', uid));
          if (profileDoc.exists()) {
            username = profileDoc.data().username || '';
          }
        } catch {
          // continue with empty username
        }
      }

      return {
        uid,
        username,
        displayName: data.displayName || data.name || username || 'Unknown',
        profilePicture: data.profilePicture || null,
        verified: data.verificationStatus === 'verified',
        email: data.email || '',
      };
    }),
  );

  return users;
}
