# Schema Conventions

> **Last Updated**: January 23, 2026
> **Version**: 1.0

This document defines naming conventions and patterns for Firestore schema consistency.

---

## Table of Contents
1. [User ID Conventions](#user-id-conventions)
2. [Monetary Amount Conventions](#monetary-amount-conventions)
3. [Soft Delete Conventions](#soft-delete-conventions)
4. [Timestamp Conventions](#timestamp-conventions)
5. [Utilities](#utilities)

---

## User ID Conventions

### The Problem

The codebase has multiple field names for user identifiers:

| Field | Used In | Origin |
|-------|---------|--------|
| `userId` | posts, profiles | Standard |
| `uid` | users, usernames | Firebase Auth |
| `firebaseId` | ragers (tickets) | Legacy |
| `customerId` | purchases, customers | Stripe/billing |
| `senderId` | messages | Chat system |
| `authorId` | posts, comments | Content |
| `followerId` / `followedId` | follows | Social graph |
| `fromUserId` / `toUserId` | transfers | Ticket transfers |

### The Convention

**Use `userId` for all new code.**

### Normalization Utilities

Import from `lib/utils/userIdNormalizer.js`:

```javascript
import {
  extractUserId,
  getUserIdField,
  normalizeUserId,
  hasUserId,
  isSameUser
} from '@lib/utils/userIdNormalizer';
```

#### `extractUserId(data)`

Extract user ID from an object with any field name:

```javascript
extractUserId({ uid: 'abc123' });        // 'abc123'
extractUserId({ customerId: 'xyz789' }); // 'xyz789'
extractUserId({ firebaseId: 'def456' }); // 'def456'
extractUserId({ foo: 'bar' });           // null
```

#### `normalizeUserId(data)`

Add standard `userId` field to an object:

```javascript
normalizeUserId({ uid: 'abc123', name: 'John' });
// { uid: 'abc123', name: 'John', userId: 'abc123' }
```

#### `isSameUser(a, b)`

Compare two objects that may use different ID fields:

```javascript
isSameUser(
  { uid: 'abc123' },
  { customerId: 'abc123' }
); // true
```

### Migration Path

1. **New documents**: Always use `userId`
2. **Existing documents**: Use `extractUserId()` to read
3. **Queries**: Use the field name that has an index

---

## Monetary Amount Conventions

### The Problem

Monetary amounts stored as floats or strings cause precision issues:

```javascript
// BAD: Float precision errors
0.1 + 0.2 // 0.30000000000000004

// BAD: String amounts
'10.99' + '5.00' // '10.995.00'
```

### The Convention

**Store all amounts as integers in cents.**

| Amount | Storage |
|--------|---------|
| $10.99 | 1099 |
| $100.00 | 10000 |
| $0.50 | 50 |
| Free | 0 |

### Amount Utilities

Import from `lib/utils/amounts.js`:

```javascript
import {
  dollarsToCents,
  centsToDollars,
  formatCents,
  formatCentsCompact,
  parseToCents,
  isValidCents,
  addCents,
  percentageOfCents
} from '@lib/utils/amounts';
```

#### Conversion

```javascript
dollarsToCents(10.99);  // 1099
centsToDollars(1099);   // 10.99
```

#### Formatting

```javascript
formatCents(1099);          // '$10.99'
formatCents(1000);          // '$10.00'
formatCentsCompact(1000);   // '$10' (no decimals for whole)
```

#### Parsing

```javascript
parseToCents(10.99);      // 1099
parseToCents('10.99');    // 1099
parseToCents('$10.99');   // 1099
parseToCents('invalid');  // 0
```

#### Validation

```javascript
isValidCents(1099);   // true (integer >= 0)
isValidCents(-100);   // false (negative)
isValidCents(10.5);   // false (not integer)
isValidCents('100');  // false (not number)
```

#### Calculations

```javascript
addCents(100, 200, 300);       // 600
percentageOfCents(1000, 10);   // 100 (10% of $10)
```

### Firestore Rule Validation

The `isIntegerCents` function validates amounts in Firestore rules:

```javascript
// In firestore.rules
function isIntegerCents(v) {
  return v is number && v >= 0 && v == int(v);
}

// Usage in purchase creation
allow create: if isAuthenticated()
  && request.resource.data.customerId == request.auth.uid
  && (!request.resource.data.keys().hasAny(['amount']) ||
      isIntegerCents(request.resource.data.amount));
```

---

## Soft Delete Conventions

### The Problem

Hard deletes lose data permanently and can break references:

```javascript
// Hard delete - data is gone
await deleteDoc(doc(db, 'posts', postId));
```

### The Convention

**Soft delete by setting flags instead of removing documents.**

### Soft Delete Fields

| Field | Type | Description |
|-------|------|-------------|
| `isDeleted` | boolean | `true` if soft deleted |
| `deletedAt` | timestamp | When deleted |
| `deletedBy` | string | User ID who deleted |

### Soft Delete Utilities

Import from `lib/firebase/softDelete.js`:

```javascript
import {
  softDelete,
  restoreDeleted,
  notDeleted,
  onlyDeleted,
  filterNotDeleted,
  isDeleted,
  withSoftDeleteFields
} from '@lib/firebase/softDelete';
```

#### Deleting

```javascript
// Soft delete a post
await softDelete('posts', postId, currentUser.uid);
// Sets: { isDeleted: true, deletedAt: serverTimestamp(), deletedBy: uid }

// Batch delete
await softDeleteMany('comments', commentIds, currentUser.uid);
```

#### Restoring

```javascript
// Restore a soft-deleted document
await restoreDeleted('posts', postId);
// Sets: { isDeleted: false, deletedAt: null, deletedBy: null }
```

#### Querying

```javascript
import { collection, query, orderBy } from 'firebase/firestore';

// Exclude deleted items
const q = query(
  collection(db, 'posts'),
  notDeleted(),  // where('isDeleted', '!=', true)
  orderBy('timestamp', 'desc')
);

// Get only deleted (for admin trash view)
const trashQuery = query(
  collection(db, 'posts'),
  onlyDeleted(),  // where('isDeleted', '==', true)
  orderBy('deletedAt', 'desc')
);
```

#### Client-Side Filtering

```javascript
// Filter already-fetched data
const activePosts = filterNotDeleted(allPosts);
const deletedPosts = filterOnlyDeleted(allPosts);
```

#### Creating Documents with Soft Delete Support

```javascript
// Add soft delete fields when creating
const postData = withSoftDeleteFields({
  content: 'Hello world',
  userId: currentUser.uid,
});
// Adds: { isDeleted: false, deletedAt: null, deletedBy: null }
```

### When to Use Soft Deletes

**Use soft deletes for:**
- User-generated content (posts, comments)
- Important records (purchases, tickets)
- Anything that might need recovery

**Use hard deletes for:**
- Temporary/ephemeral data (rate limits)
- Privacy-required deletions (GDPR)
- Test/development cleanup

---

## Timestamp Conventions

### The Convention

Use Firestore `serverTimestamp()` for all timestamps:

```javascript
import { serverTimestamp } from 'firebase/firestore';

await setDoc(docRef, {
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});
```

### Common Timestamp Fields

| Field | Usage |
|-------|-------|
| `createdAt` | Document creation time |
| `updatedAt` | Last modification time |
| `timestamp` | Generic time field (posts, messages) |
| `deletedAt` | Soft delete time |
| `expiresAt` | Expiration time |

### Reading Timestamps

Firestore timestamps need conversion:

```javascript
const data = docSnap.data();

// Convert to JS Date
const date = data.createdAt?.toDate?.() || data.createdAt;

// Handle both Timestamp and Date
const timestamp = data.timestamp?.toDate
  ? data.timestamp.toDate()
  : new Date(data.timestamp);
```

---

## Utilities

### Type Definitions

Import types from `lib/types/`:

```javascript
/**
 * @typedef {import('@lib/types/common').UserId} UserId
 * @typedef {import('@lib/types/common').AmountCents} AmountCents
 * @typedef {import('@lib/types/common').SoftDeletable} SoftDeletable
 */
```

### File Locations

| Utility | Location |
|---------|----------|
| User ID normalization | `lib/utils/userIdNormalizer.js` |
| Amount utilities | `lib/utils/amounts.js` |
| Soft delete utilities | `lib/firebase/softDelete.js` |
| Common types | `lib/types/common.js` |

---

## Summary

| Convention | Standard | Utility |
|------------|----------|---------|
| User IDs | Use `userId` | `extractUserId()` |
| Amounts | Store as cents (integers) | `dollarsToCents()` |
| Deletes | Soft delete with flags | `softDelete()` |
| Timestamps | Use `serverTimestamp()` | Built-in Firestore |
