# Feed Implementation Improvement Plan

> Enhance RAGESTATE's social feed with core social features, notifications, and UX improvements

---

## Overview

| Phase | Focus | Features | Complexity |
|-------|-------|----------|------------|
| 1 | Core Social | Block/Mute, Report, Emoji Reactions | High |
| 2 | Notifications | Mention notifications, Repost notifications | Medium |
| 3 | UX Polish | Pull-to-refresh, Character counter, Draft persistence, Soft delete | Low-Medium |
| 4 | Performance | Virtual scrolling, Link previews | Medium |
| 5 | Content Safety | Content warnings/NSFW toggle | Low |

---

## Implementation Order

Recommended sequence for incremental deployment:

1. **Phase 3.2-3.4** (Quick wins: char counter, drafts, soft delete)
2. **Phase 1.3** (Reactions - high user value)
3. **Phase 3.1** (Pull-to-refresh)
4. **Phase 1.1** (Block/Mute)
5. **Phase 1.2** (Report system)
6. **Phase 2** (Notifications)
7. **Phase 4.1** (Virtual scrolling)
8. **Phase 4.2** (Link previews)
9. **Phase 5** (Content warnings)

---

## Progress Tracker

### Quick Wins (Phase 3.2-3.4)
- [x] Character counter in PostComposer
- [x] Draft persistence with localStorage
- [x] Soft delete for posts

### Reactions (Phase 1.3)
- [x] Create `lib/firebase/reactionService.js`
- [x] Create `src/app/components/ReactionPicker.js`
- [x] Create `src/app/components/ReactionBar.js`
- [x] Modify `src/app/components/PostActions.js`
- [x] Modify `src/app/components/Post.js`
- [x] Add Firestore rules for `postReactions`
- [x] Create Cloud Function trigger for notifications

### Pull-to-Refresh (Phase 3.1)
- [x] Add pull gesture handling to Feed.js
- [x] Add refresh indicator UI

### Block/Mute (Phase 1.1)
- [x] Create `lib/types/relationship.js`
- [x] Create `lib/firebase/relationshipService.js`
- [x] Create `lib/features/relationshipSlice.js`
- [x] Create `src/app/components/BlockMuteMenu.js`
- [x] Create `src/app/components/BlockedUsersModal.js`
- [x] Modify Feed.js for block filtering
- [x] Modify PostHeader.js for menu actions
- [x] Modify profile page for block/mute button
- [x] Register relationshipSlice in store.js
- [x] Add Firestore rules for `blocks` and `mutes`
- [x] Create Cloud Function for mutual invisibility (`onBlockCreateMutualInvisibility`)
- [x] Create Cloud Function to cleanup on unblock (`onBlockDeleteCleanup`)
- [x] Add Firestore rules for `blockedBy` collection
- [x] Update relationshipService to query `blockedBy` collection

### Report System (Phase 1.2)
- [x] Create `lib/types/report.js`
- [x] Create `lib/firebase/reportService.js`
- [x] Create `src/app/components/ReportModal.js`
- [x] Create `src/app/components/admin/ReportsTab.js`
- [x] Modify PostHeader.js for report option (via BlockMuteMenu integration)
- [x] Modify CommentsSheet.js for report option
- [x] Modify admin page for Reports tab
- [x] Add Firestore rules for `contentReports`
- [x] Create Cloud Function for admin notifications (`onReportCreateNotifyAdmins`)

### Notifications (Phase 2)
- [x] Verify mention notifications in posts (Cloud Function exists: `onPostCreateNotifyMentions`)
- [x] Verify mention notifications in comments (Cloud Function exists: `onPostCommentCreateNotify`)
- [x] Add mention autocomplete to CommentsSheet
- [x] Verify repost notifications (Cloud Function exists: `onRepostCreateNotify`, includes `originalAuthorId`)
- [x] Verify reaction notifications (Cloud Function exists: `onReactionCreateNotify`)

### Virtual Scrolling (Phase 4.1)
- [x] Install @tanstack/react-virtual
- [x] Implement useWindowVirtualizer in Feed.js
- [x] Replace IntersectionObserver infinite scroll with virtualizer-based detection

### Link Previews (Phase 4.2)
- [x] Create `lib/utils/linkPreview.js`
- [x] Create `src/app/components/LinkPreviewCard.js`
- [x] Create `src/app/api/og-metadata/route.js` (Next.js API route for server-side OG fetch)
- [x] Modify PostContent.js for link previews (dynamic client-side fetch)

### Content Safety (Phase 5)
- [x] Create `src/app/components/ContentWarningOverlay.js`
- [x] Modify PostComposer.js for content warning toggle
- [x] Modify PostContent.js for content warning display
- [x] Modify postService.js for contentWarning field
- [x] Modify Post.js to pass contentWarning prop to PostContent

---

## Phase 1: Core Social Features

### 1.1 Block/Mute System

**New Collections:**
```
blocks/{blockerId}_{blockedId}
  blockerId: string
  blockedId: string
  createdAt: timestamp

mutes/{muterId}_{mutedId}
  muterId: string
  mutedId: string
  muteType: 'all' | 'mentions' | 'replies'
  createdAt: timestamp
```

**Files to Create:**

| File | Purpose |
|------|---------|
| `lib/firebase/relationshipService.js` | Block/mute Firestore operations |
| `lib/types/relationship.js` | JSDoc types for blocks, mutes, reports |
| `lib/relationshipSlice.js` | Redux state for blocked/muted users |
| `src/app/components/BlockMuteMenu.js` | UI menu for block/mute actions |
| `src/app/components/BlockedUsersModal.js` | Settings modal to manage blocks |

**Files to Modify:**

| File | Changes |
|------|---------|
| `lib/firebase/postService.js` | Add `getPublicPostsExcludingBlocked()` |
| `src/app/components/Feed.js` | Filter posts by blocked users from Redux |
| `src/app/components/PostHeader.js` | Add block/mute to post menu |
| `src/app/profile/[userId]/page.js` | Add block/mute button on profiles |
| `lib/store.js` | Register relationshipSlice |
| `firestore.rules` | Add rules for blocks/mutes collections |

**relationshipService.js Operations:**
```javascript
// Block operations
isBlocked(blockerId, blockedId)
block(blockerId, blockedId)
unblock(blockerId, blockedId)
toggleBlock(blockerId, blockedId)
getBlockedUsers(userId, lastDoc, pageSize)

// Mute operations
isMuted(muterId, mutedId)
mute(muterId, mutedId, muteType)
unmute(muterId, mutedId)
getMutedUsers(userId)

// Feed filtering
getExcludedUserIds(currentUserId) // Returns blocked + muted IDs
```

---

### 1.2 Report System

**New Collection:**
```
contentReports/{reportId}
  reporterId: string
  reportedUserId: string
  contentType: 'post' | 'comment' | 'profile' | 'chat'
  contentId: string
  reason: 'harassment' | 'spam' | 'inappropriate' | 'scam' | 'other'
  description: string (optional)
  createdAt: timestamp
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  reviewedBy: string | null
  reviewedAt: timestamp | null
  action: string | null
```

**Files to Create:**

| File | Purpose |
|------|---------|
| `lib/firebase/reportService.js` | Report submission and admin queries |
| `src/app/components/ReportModal.js` | Report submission UI |
| `src/app/admin/components/ReportsTab.js` | Admin moderation dashboard |
| `functions/triggers/onReportCreated.js` | Notify admins on new reports |

**Files to Modify:**

| File | Changes |
|------|---------|
| `src/app/components/PostHeader.js` | Add "Report" to post menu |
| `src/app/components/CommentsSheet.js` | Add report option to comments |
| `src/app/admin/page.js` | Add Reports tab to admin dashboard |
| `firestore.rules` | Add rules for contentReports collection |

**reportService.js Operations:**
```javascript
submitReport({ contentType, contentId, reason, description })
getReports(status, lastDoc, pageSize) // Admin only
updateReportStatus(reportId, status, action) // Admin only
getReportsByUser(reportedUserId) // Admin - check repeat offenders
```

---

### 1.3 Persistent Emoji Reactions

**New Collection:**
```
postReactions/{postId}_{userId}_{emoji}
  postId: string
  userId: string
  emoji: string (single emoji)
  postOwnerId: string (for notifications)
  createdAt: timestamp
```

**Files to Create:**

| File | Purpose |
|------|---------|
| `lib/firebase/reactionService.js` | Reaction CRUD operations |
| `src/app/components/ReactionPicker.js` | Emoji picker overlay |
| `src/app/components/ReactionBar.js` | Display aggregated reactions |
| `functions/triggers/onReactionCreated.js` | Send reaction notifications |

**Files to Modify:**

| File | Changes |
|------|---------|
| `src/app/components/PostActions.js` | Replace local reactions with persistent |
| `src/app/components/Post.js` | Display ReactionBar below content |
| `lib/types/post.js` | Add Reaction type definition |
| `firestore.rules` | Add rules for postReactions collection |

**reactionService.js Operations:**
```javascript
addReaction(postId, userId, emoji, postOwnerId)
removeReaction(postId, userId, emoji)
toggleReaction(postId, userId, emoji, postOwnerId)
getReactionsForPost(postId) // Returns { emoji: count, users: [...] }
getUserReactionForPost(postId, userId) // Returns emoji or null
```

**Supported Emojis (initial set):**
```javascript
const REACTION_EMOJIS = ['👍', '❤️', '🔥', '😂', '😮', '😢'];
```

---

## Phase 2: Notifications

### 2.1 Mention Notifications

**Current State:** Cloud Function `onPostCreateNotifyMentions` exists but needs verification.

**Files to Modify:**

| File | Changes |
|------|---------|
| `functions/notifications.js` | Verify mention detection in comments |
| `src/app/components/CommentsSheet.js` | Add mention detection to comment input |
| `lib/hooks/useMentionDetection.js` | Reuse in CommentsSheet (currently only PostComposer) |

**Verification:**
- Create post with @username -> recipient gets notification
- Create comment with @username -> recipient gets notification
- Respect user's `mention` notification preference

---

### 2.2 Repost Notifications

**Current State:** Cloud Function `onRepostCreateNotify` exists.

**Files to Verify:**

| File | Check |
|------|-------|
| `functions/notifications.js` | Confirm repost trigger works |
| `lib/firebase/postService.js` | Ensure `createRepost()` includes `originalPostOwnerId` |

**New Notification Type for Reactions:**

Add to `functions/notifications.js`:
```javascript
// New trigger: onReactionCreated
exports.onReactionCreateNotify = onDocumentCreated(
  'postReactions/{reactionId}',
  async (event) => {
    // Create notification: "Jane reacted with 👍 to your post"
  }
);
```

---

## Phase 3: UX Polish

### 3.1 Pull-to-Refresh

**File to Modify:** `src/app/components/Feed.js`

**Implementation:**
```javascript
// Add touch handling for pull gesture
const [isPulling, setIsPulling] = useState(false);
const [pullDistance, setPullDistance] = useState(0);
const PULL_THRESHOLD = 80;

// On release above threshold, trigger refresh
const handleRefresh = async () => {
  setIsRefreshing(true);
  const { posts } = await getPublicPosts(null, PAGE_SIZE);
  setPosts(posts);
  setIsRefreshing(false);
};
```

**UI Component:** Add refresh indicator at top of feed
```jsx
{isPulling && (
  <div style={{ height: pullDistance }} className="flex items-center justify-center">
    <RefreshIcon className={`h-6 w-6 ${pullDistance > PULL_THRESHOLD ? 'text-accent' : 'text-gray-400'}`} />
  </div>
)}
```

---

### 3.2 Character Counter

**File to Modify:** `src/app/components/PostComposer.js`

**Implementation:**
```javascript
const MAX_CHARS = 2000;
const charCount = content.length;
const isNearLimit = charCount > MAX_CHARS * 0.9; // 90%
const isOverLimit = charCount > MAX_CHARS;

// Add counter near submit button (around line 758)
<span className={`text-sm ${isOverLimit ? 'text-[var(--danger)]' : isNearLimit ? 'text-[var(--warning)]' : 'text-[var(--text-tertiary)]'}`}>
  {charCount}/{MAX_CHARS}
</span>
```

---

### 3.3 Draft Persistence (localStorage)

**File to Modify:** `src/app/components/PostComposer.js`

**Current:** Uses `sessionStorage` (lost on browser close)
**Change to:** `localStorage` (persists across sessions)

```javascript
// Change line 212 and 229
const DRAFT_KEY = 'postComposer.draft';

// Load
const savedDraft = localStorage.getItem(DRAFT_KEY); // was sessionStorage

// Save
localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); // was sessionStorage

// Clear
localStorage.removeItem(DRAFT_KEY);
```

---

### 3.4 Soft Delete for Posts

**File to Modify:** `src/app/components/Post.js`

**Current:** Uses `deleteDoc()` (hard delete)
**Change to:** Use existing `softDelete()` utility

```javascript
import { softDelete } from '../../../lib/firebase/softDelete';

// Replace deleteDoc with softDelete
const handleDelete = async () => {
  try {
    await softDelete('posts', post.id, currentUser.uid);
    // Optimistically remove from UI
    onDelete?.(post.id);
  } catch (error) {
    console.error('Error deleting post:', error);
    alert('Failed to delete post');
  }
};
```

**File to Modify:** `lib/firebase/postService.js`

Add soft delete filter to queries:
```javascript
import { notDeleted } from './softDelete';

// Update getPublicPosts query
const q = query(
  collection(db, POSTS_COLLECTION),
  where('isPublic', '==', true),
  notDeleted(), // Add this
  orderBy('timestamp', 'desc'),
  limit(pageSize)
);
```

---

## Phase 4: Performance

### 4.1 Virtual Scrolling

**Install Dependency:**
```bash
npm install @tanstack/react-virtual
```

**File to Modify:** `src/app/components/Feed.js`

**Implementation:**
```javascript
import { useVirtualizer } from '@tanstack/react-virtual';

const parentRef = useRef(null);
const virtualizer = useVirtualizer({
  count: posts.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 400, // Estimated post height
  overscan: 5, // Render 5 extra items above/below viewport
});

// Render
<div ref={parentRef} className="h-screen overflow-auto">
  <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
    {virtualizer.getVirtualItems().map((virtualItem) => (
      <div
        key={posts[virtualItem.index].id}
        style={{
          position: 'absolute',
          top: virtualItem.start,
          width: '100%',
        }}
      >
        <Post post={posts[virtualItem.index]} />
      </div>
    ))}
  </div>
</div>
```

---

### 4.2 Link Previews (Open Graph)

**Files to Create:**

| File | Purpose |
|------|---------|
| `lib/utils/linkPreview.js` | Extract URLs, fetch OG metadata |
| `src/app/components/LinkPreviewCard.js` | Render link preview UI |
| `functions/api/ogMetadata.js` | Server-side OG fetch (avoid CORS) |

**Files to Modify:**

| File | Changes |
|------|---------|
| `src/app/components/PostContent.js` | Render LinkPreviewCard for URLs |
| `lib/firebase/postService.js` | Store link previews on post creation |

**Link Preview Data Structure:**
```javascript
{
  url: string,
  title: string,
  description: string,
  image: string | null,
  siteName: string | null,
  fetchedAt: timestamp
}
```

**PostContent.js Integration:**
```jsx
{post.linkPreviews?.map((preview) => (
  <LinkPreviewCard key={preview.url} preview={preview} />
))}
```

---

## Phase 5: Content Safety

### 5.1 Content Warnings / NSFW Toggle

**Schema Addition to Posts:**
```javascript
{
  // Existing fields...
  contentWarning: string | null, // e.g., "Sensitive content", "Spoilers"
  isNSFW: boolean
}
```

**Files to Create:**

| File | Purpose |
|------|---------|
| `src/app/components/ContentWarningOverlay.js` | Blur + "Show content" button |

**Files to Modify:**

| File | Changes |
|------|---------|
| `src/app/components/PostComposer.js` | Add content warning toggle |
| `src/app/components/PostContent.js` | Wrap with ContentWarningOverlay if flagged |
| `lib/firebase/postService.js` | Include contentWarning in createPost |

**ContentWarningOverlay.js:**
```jsx
function ContentWarningOverlay({ warning, children }) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) return children;

  return (
    <div className="relative">
      <div className="blur-lg pointer-events-none">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
        <p className="text-white mb-2">{warning || 'Sensitive content'}</p>
        <button onClick={() => setRevealed(true)} className="btn-secondary">
          Show content
        </button>
      </div>
    </div>
  );
}
```

---

## File Summary

### New Files (14)

```
lib/firebase/relationshipService.js
lib/firebase/reportService.js
lib/firebase/reactionService.js
lib/types/relationship.js
lib/relationshipSlice.js
lib/utils/linkPreview.js
src/app/components/BlockMuteMenu.js
src/app/components/BlockedUsersModal.js
src/app/components/ReportModal.js
src/app/components/ReactionPicker.js
src/app/components/ReactionBar.js
src/app/components/LinkPreviewCard.js
src/app/components/ContentWarningOverlay.js
src/app/admin/components/ReportsTab.js
```

### Modified Files (15)

```
lib/firebase/postService.js (soft delete filter, link previews)
lib/store.js (register relationshipSlice)
lib/types/post.js (add Reaction type)
src/app/components/Feed.js (block filtering, pull-to-refresh, virtual scroll)
src/app/components/Post.js (soft delete, reaction bar)
src/app/components/PostActions.js (persistent reactions)
src/app/components/PostHeader.js (block/mute/report menu)
src/app/components/PostComposer.js (char counter, localStorage drafts, content warning)
src/app/components/PostContent.js (link previews, content warning overlay)
src/app/components/CommentsSheet.js (mention detection, report option)
src/app/profile/[userId]/page.js (block/mute button)
src/app/admin/page.js (Reports tab)
firestore.rules (blocks, mutes, reports, reactions rules)
functions/notifications.js (reaction notifications)
package.json (add @tanstack/react-virtual)
```

### Cloud Functions (4 new triggers - all implemented in notifications.js)

```
onReportCreateNotifyAdmins - Notifies admins when content is reported
onReactionCreateNotify - Sends reaction notifications (already existed)
onBlockCreateMutualInvisibility - Creates blockedBy doc for mutual invisibility
onBlockDeleteCleanup - Removes blockedBy doc when block is removed
```

---

## Verification Checklist

### Phase 3 Quick Wins
- [ ] Character counter shows and changes color near limit
- [ ] Character counter prevents posting over limit
- [ ] Close browser, reopen -> draft recovered
- [ ] Delete post -> soft deleted (recoverable in DB)
- [ ] Soft-deleted posts don't appear in feed

### Phase 1.3 Reactions
- [ ] Add emoji reaction -> persists on refresh
- [ ] Remove reaction -> updates immediately
- [ ] Reaction counts aggregate correctly
- [ ] Multiple users can react with same emoji
- [ ] User can only have one of each emoji per post

### Phase 3.1 Pull-to-Refresh
- [ ] Pull down on feed -> refreshes posts
- [ ] Refresh indicator appears during pull
- [ ] New posts appear after refresh

### Phase 1.1 Block/Mute
- [ ] Block user -> their posts disappear from feed
- [ ] Blocked user cannot see blocker's posts
- [ ] Mute user -> their posts hidden, can unmute
- [ ] Manage blocked users from settings

### Phase 1.2 Report System
- [ ] Report post -> appears in admin Reports tab
- [ ] Report includes reason and optional description
- [ ] Admin can review/resolve reports
- [ ] Rate limiting prevents report spam

### Phase 2 Notifications
- [ ] @mention in post -> recipient notified
- [ ] @mention in comment -> recipient notified
- [ ] Repost -> original author notified
- [ ] Reaction -> post author notified

### Phase 4.1 Virtual Scrolling
- [ ] Scroll through 100+ posts -> smooth performance
- [ ] Memory usage stays stable with many posts
- [ ] Scroll position maintained on navigation back

### Phase 4.2 Link Previews
- [ ] Post with URL -> link preview card appears
- [ ] Link preview shows title, description, image
- [ ] Missing OG data handled gracefully

### Phase 5 Content Safety
- [ ] Mark post as sensitive -> shows blur overlay
- [ ] Click "Show content" -> reveals post
- [ ] Content warning text displays correctly

### Build Verification
```bash
npm run lint    # No errors
npm run build   # Passes
```

---

## Risk Mitigation

1. **Block filtering performance**: Cache blocked user IDs in Redux with 5-min TTL
2. **Reaction spam**: Rate limit to 1 reaction per second per user
3. **Report abuse**: Rate limit to 5 reports per hour per user
4. **Virtual scroll jank**: Use `estimateSize` based on actual measured heights
5. **Link preview CORS**: Fetch via Cloud Function, not client-side

---

## Notes

- Each phase can be deployed independently
- Run `npm run lint && npm run build` after each phase
- Test on mobile viewport sizes
- Update Firestore rules before deploying new collections
