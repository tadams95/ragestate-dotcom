# RAGESTATE Database Schema

> **Last Updated**: January 23, 2026
> **Database**: Cloud Firestore (Firebase)
> **Project**: ragestate-app

---

## Table of Contents
1. [Overview](#overview)
2. [Collections](#collections)
3. [Relationships](#relationships)
4. [Firestore Indexes](#firestore-indexes)
5. [Field Overrides](#field-overrides)

---

## Overview

RAGESTATE uses Cloud Firestore as its primary database. The schema is designed for:
- **Real-time updates** via Firestore listeners
- **Scalable queries** with composite indexes
- **Security** via granular Firestore rules
- **Denormalization** for read performance (chatSummaries, userFeeds)

---

## Conventions

### User ID Field Names

The codebase uses various field names for user IDs due to legacy code. Use `userId` for all new code.

| Field | Context | Standard |
|-------|---------|----------|
| `userId` | Posts, profiles | **Preferred** |
| `uid` | Firebase Auth, users | Legacy |
| `firebaseId` | Tickets/ragers | Legacy |
| `customerId` | Purchases | Legacy |
| `senderId` | Messages | Domain-specific |
| `authorId` | Content | Domain-specific |

Use `extractUserId()` from `lib/utils/userIdNormalizer.js` to read user IDs from legacy documents.

### Monetary Amounts

All monetary amounts are stored as **integers in cents**:

| Amount | Storage Value |
|--------|---------------|
| $10.99 | `1099` |
| $100.00 | `10000` |
| Free | `0` |

Use utilities from `lib/utils/amounts.js`:
- `dollarsToCents()` - Convert for storage
- `formatCents()` - Format for display
- `isValidCents()` - Validate

### Soft Delete Fields

Documents supporting soft delete include these fields:

| Field | Type | Description |
|-------|------|-------------|
| `isDeleted` | boolean | `true` if deleted |
| `deletedAt` | timestamp | Deletion time |
| `deletedBy` | string | User ID who deleted |

Use utilities from `lib/firebase/softDelete.js`:
- `softDelete()` - Mark as deleted
- `notDeleted()` - Query filter
- `restoreDeleted()` - Undo deletion

### Timestamps

Always use `serverTimestamp()` for consistency:

| Field | Usage |
|-------|-------|
| `createdAt` | Document creation |
| `updatedAt` | Last modification |
| `timestamp` | Generic (posts, messages) |
| `deletedAt` | Soft delete time |

See `docs/SCHEMA-CONVENTIONS.md` for detailed conventions.

---

## Collections

### Core User Data

#### `/users/{userId}`
User account data (private to user and admins).

| Field | Type | Description |
|-------|------|-------------|
| `uid` | string | Firebase Auth UID |
| `email` | string | User email address |
| `displayName` | string | Display name |
| `username` | string | Unique @username |
| `photoURL` | string | Profile picture URL |
| `isAdmin` | boolean | Admin flag (legacy, prefer custom claims) |
| `unreadNotifications` | number | Unread notification count (server-managed) |
| `createdAt` | timestamp | Account creation date |
| `updatedAt` | timestamp | Last update timestamp |

**Subcollections:**
- `/users/{userId}/chatSummaries/{chatId}` - Chat list entries
- `/users/{userId}/notifications/{notificationId}` - User notifications
- `/users/{userId}/devices/{deviceId}` - FCM push tokens
- `/users/{userId}/settings/notificationPrefs` - Notification preferences

---

#### `/profiles/{userId}`
Public profile data (readable by anyone).

| Field | Type | Description |
|-------|------|-------------|
| `displayName` | string | Public display name |
| `photoURL` | string | Profile picture URL |
| `bio` | string | Bio text (max 500 chars) |
| `usernameLower` | string | Lowercase username for search |
| `profilePicture` | string | Alternative photo field |
| `socialLinks` | map | { instagram, twitter, soundcloud, etc. } |
| `profileMusic` | map | { title, artist, coverUrl } |
| `profileSongUrl` | string | URL to profile song |
| `isVerified` | boolean | Verified badge (admin-only) |

---

#### `/usernames/{usernameLower}`
Username registry for uniqueness enforcement.

| Field | Type | Description |
|-------|------|-------------|
| `uid` | string | Owner's Firebase UID |
| `username` | string | Original casing |
| `createdAt` | timestamp | Registration timestamp |

---

#### `/adminUsers/{uid}`
Admin user registry (used for Firestore rules fallback).

| Field | Type | Description |
|-------|------|-------------|
| `uid` | string | Admin user's UID |
| `addedAt` | timestamp | When admin access was granted |
| `addedBy` | string | Who granted access |

---

### Customer & Purchases

#### `/customers/{userId}`
Customer billing and purchase data.

| Field | Type | Description |
|-------|------|-------------|
| `stripeCustomerId` | string | Stripe Customer ID |
| `email` | string | Billing email |
| `name` | string | Customer name |
| `createdAt` | timestamp | First purchase date |

**Subcollections:**
- `/customers/{userId}/purchases/{purchaseId}` - Purchase history

---

#### `/purchases/{purchaseId}`
Global purchases collection.

| Field | Type | Description |
|-------|------|-------------|
| `customerId` | string | Firebase UID of purchaser |
| `paymentIntentId` | string | Stripe PaymentIntent ID |
| `amount` | number | Amount in cents |
| `currency` | string | Currency code (e.g., "usd") |
| `status` | string | "pending", "completed", "refunded" |
| `items` | array | Purchased items |
| `orderDate` | timestamp | Purchase timestamp |
| `orderNumber` | string | Human-readable order number |

---

#### `/fulfillments/{paymentIntentId}`
Fulfillment records (triggers email sending).

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | "pending", "completed" |
| `email` | string | Customer email |
| `amount` | number | Order amount |
| `items` | array | Items to fulfill |
| `emailSentAt` | timestamp | When confirmation was sent |
| `createdAt` | timestamp | Fulfillment creation |

---

### Events & Tickets

#### `/events/{eventId}`
Event listings.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Event name |
| `description` | string | Event description |
| `dateTime` | timestamp | Event date/time |
| `location` | string | Venue name |
| `address` | string | Full address |
| `city` | string | City name |
| `cityLower` | string | Lowercase city (for queries) |
| `imgURL` | string | Hero image URL |
| `ticketPrice` | number | Base ticket price (cents) |
| `ticketStatus` | string | "available", "sold_out", "coming_soon" |
| `type` | string | Event type/genre |
| `isPublished` | boolean | Visibility flag |
| `active` | boolean | Active/archived status |
| `createdAt` | timestamp | Creation timestamp |
| `updatedAt` | timestamp | Last update |

**Subcollections:**
- `/events/{eventId}/ragers/{ragerId}` - Ticket holders

---

#### `/events/{eventId}/ragers/{ragerId}`
Ticket records (one per attendee).

| Field | Type | Description |
|-------|------|-------------|
| `firebaseId` | string | Ticket owner's UID |
| `email` | string | Owner's email |
| `displayName` | string | Owner's name |
| `ticketQuantity` | number | Number of tickets |
| `ticketToken` | string | QR code token (unique) |
| `checkedIn` | boolean | Check-in status |
| `checkedInAt` | timestamp | Check-in timestamp |
| `active` | boolean | Ticket validity |
| `pendingTransferTo` | string | Transfer recipient (if pending) |
| `pendingTransferId` | string | Transfer document ID |
| `createdAt` | timestamp | Purchase timestamp |
| `updatedAt` | timestamp | Last update |

---

#### `/ticketTransfers/{transferId}`
Ticket transfer records.

| Field | Type | Description |
|-------|------|-------------|
| `fromUserId` | string | Sender's UID |
| `fromEmail` | string | Sender's email |
| `fromName` | string | Sender's name |
| `toUserId` | string | Recipient's UID (if known) |
| `toEmail` | string | Recipient's email |
| `toUsername` | string | Recipient's @username |
| `eventId` | string | Event ID |
| `eventName` | string | Event name |
| `ragerId` | string | Original ticket ID |
| `ticketQuantity` | number | Tickets transferred |
| `status` | string | "pending", "claimed", "cancelled", "expired" |
| `claimTokenHash` | string | Hashed claim token |
| `createdAt` | timestamp | Transfer initiation |
| `expiresAt` | timestamp | 72-hour expiration |
| `claimedAt` | timestamp | When claimed |

---

### Social Feed

#### `/posts/{postId}`
Social posts.

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | Author's UID |
| `userDisplayName` | string | Author's display name |
| `userProfilePicture` | string | Author's photo URL |
| `content` | string | Post text (max 500 chars) |
| `mediaUrls` | array | Original media URLs |
| `optimizedMediaUrls` | array | Processed media URLs |
| `isPublic` | boolean | Public visibility |
| `isProcessing` | boolean | Media being processed |
| `timestamp` | timestamp | Creation time |
| `likeCount` | number | Number of likes |
| `commentCount` | number | Number of comments |
| `repostCount` | number | Number of reposts |
| `repostOf` | map | { postId, authorId, authorName, authorPhoto } |
| `edited` | boolean | Edit flag |
| `updatedAt` | timestamp | Last edit time |

---

#### `/postLikes/{likeId}`
Post like records.

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | User who liked |
| `postId` | string | Post that was liked |
| `timestamp` | timestamp | Like timestamp |

**Note**: Document ID format: `{userId}_{postId}` for uniqueness

---

#### `/postComments/{commentId}`
Post comments.

| Field | Type | Description |
|-------|------|-------------|
| `postId` | string | Parent post ID |
| `userId` | string | Commenter's UID |
| `userDisplayName` | string | Commenter's name |
| `userProfilePicture` | string | Commenter's photo |
| `content` | string | Comment text (max 500 chars) |
| `parentId` | string | Parent comment ID (for replies) |
| `timestamp` | timestamp | Comment timestamp |
| `likeCount` | number | Comment likes |

---

#### `/postCommentLikes/{likeId}`
Comment like records.

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | User who liked |
| `commentId` | string | Comment that was liked |
| `postId` | string | Post the comment belongs to |
| `timestamp` | timestamp | Like timestamp |

---

#### `/postReposts/{repostId}`
Repost tracking records.

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | User who reposted |
| `postId` | string | Original post ID |
| `timestamp` | timestamp | Repost timestamp |

---

#### `/userFeeds/{userId}/feedItems/{postId}`
Personalized feed (server-managed).

| Field | Type | Description |
|-------|------|-------------|
| `postId` | string | Post ID |
| `authorId` | string | Post author |
| `timestamp` | timestamp | Post timestamp |
| `addedAt` | timestamp | When added to feed |

---

### Social Graph

#### `/follows/{edgeId}`
Follow relationships.

| Field | Type | Description |
|-------|------|-------------|
| `followerId` | string | User who follows |
| `followedId` | string | User being followed |
| `createdAt` | timestamp | Follow timestamp |

**Note**: Document ID format: `{followerId}_{followedId}`

---

### Chat / Messaging

#### `/chats/{chatId}`
Chat room metadata.

| Field | Type | Description |
|-------|------|-------------|
| `members` | array | [uid1, uid2] participant UIDs |
| `type` | string | "dm" (direct message) |
| `lastMessage` | map | { content, senderId, timestamp } |
| `createdAt` | timestamp | Chat creation |
| `updatedAt` | timestamp | Last activity |

**Subcollections:**
- `/chats/{chatId}/messages/{messageId}` - Chat messages

---

#### `/chats/{chatId}/messages/{messageId}`
Individual messages.

| Field | Type | Description |
|-------|------|-------------|
| `senderId` | string | Sender's UID |
| `content` | string | Message text |
| `timestamp` | timestamp | Send time |
| `flagged` | boolean | Moderation flag |
| `flagReason` | string | Reason if flagged |

---

#### `/users/{userId}/chatSummaries/{chatId}`
Per-user chat list (denormalized).

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | "dm" |
| `peerId` | string | Other participant's UID |
| `peerName` | string | Other participant's name |
| `peerPhoto` | string | Other participant's photo |
| `lastMessage` | map | { content, senderId, timestamp } |
| `unreadCount` | number | Unread messages |
| `muted` | boolean | Mute notifications |
| `updatedAt` | timestamp | Last update |

---

### Notifications

#### `/users/{userId}/notifications/{notificationId}`
User notifications.

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Notification type |
| `title` | string | Notification title |
| `body` | string | Notification body |
| `link` | string | Web deep link |
| `deepLink` | string | Mobile deep link |
| `read` | boolean | Read status |
| `seenAt` | timestamp | When marked read |
| `sendPush` | boolean | Whether to send push |
| `pushStatus` | string | "pending", "sent", "failed" |
| `createdAt` | timestamp | Creation time |

---

#### `/users/{userId}/devices/{deviceId}`
Push notification tokens.

| Field | Type | Description |
|-------|------|-------------|
| `token` | string | FCM token |
| `platform` | string | "web", "ios", "android" |
| `provider` | string | "fcm" |
| `createdAt` | timestamp | Registration time |
| `lastUsed` | timestamp | Last push sent |

---

### Promo Codes

#### `/promoCodes/{codeId}`
Promotional codes.

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | Promo code string |
| `discountType` | string | "percentage", "fixed" |
| `discountValue` | number | Discount amount |
| `maxUses` | number | Maximum uses |
| `usedCount` | number | Current use count |
| `expiresAt` | timestamp | Expiration date |
| `active` | boolean | Active status |

---

#### `/promoterCodes/{codeId}`
Promoter referral codes.

| Field | Type | Description |
|-------|------|-------------|
| `promoterId` | string | Promoter's UID |
| `code` | string | Referral code |
| `discountPercent` | number | Discount percentage |
| `commissionPercent` | number | Promoter commission |
| `usedCount` | number | Times used |

---

### Other Collections

#### `/products/{productId}`
Shopify product cache.

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Product name |
| `description` | string | Product description |
| `price` | number | Price in cents |
| `images` | array | Product images |
| `shopifyId` | string | Shopify product ID |

---

#### `/emailCaptures/{captureId}`
Email subscription captures.

| Field | Type | Description |
|-------|------|-------------|
| `email` | string | Subscriber email |
| `source` | string | Capture source |
| `eventId` | string | Related event (optional) |
| `subscribed` | boolean | Subscription status |
| `capturedAt` | timestamp | Capture timestamp |

---

#### `/rateLimits/{keyId}`
Rate limiting records.

| Field | Type | Description |
|-------|------|-------------|
| `attempts` | array | Timestamps of attempts |
| `lastAttempt` | number | Last attempt timestamp |
| `identifier` | string | User ID or IP |
| `updatedAt` | number | Last update timestamp |

---

#### `/analytics/totals`
Aggregated analytics (singleton document).

| Field | Type | Description |
|-------|------|-------------|
| `totalUsers` | number | Total registered users |
| `totalPosts` | number | Total posts |
| `totalRevenue` | number | Total revenue (cents) |
| `lastUpdated` | timestamp | Last aggregation |

---

## Relationships

```
                    ┌─────────────────┐
                    │     users       │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐  ┌───────────────┐  ┌───────────────┐
│   profiles      │  │  customers    │  │   follows     │
│ (public view)   │  │ (purchases)   │  │ (social graph)│
└─────────────────┘  └───────────────┘  └───────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    events       │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐  ┌───────────────┐  ┌───────────────┐
│    ragers       │  │ ticketTransfers│ │   purchases   │
│ (ticket holders)│  │               │  │               │
└─────────────────┘  └───────────────┘  └───────────────┘

┌─────────────────┐       ┌───────────────┐
│     posts       │◀──────│  postReposts  │
└────────┬────────┘       └───────────────┘
         │
         ├──────────────────┬───────────────────┐
         ▼                  ▼                   ▼
┌─────────────────┐  ┌───────────────┐  ┌───────────────┐
│   postLikes     │  │ postComments  │  │   userFeeds   │
└─────────────────┘  └───────┬───────┘  └───────────────┘
                             │
                             ▼
                    ┌───────────────────┐
                    │ postCommentLikes  │
                    └───────────────────┘

┌─────────────────┐       ┌───────────────────────────┐
│     chats       │──────▶│ users/{uid}/chatSummaries │
└────────┬────────┘       └───────────────────────────┘
         │
         ▼
┌─────────────────┐
│    messages     │
└─────────────────┘
```

---

## Firestore Indexes

### Composite Indexes

Located in `firestore.indexes.json`:

| Collection | Fields | Purpose |
|------------|--------|---------|
| `events` | isPublished ↑, dateTime ↑ | Published events by date |
| `events` | type ↑, dateTime ↑ | Events by type and date |
| `events` | cityLower ↑, dateTime ↑ | Events by city and date |
| `events` | ticketStatus ↑, dateTime ↑ | Events by availability |
| `events` | active ↑, dateTime ↑ | Active events by date |
| `events` | active ↑, createdAt ↓ | Active events by creation |
| `posts` | userId ↑, timestamp ↓ | User's posts chronologically |
| `posts` | isPublic ↑, timestamp ↓ | Public feed |
| `posts` | userId ↑, isPublic ↑, timestamp ↓ | User's public posts |
| `postComments` | postId ↑, timestamp ↑ | Comments on a post |
| `postComments` | postId ↑, parentId ↑, timestamp ↑ | Threaded comments |
| `follows` | followerId ↑, followedId ↑ | Check if following |
| `follows` | followedId ↑, createdAt ↓ | User's followers |
| `follows` | followerId ↑, createdAt ↓ | User's following |
| `ragers` | firebaseId ↑, active ↑ | User's active tickets |
| `postReposts` | postId ↑, userId ↑ | Check if reposted |
| `postReposts` | postId ↑, timestamp ↓ | Post's reposts |
| `ticketTransfers` | fromUserId ↑, createdAt ↓ | Sent transfers |
| `ticketTransfers` | toUserId ↑, createdAt ↓ | Received transfers |
| `ticketTransfers` | toEmail ↑, createdAt ↓ | Transfers by email |
| `ticketTransfers` | eventId ↑, createdAt ↓ | Transfers for event |
| `purchases` | status ↑, orderDate ↑ | Purchases by status |

---

## Field Overrides

Special indexing configurations for collection group queries:

| Collection Group | Field | Scopes |
|------------------|-------|--------|
| `ragers` | ticketToken | COLLECTION_GROUP ↑ |
| `ragers` | firebaseId | COLLECTION_GROUP ↑↓, CONTAINS |

These enable queries across all `/events/*/ragers` subcollections.
