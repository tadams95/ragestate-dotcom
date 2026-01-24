/**
 * Soft Delete Utilities
 * Functions for soft-deleting Firestore documents instead of hard deleting
 *
 * CONVENTION: Soft-deleted documents have:
 * - isDeleted: true
 * - deletedAt: Timestamp
 * - deletedBy: UserId (optional)
 */

import {
  doc,
  updateDoc,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase/firebase';

// ============================================
// SOFT DELETE OPERATIONS
// ============================================

/**
 * Soft delete a document by setting isDeleted flag
 * @param {string} collectionPath - Collection path (e.g., 'posts', 'comments')
 * @param {string} docId - Document ID
 * @param {import('../types/common').UserId} [deletedByUserId] - User performing the deletion
 * @returns {Promise<void>}
 * @example
 * await softDelete('posts', 'post123', currentUser.uid);
 */
export async function softDelete(collectionPath, docId, deletedByUserId = null) {
  if (!collectionPath || !docId) {
    throw new Error('collectionPath and docId are required');
  }

  const docRef = doc(db, collectionPath, docId);

  const updateData = {
    isDeleted: true,
    deletedAt: serverTimestamp(),
  };

  if (deletedByUserId) {
    updateData.deletedBy = deletedByUserId;
  }

  await updateDoc(docRef, updateData);
}

/**
 * Restore a soft-deleted document
 * @param {string} collectionPath - Collection path
 * @param {string} docId - Document ID
 * @returns {Promise<void>}
 * @example
 * await restoreDeleted('posts', 'post123');
 */
export async function restoreDeleted(collectionPath, docId) {
  if (!collectionPath || !docId) {
    throw new Error('collectionPath and docId are required');
  }

  const docRef = doc(db, collectionPath, docId);

  await updateDoc(docRef, {
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
  });
}

// ============================================
// QUERY HELPERS
// ============================================

/**
 * Create a Firestore where clause to filter out deleted documents
 * Use in queries to exclude soft-deleted items
 * @returns {import('firebase/firestore').QueryConstraint}
 * @example
 * const q = query(
 *   collection(db, 'posts'),
 *   notDeleted(),
 *   orderBy('timestamp', 'desc')
 * );
 */
export function notDeleted() {
  return where('isDeleted', '!=', true);
}

/**
 * Create a Firestore where clause to get only deleted documents
 * Use for admin trash/recovery views
 * @returns {import('firebase/firestore').QueryConstraint}
 * @example
 * const q = query(
 *   collection(db, 'posts'),
 *   onlyDeleted(),
 *   orderBy('deletedAt', 'desc')
 * );
 */
export function onlyDeleted() {
  return where('isDeleted', '==', true);
}

// ============================================
// FILTER HELPERS (for client-side filtering)
// ============================================

/**
 * Filter an array to exclude soft-deleted items
 * Use when you've already fetched data and need to filter client-side
 * @template T
 * @param {T[]} items - Array of items that may have isDeleted field
 * @returns {T[]} - Filtered array without deleted items
 * @example
 * const activePosts = filterNotDeleted(allPosts);
 */
export function filterNotDeleted(items) {
  if (!Array.isArray(items)) return items;
  return items.filter((item) => !item.isDeleted);
}

/**
 * Filter an array to get only soft-deleted items
 * Use for trash/recovery views
 * @template T
 * @param {T[]} items - Array of items that may have isDeleted field
 * @returns {T[]} - Filtered array with only deleted items
 */
export function filterOnlyDeleted(items) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => item.isDeleted === true);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if a document/object is soft-deleted
 * @param {Object} data - Document data
 * @returns {boolean}
 */
export function isDeleted(data) {
  return data?.isDeleted === true;
}

/**
 * Add soft delete fields to an object (for creating documents with delete capability)
 * Sets isDeleted to false initially
 * @param {Object} data - Document data
 * @returns {Object} - Data with soft delete fields
 */
export function withSoftDeleteFields(data) {
  return {
    ...data,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
  };
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Soft delete multiple documents
 * @param {string} collectionPath - Collection path
 * @param {string[]} docIds - Array of document IDs
 * @param {import('../types/common').UserId} [deletedByUserId] - User performing the deletion
 * @returns {Promise<void>}
 */
export async function softDeleteMany(collectionPath, docIds, deletedByUserId = null) {
  if (!collectionPath || !Array.isArray(docIds)) {
    throw new Error('collectionPath and docIds array are required');
  }

  const promises = docIds.map((docId) =>
    softDelete(collectionPath, docId, deletedByUserId)
  );

  await Promise.all(promises);
}

/**
 * Restore multiple soft-deleted documents
 * @param {string} collectionPath - Collection path
 * @param {string[]} docIds - Array of document IDs
 * @returns {Promise<void>}
 */
export async function restoreDeletedMany(collectionPath, docIds) {
  if (!collectionPath || !Array.isArray(docIds)) {
    throw new Error('collectionPath and docIds array are required');
  }

  const promises = docIds.map((docId) =>
    restoreDeleted(collectionPath, docId)
  );

  await Promise.all(promises);
}
