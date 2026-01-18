# Ticket Transfer Feature Specification

> **Goal**: Allow users to transfer tickets to friends/followers via email, username, or social graph
> **Priority**: P2 (Phase 2 enhancement)
> **Estimated Effort**: High (spans frontend, backend, Firestore rules, notifications)

---

## Executive Summary

You already have **rich social infrastructure** that makes ticket transfers more than just "send to email":

| Existing Asset                                | Transfer Enhancement                       |
| --------------------------------------------- | ------------------------------------------ |
| `usernames/{usernameLower}` → `{uid}`         | **@username mentions** in transfer input   |
| `follows/{followerId}_{followedId}`           | **"Transfer to follower"** quick-pick list |
| `profiles/{uid}` (displayName, photoURL)      | **Recipient preview** before confirming    |
| `notifications.js` (createNotification)       | **In-app + push** alerts for transfers     |
| `ticketTokens/{token}` → `{eventId, ragerId}` | **One-tap claim link** with secure token   |

---

## Transfer Methods (Priority Order)

### 1️⃣ Transfer to @Username (Leverages Social)

**Why it's great**: Social-first UX, no typing errors, instant validation

```
┌─────────────────────────────────────────┐
│  Transfer Ticket                        │
│                                         │
│  To: [@] _________________________      │
│          @johndoe → John Doe ✓          │
│          Recent suggestions:             │
│          • @sarahsmith (follows you)     │
│          • @mikejones (follows you)      │
│                                         │
│  [Cancel]              [Send Transfer]  │
└─────────────────────────────────────────┘
```

**Implementation Path**:

1. Query `usernames/{input}` for exact match
2. On match → fetch `profiles/{uid}` for preview (photo, name)
3. Show verified badge if `isVerified === true`
4. Pre-populate suggestions from `follows` where `followedId === currentUser.uid`

### 2️⃣ Transfer to Followers Quick-Pick

**Why it's great**: One-tap for your inner circle, leverages existing social graph

```
┌─────────────────────────────────────────┐
│  Transfer Ticket                        │
│                                         │
│  Your Followers (can receive tickets):  │
│                                         │
│  [👤] Sarah Smith @sarahsmith    [Send] │
│  [👤] Mike Jones  @mikejones     [Send] │
│  [👤] Alex Chen   @alexchen      [Send] │
│                                         │
│  ─── Or enter manually ───              │
│  [@] ___________________________        │
│                                         │
└─────────────────────────────────────────┘
```

**Implementation Path**:

1. Query `follows` where `followedId === currentUser.uid` (people following you)
2. Batch-fetch `profiles/{followerId}` for display names + photos
3. Filter to users with verified emails (can receive claim)

### 3️⃣ Transfer via Email (Fallback)

**Why it's important**: Recipients may not have RAGESTATE accounts yet

```
┌─────────────────────────────────────────┐
│  Transfer Ticket                        │
│                                         │
│  Email: friend@example.com              │
│                                         │
│  ⚠️ This person doesn't have an account │
│     They'll receive an invite + ticket  │
│                                         │
│  [Cancel]              [Send Transfer]  │
└─────────────────────────────────────────┘
```

**Flow Variations**:

- **Has account** (email in `customers` or `users`): In-app notification + optional email
- **No account**: Email-only with sign-up prompt + ticket claim link

---

## Advanced Social Features (Future Enhancements)

### 4️⃣ "Going Together" / Group Tickets

**Concept**: When you buy 4 tickets, instantly share with your squad

```
┌─────────────────────────────────────────┐
│  You purchased 4 tickets! 🎉            │
│                                         │
│  Want to share with friends?            │
│                                         │
│  Ticket 1: You                          │
│  Ticket 2: [@] _______________          │
│  Ticket 3: [@] _______________          │
│  Ticket 4: [@] _______________          │
│                                         │
│  [Maybe Later]       [Send All]         │
└─────────────────────────────────────────┘
```

### 5️⃣ "Who's Going" Social Feed Integration

**Concept**: Public/friends-only list of attendees per event

- Users can opt-in to show they're attending
- Shows mutual follows ("3 people you follow are going")
- Creates FOMO/social proof → ticket sales

### 6️⃣ Transfer Request (Reverse Flow)

**Concept**: Friend can request a ticket from you

```
@sarahsmith requested a ticket to RAGESTATE NYE 2026
[Accept] [Decline]
```

---

## Data Model Changes

### New Collection: `ticketTransfers/{transferId}`

```javascript
{
  // Core transfer data
  fromUserId: "uid123",           // Sender's UID
  toUserId: "uid456" | null,      // Recipient's UID (null if email-only)
  toEmail: "friend@example.com",  // Always present for notifications
  toUsername: "johndoe" | null,   // For display purposes

  // Ticket reference
  eventId: "event123",
  ragerId: "rager456",
  ticketToken: "abc123...",       // Original token (invalidated on claim)

  // State machine
  status: "pending" | "claimed" | "expired" | "cancelled",

  // Audit trail
  createdAt: Timestamp,
  claimedAt: Timestamp | null,
  expiresAt: Timestamp,           // Auto-expire after 72 hours

  // Claim security
  claimToken: "xyz789...",        // New secure token for claim link
  claimTokenHash: "sha256...",    // Stored hash for verification
}
```

### Rager Doc Updates (when transferred)

```javascript
// Original rager is updated:
{
  ...existingFields,
  transferredTo: "uid456",
  transferredAt: Timestamp,
  active: false,                  // Original deactivated
}

// New rager created for recipient:
{
  ...copiedFields,
  firebaseId: "uid456",           // New owner
  previousOwner: "uid123",
  claimedFromTransfer: "transferId",
  ticketToken: "newToken...",     // Fresh token for security
  createdAt: Timestamp,
}
```

### Notifications Schema (extends existing)

```javascript
// Sender gets confirmation
{
  type: "ticket_transfer_sent",
  title: "Ticket Transferred",
  body: "Your ticket for RAGESTATE NYE 2026 was sent to @johndoe",
  data: { transferId, eventId, recipientUserId, recipientUsername },
  link: "/account?tab=tickets",
  deepLink: "ragestate://account/tickets"
}

// Recipient gets claim prompt
{
  type: "ticket_transfer_received",
  title: "🎫 Ticket Received!",
  body: "@tyrelle sent you a ticket for RAGESTATE NYE 2026",
  data: { transferId, eventId, senderUserId, senderUsername },
  link: "/claim-ticket?t={claimToken}",
  deepLink: "ragestate://claim-ticket/{claimToken}"
}

// Sender gets confirmation when claimed
{
  type: "ticket_transfer_claimed",
  title: "Ticket Claimed",
  body: "@johndoe claimed the ticket you sent",
  data: { transferId, eventId }
}
```

---

## Backend: Cloud Functions

### `POST /transfer-ticket`

```javascript
// Required fields
{
  ragerId: "rager456",
  eventId: "event123",
  recipientEmail?: "friend@example.com",
  recipientUsername?: "johndoe"  // Alternative to email
}

// Validation
1. Verify sender owns this rager (firebaseId === caller uid)
2. Verify ticket is active and not already transferred
3. Verify event hasn't passed
4. Resolve recipient: username → uid, or email → uid (if exists)
5. Rate limit: max 10 transfers per hour per user

// Actions (atomic transaction)
1. Create ticketTransfer doc with pending status
2. Update original rager with transferredTo, active=false
3. Create notification for recipient
4. Send email (Resend) with claim link
5. Return { transferId, claimUrl }
```

### `POST /claim-ticket`

```javascript
// Required fields
{
  claimToken: "xyz789..."
}

// Validation
1. Find transfer by claimToken hash
2. Verify not expired, not already claimed
3. Verify caller's uid matches toUserId OR caller's email matches toEmail

// Actions (atomic transaction)
1. Create new rager for recipient
2. Generate new ticketToken, update ticketTokens map
3. Update transfer status to "claimed"
4. Notify original sender
5. Return { ragerId, eventId }
```

### `POST /cancel-transfer` (sender only)

```javascript
// Restore original ticket if recipient hasn't claimed
1. Verify caller is fromUserId
2. Verify status is still "pending"
3. Reactivate original rager
4. Update transfer status to "cancelled"
5. Remove/update recipient notification
```

---

## Frontend Components

### `TransferTicketModal.js`

```
Props: { ticket, event, onClose, onTransferred }

State:
- mode: 'search' | 'confirm' | 'success'
- recipientType: 'username' | 'email' | 'follower'
- recipientQuery: string
- selectedRecipient: { uid, username, displayName, photoURL, email }
- followers: [] // Quick-pick list
- isLoading, error
```

### `RecipientSearch.js` (reusable)

```
- Input with @ prefix detection
- Debounced username lookup
- Shows profile preview on match
- Falls back to email validation
```

### `ClaimTicketPage.js` (`/claim-ticket`)

```
- Parse claimToken from URL
- Show ticket details + event info
- "Accept Ticket" button → calls claim-ticket endpoint
- Handles expired/invalid tokens gracefully
```

---

## Security Considerations

### Firestore Rules Additions

```javascript
// ticketTransfers: sender can create, recipient can read
match /ticketTransfers/{transferId} {
  allow read: if isAuthenticated() && (
    resource.data.fromUserId == request.auth.uid ||
    resource.data.toUserId == request.auth.uid ||
    resource.data.toEmail == request.auth.token.email
  );
  // Create/update via Cloud Functions only
  allow create, update, delete: if false;
}
```

### Token Security

- `claimToken` is a 32-byte random hex string
- Only the **hash** is stored in Firestore
- Email contains the raw token (HTTPS link)
- Tokens expire after 72 hours

### Abuse Prevention

- Rate limit transfers per user (10/hour)
- Cannot transfer to self
- Cannot transfer already-transferred tickets
- Cannot transfer used tickets (usedCount > 0)
- Cannot transfer to blocked users (future)

---

## Implementation Phases

### ⚠️ Pre-requisite: Amazon SES Migration

> ✅ **COMPLETED**: SES migration done — see [ses-migration-spec.md](./ses-migration-spec.md)

---

### Phase 2.2a: MVP Transfer ✅ COMPLETE

- [x] `ticketTransfers` collection + rules
- [x] Cloud Function: `/transfer-ticket` (email-only)
- [x] Cloud Function: `/claim-ticket`
- [x] Cloud Function: `/transfer-preview` (for claim page to show ticket details)
- [x] Email template (SES): claim link
- [x] UI: TransferTicketModal with email input — [components/TransferTicketModal.js](../components/TransferTicketModal.js)
- [x] UI: ClaimTicketPage — [src/app/claim-ticket/page.js](../src/app/claim-ticket/page.js)
- [x] API proxies: `/api/payments/transfer-ticket`, `/api/payments/claim-ticket`, `/api/payments/transfer-preview`
- [x] Notifications: sent/received/claimed (in-app via createTransferNotification)
- [x] Transfer button integrated into TicketDetailModal

**Files Created/Modified:**

- `components/TransferTicketModal.js` — Beautiful multi-step modal (email → confirm → success)
- `components/TicketDetailModal.js` — Added transfer button + pending notice
- `src/app/claim-ticket/page.js` — Claim page with auth gate
- `src/app/claim-ticket/claim-ticket.client.js` — Client component
- `src/app/api/payments/transfer-ticket/route.js` — API proxy
- `src/app/api/payments/claim-ticket/route.js` — API proxy
- `src/app/api/payments/transfer-preview/route.js` — API proxy
- `functions/stripe.js` — Added /transfer-ticket, /claim-ticket, /transfer-preview endpoints + notifications
- `firestore.rules` — ticketTransfers collection rules

### Phase 2.2b: Username Transfers (3-4 days)

- [x] Extend `/transfer-ticket` to accept `recipientUsername`
- [x] UI: RecipientSearch with @username support + profile preview
- [ ] Profile preview before confirming (included in above)

### Phase 2.2c: Social Quick-Pick (3-4 days) ✅ COMPLETE

- [x] Fetch followers for quick-pick list
- [x] UI: Follower cards in TransferTicketModal
- [x] Filter to users with accounts (require username)

### Phase 2.2d: Polish & Edge Cases (1 week)

- [x] Cancel transfer flow
- [x] Expired transfer handling
- [x] Transfer history in account
- [ ] Admin view for support

---

## Questions to Resolve

1. **Can any user transfer, or only original purchasers?**
   - Recommendation: Only if `firebaseId === ticket.firebaseId` (original owner)
   - Alternative: Allow recipients to re-transfer (chain of custody)

2. **Max transfers per ticket?**
   - Recommendation: 1 (tickets are non-re-transferable after claim)
   - Alternative: Allow up to N transfers with audit trail

3. **Transfer to non-users?**
   - Recommendation: Yes, email-only flow with account creation prompt
   - When they sign up with that email, ticket auto-appears

4. **Partial transfers (1 of 4 tickets)?**
   - Current model: `ticketQuantity` is on rager doc
   - Options:
     - Split rager into multiple docs (1 ticket each) ✅ Recommended
     - Allow partial transfer amount in UI

5. **Refunds for transferred tickets?**
   - Recommendation: Block refunds for transferred tickets
   - Original purchaser responsible for payment

---

## Related Opportunities Discovered

### 🎯 "Going Together" Posts (Social Feed Integration)

When a user confirms attendance (or transfers tickets), auto-create a feed post:

> "🎫 @tyrelle is going to RAGESTATE NYE 2026 with @johndoe and @sarahsmith"

This drives:

- Social proof / FOMO
- Event discovery via feed
- Virality as followers see who's attending

### 🎯 Event Attendee Directory

New collection or query:

```
/events/{eventId}/attendees/{uid} → { username, displayName, photoURL, isPublic }
```

- "See who's going" feature on event page
- Show mutual follows ("3 friends are going")
- Privacy toggle per user

### 🎯 Ticket Marketplace (Future P3)

If transfers work well, consider:

- Resale at face value (no markup)
- Waitlist for sold-out events
- Price-drop notifications

### 🎯 QR Code Sharing Preview

Instead of transferring the ticket itself, allow sharing a "preview" QR that shows:

- Event details
- Sender's profile
- "Want one? Get tickets at ragestate.com/events/{slug}"

---

## Appendix: Existing Infrastructure Reference

### Username Resolution

```javascript
// From ProfileView.js - already works
const snap = await getDoc(doc(db, 'usernames', maybeUsername));
if (snap.exists()) {
  const { uid } = snap.data();
  // uid is the recipient
}
```

### Followers Query

```javascript
// From FollowButton.js - get who follows the current user
const followersQ = query(collection(db, 'follows'), where('followedId', '==', currentUser.uid));
// Each doc: { followerId, followedId, createdAt }
```

### Notification Creation

```javascript
// From notifications.js - reusable pattern
await createNotification({
  uid: recipientUserId,
  type: 'ticket_transfer_received',
  title: '🎫 Ticket Received!',
  body: `@${senderUsername} sent you a ticket for ${eventName}`,
  data: { transferId, eventId, senderUserId },
  link: `/claim-ticket?t=${claimToken}`,
  deepLink: `ragestate://claim-ticket/${claimToken}`,
  sendPush: true,
});
```

### Email Sending (Resend)

```javascript
// From email.js - existing pattern
// Add new template: ticket-transfer-claim.html
```

---

## Next Steps

1. **Confirm requirements** (questions above)
2. **Design review** for TransferTicketModal mockup
3. **Begin Phase 2.2a** (MVP email transfer)
4. **Iterate** based on user feedback

---

_This spec was generated by analyzing your existing social infrastructure. The username and followers integrations are low-hanging fruit that will make RAGESTATE transfers feel native and social-first._
