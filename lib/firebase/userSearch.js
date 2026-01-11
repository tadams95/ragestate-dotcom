import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

/**
 * @typedef {Object} MentionUser
 * @property {string} uid - Firebase UID
 * @property {string} username - Username (lowercase)
 * @property {string} displayName - Display name
 * @property {string|null} profilePicture - Avatar URL
 * @property {boolean} verified - Verification status
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
