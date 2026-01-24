/**
 * Post Service - Firestore operations for posts and related content
 * Abstracts post, like, comment, and repost operations
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
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/firebase';

const POSTS_COLLECTION = 'posts';
const POST_LIKES_COLLECTION = 'postLikes';
const POST_REPOSTS_COLLECTION = 'postReposts';
const PAGE_SIZE = 10;

// ============================================
// POST READ OPERATIONS
// ============================================

/**
 * Get a single post by ID
 * @param {string} postId
 * @returns {Promise<import('../types/post').Post | null>}
 */
export async function getPost(postId) {
  if (!postId) return null;

  const postDoc = await getDoc(doc(db, POSTS_COLLECTION, postId));
  if (!postDoc.exists()) return null;

  const data = postDoc.data();
  return {
    id: postDoc.id,
    ...data,
    timestamp: data.timestamp?.toDate?.() || data.timestamp,
  };
}

/**
 * Get public posts for feed with pagination
 * @param {import('../types/common').DocumentSnapshot} [lastDoc] - Cursor for pagination
 * @param {number} [pageSize]
 * @returns {Promise<{posts: import('../types/post').Post[], lastDoc: import('../types/common').DocumentSnapshot | null}>}
 */
export async function getPublicPosts(lastDoc = null, pageSize = PAGE_SIZE) {
  const constraints = [
    where('isPublic', '==', true),
    orderBy('timestamp', 'desc'),
    limit(pageSize),
  ];

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(collection(db, POSTS_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  const posts = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      timestamp: data.timestamp?.toDate?.() || data.timestamp,
    };
  });

  const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

  return { posts, lastDoc: newLastDoc };
}

/**
 * Get posts by user ID with pagination
 * @param {import('../types/common').UserId} userId
 * @param {import('../types/common').DocumentSnapshot} [lastDoc]
 * @param {number} [pageSize]
 * @returns {Promise<{posts: import('../types/post').Post[], lastDoc: import('../types/common').DocumentSnapshot | null}>}
 */
export async function getPostsByUser(userId, lastDoc = null, pageSize = PAGE_SIZE) {
  if (!userId) return { posts: [], lastDoc: null };

  const constraints = [
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(pageSize),
  ];

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(collection(db, POSTS_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  const posts = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      timestamp: data.timestamp?.toDate?.() || data.timestamp,
    };
  });

  const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

  return { posts, lastDoc: newLastDoc };
}

// ============================================
// LIKE OPERATIONS
// ============================================

/**
 * Check if a user has liked a post
 * @param {string} postId
 * @param {import('../types/common').UserId} userId
 * @returns {Promise<boolean>}
 */
export async function hasLikedPost(postId, userId) {
  if (!postId || !userId) return false;

  const likeDocRef = doc(db, POST_LIKES_COLLECTION, `${postId}_${userId}`);
  const snap = await getDoc(likeDocRef);
  return snap.exists();
}

/**
 * Like a post
 * @param {string} postId
 * @param {import('../types/common').UserId} userId
 * @returns {Promise<void>}
 */
export async function likePost(postId, userId) {
  if (!postId || !userId) throw new Error('postId and userId are required');

  const likeDocRef = doc(db, POST_LIKES_COLLECTION, `${postId}_${userId}`);
  await setDoc(likeDocRef, {
    postId,
    userId,
    timestamp: serverTimestamp(),
  });
}

/**
 * Unlike a post
 * @param {string} postId
 * @param {import('../types/common').UserId} userId
 * @returns {Promise<void>}
 */
export async function unlikePost(postId, userId) {
  if (!postId || !userId) throw new Error('postId and userId are required');

  const likeDocRef = doc(db, POST_LIKES_COLLECTION, `${postId}_${userId}`);
  await deleteDoc(likeDocRef);
}

/**
 * Toggle like on a post
 * @param {string} postId
 * @param {import('../types/common').UserId} userId
 * @returns {Promise<boolean>} - Returns true if now liked, false if unliked
 */
export async function toggleLike(postId, userId) {
  const isLiked = await hasLikedPost(postId, userId);

  if (isLiked) {
    await unlikePost(postId, userId);
    return false;
  } else {
    await likePost(postId, userId);
    return true;
  }
}

// ============================================
// REPOST OPERATIONS
// ============================================

/**
 * Check if a user has reposted a post
 * @param {string} postId
 * @param {import('../types/common').UserId} userId
 * @returns {Promise<boolean>}
 */
export async function hasRepostedPost(postId, userId) {
  if (!postId || !userId) return false;

  const q = query(
    collection(db, POST_REPOSTS_COLLECTION),
    where('postId', '==', postId),
    where('userId', '==', userId),
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * Create a repost
 * @param {Object} params
 * @param {string} params.postId - Original post ID
 * @param {import('../types/common').UserId} params.userId - User creating the repost
 * @param {string} params.userDisplayName - User's display name
 * @param {string} [params.userPhoto] - User's photo URL
 * @param {Object} params.originalPost - Original post data for embedding
 * @returns {Promise<string>} - Returns the new repost post ID
 */
export async function createRepost({
  postId,
  userId,
  userDisplayName,
  userPhoto,
  originalPost,
}) {
  if (!postId || !userId) throw new Error('postId and userId are required');

  const batch = writeBatch(db);

  // Flatten repost chain: if original is a repost, link to the root
  const targetPostId = originalPost?.repostOf?.postId || postId;
  const targetAuthorId = originalPost?.repostOf?.authorId || originalPost?.userId;
  const targetAuthorName = originalPost?.repostOf?.authorName || originalPost?.author || originalPost?.usernameLower;
  const targetAuthorPhoto = originalPost?.repostOf?.authorPhoto || originalPost?.avatarUrl;
  const targetContent = originalPost?.repostOf?.content ?? originalPost?.content ?? '';
  const targetMediaUrls = originalPost?.repostOf?.mediaUrls || originalPost?.mediaUrls || [];
  const targetTimestamp = originalPost?.repostOf?.timestamp || originalPost?.timestamp || null;

  // Create repost record
  const repostRef = doc(db, POST_REPOSTS_COLLECTION, `${targetPostId}_${userId}`);
  const newPostRef = doc(collection(db, POSTS_COLLECTION));

  batch.set(repostRef, {
    postId: targetPostId,
    userId,
    timestamp: serverTimestamp(),
    originalAuthorId: targetAuthorId || null,
    repostPostId: newPostRef.id,
  });

  // Create the repost as a new post
  batch.set(newPostRef, {
    userId,
    usernameLower: userDisplayName?.toLowerCase() || 'unknown',
    userDisplayName: userDisplayName || 'Unknown',
    userProfilePicture: userPhoto || null,
    content: '',
    mediaUrls: [],
    timestamp: serverTimestamp(),
    isPublic: true,
    repostOf: {
      postId: targetPostId,
      authorId: targetAuthorId,
      authorName: targetAuthorName,
      authorPhoto: targetAuthorPhoto,
      content: targetContent,
      mediaUrls: targetMediaUrls,
      timestamp: targetTimestamp,
    },
    repostCount: 0,
    likeCount: 0,
    commentCount: 0,
  });

  await batch.commit();

  return newPostRef.id;
}

/**
 * Undo a repost
 * @param {string} postId - Original post ID
 * @param {import('../types/common').UserId} userId
 * @returns {Promise<void>}
 */
export async function undoRepost(postId, userId) {
  if (!postId || !userId) throw new Error('postId and userId are required');

  const q = query(
    collection(db, POST_REPOSTS_COLLECTION),
    where('postId', '==', postId),
    where('userId', '==', userId),
  );
  const snap = await getDocs(q);

  if (snap.empty) return;

  const repostDoc = snap.docs[0];
  const repostData = repostDoc.data();
  const batch = writeBatch(db);

  batch.delete(repostDoc.ref);

  if (repostData.repostPostId) {
    batch.delete(doc(db, POSTS_COLLECTION, repostData.repostPostId));
  }

  await batch.commit();
}

// ============================================
// POST CREATE/UPDATE OPERATIONS
// ============================================

/**
 * Create a new post
 * @param {Object} params
 * @param {import('../types/common').UserId} params.userId
 * @param {string} params.userDisplayName
 * @param {string} [params.usernameLower]
 * @param {string} [params.userProfilePicture]
 * @param {string} params.content
 * @param {string[]} [params.mediaUrls]
 * @param {boolean} [params.isPublic]
 * @returns {Promise<string>} - Returns the new post ID
 */
export async function createPost({
  userId,
  userDisplayName,
  usernameLower,
  userProfilePicture,
  content,
  mediaUrls = [],
  isPublic = true,
}) {
  if (!userId) throw new Error('userId is required');

  const postRef = doc(collection(db, POSTS_COLLECTION));

  await setDoc(postRef, {
    userId,
    userDisplayName: userDisplayName || 'Unknown',
    usernameLower: usernameLower || userDisplayName?.toLowerCase() || 'unknown',
    userProfilePicture: userProfilePicture || null,
    content: content || '',
    mediaUrls,
    isPublic,
    timestamp: serverTimestamp(),
    likeCount: 0,
    commentCount: 0,
    repostCount: 0,
  });

  return postRef.id;
}
