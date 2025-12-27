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
- [ ] `PostComposer.js`: Make toggle visually prominent (icon + label)
- [ ] `Post.js`: Display privacy status (🔒 private / 🌐 public)
- [ ] `Feed.js`: Filter feed by privacy mode (public-only for non-followers)

### Infinite Scroll

- [ ] `Feed.js`: Fix pagination edge cases (no duplicate posts on scroll)
- [ ] `Feed.js`: Add "end of feed" indicator
- [ ] `Feed.js`: Debounce scroll listener to prevent rapid re-fetches

### Engagement Tracking

- [ ] Verify `track()` events fire for: `post_view`, `post_create`, `post_edit`, `post_delete`
- [ ] Add `track()` for `post_share` if share button exists

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
