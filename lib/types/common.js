/**
 * Common Type Definitions
 * Shared types used across the RAGESTATE application
 */

// ============================================
// CORE IDENTIFIERS
// ============================================

/**
 * Firebase Auth UID - standardized name for user identifiers
 * Use "userId" consistently in new code instead of uid, firebaseId, customerId, etc.
 * @typedef {string} UserId
 */

/**
 * Firestore document ID
 * @typedef {string} DocumentId
 */

// ============================================
// MONETARY AMOUNTS
// ============================================

/**
 * Integer cents - NEVER use strings or floats for money
 * All monetary amounts should be stored and calculated in cents
 * Example: $10.99 = 1099 cents
 * @typedef {number} AmountCents
 */

// ============================================
// TIMESTAMPS
// ============================================

/**
 * Firestore Timestamp type
 * @typedef {Object} FirestoreTimestamp
 * @property {() => Date} toDate - Converts to JavaScript Date
 * @property {number} seconds - Seconds since epoch
 * @property {number} nanoseconds - Nanoseconds
 */

/**
 * Timestamp that can be either a Firestore Timestamp or JavaScript Date
 * @typedef {FirestoreTimestamp | Date} Timestamp
 */

// ============================================
// SOFT DELETE
// ============================================

/**
 * Soft delete fields - add to entities that support soft deletion
 * @typedef {Object} SoftDeletable
 * @property {boolean} [isDeleted] - True if soft deleted
 * @property {Date} [deletedAt] - When the entity was deleted
 * @property {UserId} [deletedBy] - Who deleted the entity
 */

// ============================================
// PAGINATION
// ============================================

/**
 * Firestore DocumentSnapshot for pagination cursors
 * @typedef {Object} DocumentSnapshot
 * @property {string} id - Document ID
 * @property {() => Object} data - Returns document data
 * @property {boolean} exists - Whether document exists
 */

/**
 * Paginated response wrapper
 * @template T
 * @typedef {Object} PaginatedResponse
 * @property {T[]} items - The paginated items
 * @property {DocumentSnapshot|null} lastDoc - Cursor for next page
 * @property {boolean} hasMore - Whether more items exist
 */

// ============================================
// COMMON ENUMS
// ============================================

/**
 * Standard status values used across entities
 * @typedef {'active' | 'inactive' | 'pending' | 'completed' | 'cancelled'} Status
 */

// Export empty object to make this a module
export {};
