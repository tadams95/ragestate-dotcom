# Notifications Dev Runbook

This guide helps you validate the notifications pipeline (creation → push → read) locally and in staging.

## 1. Prerequisites

- Node + Firebase CLI installed (`firebase login` done).
- Java installed (required for Firestore emulator if running tests).
- `.env.local` populated from `.env.local.example` including:
  - Firebase web config values.
  - `NEXT_PUBLIC_FIREBASE_VAPID_KEY` (Web Push).
  - `PROXY_KEY` (must match Functions secret when deployed) for payment routes (side-effect free for notifications but good hygiene).
- Service worker present: `public/firebase-messaging-sw.js` (already in repo).

## 2. Starting Local Stack

Terminal A (Functions emulator):

```
export PROXY_KEY=dev-proxy
export STRIPE_SECRET=sk_test_dummy # only if Stripe endpoints needed
export RESEND_API_KEY=skip_local
npm --prefix functions run serve
```

Terminal B (Next.js):

```
PROXY_KEY=$PROXY_KEY npm run dev
```

(Optional) set `STRIPE_FN_URL` to emulator HTTP function if payment triggers needed.

## 3. Register a Web Push Token

1. Sign in (create user or use existing account) via the app UI.
2. Navigate to Account → Notifications tab.
3. Click Enable / Allow notifications in the browser permission prompt.
4. Verify Firestore doc created at:
   - `users/{uid}/devices/web_XXXXXXXX` with fields: `{ provider: 'fcm', token, enabled: true }`.

If permission denied, clear site settings or run: `Notification.requestPermission()` in console.

## 4. Seeding Test Notifications

### A. Manual Firestore Inserts (Emulator only)

Use Firebase Emulator UI or a script to create a like doc:

```
postLikes/{randomId} => { postId: 'demoPost1', userId: '<actorUid>', postOwnerId: '<targetUid>' }
```

Trigger: `onPostLikeCreateNotify` → creates a `post_liked` notification + increments `users/{targetUid}.unreadNotifications`.

### B. Comment with Mentions

```
postComments/{id} => { postId: 'demoPost1', userId: '<actorUid>', postOwnerId: '<targetUid>', content: 'Nice! @someuser' }
```

Resolves mention by reading `usernames/{someuser}`.

### C. Follow

```
follows/{id} => { followerId: '<actorUid>', followedId: '<targetUid>' }
```

### D. Direct Notification (Debug Only)

You can mimic the creation logic (not for production):

```
users/{uid}/notifications/{id} => { type: 'post_liked', title: 'Debug', body: 'Manual', data: { postId: 'x' }, read: false, sendPush: true, pushStatus: 'pending', createdAt: serverTimestamp() }
```

## 5. Observing Push Delivery

The push sender trigger (`onUserNotificationCreatedSendPush`) fires automatically. Inspect fields:

- `pushStatus`: `pending` → `sent` / `partial` / `failed` / `no_devices` / `no_fcm_tokens` / `skipped_prefs` / `suppressed_quiet_hours` / `error`.
- `pushSentAt`: server timestamp when attempt processed.
- `pushMeta`: `{ success, failure }` counts.

Browser DevTools → Application → Service Workers: ensure the service worker is active.
Open the notification panel in OS to confirm system notification appears.

## 6. Quiet Hours Testing

1. Set prefs doc at `users/{uid}/settings/notificationPrefs`:

```
{
  "post_liked": true,
  "comment_added": true,
  "new_follower": true,
  "mention": true,
  "quietHours": { "start": "00:00", "end": "23:59", "timezone": "UTC" }
}
```

2. Create a like → Expect `pushStatus = suppressed_quiet_hours` and no system notification.
3. Remove or narrow window, retry, expect `sent`.

## 7. Aggregation Testing

1. Rapidly create several `post_liked` and `comment_added` trigger events (same `postId`) within 5 minutes.
2. Inspect the most recent notification's push log in Functions logs (look for `aggregationApplied: true`).
3. System notification title/body should use the aggregated variant (e.g., "New activity on your post").

## 8. Mark-As-Read Callable

Invoke from browser console after authenticating:

```
import { getFunctions, httpsCallable } from 'firebase/functions';
const fn = httpsCallable(getFunctions(), 'batchMarkNotificationsRead');
fn({ markAll: true, max: 50 }).then(r => console.log(r.data));
```

Expect response: `{ updated: N, remainingUnread: 0|undefined }`.
Unread counter decrements accordingly and badge updates instantly.

## 9. Common Failure Modes

| Scenario                           | pushStatus                       | Action                                              |
| ---------------------------------- | -------------------------------- | --------------------------------------------------- |
| No enabled devices                 | no_devices                       | Register device / re-enable token doc               |
| Devices but non-FCM providers only | no_fcm_tokens                    | Ensure provider is `fcm` for web                    |
| Pref disabled for type             | skipped_prefs                    | Toggle preference on                                |
| Inside quiet hours                 | suppressed_quiet_hours           | Adjust quietHours window                            |
| All sends failed                   | failed                           | Check token validity / console errors               |
| Partial failures                   | partial                          | Some tokens invalid; will be disabled automatically |
| Invalid token(s)                   | partial/failed + device disabled | Re-enable by re-registering permission              |

## 10. Cleaning Up Invalid Tokens

Invalid tokens are auto-disabled (device doc gets `enabled:false`, `disableReason: 'invalid_token'`). Re-enable by requesting permission again (generates new token).

## 11. Emulator vs Production Differences

| Aspect                 | Emulator                                | Production                     |
| ---------------------- | --------------------------------------- | ------------------------------ |
| Push delivery          | Skipped (FCM network mocked if offline) | Real FCM push                  |
| Timestamps             | Emulator approximations                 | Real server timestamps         |
| Quiet hours timezone   | Still uses Intl                         | Same                           |
| Token pruning schedule | Run manually or wait                    | Cloud Scheduler executes daily |

## 12. Test Push Callable (Manual Testing)

A `testSendPush` callable function is available for manually testing push delivery to your own devices.

### From Browser Console (after authenticating):

```js
import { getFunctions, httpsCallable } from 'firebase/functions';
const fn = httpsCallable(getFunctions(), 'testSendPush');

// Send test push to yourself
fn({}).then((r) => console.log('Result:', r.data));

// With custom title/body
fn({
  title: 'RAGESTATE Test',
  body: 'Push notifications are working!',
}).then((r) => console.log('Result:', r.data));
```

### Expected Response:

```json
{
  "success": true,
  "devicesFound": 1,
  "fcmTokens": 1,
  "fcmResult": { "successCount": 1, "failureCount": 0 },
  "errors": []
}
```

### Common Results:

| Result                          | Meaning                                   |
| ------------------------------- | ----------------------------------------- |
| `devicesFound: 0`               | No enabled devices; register push first   |
| `fcmTokens: 0, devicesFound: 1` | Device exists but provider is not 'fcm'   |
| `failureCount > 0`              | Token invalid/expired; re-register        |
| `success: true`                 | Push sent! Check browser/OS notifications |

## 13. Troubleshooting Checklist

- Service worker registered? (Application tab)
- VAPID key present & matches Firebase Console?
- Device doc created with provider `fcm`?
- Pref for notification type set to true?
- Not inside quiet hours?
- pushStatus not an early exit (skipped_prefs / suppressed_quiet_hours)?
- Function logs show correlationId & aggregationApplied?

## 14. Useful Firestore Console Queries

- List unread notifications: users/{uid}/notifications where read == false order by createdAt desc limit 20
- Device docs needing cleanup: users/{uid}/devices where enabled == false

## 15. Future Enhancements Placeholder
