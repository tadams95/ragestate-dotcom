# RAGESTATE Mobile Integration Spec

> **Purpose**: Context bridge for AI agents working on the React Native mobile app.  
> **Generated**: January 4, 2026 | **Source**: Web codebase analysis  
> **Usage**: Copy this file to the mobile repo OR paste contents into mobile AI session.

---

## Quick Start for Mobile Agent

You're continuing development on RAGESTATE mobile — a React Native app for an event ticketing + social platform. The web app (Next.js 14) is production-ready. Your job is to achieve feature parity and leverage the existing Firebase backend.

**Key Points**:

- Firebase backend is **shared** — same project, same collections, same rules
- Auth is Firebase Auth (email/password + Google Sign-In)
- All payments proxy through Cloud Functions (never direct Stripe from client)
- Social features (feed, follows, notifications) use Firestore real-time listeners
- Ticket transfers support @username lookups — unique differentiator

---

## Firebase Configuration

### Project Details

```
Project ID: ragestate-app
Region: us-central1 (Functions)
Auth Providers: Email/Password, Google
```

### Web Config (adapt for React Native Firebase)

```javascript
// From firebase/firebase.js — use same values
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};
```

### React Native Setup

```bash
# Required packages
@react-native-firebase/app
@react-native-firebase/auth
@react-native-firebase/firestore
@react-native-firebase/storage
@react-native-firebase/messaging  # FCM push
@react-native-firebase/app-check  # Required for production
```

---

## Firestore Collections (Data Model)

### Core Collections

#### `events/{eventId}`

```typescript
{
  title: string;
  description: string;
  date: Timestamp;
  endDate?: Timestamp;
  location: string;
  address?: string;
  imageUrl: string;
  price: number;           // In cents
  quantity: number;        // Available inventory (decremented on purchase)
  status: 'active' | 'inactive' | 'soldout';
  slug: string;            // URL-friendly identifier
  createdAt: Timestamp;
}
```

#### `events/{eventId}/ragers/{ragerId}`

Ticket records for attendees.

```typescript
{
  oderId: string; // Note: typo in schema, kept for compat
  oderId: string;
  email: string;
  usedCount: number; // Tickets scanned
  ticketQuantity: number; // Total tickets purchased
  active: boolean; // false when fully used
  eventId: string;
  eventTitle: string;
  eventDate: Timestamp;
  eventImageUrl: string;
  firebaseId: string; // Owner's UID
  ticketToken: string; // Unique token for scanning
  createdAt: Timestamp;
}
```

#### `ticketTokens/{token}`

O(1) lookup map for ticket scanning.

```typescript
{
  eventId: string;
  ragerId: string;
}
```

#### `ticketTransfers/{transferId}`

Pending ticket transfers (72-hour expiration).

```typescript
{
  senderId: string;
  senderUsername: string;
  senderEmail: string;
  recipientId?: string;        // Set if @username transfer
  recipientUsername?: string;
  recipientEmail: string;
  eventId: string;
  eventTitle: string;
  eventDate: Timestamp;
  ragerId: string;
  ticketQuantity: number;
  claimToken: string;          // Hashed secure token
  status: 'pending' | 'claimed' | 'cancelled' | 'expired';
  createdAt: Timestamp;
  expiresAt: Timestamp;
  claimedAt?: Timestamp;
}
```

#### `posts/{postId}`

Social feed posts.

```typescript
{
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorPhotoURL?: string;
  authorVerified: boolean;
  content: string;
  mediaUrls: string[];         // Images/videos
  mediaTypes: ('image' | 'video')[];
  isPrivate: boolean;
  likeCount: number;           // Server-managed counter
  commentCount: number;        // Server-managed counter
  repostCount: number;         // Server-managed counter
  isRepost: boolean;
  originalPostId?: string;
  originalAuthorId?: string;
  originalAuthorUsername?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### `postLikes/{oderId}` (composite key: `{oderId}_{oderId}`)

#### `postComments/{commentId}`

#### `follows/{oderId}` (composite key: `{followerId}_{followingId}`)

#### `notifications/{oderId}`

```typescript
{
  recipientId: string;
  type: 'like' | 'comment' | 'follow' | 'repost' | 'mention' | 'transfer_received' | 'transfer_claimed';
  actorId: string;
  actorUsername: string;
  actorPhotoURL?: string;
  postId?: string;
  transferId?: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
}
```

#### `customers/{uid}`

```typescript
{
  oderId: string; // Stripe customer ID
  email: string;
  name: string;
}
```

#### `fulfillments/{paymentIntentId}`

Order records (idempotency key = PI ID).

```typescript
{
  oderId: string;
  oderId: string;
  oderId: string;
  status: 'pending' | 'completed' | 'failed';
  items: Array<{
    productId: string;
    quantity: number;
    title: string;
    price: number;
  }>;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}
```

#### `usernames/{usernameLower}`

Username reservation (write-once).

```typescript
{
  oderId: string; // Owner's UID
}
```

#### `users/{uid}` (RTDB)

```typescript
{
  email: string;
  displayName: string;
  username: string;
  photoURL?: string;
  bio?: string;
  isAdmin?: boolean;
  stripeCustomerId?: string;  // Mirrored from Firestore
  fcmTokens?: { [token: string]: true };
  notificationPreferences?: {
    likes: boolean;
    comments: boolean;
    follows: boolean;
    transfers: boolean;
    quietHoursStart?: number;  // 0-23
    quietHoursEnd?: number;
  };
}
```

---

## API Endpoints (Cloud Functions)

Base URL: `https://us-central1-ragestate-app.cloudfunctions.net/stripePayment`

### Payments

| Endpoint                 | Method | Auth     | Body                                                              | Notes                                       |
| ------------------------ | ------ | -------- | ----------------------------------------------------------------- | ------------------------------------------- |
| `/create-payment-intent` | POST   | Optional | `{ amount, currency, firebaseId?, cartItems }`                    | Returns `{ clientSecret, paymentIntentId }` |
| `/create-customer`       | POST   | Optional | `{ email, name, uid? }`                                           | Creates/returns Stripe customer             |
| `/finalize-order`        | POST   | Required | `{ paymentIntentId, firebaseId, userEmail, userName, cartItems }` | Atomic fulfillment, creates tickets         |
| `/health`                | GET    | None     | —                                                                 | Health check                                |

### Ticket Scanning (Admin)

| Endpoint                  | Method | Auth  | Body                                 | Notes                                    |
| ------------------------- | ------ | ----- | ------------------------------------ | ---------------------------------------- |
| `/scan-ticket`            | POST   | Admin | `{ token }` OR `{ userId, eventId }` | Returns `{ success, remaining, ticket }` |
| `/backfill-ticket-tokens` | POST   | Admin | `{ eventId, dryRun? }`               | Backfill tokens for legacy tickets       |

### Transfers

| Endpoint             | Method | Auth     | Body                                               | Notes                         |
| -------------------- | ------ | -------- | -------------------------------------------------- | ----------------------------- |
| `/initiate-transfer` | POST   | Required | `{ ragerId, recipientEmail?, recipientUsername? }` | Creates transfer, sends email |
| `/claim-transfer`    | POST   | Required | `{ transferId, claimToken }`                       | Claims ticket to new owner    |
| `/cancel-transfer`   | POST   | Required | `{ transferId }`                                   | Cancels pending transfer      |

### Headers Required

```
Content-Type: application/json
Authorization: Bearer <Firebase ID Token>  // For authenticated endpoints
x-proxy-key: <PROXY_KEY>                   // Only if calling directly (not via Next API)
```

---

## Authentication Flow

### Firebase Auth Setup

```typescript
// React Native Firebase Auth
import auth from '@react-native-firebase/auth';

// Email/Password
await auth().createUserWithEmailAndPassword(email, password);
await auth().signInWithEmailAndPassword(email, password);

// Google Sign-In (use @react-native-google-signin/google-signin)
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: '<WEB_CLIENT_ID>', // From Firebase Console
});

const { idToken } = await GoogleSignin.signIn();
const credential = auth.GoogleAuthProvider.credential(idToken);
await auth().signInWithCredential(credential);
```

### Getting ID Token for API Calls

```typescript
const idToken = await auth().currentUser?.getIdToken();

fetch(endpoint, {
  headers: {
    Authorization: `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  },
});
```

### Admin Check

```typescript
// Check custom claims
const tokenResult = await auth().currentUser?.getIdTokenResult();
const isAdmin = tokenResult?.claims?.admin === true;

// OR check RTDB fallback
const snapshot = await database().ref(`users/${uid}/isAdmin`).once('value');
const isAdmin = snapshot.val() === true;
```

---

## Push Notifications (FCM)

### Device Registration

```typescript
import messaging from '@react-native-firebase/messaging';
import database from '@react-native-firebase/database';

// Request permission (iOS)
await messaging().requestPermission();

// Get token
const fcmToken = await messaging().getToken();

// Register with backend
await database().ref(`users/${uid}/fcmTokens/${fcmToken}`).set(true);

// Listen for token refresh
messaging().onTokenRefresh(async (newToken) => {
  await database().ref(`users/${uid}/fcmTokens/${newToken}`).set(true);
});
```

### Handling Notifications

```typescript
// Foreground
messaging().onMessage(async (remoteMessage) => {
  // Show local notification or update UI
});

// Background/Quit
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  // Handle silently or show notification
});

// Notification tap (app opened from notification)
messaging().onNotificationOpenedApp((remoteMessage) => {
  // Navigate to relevant screen
});
```

---

## Feature Parity Matrix

### Priority 1: Core Features (Must Have)

| Feature                   | Web Status | Mobile Status | Notes                        |
| ------------------------- | ---------- | ------------- | ---------------------------- |
| **Auth (Email/Password)** | ✅ Done    | ⬜ TODO       | Firebase Auth                |
| **Auth (Google Sign-In)** | ✅ Done    | ⬜ TODO       | Needs native module          |
| **Event List**            | ✅ Done    | ⬜ TODO       | Firestore query with filters |
| **Event Detail**          | ✅ Done    | ⬜ TODO       | Deep link support            |
| **Ticket Purchase**       | ✅ Done    | ⬜ TODO       | Stripe via Functions         |
| **My Tickets**            | ✅ Done    | ⬜ TODO       | QR code display              |
| **Ticket QR Scanner**     | ✅ Done    | ⬜ TODO       | Admin only, camera access    |
| **Social Feed**           | ✅ Done    | ⬜ TODO       | Real-time Firestore          |
| **Post Composer**         | ✅ Done    | ⬜ TODO       | Image/video upload           |
| **User Profile**          | ✅ Done    | ⬜ TODO       | Own + others                 |
| **Follow/Unfollow**       | ✅ Done    | ⬜ TODO       |                              |
| **Notifications Feed**    | ✅ Done    | ⬜ TODO       |                              |
| **Push Notifications**    | ✅ Done    | ⬜ TODO       | FCM                          |

### Priority 2: Differentiators

| Feature                        | Web Status | Mobile Status | Notes                          |
| ------------------------------ | ---------- | ------------- | ------------------------------ |
| **@Username Transfer**         | ✅ Done    | ⬜ TODO       | Key differentiator!            |
| **Email Transfer**             | ✅ Done    | ⬜ TODO       |                                |
| **Profile Preview (Transfer)** | ✅ Done    | ⬜ TODO       | Shows recipient before sending |
| **Transfer Notifications**     | ✅ Done    | ⬜ TODO       | In-app + push                  |

### Priority 3: Nice to Have

| Feature             | Web Status | Mobile Status | Notes               |
| ------------------- | ---------- | ------------- | ------------------- |
| **Light/Dark Mode** | ✅ Done    | ⬜ TODO       | System preference   |
| **Video Playback**  | ✅ Done    | ⬜ TODO       | Transcoded videos   |
| **Add to Calendar** | ✅ Done    | ⬜ TODO       | Native calendar API |
| **Get Directions**  | ✅ Done    | ⬜ TODO       | Open maps app       |
| **Merch Shop**      | ⚠️ Partial | ⬜ TODO       | Shopify integration |

---

## Existing Mobile Progress

> **Instructions**: Fill in this section based on what exists in the mobile codebase.

### Completed Features

- [ ] List what's already built in mobile

### Partially Complete

- [ ] List in-progress features

### Mobile-Specific Architecture

- Navigation library: (React Navigation? Expo Router?)
- State management: (Redux? Zustand? Context?)
- UI library: (Native components? NativeWind? Tamagui?)
- Firebase setup: (React Native Firebase? Expo?)

### Known Issues / Tech Debt

- [ ] List any known issues

---

## Critical Implementation Notes

### 1. Stripe Payments (NEVER direct from client)

```typescript
// WRONG ❌
import Stripe from 'stripe';
const stripe = new Stripe(secretKey); // Never expose secret key

// RIGHT ✅
// 1. Create PaymentIntent via Cloud Function
const response = await fetch(`${FUNCTIONS_URL}/create-payment-intent`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 1500, currency: 'usd', cartItems }),
});
const { clientSecret } = await response.json();

// 2. Use Stripe SDK to confirm
import { useStripe } from '@stripe/stripe-react-native';
const { confirmPayment } = useStripe();
await confirmPayment(clientSecret, { paymentMethodType: 'Card' });

// 3. Finalize order via Cloud Function
await fetch(`${FUNCTIONS_URL}/finalize-order`, { ... });
```

### 2. Real-time Listeners (Memory Management)

```typescript
// Always unsubscribe on unmount
useEffect(() => {
  const unsubscribe = firestore()
    .collection('posts')
    .orderBy('createdAt', 'desc')
    .limit(20)
    .onSnapshot((snapshot) => {
      // Update state
    });

  return () => unsubscribe();
}, []);
```

### 3. Image/Video Uploads

```typescript
// Upload to Firebase Storage
import storage from '@react-native-firebase/storage';

const reference = storage().ref(`posts/${postId}/${filename}`);
await reference.putFile(localPath);
const downloadUrl = await reference.getDownloadURL();
```

### 4. Deep Linking

```
// URL schemes to support
ragestate://event/{eventId}
ragestate://post/{postId}
ragestate://user/{username}
ragestate://transfer/{transferId}?token={claimToken}

// Web URLs (universal links)
https://ragestate.com/events/{slug}
https://ragestate.com/social/{postId}
https://ragestate.com/u/{username}
https://ragestate.com/transfer/claim?id={transferId}&token={claimToken}
```

### 5. App Check (Required for Production)

```typescript
import { firebase } from '@react-native-firebase/app-check';

// Initialize before any Firebase calls
await firebase.appCheck().activate('your-recaptcha-site-key', true);
```

---

## Environment Variables

```bash
# .env or app.config.js
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=ragestate-app
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
FIREBASE_MEASUREMENT_ID=

STRIPE_PUBLISHABLE_KEY=pk_live_...  # or pk_test_...
FUNCTIONS_BASE_URL=https://us-central1-ragestate-app.cloudfunctions.net/stripePayment

# For direct Function calls (usually not needed from mobile)
# PROXY_KEY=  # Don't include in mobile — use Firebase Auth instead
```

---

## Testing Checklist

Before submitting to app stores:

- [ ] Auth flow: Sign up, sign in, sign out, password reset
- [ ] Event browsing and filtering
- [ ] Complete purchase flow (test mode)
- [ ] View purchased tickets with QR
- [ ] Transfer ticket via @username
- [ ] Transfer ticket via email
- [ ] Claim incoming transfer
- [ ] Social feed loads and scrolls
- [ ] Create post with image
- [ ] Create post with video
- [ ] Like, comment, repost
- [ ] Follow/unfollow users
- [ ] View notifications
- [ ] Receive push notification
- [ ] Deep links open correct screens
- [ ] Offline behavior (graceful degradation)
- [ ] Light/dark mode
- [ ] Accessibility (VoiceOver/TalkBack)

---

## Questions for Mobile Session

When starting mobile development, clarify:

1. What navigation library is already set up?
2. Is Firebase already configured? Which packages?
3. What screens/components already exist?
4. Is there an existing state management pattern?
5. What's the current Expo/bare React Native setup?
6. Any existing Stripe integration?

---

**This document is your context bridge. Keep it updated as features are completed on either platform.**
