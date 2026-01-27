/**
 * Relationship Service - Firestore operations for blocks and mutes
 * Collections: blocks/{blockerId}_{blockedId}, mutes/{muterId}_{mutedId}
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/firebase';

const BLOCKS_COLLECTION = 'blocks';
const BLOCKED_BY_COLLECTION = 'blockedBy';
const MUTES_COLLECTION = 'mutes';

// ============================================
// BLOCK OPERATIONS
// ============================================

/**
 * Generate document ID for a block
 * @param {string} blockerId
 * @param {string} blockedId
 * @returns {string}
 */
function getBlockDocId(blockerId, blockedId) {
  return `${blockerId}_${blockedId}`;
}

/**
 * Check if a user has blocked another user
 * @param {string} blockerId
 * @param {string} blockedId
 * @returns {Promise<boolean>}
 */
export async function isBlocked(blockerId, blockedId) {
  if (!blockerId || !blockedId) return false;

  const docId = getBlockDocId(blockerId, blockedId);
  const blockRef = doc(db, BLOCKS_COLLECTION, docId);
  const snap = await getDoc(blockRef);

  return snap.exists();
}

/**
 * Block a user
 * @param {string} blockerId
 * @param {string} blockedId
 * @returns {Promise<void>}
 */
export async function blockUser(blockerId, blockedId) {
  if (!blockerId || !blockedId) {
    throw new Error('blockerId and blockedId are required');
  }

  if (blockerId === blockedId) {
    throw new Error('Cannot block yourself');
  }

  const docId = getBlockDocId(blockerId, blockedId);
  const blockRef = doc(db, BLOCKS_COLLECTION, docId);

  await setDoc(blockRef, {
    blockerId,
    blockedId,
    createdAt: serverTimestamp(),
  });
}

/**
 * Unblock a user
 * @param {string} blockerId
 * @param {string} blockedId
 * @returns {Promise<void>}
 */
export async function unblockUser(blockerId, blockedId) {
  if (!blockerId || !blockedId) {
    throw new Error('blockerId and blockedId are required');
  }

  const docId = getBlockDocId(blockerId, blockedId);
  const blockRef = doc(db, BLOCKS_COLLECTION, docId);

  await deleteDoc(blockRef);
}

/**
 * Toggle block status for a user
 * @param {string} blockerId
 * @param {string} blockedId
 * @returns {Promise<boolean>} - Returns true if now blocked, false if unblocked
 */
export async function toggleBlock(blockerId, blockedId) {
  const blocked = await isBlocked(blockerId, blockedId);

  if (blocked) {
    await unblockUser(blockerId, blockedId);
    return false;
  } else {
    await blockUser(blockerId, blockedId);
    return true;
  }
}

/**
 * Get all users blocked by a user (paginated)
 * @param {string} userId
 * @param {any} [lastDoc] - Last document for pagination
 * @param {number} [pageSize=20]
 * @returns {Promise<{blocks: Array<{blockedId: string, createdAt: Date}>, lastDoc: any}>}
 */
export async function getBlockedUsers(userId, lastDoc = null, pageSize = 20) {
  if (!userId) return { blocks: [], lastDoc: null };

  const constraints = [
    where('blockerId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  ];

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(collection(db, BLOCKS_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  const blocks = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      blockedId: data.blockedId,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
    };
  });

  const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

  return { blocks, lastDoc: newLastDoc };
}

/**
 * Get all blocked user IDs for a user (for filtering)
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function getBlockedUserIds(userId) {
  if (!userId) return [];

  const q = query(
    collection(db, BLOCKS_COLLECTION),
    where('blockerId', '==', userId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => docSnap.data().blockedId);
}

/**
 * Get IDs of users who have blocked this user (for mutual invisibility)
 * Queries both blocks collection (original) and blockedBy collection (reverse index from Cloud Function)
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function getBlockedByUserIds(userId) {
  if (!userId) return [];

  // Query both collections for robustness
  const [blocksSnapshot, blockedBySnapshot] = await Promise.all([
    // Original blocks collection query
    getDocs(
      query(collection(db, BLOCKS_COLLECTION), where('blockedId', '==', userId))
    ),
    // Reverse index collection (populated by Cloud Function)
    getDocs(
      query(collection(db, BLOCKED_BY_COLLECTION), where('userId', '==', userId))
    ),
  ]);

  // Combine results from both collections
  const blockerIds = new Set();
  blocksSnapshot.docs.forEach((docSnap) => {
    const blockerId = docSnap.data().blockerId;
    if (blockerId) blockerIds.add(blockerId);
  });
  blockedBySnapshot.docs.forEach((docSnap) => {
    const blockerId = docSnap.data().blockedByUserId;
    if (blockerId) blockerIds.add(blockerId);
  });

  return Array.from(blockerIds);
}

// ============================================
// MUTE OPERATIONS
// ============================================

/**
 * Generate document ID for a mute
 * @param {string} muterId
 * @param {string} mutedId
 * @returns {string}
 */
function getMuteDocId(muterId, mutedId) {
  return `${muterId}_${mutedId}`;
}

/**
 * Check if a user has muted another user
 * @param {string} muterId
 * @param {string} mutedId
 * @returns {Promise<boolean>}
 */
export async function isMuted(muterId, mutedId) {
  if (!muterId || !mutedId) return false;

  const docId = getMuteDocId(muterId, mutedId);
  const muteRef = doc(db, MUTES_COLLECTION, docId);
  const snap = await getDoc(muteRef);

  return snap.exists();
}

/**
 * Mute a user
 * @param {string} muterId
 * @param {string} mutedId
 * @param {'all' | 'mentions' | 'replies'} [muteType='all']
 * @returns {Promise<void>}
 */
export async function muteUser(muterId, mutedId, muteType = 'all') {
  if (!muterId || !mutedId) {
    throw new Error('muterId and mutedId are required');
  }

  if (muterId === mutedId) {
    throw new Error('Cannot mute yourself');
  }

  const docId = getMuteDocId(muterId, mutedId);
  const muteRef = doc(db, MUTES_COLLECTION, docId);

  await setDoc(muteRef, {
    muterId,
    mutedId,
    muteType,
    createdAt: serverTimestamp(),
  });
}

/**
 * Unmute a user
 * @param {string} muterId
 * @param {string} mutedId
 * @returns {Promise<void>}
 */
export async function unmuteUser(muterId, mutedId) {
  if (!muterId || !mutedId) {
    throw new Error('muterId and mutedId are required');
  }

  const docId = getMuteDocId(muterId, mutedId);
  const muteRef = doc(db, MUTES_COLLECTION, docId);

  await deleteDoc(muteRef);
}

/**
 * Toggle mute status for a user
 * @param {string} muterId
 * @param {string} mutedId
 * @param {'all' | 'mentions' | 'replies'} [muteType='all']
 * @returns {Promise<boolean>} - Returns true if now muted, false if unmuted
 */
export async function toggleMute(muterId, mutedId, muteType = 'all') {
  const muted = await isMuted(muterId, mutedId);

  if (muted) {
    await unmuteUser(muterId, mutedId);
    return false;
  } else {
    await muteUser(muterId, mutedId, muteType);
    return true;
  }
}

/**
 * Get all muted user IDs for a user
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function getMutedUserIds(userId) {
  if (!userId) return [];

  const q = query(
    collection(db, MUTES_COLLECTION),
    where('muterId', '==', userId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => docSnap.data().mutedId);
}

/**
 * Get all muted users with details (for settings)
 * @param {string} userId
 * @returns {Promise<Array<{mutedId: string, muteType: string, createdAt: Date}>>}
 */
export async function getMutedUsers(userId) {
  if (!userId) return [];

  const q = query(
    collection(db, MUTES_COLLECTION),
    where('muterId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      mutedId: data.mutedId,
      muteType: data.muteType,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
    };
  });
}

// ============================================
// COMBINED OPERATIONS (for feed filtering)
// ============================================

/**
 * Get all user IDs that should be excluded from feed
 * (blocked users + users who blocked current user + muted users)
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function getExcludedUserIds(userId) {
  if (!userId) return [];

  const [blockedIds, blockedByIds, mutedIds] = await Promise.all([
    getBlockedUserIds(userId),
    getBlockedByUserIds(userId),
    getMutedUserIds(userId),
  ]);

  // Combine and dedupe
  const allIds = new Set([...blockedIds, ...blockedByIds, ...mutedIds]);
  return Array.from(allIds);
}

/**
 * Check relationship status between two users
 * @param {string} currentUserId
 * @param {string} targetUserId
 * @returns {Promise<{isBlocked: boolean, isMuted: boolean, isBlockedBy: boolean}>}
 */
export async function getRelationshipStatus(currentUserId, targetUserId) {
  if (!currentUserId || !targetUserId) {
    return { isBlocked: false, isMuted: false, isBlockedBy: false };
  }

  const [blocked, muted, blockedBy] = await Promise.all([
    isBlocked(currentUserId, targetUserId),
    isMuted(currentUserId, targetUserId),
    isBlocked(targetUserId, currentUserId),
  ]);

  return {
    isBlocked: blocked,
    isMuted: muted,
    isBlockedBy: blockedBy,
  };
}
