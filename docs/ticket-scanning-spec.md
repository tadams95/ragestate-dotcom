# Ticket Scanning Spec (Minimal, Production-Ready Draft)

Goal: Enable staff to scan a ticket QR and mark a ticket as used (decrement remaining uses or fully inactivate) with minimal changes to the current model and no breaking changes to the app.

## Scope

- Encode a per-rager ticket token in a QR code.
- Admin/staff scan the QR and submit it to a secure endpoint.
- Server validates and atomically marks usage, respecting `ticketQuantity`.
- Works for tickets purchased at different times or transferred/received; we key off the rager doc.

## Current Data Model (ragers)

- Path: `events/{eventId}/ragers/{ragerId}`
- Fields (existing):
  - `active: boolean` — true when ticket is valid
  - `firebaseId: string` — user id owning the ticket
  - `orderNumber: string`
  - `paymentIntentId: string`
  - `purchaseDate: Timestamp`
  - `ticketQuantity: number` — number of entries associated with this rager

## Minimal Additions (no breaking changes)

- `ticketToken: string` — randomly generated opaque token (e.g., 24–32 char hex). Used in QR payload.
- `usedCount: number` — default 0; increment on each successful scan.
- `lastScanAt: Timestamp` — last successful scan time (server timestamp).
- `lastScannedBy: string` — identifier or email for the staff scanner (best-effort; optional).
- `scanLog: array` (optional/minimal) — append-only log of last N scans, items like `{ at: Timestamp, by: string }` (keep small to avoid doc bloat; not required for MVP).

Note: Keep `active` semantics: `active = usedCount < ticketQuantity`. On scan, if `usedCount + 1 >= ticketQuantity`, set `active = false`.

## QR Payload Format

Encode a compact string (no PII):

```
rtk:<token>
```

Where `<token>` = the `ticketToken` stored on the rager doc. This is opaque and unpredictable; we will look up by token server-side.

Alternative (URL form) if desired for scanner UX:

```
https://ragestate.com/ticket?tk=<token>
```

Both forms carry the same token value; the scanner app extracts `tk` (or the suffix of `rtk:`) and POSTs to the server.

## Server Endpoint (Functions v2, Express)

- Route (under existing HTTPS service): `POST /scan-ticket`
- Auth: use existing `x-proxy-key` gate (same as other admin/test endpoints). Optionally add Firebase Auth admin claim verification later.
- Body JSON:
  - `token: string` — required; the QR token
  - `scannerId?: string` — optional identifier for staff device/user

- Response 200 JSON:
  - `ok: true`
  - `eventId: string`
  - `ragerId: string`
  - `remaining: number` — `ticketQuantity - usedCount` after scan
  - `status: 'active' | 'inactive'`
  - `message?: string`

- Errors:
  - 404 when token not found
  - 409 when ticket already fully used/inactive
  - 400 for malformed input
  - 403 for missing/invalid proxy key

### Transactional Logic

1. Lookup rager via collection group query: `collectionGroup('ragers').where('ticketToken','==', token).limit(1)`.
2. In a Firestore transaction:
   - Read the rager doc and its `ticketQuantity`, `usedCount` (default 0), and `active`.
   - If `active === false` or `usedCount >= ticketQuantity`, abort with 409.
   - Increment `usedCount` by 1; set `lastScanAt` to `serverTimestamp()`; set `lastScannedBy` if provided.
   - If `usedCount + 1 >= ticketQuantity`, set `active = false`.
3. Return remaining = `ticketQuantity - updatedUsedCount`.

Idempotency: If the scanner retries immediately, a second call will either succeed (if quantity allows) or return 409 once the quantity is exhausted. If we need strict idempotency, add an optional `scanId` and store `lastScanId` to ignore duplicates — not required for MVP.

## Token Generation

- When creating ragers in `finalize-order` (already happening in `functions/stripe.js`):
  - Generate `ticketToken` via crypto-random (e.g., 16 bytes hex) per rager document.
  - Persist `ticketToken` alongside existing fields (`ticketQuantity`, `orderNumber`, etc.).
  - For existing ragers without a token, provide a one-time backfill script or generate on first scan attempt (graceful generation + retry).

## Admin Scanner UX (MVP)

- A minimal web page (staff-only) with camera scanning (e.g., `@zxing/library` or `qr-scanner`) that:
  - Reads QR → extracts token
  - POSTs to `/scan-ticket` with `x-proxy-key`
  - Shows status: success with remaining count; or already used/invalid
  - Optional: a manual token input fallback

Permissions:

- MVP: protected by `x-proxy-key` only (already in use).
- Next: add Firebase Auth with `isStaff` custom claim and/or App Check for the scanner app origin.

## Security Considerations

- Token should be opaque and sufficiently random; not guessable.
- No PII in QR data.
- Limit scan rate per IP/device (future enhancement); log scans server-side.
- Rotate `x-proxy-key` periodically; keep the scanner app key in secure storage.

## Edge Cases

- Token not found → 404
- Ticket inactive or fully used → 409 with remaining = 0
- Multi-quantity tickets → each scan reduces remaining by 1; last scan flips `active=false`
- Transfer scenarios (future): if tickets can be transferred, the rager remains the unit; token does not change unless explicitly reset.

## Compatibility With Current Data

Your current shape under `events/{eventId}/ragers` includes both:

- Multiple rager docs for the same `firebaseId` (e.g., user purchased at different times)
- A single rager doc with `ticketQuantity > 1`

This spec supports both simultaneously:

- Each rager doc has its own `ticketToken`, `usedCount`, and `ticketQuantity`.
- If a user has multiple rager docs, each doc is independently scannable using its own token; scanning one does not affect the others.
- If a rager doc has `ticketQuantity > 1`, repeated scans on the same token decrement `usedCount` until `active=false`.

Optional event gating: The scan response includes `eventId`. If you want to enforce that scans are only valid for a specific event gate, the scanner can submit `eventId` and the server can verify that the rager’s parent matches; otherwise, the server returns 409.

Index note: The lookup uses a collection group equality filter `where('ticketToken','==', token)`. This typically does not require a composite index; if Firestore prompts for one, follow the link to create it once.

## Optional Enhancements (later)

- Per-ticket docs instead of `ticketQuantity` on a single doc (ragers/{ragerId}/tickets/{ticketId}).
- Signed tokens (HMAC) to avoid token lookups; trade-off is key management and QR size.
- Staff dashboard with event filter, scan history, and revoke/restore controls.
- Add `locationId` or `gateId` to the scanner to track entry point.

## Rollout Plan

1. Add fields to rager creation in `finalize-order`: `ticketToken`, `usedCount=0`.
2. Implement `POST /scan-ticket` on the existing `stripePayment` Express app; gate with `x-proxy-key`.
3. Create a minimal scanner web page (internal) that uses camera → token → POST.
4. Backfill tokens for existing ragers (script) or generate on first scan.
5. Pilot at an event; monitor logs and adjust rate limits if needed.
