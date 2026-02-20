# CLAUDE.md - RAGESTATE Web App

> Project context and conventions for Claude Code

## Project Overview

**RAGESTATE** is a social platform for the electronic music community. This is the Next.js web app (`ragestate-dotcom`) that provides feature parity with the React Native mobile app.

**Core Features**: Social feed, user profiles, events/ticketing, e-commerce shop, chat/messaging, admin dashboard

## Tech Stack

| Layer         | Technology                                |
| ------------- | ----------------------------------------- |
| Framework     | Next.js 14 (App Router)                   |
| Language      | JavaScript with JSDoc type annotations    |
| Styling       | Tailwind CSS + CSS Variables              |
| State         | Redux Toolkit (lib/store.js)              |
| Backend       | Firebase (Auth, Firestore, Storage, RTDB) |
| Payments      | Stripe                                    |
| Analytics     | PostHog (planned)                         |
| Notifications | Firebase Cloud Messaging (FCM)            |

## Directory Structure

```
ragestate-dotcom/
├── src/app/                    # Next.js App Router pages
│   ├── components/             # Shared UI components
│   ├── chat/                   # Chat feature
│   ├── feed/                   # Social feed
│   ├── profile/                # User profiles
│   ├── [username]/             # Dynamic profile routes
│   ├── admin/                  # Admin dashboard
│   ├── shop/                   # E-commerce
│   └── layout.js               # Root layout with providers
├── lib/                        # Shared utilities
│   ├── hooks/                  # Custom React hooks
│   ├── firebase/               # Firestore operations
│   ├── server/                 # Server-side utilities
│   ├── server-only/            # Server-only functions
│   ├── store.js                # Redux store configuration
│   ├── authSlice.js            # Auth Redux slice
│   ├── userSlice.js            # User Redux slice
│   └── hooks.js                # Redux hooks + useUnreadNotificationsCount
├── firebase/                   # Firebase configuration
│   ├── firebase.js             # Firebase initialization
│   ├── context/                # FirebaseContext + useAuth
│   └── util/                   # Utilities (registerWebPush, etc.)
├── functions/                  # Firebase Cloud Functions
├── public/                     # Static assets
│   └── firebase-messaging-sw.js # FCM service worker
└── docs/                       # Documentation
```

## Path Aliases (jsconfig.json)

```javascript
import { something } from '@/utils/file'; // → ./src/utils/file
import { Component } from '@components/File'; // → ./src/components/File
import { hook } from '@lib/hooks/useHook'; // → ./src/lib/hooks/useHook
import { useAuth } from '@fb/context/FirebaseContext'; // → ./firebase/context/...
```

## Code Patterns

### Component Pattern

```javascript
'use client';

import { memo } from 'react';

/**
 * @typedef {Object} MyComponentProps
 * @property {string} title - The title to display
 * @property {() => void} [onClick] - Optional click handler
 */

/**
 * Component description
 * @param {MyComponentProps} props
 */
function MyComponent({ title, onClick }) {
  return <div className="bg-[var(--bg-elev-1)] text-[var(--text-primary)]">{title}</div>;
}

export default memo(MyComponent);
```

### Hook Pattern

```javascript
// lib/hooks/useMyHook.js
import { useState, useEffect, useCallback } from 'react';

/**
 * Hook description
 * @param {string} param - Parameter description
 * @returns {{ data: any, isLoading: boolean, error: Error | null }}
 */
export function useMyHook(param) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // ... fetch logic with cleanup
    return () => {
      cancelled = true;
    };
  }, [param]);

  return { data, isLoading, error };
}
```

### Render Safety Pattern

```javascript
// Keep render paths pure:
// - No setState during render
// - No router/navigation side effects during render
// - No console.error in formatter/render helper functions
// Normalize API/Firestore data before rendering UI lists/tables.
```

### Firebase/Firestore Pattern

```javascript
import { collection, doc, getDoc, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

// Query example
const q = query(
  collection(db, 'collectionName'),
  where('field', '==', value),
  orderBy('timestamp', 'desc'),
  limit(20),
);

// Real-time listener (return unsubscribe!)
const unsubscribe = onSnapshot(
  q,
  (snapshot) => {
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setItems(items);
  },
  (error) => {
    console.error('Listener error:', error);
  },
);

// Cleanup in useEffect
return () => unsubscribe();
```

### Redux Pattern

```javascript
import { useAppDispatch, useAppSelector } from '@lib/hooks';
import { selectUserName } from '@lib/userSlice';
import { setUnreadCount } from '@lib/chatSlice';

// In component
const dispatch = useAppDispatch();
const userName = useAppSelector(selectUserName);
dispatch(setUnreadCount(5));
```

### Service Layer Pattern

```javascript
// Use services instead of direct Firestore access
import { getProfile, updateProfile } from '@lib/firebase/userService';
import { getPublicPosts, toggleLike } from '@lib/firebase/postService';
import { isFollowing, toggleFollow } from '@lib/firebase/followService';

// Read operations
const profile = await getProfile(userId);
const { posts, lastDoc } = await getPublicPosts();

// Write operations
await updateProfile(userId, { bio: 'New bio' });
const isNowLiked = await toggleLike(postId, currentUser.uid);
```

### Cached Service Pattern

```javascript
// Use cached services for frequently-read data
import {
  getCachedProfile,
  getCachedUserDisplayInfo,
  invalidateProfileCache,
  prefetchUserDisplayInfos,
} from '@lib/firebase/cachedServices';

// Cached read (5-min TTL)
const profile = await getCachedProfile(userId);

// Batch prefetch for lists
const userInfos = await prefetchUserDisplayInfos(userIds);

// Invalidate after updates
await updateProfile(userId, data);
invalidateProfileCache(userId);
```

### Soft Delete Pattern

```javascript
import { softDelete, notDeleted, restoreDeleted } from '@lib/firebase/softDelete';

// Soft delete instead of hard delete
await softDelete('posts', postId, currentUser.uid);

// Query excluding deleted
const q = query(collection(db, 'posts'), notDeleted(), orderBy('timestamp', 'desc'));

// Restore if needed
await restoreDeleted('posts', postId);
```

### Amount Handling Pattern

```javascript
import { dollarsToCents, formatCents, parseToCents } from '@lib/utils/amounts';

// Store as cents
const priceInCents = dollarsToCents(10.99); // 1099

// Display formatted
const display = formatCents(1099); // '$10.99'

// Parse user input
const cents = parseToCents('$10.99'); // 1099
```

## Styling System

### CSS Variables (defined in globals.css)

```javascript
// Backgrounds (light → dark elevation)
'bg-[var(--bg-root)]'; // Page background
'bg-[var(--bg-elev-1)]'; // Cards, elevated surfaces
'bg-[var(--bg-elev-2)]'; // Inputs, nested elements

// Text hierarchy
'text-[var(--text-primary)]'; // Main text
'text-[var(--text-secondary)]'; // Supporting text
'text-[var(--text-tertiary)]'; // Muted text

// Borders & accents
'border-[var(--border-subtle)]'; // Subtle borders
'bg-[var(--accent)]'; // Brand color (#ff1f42)
'text-[var(--accent)]'; // Accent text

// Status colors
'text-[var(--success)]'; // #22a55a
'text-[var(--warning)]'; // #e6a020
'text-[var(--danger)]'; // #e53935
```

### Common Tailwind Patterns

```javascript
// Card
'rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-5';

// Button (primary)
'rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-white hover:opacity-90';

// Button (secondary)
'rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] px-4 py-2';

// Input
'rounded-lg bg-[var(--bg-elev-2)] px-4 py-2 placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]';

// Hover states
'hover:bg-[var(--bg-elev-2)] transition-colors';
```

## Authentication

```javascript
import { useAuth } from '@fb/context/FirebaseContext';

function MyComponent() {
  const { currentUser, loading } = useAuth();

  if (loading) return <Loading />;
  if (!currentUser) return <Redirect to="/auth" />;

  // currentUser.uid, currentUser.email, etc.
}
```

## Key Collections (Firestore)

| Collection                           | Purpose                |
| ------------------------------------ | ---------------------- |
| `users/{uid}`                        | User data              |
| `users/{uid}/chatSummaries/{chatId}` | Per-user chat list     |
| `users/{uid}/devices/{deviceId}`     | FCM push tokens        |
| `customers/{uid}`                    | Customer/billing info  |
| `profiles/{uid}`                     | Public profile data    |
| `usernames/{username}`               | Username → UID mapping |
| `posts/{postId}`                     | Social posts           |
| `chats/{chatId}`                     | Chat metadata          |
| `chats/{chatId}/messages/{msgId}`    | Chat messages          |
| `events/{eventId}`                   | Event listings         |
| `notifications/{notifId}`            | Notifications          |

## Common Commands

```bash
# Development
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check

# Firebase
npm run deploy:functions  # Deploy Cloud Functions (if configured)
```

## Important Files

| File                                  | Purpose                                     |
| ------------------------------------- | ------------------------------------------- |
| `firebase/firebase.js`                | Firebase initialization (db, auth, storage) |
| `firebase/context/FirebaseContext.js` | Auth context + useAuth hook                 |
| `firebase/util/registerWebPush.js`    | FCM push notification setup                 |
| `lib/store.js`                        | Redux store configuration                   |
| `lib/hooks/useUserSearch.js`          | Debounced user search with caching          |
| `src/app/layout.js`                   | Root layout with all providers              |
| `src/app/globals.css`                 | CSS variables + global styles               |
| `lib/firebase/userService.js`         | User/profile Firestore operations           |
| `lib/firebase/postService.js`         | Post/like/repost operations                 |
| `lib/firebase/followService.js`       | Follow relationship operations              |
| `lib/firebase/eventService.js`        | Event/ticket operations                     |
| `lib/firebase/cachedServices.js`      | Cached service wrappers                     |
| `lib/firebase/softDelete.js`          | Soft delete utilities                       |
| `lib/utils/amounts.js`                | Monetary amount utilities                   |
| `lib/utils/cache.js`                  | LRU cache with TTL                          |
| `lib/types/*.js`                      | JSDoc type definitions                      |

## Current Work: Chat Implementation

See `docs/CHAT-IMPLEMENTATION-CHECKLIST.md` for the active implementation plan.

**Key files to create:**

- `lib/types/chat.js` - Chat type definitions
- `lib/firebase/chatService.js` - Chat Firestore operations
- `lib/hooks/useChat.js` - Single chat room hook
- `lib/hooks/useChatList.js` - Chat list hook
- `lib/chatSlice.js` - Redux slice for chat state
- `src/app/chat/` - Chat UI components and pages

## Don'ts

- Don't use TypeScript - use JSDoc type annotations instead
- Don't add Zustand - use existing Redux Toolkit setup
- Don't use shadcn/ui class names - use CSS variables (`var(--*)`)
- Don't create `/messages` route - use existing `/chat` route
- Don't modify Firebase Cloud Functions without coordination
- Don't hardcode colors - always use CSS variables for theming
