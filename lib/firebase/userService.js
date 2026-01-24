/**
 * User Service - Firestore operations for user data
 * Abstracts user/profile/customer collection operations
 */

import { doc, getDoc, getDocs, query, setDoc, updateDoc, where, collection } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

const USERS_COLLECTION = 'users';
const PROFILES_COLLECTION = 'profiles';
const CUSTOMERS_COLLECTION = 'customers';
const USERNAMES_COLLECTION = 'usernames';

// ============================================
// USER OPERATIONS
// ============================================

/**
 * Get user document by ID
 * @param {import('../types/common').UserId} userId
 * @returns {Promise<import('../types/user').User | null>}
 */
export async function getUser(userId) {
  if (!userId) return null;

  const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
  if (!userDoc.exists()) return null;

  return {
    id: userDoc.id,
    ...userDoc.data(),
  };
}

// ============================================
// PROFILE OPERATIONS
// ============================================

/**
 * Get public profile by user ID
 * @param {import('../types/common').UserId} userId
 * @returns {Promise<import('../types/user').Profile | null>}
 */
export async function getProfile(userId) {
  if (!userId) return null;

  const profileDoc = await getDoc(doc(db, PROFILES_COLLECTION, userId));
  if (!profileDoc.exists()) return null;

  return {
    userId: profileDoc.id,
    ...profileDoc.data(),
  };
}

/**
 * Get profile by username (case-insensitive)
 * @param {string} username
 * @returns {Promise<import('../types/user').Profile | null>}
 */
export async function getProfileByUsername(username) {
  if (!username) return null;

  const usernameLower = username.toLowerCase();

  // First try the usernames collection for direct lookup
  const usernameDoc = await getDoc(doc(db, USERNAMES_COLLECTION, usernameLower));
  if (usernameDoc.exists()) {
    const { userId } = usernameDoc.data();
    return getProfile(userId);
  }

  // Fallback: query profiles by usernameLower
  const q = query(
    collection(db, PROFILES_COLLECTION),
    where('usernameLower', '==', usernameLower),
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const profileDoc = snapshot.docs[0];
  return {
    userId: profileDoc.id,
    ...profileDoc.data(),
  };
}

/**
 * Update user profile
 * @param {import('../types/common').UserId} userId
 * @param {Partial<import('../types/user').Profile>} updates
 * @returns {Promise<void>}
 */
export async function updateProfile(userId, updates) {
  if (!userId) throw new Error('userId is required');

  const profileRef = doc(db, PROFILES_COLLECTION, userId);
  await updateDoc(profileRef, {
    ...updates,
    updatedAt: new Date(),
  });
}

/**
 * Create or update profile (upsert)
 * @param {import('../types/common').UserId} userId
 * @param {Partial<import('../types/user').Profile>} data
 * @returns {Promise<void>}
 */
export async function upsertProfile(userId, data) {
  if (!userId) throw new Error('userId is required');

  const profileRef = doc(db, PROFILES_COLLECTION, userId);
  await setDoc(profileRef, {
    ...data,
    userId,
    updatedAt: new Date(),
  }, { merge: true });
}

// ============================================
// CUSTOMER OPERATIONS
// ============================================

/**
 * Get customer document by ID
 * @param {import('../types/common').UserId} userId
 * @returns {Promise<import('../types/user').Customer | null>}
 */
export async function getCustomer(userId) {
  if (!userId) return null;

  const customerDoc = await getDoc(doc(db, CUSTOMERS_COLLECTION, userId));
  if (!customerDoc.exists()) return null;

  return {
    customerId: customerDoc.id,
    ...customerDoc.data(),
  };
}

// ============================================
// USER INFO (COMBINED)
// ============================================

/**
 * Get user display info from customers + profiles collections
 * Provides fallbacks for display name and photo
 * @param {import('../types/common').UserId} userId
 * @returns {Promise<import('../types/user').UserInfo>}
 */
export async function getUserDisplayInfo(userId) {
  const [customerDoc, profileDoc] = await Promise.all([
    getDoc(doc(db, CUSTOMERS_COLLECTION, userId)),
    getDoc(doc(db, PROFILES_COLLECTION, userId)),
  ]);

  const customer = customerDoc.exists() ? customerDoc.data() : {};
  const profile = profileDoc.exists() ? profileDoc.data() : {};

  return {
    userId,
    displayName:
      profile.displayName ||
      customer.displayName ||
      `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
      'Anonymous',
    photoURL: profile.photoURL || profile.profilePicture || customer.profilePicture || null,
    username: profile.usernameLower || customer.username || null,
  };
}

// ============================================
// USERNAME OPERATIONS
// ============================================

/**
 * Check if a username is available
 * @param {string} username
 * @returns {Promise<boolean>}
 */
export async function isUsernameAvailable(username) {
  if (!username) return false;

  const usernameLower = username.toLowerCase();
  const usernameDoc = await getDoc(doc(db, USERNAMES_COLLECTION, usernameLower));

  return !usernameDoc.exists();
}

/**
 * Get user ID by username
 * @param {string} username
 * @returns {Promise<import('../types/common').UserId | null>}
 */
export async function getUserIdByUsername(username) {
  if (!username) return null;

  const usernameLower = username.toLowerCase();
  const usernameDoc = await getDoc(doc(db, USERNAMES_COLLECTION, usernameLower));

  if (!usernameDoc.exists()) return null;

  return usernameDoc.data().userId;
}
