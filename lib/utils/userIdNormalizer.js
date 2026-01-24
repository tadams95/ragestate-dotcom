/**
 * User ID Normalizer
 * Utilities for handling inconsistent user ID field names across the codebase
 *
 * CONVENTION: Use "userId" in all new code. These utilities help normalize
 * legacy data that may use different field names.
 */

/**
 * Known user ID field names used across the codebase
 * Ordered by preference (most common first)
 */
const USER_ID_FIELDS = [
  'userId',       // Preferred/standard
  'uid',          // Firebase Auth default
  'firebaseId',   // Legacy (tickets/ragers)
  'customerId',   // Purchases/billing
  'senderId',     // Chat messages
  'authorId',     // Posts/content
  'followerId',   // Follow relationships
  'followedId',   // Follow relationships
  'fromUserId',   // Transfers
  'toUserId',     // Transfers
  'ownerId',      // Generic ownership
];

// ============================================
// EXTRACTION FUNCTIONS
// ============================================

/**
 * Extract user ID from an object that may use various field names
 * Returns the first matching field value found
 * @param {Object} data - Object containing user ID under some field name
 * @param {string[]} [preferredFields] - Optional list of fields to check first
 * @returns {import('../types/common').UserId | null}
 * @example
 * extractUserId({ uid: 'abc123' }) // returns 'abc123'
 * extractUserId({ customerId: 'xyz789' }) // returns 'xyz789'
 * extractUserId({ foo: 'bar' }) // returns null
 */
export function extractUserId(data, preferredFields = []) {
  if (!data || typeof data !== 'object') return null;

  // Check preferred fields first
  for (const field of preferredFields) {
    if (data[field] && typeof data[field] === 'string') {
      return data[field];
    }
  }

  // Then check standard fields
  for (const field of USER_ID_FIELDS) {
    if (data[field] && typeof data[field] === 'string') {
      return data[field];
    }
  }

  return null;
}

/**
 * Get the field name that contains the user ID
 * Useful for understanding which legacy field is in use
 * @param {Object} data - Object containing user ID under some field name
 * @returns {string | null} - The field name, or null if not found
 * @example
 * getUserIdField({ uid: 'abc123' }) // returns 'uid'
 * getUserIdField({ customerId: 'xyz789' }) // returns 'customerId'
 */
export function getUserIdField(data) {
  if (!data || typeof data !== 'object') return null;

  for (const field of USER_ID_FIELDS) {
    if (data[field] && typeof data[field] === 'string') {
      return field;
    }
  }

  return null;
}

// ============================================
// NORMALIZATION FUNCTIONS
// ============================================

/**
 * Normalize an object to use standard 'userId' field
 * Creates a new object with userId set and original field preserved
 * @param {Object} data - Object with user ID under some field name
 * @returns {Object} - New object with userId field added
 * @example
 * normalizeUserId({ uid: 'abc123', name: 'John' })
 * // returns { uid: 'abc123', name: 'John', userId: 'abc123' }
 */
export function normalizeUserId(data) {
  if (!data || typeof data !== 'object') return data;

  const userId = extractUserId(data);
  if (!userId) return data;

  // If already has userId, return as-is
  if (data.userId === userId) return data;

  return {
    ...data,
    userId,
  };
}

/**
 * Normalize an array of objects to use standard 'userId' field
 * @param {Object[]} items - Array of objects
 * @returns {Object[]} - New array with userId normalized
 */
export function normalizeUserIds(items) {
  if (!Array.isArray(items)) return items;
  return items.map(normalizeUserId);
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Check if an object has a user ID (under any known field name)
 * @param {Object} data - Object to check
 * @returns {boolean}
 */
export function hasUserId(data) {
  return extractUserId(data) !== null;
}

/**
 * Check if two objects refer to the same user
 * Handles different field names for user IDs
 * @param {Object} a - First object
 * @param {Object} b - Second object
 * @returns {boolean}
 */
export function isSameUser(a, b) {
  const userIdA = extractUserId(a);
  const userIdB = extractUserId(b);

  if (!userIdA || !userIdB) return false;
  return userIdA === userIdB;
}

// ============================================
// FIELD NAME CONSTANTS
// ============================================

/**
 * Standard user ID field name - use this in new code
 */
export const STANDARD_USER_ID_FIELD = 'userId';

/**
 * All known user ID field names
 */
export const ALL_USER_ID_FIELDS = [...USER_ID_FIELDS];
