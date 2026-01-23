# RAGESTATE Acquisition Readiness Checklist

> **Created**: January 22, 2026
> **Target Completion**: Mid-February 2026
> **Goal**: Complete all items before acquirer outreach

---

## Overview

| Category | Complete | Remaining | Priority |
|----------|----------|-----------|----------|
| Native App | 80-90% | 10-20% | Critical |
| Chat Feature | 90% | 10% | High |
| Phase 2 Tasks | 85% | 15% | High |
| Security Audit | 85% | 15% | Critical |
| Documentation | 40% | 60% | High |
| Technical Debt | 60% | 40% | Medium |
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
- [ ] Create Cloud Function for chat summary creation
  - [ ] Listen to `onCreate('chats/{chatId}')`
  - [ ] Create `users/{userId}/chatSummaries/{chatId}` for both members
  - [ ] Set initial fields: type, peerId, peerName, peerPhoto, unreadCount, muted
- [ ] Test new DM creation flow end-to-end
- [ ] Verify chat list updates in real-time after DM creation
- [ ] Test chat on mobile app (after app completion)
- [ ] Add chat moderation hooks (optional, for content filtering)

### Phase 2 Completion
- [ ] Run bundle analysis: `npm run analyze`
- [ ] Document bundle analysis findings
- [ ] Optimize bundles if JS exceeds 200KB
- [ ] Implement Shopify fulfillment webhook handler
  - [ ] File: `functions/shopifyAdmin.js` line 408
  - [ ] Update `merchandiseOrders/{id}.fulfillmentStatus`
- [ ] Implement Shopify inventory sync webhook
  - [ ] File: `functions/shopifyAdmin.js` line 424
  - [ ] Sync inventory levels to Firestore
- [ ] Add caching headers for static assets in `next.config.js`
- [ ] Verify LCP < 3 seconds on key pages

### Security Audit — Phase 2 (OWASP Top 10)
- [ ] **A01: Broken Access Control**
  - [ ] Review all API routes for auth checks
  - [ ] Verify admin-only routes require admin claims
  - [ ] Check for IDOR vulnerabilities in ticket/order access
- [ ] **A02: Cryptographic Failures**
  - [ ] Verify sensitive data encryption at rest
  - [ ] Check HTTPS enforcement
  - [ ] Review token generation (ticket tokens, claim tokens)
- [ ] **A03: Injection**
  - [ ] Review Firestore queries for NoSQL injection
  - [ ] Check user input sanitization
  - [ ] Review email template generation
- [ ] **A04: Insecure Design**
  - [ ] Document threat model
  - [ ] Review rate limiting implementation
- [ ] **A05: Security Misconfiguration**
  - [ ] Review Firebase security rules
  - [ ] Check for debug modes in production
  - [ ] Verify error messages don't leak info
- [ ] **A06: Vulnerable Components**
  - [ ] Complete npm audit remediation
  - [ ] Check Firebase SDK versions
- [ ] **A07: Authentication Failures**
  - [ ] Review session management
  - [ ] Check password/auth policies
  - [ ] Verify MFA availability (if applicable)
- [ ] **A08: Data Integrity Failures**
  - [ ] Review CI/CD pipeline security
  - [ ] Check for unsigned code
- [ ] **A09: Logging & Monitoring**
  - [ ] Verify security events are logged
  - [ ] Check for PII in logs
- [ ] **A10: SSRF**
  - [ ] Review any URL fetch operations
  - [ ] Check webhook URL validation

---

## Medium Priority (Week 3)

### Technical Debt Cleanup
- [ ] Delete obsolete `lib/features/todos/` directory
  - [ ] Verify no imports reference this path
  - [ ] Remove `lib/features/todos/authSlice.js`
  - [ ] Remove `lib/features/todos/cartSlice.js`
  - [ ] Remove `lib/features/todos/userSlice.js`
- [ ] Run linter and fix any warnings: `npm run lint`
- [ ] Review and remove any console.log statements in production code
- [ ] Check for TODO comments that should be addressed
- [ ] Update any outdated dependencies (non-breaking)

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
