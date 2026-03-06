# Go/No-Go Security Audit — Guest Event Checkout Flow (Round 4)

## Objective

Perform a production-readiness review of the **guest event ticket checkout flow** end-to-end. Evaluate whether the current implementation is safe to deploy to production with real money and real customers. Deliver a **GO** or **NO-GO** verdict with supporting evidence for each item.

---

## Scope

The audit covers these files and the guest checkout path through them:

| Layer | File | Lines of Interest |
|-------|------|-------------------|
| Client: Cart page | `src/app/cart/page.js` | Guest email state, payment intent request body, `isGuest` flag, `fetchClientSecret` effect |
| Client: Checkout form | `components/CheckoutForm.js` | `tryFinalizeIfSucceeded`, guest branch (lines 92-259), Stripe `confirmPayment` |
| Client: Event add-to-cart | `components/EventDetails.js` | `handleAddToCart` (lines 80-93) — confirms `ticketType` is never sent |
| Proxy: create-payment-intent | `src/app/api/payments/create-payment-intent/route.js` | Guest validation, auth bypass for guests, proxy-key forwarding |
| Proxy: finalize-order | `src/app/api/payments/finalize-order/route.js` | Guest validation, auth bypass for guests, firebaseId mismatch check |
| Server: create-payment-intent | `functions/stripe.js` ~lines 340-582 | Rate limiting, input validation, empty-cart rejection, promo validation, server-side price verification, ticket tier lookup, PI metadata, pendingOrders write |
| Server: finalize-order | `functions/stripe.js` ~lines 952-1871 | PI retrieval + status check, guest email match, idempotency guard, ticket creation transaction, purchase doc writes, guest order index, confirmation email |
| Server: webhook handler | `functions/stripe.js` ~lines 3971-4158 | `handlePaymentSucceeded`, fulfillments idempotency, pendingOrder recovery, `fulfillOrderFromWebhook` |
| Server: webhook fulfillment | `functions/stripe.js` ~lines 4166-4490 | Ticket creation, purchase doc, guest order index — mirror of finalize-order |
| Server: rate limiting | `functions/rateLimit.js` | `CREATE_PAYMENT_INTENT_GUEST` config (5/min per IP), Firestore-backed sliding window |

---

## Audit Checklist

For each item, give a verdict: **PASS**, **FAIL** (must fix before deploy), or **WARN** (acceptable risk, document and monitor).

### A. Input Validation & Rejection Ordering

1. **Empty-cart rejection timing.** Verify the empty-cart check (`!Array.isArray(cartItems) || cartItems.length === 0`) in `create-payment-intent` runs BEFORE promo code validation (`validatePromoCodeInternal`). The previous audit (Round 3, Item 1) failed this — confirm the fix is in place.

2. **Guest email validation.** Confirm that guest email is validated with a proper regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) at all three layers: (a) Next.js proxy `create-payment-intent/route.js`, (b) Next.js proxy `finalize-order/route.js`, (c) Cloud Function `create-payment-intent`, (d) Cloud Function `finalize-order`. Report any layer that uses a weaker check or skips validation.

3. **firebaseId + isGuest mutual exclusion.** Confirm that all endpoints reject requests where `isGuest=true` AND `firebaseId` is provided. Check: proxy create-payment-intent, proxy finalize-order, CF create-payment-intent, CF finalize-order.

4. **Amount validation.** Confirm `parsedAmount` is validated as `>= 50` (cents) before any Stripe call. Check that the client also enforces a `MIN_STRIPE_AMOUNT = 50` guard.

5. **Invalid ticketType rejection.** Verify that when `item.ticketType` is provided but doesn't match any tier in `eventData.ticketTiers`, the endpoint returns 400 instead of silently falling back to `$0`. The previous audit (Round 3, Item 7) warned about this — confirm the fix is in place.

### B. Price Integrity

6. **Server-side price verification.** Confirm the server recomputes the total from Firestore event/product prices and rejects mismatches (`Math.abs(parsedAmount - expectedClientAmount) > 1`). Verify the tax rate (7.5%) is applied consistently on both client (`src/app/cart/page.js` line 225) and server (CF line 469).

7. **Promo discount double-application.** Trace the promo discount flow: (a) server validates and calculates `promoDiscountCents`, (b) it's subtracted in the price comparison (`expectedClientAmount = serverGrossCents - promoDiscountCents`), (c) it's subtracted again for `finalAmount`. Confirm the discount is applied exactly once to the Stripe PI amount and that a crafted request cannot cause `finalAmount` to go below `MIN_AMOUNT` (50 cents).

8. **Quantity manipulation.** Verify `qty = Math.max(1, parseInt(item.quantity, 10) || 1)` prevents zero or negative quantities. Check if a client could send `quantity: 999999` — is there any server-side max cap?

### C. Authentication & Authorization

9. **Guest auth bypass safety.** On the proxy layer, guests skip `verifyAuth()`. Confirm that an attacker cannot set `isGuest: true` with a valid `firebaseId` to bypass auth verification and impersonate another user.

10. **PI metadata integrity.** Confirm the finalize-order endpoint verifies that: (a) for authenticated users, `pi.metadata.firebaseId` matches the request's `firebaseId`, and (b) for guests, `pi.metadata.firebaseId` is empty AND `pi.metadata.guestEmail` matches the request's `guestEmail`.

11. **PROXY_KEY enforcement.** Confirm that both `create-payment-intent` and `finalize-order` CF endpoints check the `x-proxy-key` header against the `PROXY_KEY` secret, and that the Next.js proxies forward it.

### D. Rate Limiting & Abuse Prevention

12. **Guest rate limit config.** Confirm `CREATE_PAYMENT_INTENT_GUEST` is 5 calls per 60 seconds per IP. Evaluate: is IP-based limiting sufficient, or can an attacker rotate IPs to spam Stripe PI creation? (This may be WARN-level if Stripe's own rate limits provide a backstop.)

13. **Finalize-order rate limiting.** Check if the `finalize-order` endpoint has any rate limiting. If not, assess whether the idempotency guard (fulfillments collection) provides sufficient protection against repeated calls.

14. **Promo code brute-force.** Evaluate whether the `validate-promo-code` endpoint is rate-limited. If not, can an attacker enumerate valid promo codes by trying many codes quickly?

### E. Idempotency & Crash Recovery

15. **Double-fulfillment prevention.** Trace the idempotency flow: (a) `finalize-order` uses a Firestore transaction to atomically check+create a fulfillments doc, (b) the webhook handler checks `fulfillments` before fulfilling. Confirm there is no race condition between the client calling `finalize-order` and the webhook firing `handlePaymentSucceeded` simultaneously.

16. **Ticket stock atomicity.** Confirm the ticket decrement + rager creation happens inside a single Firestore transaction (`db.runTransaction`). Verify that if the transaction fails (e.g., insufficient stock), no ticket is created and the error is surfaced.

17. **PendingOrder cleanup.** Verify `pendingOrders` docs are deleted after successful fulfillment in both the finalize-order path and the webhook path. Check if orphaned pendingOrders (payment failed/canceled) are ever cleaned up.

### F. Data Integrity & Guest Order Records

18. **Guest purchase doc completeness.** Verify the purchase doc written to `purchases/{orderNumber}` for guest orders includes: `isGuestOrder: true`, `guestEmail`, `customerId: null`, `customerEmail`, `orderNumber`, `totalAmount`, `items`, `paymentIntentId`. Confirm no field is accidentally `undefined` (Firestore rejects `undefined`).

19. **Guest order lookup index.** Verify guest orders are indexed in `guestOrders/{emailHash}/orders/{orderNumber}` with a SHA-256 hash of the lowercased email. Confirm the hash is computed consistently (lowercase + trim before hashing).

20. **Webhook purchase doc parity.** Compare the purchase doc structure written by `finalize-order` vs `fulfillOrderFromWebhook`. Flag any fields present in one but missing in the other (the Round 3 audit noted `total` vs `totalAmount` is intentional — the webhook path only writes `totalAmount`, and `total` is a legacy field only in the customer subcollection).

### G. Stripe Integration

21. **Webhook signature verification.** Confirm the webhook endpoint verifies `stripe-signature` using `stripe.webhooks.constructEvent()` with the `STRIPE_WEBHOOK_SECRET`. Confirm `rawBody` is used (not parsed JSON).

22. **Client secret exposure.** Verify `pi.client_secret` is returned to the client but the full PI object is not. Confirm no Stripe secret key appears in client-accessible responses or logs.

23. **Receipt email for guests.** Confirm `receipt_email` on the PI is set to `guestEmail` so Stripe sends a payment receipt to the guest.

### H. Information Disclosure

24. **Error message leakage.** Review all 400/403/500 responses in the guest flow. Confirm error messages do not leak internal details (Firestore paths, stack traces, PI IDs beyond the first 20 chars). The `ticketType` rejection message includes the event productId — assess if this is acceptable.

25. **Logging PII.** Check if guest emails are logged in plaintext in `logger.info`/`logger.warn` calls. If so, flag as WARN (acceptable for operational debugging, but note for GDPR/privacy review).

---

## Verdict Format

Summarize your findings in a table:

| # | Item | Verdict | Notes |
|---|------|---------|-------|
| 1 | Empty-cart rejection timing | PASS/FAIL/WARN | ... |
| ... | ... | ... | ... |

Then provide your overall verdict:

**OVERALL: GO / NO-GO**

If NO-GO, list the FAIL items that must be fixed before deployment, with specific remediation steps.

If GO with WARNs, list the WARN items and any recommended follow-up actions (monitoring, future hardening).

---

## Context: Previous Audit History

- **Round 1:** Initial security audit. Found multiple issues including missing server-side price verification, no rate limiting, weak email validation, no idempotency guards.
- **Round 2:** Comprehensive remediation. Added server-side price verification, Firestore-backed rate limiting, proper email regex, fulfillments-based idempotency, PROXY_KEY enforcement, block scoping fix.
- **Round 3:** Re-audit of Round 2 fixes. Items 3 (Stripe key UX), 4 (admin route validation), 5 (block scoping), 6 (proxy key removal) PASSED. Item 1 (empty-cart ordering) FAILED. Item 7 (tier fallback $0) WARNED. Both have been remediated in this round.
- **Round 4 (this audit):** Full guest event checkout flow review for production go/no-go. Initial Codex pass found 3 FAILs (#7 double-discount, #14 unprotected promo endpoint, #15 webhook race condition). All 3 remediated. Re-run this audit to confirm.
