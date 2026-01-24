# Architecture & Database Schema Improvement Checklist

> Elevate RAGESTATE's architecture from B to A grade and database schema from B- to A grade

## Overview

| Issue Category | Current Grade | Target | Approach |
|----------------|---------------|--------|----------|
| Firebase Abstraction | B | A | Create service layer (model after chatService.js) |
| Schema Consistency | B- | A | Standardize IDs, amounts, add soft deletes |
| Caching | B | A | Add LRU cache layer with TTL |
| Documentation | B+ | A | Document all new patterns |

---

## Phase 1: Foundation (Type Definitions + Amount Utils)

**Goal**: Establish type safety and amount standardization without breaking existing code.

### New Files to Create

- [x] `lib/types/common.js` - Shared types: UserId, AmountCents, SoftDeletable
- [x] `lib/types/user.js` - User/Profile type definitions
- [x] `lib/types/post.js` - Post, Like, Comment, Repost types
- [x] `lib/types/event.js` - Event, Ticket, Transfer types
- [x] `lib/types/purchase.js` - Purchase, Fulfillment types
- [x] `lib/utils/amounts.js` - `dollarsToCents()`, `formatCents()`, `parseToCents()`

### Verification

- [x] `npm run build` passes
- [x] Existing tests pass
- [x] No breaking changes to existing code

---

## Phase 2: Core Service Layer

**Goal**: Extract Firestore operations from components into dedicated services.

### New Service Files to Create

- [x] `lib/firebase/userService.js` - Extracts from FirebaseContext.js
  - [x] `getUser()`
  - [x] `updateProfile()`
  - [x] `getUserByUsername()` (via `getProfileByUsername()`)
- [x] `lib/firebase/postService.js` - Extracts from Feed.js, PostActions.js
  - [x] `getPost()`
  - [x] `getPublicPosts()`
  - [x] `createPost()`
  - [x] `likePost()` / `unlikePost()` / `toggleLike()`
  - [x] `createRepost()` / `undoRepost()`
- [x] `lib/firebase/followService.js` - Extracts from Followbutton.js
  - [x] `follow()`
  - [x] `unfollow()`
  - [x] `isFollowing()`
  - [x] `getFollowers()`
  - [x] `getFollowing()`
- [x] `lib/firebase/eventService.js` - Extracts from TicketsTab.js
  - [x] `getEvents()` / `getUpcomingEvents()`
  - [x] `getUserTickets()` / `getEventTickets()`
  - [x] `getUserTransfers()`
- [x] `lib/firebase/purchaseService.js` - Extracts from FirebaseContext.js
  - [x] `getUserPurchases()` / `getAllPurchases()`
  - [x] `savePurchase()`
- [x] `lib/firebase/adminService.js` - Extracts from FirebaseContext.js
  - [x] `checkIsAdmin()`

### Files to Modify (Migrate incrementally to avoid breaking changes)

- [ ] `firebase/context/FirebaseContext.js` - Extract data functions to services, keep only auth (~400 lines to remove)
- [ ] `src/app/components/Feed.js` - Import from postService instead of direct Firestore (~50 lines)
- [ ] `src/app/components/PostActions.js` - Import from postService (~100 lines)
- [x] `src/app/components/Followbutton.js` - Import from followService (~30 lines) ✓ Fixed bug with button text

> **Note**: Services are available for new code; existing components migrating incrementally.

### Verification

- [x] Service files have valid syntax
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [ ] Components migrated to use services (in progress - Followbutton done)

---

## Phase 3: Schema Standardization

**Goal**: Normalize field naming and add soft delete support.

### 3.1 User ID Normalization

- [x] Create `lib/utils/userIdNormalizer.js`
  - [x] `extractUserId()` - Handles: uid, userId, firebaseId, customerId, senderId, authorId
  - [x] `getUserIdField()` - Get the field name containing user ID
  - [x] `normalizeUserId()` - Add standard userId field to objects
  - [x] Document convention: Use `userId` everywhere in new code

### 3.2 Soft Delete Support

- [x] Create `lib/firebase/softDelete.js`
  - [x] `softDelete(collectionPath, docId, deletedByUserId)`
  - [x] `notDeleted()` - Returns where clause for filtering deleted items
  - [x] `onlyDeleted()` - Returns where clause for deleted items only
  - [x] `restoreDeleted(collectionPath, docId)`
  - [x] `filterNotDeleted()` / `filterOnlyDeleted()` - Client-side filtering
  - [x] `softDeleteMany()` / `restoreDeletedMany()` - Batch operations

### 3.3 Firestore Rules Update

- [x] Update `firestore.rules`
  - [x] Add `isIntegerCents(v)` validation function
  - [x] Update purchases rule to validate amounts
  - [ ] Deploy rules (requires Firebase CLI - manual step)

### Verification

- [x] `npm run lint` passes
- [x] `npm run build` passes
- [ ] Rules deployment (manual step via `firebase deploy --only firestore:rules`)

---

## Phase 4: Caching Layer

**Goal**: Add client-side LRU cache with TTL (model after useUserSearch.js pattern).

### New Files to Create

- [x] `lib/utils/cache.js` - Generic LRU cache class
  - [x] `LRUCache` class with maxSize and TTL options
  - [x] `get(key)` - Check expiry, return value or undefined
  - [x] `set(key, value)` - Evict oldest if at max, set with expiry
  - [x] `has(key)` - Check if key exists and not expired
  - [x] `invalidate(key)` - Remove specific key
  - [x] `invalidatePrefix(prefix)` - Remove keys by prefix
  - [x] `clear()` - Remove all entries
  - [x] `cleanup()` - Remove expired entries (garbage collection)
  - [x] `getStats()` - Get hit/miss/eviction statistics
  - [x] Singleton cache instances: `profileCache`, `userCache`, `eventCache`, `postCache`
  - [x] Helper: `cacheKey()`, `withCache()` wrapper
- [x] `lib/firebase/cachedServices.js` - Cached wrappers for high-read services
  - [x] `getCachedProfile(userId)` - 5 min TTL
  - [x] `getCachedCustomer(userId)` - 5 min TTL
  - [x] `getCachedUserDisplayInfo(userId)` - 5 min TTL
  - [x] `getCachedEvent(eventId)` - 10 min TTL
  - [x] `invalidateProfileCache()`, `invalidateUserCache()`, `invalidateEventCache()`
  - [x] `prefetchProfiles()`, `prefetchUserDisplayInfos()` - Batch prefetching
  - [x] `clearAllCaches()`, `getCacheStats()`, `cleanupCaches()` - Cache management

### Verification

- [x] `npm run lint` passes
- [x] `npm run build` passes
- [ ] Runtime verification (cache hits visible via `getCacheStats()`)

---

## Phase 5: Documentation

**Goal**: Document all new patterns for maintainability.

### New Documentation Files

- [x] `docs/DATA-ACCESS-LAYER.md`
  - [x] Service layer architecture explanation
  - [x] Usage examples for each service
  - [x] Caching documentation
  - [x] Migration guide from direct Firestore access
  - [x] Best practices
- [x] `docs/SCHEMA-CONVENTIONS.md`
  - [x] ID naming conventions (always use `userId`)
  - [x] Amount conventions (always use cents as integers)
  - [x] Soft delete field conventions
  - [x] Timestamp conventions
  - [x] Utility function reference

### Documentation Updates

- [x] Update `docs/ARCHITECTURE.md`
  - [x] Add Data Access Layer section with diagram
  - [x] Add service files table
  - [x] Add caching configuration table
  - [x] Update Key File Locations
- [x] Update `docs/DATABASE-SCHEMA.md`
  - [x] Add Conventions section
  - [x] Document user ID field names
  - [x] Document monetary amount conventions
  - [x] Document soft delete fields
  - [x] Document timestamp conventions
- [x] Update `CLAUDE.md`
  - [x] Add Service Layer Pattern
  - [x] Add Cached Service Pattern
  - [x] Add Soft Delete Pattern
  - [x] Add Amount Handling Pattern
  - [x] Update Important Files with service files

---

## Final Verification

### Build Verification

- [x] `npm run build` - No compilation errors
- [x] `npm run lint` - No linting errors (only pre-existing warnings)
- [ ] `npm test` - Existing tests pass (if tests exist)

### End-to-End Tests (Manual)

- [x] Feed loads ✓
- [x] Follow works: Migrated to use followService, Firestore rules fixed ✓
- [x] Profile loads ✓
- [x] Delete works ✓

> **Note**: Services are implemented and ready. Followbutton.js has been migrated to use followService. New code should use services; remaining components can migrate incrementally.

---

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| Direct Firestore imports in components | 30+ files | ~5 files (services only) |
| FirebaseContext.js lines | 533 | <150 |
| Abstracted services | 2 | 8+ |
| ID naming variants | 7 | 1 (userId) |
| Soft delete support | None | Available |
| Cache layer | None | LRU with 5-min TTL |
| Type coverage | Minimal | Comprehensive JSDoc |

**Final Grade Expectation**: Architecture A-, Database Schema A-

---

## File Summary

### New Files (16)

```
lib/types/common.js
lib/types/user.js
lib/types/post.js
lib/types/event.js
lib/types/purchase.js
lib/utils/amounts.js
lib/utils/cache.js
lib/utils/userIdNormalizer.js
lib/firebase/userService.js
lib/firebase/postService.js
lib/firebase/followService.js
lib/firebase/eventService.js
lib/firebase/purchaseService.js
lib/firebase/adminService.js
lib/firebase/softDelete.js
lib/firebase/cachedServices.js
```

### Modified Files (7)

```
firebase/context/FirebaseContext.js (slim down ~400 lines) - pending
src/app/components/Feed.js (use postService) - pending
src/app/components/PostActions.js (use postService) - pending
src/app/components/Followbutton.js (use followService) ✓ DONE
firestore.rules (add amount validation) ✓ DONE
docs/ARCHITECTURE.md (update) ✓ DONE
docs/DATABASE-SCHEMA.md (update) ✓ DONE
```

### New Documentation Files (2)

```
docs/DATA-ACCESS-LAYER.md
docs/SCHEMA-CONVENTIONS.md
```

---

## Risk Mitigation

1. **Backward Compatibility**: New services are additive; components migrate incrementally
2. **No Breaking Changes**: Old imports continue to work during migration
3. **Rollback**: Services are in separate files; can revert specific imports
4. **Incremental**: Each phase is independently deployable
