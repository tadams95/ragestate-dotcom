/**
 * Chat Type Definitions
 * Matches Firestore schema for cross-platform compatibility with mobile app
 */

/**
 * @typedef {'dm' | 'event'} ChatType
 */

/**
 * @typedef {'sending' | 'sent' | 'delivered' | 'read'} MessageStatus
 */

/**
 * @typedef {'text' | 'image' | 'video'} MessageType
 */

/**
 * User info helper for display purposes
 * Used when fetching user data from customers + profiles collections
 * @typedef {Object} UserInfo
 * @property {string} userId
 * @property {string} displayName
 * @property {string|null} photoURL
 * @property {string|null} username
 */

/**
 * Last message preview stored on chat document
 * @typedef {Object} LastMessage
 * @property {string} text
 * @property {string} senderId
 * @property {string} [senderName]
 * @property {Date} createdAt
 * @property {MessageType} type
 */

/**
 * Chat document in /chats/{chatId}
 * @typedef {Object} Chat
 * @property {string} id
 * @property {ChatType} type
 * @property {string[]} members
 * @property {number} memberCount
 * @property {number} [maxMembers]
 * @property {Date} createdAt
 * @property {Date} updatedAt
 * @property {boolean} isActive
 * @property {LastMessage|null} lastMessage
 * @property {string} [eventId] - Event chat specific
 * @property {string} [eventName] - Event chat specific
 * @property {Date} [eventDate] - Event chat specific
 */

/**
 * Message document in /chats/{chatId}/messages/{messageId}
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} chatId
 * @property {string} senderId
 * @property {string} senderName
 * @property {string|null} senderPhoto
 * @property {string|null} text
 * @property {string} [mediaUrl]
 * @property {'image'|'video'} [mediaType]
 * @property {Date} createdAt
 * @property {MessageStatus} status
 */

/**
 * Chat summary stored per-user in /users/{userId}/chatSummaries/{chatId}
 * Used for chat list display
 * @typedef {Object} ChatSummary
 * @property {string} chatId
 * @property {ChatType} type
 * @property {LastMessage|null} lastMessage
 * @property {number} unreadCount
 * @property {boolean} muted
 * @property {Date} updatedAt
 * @property {string} [peerId] - DM specific
 * @property {string} [peerName] - DM specific
 * @property {string} [peerPhoto] - DM specific
 * @property {string} [eventId] - Event chat specific
 * @property {string} [eventName] - Event chat specific
 */

// Export empty object to make this a module
export {};
