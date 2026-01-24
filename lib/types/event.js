/**
 * Event Type Definitions
 * Matches Firestore schema for events, tickets, and transfers
 */

// ============================================
// EVENT DOCUMENT (events/{eventId})
// ============================================

/**
 * Event document stored in /events/{eventId}
 * @typedef {Object} Event
 * @property {string} id - Event document ID
 * @property {string} name - Event name
 * @property {string} [slug] - URL-friendly slug
 * @property {string} [description] - Event description
 * @property {Date} date - Event date/time
 * @property {Date} [endDate] - Event end date/time
 * @property {string} [venue] - Venue name
 * @property {string} [address] - Venue address
 * @property {string} [city] - City
 * @property {string} [state] - State/province
 * @property {string} [country] - Country
 * @property {string} [imageUrl] - Event cover image URL
 * @property {string} [thumbnailUrl] - Event thumbnail URL
 * @property {TicketTier[]} [ticketTiers] - Available ticket tiers
 * @property {import('./common').AmountCents} [minPrice] - Minimum ticket price in cents
 * @property {import('./common').AmountCents} [maxPrice] - Maximum ticket price in cents
 * @property {number} [capacity] - Maximum attendee capacity
 * @property {number} [ticketsSold] - Number of tickets sold
 * @property {boolean} [isSoldOut] - Whether event is sold out
 * @property {boolean} [isPublished] - Whether event is publicly visible
 * @property {boolean} [isActive] - Whether event is active
 * @property {Date} [createdAt] - When event was created
 * @property {Date} [updatedAt] - When event was last updated
 */

/**
 * Ticket tier/type for an event
 * @typedef {Object} TicketTier
 * @property {string} id - Tier ID
 * @property {string} name - Tier name (e.g., "General Admission", "VIP")
 * @property {string} [description] - Tier description
 * @property {import('./common').AmountCents} price - Price in cents
 * @property {number} [quantity] - Available quantity
 * @property {number} [sold] - Number sold
 * @property {number} [maxPerOrder] - Max tickets per order
 * @property {boolean} [isActive] - Whether tier is available
 */

// ============================================
// TICKET DOCUMENT (purchases/{purchaseId}/tickets/{ticketId})
// ============================================

/**
 * Ticket document - represents a purchased ticket
 * @typedef {Object} Ticket
 * @property {string} id - Ticket document ID
 * @property {string} ticketId - Unique ticket identifier/code
 * @property {string} purchaseId - Parent purchase ID
 * @property {string} eventId - Associated event ID
 * @property {string} eventName - Event name at time of purchase
 * @property {Date} eventDate - Event date
 * @property {import('./common').UserId} userId - Ticket owner's user ID
 * @property {string} [ownerEmail] - Owner's email
 * @property {string} [ownerName] - Owner's name
 * @property {string} tierName - Ticket tier name
 * @property {import('./common').AmountCents} price - Price paid in cents
 * @property {number} [quantity] - Number of tickets (for multi-ticket purchases)
 * @property {number} [ticketQuantity] - Alternative quantity field
 * @property {TicketStatus} status - Current ticket status
 * @property {boolean} [active] - Whether ticket is active
 * @property {number} [usedCount] - Number of times scanned/used
 * @property {Date} [usedAt] - When ticket was used/scanned
 * @property {string} [qrCode] - QR code data
 * @property {Date} createdAt - When ticket was created
 * @property {Date} [transferredAt] - When ticket was transferred (if applicable)
 */

/**
 * Ticket status values
 * @typedef {'active' | 'used' | 'expired' | 'cancelled' | 'transferred'} TicketStatus
 */

// ============================================
// TICKET TRANSFER
// ============================================

/**
 * Ticket transfer record
 * @typedef {Object} TicketTransfer
 * @property {string} id - Transfer document ID
 * @property {string} ticketId - Ticket being transferred
 * @property {string} eventId - Associated event ID
 * @property {import('./common').UserId} fromUserId - Original owner
 * @property {string} [fromEmail] - Original owner's email
 * @property {import('./common').UserId} [toUserId] - New owner (if claimed)
 * @property {string} toEmail - Recipient email
 * @property {TransferStatus} status - Transfer status
 * @property {string} [transferCode] - Unique code for claiming
 * @property {Date} createdAt - When transfer was initiated
 * @property {Date} [claimedAt] - When transfer was claimed
 * @property {Date} [expiresAt] - When transfer expires
 */

/**
 * Transfer status values
 * @typedef {'pending' | 'claimed' | 'expired' | 'cancelled'} TransferStatus
 */

// ============================================
// EVENT CHAT (linked from events)
// ============================================

/**
 * Event chat reference
 * @typedef {Object} EventChatRef
 * @property {string} chatId - Associated chat ID
 * @property {string} eventId - Event ID
 * @property {string} eventName - Event name
 * @property {Date} eventDate - Event date
 */

// Export empty object to make this a module
export {};
