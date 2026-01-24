/**
 * User Type Definitions
 * Matches Firestore schema for users, profiles, and customers collections
 */

// ============================================
// USER DOCUMENT (users/{userId})
// ============================================

/**
 * User document stored in RTDB /users/{userId}
 * Contains core account data
 * @typedef {Object} User
 * @property {import('./common').UserId} id - Firebase Auth UID
 * @property {string} email - User email address
 * @property {string} [name] - Full name
 * @property {string} [displayName] - Display name
 * @property {boolean} [isAdmin] - Admin flag
 * @property {string} [role] - User role (e.g., 'admin', 'user')
 * @property {Object} [permissions] - Permission flags
 * @property {boolean} [permissions.admin] - Admin permission
 * @property {Date|string} [createdAt] - Account creation date
 */

// ============================================
// PROFILE DOCUMENT (profiles/{userId})
// ============================================

/**
 * Public profile document stored in /profiles/{userId}
 * Contains public-facing user information
 * @typedef {Object} Profile
 * @property {import('./common').UserId} userId - Firebase Auth UID
 * @property {string} [displayName] - Display name
 * @property {string} [username] - Unique username
 * @property {string} [usernameLower] - Lowercase username for queries
 * @property {string} [bio] - User biography
 * @property {string} [photoURL] - Profile photo URL
 * @property {string} [profilePicture] - Alternative profile picture field
 * @property {string} [coverPhotoURL] - Cover photo URL
 * @property {string} [location] - User location
 * @property {string} [website] - Personal website URL
 * @property {number} [followerCount] - Number of followers
 * @property {number} [followingCount] - Number of users following
 * @property {number} [postCount] - Number of posts
 * @property {boolean} [isVerified] - Verification status
 * @property {Date} [createdAt] - Profile creation date
 * @property {Date} [updatedAt] - Last update date
 */

// ============================================
// CUSTOMER DOCUMENT (customers/{userId})
// ============================================

/**
 * Customer document stored in /customers/{userId}
 * Contains billing and purchase-related information
 * @typedef {Object} Customer
 * @property {import('./common').UserId} customerId - Firebase Auth UID (legacy field name)
 * @property {string} [email] - Customer email
 * @property {string} [displayName] - Display name
 * @property {string} [firstName] - First name
 * @property {string} [lastName] - Last name
 * @property {string} [username] - Username
 * @property {string} [profilePicture] - Profile picture URL
 * @property {string} [stripeCustomerId] - Stripe customer ID
 * @property {Date} [createdAt] - Customer record creation date
 */

// ============================================
// USERNAME MAPPING (usernames/{username})
// ============================================

/**
 * Username to UID mapping document
 * @typedef {Object} UsernameMapping
 * @property {import('./common').UserId} userId - The user's Firebase Auth UID
 * @property {string} username - The original cased username
 * @property {Date} createdAt - When the username was claimed
 */

// ============================================
// USER INFO HELPER
// ============================================

/**
 * Lightweight user info for display purposes
 * Used when fetching user data from multiple collections
 * @typedef {Object} UserInfo
 * @property {import('./common').UserId} userId - Firebase Auth UID
 * @property {string} displayName - Display name (with fallbacks)
 * @property {string|null} photoURL - Profile photo URL
 * @property {string|null} username - Username if available
 */

// ============================================
// FOLLOW RELATIONSHIP
// ============================================

/**
 * Follow relationship document
 * Stored in /users/{userId}/following/{followedUserId}
 * or /users/{userId}/followers/{followerUserId}
 * @typedef {Object} FollowRelationship
 * @property {import('./common').UserId} userId - The followed/follower user ID
 * @property {Date} createdAt - When the follow occurred
 */

// Export empty object to make this a module
export {};
