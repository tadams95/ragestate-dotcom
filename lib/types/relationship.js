/**
 * Relationship Type Definitions
 * Types for blocks, mutes, and content reports
 */

// ============================================
// BLOCK (blocks/{blockerId}_{blockedId})
// ============================================

/**
 * Block document - prevents users from seeing each other's content
 * @typedef {Object} Block
 * @property {import('./common').UserId} blockerId - User who initiated the block
 * @property {import('./common').UserId} blockedId - User who is blocked
 * @property {Date} createdAt - When the block was created
 */

// ============================================
// MUTE (mutes/{muterId}_{mutedId})
// ============================================

/**
 * Mute type options
 * @typedef {'all' | 'mentions' | 'replies'} MuteType
 */

/**
 * Mute document - hides user's content without blocking
 * @typedef {Object} Mute
 * @property {import('./common').UserId} muterId - User who initiated the mute
 * @property {import('./common').UserId} mutedId - User who is muted
 * @property {MuteType} muteType - Type of mute applied
 * @property {Date} createdAt - When the mute was created
 */

// ============================================
// RELATIONSHIP STATE (Redux)
// ============================================

/**
 * Relationship state for Redux store
 * @typedef {Object} RelationshipState
 * @property {string[]} blockedUserIds - IDs of users the current user has blocked
 * @property {string[]} mutedUserIds - IDs of users the current user has muted
 * @property {string[]} blockedByUserIds - IDs of users who have blocked the current user
 * @property {boolean} isLoading - Whether relationship data is being loaded
 * @property {number} lastFetchedAt - Timestamp of last fetch (for cache invalidation)
 */

// Export empty object to make this a module
export {};
