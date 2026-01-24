# RAGESTATE System Architecture

> **Last Updated**: January 23, 2026
> **Version**: 1.0

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Diagram](#architecture-diagram)
4. [Data Flow Diagrams](#data-flow-diagrams)
5. [Payment Flow](#payment-flow)
6. [Ticket Transfer Flow](#ticket-transfer-flow)
7. [Chat Architecture](#chat-architecture)
8. [Authentication Flow](#authentication-flow)

---

## System Overview

RAGESTATE is a social platform for the electronic music community, featuring:
- **Social Feed**: Posts, likes, comments, reposts, follows
- **Events & Ticketing**: Event discovery, ticket purchases, QR-based check-in
- **Merchandise Shop**: Shopify-integrated e-commerce with Printify fulfillment
- **Real-time Chat**: Direct messaging between users
- **Push Notifications**: FCM-powered notifications across web and mobile

---

## Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 14 (App Router)    │  React Native (Mobile App)        │
│  - Server Components        │  - Expo                           │
│  - Client Components        │  - Shared Firebase SDK            │
│  - API Routes (proxy)       │  - Push via FCM                   │
├─────────────────────────────────────────────────────────────────┤
│                        STATE MANAGEMENT                          │
├─────────────────────────────────────────────────────────────────┤
│  Redux Toolkit              │  React Context (Auth)             │
│  - authSlice                │  - FirebaseContext                │
│  - userSlice                │  - useAuth hook                   │
│  - chatSlice                │                                   │
├─────────────────────────────────────────────────────────────────┤
│                        BACKEND SERVICES                          │
├─────────────────────────────────────────────────────────────────┤
│  Firebase                   │  External Services                │
│  ├─ Authentication          │  ├─ Stripe (Payments)             │
│  ├─ Firestore (Database)    │  ├─ Shopify (Products)            │
│  ├─ Cloud Functions         │  ├─ Printify (Fulfillment)        │
│  ├─ Cloud Storage           │  ├─ AWS SES (Email)               │
│  ├─ FCM (Push)              │  └─ Resend (Email backup)         │
│  └─ Realtime Database       │                                   │
├─────────────────────────────────────────────────────────────────┤
│                        HOSTING                                   │
├─────────────────────────────────────────────────────────────────┤
│  Vercel (Web App)           │  Firebase (Functions/Storage)     │
│  - Edge Network             │  - us-central1 region             │
│  - Automatic HTTPS          │  - Auto-scaling                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture Diagram

```
                                    ┌─────────────────┐
                                    │   Web Browser   │
                                    │   (Next.js)     │
                                    └────────┬────────┘
                                             │
                                             ▼
┌────────────────────────────────────────────────────────────────────┐
│                           VERCEL                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Next.js Application                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │  │
│  │  │   Pages     │  │ Components  │  │    API Routes       │   │  │
│  │  │  /feed      │  │  PostCard   │  │  /api/payments/*    │   │  │
│  │  │  /events    │  │  EventCard  │  │  /api/shopify/*     │   │  │
│  │  │  /shop      │  │  ChatList   │  │  (Proxy to Firebase)│   │  │
│  │  │  /chat      │  │  ...        │  │                     │   │  │
│  │  └─────────────┘  └─────────────┘  └──────────┬──────────┘   │  │
│  └───────────────────────────────────────────────┼──────────────┘  │
└──────────────────────────────────────────────────┼─────────────────┘
                                                   │
                    ┌──────────────────────────────┼───────────────┐
                    │                              │               │
                    ▼                              ▼               ▼
         ┌──────────────────┐          ┌─────────────────┐  ┌───────────┐
         │ Firebase Auth    │          │ Cloud Functions │  │ Firestore │
         │ - Email/Password │          │ - stripePayment │  │ - users   │
         │ - Google OAuth   │          │ - notifications │  │ - events  │
         │ - Anonymous      │          │ - feed triggers │  │ - posts   │
         └──────────────────┘          │ - chat triggers │  │ - chats   │
                                       │ - email         │  │ - ...     │
                                       └────────┬────────┘  └───────────┘
                                                │
                    ┌───────────────────────────┼───────────────────────┐
                    │                           │                       │
                    ▼                           ▼                       ▼
         ┌──────────────────┐       ┌──────────────────┐    ┌──────────────────┐
         │     Stripe       │       │     Shopify      │    │    AWS SES       │
         │ - PaymentIntents │       │ - Products API   │    │ - Transactional  │
         │ - Customers      │       │ - Inventory      │    │   Emails         │
         └──────────────────┘       └──────────────────┘    └──────────────────┘
```

---

## Data Flow Diagrams

### User Authentication Flow
```
┌──────────┐     ┌─────────────┐     ┌───────────────┐     ┌───────────┐
│  Client  │────▶│ Firebase    │────▶│ Auth Success  │────▶│ Firestore │
│  (Login) │     │ Auth        │     │ (ID Token)    │     │ /users    │
└──────────┘     └─────────────┘     └───────────────┘     └───────────┘
                                            │
                                            ▼
                                     ┌───────────────┐
                                     │ Redux Store   │
                                     │ (authSlice)   │
                                     └───────────────┘
```

### Feed Post Creation Flow
```
┌──────────┐     ┌───────────┐     ┌────────────────┐     ┌───────────────┐
│  Client  │────▶│ Firestore │────▶│ Cloud Function │────▶│ Follower      │
│ (Create  │     │ /posts    │     │ onPostCreated  │     │ /userFeeds    │
│  Post)   │     └───────────┘     └────────────────┘     └───────────────┘
└──────────┘                               │
                                           ▼
                              ┌────────────────────────┐
                              │ Cloud Storage          │
                              │ (Media Optimization)   │
                              └────────────────────────┘
```

---

## Payment Flow

### Ticket Purchase Sequence
```
┌────────┐  ┌────────┐  ┌─────────────┐  ┌────────────┐  ┌──────────┐  ┌───────────┐
│ Client │  │Next.js │  │Cloud Fn     │  │  Stripe    │  │Firestore │  │  Email    │
│        │  │API     │  │stripePayment│  │            │  │          │  │  (SES)    │
└───┬────┘  └───┬────┘  └──────┬──────┘  └─────┬──────┘  └────┬─────┘  └─────┬─────┘
    │           │              │               │              │              │
    │ 1. Checkout              │               │              │              │
    │──────────▶│              │               │              │              │
    │           │ 2. Create PI │               │              │              │
    │           │─────────────▶│               │              │              │
    │           │              │ 3. Create     │              │              │
    │           │              │   PaymentIntent              │              │
    │           │              │──────────────▶│              │              │
    │           │              │◀──────────────│              │              │
    │           │◀─────────────│ clientSecret  │              │              │
    │◀──────────│              │               │              │              │
    │           │              │               │              │              │
    │ 4. Confirm Payment (Stripe.js)          │              │              │
    │─────────────────────────────────────────▶│              │              │
    │◀─────────────────────────────────────────│              │              │
    │           │              │               │              │              │
    │ 5. Finalize Order        │               │              │              │
    │──────────▶│─────────────▶│               │              │              │
    │           │              │ 6. Verify PI  │              │              │
    │           │              │──────────────▶│              │              │
    │           │              │◀──────────────│              │              │
    │           │              │               │              │              │
    │           │              │ 7. Create Tickets            │              │
    │           │              │─────────────────────────────▶│              │
    │           │              │               │              │              │
    │           │              │ 8. Create Fulfillment        │              │
    │           │              │─────────────────────────────▶│              │
    │           │              │               │              │              │
    │           │              │               │    9. Trigger Email         │
    │           │              │               │    (onWrite fulfillments)   │
    │           │              │               │              │─────────────▶│
    │           │◀─────────────│               │              │              │
    │◀──────────│ Success      │               │              │              │
    │           │              │               │              │              │
```

### Key Payment Components
| Component | Location | Purpose |
|-----------|----------|---------|
| CheckoutForm | `components/CheckoutForm.js` | Stripe Elements integration |
| Cart Page | `src/app/cart/page.js` | Order management, payment initiation |
| API Proxy | `src/app/api/payments/*` | Routes requests to Cloud Functions |
| stripePayment | `functions/stripe.js` | Payment processing, ticket creation |
| sendPurchaseEmail | `functions/email.js` | Email confirmation on fulfillment |

---

## Ticket Transfer Flow

### Transfer Sequence
```
┌────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────┐
│ Sender │  │Cloud Fn     │  │  Firestore   │  │  Email   │  │Recipient │
│        │  │stripePayment│  │              │  │  (SES)   │  │          │
└───┬────┘  └──────┬──────┘  └──────┬───────┘  └────┬─────┘  └────┬─────┘
    │              │                │               │              │
    │ 1. Initiate Transfer         │               │              │
    │   (recipientEmail/username)  │               │              │
    │─────────────▶│               │               │              │
    │              │ 2. Resolve    │               │              │
    │              │   recipient   │               │              │
    │              │──────────────▶│               │              │
    │              │◀──────────────│               │              │
    │              │               │               │              │
    │              │ 3. Generate claimToken       │              │
    │              │   (crypto.randomBytes)       │              │
    │              │               │               │              │
    │              │ 4. Create ticketTransfer     │              │
    │              │──────────────▶│               │              │
    │              │               │               │              │
    │              │ 5. Mark rager pendingTransfer│              │
    │              │──────────────▶│               │              │
    │              │               │               │              │
    │              │ 6. Send claim email          │              │
    │              │───────────────────────────────▶│              │
    │              │               │               │─────────────▶│
    │◀─────────────│               │               │              │
    │              │               │               │              │
    │              │               │               │  7. Click    │
    │              │               │               │     claim    │
    │              │◀─────────────────────────────────────────────│
    │              │               │               │              │
    │              │ 8. Verify token, transfer ownership         │
    │              │──────────────▶│               │              │
    │              │               │               │              │
```

### Transfer States
| State | Description |
|-------|-------------|
| `pending` | Transfer created, awaiting claim |
| `claimed` | Recipient claimed ticket |
| `cancelled` | Sender cancelled before claim |
| `expired` | 72-hour claim window passed |

---

## Chat Architecture

### Real-time Messaging Flow
```
┌────────────────────────────────────────────────────────────────────┐
│                         CLIENT                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ ChatList     │    │ ChatRoom     │    │ MessageBubble        │  │
│  │ (useChatList)│    │ (useChat)    │    │                      │  │
│  └──────┬───────┘    └──────┬───────┘    └──────────────────────┘  │
│         │                   │                                       │
│         │ onSnapshot        │ onSnapshot                            │
│         ▼                   ▼                                       │
└─────────┼───────────────────┼───────────────────────────────────────┘
          │                   │
          ▼                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        FIRESTORE                                     │
│                                                                      │
│  /users/{uid}/chatSummaries/{chatId}    /chats/{chatId}/messages    │
│  ├─ lastMessage                          ├─ senderId                 │
│  ├─ unreadCount                          ├─ content                  │
│  ├─ peerName                             ├─ timestamp                │
│  └─ updatedAt                            └─ flagged (moderation)     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
          │                   │
          │ onCreate          │ onCreate
          ▼                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CLOUD FUNCTIONS                                  │
│                                                                      │
│  onChatCreated                          onMessageCreated             │
│  ├─ Create chatSummaries                ├─ Update lastMessage        │
│  │   for both members                   ├─ Increment unreadCount     │
│  └─ Fetch peer profile info             ├─ Run content moderation    │
│                                         └─ Flag violating messages   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Chat Data Model
```
/chats/{chatId}
├─ members: [uid1, uid2]
├─ type: "dm"
├─ createdAt: timestamp
└─ lastMessage: { content, senderId, timestamp }

/chats/{chatId}/messages/{messageId}
├─ senderId: string
├─ content: string
├─ timestamp: timestamp
├─ flagged: boolean (set by moderation)
└─ flagReason: string (if flagged)

/users/{uid}/chatSummaries/{chatId}
├─ type: "dm"
├─ peerId: string
├─ peerName: string
├─ peerPhoto: string
├─ lastMessage: { content, senderId, timestamp }
├─ unreadCount: number
├─ muted: boolean
└─ updatedAt: timestamp
```

---

## Authentication Flow

### Firebase Auth Integration
```
┌──────────────────────────────────────────────────────────────────────┐
│                        FirebaseContext                                │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  useAuth() Hook                                                 │  │
│  │  ├─ currentUser (Firebase User object)                          │  │
│  │  ├─ loading (boolean)                                           │  │
│  │  └─ Methods: signIn, signUp, signOut, forgotPassword            │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                │ onAuthStateChanged
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        Firebase Auth                                  │
│  ├─ Email/Password authentication                                    │
│  ├─ Google OAuth                                                     │
│  ├─ Anonymous auth (for limited access)                              │
│  └─ browserLocalPersistence (survives refresh)                       │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                │ ID Token
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        Authorization                                  │
│  ├─ Firestore Rules (request.auth.uid)                               │
│  ├─ Custom Claims (admin: true)                                      │
│  └─ API Route verification (Bearer token)                            │
└──────────────────────────────────────────────────────────────────────┘
```

### Admin Authorization
```javascript
// Custom claim check (fast path)
request.auth.token.admin == true

// Document-based fallback
exists(/databases/$(database)/documents/adminUsers/$(request.auth.uid))
```

---

## Data Access Layer

Components access Firestore through a service layer that provides abstraction, caching, and consistent patterns.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        REACT COMPONENTS                              │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       CACHED SERVICES                                │
│                   lib/firebase/cachedServices.js                     │
│         getCachedProfile() │ getCachedUserDisplayInfo() │ ...       │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SERVICE LAYER                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │ userService │  │ postService │  │followService│  │eventService│  │
│  │purchaseServ…│  │ adminService│  │ chatService │  │ softDelete │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         FIRESTORE                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Service Files

| Service | Path | Operations |
|---------|------|------------|
| User | `lib/firebase/userService.js` | getProfile, updateProfile, getUserDisplayInfo |
| Post | `lib/firebase/postService.js` | getPublicPosts, createPost, likePost, repost |
| Follow | `lib/firebase/followService.js` | follow, unfollow, getFollowers, getFollowing |
| Event | `lib/firebase/eventService.js` | getEvents, getUserTickets, getTransfers |
| Purchase | `lib/firebase/purchaseService.js` | getPurchases, savePurchase |
| Admin | `lib/firebase/adminService.js` | checkIsAdmin, hasPermission |
| Chat | `lib/firebase/chatService.js` | sendMessage, getOrCreateDMChat |
| Soft Delete | `lib/firebase/softDelete.js` | softDelete, restoreDeleted |
| Cached | `lib/firebase/cachedServices.js` | getCachedProfile, prefetchProfiles |

### Caching

| Cache | TTL | Max Size | Purpose |
|-------|-----|----------|---------|
| profileCache | 5 min | 100 | Public profiles |
| userCache | 5 min | 100 | User display info |
| eventCache | 10 min | 50 | Event details |
| postCache | 2 min | 200 | Individual posts |

See `docs/DATA-ACCESS-LAYER.md` for detailed usage.

---

## Key File Locations

| Component | Path |
|-----------|------|
| Firebase Config | `firebase/firebase.js` |
| Auth Context | `firebase/context/FirebaseContext.js` |
| Redux Store | `lib/store.js` |
| Firestore Rules | `firestore.rules` |
| Cloud Functions | `functions/*.js` |
| API Routes | `src/app/api/*` |
| Chat Hooks | `lib/hooks/useChat.js`, `lib/hooks/useChatList.js` |
| Chat Service | `lib/firebase/chatService.js` |
| Service Layer | `lib/firebase/*Service.js` |
| Type Definitions | `lib/types/*.js` |
| Utilities | `lib/utils/*.js` |

---

## Security Boundaries

```
┌─────────────────────────────────────────────────────────────────────┐
│                      TRUST BOUNDARY                                  │
├─────────────────────────────────────────────────────────────────────┤
│  UNTRUSTED (Client-side)    │  TRUSTED (Server-side)                │
│  ├─ Browser JavaScript      │  ├─ Cloud Functions (Admin SDK)       │
│  ├─ React Native App        │  ├─ Firestore Rules                   │
│  └─ API Route handlers      │  ├─ Firebase Auth verification        │
│                             │  └─ Secret Manager credentials        │
├─────────────────────────────────────────────────────────────────────┤
│  VALIDATION POINTS                                                   │
│  ├─ Firestore Rules: Field validation, ownership checks             │
│  ├─ Cloud Functions: Input validation, rate limiting                │
│  ├─ API Routes: Firebase token verification                         │
│  └─ Stripe: Webhook signature verification                          │
└─────────────────────────────────────────────────────────────────────┘
```
