RAGESTATE web application – Next.js 14 (App Router) + Firebase (Auth, Firestore, Storage, Cloud Functions) + Stripe + Shopify integration.

This repo was originally bootstrapped with `create-next-app` and has since added:

- Firebase client + admin layers (see `firebase/` and `functions/`)
- Cloud Functions for Stripe payments, feed fanout, and email sending
- Social feed (posts, likes, comments, follows) with Firestore triggers
- Admin event creation workflow (spec in `docs/admin-create-event-spec.md`)
- Ticketing (events, ragers, ticketTokens) and scanning endpoints

---

## Getting Started (App Dev)

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open http://localhost:3000 with your browser to see the result.

Core app entry is under `src/app/`. Most shared UI lives in `components/`.

---

## Environment Variables

Create a `.env.local` (not committed). Key variables (some may already be injected in hosting):

```
PROXY_KEY=dev-proxy                # Shared secret for Next → Cloud Function proxy
STRIPE_FN_URL=http://127.0.0.1:5001/<project>/us-central1/stripePayment  # Local emulator base (optional)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=...  # If App Check / reCAPTCHA used
FIREBASE_API_KEY=...                # Standard Firebase web config vars
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
```

Functions (set via Firebase CLI / Secret Manager, not `.env.local`):

```
STRIPE_SECRET=sk_test_...
RESEND_API_KEY=...
PROXY_KEY=dev-proxy (must match)
```

---

## Firebase Emulators

Run Functions emulator (payments, feed/email triggers) in one terminal:

```bash
npm --prefix functions run serve
```

Run Next.js dev in another (optionally pointing to local function):

```bash
PROXY_KEY=dev-proxy STRIPE_FN_URL=http://127.0.0.1:5001/<project>/us-central1/stripePayment npm run dev
```

Firestore rules / indexes deploy helpers (VS Code tasks):

```bash
# Deploy rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

---

## Testing

Unit & component tests:

```bash
npm test
```

API route & integration (requires emulators):

```bash
npm run test:api:emulated
```

If Java is missing, emulator startup will fail; install a JDK (Temurin) to enable Firestore/Auth emulation.

---

## Admin – Create Event Flow

Spec: `docs/admin-create-event-spec.md`

High-level:

1. Admin visits `/admin/events/new` (gated by claim or membership in `adminUsers/{uid}`).
2. Uploads optional hero image (temporary Storage path) – preview before submit.
3. Submits form → Next API `POST /api/admin/events/create` validates via Zod, generates unique slug, writes Firestore doc (`events/{slug}`) with server timestamps.
4. Telemetry (duration, flags) written best-effort to `adminEventCreates`.
5. Draft events (`active=false`) are hidden from public listings; published events appear immediately.

Rejection codes map to validation errors (see spec section 8). Slug uniqueness guarded even under concurrency.

---

## Payments & Tickets Overview

1. Client creates Stripe PaymentIntent via Next proxy -> Cloud Function.
2. On success, finalize-order endpoint decrements event inventory and creates `ragers` subdocuments + `ticketTokens` mapping.
3. Scan endpoint (`scan-ticket`) increments usage and deactivates when exhausted.

For local curl examples, see `docs/` and `.github/copilot-instructions.md`.

---

## Social Feed Overview

Firestore triggers fan out new posts to per-user feed collections. Like/comment counters maintained server-side. See `functions/feed.js` and `docs/feed-implementation-guide.txt`.

---

## Project Scripts (selected)

```bash
npm run dev                # Next dev
npm test                   # Jest tests
npm run build              # Production build
npm --prefix functions run serve   # Functions emulator
npm run seed:feed          # Seed sample social feed content
```

---

## Contributing / Notes

- Prefer adding new server logic in Functions or Next API with admin verification.
- Keep event creation invariants in sync: if UI diverges (e.g., description optional), update server schema or align UI.
- Bundle size: admin create page currently ~20KB page chunk; shared app JS dominates first load.
- Avoid committing secrets; use Firebase secrets for server-only keys.

---

## Learn More (External)

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Standard Vercel deployment pipeline; ensure Firebase Functions deployed separately (`npm --prefix functions run deploy`).
