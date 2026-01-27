/**
 * Reaction Service - Firestore operations for emoji reactions on posts
 * Collection: postReactions/{postId}_{userId}_{emoji}
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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/firebase';

const REACTIONS_COLLECTION = 'postReactions';

/** Supported reaction emojis */
export const REACTION_EMOJIS = ['👍', '❤️', '🔥', '😂', '😮', '😢'];

// ============================================
// REACTION OPERATIONS
// ============================================

/**
 * Generate document ID for a reaction
 * @param {string} postId
 * @param {string} userId
 * @param {string} emoji
 * @returns {string}
 */
function getReactionDocId(postId, userId, emoji) {
  // Encode emoji to avoid special character issues in doc IDs
  const emojiCode = emoji.codePointAt(0).toString(16);
  return `${postId}_${userId}_${emojiCode}`;
}

/**
 * Add a reaction to a post
 * @param {string} postId
 * @param {string} userId
 * @param {string} emoji
 * @param {string} postOwnerId - For notification purposes
 * @returns {Promise<void>}
 */
export async function addReaction(postId, userId, emoji, postOwnerId) {
  if (!postId || !userId || !emoji) {
    throw new Error('postId, userId, and emoji are required');
  }

  if (!REACTION_EMOJIS.includes(emoji)) {
    throw new Error('Invalid emoji reaction');
  }

  const docId = getReactionDocId(postId, userId, emoji);
  const reactionRef = doc(db, REACTIONS_COLLECTION, docId);

  await setDoc(reactionRef, {
    postId,
    userId,
    emoji,
    postOwnerId: postOwnerId || null,
    createdAt: serverTimestamp(),
  });
}

/**
 * Remove a reaction from a post
 * @param {string} postId
 * @param {string} userId
 * @param {string} emoji
 * @returns {Promise<void>}
 */
export async function removeReaction(postId, userId, emoji) {
  if (!postId || !userId || !emoji) {
    throw new Error('postId, userId, and emoji are required');
  }

  const docId = getReactionDocId(postId, userId, emoji);
  const reactionRef = doc(db, REACTIONS_COLLECTION, docId);

  await deleteDoc(reactionRef);
}

/**
 * Check if a user has reacted with a specific emoji
 * @param {string} postId
 * @param {string} userId
 * @param {string} emoji
 * @returns {Promise<boolean>}
 */
export async function hasReacted(postId, userId, emoji) {
  if (!postId || !userId || !emoji) return false;

  const docId = getReactionDocId(postId, userId, emoji);
  const reactionRef = doc(db, REACTIONS_COLLECTION, docId);
  const snap = await getDoc(reactionRef);

  return snap.exists();
}

/**
 * Toggle a reaction on a post
 * @param {string} postId
 * @param {string} userId
 * @param {string} emoji
 * @param {string} postOwnerId
 * @returns {Promise<boolean>} - Returns true if reaction added, false if removed
 */
export async function toggleReaction(postId, userId, emoji, postOwnerId) {
  const exists = await hasReacted(postId, userId, emoji);

  if (exists) {
    await removeReaction(postId, userId, emoji);
    return false;
  } else {
    await addReaction(postId, userId, emoji, postOwnerId);
    return true;
  }
}

/**
 * Get all reactions for a post, aggregated by emoji
 * @param {string} postId
 * @returns {Promise<{[emoji: string]: {count: number, users: string[]}}>}
 */
export async function getReactionsForPost(postId) {
  if (!postId) return {};

  const q = query(
    collection(db, REACTIONS_COLLECTION),
    where('postId', '==', postId)
  );

  const snapshot = await getDocs(q);

  /** @type {{[emoji: string]: {count: number, users: string[]}}} */
  const aggregated = {};

  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const { emoji, userId } = data;

    if (!aggregated[emoji]) {
      aggregated[emoji] = { count: 0, users: [] };
    }

    aggregated[emoji].count += 1;
    aggregated[emoji].users.push(userId);
  });

  return aggregated;
}

/**
 * Get all reactions by a specific user on a post
 * @param {string} postId
 * @param {string} userId
 * @returns {Promise<string[]>} - Array of emojis the user has reacted with
 */
export async function getUserReactionsForPost(postId, userId) {
  if (!postId || !userId) return [];

  const q = query(
    collection(db, REACTIONS_COLLECTION),
    where('postId', '==', postId),
    where('userId', '==', userId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => docSnap.data().emoji);
}
