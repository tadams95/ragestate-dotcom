# RAGESTATE Acquisition Readiness Checklist

> **Created**: January 22, 2026
> **Target Completion**: Mid-February 2026
> **Goal**: Complete all items before acquirer outreach

---

## Overview

| Category | Complete | Remaining | Priority |
|----------|----------|-----------|----------|
| Native App | 80-90% | 10-20% | Critical |
| Chat Feature | 95% | 5% | High |
| Phase 2 Tasks | 95% | 5% | High |
| Security Audit | 100% | 0% | Critical |
| Documentation | 40% | 60% | High |
| Technical Debt | 100% | 0% | Medium |
| Data Room | 0% | 100% | High |
| Legal | Unknown | Unknown | High |

---

## Critical Priority (Week 1)

### Native Mobile App
- [ ] Complete React Native app development (currently 80-90%)
- [ ] Test iOS build on physical devices
- [ ] Test Android build on physical devices
- [ ] Submit iOS app to TestFlight
- [ ] Submit Android app to Google Play Internal Testing
- [ ] Verify App Check is enabled and working
- [ ] Test deep linking between web and mobile
- [ ] Verify push notifications work on both platforms
- [ ] Test payment flows on mobile
- [ ] Test ticket scanning on mobile

### Security Audit — Phase 1 (AI-Assisted) ✅ COMPLETE
> **Report**: See `docs/SECURITY-AUDIT-REPORT.md` for full findings

- [x] Analyze `firestore.rules` (441 lines) for vulnerabilities — **PASS: No critical issues**
  - [x] Check for overly permissive read/write rules — **Default deny, proper scoping**
  - [x] Verify admin claim checks are consistent — **Uses custom claims + document fallback**
  - [x] Check for missing field validation — **Type guards and length limits in place**
  - [x] Review collection group query security — **Proper member checks**
- [x] Review Cloud Functions for vulnerabilities — **PASS: Auth checks, rate limits in place**
  - [x] `functions/stripe.js` — **Proxy key validation, input validation**
  - [x] `functions/feed.js` — **Moderation gate, rate limiting**
  - [x] `functions/notifications.js` — **Auth required, rate limited**
  - [x] `functions/moderation.js` — **Rule-based content filtering**
  - [x] `functions/shopifyAdmin.js` — **Secrets in Secret Manager**
- [x] Run `npm audit` and document findings — **7 high, 9 moderate vulnerabilities**
- [x] Triage npm audit findings by severity — **See report for details**
- [x] Fix critical/high severity npm vulnerabilities — **FIXED: 0 vulnerabilities remaining**
- [x] Document authentication flow for review — **Firebase Auth + browserLocalPersistence**
- [x] Review Stripe webhook signature verification — **No Stripe webhook; uses client-side PI confirmation**
- [x] Check for exposed API keys in codebase — **PASS: Only public Firebase Web API key**
- [x] Verify environment variables are not committed — **PASS: .env files in .gitignore**

**npm Vulnerabilities Summary**: ✅ **ALL FIXED** (January 22, 2026)
| Package | From | To | Fix |
|---------|------|-----|-----|
| next | 14.x | 14.2.35 | DoS vulnerability (CVE fix) |
| firebase | 10.x | 12.8.0 | undici issues |
| eslint-config-next | 14.x | 15.x | glob command injection |
| @firebase/rules-unit-testing | 3.0.4 | 5.0.0 | peer dependency |

---

## High Priority (Week 2)

### Chat Feature Completion
- [x] Create Cloud Function for chat summary creation ✅
  - [x] Listen to `onCreate('chats/{chatId}')` — `functions/chat.js:onChatCreated`
  - [x] Create `users/{userId}/chatSummaries/{chatId}` for both members
  - [x] Set initial fields: type, peerId, peerName, peerPhoto, unreadCount, muted
- [x] Create Cloud Function for message updates ✅
  - [x] Listen to `onCreate('chats/{chatId}/messages/{messageId}')` — `functions/chat.js:onMessageCreated`
  - [x] Update `lastMessage` in chat document and chatSummaries
  - [x] Increment `unreadCount` for recipients
- [ ] Test new DM creation flow end-to-end (functions deployed ✅)
- [ ] Verify chat list updates in real-time after DM creation
- [ ] Test chat on mobile app (after app completion)
- [x] Add chat moderation hooks ✅ (flags violating messages for review)

### Phase 2 Completion
- [x] Run bundle analysis: `npm run analyze` ✅
- [x] Document bundle analysis findings ✅
  - Shared JS: 88.4 KB (well optimized)
  - Individual page JS: 1-35 KB per page
  - First Load JS: 88-402 KB (largest: /account at 402 KB)
- [x] Optimize bundles if JS exceeds 200KB ✅ (individual page JS is under 35KB)
- [x] Implement Shopify fulfillment webhook handler ✅
  - [x] File: `functions/shopifyAdmin.js` — `handleFulfillmentWebhook()`
  - [x] Queries `merchandiseOrders` by `shopifyOrderId`
  - [x] Updates `fulfillmentStatus` and `status` fields
- [x] Implement Shopify inventory sync webhook ✅
  - [x] File: `functions/shopifyAdmin.js` — `handleInventoryWebhook()`
  - [x] Syncs to `shopifyInventory` collection for caching
- [x] Add caching headers for static assets in `next.config.js` ✅
  - `/_next/static/*`: 1 year, immutable
  - `/assets/*`: 1 week with stale-while-revalidate
  - `/fonts/*`: 1 year, immutable
- [x] Verify LCP < 3 seconds on key pages ✅ (2.34s measured)

### Security Audit — Phase 2 (OWASP Top 10) ✅ COMPLETE (January 23, 2026)
- [x] **A01: Broken Access Control** — **FIXED: HIGH RISK IDOR vulnerabilities**
  - [x] Review all API routes for auth checks — **FIXED: Added Firebase token verification**
  - [x] Verify admin-only routes require admin claims — **PASS: Custom claims checked**
  - [x] Check for IDOR vulnerabilities in ticket/order access — **FIXED: Added user ID validation**
  - **Files Fixed**: `src/app/api/payments/create-payment-intent/route.js`, `finalize-order/route.js`, `transfer-ticket/route.js`
- [x] **A02: Cryptographic Failures** — **PASS**
  - [x] Verify sensitive data encryption at rest — **Firestore handles encryption**
  - [x] Check HTTPS enforcement — **Vercel enforces HTTPS**
  - [x] Review token generation (ticket tokens, claim tokens) — **Uses crypto.randomBytes(32)**
- [x] **A03: Injection** — **PASS (LOW risk items noted)**
  - [x] Review Firestore queries for NoSQL injection — **PASS: Hardcoded field names/operators**
  - [x] Check user input sanitization — **PASS: Validated at entry points**
  - [x] Review email template generation — **LOW: User data in emails not HTML-escaped (acceptable)**
  - **Note**: `dangerouslySetInnerHTML` for Shopify product descriptions is trusted admin source
- [x] **A04: Insecure Design** — **PASS**
  - [x] Document threat model — **Payment/ticket flows protected**
  - [x] Review rate limiting implementation — **PASS: Server-side (Firestore) + client-side (localStorage)**
- [x] **A05: Security Misconfiguration** — **PASS (cleanup recommended)**
  - [x] Review Firebase security rules — **Already audited in Phase 1**
  - [x] Check for debug modes in production — **PASS: Debug token only in dev**
  - [x] Verify error messages don't leak info — **PASS: Generic messages returned**
  - **Note**: ~30 console.log statements in production code (technical debt, not security risk)
- [x] **A06: Vulnerable Components** — **PASS: 0 vulnerabilities**
  - [x] Complete npm audit remediation — **✅ 0 vulnerabilities (fixed Jan 22)**
  - [x] Check Firebase SDK versions — **v12.8.0 (current)**
- [x] **A07: Authentication Failures** — **PASS**
  - [x] Review session management — **Firebase Auth + browserLocalPersistence**
  - [x] Check password/auth policies — **Firebase Auth handles policies**
  - [x] Verify MFA availability (if applicable) — **Firebase supports MFA, not enabled**
- [x] **A08: Data Integrity Failures** — **PASS**
  - [x] Review CI/CD pipeline security — **Vercel handles deployments (no custom CI/CD)**
  - [x] Check for unsigned code — **N/A (no custom CI/CD)**
- [x] **A09: Logging & Monitoring** — **PASS**
  - [x] Verify security events are logged — **Firebase Functions logger in use**
  - [x] Check for PII in logs — **Email addresses logged for transactional emails (acceptable)**
- [x] **A10: SSRF** — **PASS**
  - [x] Review any URL fetch operations — **All URLs from env vars/config (no user input)**
  - [x] Check webhook URL validation — **HMAC signature validation in place**

---

## Medium Priority (Week 3)

### Technical Debt Cleanup ✅ COMPLETE (January 23, 2026)
- [x] Delete obsolete `lib/features/todos/` directory ✅
  - [x] Verify no imports reference this path — **PASS: 0 code imports**
  - [x] Remove `lib/features/todos/authSlice.js` — **Deleted**
  - [x] Remove `lib/features/todos/cartSlice.js` — **Deleted**
  - [x] Remove `lib/features/todos/userSlice.js` — **Deleted**
- [x] Run linter and fix any warnings: `npm run lint` ✅
  - Fixed ESLint plugin conflict (duplicate react-hooks)
  - Fixed `<a>` → `<Link>` errors in OrderHistory.js, drafts/page.jsx
  - Fixed unused state in AddressForm.js
  - Fixed ErrorModal.js to use error prop
- [x] Review and remove any console.log statements in production code ✅
  - Removed ~15 debug console.logs from production code
  - Files cleaned: shop/page.js, cart/page.js, AdminProtected.js, events/page.js, NotificationPreferences.jsx, firestoreUtils.js, and more
- [x] Check for TODO comments that should be addressed ✅
  - Only 1 TODO found (account deletion feature request - not urgent)
- [x] Update any outdated dependencies (non-breaking) ✅
  - Updated: @babel/core, @headlessui/react, @reduxjs/toolkit, @tailwindcss/forms, @tailwindcss/typography, @vercel/analytics, @vercel/speed-insights, framer-motion, and more
  - Build verified ✅

### Documentation — Technical
- [ ] Create `docs/DEPLOYMENT-RUNBOOK.md`
  - [ ] Vercel deployment procedure
  - [ ] Firebase Functions deployment steps
  - [ ] Firestore indexes deployment
  - [ ] Storage rules deployment
  - [ ] Secret management (Firebase Secret Manager)
  - [ ] Post-deployment verification checklist
  - [ ] Rollback procedures
- [ ] Create `docs/ARCHITECTURE.md`
  - [ ] System architecture diagram (Next.js ↔ Firebase ↔ Stripe)
  - [ ] Data flow diagrams
  - [ ] Payment flow sequence diagram
  - [ ] Ticket transfer flow diagram
  - [ ] Chat architecture diagram
- [ ] Document `firestore.indexes.json`
  - [ ] Explain each index purpose
  - [ ] Note query performance implications
- [ ] Create database schema documentation
  - [ ] Document all Firestore collections
  - [ ] Document field types and constraints
  - [ ] Document relationships between collections

### Documentation — Operational
- [ ] Create `docs/MONITORING.md`
  - [ ] Vercel Analytics setup
  - [ ] Firebase console monitoring
  - [ ] Error tracking approach
  - [ ] Key metrics to watch
- [ ] Create `docs/TROUBLESHOOTING.md`
  - [ ] Common issues and solutions
  - [ ] Support escalation procedures
- [ ] Update README.md
  - [ ] Add architecture overview section
  - [ ] Add contributing guidelines
  - [ ] Add license information

---

## High Priority (Week 4)

### Data Room Preparation
- [ ] Export user metrics
  - [ ] Total registered users
  - [ ] Monthly Active Users (MAU)
  - [ ] Daily Active Users (DAU)
  - [ ] DAU/MAU ratio
  - [ ] User growth chart (last 6 months)
- [ ] Export revenue metrics
  - [ ] Total revenue (lifetime)
  - [ ] Monthly Recurring Revenue (MRR) trend
  - [ ] Average ticket price
  - [ ] Average order value
  - [ ] Revenue by category (tickets vs merch)
- [ ] Export engagement metrics
  - [ ] Posts per day
  - [ ] Comments per post
  - [ ] Likes per post
  - [ ] Feed engagement rate
  - [ ] Notification open rate
- [ ] Create technical architecture diagram (visual)
- [ ] Prepare codebase statistics
  - [ ] Lines of code
  - [ ] Number of components
  - [ ] Test coverage (if available)
- [ ] Document infrastructure costs
  - [ ] Firebase monthly cost
  - [ ] Vercel monthly cost
  - [ ] Third-party services costs
- [ ] Prepare integration documentation
  - [ ] How to migrate Firebase data
  - [ ] API handoff procedures
  - [ ] Transition timeline estimate

### Legal Review
- [ ] Review Terms of Service
  - [ ] Verify acquisition/transfer clause exists
  - [ ] Check user data transfer provisions
- [ ] Review Privacy Policy
  - [ ] GDPR compliance check
  - [ ] CCPA compliance check
  - [ ] Data retention policy documented
- [ ] Verify IP assignment is clean
  - [ ] All code owned by company
  - [ ] No third-party IP issues
  - [ ] Open source license compliance
- [ ] Review any existing contracts
  - [ ] Stripe agreement
  - [ ] Firebase/Google agreement
  - [ ] Shopify/Printify agreements

### Pitch Deck Preparation
- [ ] Create company overview slide
- [ ] Create problem/solution slide
- [ ] Create market opportunity slide (TAM/SAM/SOM)
- [ ] Create competitive landscape slide
- [ ] Create unique value proposition slide (@username transfers)
- [ ] Create product demo screenshots/video
- [ ] Create traction/metrics slide
- [ ] Create technology stack slide
- [ ] Create team slide
- [ ] Create financial projections slide
- [ ] Create ask/deal terms slide

---

## Optional Enhancements (Post-Core Completion)

### Security (If Budget Allows)
- [ ] Engage third-party penetration tester
  - [ ] Option: HackerOne ($5-15k)
  - [ ] Option: Independent consultant ($3-8k)
  - [ ] Focus: Payment flows and authentication
- [ ] Obtain security audit report/certificate
- [ ] Remediate any findings from third-party audit

### Performance Optimization
- [ ] Implement image lazy loading audit
- [ ] Review and optimize Firestore queries
- [ ] Implement service worker for offline support
- [ ] Add PWA manifest improvements
- [ ] Optimize initial page load time

### Advanced Features (Acquisition Sweeteners)
- [ ] Implement follower quick-pick for ticket transfers
- [ ] Add read receipts to chat
- [ ] Implement typing indicators in chat
- [ ] Add group chat support (for events)
- [ ] Implement AI-powered post recommendations

---

## Completion Tracking

### Week 1 Progress
| Date | Items Completed | Notes |
|------|-----------------|-------|
| | | |

### Week 2 Progress
| Date | Items Completed | Notes |
|------|-----------------|-------|
| | | |

### Week 3 Progress
| Date | Items Completed | Notes |
|------|-----------------|-------|
| | | |

### Week 4 Progress
| Date | Items Completed | Notes |
|------|-----------------|-------|
| | | |

---

## Quick Reference: File Locations

| Task | File Path |
|------|-----------|
| Firestore Rules | `firestore.rules` |
| Shopify Webhooks | `functions/shopifyAdmin.js:408,424` |
| Chat Service | `lib/firebase/chatService.js` |
| Chat Hooks | `lib/hooks/useChat.js`, `lib/hooks/useChatList.js` |
| Metrics Dashboard | `src/app/admin/metrics/` |
| Bundle Analyzer | `npm run analyze` (configured in `next.config.js`) |
| Obsolete Directory | `lib/features/todos/` (delete this) |
| API Documentation | `docs/api-endpoints.http` |
| Env Template | `.env.local.example` |
| Master Plan | `docs/ACQUISITION-MASTER-PLAN.md` |

---

## Success Criteria

**Acquisition-Ready Definition**:
- [ ] Native app in TestFlight/Play Store
- [ ] All critical security findings remediated
- [ ] Complete documentation package
- [ ] Data room materials prepared
- [ ] Pitch deck finalized
- [ ] Legal review complete
- [ ] Demo environment stable

**Estimated Completion**: Mid-February 2026
