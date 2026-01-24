# Data Access Layer

> **Last Updated**: January 23, 2026
> **Version**: 1.0

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Service Files](#service-files)
4. [Usage Examples](#usage-examples)
5. [Caching](#caching)
6. [Migration Guide](#migration-guide)

---

## Overview

The Data Access Layer provides a clean abstraction between React components and Firestore operations. Instead of importing Firestore functions directly in components, use the service layer to:

- **Reduce code duplication** - Common queries defined once
- **Improve testability** - Services can be mocked
- **Enable caching** - Transparent caching layer
- **Enforce conventions** - Consistent field naming and validation
- **Simplify components** - Components focus on UI, not data fetching

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        REACT COMPONENTS                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │   Feed.js   │  │ Profile.js  │  │ TicketsTab  │  │   Chat.js  │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘  │
└─────────┼────────────────┼────────────────┼───────────────┼─────────┘
          │                │                │               │
          ▼                ▼                ▼               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       CACHED SERVICES                                │
│                   lib/firebase/cachedServices.js                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  getCachedProfile() │ getCachedUserDisplayInfo() │ getCached…  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     LRU Cache (lib/utils/cache.js)            │  │
│  │         profileCache │ userCache │ eventCache │ postCache      │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
          │                │                │               │
          ▼                ▼                ▼               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SERVICE LAYER                                 │
│                      lib/firebase/*.js                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │ postService │  │ userService │  │eventService │  │chatService │  │
│  │ followServ… │  │ adminServ…  │  │purchaseServ…│  │            │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘  │
└─────────┼────────────────┼────────────────┼───────────────┼─────────┘
          │                │                │               │
          ▼                ▼                ▼               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         FIRESTORE                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │    posts    │  │   users     │  │   events    │  │   chats    │  │
│  │  postLikes  │  │  profiles   │  │   ragers    │  │  messages  │  │
│  │ postReposts │  │  customers  │  │ purchases   │  │            │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Service Files

### User Service (`lib/firebase/userService.js`)

Operations for users, profiles, and customers.

| Function | Description |
|----------|-------------|
| `getUser(userId)` | Get user document from `/users` |
| `getProfile(userId)` | Get public profile from `/profiles` |
| `getProfileByUsername(username)` | Find profile by username |
| `updateProfile(userId, updates)` | Update profile fields |
| `upsertProfile(userId, data)` | Create or update profile |
| `getCustomer(userId)` | Get customer/billing info |
| `getUserDisplayInfo(userId)` | Combined display info with fallbacks |
| `isUsernameAvailable(username)` | Check username availability |
| `getUserIdByUsername(username)` | Get UID from username |

### Post Service (`lib/firebase/postService.js`)

Operations for posts, likes, and reposts.

| Function | Description |
|----------|-------------|
| `getPost(postId)` | Get single post |
| `getPublicPosts(lastDoc, pageSize)` | Paginated public feed |
| `getPostsByUser(userId, lastDoc, pageSize)` | User's posts |
| `hasLikedPost(postId, userId)` | Check if user liked post |
| `likePost(postId, userId)` | Like a post |
| `unlikePost(postId, userId)` | Unlike a post |
| `toggleLike(postId, userId)` | Toggle like state |
| `hasRepostedPost(postId, userId)` | Check if user reposted |
| `createRepost(params)` | Create a repost |
| `undoRepost(postId, userId)` | Remove repost |
| `createPost(params)` | Create new post |

### Follow Service (`lib/firebase/followService.js`)

Operations for follow relationships.

| Function | Description |
|----------|-------------|
| `isFollowing(followerId, followedId)` | Check follow status |
| `follow(followerId, followedId)` | Follow a user |
| `unfollow(followerId, followedId)` | Unfollow a user |
| `toggleFollow(followerId, followedId)` | Toggle follow state |
| `getFollowers(userId, lastDoc, pageSize)` | Get user's followers |
| `getFollowing(userId, lastDoc, pageSize)` | Get who user follows |
| `getFollowerCount(userId)` | Count followers |
| `getFollowingCount(userId)` | Count following |

### Event Service (`lib/firebase/eventService.js`)

Operations for events and tickets.

| Function | Description |
|----------|-------------|
| `getEvent(eventId)` | Get single event |
| `getUpcomingEvents(lastDoc, pageSize)` | Paginated upcoming events |
| `getEvents(lastDoc, pageSize)` | All events (admin) |
| `getUserTickets(userId)` | User's tickets across events |
| `getEventTickets(eventId)` | Tickets for specific event |
| `getUserTransfers(userId)` | User's ticket transfers |

### Purchase Service (`lib/firebase/purchaseService.js`)

Operations for purchases and orders.

| Function | Description |
|----------|-------------|
| `getPurchase(purchaseId)` | Get single purchase |
| `getUserPurchases(userId, lastDoc, pageSize)` | User's purchase history |
| `getAllPurchases(lastDoc, pageSize)` | All purchases (admin) |
| `getPurchaseDetails(purchaseId)` | Purchase with subcollections |
| `savePurchase(purchaseData)` | Create new purchase |
| `searchPurchasesByEmail(email)` | Search by email |

### Admin Service (`lib/firebase/adminService.js`)

Operations for admin functionality.

| Function | Description |
|----------|-------------|
| `checkIsAdmin(userId)` | Check admin status |
| `hasPermission(userId, permission)` | Check specific permission |
| `getAdminUserView(userId)` | Full user data (admin) |
| `getAllUsers(limitCount)` | List all users |
| `getUserCount()` | Total user count |

### Chat Service (`lib/firebase/chatService.js`)

Operations for chat/messaging (pre-existing).

| Function | Description |
|----------|-------------|
| `getOrCreateDMChat(userId, peerId)` | Find or create DM |
| `sendMessage(chatId, senderId, content)` | Send message |
| `markAsRead(chatId, userId)` | Mark chat read |
| `getChatSummaries(userId)` | Get chat list |

---

## Usage Examples

### Basic Service Usage

```javascript
// In a component
import { getPublicPosts, toggleLike } from '@lib/firebase/postService';
import { isFollowing, toggleFollow } from '@lib/firebase/followService';

// Fetch posts
const { posts, lastDoc } = await getPublicPosts();

// Toggle like
const isNowLiked = await toggleLike(postId, currentUser.uid);

// Check and toggle follow
const following = await isFollowing(currentUser.uid, targetUserId);
const isNowFollowing = await toggleFollow(currentUser.uid, targetUserId);
```

### Using Cached Services

```javascript
import {
  getCachedProfile,
  getCachedUserDisplayInfo,
  invalidateProfileCache
} from '@lib/firebase/cachedServices';

// First call: fetches from Firestore
const profile = await getCachedProfile(userId);

// Second call: returns from cache (5-min TTL)
const profile2 = await getCachedProfile(userId);

// After updating profile, invalidate cache
await updateProfile(userId, { bio: 'New bio' });
invalidateProfileCache(userId);
```

### Batch Prefetching

```javascript
import { prefetchUserDisplayInfos } from '@lib/firebase/cachedServices';

// Prefetch all user infos before rendering a list
const userIds = posts.map(p => p.userId);
const userInfoMap = await prefetchUserDisplayInfos(userIds);

// Now renders won't trigger individual fetches
posts.map(post => {
  const userInfo = userInfoMap.get(post.userId);
  return <Post post={post} author={userInfo} />;
});
```

### Monitoring Cache Performance

```javascript
import { getCacheStats } from '@lib/firebase/cachedServices';

// Check cache performance
const stats = getCacheStats();
console.log(stats);
// {
//   profile: { hits: 45, misses: 12, evictions: 0, size: 12, hitRate: 0.79 },
//   user: { hits: 30, misses: 8, evictions: 0, size: 8, hitRate: 0.79 },
//   event: { hits: 5, misses: 2, evictions: 0, size: 2, hitRate: 0.71 }
// }
```

---

## Caching

### Cache Configuration

| Cache | Max Size | TTL | Use Case |
|-------|----------|-----|----------|
| `profileCache` | 100 | 5 min | Public profiles |
| `userCache` | 100 | 5 min | User display info, customers |
| `eventCache` | 50 | 10 min | Event details |
| `postCache` | 200 | 2 min | Individual posts (volatile) |

### When to Use Cached Services

**Use cached versions for:**
- Displaying user info in lists (avatars, names)
- Profile pages (frequently revisited)
- Event details pages
- Any read-heavy, display-only data

**Use direct services for:**
- Data that must be fresh (e.g., checking permissions)
- Write operations
- Admin operations

### Cache Invalidation

Always invalidate after writes:

```javascript
import { updateProfile } from '@lib/firebase/userService';
import { invalidateProfileCache } from '@lib/firebase/cachedServices';

async function saveProfile(userId, data) {
  await updateProfile(userId, data);
  invalidateProfileCache(userId);  // Clear stale cache
}
```

---

## Migration Guide

### From Direct Firestore to Services

**Before (direct Firestore in component):**
```javascript
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@fb/firebase';

// In component
const docRef = doc(db, 'profiles', userId);
const docSnap = await getDoc(docRef);
const profile = docSnap.exists() ? docSnap.data() : null;
```

**After (using service):**
```javascript
import { getProfile } from '@lib/firebase/userService';

// In component
const profile = await getProfile(userId);
```

### From Services to Cached Services

**Before (direct service):**
```javascript
import { getProfile } from '@lib/firebase/userService';

const profile = await getProfile(userId);
```

**After (with caching):**
```javascript
import { getCachedProfile } from '@lib/firebase/cachedServices';

const profile = await getCachedProfile(userId);
```

### Gradual Migration Strategy

1. **New code**: Always use services/cached services
2. **Existing components**: Migrate when modifying
3. **High-traffic components**: Prioritize for caching
4. **No breaking changes**: Old direct imports still work

---

## Best Practices

1. **Import from services, not Firestore directly**
   ```javascript
   // Good
   import { getProfile } from '@lib/firebase/userService';

   // Avoid (in components)
   import { doc, getDoc } from 'firebase/firestore';
   ```

2. **Use cached services for display data**
   ```javascript
   // Good for displaying
   const profile = await getCachedProfile(userId);

   // Use direct service for writes
   await updateProfile(userId, changes);
   ```

3. **Invalidate cache after writes**
   ```javascript
   await updateProfile(userId, data);
   invalidateProfileCache(userId);
   ```

4. **Prefetch for lists**
   ```javascript
   const userIds = items.map(i => i.userId);
   await prefetchUserDisplayInfos(userIds);
   ```

5. **Check cache stats in development**
   ```javascript
   if (process.env.NODE_ENV === 'development') {
     console.log('Cache stats:', getCacheStats());
   }
   ```
