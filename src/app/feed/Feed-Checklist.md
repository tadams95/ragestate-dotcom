# Phase 1: Feed & Social Completion Checklist

> **Target**: 1-3 months | **Goal**: Sticky user base for acquisition due diligence

---

## 1. Feed Enhancements (1-2 weeks)

### Edit/Delete Posts

- [x] `Post.js`: Edit modal with content + privacy toggle
- [x] `Post.js`: Delete confirmation + Firestore `deleteDoc`
- [x] `Post.js`: Show "edited" indicator on updated posts
- [x] `firestore.rules`: Verify only author can update/delete own posts
- [x] `functions/feed.js`: Cleanup trigger on post delete (remove likes, comments, userFeeds)

### Privacy Toggle

- [x] `PostComposer.js`: `isPublic` state toggle exists
- [x] `PostComposer.js`: Make toggle visually prominent (icon + label)
- [x] `Post.js`: Display privacy status (🔒 Private — author-only, shown when private)
- [x] `Feed.js`: Main feed shows public posts only (private posts visible on author's profile — matches Instagram/X behavior)

### Infinite Scroll

- [x] `Feed.js`: Fix pagination edge cases (deduplication via Set + loading guard)
- [x] `Feed.js`: Add "end of feed" indicator ("You've reached the end 🎉")
- [x] `Feed.js`: Debounce scroll listener (loading guard + reduced rootMargin)

### Engagement Tracking

- [x] Verify `track()` events fire for: `post_view`, `post_create`, `post_edit`, `post_delete` ✅
- [x] Add `track()` for `post_share` — already exists in PostActions.js

### Media Uploads (Images)

> **Status**: Upload backend works; display is missing

- [x] `firebase/firebase.js`: Storage initialized (`ragestate-app.appspot.com`)
- [x] `storage.rules`: `posts/{postId}/{filename}` allows auth uploads ≤10MB images
- [x] `PostComposer.js`: `uploadBytes` + `getDownloadURL` saves `mediaUrls[]` to Firestore
- [x] `PostComposer.js`: Local preview via `URL.createObjectURL`
- [x] `Post.js`: Pass `mediaUrls` from `liveData` / `postData` to `PostContent`
- [x] `PostContent.js`: Render image grid (single image full-width, 2+ in 2-col grid)
- [x] `PostContent.js`: Lightbox/modal for tapping images
- [x] `EditPostModal.js`: Show existing images, allow removal (not re-upload for now)

### Media Uploads (Video) — Phase 2

> **Status**: ✅ Core implementation complete

- [x] `storage.rules`: Add video rule (`video/*`, size limit 100MB)
- [x] `PostComposer.js`: Accept `video/*` in file picker
- [x] `PostComposer.js`: Video preview (`<video>` element with controls)
- [x] `PostContent.js`: Render `<video>` with TikTok/Reels-style player
  - Auto-play on scroll (muted, via IntersectionObserver)
  - Tap to play/pause
  - Tap to mute/unmute
  - Progress bar with seek
  - Loop playback
  - Auto-hide controls
- [x] Compression/transcoding strategy defined

### Video Optimization (Compression & Transcoding)

> **Goal**: 95% bandwidth cost reduction, instant playback for users

#### Phase A: Client-Side Compression (Quick Win — Free)

- [x] `PostComposer.js`: Add video dimension/duration validation (max 1080p, 60s for feed)
- [x] `PostComposer.js`: Use `<canvas>` + MediaRecorder API to re-encode large videos client-side
- [x] `PostComposer.js`: Show compression progress indicator
- [x] `PostComposer.js`: Target output: 720p, 2Mbps bitrate, H.264/VP8 codec
- [x] Fallback: If browser doesn't support re-encoding, upload raw (capped at 100MB)

#### Phase B: Server-Side Transcoding (Scale — Pay per transcode)

> **Status**: ✅ Complete — Cloud Function + FFmpeg implementation

- [x] Create `functions/transcode.js`: Cloud Function with Storage `onObjectFinalized` trigger
- [x] Configure output: `720p_h264.mp4` stored in `posts-optimized/{postId}/` (separate folder for safe lifecycle)
- [x] `PostContent.js`: Prefer optimized URL if available, fallback to original
- [x] Add `isProcessing` field to post doc while transcoding runs
- [x] `PostContent.js`: Show "Processing video…" placeholder during transcode
- [x] `storage.rules`: Allow reads for `posts-optimized/` folder, writes via Admin SDK only
- [x] `firestore.rules`: Prevent client modification of `isProcessing`/`optimizedMediaUrls`
- [x] Storage lifecycle rule: Delete originals in `posts/` after 7 days (safe—won't touch `posts-optimized/`)

#### Phase C: Adaptive Bitrate (Growth — Premium UX)

- [ ] Generate multiple resolutions (360p, 720p, 1080p) via transcoding
- [ ] Implement HLS/DASH manifest for adaptive streaming
- [ ] `PostContent.js`: Use hls.js or native HLS for quality switching

---

## 1.5 Comments Architecture (1 week)

> **Status**: Core works; missing delete UI, avatar bug fixed, notification data bug

### Modal & Scroll Fixes

- [x] `CommentsSheet.js`: Lock body scroll when open (prevent feed/footer bleed-through)
- [x] `CommentsSheet.js`: Close on backdrop click and Escape key
- [x] `CommentsSheet.js`: Proper aria attributes for accessibility

### Post Detail Page (Shareable Links)

> **Goal**: Enable users to share/link directly to posts for comments (like X/Instagram)
> **Status**: ✅ Complete

- [x] Create `src/app/post/[postId]/page.js` — dedicated post detail route (server component with SEO)
- [x] `PostHeader.js`: Make post timestamp clickable → `/post/{postId}`
- [x] `page.js`: Fetch single post by ID via Firebase Admin SDK, render full `<Post>` component
- [x] `page.js`: Inline comments thread below post (new `InlineComments.js` component)
- [x] `page.js`: SEO meta tags (og:title from author, og:image from first media, dynamic description)
- [x] `page.js`: Handle 404 if post doesn't exist; private post shows "This post is private" for non-authors
- [x] `CommentsSheet.js`: Add "Open in new tab" icon link to post detail page

### Backend Fixes

- [x] `CommentsSheet.js`: Include `postOwnerId` in `addDoc` for notifications to fire
- [x] Verify `onPostCommentCreateNotify` receives `postOwnerId` correctly
- [x] `CommentsSheet.js`: Fix avatar not showing — use `profiles/{uid}.profilePicture` instead of Auth `photoURL`

### Delete UI

- [x] `CommentsSheet.js`: Show delete icon (🗑) on own comments (hover or swipe)
- [x] `CommentsSheet.js`: Delete comment with confirmation
- [x] Firestore rules already allow author delete ✅

### Post Author Moderation

- [x] `CommentsSheet.js`: Show delete icon (🗑) on all comments for post author (hover)
- [x] `CommentsSheet.js`: Delete any comment with confirmation (post author only)
- [x] Firestore rules already allow post author delete ✅

### Reply Threading

- [x] Add `parentId` field to comment schema (null = top-level)
- [x] `firestore.rules`: Allow `parentId` on create
- [x] `firestore.indexes.json`: Add index for `postComments(postId, parentId, timestamp)`
- [ ] `CommentsSheet.js`: Render nested replies (indent or thread view)
- [ ] `CommentsSheet.js`: "Reply" button on each comment
- [ ] `CommentsSheet.js`: Collapse/expand long threads

### Comment Likes

- [ ] Create `postCommentLikes` collection: `{ commentId, postId, userId, timestamp }`
- [ ] `firestore.rules`: Add rules for `postCommentLikes` (auth create/delete own)
- [ ] `functions/feed.js`: Add `onCommentLikeCreate`/`Delete` to update `likeCount` on comment
- [ ] `CommentsSheet.js`: Heart icon + count on each comment
- [ ] `CommentsSheet.js`: Optimistic like toggle

### Consistency Checks

- [x] `firestore.rules`: Author can delete own comment, immutable `postId`/`userId`
- [x] `firestore.indexes.json`: `postComments(postId, timestamp)` index exists
- [x] `functions/feed.js`: `commentCount` increment/decrement triggers exist
- [x] `functions/notifications.js`: Comment + @mention notifications exist

---

## 2. Notifications v1 (2-4 weeks)

### Backend (`functions/notifications.js`)

- [x] Triggers exist: `onPostLikeCreateNotify`, `onPostCommentCreateNotify`
- [x] Quiet hours logic implemented
- [x] Aggregation logic for multiple likes/comments
- [ ] Add `onNewFollower` trigger → notify followed user
- [ ] Add `onPostMention` trigger → notify mentioned user (if @mentions exist)
- [ ] Test push sender with FCM web tokens

### In-App Notification Feed

- [ ] Create `src/app/account/notifications/page.js`
- [ ] Query `users/{uid}/notifications` ordered by `createdAt` desc
- [ ] Mark notifications as `read: true` on view
- [ ] Decrement `unreadNotifications` counter on user doc

### Notification Bell Component

- [ ] Create `src/app/components/NotificationBell.js`
- [ ] Show unread count badge (red dot or number)
- [ ] Link to `/account/notifications`
- [ ] Add to `Header.js` (visible when logged in)

### Preferences Page

- [ ] Create `src/app/account/notifications/settings/page.js` (or section)
- [ ] Toggle: Enable/disable push notifications
- [ ] Toggle: Quiet hours (start/end time, timezone)
- [ ] Toggle: Per-type preferences (likes, comments, follows)
- [ ] Save to `users/{uid}.notificationPrefs`

### Device Registry

- [ ] On login/app load: Request FCM permission
- [ ] Store token in `users/{uid}/devices/{deviceId}`
- [ ] Handle token refresh
- [ ] Remove stale tokens on logout

---

## 3. Social UI Polish & QA (1-2 weeks)

### Apply Design Spec (`docs/social-ui-design-spec.md`)

- [ ] `Feed.js`: Use correct color tokens (`--bg-elev-1`, `--border-subtle`)
- [ ] `Post.js`: 14px border-radius, proper shadow
- [ ] `PostComposer.js`: 20px radius, modal shadow per spec
- [ ] `Header.js`: Consistent icon sizing (20px), 44px tap targets

### Skeleton Loaders

- [ ] `Feed.js`: Show `PostSkeleton` during initial load
- [ ] `Feed.js`: Show skeleton during pagination fetch
- [ ] Skeleton matches post card dimensions

### Badges & Counters

- [ ] Like/comment counts use `--text-secondary` color
- [ ] Author name uses `--text-primary`, 15px/600 weight
- [ ] Timestamps use `--text-tertiary`, 12px/500 weight

### Mobile QA Checklist

- [ ] All tap targets ≥44px
- [ ] Safe area padding on iOS (notch, home indicator)
- [ ] Composer opens without keyboard overlap
- [ ] Scroll performance smooth (no jank)
- [ ] Test on: iPhone SE, iPhone 14, Pixel 5, Galaxy S21

---

## 4. Abuse Gates (1 week)

### Rate Limiting

- [x] `functions/feed.js`: Post rate limit (3 posts/5 min) exists
- [ ] `src/app/create-account/page.js`: Add account creation rate limit (IP-based, 3/hour)
- [ ] `src/app/login/page.js`: Add failed login attempt limit (5 attempts/15min)
- [ ] Cloud Function rate limits: Use Firebase `onCall` with custom throttling

### Honeypot Fields (Invisible Bot Trap)

- [ ] Add hidden field to signup form (e.g., `<input name="website" style="display:none">`)
- [ ] Add hidden field to login form
- [ ] Reject submissions where honeypot is filled (bots auto-fill everything)

### Firebase App Check (Recommended)

- [ ] Enable App Check in Firebase Console
- [ ] Add reCAPTCHA Enterprise or DeviceCheck provider
- [ ] Initialize in `firebase/firebase.js`: `initializeAppCheck(app, { provider })`
- [ ] Enforce on Cloud Functions (optional, adds device attestation)

### Spam Prevention

- [ ] Block disposable email domains on signup (list: `mailinator`, `tempmail`, etc.)
- [x] Require email verification before posting (already in `PostComposer.js`)
- [ ] Monitor spam account rate (target: <1%)

---

## Success Metrics

| Metric          | Target | How to Measure                    |
| --------------- | ------ | --------------------------------- |
| Feed engagement | +20%   | `post_view` / `post_create` ratio |
| Return visits   | +30%   | D7 retention in Vercel Analytics  |
| Spam accounts   | <1%    | Manual review of new signups      |
| Mobile QA       | Pass   | All checklist items green         |

---

## Files Reference

| Area          | Files                                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| Feed          | `src/app/components/Post.js`, `PostComposer.js`, `Feed.js`, `PostSkeleton.js`                            |
| Notifications | `functions/notifications.js`, `src/app/components/NotificationBell.js`, `src/app/account/notifications/` |
| Auth          | `src/app/create-account/page.js`, `src/app/login/page.js`                                                |
| Header        | `src/app/components/Header.js`                                                                           |
| Rules         | `firestore.rules`                                                                                        |
| Design        | `docs/social-ui-design-spec.md`                                                                          |

---

**Phase 1 Complete When**: All checkboxes marked ✅ and success metrics hit.
