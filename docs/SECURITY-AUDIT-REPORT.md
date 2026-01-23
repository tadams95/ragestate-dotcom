# RAGESTATE Security Audit Report — Phase 1 (AI-Assisted)

> **Date**: January 22, 2026
> **Auditor**: Claude AI (Opus 4.5)
> **Scope**: Firestore Rules, Cloud Functions, npm dependencies, API key exposure, webhook security

---

## Executive Summary

| Category | Status | Findings |
|----------|--------|----------|
| Firestore Security Rules | **PASS** | Well-designed with field validation, admin checks, default deny |
| Cloud Functions | **PASS** | Auth checks, rate limiting, moderation gates in place |
| Webhook Security | **PASS** | Printify uses HMAC signature validation with timing-safe comparison |
| API Key Exposure | **PASS** | No secrets committed; Firebase Web API key is public by design |
| npm Dependencies | **PASS** | All vulnerabilities fixed (0 remaining) |
| Environment Variables | **PASS** | .env files properly gitignored |

**Overall Assessment**: ✅ **PASS** — No security vulnerabilities found. All npm dependencies updated.

---

## 1. Firestore Security Rules Analysis

**File**: `firestore.rules` (441 lines)

### Strengths

| Feature | Location | Assessment |
|---------|----------|------------|
| Admin claim check | Lines 36-45 | Uses `request.auth.token.admin` with document fallback |
| Default deny | Lines 437-439 | Catch-all rule denies access to undefined paths |
| Field validation | Throughout | Type guards (`isString`, `isBool`, `isTimestamp`) |
| Content length limits | Line 20-22 | `isMaxLen500()` for bio, posts, comments |
| URL allowlist | Lines 28-33 | Event images restricted to Firebase Storage |
| Counter immutability | Lines 223-225, 239-240 | likeCount, commentCount locked from client |
| Message immutability | Line 358 | Chat messages cannot be updated/deleted |
| Owner-only access | Various | Tickets, purchases, notifications properly scoped |

### Rule-by-Rule Assessment

| Collection | Read | Write | Notes |
|------------|------|-------|-------|
| `users/{userId}` | Owner/Admin | Owner/Admin | ✅ Proper |
| `profiles/{userId}` | Public | Owner (restricted fields) | ✅ `isVerified` admin-only |
| `usernames/{name}` | Public | Create only (validated) | ✅ Regex validation |
| `purchases/{id}` | Owner/Admin | Create: Owner, Update: Admin | ✅ customerId enforced |
| `events/{id}` | Public | Admin only | ✅ Proper |
| `events/{id}/ragers/{id}` | Owner/Admin | Owner (restricted) | ✅ firebaseId immutable |
| `posts/{id}` | Public/Owner | Owner (validated) | ✅ Counter fields locked |
| `postLikes/{id}` | Public | Owner | ✅ userId enforced |
| `postComments/{id}` | Public | Owner | ✅ Content length validated |
| `chats/{id}` | Members only | Members only | ✅ Proper |
| `chats/{id}/messages/{id}` | Members only | Members (create only) | ✅ Immutable |
| `users/{id}/notifications/{id}` | Owner | Owner (read/seenAt only) | ✅ Restrictive |
| `ticketTransfers/{id}` | Sender/Recipient | Backend only | ✅ Proper |
| `emailCaptures/{id}` | Admin only | Anyone (validated) | ✅ Schema validated |

### No Critical Issues Found

The Firestore rules implement defense-in-depth with:
- Multiple layers of authentication checks
- Field-level validation
- Immutability for sensitive fields
- Default deny policy

---

## 2. Cloud Functions Security Analysis

### functions/stripe.js
**Status**: ✅ SECURE

| Security Control | Implementation | Line |
|-----------------|----------------|------|
| Proxy key validation | Checks `x-proxy-key` header | 347-353 |
| Input validation | Amount min/max, type checks | 365-368 |
| Secrets management | Firebase Secret Manager (`defineSecret`) | 24-35 |
| Customer data isolation | Verifies uid matches | 433-435 |
| Idempotency support | Uses `x-idempotency-key` | 393 |

**Note**: No Stripe webhook endpoint exists in the codebase. The application uses client-side payment confirmation with `automatic_payment_methods`, which is secure when combined with PaymentIntents.

### functions/notifications.js
**Status**: ✅ SECURE

| Security Control | Implementation | Line |
|-----------------|----------------|------|
| Auth required | `ctx.uid` check | 316-318 |
| Rate limiting | `checkRateLimit()` call | 322-326 |
| Self-notification prevention | Skip if `uid === actorId` | 126 |
| Input sanitization | `notificationPrefs` schema enforcement | 733-793 |

### functions/feed.js
**Status**: ✅ SECURE

| Security Control | Implementation | Line |
|-----------------|----------------|------|
| Moderation gate | `checkContent()` on post creation | 274-298 |
| Rate limiting | 3 posts per 5 minutes | 16-17, 299-300 |
| Transaction safety | Counter updates in transactions | 21-28 |

### functions/moderation.js
**Status**: ✅ SECURE

- Content filtering for hate speech, incitement, self-harm
- Leetspeak normalization to catch evasion
- Rule-based system with severity levels

### functions/printifyWebhook.js
**Status**: ✅ SECURE

| Security Control | Implementation | Line |
|-----------------|----------------|------|
| Signature validation | HMAC-SHA256 with timing-safe compare | 292-297 |
| Secret from env | `process.env.PRINTIFY_WEBHOOK_SECRET` | 286 |
| Method restriction | POST only | 277-279 |
| Error handling | No sensitive data in responses | 338 |

### functions/shopifyAdmin.js
**Status**: ⚠️ INCOMPLETE (but not insecure)

- Lines 408, 424 contain TODO stubs for webhook handlers
- Not a security issue, just incomplete functionality

---

## 3. npm Audit Results

**Run Date**: January 22, 2026
**Status**: ✅ **ALL FIXED**

### Vulnerabilities Fixed

| Package | From | To | Vulnerability | Fix |
|---------|------|-----|---------------|-----|
| `next` | 14.x | 14.2.35 | DoS via Server Components | Upgraded |
| `firebase` | 10.x | 12.8.0 | undici issues (random value, DoS) | Upgraded |
| `eslint-config-next` | 14.x | 15.x | glob command injection | Upgraded |
| `@firebase/rules-unit-testing` | 3.0.4 | 5.0.0 | Peer dependency resolution | Upgraded |

### Final Audit Status

```
found 0 vulnerabilities
```

All high and moderate severity vulnerabilities have been remediated through package updates.

---

## 4. API Key Exposure Check

**Status**: ✅ PASS

### Files Scanned
- All source files excluding node_modules
- Pattern: `(sk_live|sk_test|AKIA|AIza|api[_-]?key|secret[_-]?key|password)`

### Findings

| File | Key Type | Status |
|------|----------|--------|
| `public/firebase-messaging-sw.js:10` | Firebase Web API Key | ✅ **EXPECTED** — Public by design |

**Analysis**: The Firebase Web API key (`AIzaSy...`) is intentionally public. Firebase API keys are restricted by:
- HTTP referrer restrictions in Firebase Console
- Application restrictions (SHA-1 for Android, Bundle ID for iOS)
- Security rules in Firestore/Storage

No Stripe secret keys, AWS credentials, or other sensitive keys were found in the codebase.

---

## 5. Environment Variables

**Status**: ✅ PASS

### .gitignore Coverage

```
.env*.local
.env
.secrets/
```

### Git-Tracked Files

| File | Contents | Status |
|------|----------|--------|
| `.env.local.example` | Template with placeholder values | ✅ Safe |
| `tools/mcp-firebase/.env.example` | Template | ✅ Safe |

**No actual .env files are committed to the repository.**

---

## 6. Authentication Flow Analysis

### Client-Side (Firebase Auth)

**File**: `firebase/context/FirebaseContext.js`

| Step | Implementation | Security |
|------|---------------|----------|
| Persistence | `browserLocalPersistence` | ✅ Session survives refresh |
| State listener | `onAuthStateChanged` | ✅ Reactive updates |
| Admin check | Multiple sources (RTDB, Firestore) | ✅ Defense in depth |
| Purchase isolation | `customerId === user.uid` | ✅ Owner verification |

### Server-Side (Cloud Functions)

| Endpoint | Auth Method | Security |
|----------|-------------|----------|
| `onCall` functions | `request.auth` context | ✅ Firebase handles verification |
| HTTP endpoints | `x-proxy-key` header | ✅ Shared secret from Next.js |
| Webhooks | HMAC signature | ✅ Timing-safe validation |

### Admin Privilege Escalation Prevention

1. Custom claims (`request.auth.token.admin`) — Set by Admin SDK only
2. `adminUsers/{uid}` document — Write requires admin
3. `users/{uid}.isAdmin` — Write requires admin (via rules)

---

## 7. Recommendations

### Immediate (This Week)

1. **Update Next.js** to 14.2.35+ to fix DoS vulnerability
2. **Update Firebase SDK** to latest for undici fixes
3. **Run `npm audit fix`** to resolve auto-fixable issues

### Short-Term (This Month)

4. **Update eslint-config-next** to 16.x (test thoroughly)
5. **Add Content-Security-Policy** headers in `next.config.js`
6. **Implement rate limiting** on HTTP endpoints (beyond proxy key)

### Pre-Acquisition

7. **Third-party penetration test** focusing on:
   - Payment flow (Stripe integration)
   - Ticket transfer claim flow
   - Admin privilege escalation
8. **Document OWASP Top 10** compliance status
9. **Create incident response plan**

---

## 8. Checklist Status

### Phase 1 (AI-Assisted) — COMPLETE

- [x] Analyze `firestore.rules` for vulnerabilities
- [x] Check for overly permissive read/write rules
- [x] Verify admin claim checks are consistent
- [x] Check for missing field validation
- [x] Review collection group query security
- [x] Review Cloud Functions for vulnerabilities
- [x] `functions/stripe.js` — payment security
- [x] `functions/feed.js` — injection risks
- [x] `functions/notifications.js` — auth checks
- [x] `functions/moderation.js` — bypass risks
- [x] `functions/shopifyAdmin.js` — API key exposure
- [x] Run `npm audit` and document findings
- [x] Triage npm audit findings by severity
- [x] Fix critical/high severity npm vulnerabilities ✅
- [x] Document authentication flow for review
- [x] Review Stripe webhook signature verification
- [x] Check for exposed API keys in codebase
- [x] Verify environment variables are not committed

---

## Appendix A: Tool Versions

```
Node.js: (Check with node -v)
npm: (Check with npm -v)
Firebase CLI: (Check with firebase --version)
Next.js: 14.2.35 ✅ (secure, DoS fix applied)
Firebase: 12.8.0 ✅ (secure)
```

## Appendix B: Files Reviewed

| File | Lines | Purpose |
|------|-------|---------|
| `firestore.rules` | 441 | Database security rules |
| `functions/stripe.js` | 3000+ | Payment processing |
| `functions/notifications.js` | 895 | Push notification logic |
| `functions/feed.js` | 300+ | Social feed triggers |
| `functions/moderation.js` | 138 | Content moderation |
| `functions/printifyWebhook.js` | 359 | Fulfillment webhooks |
| `functions/shopifyAdmin.js` | 425+ | Shopify integration |
| `firebase/context/FirebaseContext.js` | 533 | Auth context |
| `.gitignore` | 41 | Version control exclusions |

---

**Prepared by**: Claude AI (Opus 4.5)
**Review Status**: AI-assisted audit complete; third-party review recommended for acquisition
