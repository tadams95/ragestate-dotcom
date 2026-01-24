# RAGESTATE Monitoring Guide

> **Last Updated**: January 23, 2026
> **Audience**: Developers, Operations, Acquirers

---

## Overview

RAGESTATE uses a multi-layered monitoring approach:

| Layer | Tool | Purpose |
|-------|------|---------|
| Frontend Analytics | Vercel Analytics | Page views, user journeys, custom events |
| Performance | Vercel Speed Insights | Core Web Vitals, LCP, FID, CLS |
| Backend Logging | Firebase Functions Logger | Function execution, errors, audit trail |
| Business Metrics | Admin Dashboard | Revenue, users, engagement (pre-aggregated) |
| Infrastructure | Vercel Dashboard | Build status, deployments, serverless logs |

---

## 1. Vercel Analytics

### Setup
Analytics is automatically enabled via the `@vercel/analytics` package in the root layout:

```javascript
// src/app/layout.js
import { Analytics } from '@vercel/analytics/react';

// In the component tree:
<Analytics />
```

### Accessing Analytics
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the **ragestate-dotcom** project
3. Click **Analytics** in the sidebar

### Key Metrics
- **Page Views**: Total and unique visitors
- **Top Pages**: Most visited routes
- **Referrers**: Traffic sources
- **Countries**: Geographic distribution
- **Devices**: Mobile vs desktop breakdown

### Custom Event Tracking
Use the `track()` utility for custom events:

```javascript
import { track } from '@/utils/metrics';

// Track a purchase
track('purchase_completed', {
  amount: 150,
  items: 2,
  eventId: 'event-123'
});

// Track a feature usage
track('ticket_transferred', {
  eventId: 'event-456'
});
```

**File**: `src/app/utils/metrics.js`

---

## 2. Vercel Speed Insights

### Setup
Speed Insights is enabled via the `@vercel/speed-insights` package:

```javascript
// src/app/layout.js
import { SpeedInsights } from '@vercel/speed-insights/next';

// In the component tree:
<SpeedInsights />
```

### Accessing Speed Insights
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the **ragestate-dotcom** project
3. Click **Speed Insights** in the sidebar

### Core Web Vitals Monitored
| Metric | Target | Description |
|--------|--------|-------------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Loading performance |
| **FID** (First Input Delay) | < 100ms | Interactivity |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Visual stability |
| **TTFB** (Time to First Byte) | < 800ms | Server response time |
| **INP** (Interaction to Next Paint) | < 200ms | Overall responsiveness |

### Performance Targets
Current performance (as of January 2026):
- **LCP**: 2.34s (target: < 3s) ✅
- Bundle sizes optimized (page JS: 1-35 KB per page)

---

## 3. Firebase Console Monitoring

### Accessing Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select the **ragestate-app** project

### Cloud Functions Logs
**Path**: Firebase Console → Functions → Logs

View execution logs for:
- `stripePayment` - Payment processing
- `sendPurchaseEmail` - Email delivery
- `onChatCreated` / `onMessageCreated` - Chat functions
- `aggregateDailyMetrics` - Daily analytics job
- `onMediaUpload` - Media processing

### Log Filtering
```bash
# Via Firebase CLI
firebase functions:log --only stripePayment
firebase functions:log --only sendPurchaseEmail --limit 50

# Filter by severity
firebase functions:log --severity ERROR
```

### Key Log Events to Monitor
| Event | Function | Severity | Action |
|-------|----------|----------|--------|
| Payment failed | stripePayment | ERROR | Check Stripe dashboard |
| Email send failed | sendPurchaseEmail | ERROR | Check SES quota/credentials |
| Rate limit exceeded | stripePayment | WARNING | Normal, unless excessive |
| Moderation flag | onMessageCreated | INFO | Review flagged content |

### Firestore Usage
**Path**: Firebase Console → Firestore → Usage

Monitor:
- **Read/Write Operations**: Daily usage vs quota
- **Storage**: Database size growth
- **Index Building**: Check for stuck indexes

### Authentication
**Path**: Firebase Console → Authentication → Users

Monitor:
- Active users count
- Sign-in providers usage
- Failed login attempts (via sign-in logs)

---

## 4. Admin Metrics Dashboard

### Accessing
1. Log in as admin user
2. Navigate to `/admin/metrics`

### Data Source
The dashboard reads from pre-aggregated Firestore collections:
- `analytics/{date}` - Daily snapshots
- `analytics/totals` - Running totals

### Aggregation Schedule
A Cloud Function runs daily at **2:00 AM UTC**:

```javascript
// functions/analytics.js
const aggregateDailyMetrics = onSchedule(
  { schedule: '0 2 * * *', timeZone: 'UTC' },
  async () => { /* aggregates yesterday's data */ }
);
```

### Metrics Available

**Revenue**:
- Total revenue (lifetime)
- Daily/weekly revenue trends
- Order count
- Ticket vs merchandise breakdown

**Users**:
- Total registered users
- Daily signups
- Cumulative growth chart

**Engagement**:
- Total posts
- Likes and comments
- Posts per day
- Average engagement per post

### Implementation
**File**: `src/app/admin/metrics/hooks/useMetricsData.js`

The hook uses a two-tier approach:
1. **Primary**: Read from `analytics/totals` (fast, low read cost)
2. **Fallback**: Query raw collections if aggregations don't exist

---

## 5. Error Tracking

### Current Approach
Errors are tracked via:
1. **Firebase Functions Logger** - Server-side errors
2. **Browser Console** - Client-side errors (production builds minimize)
3. **Vercel Logs** - API route errors

### Viewing Vercel Logs
1. Vercel Dashboard → Project → **Logs**
2. Filter by:
   - Status codes (4xx, 5xx)
   - Time range
   - Path patterns

### Error Patterns to Watch

| Pattern | Location | Meaning |
|---------|----------|---------|
| `401 Unauthorized` | API routes | Invalid/missing auth token |
| `403 Forbidden` | API routes | User lacks permission |
| `429 Too Many Requests` | stripePayment | Rate limit hit |
| `PERMISSION_DENIED` | Firestore | Security rules blocked access |
| `DEADLINE_EXCEEDED` | Functions | Function timeout |

### Future Enhancement (Optional)
Consider adding a dedicated error tracking service:
- **Sentry** - Full stack error tracking with source maps
- **LogRocket** - Session replay + error tracking
- **Datadog** - Infrastructure + APM

---

## 6. Key Metrics to Watch

### Daily Checks
| Metric | Location | Healthy Range |
|--------|----------|---------------|
| Build status | Vercel Dashboard | All green |
| Function errors | Firebase Logs | < 1% of invocations |
| LCP | Speed Insights | < 2.5s |
| Active users | Firebase Auth | Trending up/stable |

### Weekly Checks
| Metric | Location | Action If Abnormal |
|--------|----------|-------------------|
| Revenue trend | Admin Dashboard | Investigate drop > 20% |
| Signup rate | Admin Dashboard | Check marketing/auth issues |
| Firestore reads | Firebase Console | Optimize queries if high |
| Storage growth | Firebase Console | Plan for scaling |

### Monthly Checks
| Metric | Location | Action |
|--------|----------|--------|
| Bundle size | `npm run analyze` | Optimize if > 200KB |
| npm audit | `npm audit` | Update vulnerable deps |
| Function cold starts | Firebase Metrics | Consider min instances |

---

## 7. Alerting (Manual Process)

Currently, alerting is manual. Check daily:

1. **Vercel**: Review deployment status emails
2. **Firebase**: Set up billing alerts in Google Cloud Console
3. **Stripe**: Enable webhook failure notifications

### Setting Up Firebase Billing Alerts
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **Billing** → **Budgets & alerts**
3. Create budget for the Firebase project
4. Set thresholds (e.g., 50%, 80%, 100% of expected spend)

---

## 8. Quick Commands

```bash
# Check function logs
firebase functions:log

# Check function logs for specific function
firebase functions:log --only stripePayment

# Run local bundle analysis
npm run analyze

# Check npm vulnerabilities
npm audit

# View Firestore indexes status
firebase firestore:indexes

# List deployed functions
firebase functions:list
```

---

## 9. Dashboard Links

| Dashboard | URL |
|-----------|-----|
| Vercel Project | https://vercel.com/[team]/ragestate-dotcom |
| Firebase Console | https://console.firebase.google.com/project/ragestate-app |
| Stripe Dashboard | https://dashboard.stripe.com |
| Google Cloud Console | https://console.cloud.google.com/home/dashboard?project=ragestate-app |

---

## Appendix: Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │ Vercel Analytics │    │ Speed Insights  │                 │
│  │   (page views,   │    │  (Core Web      │                 │
│  │    custom events)│    │   Vitals)       │                 │
│  └────────┬────────┘    └────────┬────────┘                 │
└───────────┼──────────────────────┼──────────────────────────┘
            │                      │
            ▼                      ▼
┌───────────────────────────────────────────────────────────┐
│                    VERCEL DASHBOARD                        │
│  • Analytics     • Speed Insights    • Logs    • Builds   │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│                   FIREBASE CONSOLE                         │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Functions  │  │   Firestore  │  │     Auth     │    │
│  │    Logs      │  │    Usage     │  │    Users     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│                   ADMIN DASHBOARD                          │
│                   /admin/metrics                           │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Revenue    │  │    Users     │  │  Engagement  │    │
│  │    Charts    │  │    Growth    │  │    Stats     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                          ▲                                 │
│                          │                                 │
│              ┌───────────────────────┐                    │
│              │  analytics/totals     │                    │
│              │  (pre-aggregated)     │                    │
│              └───────────────────────┘                    │
└───────────────────────────────────────────────────────────┘
```
