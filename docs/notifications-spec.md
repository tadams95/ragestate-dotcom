# Notifications Spec

## Goals

- Real-time and reliable notifications across Web (Next.js) and Mobile (React Native).
- Support push notifications (system-level) and in-app notification feed.
- Respect user preferences, quiet hours, and platform best practices.
- Keep implementation aligned with existing Firebase stack and Cloud Functions.

## Summary of Approach

- Recommended: Unified FCM for Web and Mobile push delivery.
  - Web: Firebase Cloud Messaging (FCM) Web Push with VAPID keys + service worker.
  - Mobile: React Native app uses FCM (Android) and APNs via FCM (iOS) through `react-native-firebase/messaging`.
  - Single token type (FCM) simplifies backend fanout and analytics.
- Alternative (if staying with Expo push service short-term): Hybrid.
  - Mobile: Expo Push tokens via `expo-notifications` and Expo Push API.
  - Web: FCM Web Push.
  - Backend abstracts senders and routes to Expo or FCM depending on stored token type.

Both paths share the same Firestore data model, rules, and notification creation flow. Only the push sender differs.

## Notification Types (initial)

- `post_liked`: Someone liked your post.
- `comment_added`: Someone commented on your post.
- `new_follower`: Someone followed you.
- `mention`: You were mentioned in a post/comment.
- `new_post_from_follow`: Someone you follow posted (opt-in; batched/digested by default).
- Future: order updates, system announcements, marketing (separate opt-ins).

## Data Model

1. User notifications

- Collection: `users/{uid}/notifications/{notificationId}`
- Fields:
  - `type`: string (e.g., `post_liked`)
  - `title`: string (short title for push/in-app)
  - `body`: string (push/in-app body)
  - `data`: map (e.g., `{ postId, commentId, actorId, actorName }`)
  - `link`: string (web route to open, e.g., `/post/{postId}`)
  - `deepLink`: string (mobile deep link, e.g., `ragestate://post/{postId}`)
  - `createdAt`: timestamp (server)
  - `seenAt`: timestamp | null
  - `read`: boolean (default false)
  - `priority`: string (`high` | `normal`) – optional
  - `sendPush`: boolean (default true) – allow in-app only entries
  - `pushSentAt`: timestamp | null
  - `pushStatus`: string (`pending` | `sent` | `failed`) – optional
  - `batchKey`: string – optional for de-duplication (e.g., `post:{postId}:likes:2025-09-14`)

2. User devices (push tokens)

- Collection: `users/{uid}/devices/{deviceId}`
- Fields:
  - `platform`: `web` | `ios` | `android`
  - `provider`: `fcm` | `expo`
  - `token`: string (FCM token or Expo push token)
  - `deviceModel`: string | null
  - `appVersion`: string | null
  - `lastSeenAt`: timestamp (server)
  - `enabled`: boolean (default true)
  - `deviceName`: optional friendly name (web browser label)

3. Preferences

- Doc: `users/{uid}/settings/notificationPrefs`
- Fields (booleans):
  - `post_liked`, `comment_added`, `new_follower`, `mention`, `new_post_from_follow`
  - `marketing` (separate consent)
  - `quietHours`: `{ start: '22:00', end: '08:00', timezone: 'America/Los_Angeles' }` – optional

4. Counters

- Doc: `users/{uid}` extension fields
  - `unreadNotifications`: number (increment/decrement)

## Firestore Security Rules (sketch)

```
match /users/{uid}/notifications/{nid} {
  allow read: if request.auth != null && request.auth.uid == uid;
  allow create, update, delete: if false; // only via Cloud Functions (admin)
}
match /users/{uid}/devices/{deviceId} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
match /users/{uid}/settings/notificationPrefs {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

Add composite index for in-app list: `users/*/notifications/* orderBy(createdAt desc)` (collection group index if needed for admin views).

## Backend Flow (Cloud Functions)

1. Event producers (create notification docs)

- Triggers on relevant events:
  - `postLikes` onCreate → create `post_liked` notification for post owner (ignore self-like).
  - `postComments` onCreate → create `comment_added` for post owner (ignore self-comment); mentions create `mention` notifications for mentioned users.
  - `follows` onCreate → create `new_follower` for target user.
  - Optional: `posts` onCreate → create `new_post_from_follow` for followers (use batching/digest, not per follower fanout for push; prefer in-app only or daily summary).

2. Push sender (decoupled)

- Trigger: `users/{uid}/notifications/{nid}` onCreate.
- Steps:
  - Load `notificationPrefs`; if type disabled, skip push.
  - Respect `quietHours`: if within window, skip push (still create in-app entry) or schedule/delay.
  - Fetch active devices `users/{uid}/devices` where `enabled == true`.
  - For each device:
    - If `provider == 'fcm'`: send via FCM.
    - If `provider == 'expo'`: send via Expo Push API.
  - Update `pushStatus` and `pushSentAt`. Clean up invalid tokens (unsubscribe/delete on known error codes).
  - Increment `users/{uid}.unreadNotifications`.

3. Mark-as-read/seen

- Client marks `read=true` and sets `seenAt`. A function or security rule can decrement `unreadNotifications` safely via a callable function to avoid client tampering.

### FCM Sender (Functions)

```js
// Pseudocode inside functions/notifications.js
const admin = require('firebase-admin');

async function sendFcmToTokens(tokens, payload) {
  if (!tokens.length) return { successCount: 0 };
  const message = {
    tokens,
    notification: { title: payload.title, body: payload.body },
    data: payload.data || {}, // keep small; strings only
    android: { priority: 'high' },
    apns: { payload: { aps: { sound: 'default' } } },
    webpush: { fcmOptions: { link: payload.link || '/' } },
  };
  const res = await admin.messaging().sendEachForMulticast(message);
  return res;
}
```

### Expo Sender (Hybrid Option)

```js
// Install expo-server-sdk in functions if choosing Hybrid
const { Expo } = require('expo-server-sdk');
const expo = new Expo();

async function sendExpoPush(expoTokens, payload) {
  const msgs = expoTokens.map((to) => ({
    to,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data,
  }));
  const chunks = expo.chunkPushNotifications(msgs);
  for (const chunk of chunks) {
    await expo.sendPushNotificationsAsync(chunk);
  }
}
```

## Web Client Integration (FCM Web Push)

1. Enable Cloud Messaging in Firebase Console and configure VAPID key.
2. Add service worker `public/firebase-messaging-sw.js`:

```js
/* global importScripts, firebase */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  // Customize notification here
  const title = payload.notification?.title || 'RAGESTATE';
  const options = { body: payload.notification?.body, data: payload.data };
  self.registration.showNotification(title, options);
});
```

3. Request permission and register token (client util):

```ts
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebase';

export async function registerWebPush(uid) {
  if (!(await isSupported())) return false;
  const messaging = getMessaging();
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  const token = await getToken(messaging, { vapidKey });
  if (!token) return false;
  const deviceId = `web_${token.slice(-10)}`;
  await setDoc(
    doc(db, 'users', uid, 'devices', deviceId),
    {
      platform: 'web',
      provider: 'fcm',
      token,
      enabled: true,
      lastSeenAt: serverTimestamp(),
    },
    { merge: true },
  );
  onMessage(messaging, () => {
    /* optional in-app toast */
  });
  return true;
}
```

## Mobile Client Integration

### Option A (Recommended): react-native-firebase messaging (FCM)

- Configure FCM in the RN app (Android google-services.json, iOS GoogleService-Info.plist).
- Request permissions, get FCM token, and store in `users/{uid}/devices` with `provider: 'fcm'`.
- Handle background/foreground notifications and deep links.

### Option B (Hybrid): Expo Notifications

- Use `expo-notifications` to get Expo push token:

```ts
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

export async function registerExpoPush(uid, db) {
  const settings = await Notifications.getPermissionsAsync();
  let finalStatus = settings.status;
  if (finalStatus !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    finalStatus = req.status;
  }
  if (finalStatus !== 'granted') return false;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });
  const token = tokenData.data;
  await setDoc(
    doc(db, 'users', uid, 'devices', `expo_${token.slice(-10)}`),
    {
      platform: Platform.OS,
      provider: 'expo',
      token,
      enabled: true,
      lastSeenAt: serverTimestamp(),
    },
    { merge: true },
  );
  return true;
}
```

- Delivery: Functions send to Expo Push API for these tokens.

## In-App Notifications UI

- Collection read: `users/{uid}/notifications` ordered by `createdAt desc` with pagination.
- Tap → navigate to `link` (web) or `deepLink` (mobile).
- Mark-as-read on open; batch “mark all as read”.
- Show badge with `unreadNotifications` count in header/tab bar.

## Preferences & Quiet Hours

- Settings screen persists `notificationPrefs` document.
- Backend checks prefs before sending push.
- Quiet hours policy: push suppressed and in-app created; optionally queue for morning digest.

## De-duplication and Digesting

- Use `batchKey` (e.g., likes on the same post within 5 minutes) to avoid push spam.
- Optionally aggregate with a scheduled job (Cloud Scheduler) that composes digests.

## Deep Links

- Web: `link` is a normal Next.js route (e.g., `/post/{id}`).
- Mobile: `ragestate://post/{id}`; configure app linking to route to the post screen.

## Rollout Plan

1. Decide provider path:
   - Preferred: Unified FCM (single backend path, simpler).
   - If blocked by Expo constraints, start Hybrid and migrate devices to FCM later.
2. Enable Cloud Messaging, set VAPID key, add service worker.
3. Add device registration utilities (web and mobile).
4. Implement Functions:
   - Event producers (like/comment/follow → notification docs).
   - Sender on notification create (FCM and/or Expo).
5. Build in-app notifications UI and settings screen.
6. QA matrix across iOS/Android/Web, foreground/background/terminated states.
7. Gradual rollout: start with `new_follower` only, then expand.

---

## Phase 1 Implementation Status (2025-09-25)

Implemented in Cloud Functions (`functions/notifications.js`):

- Triggers creating notification docs & incrementing `unreadNotifications` inside a Firestore transaction:
  - `post_liked` (on `postLikes` create) – expects `postLikes` doc to include `postOwnerId` for O(1) ownership resolution.
  - `comment_added` (on `postComments` create) – expects `postComments` doc to include `postOwnerId` & captures mentions via naive `@username` regex resolving `usernames/{usernameLower}` docs.
  - `mention` (secondary for each resolved mention in a comment; skips duplicates & self/owner redundancy).
  - `new_follower` (on `follows` create).

Design notes / deviations clarified:

- Each notification doc is written in the same transaction that updates the unread counter; avoids race divergence between doc creation and counter increment.
- Self-action suppression: like/comment/follow events where `actorId == targetUid` are ignored to prevent noise.
- Mentions: Simple regex `@([a-z0-9_]{3,30})`; future refinement may include boundary assertions & exclusion inside code/links. Added to backlog.
- Push delivery intentionally deferred (Phase 2) to keep early risk surface small. Fields `sendPush`, `pushStatus`, `pushSentAt` still populated for forward compatibility.

Outstanding / Next Steps (Phase 2 candidates):

1. Add `onNotificationCreated` trigger to perform push sending (FCM) and update `pushStatus`—or integrate logic into existing creation path if latency acceptable.
2. Introduce write path (callable / HTTPS) to safely mark notifications read & decrement `unreadNotifications` with server enforcement (rules currently block client arbitrary changes to the counter).
3. Harden mention parsing (word boundaries, ignore emails/URLs) & optionally store `mentionedUserIds` on comment for auditing.
4. Add `batchKey` style aggregation for rapid like/comment bursts to reduce push spam before enabling push.
5. Index review: ensure per-user notifications query (orderBy createdAt desc) is supported; if adding cross-user moderation/admin feed later, define collection group index.

Assumptions introduced:

- `postLikes` and `postComments` documents carry `postOwnerId`; if not universally true, a lookup (read of `posts/{postId}`) will be required—update trigger accordingly.
- `usernames/{usernameLower}` docs store `uid` field; mention resolution depends on that shape.

No changes required to security rules beyond those previously added for notifications/devices/preferences.

- UPDATE (UI Read Path): Rules now permit user updates to notification docs strictly to mark them read (`read:true`) and set `seenAt` timestamp, enforcing immutability of other fields.

## UI Placement (Initial)

- Added `Notifications` tab under Account page for MVP surfacing of notifications.
- Rationale: Faster iteration without adding global header state/badge complexity yet. Badge will be introduced after stable unread counter decrement logic (either callable batching or local optimistic updates + server reconciliation).
- Component behaviors:
  - Paginated (20 per page) query ordered by `createdAt desc`.
  - Individual and "Mark all read" actions (sequential; will be optimized). Writes rely on new rule allowing limited field updates.
  - Future enhancement: real-time listener (currently uses page fetch; can switch to `onSnapshot` once volume evaluated).

## Callable API (Batch Mark Read)

Name: `batchMarkNotificationsRead`

Type: HTTPS callable (Firebase Functions v2 onCall)

Input shape:

```
{
  notificationIds?: string[]; // explicit list to mark
  markAll?: boolean;          // if true, ignores notificationIds and selects newest unread
  max?: number;               // optional cap (default 100, hard cap 300)
}
```

Behavior:

- Auth required; operates only on caller's notifications.
- If `markAll` true: queries newest unread up to `max`.
- If `notificationIds` provided: dedupes and loads those docs (skips already-read).
- Transactionally sets `read=true`, `seenAt=serverTimestamp()`, and decrements `users/{uid}.unreadNotifications` by the number actually changed.
- Returns `{ updated: number, remainingUnread?: number }` where `remainingUnread` is 0 if no unread remain, otherwise undefined (avoids costly full count).

Client usage example (web):

```ts
import { getFunctions, httpsCallable } from 'firebase/functions';

async function markAllRead() {
  const fn = httpsCallable(getFunctions(), 'batchMarkNotificationsRead');
  const res = await fn({ markAll: true, max: 200 });
  console.log('Batch mark result', res.data);
}
```

Future Enhancements:

- Support a `before` timestamp cursor to progressively clear in windows.
- Optionally return exact remaining unread via a lightweight counter doc if precision needed.
- Add rate limiting (per uid) if abuse observed.

Implementation Note (2025-09-25): The client invokes the same callable for single-item mark-read (passing a one-element notificationIds array) to keep the unread counter authoritative. A direct field update path remains only as a network failure fallback.

## Push Sender Trigger (Implemented 2025-09-25)

Trigger: `onUserNotificationCreatedSendPush` onCreate of `users/{uid}/notifications/{nid}`.

Flow:

1. Skip if `sendPush == false` or `pushStatus` already not `pending`.
2. Load `users/{uid}/settings/notificationPrefs` and skip with `pushStatus=skipped_prefs` if the notification type is disabled.
3. Evaluate quiet hours (simple time window check). If inside, mark `pushStatus=suppressed_quiet_hours` (no scheduling yet).
4. Fetch enabled devices; gather FCM tokens (`provider=='fcm'`). If none: `no_devices` or `no_fcm_tokens`.
5. Send multicast via `admin.messaging().sendEachForMulticast` with title/body/data and platform-specific options.
6. Update `pushStatus`:

- `sent` (all success)
- `partial` (some success, some failure)
- `failed` (all failed)
- `error` (unexpected exception)

7. Record `pushSentAt` and `pushMeta { success, failure }`.
8. Disable invalid tokens (mark device doc `enabled:false`, plus `disabledAt`, `disableReason: 'invalid_token'`).

Possible pushStatus values now observed:

- `pending`: initial state (created by creation triggers)
- `sent`: all tokens delivered successfully
- `partial`: mixture of success and failure
- `failed`: no tokens delivered
- `no_devices`: user had zero enabled devices
- `no_fcm_tokens`: devices exist but none with provider fcm
- `skipped_prefs`: user disabled this notification type
- `suppressed_quiet_hours`: within quiet hours window
- `error`: unexpected exception during send

Deferrals / Future Enhancements:

- Full timezone-aware quiet hours using Intl + user timezone string.
- Scheduled delivery or morning digest queue for suppressed quiet hours instead of dropping.
- Expo provider path: if reintroducing hybrid tokens, branch send logic per device provider.
- Aggregation via `batchKey` before pushing bursts (like storms of likes) to reduce noise.

## Testing Matrix

- iOS/Android: foreground, background, terminated states; permissions denied/granted.
- Web: different browsers (Chrome, Edge, Firefox), permission denied/granted, service worker registered.
- Token refresh, invalid tokens cleanup, multi-device behavior, quiet hours, preference toggles.

## Notes on Expo for Web

- Expo Notifications does not provide a unified web push story. For the web, use FCM Web Push or the standard Web Push API (VAPID) directly. This spec standardizes on FCM for web.

## Cost and Reliability

- FCM is free and reliable at scale. Functions invocations minimal (fanout by tokens). Expo Push is also free but adds a second provider to maintain.

---

## Minimal Backend Interfaces (for implementation later)

```ts
// createNotification.ts – callable utility used by triggers or server logic
export type CreateNotificationInput = {
  uid: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  link?: string;
  deepLink?: string;
  sendPush?: boolean;
  batchKey?: string;
};

// onNotificationCreated – functions/notifications.ts
// Reads prefs, quiet hours, devices; sends via FCM/Expo; updates pushStatus
```

## Implementation Checklist (Backlog & Completion Map)

Legend: [x] complete | [ ] not started | [~] partial/in progress

### Core Foundations

- [x] In-app notification creation triggers (likes, comments, mentions, follows)
- [x] Transactional unread counter increment
- [x] Batch mark-as-read callable (single + bulk)
- [x] Counter-safe single item mark-read usage
- [x] Push sender trigger (initial FCM path)
- [x] Unread badge (Account page)

### Web & Device Integration

- [x] Web service worker file `public/firebase-messaging-sw.js`
- [x] Web push registration utility wired into app shell (deferred permission flow via Notifications tab button)
- [x] Device pruning (disable tokens not seen in >30 days) – scheduled function `pruneStaleDevices` runs every 24h (batch up to 300 enabled device docs; marks stale by lastSeenAt/createdAt or missing token/provider)
- [x] Token refresh handling (re-register on token change) – client auto-refresh via `initWebPushTokenAutoRefresh` (interval + visibility change) avoids redundant writes with token caching

### Preferences & User Controls

- [x] Preferences UI (toggle each notification type)
- [x] Quiet hours editor (start/end + timezone selector)
- [x] Validation of preference doc shape (strip unknown fields server-side) – enforced by `onNotificationPrefsWrittenSanitize` trigger
- [ ] Optional: marketing consent gating push for non-transactional types (skipped for now; low priority)

### Push Quality & Delivery

- [ ] Timezone-aware quiet hours (convert to user local; use Intl/Luxon)
- [ ] Scheduled / deferred delivery for quiet hours (morning digest queue)
- [ ] Aggregation via `batchKey` (e.g., consolidate multiple likes in short window)
- [ ] `new_post_from_follow` digest fanout path (avoid immediate per-follower push)
- [ ] Expo provider support (conditional, if hybrid needed)
- [ ] Adaptive throttling / rate limiting per actor (spam protection)

### Content & Parsing Improvements

- [ ] Mention parser upgrade (word boundaries, exclude emails/URLs, collapse duplicates)
- [ ] Optional store `mentionedUserIds` on comment doc for audit/search

### UI / UX Enhancements

- [ ] Global header unread badge (persistent across pages)
- [ ] Real-time listener for notifications list (replace manual pagination fetch)
- [ ] Inline toast on new notification (if on page)
- [ ] Deep link open tracking (log event when user taps)

### Observability & Metrics

- [ ] Structured logging (correlation IDs per push batch)
- [ ] Metrics export (success/failure counts to analytics/BigQuery)
- [ ] Open rate tracking (store lastOpenedAt on notification when navigated)
- [ ] Push latency measurement (createdAt → pushSentAt delta)

### Data Lifecycle & Hygiene

- [ ] Retention policy (archive or delete notifications older than N days)
- [ ] Backfill script for adding missing `pushStatus` / `sendPush` defaults to legacy docs
- [ ] Scheduled job to purge disabled tokens after grace period

### Security & Rules

- [ ] Negative test suite ensuring clients cannot modify immutable notification fields
- [ ] Rule guard ensuring only allowed fields (`read`, `seenAt`) can change client-side
- [ ] Optional custom claim gate for admin cross-user reads (future moderation view)

### Testing

- [ ] Emulator tests: trigger creates notification + increments counter
- [ ] Callable tests: batch mark read decrements properly, skips already-read
- [ ] Push trigger tests: prefs disabled, quiet hours suppression, invalid token cleanup
- [ ] Load test scripts for burst scenarios (likes storm aggregation)

### Documentation & Dev Experience

- [ ] Add `.env.local.example` with required push env vars (VAPID key, etc.)
- [ ] Developer runbook: how to test notifications locally (emulator + curl)
- [ ] Troubleshooting matrix (pushStatus meanings & resolutions)
- [ ] Architecture diagram (creation → push → read → metrics)

### Optional / Future

- [ ] Multi-language / localization support for titles & bodies
- [ ] Per-device channel preferences (mute on specific device)
- [ ] Rich media notifications (image previews) where supported
- [ ] In-app notification search or filtering (by type / date)

### Acceptance Criteria Snapshots

- Preferences UI: Toggling a type prevents new pushes (pushStatus shows `skipped_prefs`) while still creating in-app entries.
- Quiet hours: Notification created inside window → `pushStatus=suppressed_quiet_hours`; outside → normal send.
- Aggregation: ≥3 likes within 60s yields a single aggregated notification with body summarizing count.
- Callable: Marking already-read notifications leaves counter unchanged (idempotent).
- Token cleanup: Invalid FCM tokens disabled within one push cycle (device doc updated).

### Current Gaps Most Impactful to Ship Next

1. Preferences UI + quiet hours (user control & compliance).
2. Aggregation (prevent early spam before scaling traffic).
3. Token refresh handling + device pruning.
4. Test coverage for triggers & callable (confidence before wider rollout).
5. Global header unread badge.

### Recent Progress (2025-09-26)

- Added FCM web service worker and registration util.
- Integrated Enable Push button in Notifications tab (basic permission flow).
- Updated checklist statuses to reflect completion of web push scaffolding.
- Added Preferences UI (basic toggles + quiet hours placeholder) embedded in Notifications tab.
- Added Quiet Hours editor (enable toggle, start/end, timezone) persisted to prefs doc.
- Implemented token auto-refresh utility with periodic & visibility-based refresh triggers (web).
- Integrated auto-refresh initialization in `NotificationsTab` on permission grant / mount.
- Added scheduled Cloud Function `pruneStaleDevices` for stale device hygiene.

---

This checklist will be pruned as items are completed; consider moving completed sections to a changelog appendix if it grows large.
