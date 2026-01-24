RAGESTATE web application – Next.js 14 (App Router) + Firebase (Auth, Firestore, Storage, Cloud Functions) + Stripe + Shopify integration.

**RAGESTATE** is a social platform for the electronic music community, featuring social feeds, events/ticketing, merchandise, real-time chat, and an admin dashboard.

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│  Firebase       │────▶│  External APIs  │
│   (Vercel)      │     │  (Auth/DB/Fn)   │     │  (Stripe/etc)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14 (App Router) | Server-rendered React app |
| Styling | Tailwind CSS + CSS Variables | Themeable UI system |
| State | Redux Toolkit | Global client state |
| Auth | Firebase Authentication | User identity |
| Database | Cloud Firestore | Real-time document DB |
| Storage | Firebase Storage | Media files |
| Functions | Firebase Cloud Functions | Server-side logic |
| Payments | Stripe | Payment processing |
| Commerce | Shopify (API) | Merchandise fulfillment |
| Analytics | Vercel Analytics + Speed Insights | Performance monitoring |

**Full documentation**: See `docs/ARCHITECTURE.md` for detailed system diagrams.

---

## Key Features

- **Social Feed**: Posts, likes, comments, follows with real-time updates
- **Events & Ticketing**: Event creation, ticket purchases, QR code scanning
- **E-commerce**: Merchandise shop with Shopify/Printify fulfillment
- **Chat/Messaging**: Real-time direct messages with moderation
- **Admin Dashboard**: Event management, metrics, user moderation
- **Push Notifications**: FCM-based notifications for engagement

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

### Firebase Admin Service Account (Server Token Verification)

Server‑side admin routes (e.g. `/api/admin/events/*`) need Firebase Admin credentials to read privileged collections (`adminUsers`) and manage custom claims. Provide exactly one of these in your hosting provider environment settings:

| Method    | Env Var                         | Notes                                                       |
| --------- | ------------------------------- | ----------------------------------------------------------- |
| Base64    | `FIREBASE_SERVICE_ACCOUNT_B64`  | Recommended. Value is base64 of full JSON contents.         |
| Raw JSON  | `FIREBASE_SERVICE_ACCOUNT`      | Must be a single-line JSON string; escaping can be fragile. |
| File Path | `FIREBASE_SERVICE_ACCOUNT_FILE` | Absolute path to a mounted/readable JSON key file.          |

Steps (Base64 method):

```bash
# Generate service account key in Firebase Console (Project Settings → Service Accounts)
# Save it as .secrets/service-account.json (already gitignored)
base64 -i .secrets/service-account.json | tr -d '\n' > .secrets/service-account.b64
pbcopy < .secrets/service-account.b64   # paste value into hosting env var FIREBASE_SERVICE_ACCOUNT_B64
```

Redeploy, then visit `/admin/events/debug-auth-test` and confirm:

```
server.hasServiceAccount: true
adminSources.adminUsersDoc: true
isAdmin: true
```

Optional redundancy (custom claim): after credentials are live run:

```bash
node scripts/grantAdminClaim.js <uid>
```

User must sign out/in (or refresh token) to receive the claim.

Remove `src/app/admin/events/debug-auth-test/page.jsx` after verification.

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

## Contributing

### Development Workflow
1. Create a feature branch from `main`
2. Make changes following code conventions below
3. Run `npm run lint` and fix any errors
4. Run `npm run build` to verify no build errors
5. Submit a pull request with clear description

### Code Conventions
- **JavaScript with JSDoc**: Use JSDoc type annotations instead of TypeScript
- **CSS Variables**: Use `var(--*)` for colors, not hardcoded values
- **Components**: Export with `memo()` for performance
- **Hooks**: Follow React hooks best practices, return cleanup functions

### File Organization
```
src/app/           # Next.js App Router pages and components
lib/               # Shared utilities, hooks, Redux slices
firebase/          # Firebase configuration and context
functions/         # Cloud Functions (deploy separately)
```

### Guidelines
- Prefer adding server logic in Cloud Functions or Next API routes
- Keep UI and server validation in sync
- Use `limit()` on Firestore queries to control costs
- Never commit secrets; use Firebase Secret Manager

### Code Review Checklist
- [ ] No ESLint errors (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] No console.log statements in production code
- [ ] Sensitive data protected by Firestore rules
- [ ] New features documented in relevant docs

---

## Learn More (External)

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Standard Vercel deployment pipeline; ensure Firebase Functions deployed separately (`npm --prefix functions run deploy`).

For detailed deployment procedures, see `docs/DEPLOYMENT-RUNBOOK.md`.

---

## Documentation

| Document | Description |
|----------|-------------|
| `docs/ARCHITECTURE.md` | System architecture and data flow diagrams |
| `docs/DATABASE-SCHEMA.md` | Firestore collections and field documentation |
| `docs/DEPLOYMENT-RUNBOOK.md` | Step-by-step deployment procedures |
| `docs/MONITORING.md` | Monitoring setup and key metrics |
| `docs/TROUBLESHOOTING.md` | Common issues and solutions |
| `docs/SECURITY-AUDIT-REPORT.md` | Security assessment findings |

---

## License

This project is proprietary software. All rights reserved.

Unauthorized copying, modification, distribution, or use of this software is strictly prohibited without explicit written permission from the copyright holder.

For licensing inquiries, contact the project owner.
