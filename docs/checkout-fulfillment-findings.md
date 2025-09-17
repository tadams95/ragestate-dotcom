# Checkout Fulfillment Findings

Date: 2025-09-16

## Summary

- Symptom: “Payment succeeded!” showed prematurely and no ticket documents were created under `events/{eventId}/ragers` after a successful Stripe checkout.
- Root causes:
  1. Client-side writes to `events/{eventId}/ragers` were blocked by Firestore rules (by design). This code has since been removed from the client.
  2. The server `finalize-order` function originally filtered items by `eventDetails`, so some carts weren’t processed as tickets.
  3. The idempotency guard in `finalize-order` short-circuits fulfillment if a `fulfillments/{paymentIntentId}` doc already exists (regardless of status). If a prior attempt created the doc but failed before creating tickets, subsequent attempts were skipped, leaving tickets uncreated.

## Current Flow (as of this report)

1. Cart page calls `POST /api/payments/create-payment-intent` (Next.js proxy) → Cloud Function `stripePayment/create-payment-intent` → returns `client_secret`.
2. `CheckoutForm` calls `stripe.confirmPayment(...)` with `redirect: 'if_required'`.
3. On `paymentIntent.status === 'succeeded'`, the client calls `POST /api/payments/finalize-order` with `{ paymentIntentId, firebaseId, userEmail, userName, cartItems }`.
4. Cloud Function `stripePayment/finalize-order` (Admin SDK):
   - Verifies the PaymentIntent has `status: succeeded` and belongs to the user.
   - Idempotency guard at `fulfillments/{paymentIntentId}` created with `status: processing`.
   - For each cart item, treats `item.productId` as an `events/{docId}` candidate. In a Firestore transaction: decrements `events/{docId}.quantity` and writes a rager document under `events/{docId}/ragers`.
   - Updates `fulfillments/{paymentIntentId}` to `status: completed` with details.
5. Client calls `SaveToFirestore` to record the purchase in `purchases/{orderNumber}` and `customers/{uid}/purchases/{orderNumber}`. (No longer attempts to write ragers.)

## Firestore Rules Snapshot

- `match /events/{eventId}/ragers/{ragerId}` → `allow create, delete: if false` (clients cannot create or delete ragers; intended for backend only).
- The Admin SDK in Cloud Functions bypasses security rules, so server writes to `events/{eventId}/ragers` are allowed.

## Evidence & Observations

- Earlier console logs showed client attempts to update `events/{eventId}.quantity` and add to `ragers` failed with `FirebaseError: Missing or insufficient permissions.` This aligns with the restrictive ragers rules and confirms why client-created tickets failed.
- The server function previously filtered to `items.filter((it) => it && it.eventDetails)`. If the cart item lacked `eventDetails`, tickets were not created. This has been corrected to evaluate any item whose `productId` matches an `events/{docId}`.
- Idempotency edge case: If `fulfillments/{paymentIntentId}` was created (status `processing`) during a failed attempt (e.g., before the loop or prior code path), all subsequent attempts exit early as “Already fulfilled” even though no tickets were created.

## Likely Reason Tickets Still Aren’t Appearing

- One or both of these scenarios are in play:
  1. A previous run created `fulfillments/{paymentIntentId}` (status `processing` or without tickets) causing subsequent runs to no-op due to the idempotency guard.
  2. The `productId` in the cart item does not exactly match the Firestore `events/{docId}`. In this app, `productId` is set to the event’s name (e.g., "Faux Fur House Show"). If an event was renamed or casing/spacing differs from the doc ID, the function will log “Event X not found” and skip creating ragers for that item.

## Recommendations

1. Idempotency Fix
   - Update the `finalize-order` guard to only short-circuit if `fulfillments/{paymentIntentId}.status === 'completed'`.
   - If the doc exists with `status !== 'completed'` (e.g., `processing`, missing, or `failed`), allow fulfillment to proceed and update status accordingly.
   - Optionally add an `attempts` counter and a monotonic `updatedAt` to handle retries safely.

2. Event Detection Hardening
   - Already addressed by processing all items and checking for `events/{productId}` existence in the transaction.
   - Consider adding a fallback key (e.g., `eventId`) if you ever change how `productId` is formed, or store the canonical event doc ID on the cart item at add-to-cart time.

3. Operational Cleanup
   - For PaymentIntents stuck with `fulfillments/{paymentIntentId}` in non-completed state, either:
     - Manually delete the stuck fulfillment doc to allow re-run, or
     - After implementing the idempotency fix, re-trigger `finalize-order` using the known `paymentIntentId`.

4. Telemetry & Validation
   - Keep the added logs in both the client (finalize request/response) and server (received items, per-item processing, completion). These help confirm whether `finalize-order` executes and how many tickets were created.
   - Consider returning the created rager IDs and event IDs to the client for post-purchase UX or auditing.

5. Architecture Hardening (Optional Next Steps)
   - Move purchase recording (currently in `SaveToFirestore`) into `finalize-order` so fulfillment and purchase logging happen atomically on the server.
   - Add a Stripe webhook for `payment_intent.succeeded` that reuses the same idempotent fulfillment logic as a failsafe if the client never calls `finalize-order`.

## Quick Verification Checklist

- After a test purchase:
  - Check browser console: `Finalize order success: { createdTickets: N, details: [...] }`.
  - In Firestore: `fulfillments/{paymentIntentId}` has `status: completed` and `createdTickets > 0`.
  - In Firestore: `events/{EventName}/ragers/{autoId}` exists with `firebaseId`, `email`, `ticketQuantity`, and `paymentIntentId`.

## Action Items

- Implement the idempotency guard change in `functions/stripe.js`.
- For any past failed intents, clear or update stuck `fulfillments` docs and re-run `finalize-order`.
- Optionally, consolidate purchase logging into the server function and add the webhook backup.
