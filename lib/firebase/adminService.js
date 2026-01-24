/**
 * Admin Service - Firestore operations for admin functionality
 * Abstracts admin checks and admin-only operations
 */

import { collection, doc, getDoc, getDocs, query } from 'firebase/firestore';
import { get as dbGet, ref as dbRef, getDatabase } from 'firebase/database';
import { db } from '../../firebase/firebase';

const ADMIN_USERS_COLLECTION = 'adminUsers';
const ALTERNATIVE_ADMIN_COLLECTIONS = ['admins', 'administrators', 'admin'];

// ============================================
// ADMIN CHECK OPERATIONS
// ============================================

/**
 * Check if a user is an admin
 * Checks multiple sources: RTDB isAdmin flag, RTDB role/permissions, Firestore admin collections
 * @param {import('../types/common').UserId} userId
 * @returns {Promise<boolean>}
 */
export async function checkIsAdmin(userId) {
  if (!userId) return false;

  try {
    // Check RTDB first for isAdmin flag
    const database = getDatabase();
    const rtdbUserRef = dbRef(database, `users/${userId}`);
    const rtdbSnapshot = await dbGet(rtdbUserRef);

    if (rtdbSnapshot.exists()) {
      const userData = rtdbSnapshot.val();

      // Direct isAdmin flag
      if (userData.isAdmin === true) {
        return true;
      }

      // Role-based check
      if (userData.role === 'admin') {
        return true;
      }

      // Permissions-based check
      if (userData.permissions?.admin === true) {
        return true;
      }
    }

    // Check Firestore adminUsers collection
    const adminDocRef = doc(db, ADMIN_USERS_COLLECTION, userId);
    const adminDocSnap = await getDoc(adminDocRef);

    if (adminDocSnap.exists()) {
      return true;
    }

    // Check alternative admin collections
    for (const collectionName of ALTERNATIVE_ADMIN_COLLECTIONS) {
      try {
        const altAdminDocRef = doc(db, collectionName, userId);
        const altAdminDocSnap = await getDoc(altAdminDocRef);

        if (altAdminDocSnap.exists()) {
          return true;
        }
      } catch {
        // Collection might not exist, continue checking
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Check if user has a specific permission
 * @param {import('../types/common').UserId} userId
 * @param {string} permission - Permission name to check
 * @returns {Promise<boolean>}
 */
export async function hasPermission(userId, permission) {
  if (!userId || !permission) return false;

  try {
    // Check RTDB for permissions
    const database = getDatabase();
    const rtdbUserRef = dbRef(database, `users/${userId}`);
    const rtdbSnapshot = await dbGet(rtdbUserRef);

    if (rtdbSnapshot.exists()) {
      const userData = rtdbSnapshot.val();

      // Admin has all permissions
      if (userData.isAdmin === true || userData.role === 'admin') {
        return true;
      }

      // Check specific permission
      if (userData.permissions?.[permission] === true) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

// ============================================
// ADMIN USER MANAGEMENT
// ============================================

/**
 * Get user data from RTDB (admin view with all fields)
 * @param {import('../types/common').UserId} userId
 * @returns {Promise<Object | null>}
 */
export async function getAdminUserView(userId) {
  if (!userId) return null;

  try {
    const database = getDatabase();
    const userRef = dbRef(database, `users/${userId}`);
    const snapshot = await dbGet(userRef);

    if (!snapshot.exists()) return null;

    return {
      id: userId,
      ...snapshot.val(),
    };
  } catch (error) {
    console.error('Error fetching admin user view:', error);
    return null;
  }
}

/**
 * Get all users from RTDB (admin only)
 * @param {number} [limitCount]
 * @returns {Promise<Object[]>}
 */
export async function getAllUsers(limitCount = 100) {
  try {
    const database = getDatabase();
    const usersRef = dbRef(database, 'users');
    const snapshot = await dbGet(usersRef);

    if (!snapshot.exists()) return [];

    const userData = snapshot.val();
    const userArray = Object.entries(userData).map(([id, data]) => ({
      id,
      ...data,
      email: data.email || 'No email',
      name: data.name || data.displayName || 'Unknown',
      joinDate: data.createdAt || new Date().toISOString(),
    }));

    return userArray.slice(0, limitCount);
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
}

/**
 * Get total user count from RTDB
 * @returns {Promise<number>}
 */
export async function getUserCount() {
  try {
    const database = getDatabase();
    const usersRef = dbRef(database, 'users');
    const snapshot = await dbGet(usersRef);

    if (!snapshot.exists()) return 0;

    return Object.keys(snapshot.val()).length;
  } catch (error) {
    console.error('Error getting user count:', error);
    return 0;
  }
}

// ============================================
// PROMOTER CODES
// ============================================

/**
 * Get all promoter codes
 * @returns {Promise<Object[]>}
 */
export async function getPromoterCodes() {
  try {
    const q = query(collection(db, 'promoterCodes'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  } catch (error) {
    console.error('Error fetching promoter codes:', error);
    return [];
  }
}
