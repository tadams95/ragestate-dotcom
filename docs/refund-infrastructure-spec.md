# Refund Infrastructure Spec

> **Status**: Planning
> **Priority**: Low (No immediate need — tickets are non-refundable by policy)
> **Prerequisite for**: Self-service refunds, chargeback reduction

---

## Current State

| Area                  | Status                                                       |
| --------------------- | ------------------------------------------------------------ |
| **Refund Policy**     | Tickets non-refundable; case-by-case credit/transfer offered |
| **Refund Processing** | Manual via Stripe Dashboard                                  |
| **Refund Tracking**   | None — no record in Firestore                                |
| **Self-Service**      | None                                                         |

### Current Manual Workflow

1. Customer emails `contact@ragestate.com`
2. Admin reviews request in Stripe Dashboard
3. Admin issues full/partial refund manually
4. No record in app database

---

## Why Build Refund Infrastructure?

### Problems with Manual Refunds

- **No audit trail** in Firestore — can't see refund history in Admin dashboard
- **Ticket state mismatch** — refunded tickets may still show as valid
- **Chargeback risk** — slow manual process increases disputes
- **Support overhead** — every refund requires dashboard login

### When It Makes Sense to Build

- High refund volume (>10/month)
- Want to offer self-service refunds (e.g., 24h after purchase)
- Need to auto-deactivate tickets on refund
- Want refund analytics in Admin dashboard

---

## Proposed Architecture

### Tier 1: Admin-Only Refunds (Recommended First)

Add refund capability to Admin dashboard without self-service.

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────┐
│ Admin Dashboard │ ──► │ /api/admin/refund│ ──► │ Cloud Function │
│ (Refund Button) │     │                  │     │ /admin-refund  │
└─────────────────┘     └──────────────────┘     └───────┬────────┘
                                                         │
                        ┌────────────────────────────────┼────────────────┐
                        ▼                                ▼                ▼
                ┌───────────────┐              ┌─────────────────┐ ┌──────────────┐
                │ Stripe Refund │              │ Update Firestore│ │ Deactivate   │
                │ API           │              │ fulfillment     │ │ Tickets      │
                └───────────────┘              └─────────────────┘ └──────────────┘
```

### Tier 2: Self-Service Refunds (Future)

Allow customers to request/initiate refunds within policy window.

---

## Data Model

### Option A: Extend `fulfillments/{paymentIntentId}`

```javascript
// fulfillments/{paymentIntentId}
{
  // ... existing fields ...

  refund: {
    status: 'none' | 'partial' | 'full',
    refundId: 'stripe_refund_id',      // Stripe refund object ID
    amount: 1500,                       // Amount refunded in cents
    reason: 'customer_request' | 'event_cancelled' | 'duplicate' | 'other',
    note: 'Customer requested...',      // Admin note
    refundedAt: Timestamp,
    refundedBy: 'admin_uid',            // Who processed it
    ticketsDeactivated: true,           // Whether tickets were deactivated
  }
}
```

**Pros**: Simple, keeps order data together
**Cons**: Doesn't support multiple partial refunds well

### Option B: Separate `refunds` Collection

```javascript
// refunds/{refundId}
{
  paymentIntentId: 'pi_xxx',
  stripeRefundId: 're_xxx',
  fulfillmentId: 'pi_xxx',              // Same as paymentIntentId
  customerId: 'cus_xxx',
  firebaseId: 'user_uid',

  amount: 1500,                         // Cents
  currency: 'usd',

  reason: 'customer_request',
  note: 'Event cancelled due to weather',

  items: [                              // What was refunded
    { type: 'ticket', eventId: 'xxx', quantity: 2 },
    { type: 'merch', productId: 'xxx', quantity: 1 }
  ],

  ticketsDeactivated: ['ragerId1', 'ragerId2'],

  status: 'succeeded' | 'pending' | 'failed',
  createdAt: Timestamp,
  createdBy: 'admin_uid' | 'self-service',
}
```

**Pros**: Supports multiple refunds per order, better audit trail
**Cons**: More complex, need to query separately

### Recommendation: Option A for MVP

Start with extending fulfillments. Migrate to separate collection if refund volume grows.

---

## Cloud Function: `/admin-refund`

```javascript
app.post('/admin-refund', async (req, res) => {
  // 1. Verify admin (custom claim or adminUsers collection)
  // 2. Validate request
  const {
    paymentIntentId,
    amount, // Optional: partial refund amount (cents)
    reason, // 'customer_request' | 'event_cancelled' | 'duplicate' | 'other'
    note, // Admin note
    deactivateTickets, // Boolean: should we deactivate associated tickets?
  } = req.body;

  // 3. Fetch fulfillment to verify it exists and get details
  const fulfillmentRef = db.collection('fulfillments').doc(paymentIntentId);
  const fulfillment = await fulfillmentRef.get();

  if (!fulfillment.exists) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // 4. Check if already refunded
  if (fulfillment.data().refund?.status === 'full') {
    return res.status(400).json({ error: 'Order already fully refunded' });
  }

  // 5. Check for transferred tickets (BLOCKER)
  if (deactivateTickets) {
    const hasTransferred = await checkForTransferredTickets(fulfillment.data());
    if (hasTransferred) {
      return res.status(400).json({
        error: 'Cannot refund: tickets have been transferred',
        transferredTickets: hasTransferred,
      });
    }
  }

  // 6. Issue Stripe refund
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amount, // Omit for full refund
    reason: mapToStripeReason(reason),
    metadata: { adminId: req.adminUid, note },
  });

  // 7. Update fulfillment
  await fulfillmentRef.update({
    refund: {
      status: amount ? 'partial' : 'full',
      refundId: refund.id,
      amount: refund.amount,
      reason,
      note,
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      refundedBy: req.adminUid,
      ticketsDeactivated: deactivateTickets,
    },
  });

  // 8. Deactivate tickets if requested
  if (deactivateTickets) {
    await deactivateOrderTickets(fulfillment.data());
  }

  // 9. Send refund confirmation email (optional)
  // await sendRefundEmail(fulfillment.data().userEmail, refund);

  return res.json({ ok: true, refundId: refund.id, amount: refund.amount });
});
```

---

## Edge Cases & Blockers

### 1. Transferred Tickets

```javascript
async function checkForTransferredTickets(fulfillment) {
  const transferred = [];

  for (const item of fulfillment.items || []) {
    if (item.type !== 'ticket') continue;

    // Check if any ragers from this order were transferred
    const transfers = await db
      .collection('ticketTransfers')
      .where('ragerId', 'in', item.ragerIds || [])
      .where('status', '==', 'claimed')
      .get();

    if (!transfers.empty) {
      transferred.push(...transfers.docs.map((d) => d.data()));
    }
  }

  return transferred.length > 0 ? transferred : null;
}
```

**Policy Decision**: Block refund if any ticket was transferred? Or allow partial refund for non-transferred tickets?

### 2. Used Tickets

```javascript
async function checkForUsedTickets(fulfillment) {
  // Check if any tickets have usedCount > 0
  // Policy: Block refund? Or warn admin?
}
```

### 3. Partial Refunds

- Refund specific items (e.g., 1 of 3 tickets)
- Refund dollar amount (e.g., $20 off for inconvenience)
- Multiple partial refunds on same order

### 4. Merch vs Tickets

- Tickets: Deactivate on refund
- Merch: Requires return shipping (out of scope — handle manually)

### 5. Event Cancellation (Bulk Refunds)

```javascript
// Future: Bulk refund all tickets for a cancelled event
app.post('/admin-refund-event', async (req, res) => {
  const { eventId, reason, note } = req.body;

  // Find all fulfillments with tickets for this event
  // Issue refunds in batches (Stripe rate limits)
  // Deactivate all tickets
  // Send bulk notification
});
```

---

## Admin UI

### Orders Tab Enhancement

```
┌─────────────────────────────────────────────────────────────┐
│ Order #pi_xxx                                    [Refund ▼] │
├─────────────────────────────────────────────────────────────┤
│ Customer: john@example.com                                  │
│ Date: Jan 1, 2026                                          │
│ Total: $150.00                                             │
│ Status: ✅ Completed                                        │
│                                                             │
│ Items:                                                      │
│ • 2x RAGESTATE NYE 2026 Ticket — $100.00                   │
│ • 1x Hoodie (Black, L) — $50.00                            │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│ Refund Status: None                                         │
│ [Issue Full Refund] [Issue Partial Refund]                 │
└─────────────────────────────────────────────────────────────┘
```

### Refund Modal

```
┌─────────────────────────────────────────────┐
│ Issue Refund                           [✕]  │
├─────────────────────────────────────────────┤
│                                             │
│ Order Total: $150.00                        │
│                                             │
│ Refund Amount:                              │
│ ○ Full refund ($150.00)                     │
│ ○ Partial refund: $[________]               │
│                                             │
│ Reason:                                     │
│ [Customer Request           ▼]              │
│                                             │
│ Note (optional):                            │
│ ┌─────────────────────────────────────────┐ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ☑ Deactivate associated tickets             │
│                                             │
│ ⚠️ This action cannot be undone             │
│                                             │
│ [Cancel]              [Issue Refund]        │
└─────────────────────────────────────────────┘
```

---

## Self-Service Refunds (Tier 2 — Future)

### Policy Options

| Policy              | Window             | Conditions                  |
| ------------------- | ------------------ | --------------------------- |
| **No self-service** | —                  | All refunds through support |
| **Buyer's remorse** | 24 hours           | Full refund, no questions   |
| **Before event**    | Until 48h before   | Full refund minus fee       |
| **Flexible**        | Until event starts | Credit only, no cash refund |

### Implementation Notes

- Add `purchasedAt` timestamp to fulfillments (if not present)
- Check elapsed time vs policy window
- Consider processing fee retention (Stripe doesn't refund their fee)
- Self-service UI in Account → Orders → "Request Refund"

---

## Security Considerations

- Admin-only endpoint requires `token.admin` claim or `adminUsers/{uid}` check
- Rate limit: 10 refunds/minute/admin (prevent accidental bulk)
- Audit log: Log all refund attempts (success + failure) to Cloud Logging
- Stripe webhook: Listen for `charge.refund.updated` for status sync

---

## Refund & Chargeback Abuse Prevention

> **Reality check**: Given the opportunity, some customers will attend an event for free then request a refund or dispute the charge. This section outlines defenses.

### Abuse Vectors

| Vector                       | Description                                           | Risk Level |
| ---------------------------- | ----------------------------------------------------- | ---------- |
| **Post-event refund**        | Attend event, then request refund claiming issue      | High       |
| **Friendly fraud**           | Dispute charge with bank after attending              | High       |
| **Transfer & refund**        | Transfer ticket to friend, request refund on original | Medium     |
| **Duplicate purchase claim** | Claim accidental double-purchase, attend with both    | Medium     |
| **No-show claim**            | Claim they couldn't attend, actually did              | Medium     |

### Hard Blockers (Automated)

These should be **automatic denials** — no admin override without explicit escalation.

#### 1. Used Tickets = No Refund

```javascript
async function checkForUsedTickets(fulfillment) {
  const usedTickets = [];

  for (const item of fulfillment.items || []) {
    if (item.type !== 'ticket') continue;

    for (const ragerId of item.ragerIds || []) {
      const ragerSnap = await db
        .collection('events')
        .doc(item.eventId)
        .collection('ragers')
        .doc(ragerId)
        .get();

      if (ragerSnap.exists && ragerSnap.data().usedCount > 0) {
        usedTickets.push({
          ragerId,
          eventId: item.eventId,
          usedCount: ragerSnap.data().usedCount,
          scannedAt: ragerSnap.data().lastScannedAt,
        });
      }
    }
  }

  return usedTickets.length > 0 ? usedTickets : null;
}
```

**Admin UI**: Show "⚠️ TICKET SCANNED — Cannot refund" with scan timestamp.

#### 2. Transferred Tickets = No Refund

Already covered above — if ticket was transferred (even if pending), block refund.

#### 3. Event Already Occurred = No Refund

```javascript
async function checkEventPassed(fulfillment) {
  for (const item of fulfillment.items || []) {
    if (item.type !== 'ticket') continue;

    const eventSnap = await db.collection('events').doc(item.eventId).get();
    if (eventSnap.exists) {
      const eventDate =
        eventSnap.data().dateTime?.toDate?.() || new Date(eventSnap.data().dateTime);
      if (eventDate < new Date()) {
        return { eventId: item.eventId, eventDate };
      }
    }
  }
  return null;
}
```

**Policy**: Auto-deny refunds for past events. Period.

### Soft Blockers (Admin Warning)

These trigger warnings but allow admin override with justification.

#### 4. Refund Requested Close to Event

```javascript
function isCloseToEvent(eventDate, windowHours = 48) {
  const now = new Date();
  const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);
  return hoursUntilEvent < windowHours && hoursUntilEvent > 0;
}
```

**Admin UI**: "⚠️ Event is in 12 hours — are you sure?"

#### 5. Repeat Refund Requester

Track refund history per customer:

```javascript
// In customers/{uid} or separate refundHistory collection
{
  refundCount: 3,
  totalRefunded: 45000,  // cents
  lastRefundAt: Timestamp,
  refundHistory: [
    { paymentIntentId: 'pi_xxx', amount: 15000, reason: '...', date: '...' }
  ]
}
```

**Admin UI**: "⚠️ This customer has requested 3 refunds totaling $450"

### Chargeback Defense

Chargebacks (disputes filed with bank) are worse than refunds — you lose the money AND pay a ~$15 fee, plus high chargeback rates can get you banned from Stripe.

#### Evidence Collection (Automatic)

Store this data at purchase time for dispute defense:

```javascript
// Add to fulfillments/{paymentIntentId}
{
  // ... existing fields ...

  disputeEvidence: {
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    purchasedAt: Timestamp,
    emailVerified: true,
    accountCreatedAt: Timestamp,
    previousPurchases: 5,
    billingAddressMatch: true,  // If AVS check passed
  }
}
```

#### Evidence for Ticket Events

When fighting "I didn't attend" disputes:

```javascript
// Gather from ragers collection
{
  ticketScanned: true,
  scannedAt: '2026-01-01T23:45:00Z',
  scannedBy: 'door_staff_uid',
  scanLocation: 'Main Entrance',
}
```

**Stripe Dispute Response**: Upload scan timestamp + IP/device from purchase as evidence.

#### Webhook: Auto-Respond to Disputes

```javascript
// functions/stripe.js — add webhook handler
app.post('/webhook', async (req, res) => {
  const event = stripe.webhooks.constructEvent(
    req.rawBody,
    req.headers['stripe-signature'],
    WEBHOOK_SECRET.value(),
  );

  if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object;
    const paymentIntentId = dispute.payment_intent;

    // Fetch evidence from fulfillment
    const fulfillment = await db.collection('fulfillments').doc(paymentIntentId).get();
    const evidence = fulfillment.data()?.disputeEvidence || {};

    // Check if tickets were scanned
    const scanEvidence = await getTicketScanEvidence(fulfillment.data());

    // Auto-submit evidence to Stripe
    await stripe.disputes.update(dispute.id, {
      evidence: {
        customer_email_address: fulfillment.data().userEmail,
        customer_purchase_ip: evidence.ipAddress,
        receipt: fulfillment.data().receiptUrl,
        service_date: scanEvidence?.scannedAt,
        service_documentation: scanEvidence
          ? `Ticket scanned at event on ${scanEvidence.scannedAt}`
          : undefined,
      },
      submit: true, // Auto-submit (or false for manual review)
    });

    // Flag user account
    await flagAccountForDispute(fulfillment.data().firebaseId, dispute.id);
  }
});
```

### Account Flagging & Bans

Track bad actors:

```javascript
// customers/{uid}
{
  // ... existing fields ...

  trustScore: {
    level: 'trusted' | 'normal' | 'suspicious' | 'banned',
    flags: [
      { type: 'chargeback', date: '...', paymentIntentId: '...' },
      { type: 'refund_abuse', date: '...', note: '...' },
    ],
    chargebackCount: 1,
    lastFlaggedAt: Timestamp,
  }
}
```

**Actions by trust level**:

| Level        | Actions                                      |
| ------------ | -------------------------------------------- |
| `trusted`    | Full access, priority support                |
| `normal`     | Default — standard policies                  |
| `suspicious` | Require 3D Secure, manual review for refunds |
| `banned`     | Block purchases, reject refund requests      |

### Policy Recommendations

#### For Tickets (Events)

| Scenario               | Policy                                   |
| ---------------------- | ---------------------------------------- |
| >48 hours before event | Credit for future event (no cash refund) |
| <48 hours before event | No refund                                |
| After event            | No refund                                |
| Ticket scanned         | No refund, ever                          |
| Ticket transferred     | No refund                                |
| Event cancelled by us  | Full refund                              |

#### For Merch

| Scenario        | Policy                                  |
| --------------- | --------------------------------------- |
| Before shipping | Full refund                             |
| After shipping  | Return required, customer pays shipping |
| Worn/used       | No refund                               |

### Self-Service Safeguards (If Implemented)

If you ever add customer-initiated refunds:

1. **Time window**: Only within X hours of purchase
2. **Pre-event only**: Auto-deny if event has passed
3. **Unused only**: Check `usedCount === 0`
4. **Once per order**: Can't request multiple times
5. **Cooldown**: Max 1 self-service refund per 30 days per account
6. **Manual queue**: Flag for review if customer has previous refunds

### Metrics to Track

| Metric                     | Alert Threshold                 |
| -------------------------- | ------------------------------- |
| Refund rate                | >5% of revenue                  |
| Chargeback rate            | >0.5% (Stripe warning at 0.75%) |
| Repeat refund requesters   | >2 refunds per customer         |
| Post-event refund attempts | Any (log for pattern detection) |

---

## Implementation Phases

### Phase 1: Admin Dashboard Refunds (~4 hours)

- [ ] Cloud Function `/admin-refund`
- [ ] API proxy `/api/admin/refund`
- [ ] Admin UI: Refund button on order detail
- [ ] Refund confirmation modal
- [ ] Update fulfillment doc with refund status
- [ ] Basic transferred ticket check (block if transferred)
- [ ] Used ticket check (block if scanned)
- [ ] Event passed check (block if event already occurred)

### Phase 2: Ticket Deactivation (~2 hours)

- [ ] Deactivate ragers on refund
- [ ] Invalidate ticketTokens
- [ ] Handle partial ticket refunds (e.g., 1 of 3)

### Phase 3: Chargeback Defense (~3 hours)

- [ ] Store dispute evidence at purchase time (IP, user agent, etc.)
- [ ] Stripe webhook for `charge.dispute.created`
- [ ] Auto-submit evidence to Stripe
- [ ] Flag user account on dispute
- [ ] Admin view: see flagged accounts

### Phase 4: Refund History & Analytics (~2 hours)

- [ ] Admin dashboard: Refunds tab
- [ ] Filter by date, reason, admin
- [ ] Export refund report
- [ ] Track refund rate metrics

### Phase 5: Customer Trust Scoring (~2 hours)

- [ ] Add `trustScore` to customer docs
- [ ] Track refund/chargeback history per customer
- [ ] Admin UI: show customer risk level
- [ ] Alert on suspicious patterns

### Phase 6: Self-Service (Future)

- [ ] Define refund policy window
- [ ] Customer-facing refund request UI
- [ ] Auto-approval within policy
- [ ] Manual review queue for edge cases
- [ ] Rate limiting per account

---

## Stripe API Reference

```javascript
// Create refund
const refund = await stripe.refunds.create({
  payment_intent: 'pi_xxx',
  amount: 1500, // Cents, omit for full refund
  reason: 'requested_by_customer', // or 'duplicate', 'fraudulent'
  metadata: { adminId: 'xxx', orderId: 'xxx' },
});

// List refunds for a payment
const refunds = await stripe.refunds.list({
  payment_intent: 'pi_xxx',
});

// Retrieve refund
const refund = await stripe.refunds.retrieve('re_xxx');
```

### Stripe Refund Reasons

- `duplicate` — Duplicate charge
- `fraudulent` — Fraudulent charge
- `requested_by_customer` — Customer request

---

## Open Questions

1. **Partial ticket refunds** — If someone bought 3 tickets and wants to refund 1, how do we handle?
   - Option A: Block — must refund all or none
   - Option B: Allow — admin picks which rager to deactivate

2. **Refund fee retention** — Stripe doesn't refund their ~2.9% fee. Do we absorb or pass to customer?

3. **Merch refunds** — Out of scope for now? Handle via Shopify?

4. **Refund notification** — Email customer on refund? Push notification?

5. **Chargeback handling** — Should we auto-update order status on Stripe `charge.dispute.created` webhook?

---

## Summary

| Phase | Scope                  | Effort | Priority     |
| ----- | ---------------------- | ------ | ------------ |
| 1     | Admin refunds + blocks | 4h     | When needed  |
| 2     | Ticket deactivation    | 2h     | With Phase 1 |
| 3     | Chargeback defense     | 3h     | With Phase 1 |
| 4     | Refund analytics       | 2h     | Nice to have |
| 5     | Customer trust scoring | 2h     | Nice to have |
| 6     | Self-service           | 8h+    | Future/Maybe |

**Recommendation**: Don't build until refund volume justifies it. Current manual Stripe Dashboard workflow is fine for low volume. When you do build, include abuse prevention from day one — it's much harder to add later.

**Key Principle**: Your ticket scanning system is your best friend. A scanned ticket = irrefutable proof of attendance = automatic denial of refund/dispute.
