# RAGESTATE Bot Prevention & Mitigation Plan

This document proposes a layered strategy to prevent, detect, and mitigate bots and automated abuse on RAGESTATE. It combines client friction, server-side validation, security rules, behavioral analysis, and automated enforcement. The goal is to protect quality, reduce moderation burden, and maintain UX for legitimate users.

## Objectives

- Minimize automated account creation, spam posting, link drops, and follow/favorite spam
- Reduce abuse at the perimeter without degrading UX for good users
- Detect sophisticated bots via behavior, graph, and content signals
- Enable swift mitigation (rate limits, challenges, shadow bans) and clear admin workflows

## Threat Model (Top Risks)

- Signup spam: disposable email signups, scripted flows, credential-stuffing
- Content spam: high-velocity posts/comments with links, mentions, keyword cloaking
- Growth hacking: follow/unfollow churn, mass-likes, engagement pods
- SEO/link abuse: URL drops, shorteners, tracking params, malicious domains
- Scraping & automation: headless browsers, token replay, device rotation, Tor/VPN farms
- Impersonation: spoofed display names/usernames to mislead

## Architecture Context

- Frontend: Next.js App Router, React 18, Tailwind
- Backend: Firebase (Auth, Firestore, Storage, RTDB, Cloud Functions)
- Data: posts, postComments, follows, profiles, usernames
- Public profile surfaces, composer, comments, hybrid feed

## Signup Flow Alignment (Current State → Improvements)

This aligns protections with our current create account flow in `src/app/create-account/page.js` and `lib/utils/auth.js`:

- Current flow:
  - Uses `createUserWithEmailAndPassword` (Firebase Auth), then immediately writes a full user record to Firestore (`customers/{uid}`) and RTDB (`users/{uid}`).
  - Calls an HTTPS Function at `stripePayment` using `POST /create-customer` to create a Stripe customer. Note: `functions/stripe.js` currently exposes `/health` and `/create-payment-intent` but not `/create-customer`.
  - Stores tokens in `localStorage` and routes to `/account` without gating on `emailVerified`.
- Risks in current flow:
  - No App Check initialization in `firebase/firebase.js` → automated scripts can call Firestore/Functions more easily.
  - Early user document writes before email verification → enables immediate actions unless gated elsewhere.
  - Stripe endpoint call does not exist server-side; even if added, it must require Auth + App Check or an Auth trigger.
  - RTDB rules for `users/{uid}` are not shown; if permissive, bots can write arbitrary data.
- Aligned changes we will make in this plan:
  - Initialize and enforce Firebase App Check across Firestore/Storage/RTDB/Functions.
  - Switch signup to email-first with verification: send verification email, restrict capabilities until `emailVerified`.
  - Move Stripe customer creation to backend-only (Auth onCreate or callable/HTTPS requiring Auth + App Check).
  - Minimize initial client writes: write a minimal skeleton user doc (`signupAt`, `displayName`, `trustTier: 0`), defer optional fields.
  - Harden Firestore + RTDB rules for the exact collections we write on signup.

## Layered Defenses (Defense-in-Depth)

### 1) Identity & Account Integrity

- Email verification: require `emailVerified === true` before posting/commenting/following
- Signup UX: after account creation, send verification email and guide users to a `/verify-email` screen (with resend); optionally sign out or restrict capabilities until verified.
- Optional phone verification: gate high-impact actions for new/low-rep accounts
- MFA/Passkeys: encourage WebAuthn (phased) for creators or high-privilege roles
- Disposable email blocklist: deny signups from known disposable domains via Cloud Function precheck

### 2) Platform Attestation & Anti-Automation

- Firebase App Check (must-do): enforce on Firestore, Storage, RTDB, and Functions
  - Web: reCAPTCHA v3 Enterprise or Cloudflare Turnstile (via App Check custom provider if preferred)
  - Enable “Enforce” in Firebase console for all products after rollout
- Turnstile/HCaptcha challenges: progressive risk-based challenges on create-post, add-comment, follow
  - Only show when risk score high (velocity, new account, link content)

Notes for our stack:

- App initialization currently lacks App Check in `firebase/firebase.js`; add it so tokens are attached to Firestore/Functions calls.
- Functions must reject requests without a valid App Check token and verified Firebase ID token.

### 3) Friction & UX Controls (Progressive)

- New-account cooldowns: block posting for N minutes after account creation
- Graduated limits by reputation tier:
  - Tier 0 (brand new): no links, max 1 post/10m, 3 comments/10m, 5 follows/day
  - Tier 1 (verified email, 48h age): limited links to allowlist domains, higher caps
  - Tier 2 (phone verified, reputation > threshold): normal limits
- Link restrictions:
  - Ban URL shorteners by default (bit.ly, t.co, etc.)
  - Strip tracking params (utm\_\*, fbclid) on display; optional allow on click
  - Safe Browsing/URL reputation check async; warn/gate if risky
- Mentions caps: limit @mentions per post/comment for Tier 0/1
- Time-to-fill heuristic: if compose time < 500ms repeatedly, increase risk score
- Honeypot fields: only for server endpoints and forms; not effective for raw Firestore writes

### 4) Server-Side Validation & Rate Limiting

- Move critical writes behind Cloud Functions (callable or HTTPS) to allow server enforcement:
  - `createPost`, `addComment`, `followUser` (and later: `likePost`)
- Signup/Stripe integration:
  - Do NOT call Stripe directly from the client. Provide either:
    - An Auth onCreate trigger that creates Stripe customers server-side (optionally after email verification), or
    - A callable/HTTPS Function `createStripeCustomer` that requires Auth + App Check and optionally checks `emailVerified`.
  - Replace the current client call to `stripePayment/create-customer` with the secure backend path above.
- Server checks per call:
  - Verify Firebase ID token; require App Check token
  - Enforce account age, emailVerified, trust tier
  - Rate limits: sliding windows per userId + IP + deviceId
  - Recaptcha/Turnstile verification when risk score >= threshold
  - Content validation: length, link count, domain policy
- Rate limit storage: Firestore counters or RTDB; prefer RTDB for cheaper writes
  - Data model: `/rateLimits/{userId}/{action}` with rolling timestamps and counts
  - Use atomic transactions for increments and TTL cleanup (scheduled function)

### 5) Security Rules Hardening (Firestore/Storage)

- Firestore (examples):
  - posts: `request.auth.uid == request.resource.data.userId`
  - posts: `request.resource.data.usernameLower == get(/databases/(default)/documents/profiles/$(request.auth.uid)).data.usernameLower`
  - posts/comments: `content.size() <= 1000`, `linkCount <= limit`, `createdAt` must be `request.time`
  - postComments: enforce `postId` exists and isPublic
  - follows: forbid self-follow; enforce single follow doc per pair via docId = `${follower}_${followed}`
- Storage:
  - Restrict uploads to `image/*`; enforce size < 5MB; path-based ownership (`/users/${uid}/...`)
  - Disallow public write to generic paths

- Firestore (signup-specific):
  - `customers/{userId}`: allow create/update only by the owner; restrict to benign fields on initial create; consider `trustTier` and `signupAt` set by client and validated by rules.
  - `profiles/{userId}`: already restricted to display fields (`displayName`, `photoURL`, `bio`, `usernameLower`).
- RTDB (signup-specific):
  - Add rules for `/users/{uid}`: allow write only if `request.auth.uid == uid`; validate acceptable fields; avoid server-controlled fields here.

### 6) Behavioral & Graph Detection

- Velocity anomalies: z-score on per-user posting/commenting/follow rates
- New account spikes per IP/ASN; Tor exit node flagging
- Link heuristics: domain entropy, shorteners, repeated links across many accounts
- Text similarity: near-duplicate content N-gram/Jaccard for spam clusters
- Graph patterns: dense bipartite follows, rapid reciprocal loops
- Device signals: repeated deviceId across many accounts (localStorage fingerprint, cautious use)
- Risk score: combine signals into a 0–100 score; drive challenges and limits

### 7) Content & Safety Filters

- URL reputation: Google Safe Browsing / Cloudflare Security Center lookup async in background
- Keyword heuristics: simple blocklists for obvious scams; keep minimal to avoid false positives
- Optional: ML text classification later (e.g., TF-IDF or lightweight model) for spam confidence

### 8) Mitigation Actions

- Soft actions: challenge next action, cooldown timer, reduce visibility (de-prioritize in feed)
- Hard actions: rate-limit (429), content rejection, temporary suspension, shadow ban
- Link gating: replace clickable links with plain text for risky users
- Auto-cleanup: scheduled removal of flagged spam; quarantine queue for admin review

### 9) Monitoring, Alerting, and Admin Tools

- Dashboards: daily new accounts, post/comment velocity, link counts, challenge rate, 429 rate
- Abuse inbox: stream of flagged accounts/content with reasons and actions
- Controls: unblock/ban, trust tier override, force challenges, export evidence
- Audit logs: every enforcement and admin action is recorded

## Implementation Plan (Phased)

### Phase 0 – Foundations (1–2 days)

- Enable Firebase App Check in console; integrate in `firebase/firebase.js` and set to Enforce after 24–48h soak
- Enforce email verification for posting/commenting/following via security rules + UI checks; add `/verify-email` flow
- Harden rules: owner checks, content caps, follows docId scheme, plus `customers/{uid}` and RTDB `/users/{uid}` ownership validation

### Phase 1 – Gate Writes via Functions (3–5 days)

- Implement Cloud Functions: `createPost`, `addComment`, `followUser`
  - Verify ID token + App Check
  - Apply basic limits: per-minute and per-hour windows via RTDB
  - Validate content: length, link domain policy, mention caps
- Frontend: route composer/comments/follow actions through these Functions
- Logging: structured logs; store per-user counters under `/rateLimits`

- Signup & Stripe (adjustment):
  - Implement `createStripeCustomer` as a callable or add an Auth onCreate trigger. If callable, require `context.auth` and App Check; if trigger, optionally defer until email verification is confirmed.
  - Remove the unauthenticated `/create-customer` client call and wire the new secure path.

### Phase 2 – Progressive Challenges & Reputation (3–5 days)

- Integrate Cloudflare Turnstile challenge for risk-based flows (in composer/comments)
- Add trust tiers based on accountAge, emailVerified, phoneVerified, strike count, completion of challenges
- Restrict links and raise caps as reputation increases

### Phase 3 – Detection & Mitigation (5–10 days)

- Velocity & pattern detection scheduled job
  - Compute per-user z-scores, flag anomalies to `abuseFlags` collection
  - Graph heuristics on follows; link domain abuse
- Automatic mitigations: shadow-ban, cooldowns, forced challenge
- Admin UI: review queue and actions

### Phase 4 – Enhancements

- URL reputation API; blocklist of shorteners; strip tracking params on display
- Optional phone verification for creators/high-volume users
- Passkeys onboarding for power users

## Concrete Changes (Code & Config)

### App Check

- File: `firebase/firebase.js`
  - Initialize App Check with reCAPTCHA v3 (site key via env):
  ```js
  import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
  const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
  ```
- Console: Enforce App Check for Firestore, Storage, RTDB, Functions after 24–48h soak

### Signup Flow (Auth + UI)

- After `createUserWithEmailAndPassword`, immediately `sendEmailVerification` and either sign out or restrict capabilities until verified.
- Store a minimal user record with `signupAt`, `displayName`, and `trustTier: 0`; defer optional fields until later.
- Show `/verify-email` page with resend capability; poll or instruct users to refresh after verification.

### Cloud Functions (sketch)

- File: `functions/index.js`
  - Add callable/HTTP endpoints:
  ```js
  exports.createPost = functions.https.onCall(async (data, context) => {
    // verify auth and app check
    // enforce account age, emailVerified
    // rate limit per user/IP
    // optional Turnstile verification
    // validate content (length, links, mentions)
    // write to Firestore (server-side userId, usernameLower from profiles)
  });
  ```
- Data: RTDB path `/rateLimits/{userId}/{action}` for counters

#### Stripe customer creation (safe variants)

- Auth trigger:
  ```js
  exports.onAuthUserCreate = functions.auth.user().onCreate(async (user) => {
    // Optionally gate on emailVerified, or create a "pending" customer until verified
    // Create Stripe customer server-side, attach uid/email
    // Persist stripeCustomerId to Firestore/RTDB via Admin SDK
  });
  ```
- Callable (requires App Check + Auth):
  ```js
  exports.createStripeCustomer = functions.https.onCall(async (data, context) => {
    if (!context.app)
      throw new functions.https.HttpsError('failed-precondition', 'App Check required');
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    // Optionally require emailVerified via Admin SDK
    // Create Stripe customer and persist securely
    return { ok: true };
  });
  ```

### Firestore Rules (sketch)

- File: `firestore.rules` (top-level in repo)
  ```
  match /posts/{postId} {
    allow create: if request.auth != null
      && request.resource.data.userId == request.auth.uid
      && request.resource.data.usernameLower == get(/databases/(default)/documents/profiles/$(request.auth.uid)).data.usernameLower
      && request.resource.data.content is string
      && request.resource.data.content.size() <= 1000;
  }
  match /postComments/{id} {
    allow create: if request.auth != null
      && request.resource.data.userId == request.auth.uid
      && request.resource.data.content is string
      && request.resource.data.content.size() <= 500
      && exists(/databases/(default)/documents/posts/$(request.resource.data.postId));
  }
  match /follows/{id} {
    allow create: if request.auth != null
      && request.resource.data.followerId == request.auth.uid
      && request.resource.data.followerId != request.resource.data.followedId;
  }
  match /customers/{userId} {
    allow create, update: if request.auth != null && request.auth.uid == userId;
  }
  ```

### Storage Rules (sketch)

- File: `firebase/rules/storage.rules` (ensure exists)
  ```
  match /users/{uid}/{allPaths=**} {
    allow write: if request.auth != null && request.auth.uid == uid
                 && request.resource.size < 5 * 1024 * 1024
                 && request.resource.contentType.matches('image/.*');
  }
  ```

### RTDB Rules (sketch)

- File: RTDB rules in Firebase console (export as needed)
  ```
  {
    "rules": {
      "users": {
        "$uid": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        }
      },
      "rateLimits": {
        "$uid": {
          ".read": false,
          ".write": "$uid === auth.uid"
        }
      }
    }
  }
  ```

### Frontend (Next.js)

- Composer and CommentsSheet submit paths call Functions instead of direct Firestore writes
- Add Turnstile component that renders challenge conditionally based on risk signal
- Show helpful errors/cooldown timers; surface trust tier status

## Signals & Risk Scoring (MVP)

- Account: age, emailVerified, phoneVerified
- Behavior: posts/min, comments/min, follows/day (sliding windows)
- Content: link count, presence of URL shorteners, domain allowlist
- Device/IP: requests/min, unique accounts per IP/ASN
- Graph: follows gained/min for new accounts

Risk score thresholds:

- <30: no friction
- 30–60: apply soft limits, add challenge
- > 60: block action; shadow-ban content; escalate to review

## KPIs & Monitoring

- % of content/actions challenged; challenge pass rate
- Spam prevalence in public feed (manual sampling)
- New accounts/day vs. banned/shadowed/day
- Link posts/day and unique domains distribution
- Time to mitigation from spike detection

## Privacy & Ethics

- Use minimal device signals; avoid invasive fingerprinting
- Provide transparent appeals and clear enforcement messages
- Store only necessary metadata for abuse decisions; set TTL for rate limit logs

## Rollout Checklist

- [ ] App Check integrated in `firebase/firebase.js` and Enforced on Firestore/Storage/RTDB/Functions
- [ ] Email verification gating in UI + rules; `/verify-email` flow deployed
- [ ] Functions: createPost/addComment/followUser with rate limits
- [ ] Stripe integration moved to Auth trigger or callable; rejects calls without Auth + App Check
- [ ] Frontend wired to Functions with error handling; removed unauthenticated Stripe call
- [ ] Turnstile configured; risk-based display on risky actions
- [ ] Rules hardened for posts/comments/follows/storage + `customers/{uid}` and RTDB `/users/{uid}`
- [ ] Admin review dashboard for flags
- [ ] Dashboards + alerts in place

---

This plan prioritizes low-friction protections first (App Check, rules, email verify), then server-enforced limits and progressive challenges, and finally behavioral analysis with automated mitigations. It is designed to scale protections without harming legitimate users.
