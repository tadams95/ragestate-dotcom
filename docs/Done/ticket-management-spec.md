# Ticket Management & Audit Infrastructure Spec

> **Status**: Planning
> **Priority**: High (Acquisition Readiness)
> **Prerequisite for**: Chargeback defense, operational scaling, due diligence

---

## Executive Summary

This spec defines a professional-grade ticket management system with:

- **Immutable audit trail** for every ticket state change
- **Admin ticket lookup** with full history visibility
- **Manual adjustment capabilities** with restrictions and logging
- **Role-based access control** (admin vs door staff)
- **Chargeback-ready evidence** for dispute defense

**Why now?** An acquisition-ready platform requires complete, tamper-evident records. Every day without audit logging is a day of scan history that can't be proven in a dispute.

---

## Current State

| Feature                        | Status   | Gap      |
| ------------------------------ | -------- | -------- |
| QR code scanning               | ✅ Works | —        |
| Token-based scan               | ✅ Works | —        |
| User ID scan                   | ✅ Works | —        |
| Scan feedback (sound, haptics) | ✅ Works | —        |
| Multi-camera support           | ✅ Works | —        |
| **Audit trail**                | ❌ None  | Critical |
| **Undo accidental scan**       | ❌ None  | High     |
| **Manual ticket adjustment**   | ❌ None  | High     |
| **Scan history/log**           | ❌ None  | Medium   |
| **Ticket lookup by admin**     | ❌ None  | Medium   |
| **Role-based access**          | ❌ None  | Medium   |

### Current Data Flow

```
Scanner → /scan-ticket → Update rager.usedCount → Response
                              ↓
                         (no logging)
```

### Target Data Flow

```
Scanner → /scan-ticket → Update rager.usedCount → Log to auditTrail → Response
                              ↓                          ↓
Admin UI → /admin-adjust-ticket → Update rager → Log to auditTrail → Response
```

---

## Goals

### Operational Goals

1. Fix accidental scans without database access
2. Handle edge cases (VIPs, technical failures, re-entry)
3. Reduce founder dependency for ticket issues
4. Support multi-venue, multi-staff operations

### Acquisition Goals

1. Complete audit trail for due diligence
2. Defensible chargeback evidence
3. Demonstrate operational maturity
4. Role-based access for team scaling

### Security Goals

1. Prevent abuse by staff
2. Maintain data integrity
3. Restrict modifications to authorized users
4. Rate limit to prevent accidental bulk changes

---

## Data Model

### Core: `ticketAuditLog/{autoId}` — IMMUTABLE

Every ticket state change creates an immutable log entry.

```javascript
// ticketAuditLog/{autoId}
{
  // === Identity ===
  eventId: 'event_xxx',                    // Event this ticket belongs to
  ragerId: 'rager_xxx',                    // Specific ticket record
  userId: 'user_xxx',                      // Ticket holder
  orderId: 'pi_xxx',                       // Link to fulfillment/payment

  // === Action ===
  action: 'scan'                           // See Action Types below
        | 'undo_scan'
        | 'manual_increment'
        | 'manual_decrement'
        | 'manual_set'
        | 'refund_reset'
        | 'transfer_out'
        | 'transfer_in'
        | 'deactivate'
        | 'reactivate',

  // === State Change ===
  previousValue: {
    usedCount: 0,
    active: true,
    ticketQuantity: 2,
  },
  newValue: {
    usedCount: 1,
    active: true,
    ticketQuantity: 2,
  },
  delta: 1,                                // +1 for scan, -1 for undo, etc.

  // === Context ===
  source: 'scanner' | 'admin_ui' | 'api' | 'system' | 'transfer',
  reason: 'Accidental scan - guest not yet inside',  // Required for manual actions

  // === Actor ===
  actorType: 'device' | 'admin' | 'system',
  actorId: 'door-tablet-1' | 'admin_uid' | 'transfer-system',
  actorEmail: 'tyrelle@ragestate.com',     // For admin actions
  actorName: 'Tyrelle Adams',              // Display name

  // === Metadata ===
  timestamp: Timestamp,                    // Server timestamp
  clientTimestamp: '2026-01-02T23:45:12Z', // Client time (for latency analysis)

  // === Request Context ===
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',

  // === Device Info (Scanner) ===
  device: {
    id: 'door-tablet-1',
    name: 'Main Entrance iPad',
    platform: 'iOS',
    appVersion: '1.2.0',
  },

  // === Geo (if available) ===
  location: {
    latitude: 34.0522,
    longitude: -118.2437,
    accuracy: 10,                          // Meters
    source: 'gps' | 'ip' | 'manual',
  },
}
```

### Action Types

| Action             | Description                              | Source          | Requires Reason |
| ------------------ | ---------------------------------------- | --------------- | --------------- |
| `scan`             | Normal ticket scan at door               | scanner         | No              |
| `undo_scan`        | Reverse last scan (within window)        | scanner/admin   | Yes             |
| `manual_increment` | Admin increases usedCount                | admin_ui        | Yes             |
| `manual_decrement` | Admin decreases usedCount                | admin_ui        | Yes             |
| `manual_set`       | Admin sets usedCount to specific value   | admin_ui        | Yes             |
| `refund_reset`     | Reset usedCount after refund             | system          | Auto            |
| `transfer_out`     | Ticket transferred away                  | transfer        | Auto            |
| `transfer_in`      | Ticket received via transfer             | transfer        | Auto            |
| `deactivate`       | Ticket deactivated (refund, fraud, etc.) | admin_ui/system | Yes             |
| `reactivate`       | Ticket reactivated                       | admin_ui        | Yes             |

### Firestore Rules for Audit Log

```javascript
// IMMUTABLE — no client writes, no updates, no deletes
match /ticketAuditLog/{logId} {
  // Only admins can read
  allow read: if isAdmin();

  // No client writes — server only via Admin SDK
  allow create, update, delete: if false;
}
```

### Index Requirements

```json
// firestore.indexes.json additions
{
  "collectionGroup": "ticketAuditLog",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "eventId", "order": "ASCENDING" },
    { "fieldPath": "timestamp", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "ticketAuditLog",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "ragerId", "order": "ASCENDING" },
    { "fieldPath": "timestamp", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "ticketAuditLog",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "timestamp", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "ticketAuditLog",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "actorId", "order": "ASCENDING" },
    { "fieldPath": "timestamp", "order": "DESCENDING" }
  ]
}
```

---

## Cloud Functions

### 1. Modify Existing: `/scan-ticket`

Add audit logging to existing scan endpoint.

```javascript
// In existing scan-ticket transaction, after successful scan:
await db.collection('ticketAuditLog').add({
  eventId: parentEventId,
  ragerId: ragerRef.id,
  userId: ragerData.firebaseId || userId,
  orderId: ragerData.paymentIntentId || null,

  action: 'scan',

  previousValue: {
    usedCount: usedCount,
    active: ragerData.active,
    ticketQuantity: quantity,
  },
  newValue: {
    usedCount: nextUsed,
    active: nextActive,
    ticketQuantity: quantity,
  },
  delta: 1,

  source: 'scanner',
  reason: null, // Not required for scans

  actorType: 'device',
  actorId: scannerId || 'unknown',
  actorEmail: null,
  actorName: null,

  timestamp: admin.firestore.FieldValue.serverTimestamp(),
  clientTimestamp: new Date().toISOString(),

  ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
  userAgent: req.headers['user-agent'] || null,

  device: {
    id: scannerId || 'unknown',
    name: null,
    platform: null,
    appVersion: null,
  },

  location: null, // Could be added if scanner sends GPS
});
```

### 2. New: `/admin-undo-scan`

Undo the last scan on a ticket (within time window).

```javascript
app.post('/admin-undo-scan', async (req, res) => {
  try {
    // 1. Verify proxy key
    const expectedProxyKey = PROXY_KEY.value() || process.env.PROXY_KEY;
    if (expectedProxyKey) {
      const provided = req.get('x-proxy-key');
      if (!provided || provided !== expectedProxyKey) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const {
      ragerId,
      eventId,
      adminId, // Required: who is making this change
      adminEmail, // Required: for audit
      reason, // Required: why are we undoing
      scannerId, // Optional: which scanner to allow undo from
    } = req.body || {};

    // 2. Validate required fields
    if (!ragerId || !eventId) {
      return res.status(400).json({ error: 'Missing ragerId or eventId' });
    }
    if (!adminId || !adminEmail) {
      return res.status(400).json({ error: 'Missing admin identification' });
    }
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ error: 'Reason required (min 10 characters)' });
    }

    // 3. Verify admin (check custom claim or adminUsers collection)
    const adminDoc = await db.collection('adminUsers').doc(adminId).get();
    const isAdmin = adminDoc.exists;
    // TODO: Also check custom claims if using Firebase Auth

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // 4. Fetch the ticket
    const ragerRef = db.collection('events').doc(eventId).collection('ragers').doc(ragerId);

    const result = await db.runTransaction(async (tx) => {
      const ragerSnap = await tx.get(ragerRef);

      if (!ragerSnap.exists) {
        throw new Error('Ticket not found');
      }

      const data = ragerSnap.data();
      const usedCount = Math.max(0, parseInt(data.usedCount || 0, 10));
      const quantity = Math.max(1, parseInt(data.ticketQuantity || 1, 10));

      // 5. Can't undo if never scanned
      if (usedCount <= 0) {
        throw new Error('Ticket has not been scanned');
      }

      // 6. Check time window (optional: only allow undo within X minutes of last scan)
      const lastScanAt = data.lastScanAt?.toDate?.() || null;
      const UNDO_WINDOW_MINUTES = 60; // Configurable
      if (lastScanAt) {
        const minutesSinceScan = (Date.now() - lastScanAt.getTime()) / (1000 * 60);
        if (minutesSinceScan > UNDO_WINDOW_MINUTES) {
          throw new Error(`Undo window expired (${UNDO_WINDOW_MINUTES} min limit)`);
        }
      }

      // 7. Calculate new state
      const newUsedCount = usedCount - 1;
      const newActive = newUsedCount < quantity;

      // 8. Update ticket
      tx.update(ragerRef, {
        usedCount: newUsedCount,
        active: newActive,
        lastModifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastModifiedBy: adminId,
      });

      // 9. Create audit log entry
      const auditRef = db.collection('ticketAuditLog').doc();
      tx.set(auditRef, {
        eventId,
        ragerId,
        userId: data.firebaseId || null,
        orderId: data.paymentIntentId || null,

        action: 'undo_scan',

        previousValue: {
          usedCount: usedCount,
          active: data.active,
          ticketQuantity: quantity,
        },
        newValue: {
          usedCount: newUsedCount,
          active: newActive,
          ticketQuantity: quantity,
        },
        delta: -1,

        source: 'admin_ui',
        reason: reason.trim(),

        actorType: 'admin',
        actorId: adminId,
        actorEmail: adminEmail,
        actorName: null, // Could fetch from admin profile

        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        clientTimestamp: new Date().toISOString(),

        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        userAgent: req.headers['user-agent'] || null,

        device: null,
        location: null,
      });

      return {
        ragerId,
        eventId,
        previousUsedCount: usedCount,
        newUsedCount,
        active: newActive,
        remaining: quantity - newUsedCount,
      };
    });

    logger.info('admin-undo-scan success', {
      ragerId,
      eventId,
      adminId,
      reason,
    });

    return res.json({ ok: true, ...result });
  } catch (err) {
    logger.error('admin-undo-scan error', { message: err.message });
    return res.status(400).json({ error: err.message });
  }
});
```

### 3. New: `/admin-adjust-ticket`

Full manual control for admins.

```javascript
app.post('/admin-adjust-ticket', async (req, res) => {
  try {
    // 1. Verify proxy key
    const expectedProxyKey = PROXY_KEY.value() || process.env.PROXY_KEY;
    if (expectedProxyKey) {
      const provided = req.get('x-proxy-key');
      if (!provided || provided !== expectedProxyKey) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const {
      ragerId,
      eventId,
      adminId,
      adminEmail,
      reason,

      // Adjustment options (use ONE):
      action, // 'increment' | 'decrement' | 'set' | 'deactivate' | 'reactivate'
      value, // For 'set' action: the target usedCount
    } = req.body || {};

    // 2. Validate
    if (!ragerId || !eventId) {
      return res.status(400).json({ error: 'Missing ragerId or eventId' });
    }
    if (!adminId || !adminEmail) {
      return res.status(400).json({ error: 'Missing admin identification' });
    }
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ error: 'Reason required (min 10 characters)' });
    }
    if (!['increment', 'decrement', 'set', 'deactivate', 'reactivate'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    if (action === 'set' && (typeof value !== 'number' || value < 0)) {
      return res.status(400).json({ error: 'Invalid value for set action' });
    }

    // 3. Verify admin
    const adminDoc = await db.collection('adminUsers').doc(adminId).get();
    if (!adminDoc.exists) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // 4. Check rate limit (10 adjustments per hour per admin)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentAdjustments = await db
      .collection('ticketAuditLog')
      .where('actorId', '==', adminId)
      .where('source', '==', 'admin_ui')
      .where('timestamp', '>=', oneHourAgo)
      .limit(10)
      .get();

    if (recentAdjustments.size >= 10) {
      return res.status(429).json({ error: 'Rate limit exceeded (10 adjustments/hour)' });
    }

    // 5. Fetch event to check if it's too old
    const eventSnap = await db.collection('events').doc(eventId).get();
    if (!eventSnap.exists) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventData = eventSnap.data();
    const eventDate = eventData.dateTime?.toDate?.() || new Date(eventData.dateTime);
    const hoursSinceEvent = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60);
    const MAX_HOURS_AFTER_EVENT = 24;

    if (hoursSinceEvent > MAX_HOURS_AFTER_EVENT) {
      return res.status(400).json({
        error: `Cannot modify tickets more than ${MAX_HOURS_AFTER_EVENT} hours after event`,
      });
    }

    // 6. Fetch ticket and perform adjustment
    const ragerRef = db.collection('events').doc(eventId).collection('ragers').doc(ragerId);

    const result = await db.runTransaction(async (tx) => {
      const ragerSnap = await tx.get(ragerRef);

      if (!ragerSnap.exists) {
        throw new Error('Ticket not found');
      }

      const data = ragerSnap.data();
      const usedCount = Math.max(0, parseInt(data.usedCount || 0, 10));
      const quantity = Math.max(1, parseInt(data.ticketQuantity || 1, 10));

      // Check for pending transfer
      if (data.pendingTransferId) {
        throw new Error('Cannot modify ticket with pending transfer');
      }

      // Calculate new state based on action
      let newUsedCount = usedCount;
      let newActive = data.active;
      let auditAction = action;

      switch (action) {
        case 'increment':
          newUsedCount = Math.min(usedCount + 1, quantity);
          newActive = newUsedCount < quantity;
          auditAction = 'manual_increment';
          break;

        case 'decrement':
          newUsedCount = Math.max(usedCount - 1, 0);
          newActive = newUsedCount < quantity;
          auditAction = 'manual_decrement';
          break;

        case 'set':
          if (value > quantity) {
            throw new Error(`Cannot set usedCount above ticketQuantity (${quantity})`);
          }
          newUsedCount = value;
          newActive = newUsedCount < quantity;
          auditAction = 'manual_set';
          break;

        case 'deactivate':
          newActive = false;
          auditAction = 'deactivate';
          break;

        case 'reactivate':
          newActive = usedCount < quantity;
          auditAction = 'reactivate';
          break;
      }

      // Update ticket
      tx.update(ragerRef, {
        usedCount: newUsedCount,
        active: newActive,
        lastModifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastModifiedBy: adminId,
        lastModifiedReason: reason.trim(),
      });

      // Create audit log
      const auditRef = db.collection('ticketAuditLog').doc();
      tx.set(auditRef, {
        eventId,
        ragerId,
        userId: data.firebaseId || null,
        orderId: data.paymentIntentId || null,

        action: auditAction,

        previousValue: {
          usedCount: usedCount,
          active: data.active,
          ticketQuantity: quantity,
        },
        newValue: {
          usedCount: newUsedCount,
          active: newActive,
          ticketQuantity: quantity,
        },
        delta: newUsedCount - usedCount,

        source: 'admin_ui',
        reason: reason.trim(),

        actorType: 'admin',
        actorId: adminId,
        actorEmail: adminEmail,
        actorName: null,

        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        clientTimestamp: new Date().toISOString(),

        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        userAgent: req.headers['user-agent'] || null,

        device: null,
        location: null,
      });

      return {
        ragerId,
        eventId,
        action: auditAction,
        previousUsedCount: usedCount,
        newUsedCount,
        active: newActive,
        remaining: quantity - newUsedCount,
      };
    });

    logger.info('admin-adjust-ticket success', {
      ragerId,
      eventId,
      adminId,
      action,
      reason,
    });

    return res.json({ ok: true, ...result });
  } catch (err) {
    logger.error('admin-adjust-ticket error', { message: err.message });
    return res.status(400).json({ error: err.message });
  }
});
```

### 4. New: `/admin-ticket-history`

Fetch audit history for a ticket.

```javascript
app.get('/admin-ticket-history', async (req, res) => {
  try {
    // Verify proxy key
    const expectedProxyKey = PROXY_KEY.value() || process.env.PROXY_KEY;
    if (expectedProxyKey) {
      const provided = req.get('x-proxy-key');
      if (!provided || provided !== expectedProxyKey) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const { ragerId, eventId, userId, limit: limitStr } = req.query;
    const queryLimit = Math.min(parseInt(limitStr || '50', 10), 200);

    let query = db.collection('ticketAuditLog');

    if (ragerId) {
      query = query.where('ragerId', '==', ragerId);
    } else if (eventId) {
      query = query.where('eventId', '==', eventId);
    } else if (userId) {
      query = query.where('userId', '==', userId);
    } else {
      return res.status(400).json({ error: 'Provide ragerId, eventId, or userId' });
    }

    const snap = await query.orderBy('timestamp', 'desc').limit(queryLimit).get();

    const history = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      timestamp: d.data().timestamp?.toDate?.()?.toISOString() || null,
    }));

    return res.json({ history, count: history.length });
  } catch (err) {
    logger.error('admin-ticket-history error', { message: err.message });
    return res.status(500).json({ error: err.message });
  }
});
```

### 5. New: `/admin-ticket-lookup`

Search tickets by various criteria.

```javascript
app.get('/admin-ticket-lookup', async (req, res) => {
  try {
    // Verify proxy key
    const expectedProxyKey = PROXY_KEY.value() || process.env.PROXY_KEY;
    if (expectedProxyKey) {
      const provided = req.get('x-proxy-key');
      if (!provided || provided !== expectedProxyKey) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const { email, eventId, orderId, ragerId, limit: limitStr } = req.query;
    const queryLimit = Math.min(parseInt(limitStr || '50', 10), 100);

    let tickets = [];

    if (ragerId && eventId) {
      // Direct lookup
      const ragerSnap = await db
        .collection('events')
        .doc(eventId)
        .collection('ragers')
        .doc(ragerId)
        .get();

      if (ragerSnap.exists) {
        tickets = [
          {
            id: ragerSnap.id,
            eventId,
            ...ragerSnap.data(),
          },
        ];
      }
    } else if (email) {
      // Find user by email, then get their tickets
      const usersSnap = await db
        .collection('users')
        .where('email', '==', email.toLowerCase())
        .limit(1)
        .get();

      if (!usersSnap.empty) {
        const userId = usersSnap.docs[0].id;

        // If eventId provided, scope to that event
        if (eventId) {
          const ragersSnap = await db
            .collection('events')
            .doc(eventId)
            .collection('ragers')
            .where('firebaseId', '==', userId)
            .limit(queryLimit)
            .get();

          tickets = ragersSnap.docs.map((d) => ({
            id: d.id,
            eventId,
            ...d.data(),
          }));
        } else {
          // Search across all events (expensive - use sparingly)
          const ragersSnap = await db
            .collectionGroup('ragers')
            .where('firebaseId', '==', userId)
            .limit(queryLimit)
            .get();

          tickets = ragersSnap.docs.map((d) => ({
            id: d.id,
            eventId: d.ref.parent.parent.id,
            ...d.data(),
          }));
        }
      }
    } else if (eventId) {
      // List all tickets for event
      const ragersSnap = await db
        .collection('events')
        .doc(eventId)
        .collection('ragers')
        .limit(queryLimit)
        .get();

      tickets = ragersSnap.docs.map((d) => ({
        id: d.id,
        eventId,
        ...d.data(),
      }));
    } else if (orderId) {
      // Find tickets by payment intent
      const ragersSnap = await db
        .collectionGroup('ragers')
        .where('paymentIntentId', '==', orderId)
        .limit(queryLimit)
        .get();

      tickets = ragersSnap.docs.map((d) => ({
        id: d.id,
        eventId: d.ref.parent.parent.id,
        ...d.data(),
      }));
    } else {
      return res.status(400).json({ error: 'Provide email, eventId, orderId, or ragerId+eventId' });
    }

    // Enrich with event data
    const eventIds = [...new Set(tickets.map((t) => t.eventId))];
    const eventsMap = {};

    for (const eid of eventIds) {
      const eventSnap = await db.collection('events').doc(eid).get();
      if (eventSnap.exists) {
        eventsMap[eid] = {
          id: eid,
          title: eventSnap.data().title,
          dateTime: eventSnap.data().dateTime?.toDate?.()?.toISOString(),
        };
      }
    }

    const enrichedTickets = tickets.map((t) => ({
      ...t,
      event: eventsMap[t.eventId] || null,
    }));

    return res.json({ tickets: enrichedTickets, count: enrichedTickets.length });
  } catch (err) {
    logger.error('admin-ticket-lookup error', { message: err.message });
    return res.status(500).json({ error: err.message });
  }
});
```

---

## API Proxies

Create Next.js API routes to proxy these endpoints:

### `/api/admin/undo-scan/route.js`

```javascript
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const proxyKey = process.env.PROXY_KEY;
    const baseUrl = process.env.STRIPE_FN_URL || process.env.NEXT_PUBLIC_STRIPE_FN_URL;

    if (!baseUrl) {
      return NextResponse.json({ error: 'Function URL not configured' }, { status: 503 });
    }

    const resp = await fetch(`${baseUrl}/admin-undo-scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(proxyKey ? { 'x-proxy-key': proxyKey } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

Similar patterns for:

- `/api/admin/adjust-ticket/route.js`
- `/api/admin/ticket-history/route.js`
- `/api/admin/ticket-lookup/route.js`

---

## Admin UI

### 1. Ticket Lookup Page (`/admin/tickets`)

```
┌─────────────────────────────────────────────────────────────────┐
│ Ticket Lookup                                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Search by:                                                       │
│ [Email      ▼]  [john@example.com________________] [Search]     │
│                                                                  │
│ Event Filter: [All Events                        ▼]              │
│                                                                  │
│ ─────────────────────────────────────────────────────────────── │
│                                                                  │
│ Results (3 tickets found)                                        │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ RAGESTATE NYE 2026                           [View History] │ │
│ │ Ticket ID: rager_abc123                                     │ │
│ │ Holder: John Smith (john@example.com)                       │ │
│ │ Status: ✅ Active (1/2 used)                                │ │
│ │ Last Scan: Jan 1, 2026 at 11:32 PM                         │ │
│ │                                                             │ │
│ │ [Undo Last Scan] [Adjust Count] [Deactivate]               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Ticket Detail Modal

```
┌─────────────────────────────────────────────────────────────────┐
│ Ticket Details                                             [✕]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Event: RAGESTATE NYE 2026                                       │
│ Ticket ID: rager_abc123                                         │
│ Order: pi_xxx (View Order)                                      │
│                                                                  │
│ Holder: John Smith                                               │
│ Email: john@example.com                                          │
│ User ID: user_xxx                                                │
│                                                                  │
│ ─────────────────────────────────────────────────────────────── │
│                                                                  │
│ Ticket Status                                                    │
│ ┌─────────────────────────────────────────┐                     │
│ │ Quantity: 2                             │                     │
│ │ Used: 1                                 │                     │
│ │ Remaining: 1                            │                     │
│ │ Status: ✅ Active                       │                     │
│ └─────────────────────────────────────────┘                     │
│                                                                  │
│ Quick Actions                                                    │
│ [➖ Decrement] [➕ Increment] [🔢 Set Value] [🚫 Deactivate]    │
│                                                                  │
│ ─────────────────────────────────────────────────────────────── │
│                                                                  │
│ History (5 entries)                                              │
│                                                                  │
│ Jan 1, 11:32 PM — SCAN                                          │
│   Device: door-tablet-1                                          │
│   Result: 1 → 2 used                                            │
│                                                                  │
│ Jan 1, 11:15 PM — SCAN                                          │
│   Device: door-tablet-1                                          │
│   Result: 0 → 1 used                                            │
│                                                                  │
│ Dec 28, 2:15 PM — PURCHASE                                       │
│   Order: pi_xxx                                                  │
│   Quantity: 2 tickets                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Adjustment Modal

```
┌─────────────────────────────────────────────┐
│ Adjust Ticket                          [✕]  │
├─────────────────────────────────────────────┤
│                                             │
│ Current: 1/2 used                           │
│                                             │
│ Action:                                     │
│ ○ Decrement (undo 1 scan)                   │
│ ○ Increment (add 1 scan)                    │
│ ● Set to specific value: [0]                │
│ ○ Deactivate (block entry)                  │
│                                             │
│ Reason (required):                          │
│ ┌─────────────────────────────────────────┐ │
│ │ Accidental scan - guest was not yet    │ │
│ │ inside the venue                        │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ⚠️ This action will be logged permanently   │
│                                             │
│ [Cancel]            [Apply Adjustment]      │
└─────────────────────────────────────────────┘
```

### 4. Scanner Enhancement: Undo Button

Add to scanner success screen (visible for 60 seconds after scan):

```
┌─────────────────────────────────────────┐
│ ✅ VALID                                │
│                                         │
│ John Smith                              │
│ 1 remaining                             │
│                                         │
│ [Undo This Scan]  ← Visible for 60 sec  │
│                                         │
│ Scanned at 11:32:15 PM                  │
└─────────────────────────────────────────┘
```

---

## Restrictions & Safeguards

### Access Control

| Role        | Scan | Undo (own scan) | Undo (any)  | Adjust | View History |
| ----------- | ---- | --------------- | ----------- | ------ | ------------ |
| Door Staff  | ✅   | ✅ (60 sec)     | ❌          | ❌     | ❌           |
| Admin       | ✅   | ✅              | ✅ (60 min) | ✅     | ✅           |
| Super Admin | ✅   | ✅              | ✅          | ✅     | ✅           |

### Time Windows

| Action                  | Window               | Rationale              |
| ----------------------- | -------------------- | ---------------------- |
| Undo own scan (scanner) | 60 seconds           | Fix immediate mistakes |
| Undo any scan (admin)   | 60 minutes           | Support escalations    |
| Adjust ticket           | 24 hours after event | Post-event cleanup     |
| View history            | Forever              | Audit trail            |

### Rate Limits

| Action                | Limit | Window     |
| --------------------- | ----- | ---------- |
| Adjustments per admin | 10    | Per hour   |
| Undo per scanner      | 5     | Per hour   |
| History queries       | 100   | Per minute |

### Hard Blocks

- Cannot set `usedCount` above `ticketQuantity`
- Cannot modify tickets with pending transfers
- Cannot modify tickets >24 hours after event end
- Cannot delete audit log entries (ever)

---

## Chargeback Evidence Package

When a dispute is filed, generate this evidence package:

```javascript
async function generateChargebackEvidence(paymentIntentId) {
  // 1. Get fulfillment
  const fulfillment = await db.collection('fulfillments').doc(paymentIntentId).get();

  // 2. Get all tickets from this order
  const tickets = await getOrderTickets(fulfillment.data());

  // 3. Get audit history for each ticket
  const auditHistory = [];
  for (const ticket of tickets) {
    const history = await db
      .collection('ticketAuditLog')
      .where('ragerId', '==', ticket.id)
      .orderBy('timestamp', 'asc')
      .get();
    auditHistory.push(...history.docs.map((d) => d.data()));
  }

  // 4. Build evidence package
  return {
    order: {
      paymentIntentId,
      amount: fulfillment.data().amount,
      purchasedAt: fulfillment.data().createdAt,
      customerEmail: fulfillment.data().userEmail,
      customerIP: fulfillment.data().disputeEvidence?.ipAddress,
    },
    tickets: tickets.map((t) => ({
      id: t.id,
      quantity: t.ticketQuantity,
      usedCount: t.usedCount,
      lastScanAt: t.lastScanAt,
    })),
    scanEvents: auditHistory.filter((a) => a.action === 'scan'),
    manualAdjustments: auditHistory.filter((a) => a.action.startsWith('manual_')),

    // Key evidence
    wasScanned: auditHistory.some((a) => a.action === 'scan'),
    wasManuallyModified: auditHistory.some((a) => a.source === 'admin_ui'),
    firstScanAt: auditHistory.find((a) => a.action === 'scan')?.timestamp,

    // Integrity
    auditLogIntact: true, // No gaps, no deletions
    totalAuditEntries: auditHistory.length,
  };
}
```

---

## Implementation Phases

### Phase 1: Audit Trail Foundation (2 hours) ⚡ DO FIRST

Add logging to existing scan endpoint:

- [ ] Add audit log write to `/scan-ticket` endpoint
- [ ] Add Firestore indexes for `ticketAuditLog`
- [ ] Test logging is working

**Why first**: Every scan from now on is logged. This builds your evidence history.

### Phase 2: Admin Ticket Lookup (3 hours)

- [ ] Create `/admin-ticket-lookup` endpoint
- [ ] Create `/admin-ticket-history` endpoint
- [ ] Create API proxies
- [ ] Create `TicketsTab.js` component for admin
- [ ] Search by email, event, order
- [ ] View ticket details with history

### Phase 3: Undo Last Scan (2 hours)

- [ ] Create `/admin-undo-scan` endpoint
- [ ] Add "Undo" button to scanner success screen
- [ ] 60-second window enforcement
- [ ] Audit log entry for undos

### Phase 4: Full Manual Adjustment (3 hours)

- [ ] Create `/admin-adjust-ticket` endpoint
- [ ] Create adjustment modal UI
- [ ] Reason field (required)
- [ ] Rate limiting
- [ ] Time window enforcement (24h after event)

### Phase 5: Chargeback Evidence Export (2 hours)

- [ ] Create evidence package generator
- [ ] "Export Evidence" button in admin
- [ ] PDF/JSON export format
- [ ] Auto-attach to Stripe disputes (webhook)

### Phase 6: Reporting Dashboard (2 hours)

- [ ] Audit log viewer with filters
- [ ] Adjustment metrics (who, when, why)
- [ ] Scan vs adjustment ratio
- [ ] Alert on suspicious patterns

---

## Firestore Index Additions

Add to `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "ticketAuditLog",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "eventId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "ticketAuditLog",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "ragerId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "ticketAuditLog",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "ticketAuditLog",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "actorId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "ticketAuditLog",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "actorId", "order": "ASCENDING" },
        { "fieldPath": "source", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## Summary

| Phase | Scope                      | Effort | Priority     |
| ----- | -------------------------- | ------ | ------------ |
| 1     | Audit trail foundation     | 2h     | **Critical** |
| 2     | Admin ticket lookup        | 3h     | High         |
| 3     | Undo last scan             | 2h     | High         |
| 4     | Full manual adjustment     | 3h     | Medium       |
| 5     | Chargeback evidence export | 2h     | Medium       |
| 6     | Reporting dashboard        | 2h     | Low          |

**Total**: ~14 hours

---

## Acquisition Readiness Checklist

After implementing this spec:

- [ ] Every ticket state change is logged (immutable)
- [ ] Manual adjustments require reason (auditable)
- [ ] Role-based access (admin vs staff)
- [ ] Time-based restrictions (can't modify old events)
- [ ] Rate limiting (can't bulk-modify)
- [ ] Chargeback evidence exportable
- [ ] No single point of failure (works without founder)
- [ ] Full history for any ticket (queryable)
- [ ] Metrics on adjustments vs scans (fraud detection)

**Due diligence response**: "Here's the complete audit trail for every ticket modification in the last 12 months, with who did it, when, and why."
