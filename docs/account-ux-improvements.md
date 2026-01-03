# Account UX Improvements Checklist

> **Target**: Order History & My Tickets enhancements for better user engagement
> **Priority**: Phase 1 (Quick Wins) → Phase 2 (Future Growth)

---

## Current State Assessment

| Feature       | Order History                | My Tickets                         |
| ------------- | ---------------------------- | ---------------------------------- |
| **View**      | ✅ List of orders with items | ✅ List of tickets with event info |
| **Interact**  | ❌ No order detail view      | ❌ Static display only             |
| **Actions**   | ❌ None                      | ✅ QR code reveal (separate tab)   |
| **Deep Link** | ❌ No `/order/{id}` route    | ❌ No `/ticket/{id}` route         |

---

## Phase 1: Quick Wins (Low Effort, High Impact)

### 1.1 Order Detail Modal (~2 hours)

> **Goal**: Click order card → modal with full details (reuse Admin pattern)

#### UI Components

- [x] Create `components/OrderDetailModal.js` (or reuse/adapt existing Admin modal)
- [x] `OrderHistory.js`: Add "View Details" button to each order card
- [x] `OrderHistory.js`: State for `selectedOrder` + modal open/close
- [x] Modal content:
  - [x] Order ID/number header
  - [x] Full item list with images, sizes, colors, quantities, prices
  - [x] Order total
  - [x] Order date + status
  - [x] "Need help?" link (mailto:contact@ragestate.com)

#### Styling

- [x] Match existing modal patterns (backdrop blur, rounded corners, close button)
- [x] Use CSS variables for theming consistency
- [x] Mobile-responsive (full-screen on small devices)

---

### 1.2 Ticket Detail Modal — "Event Day Hero" (~3 hours)

> **Goal**: Transform tickets from static display to event-day hero experience
> **Philosophy**: Optimize for the "get me in the door NOW" moment while still being useful for pre-event browsing

#### Why Modal (Not Expand-in-Place)?

- **Focus**: QR code demands user's FULL attention for scanning
- **Scannable**: Modal goes nearly full-screen, maximizing QR size
- **Brightness**: Can auto-boost screen brightness on mobile
- **Accidental taps**: Expand-in-place can collapse if user taps elsewhere

#### Ticket Detail Modal (`components/TicketDetailModal.js`)

- [x] Create modal component with QR-focused layout
- [x] Large QR code (280px minimum, scannable size)
- [x] High contrast QR (black on white background, theme-independent)
- [x] Ticket holder name prominently displayed
- [x] Ticket count indicator ("Ticket #1 of 2")
- [x] Event details section:
  - [x] Event name (prominent)
  - [x] Date and time with day-of-week
  - [x] Venue name and address
- [x] Quick action buttons row:
  - [x] "Add to Calendar" button
  - [x] "Get Directions" button
- [x] Mobile-responsive (full-screen sheet on mobile, centered modal on desktop)
- [x] Backdrop blur + close on backdrop click

#### TicketsTab Updates (`TicketsTab.js`)

- [x] Add state for `selectedTicket` + modal open/close
- [x] "Show QR" button on each ticket card → opens modal
- [x] Quick actions bar on ticket cards (Calendar, Directions, QR)

#### Remove Redundant QR Tab

- [x] `src/app/account/page.js`: Remove QR Code tab from navigation
- [x] Keep `QrCodeTab.js` file for reference/backup (or delete)

---

### 1.3 Simple Status Badges (~30 min)

> **Goal**: Clear ticket status at a glance (keep it simple)

#### Implementation

- [x] `TicketsTab.js`: Implement `getTicketStatus()` helper function
- [x] 4 status states (no animations):
  - [x] **Upcoming**: Green badge — event date in future
  - [x] **Today**: Highlighted/promoted — event is today
  - [x] **Past**: Muted gray — event has passed
  - [x] **Used**: "✓ Scanned" green checkmark — ticket was scanned
- [x] Keep chronological sort (users expect this with 1-3 tickets)

---

### 1.4 Add to Calendar (.ics Export) (~45 min)

> **Goal**: One-tap calendar event creation

#### Implementation

- [x] Create `lib/utils/generateICS.js` helper function
- [x] Generate valid `.ics` file with:
  - [x] `VEVENT` with `UID`, `DTSTAMP`
  - [x] `SUMMARY`: Event name
  - [x] `DTSTART`/`DTEND`: Event times (end = start + 3 hours if not specified)
  - [x] `LOCATION`: Venue name + address
  - [x] `DESCRIPTION`: Ticket details, "Show QR code at door"
- [x] Trigger file download on button click
- [x] Button in ticket card quick actions + modal

---

### 1.5 Get Directions Link (~15 min)

> **Goal**: Instant navigation to venue

#### Implementation

- [x] `TicketsTab.js`: Add "Get Directions" button to quick actions bar
- [x] `TicketDetailModal.js`: Add "Get Directions" button
- [x] Link format: `https://www.google.com/maps/search/?api=1&query={encoded_address}`
- [x] Opens in new tab
- [x] Only show if venue address is available in event data

---

### 1.6 Quick Actions Bar on Ticket Cards (~30 min)

> **Goal**: Surface common actions without requiring modal open

#### Implementation

- [x] `TicketsTab.js`: Add action button row to each ticket card
- [x] Buttons: [📱 Show QR] [📅 Calendar] [🗺 Directions]
- [x] 44px tap targets minimum
- [x] Visually subtle but accessible (ghost/outline button style)

---

## Phase 2: Future Enhancements (Higher Effort)

### 2.1 Apple/Google Wallet Integration

> **Goal**: Native wallet passes for tickets

#### Apple Wallet

- [ ] Generate `.pkpass` files via backend
- [ ] Include QR code, event details, location
- [ ] "Add to Apple Wallet" button on ticket

#### Google Wallet

- [ ] Generate Google Wallet pass objects
- [ ] "Add to Google Wallet" button on ticket

#### Considerations

- [ ] Requires Apple Developer account + Pass Type ID
- [ ] Requires Google Wallet API setup
- [ ] Server-side pass generation (Cloud Function)

---

### 2.2 Ticket Transfer ⭐ EXPANDED

> **Goal**: Allow users to transfer tickets via email, @username, or follower quick-pick
> **Full Spec**: See [ticket-transfer-spec.md](./ticket-transfer-spec.md)

#### Phase 2.2a: MVP Transfer (Email)

- [ ] Create `ticketTransfers` collection + Firestore rules
- [ ] Cloud Function: `POST /transfer-ticket` (email-only)
- [ ] Cloud Function: `POST /claim-ticket`
- [ ] Cloud Function: `POST /cancel-transfer`
- [ ] Email template (Resend): claim link
- [ ] UI: `TransferTicketModal.js` with email input
- [ ] UI: `ClaimTicketPage.js` (`/claim-ticket?t={token}`)
- [ ] Notifications: ticket_transfer_sent, ticket_transfer_received, ticket_transfer_claimed

#### Phase 2.2b: Username Transfers (Social)

- [ ] Extend `/transfer-ticket` to accept `recipientUsername`
- [ ] Resolve username → uid via `usernames/{usernameLower}`
- [ ] UI: `RecipientSearch.js` with @username autocomplete
- [ ] Profile preview (photo, name, verified badge) before confirming

#### Phase 2.2c: Follower Quick-Pick (Social)

- [ ] Fetch followers via `follows` where `followedId === currentUser.uid`
- [ ] Batch-fetch `profiles/{followerId}` for display
- [ ] UI: Follower cards in TransferTicketModal
- [ ] Filter to users with verified emails

#### Phase 2.2d: Polish & Edge Cases

- [ ] Cancel transfer flow (sender only, before claim)
- [ ] Expired transfer handling (72-hour TTL)
- [ ] Transfer history in account page
- [ ] Admin view for support tickets
- [ ] Block refunds for transferred tickets

#### Data Model

- [ ] `ticketTransfers/{transferId}`: fromUserId, toUserId, toEmail, toUsername, eventId, ragerId, status, claimToken, expiresAt
- [ ] Update rager: `transferredTo`, `transferredAt`, `active: false`
- [ ] New rager for recipient with fresh `ticketToken`

#### Security

- [ ] Rate limit: 10 transfers/hour/user
- [ ] Cannot transfer used tickets (usedCount > 0)
- [ ] Cannot transfer to self
- [ ] Claim token is hashed in Firestore, raw token in email
- [ ] 72-hour expiration on pending transfers

---

### 2.3 Order Tracking & Shipping Updates

> **Goal**: Real-time order status for physical merchandise

#### Data Model

- [ ] Add `shippingStatus` to purchase docs (pending, shipped, delivered)
- [ ] Add `trackingNumber` and `carrier` fields
- [ ] Add `statusHistory[]` for timeline

#### UI

- [ ] `OrderDetailModal.js`: Show status timeline
- [ ] `OrderDetailModal.js`: Show tracking link (if available)
- [ ] Push notification on status change (optional)

#### Integration

- [ ] Webhook from fulfillment provider (Shopify, ShipStation, etc.)
- [ ] Or manual update via Admin dashboard

---

## Mobile UX Improvements

### Quick Access Flow (Reduce Friction)

> **Current**: Account → Tickets Tab → QR Tab → Find Event → Tap to Reveal (5 steps)
> **Target**: Account → Tickets → Tap "Show QR" (2 steps)

- [ ] Implement Ticket Detail Modal (Phase 1.2)
- [ ] Remove QR Code tab (Phase 1.2)
- [ ] Consider: Push notification with deep link to ticket on event day

### Offline Support

- [ ] Cache ticket data for offline viewing
- [ ] QR code works without network (already client-rendered)
- [ ] Service worker for ticket detail page

---

## Priority Matrix

| Item                 | Effort  | Impact | Priority |
| -------------------- | ------- | ------ | -------- |
| Order Detail Modal   | Low     | Medium | P1 ✅    |
| Ticket Detail Modal  | Medium  | High   | P1 ✅    |
| Simple Status Badges | Trivial | Medium | P1 ✅    |
| Add to Calendar      | Low     | High   | P1 ✅    |
| Get Directions       | Trivial | Medium | P1 ✅    |
| Quick Actions Bar    | Low     | Medium | P1 ✅    |
| Remove QR Tab        | Trivial | Medium | P1 ✅    |
| Wallet Integration   | High    | High   | P2       |
| Ticket Transfer      | High    | Medium | P2       |
| Order Tracking       | High    | Medium | P3       |

---

## Implementation Notes

- Reuse existing modal patterns from Admin dashboard
- Use CSS variables for theming (already established)
- All new components should support light/dark mode
- Mobile-first design (44px tap targets, safe areas)
- Test on iPhone SE, iPhone 14, Android devices

---

## Modal Layout Reference

```
┌─────────────────────────────────────────┐
│  [←]                              [✕]   │
│                                         │
│         ┌─────────────────┐            │
│         │                 │            │
│         │    QR CODE      │   ← 280px  │
│         │   (scannable)   │            │
│         │                 │            │
│         └─────────────────┘            │
│                                         │
│         TYRELLE ADAMS                   │
│         Ticket #1 of 2                  │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  🎉 RAGESTATE NYE 2026                  │
│  📅 Dec 31, 2025 • 10:00 PM             │
│  📍 The Venue, 123 Main St              │
│                                         │
│  ┌──────────┐  ┌──────────────────┐    │
│  │ 📅 Add   │  │ 🗺 Get Directions │    │
│  │ Calendar │  │                  │    │
│  └──────────┘  └──────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

## Ticket Card Layout Reference

```
┌─────────────────────────────────────────────────┐
│ [Event Image]  RAGESTATE NYE 2026               │
│                🔥 TOMORROW • Dec 31             │
│                2 tickets                         │
│                                                  │
│  [📱 Show QR]  [📅 Calendar]  [🗺 Directions]   │
└─────────────────────────────────────────────────┘
```
