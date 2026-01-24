/**
 * Purchase Type Definitions
 * Matches Firestore schema for purchases, orders, and fulfillment
 */

// ============================================
// PURCHASE DOCUMENT (purchases/{purchaseId})
// ============================================

/**
 * Purchase/Order document stored in /purchases/{purchaseId}
 * Also stored per-user in /customers/{userId}/purchases/{purchaseId}
 * @typedef {Object} Purchase
 * @property {string} id - Purchase document ID
 * @property {string} [orderNumber] - Human-readable order number
 * @property {import('./common').UserId} customerId - Customer's Firebase Auth UID
 * @property {string} [customerName] - Customer name at time of purchase
 * @property {string} [customerEmail] - Customer email
 * @property {string} [name] - Alternative name field
 * @property {string} [email] - Alternative email field
 * @property {CartItem[]} cartItems - Items in the order
 * @property {import('./common').AmountCents} amount - Total amount in cents
 * @property {number} [totalAmount] - Alternative total field (may be dollars - check context)
 * @property {string} [currency] - Currency code (e.g., 'usd')
 * @property {PurchaseStatus} status - Order status
 * @property {string} [stripePaymentIntentId] - Stripe payment intent ID
 * @property {string} [stripeSessionId] - Stripe checkout session ID
 * @property {AddressDetails} [addressDetails] - Shipping address
 * @property {string} [shippingMethod] - Selected shipping method
 * @property {import('./common').AmountCents} [shippingCost] - Shipping cost in cents
 * @property {string} [promoCode] - Applied promo code
 * @property {import('./common').AmountCents} [discountAmount] - Discount in cents
 * @property {Date} orderDate - When order was placed
 * @property {Date} [dateTime] - Alternative date field
 * @property {Date} [createdAt] - Creation timestamp
 * @property {Date} [updatedAt] - Last update timestamp
 * @property {FulfillmentInfo} [fulfillment] - Fulfillment details
 */

/**
 * Purchase status values
 * @typedef {'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded' | 'failed'} PurchaseStatus
 */

// ============================================
// CART ITEM
// ============================================

/**
 * Item in a cart or purchase
 * @typedef {Object} CartItem
 * @property {string} id - Product/item ID
 * @property {string} name - Item name
 * @property {string} [description] - Item description
 * @property {import('./common').AmountCents} price - Unit price in cents
 * @property {number} quantity - Quantity ordered
 * @property {string} [imageUrl] - Product image URL
 * @property {string} [sku] - Stock keeping unit
 * @property {ItemType} type - Type of item
 * @property {string} [size] - Size variant (for apparel)
 * @property {string} [color] - Color variant
 * @property {Object} [metadata] - Additional item metadata
 * @property {string} [eventId] - For ticket items, the event ID
 * @property {string} [tierId] - For ticket items, the tier ID
 */

/**
 * Item type values
 * @typedef {'ticket' | 'physical' | 'digital' | 'merch'} ItemType
 */

// ============================================
// ADDRESS
// ============================================

/**
 * Shipping/billing address details
 * @typedef {Object} AddressDetails
 * @property {string} [name] - Recipient name
 * @property {Address} address - Address fields
 */

/**
 * Address fields
 * @typedef {Object} Address
 * @property {string} line1 - Street address line 1
 * @property {string} [line2] - Street address line 2
 * @property {string} city - City
 * @property {string} state - State/province
 * @property {string} [postal_code] - Postal/ZIP code (Stripe format)
 * @property {string} [postalCode] - Postal/ZIP code (alternative)
 * @property {string} country - Country code
 */

// ============================================
// FULFILLMENT
// ============================================

/**
 * Fulfillment information for physical items
 * @typedef {Object} FulfillmentInfo
 * @property {FulfillmentStatus} status - Fulfillment status
 * @property {string} [carrier] - Shipping carrier
 * @property {string} [trackingNumber] - Tracking number
 * @property {string} [trackingUrl] - Tracking URL
 * @property {Date} [shippedAt] - When order was shipped
 * @property {Date} [deliveredAt] - When order was delivered
 * @property {string} [printifyOrderId] - Printify order ID (for POD items)
 * @property {string} [printifyStatus] - Printify fulfillment status
 */

/**
 * Fulfillment status values
 * @typedef {'unfulfilled' | 'processing' | 'shipped' | 'delivered' | 'returned'} FulfillmentStatus
 */

// ============================================
// PURCHASE DETAILS (enriched view)
// ============================================

/**
 * Enriched purchase with subcollection data
 * Used for order details view
 * @typedef {Object} PurchaseDetails
 * @property {string} id - Purchase document ID
 * @property {Date} orderDate - Order date
 * @property {import('./event').Ticket[]} tickets - Ticket items
 * @property {CartItem[]} physicalItems - Physical merchandise items
 * @property {CartItem[]} digitalItems - Digital items
 * @property {Object} raw - Raw Firestore data for debugging
 */

// Export empty object to make this a module
export {};
