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

## 1.6 Repost Feature (1 week)

> **Goal**: Allow users to share others' posts to their followers (like X/Twitter retweet)
> **Status**: Not started

### Data Model

- [x] Add `repostOf` field to post schema: `{ postId, authorId, authorName, authorPhoto }` (null for original posts)
- [x] Add `repostCount` field to posts (incremented/decremented by triggers)
- [x] Create `postReposts` collection: `{ postId, userId, timestamp }` for tracking who reposted
- [x] `firestore.indexes.json`: Add index for `postReposts(postId, userId)` for duplicate checks

### Firestore Rules (`firestore.rules`)

- [x] `postReposts`: Auth user can create/delete own reposts only
- [x] `postReposts`: Immutable `postId`/`userId` after creation
- [x] `posts`: Allow `repostOf` on create (validated structure)
- [x] `posts`: Prevent client modification of `repostCount`

### Backend Triggers (`functions/feed.js`)

- [x] `onRepostCreate`: Increment `repostCount` on original post
- [x] `onRepostCreate`: Fan-out repost to reposter's followers' feeds
- [x] `onRepostDelete`: Decrement `repostCount` on original post
- [x] `onRepostDelete`: Remove from followers' feeds

### Notifications (`functions/notifications.js`)

- [x] `onRepostCreateNotify`: Notify original post author ("X reposted your post")
- [x] Respect quiet hours and notification preferences

### UI Components

#### Repost Button (`PostActions.js`)

- [x] Add repost icon (🔁) next to like/comment/share
- [x] Show repost count
- [x] Highlight icon if current user has reposted
- [x] Tap opens repost menu (Simple Repost / Quote Repost / Undo)

#### Repost Display (`Post.js`)

- [x] Show "🔁 Reposted by [username]" header above reposted content
- [x] Link to reposter's profile
- [x] Render original post content (author, text, media) in embedded card style
- [x] Original post links to `/post/{originalPostId}`

#### Quote Repost (`PostComposer.js`)

- [x] Accept `quotedPost` prop to embed original post below new content
- [x] Show quoted post preview in composer
- [x] Save as new post with `repostOf` + user's additional text

#### Undo Repost

- [x] `PostActions.js`: Show "Undo Repost" in menu if already reposted
- [x] Delete from `postReposts` + delete the repost post doc
- [x] Optimistic UI update

### Edge Cases

- [x] Prevent reposting own posts (or allow? — decide UX) → **Allowed** (like X/Twitter — users can bump their own content)
- [x] Prevent reposting private posts
- [x] Handle deleted original posts gracefully (show "Original post unavailable")
- [x] Prevent duplicate reposts (check `postReposts` before creating)
- [x] Repost of a repost → links to original (flatten chain)

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
- [x] `CommentsSheet.js`: Render nested replies (indent or thread view)
- [x] `CommentsSheet.js`: "Reply" button on each comment
- [x] `CommentsSheet.js`: Collapse/expand long threads

### Comment Likes

- [x] Create `postCommentLikes` collection: `{ commentId, postId, userId, timestamp }`
- [x] `firestore.rules`: Add rules for `postCommentLikes` (auth create/delete own)
- [x] `functions/feed.js`: Add `onCommentLikeCreate`/`Delete` to update `likeCount` on comment
- [x] `CommentsSheet.js`: Heart icon + count on each comment
- [x] `CommentsSheet.js`: Optimistic like toggle

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
- [x] Add `onNewFollower` trigger → notify followed user
- [x] Add `onPostMention` trigger → notify mentioned user (if @mentions exist)
- [x] Test push sender with FCM web tokens

### In-App Notification Feed

- [x] Create `src/app/account/notifications/page.js`
- [x] Query `users/{uid}/notifications` ordered by `createdAt` desc
- [x] Mark notifications as `read: true` on view
- [x] Decrement `unreadNotifications` counter on user doc

### Notification Bell Component

- [x] Create `src/app/components/NotificationBell.js`
- [x] Show unread count badge (red dot or number)
- [x] Link to `/account/notifications`
- [x] Add to `Header.js` (visible when logged in)

### Preferences Page

- [x] Create `src/app/account/notifications/settings/page.js` (or section)
- [x] Toggle: Enable/disable push notifications
- [x] Toggle: Quiet hours (start/end time, timezone)
- [x] Toggle: Per-type preferences (likes, comments, follows)
- [x] Save to `users/{uid}.notificationPrefs`

### Device Registry

- [x] On login/app load: Request FCM permission
- [x] Store token in `users/{uid}/devices/{deviceId}`
- [x] Handle token refresh
- [x] Remove stale tokens on logout

---

## 2.5 Google Sign-In (Social Login)

> **Goal**: Allow users to sign in/up with Google for faster onboarding

### Firebase Console Setup

- [x] Enable Google provider in Firebase Console → Authentication → Sign-in method
- [x] Verify authorized domains include `localhost` and production URL

### Auth Helper (`lib/utils/auth.js`)

- [x] Add `signInWithGoogle()` function using `GoogleAuthProvider` + `signInWithPopup`
- [x] Handle new user creation (check if `customers/{uid}` exists, create if not)
- [x] Sync profile data (name, email, photo) to Firestore `profiles/{uid}`

### Login Page (`src/app/login/page.js`)

- [x] Add "Sign in with Google" button (styled with Google branding)
- [x] Call `signInWithGoogle()` on click
- [x] Handle success (dispatch login, save to storage, redirect)
- [x] Handle errors (display user-friendly message)

### Create Account Page (`src/app/create-account/page.js`)

- [x] Add "Sign up with Google" button
- [x] Reuse same `signInWithGoogle()` flow (Firebase handles new vs existing)
- [x] Skip email verification for Google accounts (already verified)

### Profile Data Handling

- [x] On Google sign-in: populate `profiles/{uid}` with Google displayName + photoURL
- [x] Allow users to edit name/photo later (don't overwrite on subsequent logins)
- [x] Handle edge case: user has email/password account, then tries Google with same email

---

## 3. Social UI Polish & QA (1-2 weeks)

### Apply Design Spec (`docs/social-ui-design-spec.md`)

- [x] **Spec Update**: Updated spec with Repost UI, Commerce Integration, and Profile Shop details.
- [x] `Feed.js`: Use correct color tokens (`--bg-elev-1`, `--border-subtle`) — uses `border-white/10`, `bg-white/5` (equivalent)
- [x] `Post.js`: 14px border-radius, proper shadow — `rounded-[14px]`, `shadow-[0_4px_12px_-4px_#000c]` ✅
- [x] `PostComposer.js`: 20px radius, modal shadow per spec — `rounded-[20px]`, `shadow-[0_8px_28px_-8px_#000f]`
- [x] `Header.js`: Consistent icon sizing (20px), 44px tap targets — icons `h-5 w-5`, targets `h-11 w-11`

### Skeleton Loaders

- [x] `Feed.js`: Show `PostSkeleton` during initial load — shows 3 skeletons when `posts.length === 0 && loading`
- [x] `Feed.js`: Show skeleton during pagination fetch — shows 1 skeleton when `loading && posts.length > 0`
- [x] Skeleton matches post card dimensions — same `rounded-[14px]`, `border`, `bg`, `p-4`, `shadow` as Post.js

### Badges & Counters

- [x] Like/comment counts use `--text-secondary` color — `text-[#a1a5ab]` on PostActions container
- [x] Author name uses `--text-primary`, 15px/600 weight — `text-[#f5f6f7]` in PostHeader.js
- [x] Timestamps use `--text-tertiary`, 12px/500 weight — `text-[#5d6269]` with `font-medium` in PostHeader.js

### Verification Badges

- [x] Add `isVerified` field to `profiles/{uid}` schema (admin-only write) — fixed operator precedence in firestore.rules; `isVerified` excluded from allowed keys
- [x] `PostHeader.js`: Show ✓ badge next to verified usernames — `VerifiedBadge` component with `isVerified` prop
- [x] `EmbeddedPost` (reposts): Show ✓ badge for verified original authors — fetches `originalAuthorVerified` from profiles
- [x] `CommentsSheet.js`: Show ✓ badge on verified commenters — `verifiedUserIds` Set populated from profiles
- [x] Style: Red checkmark icon (RAGESTATE brand) — `text-[#ff1f42]` using badge SVG

### Mobile QA Checklist

- [x] All tap targets ≥44px — CommentsSheet buttons, PostComposer close button updated to 44px minimum
- [x] Safe area padding on iOS (notch, home indicator) — viewport-fit=cover, safe-area utilities in globals.css, Feed/Footer padding
- [x] Composer opens without keyboard overlap — items-end positioning, overflow-y-auto, safe-area-inset-bottom
- [x] Scroll performance smooth (no jank) — IntersectionObserver, useCallback, deduplication, loading guards
- [ ] Test on: iPhone SE, iPhone 14, Pixel 5, Galaxy S21

---

## 4. Abuse Gates (1 week)

### Rate Limiting

- [x] `functions/feed.js`: Post rate limit (3 posts/5 min) exists
- [x] `src/app/create-account/page.js`: Add account creation rate limit (3/hour) — client-side via `lib/utils/rateLimit.js`, checks before and during signup
- [x] `src/app/login/page.js`: Add failed login attempt limit (5 attempts/15min) — records only failed attempts, clears on success
- [x] Cloud Function rate limits: Firestore-based throttling in `functions/rateLimit.js` — applied to `batchMarkNotificationsRead`, `testSendPush`, `createStripeCustomer`

### Honeypot Fields (Invisible Bot Trap)

- [x] Add hidden field to signup form (e.g., `<input name="website" style="display:none">`)
- [x] Add hidden field to login form
- [x] Reject submissions where honeypot is filled (bots auto-fill everything)

### Firebase App Check (Recommended)

> **Status**: ⏭️ Skipped — overkill for current traffic; revisit if abuse bypasses existing gates

- [~] Enable App Check in Firebase Console — deferred
- [~] Add reCAPTCHA Enterprise or DeviceCheck provider — deferred
- [~] Initialize in `firebase/firebase.js`: `initializeAppCheck(app, { provider })` — deferred
- [~] Enforce on Cloud Functions (optional, adds device attestation) — deferred

### Spam Prevention

- [x] Block disposable email domains on signup (list: `mailinator`, `tempmail`, etc.) — `lib/utils/disposableEmails.js` blocklist, checked in `create-account/page.js`
- [x] Require email verification before posting (already in `PostComposer.js`)
- [x] Monitor spam account rate (target: <1%) — track via Firebase Auth Console → Users list, filter by creation date

---

## 5. Light/Dark Mode Toggle (Phase 2 — 4 hours)

> **Goal**: User-selectable theme with system preference detection
> **Status**: ✅ Infrastructure complete (CSS vars, provider, toggle) — Component audit needed

### CSS Variables (`src/app/globals.css`)

- [x] Add `:root` (light mode) color definitions — full semantic token set
- [x] Add `.dark` class overrides for dark mode colors — matches design spec
- [x] Ensure all semantic tokens covered (`--bg-primary`, `--text-primary`, `--border-subtle`, etc.) — 20+ tokens including bg, text, border, accent, reactions, presence

### Theme Provider (`lib/context/ThemeContext.js`)

- [x] Create `ThemeProvider` context with `theme` state (`light` | `dark` | `system`)
- [x] Create `useTheme()` hook exposing `theme`, `setTheme`, `resolvedTheme`
- [x] Detect system preference via `matchMedia('(prefers-color-scheme: dark)')`
- [x] Apply `.dark` class to `<html>` element based on resolved theme — useEffect applies/removes class
- [x] Persist preference to `localStorage` (key: `theme`) — reads on init, writes on change
- [x] SSR-safe: Avoid hydration mismatch (inline script or cookie-based) — inline script in layout.js + `suppressHydrationWarning`

### Toggle UI (`Header.js`)

- [x] Add theme toggle button (sun/moon icon) — `ThemeToggle` component with Sun/Moon/System SVG icons
- [x] Cycle through: Light → Dark → System (or simple toggle) — `cycleTheme` function: light → dark → system → light
- [x] Icon animates on change (rotate/fade) — 200ms rotate-90 + scale + opacity transition
- [x] Tooltip shows current mode — hover tooltip with "Light mode" / "Dark mode" / "System (dark/light)"

### Component Audit

> **Scope**: Replace all hardcoded dark-mode colors with CSS variables for proper light/dark theming
>
> **Strategy**: Work in layers — start with layout/shell, then high-traffic pages (Feed, Auth), then secondary pages
>
> **CSS Variable Reference**:
> | Hardcoded Value | CSS Variable | Usage |
> |-----------------|--------------|-------|
> | `bg-black`, `#050505` | `var(--bg-root)` | Page backgrounds |
> | `bg-[#0d0d0f]` | `var(--bg-elev-1)` | Cards, modals |
> | `bg-[#16171a]`, `bg-[#1a1a1c]` | `var(--bg-elev-2)` | Elevated surfaces, skeletons |
> | `border-white/10`, `#242528` | `var(--border-subtle)` | Subtle borders |
> | `text-white`, `text-gray-100`, `#f5f6f7` | `var(--text-primary)` | Primary text |
> | `text-gray-400`, `#a1a5ab` | `var(--text-secondary)` | Secondary text |
> | `text-gray-500`, `#5d6269` | `var(--text-tertiary)` | Muted text, timestamps |
> | `#ff1f42` | `var(--accent)` | Brand accent (keep as-is) |

#### Core Layout & Navigation

- [x] `layout.js`: Update body classes to use `bg-[var(--bg-root)]` instead of fixed colors
- [x] `Header.js`: Replace `bg-black`, `text-gray-100` with CSS variable equivalents
- [x] `Header.js`: Mobile menu panel background + text colors
- [x] `Footer.js`: Background, text, link colors to theme variables
- [x] `page.js` (Home): Replace `bg-black`, gradient overlays with theme-aware variants

#### Feed & Social Components

- [x] `Feed.js`: Replace `bg-black`, `text-white` with `bg-[var(--bg-root)]`, `text-[var(--text-primary)]`
- [x] `feed/page.js` + `feed/latest/page.js`: Page background + text colors
- [x] `Post.js`: Card background (`bg-[#0d0d0f]` → `var(--bg-elev-1)`), text colors, borders
- [x] `Post.js` (`EmbeddedPost`): Background, border, text colors for repost cards
- [x] `PostSkeleton.js`: Skeleton pulse colors (`bg-[#1a1a1c]` → `var(--bg-elev-2)`)
- [x] `PostHeader.js`: Author name, timestamp, menu background colors
- [x] `PostActions.js`: Icon colors, dropdown menus, reaction pill backgrounds
- [x] `PostContent.js`: Text colors, lightbox modal backgrounds
- [x] `PostComposer.js`: Modal background, input borders, button colors
- [x] `EditPostModal.jsx`: Dialog background, button states
- [x] `CommentsSheet.js`: Sheet background, comment text, input styling, delete buttons

#### Profile & Account

- [x] `ProfileView.js`: Card backgrounds, stat containers, button styles
- [x] `profile/[userId]/page.js`: Page background, text, profile card styling
- [x] `ProfileTab.js`: Form labels, inputs, section headers
- [x] `account/page.js` + subpages: Backgrounds, text, form elements

#### Auth Pages

- [x] `login/page.js`: Page background, form card (`bg-white/5`), input fields, labels
- [x] `create-account/page.js`: Form card, inputs, verification section
- [x] `SocialLogins.js`: Google button (keep brand colors, border adjusted)
- [x] `forgot-password/page.js`: Form styling

#### Commerce Pages

- [x] `shop/page.js` + `shop/[slug]/`: Product cards, backgrounds
- [x] `ProductDetailClient.js`: Detail page backgrounds, text
- [x] `events/page.js` + `events/[slug]/`: Event cards, ticket forms, breadcrumbs
- [x] `cart/page.js`: Cart items, summary, checkout styling
- [x] `CartItemDisplay.js`: Item text, price colors, buttons

#### Notifications

- [x] `NotificationBell.js`: Badge colors (keep accent red)
- [x] `notifications/page.js`: Notification list items, read/unread states
- [x] `NotificationsTab.jsx` + `NotificationPreferences.jsx`: Toggle switches, section headers

#### Utility Components

- [x] `ErrorModal.js`: Modal background, text, button colors
- [x] `SuccessModal.jsx`: Keep accent-based styling, adjust backgrounds
- [x] `AuthGateModal.jsx`: Modal styling
- [x] Toast styling in `layout.js` (Toaster config)

#### Additional Shop Components

- [x] `ProductDetail.js`: Container bg, title, price, labels, policy cards
- [x] `QuickViewModal.jsx`: Panel bg, border, title, price, option labels
- [x] `EmptyCart.jsx`: Background, text, border colors

#### Admin Pages (Lower Priority)

- [ ] `admin/*`: Dashboard, tables, forms (can keep dark-only if preferred)

### Polish

#### Transitions & Animation

- [ ] Smooth transition on theme change (already in globals.css: `transition: background-color 200ms, color 200ms`)
- [ ] Ensure no flash/flicker when navigating between pages
- [ ] Test toggle animation feels responsive

#### Accessibility & Contrast

- [ ] Light mode: Ensure text-primary (#111113) on bg-root (#fafafa) passes WCAG AA (≥4.5:1)
- [ ] Light mode: Ensure text-secondary (#555555) on bg-root passes WCAG AA
- [ ] Light mode: Ensure accent (#ff1f42) buttons have readable text
- [ ] Dark mode: Verify existing contrast ratios maintained
- [ ] Focus states visible in both modes (--focus-ring)

#### Media & Images

- [ ] Test user avatars appearance in light mode (no harsh edges)
- [ ] Test post images/videos don't look washed out in light mode
- [ ] Logo visibility in both modes (may need light/dark logo variants)
- [ ] Skeleton loaders visible in both modes

#### Light Mode Specific Styling

- [ ] Cards need subtle shadows in light mode (shadows less visible on white)
- [ ] Borders may need adjustment (`border-subtle` appropriate contrast)
- [ ] Hover states appropriate for light backgrounds
- [ ] Input field backgrounds/borders in light mode

#### Design Spec Updates

- [ ] Update `docs/social-ui-design-spec.md` with light mode color tokens
- [ ] Document component-to-variable mapping for future reference
- [ ] Add light mode screenshots/mockups to spec

#### QA & Testing

- [ ] Test complete user flow in light mode (signup → feed → post → profile)
- [ ] Test complete user flow in dark mode (verify no regressions)
- [ ] Test system preference mode (toggle OS setting, verify app follows)
- [ ] Test persistence (refresh page, theme should persist)
- [ ] Test on mobile Safari (iOS) in both modes
- [ ] Test on Chrome (Android) in both modes

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
