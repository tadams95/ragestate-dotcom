/**
 * Follow Service - Firestore operations for follow relationships
 * Abstracts follow/unfollow and follower/following queries
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  setDoc,
  deleteDoc,
  serverTimestamp,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '../../firebase/firebase';

const FOLLOWS_COLLECTION = 'follows';
const PAGE_SIZE = 20;

// ============================================
// FOLLOW STATUS OPERATIONS
// ============================================

/**
 * Check if a user is following another user
 * @param {import('../types/common').UserId} followerId - The user who might be following
 * @param {import('../types/common').UserId} followedId - The user who might be followed
 * @returns {Promise<boolean>}
 */
export async function isFollowing(followerId, followedId) {
  if (!followerId || !followedId || followerId === followedId) return false;

  const followDocId = `${followerId}_${followedId}`;
  const followDoc = await getDoc(doc(db, FOLLOWS_COLLECTION, followDocId));

  return followDoc.exists();
}

// ============================================
// FOLLOW/UNFOLLOW OPERATIONS
// ============================================

/**
 * Follow a user
 * @param {import('../types/common').UserId} followerId - The user who is following
 * @param {import('../types/common').UserId} followedId - The user being followed
 * @returns {Promise<void>}
 */
export async function follow(followerId, followedId) {
  if (!followerId || !followedId) throw new Error('followerId and followedId are required');
  if (followerId === followedId) throw new Error('Cannot follow yourself');

  const followDocId = `${followerId}_${followedId}`;
  const followRef = doc(db, FOLLOWS_COLLECTION, followDocId);

  // Check if already following to avoid unnecessary writes
  const existing = await getDoc(followRef);
  if (existing.exists()) {
    // Already following - no-op (idempotent)
    return;
  }

  await setDoc(followRef, {
    followerId,
    followedId,
    createdAt: serverTimestamp(),
  });
}

/**
 * Unfollow a user
 * @param {import('../types/common').UserId} followerId - The user who is unfollowing
 * @param {import('../types/common').UserId} followedId - The user being unfollowed
 * @returns {Promise<void>}
 */
export async function unfollow(followerId, followedId) {
  if (!followerId || !followedId) throw new Error('followerId and followedId are required');

  const followDocId = `${followerId}_${followedId}`;
  const followRef = doc(db, FOLLOWS_COLLECTION, followDocId);

  await deleteDoc(followRef);
}

/**
 * Toggle follow status
 * @param {import('../types/common').UserId} followerId
 * @param {import('../types/common').UserId} followedId
 * @returns {Promise<boolean>} - Returns true if now following, false if unfollowed
 */
export async function toggleFollow(followerId, followedId) {
  const following = await isFollowing(followerId, followedId);

  if (following) {
    await unfollow(followerId, followedId);
    return false;
  } else {
    await follow(followerId, followedId);
    return true;
  }
}

// ============================================
// FOLLOWER/FOLLOWING QUERIES
// ============================================

/**
 * Get followers of a user with pagination
 * @param {import('../types/common').UserId} userId
 * @param {import('../types/common').DocumentSnapshot} [lastDoc]
 * @param {number} [pageSize]
 * @returns {Promise<{followers: import('../types/common').UserId[], lastDoc: import('../types/common').DocumentSnapshot | null}>}
 */
export async function getFollowers(userId, lastDoc = null, pageSize = PAGE_SIZE) {
  if (!userId) return { followers: [], lastDoc: null };

  const constraints = [
    where('followedId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  ];

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(collection(db, FOLLOWS_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  const followers = snapshot.docs.map((docSnap) => docSnap.data().followerId);
  const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

  return { followers, lastDoc: newLastDoc };
}

/**
 * Get users that a user is following with pagination
 * @param {import('../types/common').UserId} userId
 * @param {import('../types/common').DocumentSnapshot} [lastDoc]
 * @param {number} [pageSize]
 * @returns {Promise<{following: import('../types/common').UserId[], lastDoc: import('../types/common').DocumentSnapshot | null}>}
 */
export async function getFollowing(userId, lastDoc = null, pageSize = PAGE_SIZE) {
  if (!userId) return { following: [], lastDoc: null };

  const constraints = [
    where('followerId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  ];

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(collection(db, FOLLOWS_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  const following = snapshot.docs.map((docSnap) => docSnap.data().followedId);
  const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

  return { following, lastDoc: newLastDoc };
}

// ============================================
// COUNT OPERATIONS
// ============================================

/**
 * Get follower count for a user
 * @param {import('../types/common').UserId} userId
 * @returns {Promise<number>}
 */
export async function getFollowerCount(userId) {
  if (!userId) return 0;

  const q = query(
    collection(db, FOLLOWS_COLLECTION),
    where('followedId', '==', userId),
  );

  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}

/**
 * Get following count for a user
 * @param {import('../types/common').UserId} userId
 * @returns {Promise<number>}
 */
export async function getFollowingCount(userId) {
  if (!userId) return 0;

  const q = query(
    collection(db, FOLLOWS_COLLECTION),
    where('followerId', '==', userId),
  );

  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}
