# RAGESTATE Codebase AI Guide

## Overview

- Next.js 14 (app/ router) + Firebase client SDKs (Firestore, RTDB, Storage) in `firebase/` and `src/`.
- Backend runs Firebase Functions v2. HTTP is an Express app exported as `stripePayment` in `functions/stripe.js`; Firestore triggers live in `functions/{email,feed}.js` and are re-exported by `functions/index.js`.
- Payments are proxied through Next API routes in `src/app/api/payments/*` to the Cloud Function, gated by `x-proxy-key`.

## Directory Guide

- `src/app/`: UI routes and API routes (`src/app/api/payments/*` proxies to Functions).
- `components/`: Shared UI components (tickets, cart, modals, etc.).
- `firebase/`: Client init (`firebase.js`), React context, and util helpers.
- `functions/`: Cloud Functions — `stripe.js` (Express HTTP), `feed.js`, `email.js`, `index.js` (re-exports), `admin.js` (bootstrap).
- `docs/`: Working notes/specs (payments flow, scanning, feed).
- `scripts/`: Seed and migration utilities (e.g., `seedFeed.cjs`).
- `lib/`: App logic (hooks, store, features).
- `shopify/`: Shopify client integration.
- `firestore.rules` / `firestore.indexes.json`: Security rules and indexes.
- `public/`: Static assets and media.

## Data Model (Firestore)

- `events/{eventId}` with subcollection `ragers/{ragerId}` (tickets): fields include `firebaseId`, `ticketQuantity`, `usedCount`, `active`, `ticketToken`.
- `ticketTokens/{token}` maps a token → `{ eventId, ragerId }` for O(1) scans.
- `fulfillments/{paymentIntentId}` is the order ledger. Status moves to `completed`, which triggers a purchase email (Resend) in `functions/email.js`.
- `customers/{uid}` stores `{ stripeCustomerId, email, name }` and mirrors to RTDB at `users/{uid}/stripeCustomerId` (best-effort).
- Social: `posts`, `postLikes`, `postComments`, `follows`, and per-user `userFeeds/{uid}/feedItems/{postId}` fanout.
- Indexes: see `firestore.indexes.json` (notably collection group index on `ragers` and field override for `ragers.ticketToken`). Rules are in `firestore.rules` (admin via custom claim or `adminUsers/{uid}`).

## Dev Workflows

- App: `npm run dev` (Next), tests: `npm test` (Jest). Build: `npm run build`.
- Functions: local `npm --prefix functions run serve` (emulator). Deploy: `npm --prefix functions run deploy`.
- Firestore: VS Code tasks exist — `Deploy Firestore Rules` and `Deploy Firestore Indexes`.
- Seed sample feed data: `npm run seed:feed`.

## Social Feed

- Triggers: see `functions/feed.js` for like/comment counters and fan-out to `userFeeds/{uid}/feedItems/{postId}`.
- Rate limiting: `onPostCreated` deletes posts if an author exceeds a small windowed limit (avoid fan-out overload).
- Cleanup: deleting a post removes likes/comments, user feed items, and Storage files under `posts/{postId}/`.
- Client rules: immutable fields (counters, timestamps, ownership) enforced in `firestore.rules` under `posts/*`.

## Payments → Tickets Flow

- Create PI: Next POST `POST /api/payments/create-payment-intent` → proxies to `.../stripePayment/create-payment-intent` (supports `x-idempotency-key`).
- Create/Reuse Customer: `POST /api/payments/create-customer` → `.../stripePayment/create-customer`. Writes/reads `customers/{uid}` when `uid` provided.
- Finalize Order: `POST /api/payments/finalize-order` with `{ paymentIntentId, firebaseId, userEmail, userName, cartItems }`.
  - Validates PI `succeeded`; idempotency via `fulfillments/{pi.id}` transaction.
  - For each cart item: decrement `events/{id}.quantity`; create `ragers` with `ticketToken`; upsert `ticketTokens/{token}`. Marks fulfillment `completed` (email trigger).
- Scan Ticket: `POST .../stripePayment/scan-ticket` with `{ token }` (preferred) or `{ userId, eventId }`.
  - Atomic transaction increments `usedCount`, flips `active` when fully used; returns `remaining`.

## Environment & Secrets

- Next env: `PROXY_KEY` (forwarded in headers), `STRIPE_FN_URL` or `NEXT_PUBLIC_STRIPE_FN_URL` (override function base), `STRIPE_FN_REGION` (default `us-central1`), Firebase public config vars (see `firebase/firebase.js`).
- Functions secrets: `STRIPE_SECRET`, `RESEND_API_KEY`, `PROXY_KEY` via Secret Manager (`defineSecret`). No secret → Stripe endpoints return 503.
- Local emulator: set `STRIPE_FN_URL=http://127.0.0.1:5001/<project>/us-central1/stripePayment` so Next proxies locally.

## Security & Rules

- Admin: prefer custom claim `token.admin == true` or membership in `adminUsers/{uid}`; front-end has RTDB fallbacks (`users/{uid}.isAdmin`).
- Tickets: clients cannot create/delete `events/{eventId}/ragers/*`; updates are restricted to the owner and cannot add new fields.
- Usernames: `usernames/{usernameLower}` are write-once (create if free, no updates). Renames via admin only.
- Feed: only authors can create/update/delete their posts; client cannot modify counters or timestamps.
- Purchases: users can create their own purchases; only admins can update/delete.

## Conventions & Gotchas

- Do NOT create/update `events/{id}/ragers` from clients; only via `finalize-order`. Scans must go through `/scan-ticket`.
- Maintain idempotency by using PaymentIntent IDs as fulfillment doc IDs. Prefer transactions when touching inventory and ragers.
- When scanning by user, require `eventId` to avoid broad collection-group scans; token-based scans use `ticketTokens` map.
- Admin checks: front-end has fallbacks, but Firestore rules prefer a custom claim `token.admin` or `adminUsers/{uid}`.

## Local Dev Recipes

```bash
# terminal 1 (functions emulator)
export PROXY_KEY=dev-proxy
export STRIPE_SECRET=sk_test_...
npm --prefix functions run serve

# terminal 2 (Next dev -> proxies to emulator)
PROXY_KEY=$PROXY_KEY \
STRIPE_FN_URL=http://127.0.0.1:5001/ragestate-app/us-central1/stripePayment \
npm run dev

# health
curl -s http://127.0.0.1:5001/ragestate-app/us-central1/stripePayment/health | jq

# create PI
curl -s -X POST http://localhost:3000/api/payments/create-payment-intent \
  -H 'Content-Type: application/json' \
  -d '{"amount":1500,"currency":"usd","firebaseId":"UID123","cartItems":[{"productId":"EVENT123","quantity":2}]}'

# finalize order
curl -s -X POST http://localhost:3000/api/payments/finalize-order \
  -H 'Content-Type: application/json' \
  -d '{"paymentIntentId":"pi_123","firebaseId":"UID123","userEmail":"u@example.com","userName":"User","cartItems":[{"productId":"EVENT123","quantity":2}]}'

# scan by token
curl -s -X POST http://127.0.0.1:5001/ragestate-app/us-central1/stripePayment/scan-ticket \
  -H "x-proxy-key: $PROXY_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"token":"<ticketToken>"}'

# scan by user + event
curl -s -X POST http://127.0.0.1:5001/ragestate-app/us-central1/stripePayment/scan-ticket \
  -H "x-proxy-key: $PROXY_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"userId":"UID123","eventId":"EVENT123"}'

# backfill ticket tokens for an event (admin)
curl -s -X POST http://127.0.0.1:5001/ragestate-app/us-central1/stripePayment/backfill-ticket-tokens \
  -H "x-proxy-key: $PROXY_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"eventId":"EVENT123","dryRun":false}'

# trigger test purchase email (admin)
curl -s -X POST http://127.0.0.1:5001/ragestate-app/us-central1/stripePayment/test-send-purchase-email \
  -H "x-proxy-key: $PROXY_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"email":"u@example.com","items":[{"title":"Test Ticket","quantity":1}]}'
```

## Troubleshooting

- 503 Stripe disabled: set `STRIPE_SECRET` for Functions/emulator.
- 403 Forbidden: missing/invalid `x-proxy-key` between Next API and Functions.
- 409 Payment not in succeeded state: wait for PI to succeed before `finalize-order`.
- Wrong event for ticket: pass the matching `eventId` or scan with `token`.
- Email not sent: ensure `RESEND_API_KEY` is configured; `functions/email.js` triggers when fulfillment `status` becomes `completed`.

## Testing

- Run tests with `npm test`. Jest setup at `jest.setup.js`; example tests in `components/__tests__/`.
- Prefer testing HTTP routes via Next API layer; callable `createStripeCustomer` requires App Check and verified email.

## Agent Wishlist (nice-to-haves)

- `.env.local.example` documenting required Next envs and example Function secrets.
- VS Code tasks to run Functions emulator and Next dev together (e.g., `dev:all`).
- HTTP request samples (`.http` or cURL collection) for all Function endpoints.
- Seed fixtures for events/ragers to test scanning flow locally.
- Brief architecture diagram of payments→fulfillment→email→scan data flow.

## Example (local PI → finalize)

```bash
# terminal 1 (functions emulator)
npm --prefix functions run serve

# terminal 2 (next dev)
PROXY_KEY=dev-proxy STRIPE_FN_URL=http://127.0.0.1:5001/ragestate-app/us-central1/stripePayment npm run dev

# create PI
curl -s -X POST http://localhost:3000/api/payments/create-payment-intent \
  -H 'Content-Type: application/json' \
  -d '{"amount":1500,"currency":"usd","firebaseId":"UID123","cartItems":[{"productId":"EVENT123","quantity":2}]}'
```
