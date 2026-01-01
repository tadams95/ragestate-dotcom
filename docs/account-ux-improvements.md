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

### 1.2 Merge QR Code into Tickets Tab (~2 hours)

> **Goal**: Eliminate redundant QR tab; show QR when user clicks a ticket

#### Consolidation

- [ ] `TicketsTab.js`: Add expand/collapse or modal for ticket details + QR
- [ ] `TicketsTab.js`: On ticket click → show large QR code (scannable size)
- [ ] `TicketsTab.js`: Include event details in expanded view (date, time, venue)
- [ ] `src/app/account/page.js`: Consider removing QR Code tab from nav (or keep as quick-access alias)

#### QR Display

- [ ] QR code sized for easy scanning (minimum 200x200px)
- [ ] High contrast (black on white background regardless of theme)
- [ ] Ticket holder name displayed below QR

---

### 1.3 Add to Calendar Button (~1 hour)

> **Goal**: One-tap calendar event creation for tickets

#### Implementation

- [ ] Create `lib/utils/generateICS.js` helper function
- [ ] Generate `.ics` file with:
  - [ ] Event title (event name)
  - [ ] Start date/time
  - [ ] End date/time (if available, else +3 hours default)
  - [ ] Location (venue name + address)
  - [ ] Description (ticket details, QR code instructions)
- [ ] `TicketsTab.js`: Add "Add to Calendar" button on each ticket card
- [ ] Trigger file download on click

---

### 1.4 Get Directions Link (~15 min)

> **Goal**: Quick access to venue navigation

#### Implementation

- [ ] `TicketsTab.js`: Add "Get Directions" button/link on ticket cards
- [ ] Link format: `https://www.google.com/maps/search/?api=1&query={encoded_address}`
- [ ] Opens in new tab
- [ ] Only show if venue address is available

---

### 1.5 Ticket Status Indicators (~1 hour)

> **Goal**: Help users quickly identify relevant tickets

#### Status Types

- [ ] `TicketsTab.js`: Add status badge to each ticket:
  - [ ] **Upcoming** (green) — event date in future
  - [ ] **Today** (amber/pulsing) — event is today
  - [ ] **Past** (gray) — event date passed
  - [ ] **Used** (gray + strikethrough) — `usedCount >= ticketQuantity`

#### Sorting/Filtering

- [ ] Default sort: Upcoming first, then by date ascending
- [ ] Optional: Filter tabs (All / Upcoming / Past)

---

### 1.6 Event Countdown (~30 min)

> **Goal**: Build excitement for upcoming events

#### Implementation

- [ ] `TicketsTab.js`: Show countdown on upcoming tickets
- [ ] Format: "3 days away" or "In 5 hours" or "Tomorrow"
- [ ] For "Today" events: Show time until event starts

---

## Phase 2: Future Enhancements (Higher Effort)

### 2.1 Dedicated Ticket Detail Page

> **Goal**: Shareable/bookmarkable ticket URL

#### Route & Page

- [ ] Create `src/app/ticket/[ticketId]/page.js`
- [ ] Fetch ticket data by token or `ragerId`
- [ ] Auth check: Only ticket owner can view
- [ ] SEO: No indexing (private content)

#### Content

- [ ] Large QR code (primary focus)
- [ ] Event details (name, date, time, venue, address)
- [ ] Ticket holder info
- [ ] "Add to Calendar" button
- [ ] "Get Directions" button
- [ ] Back to account link

#### Benefits

- [ ] User can bookmark for quick event-day access
- [ ] Works offline (PWA consideration)
- [ ] Required for wallet pass integration

---

### 2.2 Apple/Google Wallet Integration

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

### 2.3 Ticket Transfer

> **Goal**: Allow users to transfer tickets to others

#### Flow

- [ ] "Transfer Ticket" button on ticket card
- [ ] Enter recipient email
- [ ] Generate transfer link (or direct transfer if recipient has account)
- [ ] Original ticket marked as transferred
- [ ] New ticket created for recipient

#### Backend

- [ ] Cloud Function for secure transfer
- [ ] Update `ragers` doc ownership
- [ ] Generate new `ticketToken`
- [ ] Email notifications to both parties

---

### 2.4 Order Tracking & Shipping Updates

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
> **Target**: Account → Tickets → Tap Ticket (2-3 steps)

- [ ] Merge QR into Tickets (Phase 1.2)
- [ ] Consider: Floating "My Tickets" button on event day
- [ ] Consider: Push notification with deep link to ticket on event day

### Offline Support

- [ ] Cache ticket data for offline viewing
- [ ] QR code works without network (already client-rendered)
- [ ] Service worker for ticket detail page

---

## Priority Matrix

| Item                     | Effort  | Impact | Priority |
| ------------------------ | ------- | ------ | -------- |
| Order Detail Modal       | Low     | Medium | P1       |
| Merge QR into Tickets    | Medium  | High   | P1       |
| Add to Calendar          | Low     | High   | P1       |
| Get Directions           | Trivial | Medium | P1       |
| Ticket Status Indicators | Low     | Medium | P1       |
| Event Countdown          | Low     | Low    | P2       |
| Dedicated Ticket Page    | Medium  | Medium | P2       |
| Wallet Integration       | High    | High   | P3       |
| Ticket Transfer          | High    | Medium | P3       |
| Order Tracking           | High    | Medium | P3       |

---

## Implementation Notes

- Reuse existing modal patterns from Admin dashboard
- Use CSS variables for theming (already established)
- All new components should support light/dark mode
- Mobile-first design (44px tap targets, safe areas)
- Test on iPhone SE, iPhone 14, Android devices
