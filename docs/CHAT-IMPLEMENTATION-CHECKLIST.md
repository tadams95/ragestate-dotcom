# Chat Implementation Checklist for ragestate-dotcom

> **Based on**: CHAT-WEB-IMPLEMENTATION-SPEC.md
> **Adapted for**: ragestate-dotcom codebase patterns
> **Created**: January 2026

---

## Overview

This checklist adapts the chat spec to work seamlessly with the existing ragestate-dotcom codebase patterns. Key adaptations:

| Spec Recommendation | Codebase Pattern | Adaptation |
|---------------------|------------------|------------|
| TypeScript interfaces | JavaScript + JSDoc | Use JSDoc type definitions |
| Zustand store | Redux Toolkit | Add chatSlice to existing Redux store |
| `hooks/` directory | `lib/hooks/` | Place hooks in `lib/hooks/` |
| `services/` directory | `lib/firebase/` | Place services in `lib/firebase/` |
| shadcn/ui theming | CSS variables + Tailwind | Use existing `var(--*)` tokens |
| `/messages` route | `/chat` route | Use existing `/chat` route structure |

---

## Pre-Implementation Checklist

- [ ] **Verify Firebase collections exist** (chat data should already exist from mobile app)
  - `/chats/{chatId}` - Chat documents
  - `/chats/{chatId}/messages/{messageId}` - Messages
  - `/users/{userId}/chatSummaries/{chatId}` - Per-user chat summaries
  - `chat-media/{chatId}/` - Storage bucket for media

- [ ] **Review Cloud Functions** (reference only - DO NOT MODIFY)
  - `onChatMessageCreated` - Updates lastMessage, unreadCount, sends push
  - `onDmChatCreated` - Creates chatSummaries for both users
  - `onEventCreatedCreateChat` - Creates event chat
  - `onTicketPurchasedJoinChat` - Adds user to event chat

---

## Phase 1: Foundation (Types & Service Layer)

### 1.1 Create Chat Types
**File**: `lib/types/chat.js`

```javascript
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
 * @typedef {Object} UserInfo
 * @property {string} userId
 * @property {string} displayName
 * @property {string|null} photoURL
 * @property {string|null} username
 */

/**
 * @typedef {Object} LastMessage
 * @property {string} text
 * @property {string} senderId
 * @property {string} [senderName]
 * @property {Date} createdAt
 * @property {MessageType} type
 */

/**
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
 * @property {string} [eventId]
 * @property {string} [eventName]
 * @property {Date} [eventDate]
 */

/**
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
 * @typedef {Object} ChatSummary
 * @property {string} chatId
 * @property {ChatType} type
 * @property {LastMessage|null} lastMessage
 * @property {number} unreadCount
 * @property {boolean} muted
 * @property {Date} updatedAt
 * @property {string} [peerId]
 * @property {string} [peerName]
 * @property {string} [peerPhoto]
 * @property {string} [eventId]
 * @property {string} [eventName]
 */

export {}; // Make this a module
```

**Tasks**:
- [ ] Create `lib/types/` directory
- [ ] Create `lib/types/chat.js` with JSDoc type definitions
- [ ] Types should match Firestore schema exactly (for mobile parity)

---

### 1.2 Create Chat Service
**File**: `lib/firebase/chatService.js`

**Tasks**:
- [ ] Create `lib/firebase/chatService.js`
- [ ] Implement `getDmChatId(userId1, userId2)` - deterministic ID (CRITICAL for mobile parity)
- [ ] Implement `getUserDisplayInfo(userId)` - fetch from customers + profiles collections
- [ ] Implement `getOrCreateDmChat(currentUserId, peerId)` - create DM chat
- [ ] Implement `uploadChatMedia(chatId, file, onProgress)` - Web File API version
- [ ] Implement `sendMessage(chatId, senderId, senderName, senderPhoto, text, mediaUrl?, mediaType?)`
- [ ] Implement `subscribeToMessages(chatId, onUpdate, onError, limit)` - real-time listener
- [ ] Implement `fetchOlderMessages(chatId, lastDoc, limit)` - pagination
- [ ] Implement `subscribeToChatList(userId, onUpdate, onError)` - chat list listener
- [ ] Implement `markChatAsRead(userId, chatId)` - clear unread count
- [ ] Implement `subscribeToTotalUnread(userId, onUpdate, onError)` - global unread count

**Import pattern** (follow codebase conventions):
```javascript
import {
  collection, doc, addDoc, setDoc, getDoc, getDocs,
  query, orderBy, limit, startAfter, onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/firebase';
```

**Key Implementation Notes**:
- Use existing `db` and `storage` from `firebase/firebase.js`
- Follow same query patterns as `lib/firebase/userSearch.js`
- Return unsubscribe functions from all listeners

---

### 1.3 Add Chat Redux Slice
**File**: `lib/chatSlice.js`

**Tasks**:
- [ ] Create `lib/chatSlice.js` with Redux Toolkit
- [ ] Add state for `unreadCount` (global chat badge)
- [ ] Add actions: `setUnreadCount`, `incrementUnread`, `clearUnread`
- [ ] Export selectors: `selectUnreadCount`
- [ ] Register slice in `lib/store.js`

```javascript
// lib/chatSlice.js
import { createSlice } from '@reduxjs/toolkit';

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    unreadCount: 0,
  },
  reducers: {
    setUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
  },
});

export const { setUnreadCount } = chatSlice.actions;
export const selectUnreadCount = (state) => state.chat.unreadCount;
export default chatSlice.reducer;
```

- [ ] Update `lib/store.js` to include chat reducer

---

## Phase 2: Custom Hooks

### 2.1 useChat Hook
**File**: `lib/hooks/useChat.js`

**Tasks**:
- [ ] Create `lib/hooks/useChat.js`
- [ ] Subscribe to messages on mount
- [ ] Handle pagination with `loadMore()`
- [ ] Implement optimistic updates for sending
- [ ] Auto-mark chat as read when viewing
- [ ] Clean up subscriptions on unmount

**Return shape**:
```javascript
{
  messages,      // Message[]
  isLoading,     // boolean
  isLoadingMore, // boolean
  hasMore,       // boolean
  error,         // Error | null
  isSending,     // boolean
  sendMessage,   // (text, mediaFile?) => Promise<void>
  loadMore,      // () => Promise<void>
}
```

---

### 2.2 useChatList Hook
**File**: `lib/hooks/useChatList.js`

**Tasks**:
- [ ] Create `lib/hooks/useChatList.js`
- [ ] Subscribe to user's chat summaries
- [ ] Update Redux unread count on changes
- [ ] Provide helper functions:
  - `getRecentDmContacts(chats, limit)` - for quick access
  - `getExistingDmPeerIds(chats)` - to filter new chat search

**Return shape**:
```javascript
{
  chats,       // ChatSummary[]
  isLoading,   // boolean
  error,       // Error | null
  totalUnread, // number
  refetch,     // () => void
}
```

---

## Phase 3: UI Components

### 3.1 Component Directory Structure
**Location**: `src/app/chat/components/`

- [ ] Create `src/app/chat/components/` directory

---

### 3.2 ChatListItem Component
**File**: `src/app/chat/components/ChatListItem.jsx`

**Tasks**:
- [ ] Create component with proper JSDoc types
- [ ] Display avatar (peer photo or event icon)
- [ ] Show name, last message preview, timestamp
- [ ] Unread badge with count
- [ ] Use CSS variables for theming
- [ ] Link to `/chat/[chatId]`

**Styling** (use existing CSS variables):
```javascript
className="bg-[var(--bg-elev-1)] hover:bg-[var(--bg-elev-2)] border-[var(--border-subtle)]"
```

---

### 3.3 MessageBubble Component
**File**: `src/app/chat/components/MessageBubble.jsx`

**Tasks**:
- [ ] Create component with own/other styling
- [ ] Support text and image messages
- [ ] Show sender info in group chats (`showSender` prop)
- [ ] Display timestamp and status indicator
- [ ] Image click opens full-screen viewer
- [ ] Use brand accent color for own messages: `bg-[var(--accent)]`

---

### 3.4 ChatInput Component
**File**: `src/app/chat/components/ChatInput.jsx`

**Tasks**:
- [ ] Create textarea with auto-resize
- [ ] File input for images (`<input type="file" accept="image/*">`)
- [ ] Image preview before sending
- [ ] Send button with loading state
- [ ] Enter to send (Shift+Enter for newline)
- [ ] Disable while sending

---

### 3.5 EmptyChat Component
**File**: `src/app/chat/components/EmptyChat.jsx`

**Tasks**:
- [ ] Create empty state with icon
- [ ] "No messages yet" messaging
- [ ] CTA button to start new chat

---

### 3.6 ImageViewerDialog Component
**File**: `src/app/chat/components/ImageViewerDialog.jsx`

**Tasks**:
- [ ] Create modal overlay for full-screen image
- [ ] Close on click outside or X button
- [ ] Use existing modal patterns from codebase

---

### 3.7 LoadingSpinner Component (if not exists)
**File**: `src/app/components/LoadingSpinner.jsx`

**Tasks**:
- [ ] Check if loading spinner exists
- [ ] If not, create reusable spinner component
- [ ] Support size variants (sm, md, lg)

---

## Phase 4: Page Routes

### 4.1 Chat List Page (Update Existing)
**File**: `src/app/chat/page.js`

**Tasks**:
- [ ] Replace placeholder with full implementation
- [ ] Use `useChatList()` hook
- [ ] Header with "Messages" title + new chat button
- [ ] Render `ChatListItem` for each chat
- [ ] Empty state when no chats
- [ ] Loading and error states

---

### 4.2 Chat Room Page
**File**: `src/app/chat/[chatId]/page.js`

**Tasks**:
- [ ] Create dynamic route directory: `src/app/chat/[chatId]/`
- [ ] Create `page.js` with chat room UI
- [ ] Use `useChat(chatId)` hook
- [ ] Header with back button, peer/event name
- [ ] Scrollable message list (newest at bottom)
- [ ] Pagination on scroll up (`loadMore`)
- [ ] Auto-scroll to bottom on new messages
- [ ] Chat input fixed at bottom
- [ ] DM: Click header to view peer profile

---

### 4.3 New Chat Page
**File**: `src/app/chat/new/page.js`

**Tasks**:
- [ ] Create `src/app/chat/new/` directory
- [ ] Create `page.js` for starting new DMs
- [ ] Leverage existing `useUserSearch()` hook
- [ ] Search input with debounce
- [ ] Display search results
- [ ] Filter out existing DM contacts
- [ ] On select: create/get DM chat and navigate

---

## Phase 5: Navigation Integration

### 5.1 Header Badge
**File**: `src/app/components/Header.js`

**Tasks**:
- [ ] Add chat icon to header (near notifications)
- [ ] Show unread count badge from Redux
- [ ] Link to `/chat`
- [ ] Subscribe to total unread on mount

---

### 5.2 Profile "Message" Button
**File**: Profile page/component

**Tasks**:
- [ ] Identify profile page location
- [ ] Add "Message" button for other users
- [ ] On click: `getOrCreateDmChat()` then navigate to `/chat/[chatId]`

---

## Phase 6: Real-time & Sync

### 6.1 Global Unread Listener
**Tasks**:
- [ ] Set up global unread subscription when user logs in
- [ ] Update Redux store on changes
- [ ] Clean up subscription on logout
- [ ] Location: FirebaseContext or a dedicated ChatProvider

---

### 6.2 Cross-Platform Sync Testing
**Tasks**:
- [ ] Test message sent on mobile appears on web
- [ ] Test message sent on web appears on mobile
- [ ] Verify unread counts sync correctly
- [ ] Verify `markChatAsRead` clears on both platforms

---

## Phase 7: Push Notifications (Optional/Future)

### 7.1 FCM Web Setup
**Tasks**:
- [ ] Create service worker: `public/firebase-messaging-sw.js`
- [ ] Initialize FCM in app
- [ ] Request notification permission
- [ ] Save FCM token to user document
- [ ] Handle foreground messages
- [ ] Handle background messages in service worker

---

## Phase 8: Polish & Edge Cases

### 8.1 Error Handling
**Tasks**:
- [ ] Network error states in all components
- [ ] Retry mechanisms for failed sends
- [ ] Toast notifications for errors (use existing react-hot-toast)

### 8.2 Loading States
**Tasks**:
- [ ] Skeleton loaders for chat list
- [ ] Loading indicator for messages
- [ ] Send button loading state

### 8.3 Accessibility
**Tasks**:
- [ ] Keyboard navigation support
- [ ] Screen reader labels
- [ ] Focus management in chat input

### 8.4 Performance
**Tasks**:
- [ ] Virtualization for long chat lists (consider `react-window` if needed)
- [ ] Image lazy loading
- [ ] Debounced scroll handlers

---

## Improvements Identified

### 1. Leverage Existing userSearch Hook
The codebase already has a robust `useUserSearch()` hook with debouncing and caching. Use this for new chat user search instead of creating a new service.

### 2. Use Existing CSS Variables
The spec uses shadcn/ui conventions, but your codebase has a well-defined CSS variable system. Map components accordingly:
- Primary/accent: `var(--accent)` (#ff1f42)
- Background levels: `var(--bg-root)`, `var(--bg-elev-1)`, `var(--bg-elev-2)`
- Text levels: `var(--text-primary)`, `var(--text-secondary)`, `var(--text-tertiary)`
- Borders: `var(--border-subtle)`

### 3. Redux Instead of Zustand
Use Redux Toolkit (already configured) instead of adding Zustand. Add a `chatSlice` to manage unread count globally.

### 4. Single `/chat` Route
Keep the existing `/chat` base route instead of `/messages` for consistency with current URL structure.

### 5. JSDoc Over TypeScript
Maintain JSDoc type annotations consistent with the rest of the codebase rather than converting to TypeScript.

### 6. Reuse MentionAutocomplete Pattern
For user search in new chat, consider reusing the `MentionAutocomplete` component pattern or its underlying logic.

### 7. Add Chat Context Provider (Optional)
Consider creating a `ChatProvider` that wraps authenticated pages to manage chat subscriptions centrally, similar to how `FirebaseProvider` works.

---

## File Structure Summary

```
lib/
├── types/
│   └── chat.js                    # JSDoc type definitions
├── firebase/
│   └── chatService.js             # Firestore chat operations
├── hooks/
│   ├── useChat.js                 # Single chat room hook
│   └── useChatList.js             # Chat list hook
├── chatSlice.js                   # Redux slice for chat state
└── store.js                       # (update to include chatSlice)

src/app/
├── chat/
│   ├── page.js                    # Chat list (update existing)
│   ├── new/
│   │   └── page.js                # New DM page
│   ├── [chatId]/
│   │   └── page.js                # Chat room page
│   └── components/
│       ├── ChatListItem.jsx
│       ├── MessageBubble.jsx
│       ├── ChatInput.jsx
│       ├── EmptyChat.jsx
│       └── ImageViewerDialog.jsx
└── components/
    └── Header.js                  # (update for chat badge)
```

---

## Implementation Order (Recommended)

1. **Phase 1.1**: Types (quick foundation)
2. **Phase 1.2**: Chat Service (core functionality)
3. **Phase 1.3**: Redux Slice (state management)
4. **Phase 2**: Hooks (abstractions)
5. **Phase 4.1**: Chat List Page (see data flowing)
6. **Phase 3.1-3.2**: ChatListItem + MessageBubble (visual components)
7. **Phase 4.2**: Chat Room Page (full messaging)
8. **Phase 3.3-3.5**: Remaining components
9. **Phase 4.3**: New Chat Page
10. **Phase 5**: Navigation Integration
11. **Phase 6**: Real-time sync testing
12. **Phase 8**: Polish

---

## Testing Checklist

### Core Functionality
- [ ] Can view list of existing chats
- [ ] Can open and read messages in a chat
- [ ] Can send text messages
- [ ] Can send image messages
- [ ] Can start new DM with user search
- [ ] Messages appear in real-time (no refresh)
- [ ] Unread counts display and update correctly

### Cross-Platform Sync
- [ ] Message sent on mobile appears on web instantly
- [ ] Message sent on web appears on mobile instantly
- [ ] Opening chat on web clears unread count on mobile (and vice versa)
- [ ] DM chat ID is identical across platforms (`dm_${sorted_ids}`)

### Edge Cases
- [ ] Empty chat list shows proper empty state
- [ ] Very long messages display correctly
- [ ] Many messages paginate properly
- [ ] Network errors handled gracefully
- [ ] Auth state changes handled (logout clears subscriptions)
- [ ] Image upload failures handled with retry option

### Event Chats (if applicable)
- [ ] Event chats appear after ticket purchase
- [ ] Event chats show event name (not peer name)
- [ ] Sender names visible in event chat messages
- [ ] Archived event chats shown as inactive

---

## Questions to Clarify

1. **Event chats**: Will users access event chats through this chat interface, or through the event page? Need to determine navigation flow.

2. **Profile message button**: Where exactly is the profile page that needs a "Message" button? Is it `/profile/[userId]` or `/u/[username]` or both?

3. **Push notifications priority**: Is FCM web push a must-have for initial launch or a future enhancement?

4. **Chat list limits**: Should we limit how many chats appear in the list, or paginate? The spec mentions limit of 50.

5. **Media types**: The spec mentions video support - is this required for initial implementation, or start with images only?

---

*This checklist should be updated as implementation progresses. Check off items and add notes as needed.*
