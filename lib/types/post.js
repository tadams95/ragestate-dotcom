/**
 * Post Type Definitions
 * Matches Firestore schema for posts and related content
 */

// ============================================
// POST DOCUMENT (posts/{postId})
// ============================================

/**
 * Post document stored in /posts/{postId}
 * @typedef {Object} Post
 * @property {string} id - Post document ID
 * @property {import('./common').UserId} userId - Author's Firebase Auth UID
 * @property {string} [userDisplayName] - Author's display name at time of posting
 * @property {string} [usernameLower] - Author's lowercase username
 * @property {string} [userProfilePicture] - Author's profile picture at time of posting
 * @property {string} content - Post text content
 * @property {string[]} [mediaUrls] - Array of media URLs (images/videos)
 * @property {boolean} isPublic - Whether post is publicly visible
 * @property {number} likeCount - Number of likes
 * @property {number} commentCount - Number of comments
 * @property {number} [repostCount] - Number of reposts
 * @property {number} [shareCount] - Number of shares
 * @property {Date} timestamp - When the post was created
 * @property {Date} [updatedAt] - When the post was last edited
 * @property {boolean} [isDeleted] - Soft delete flag
 * @property {Date} [deletedAt] - When post was deleted
 */

/**
 * Post for feed display (normalized from Firestore data)
 * @typedef {Object} FeedPost
 * @property {string} id - Post document ID
 * @property {import('./common').UserId} userId - Author's Firebase Auth UID
 * @property {string} author - Display name or username for rendering
 * @property {string|null} avatarUrl - Author's avatar URL
 * @property {string} [usernameLower] - Lowercase username for linking
 * @property {string} timestamp - Formatted timestamp string
 * @property {string} content - Post text content
 * @property {string[]} mediaUrls - Array of media URLs
 * @property {number} likeCount - Number of likes
 * @property {number} commentCount - Number of comments
 */

// ============================================
// LIKE (posts/{postId}/likes/{userId})
// ============================================

/**
 * Like document - stored as subcollection or as user's liked posts
 * @typedef {Object} Like
 * @property {import('./common').UserId} userId - User who liked
 * @property {string} postId - Post that was liked
 * @property {Date} createdAt - When the like occurred
 */

// ============================================
// COMMENT (posts/{postId}/comments/{commentId})
// ============================================

/**
 * Comment on a post
 * @typedef {Object} Comment
 * @property {string} id - Comment document ID
 * @property {string} postId - Parent post ID
 * @property {import('./common').UserId} userId - Commenter's user ID
 * @property {string} [userDisplayName] - Commenter's display name
 * @property {string} [usernameLower] - Commenter's lowercase username
 * @property {string} [userProfilePicture] - Commenter's profile picture
 * @property {string} content - Comment text
 * @property {number} [likeCount] - Number of likes on comment
 * @property {Date} createdAt - When the comment was created
 * @property {Date} [updatedAt] - When the comment was edited
 * @property {boolean} [isDeleted] - Soft delete flag
 */

// ============================================
// REPOST (posts/{postId} with repost fields)
// ============================================

/**
 * Repost - a post that references another post
 * @typedef {Object} Repost
 * @property {string} id - Repost document ID
 * @property {import('./common').UserId} userId - User who reposted
 * @property {string} originalPostId - ID of the original post
 * @property {import('./common').UserId} originalAuthorId - Original post author's user ID
 * @property {string} [content] - Optional quote text added to repost
 * @property {boolean} isRepost - Always true for reposts
 * @property {Date} timestamp - When the repost was created
 */

// ============================================
// POST ACTIONS STATE
// ============================================

/**
 * State for post action buttons (like, comment, repost)
 * @typedef {Object} PostActionState
 * @property {boolean} isLiked - Whether current user has liked
 * @property {boolean} isReposted - Whether current user has reposted
 * @property {number} likeCount - Current like count
 * @property {number} commentCount - Current comment count
 * @property {number} repostCount - Current repost count
 */

// Export empty object to make this a module
export {};
