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
