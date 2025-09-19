# Flow Hardening Plan and Implementation

## Scope

This document captures the reliability and security hardening we’ve implemented (and still plan) across the critical flows powering checkout → fulfillment → ticket scanning, along with actionable next steps, operational runbooks, testing guidance, and rollout notes.

## Architecture Recap (Current)

- Next.js 14 (App Router) for UI and Next API routes.
- Firebase: Firestore (primary DB), RTDB (fallback signals), Storage (media), Functions v2.
- Functions gateway: Express app exported as `stripePayment` (HTTP). Next API routes proxy to it via `x-proxy-key`.
- Stripe for payments. Resend for transactional email.
- Core collections:
  - `events/{eventId}` with subcollection `ragers/{ragerId}` (per-user ticket batches) and `quantity` inventory on the event.
  - `ticketTokens/{token}` mapping → `{ eventId, ragerId }` for O(1) scans.
  - `fulfillments/{paymentIntentId}` idempotent ledger of orders.
  - `customers/{uid}` + RTDB `users/{uid}/stripeCustomerId` (best-effort mirror).
  - Social: `posts`, `postLikes`, `postComments`, `follows`, fanout to `userFeeds/{uid}/feedItems/{postId}`.

## What We Implemented

1. UserId‑First Scanning Model

- Problem: When a user holds multiple ragers for the same event, choosing which batch to consume during a scan was ambiguous.
- Solution: Deterministic selection during `scan-ticket` by `userId`:
  - Choose the rager with the highest remaining tickets; tie-breaker by earliest `purchaseDate`, then by doc ID.
  - Response now includes per-rager remaining for the consumed batch and `remainingTotal` across all of the user’s ragers for that event.

2. Event-User Summaries

- New aggregate at `eventUsers/{eventId}/users/{uid}`:
  - Tracks `totalTickets` and `usedCount` for fast lookups and UI.
  - Updated transactionally on purchase (finalize/manual) and on scan.

3. Preview Endpoint for Door Staff

- New `POST /scan-ticket/preview` (no mutation):
  - Input: `{ userId, eventId }`.
  - Output: list of the user’s `ragers` with `remaining`, aggregate `remainingTotal`, and the deterministic `nextCandidate` (the one that would be consumed if scanning now).

4. Checkout and Manual Ticket Creation Updates

- `finalize-order` now also updates `eventUsers` summary during fulfillment.
- `manual-create-ticket` (admin) does the same in its transaction.

5. Scan by Token Path Consistency

- Token scans still go through the O(1) token map but now also update the `eventUsers` summary in the same transaction.

## Data Model Changes

- Added collection: `eventUsers/{eventId}/users/{uid}` with fields:
  - `totalTickets: number` — total granted tickets for this user for the event
  - `usedCount: number` — total consumed via scans
  - Optional: `updatedAt: Timestamp` for audits (can be added without schema changes)
- No destructive migrations required. Summaries are updated best-effort moving forward and can be backfilled on demand.

## API Changes

- `POST /scan-ticket` (userId path)
  - Deterministic rager selection and response includes `remainingTotal`.
- `POST /scan-ticket` (token path)
  - Unchanged inputs; now also updates `eventUsers` summary.
- New: `POST /scan-ticket/preview`
  - No side effects; returns `{ items, remainingTotal, nextCandidate }`.

## Security & Access Controls

- All Next → Functions calls require `x-proxy-key`.
- Firestore rules prohibit client creation/deletion under `events/{id}/ragers`; updates are restricted to owners and cannot add fields.
- Admin operations: prefer custom claim `token.admin == true` or membership `adminUsers/{uid}`.
- Username rules remain write-once (`usernames/{usernameLower}`) with create-only from clients.

## Failure Modes & Mitigations

- PaymentIntent not in `succeeded` state during finalize:
  - Mitigation: Return 409; idempotent `fulfillments/{pi.id}` prevents dupes.
- Partial updates (inventory decremented but ragers not created):
  - Mitigation: Wrap inventory decrement + rager creation + summary update in one Firestore transaction per cart item.
- Scanning race conditions (double scans):
  - Mitigation: Use Firestore transactions when incrementing `usedCount` and flipping `active` when fully used.
- Missing `ticketTokens` for legacy ragers:
  - Mitigation: Admin backfill route (`backfill-ticket-tokens`) and preview to verify.
- Event-user summary drift (numbers don’t match ragers):
  - Mitigation: Summaries updated inside the same transactions; add periodic reconcile job (see Runbooks).

## Operations Runbooks

- Preview a user before scanning

```bash
# via Functions gateway (emulator example)
curl -s -X POST "$STRIPE_FN_URL/scan-ticket/preview" \
  -H "x-proxy-key: $PROXY_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"userId":"UID123","eventId":"EVENT123"}' | jq
```

- Scan by userId

```bash
curl -s -X POST "$STRIPE_FN_URL/scan-ticket" \
  -H "x-proxy-key: $PROXY_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"userId":"UID123","eventId":"EVENT123"}' | jq
```

- Scan by token (preferred for QR)

```bash
curl -s -X POST "$STRIPE_FN_URL/scan-ticket" \
  -H "x-proxy-key: $PROXY_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"token":"<ticketToken>"}' | jq
```

- Reconcile eventUsers summaries (proposed procedure)
  1. For an `eventId`, read all `ragers` for each `uid`; compute `totalTickets = sum(ticketQuantity)`, `usedCount = sum(usedCount)`.
  2. Compare with `eventUsers/{eventId}/users/{uid}`; upsert diffs in batches (transaction per user to avoid contention).
  3. Log adjustments to a `reconciliations/{eventId}/runs/{runId}` doc for audit.

Example

```bash
curl -s -X POST "$STRIPE_FN_URL/reconcile-event-users" \
  -H "x-proxy-key: $PROXY_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"eventId":"EVENT123","dryRun":true}' | jq
```

- Resend receipt (proposed)
  - Add an admin route that composes and sends a purchase email from a provided `fulfillmentId` or PI.

- Inventory drift check (proposed)
  - Compare `events/{id}.quantity + sum(ragers.ticketQuantity)` against seeded inventory; alert on mismatch.

## Testing Strategy

- Unit tests:
  - Deterministic selection: construct multiple ragers and assert winner ordering (highest remaining → earliest purchaseDate → lexicographic ID).
  - Summary updates: finalize-order and manual-create-ticket increment totals; scans increment usedCount; verify remainingTotal math.
- Integration (emulator):
  - Seed an event with inventory; create multiple cart items; finalize order; call preview and scan; assert consistent summary and rager states.
  - Token and userId paths produce equivalent end-state when scanning a single ticket.
- Negative tests:
  - Scan with no remaining tickets → 409/422 depending on semantics; ensure no summary changes.
  - Invalid proxy key → 403.

Quick local recipe

```bash
# terminal 1 (functions emulator)
export PROXY_KEY=dev-proxy
export STRIPE_SECRET=sk_test_xxx
npm --prefix functions run serve

# terminal 2 (next dev; proxies to emulator)
PROXY_KEY=$PROXY_KEY \
STRIPE_FN_URL=http://127.0.0.1:5001/ragestate-app/us-central1/stripePayment \
npm run dev
```

## Monitoring & Alerting

- Log key transitions: finalize-order successes/failures; scan accept/deny; preview stats.
- Export metrics (count of scans, denials, average remainingTotal at entry) to a dashboard.
- Alerts: sustained 5xx on finalize-order; spike in scan denials; reconcile drift found.

## Performance Notes

- UserId scans now avoid broad collection-group scans by constraining to `eventId` and user.
- Summaries avoid repeated aggregation in hot paths; deterministic selection reduces extra reads.
- Prefer indexed queries per `firestore.indexes.json` for `ragers` and any `eventUsers` lookups.

## Rollout Plan

1. Deploy Functions (done).
2. Wire scanner UI to call `/scan-ticket/preview` and show `remainingTotal` and `nextCandidate` before consuming. (done)
3. Add admin-only reconcile script/endpoint and schedule a periodic audit. (endpoint done)
4. Monitor for anomalies; expand tests as needed.

## Next Improvements (Recommended)

- Ticket transfer endpoint with proper ownership checks and token regeneration.
- Resend receipt and customer self-service email retrieval.
- Reconcile endpoint + scheduled job.
- Username polish: reserved words, profanity filter, throttled attempts.
- VS Code tasks: `dev:all` to run emulator and Next together.
- .env.local.example for required envs with local emulator tips.

## Acceptance Criteria

- Deterministic userId scan selection validated via tests.
- `eventUsers` summaries accurately reflect purchases and scans.
- Preview endpoint returns correct `remainingTotal` and `nextCandidate` without mutation.
- No regressions to token-based scans; inventory decrements remain transactional with rager creation.

## Troubleshooting

- Firestore transaction error: "Transactions require all reads before all writes"
  - Symptom: finalize-order or scans log warnings with this message during purchase or entry.
  - Cause: reading a document (e.g., `eventUsers` summary) after writes have occurred in the same transaction.
  - Resolution: avoid reads inside transactions when not strictly required. Use `FieldValue.increment(...)` to update counters atomically without a read. We updated finalize-order, manual-create-ticket, and scan-ticket to use increments and removed post-write reads.
