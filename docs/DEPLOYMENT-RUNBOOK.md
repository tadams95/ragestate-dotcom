# RAGESTATE Deployment Runbook

> **Last Updated**: January 23, 2026
> **Project**: ragestate-app (Firebase) + ragestate-dotcom (Vercel)

---

## Overview

RAGESTATE uses a split deployment architecture:
- **Frontend (Next.js)**: Deployed to Vercel via Git integration
- **Backend (Cloud Functions)**: Deployed to Firebase via CLI
- **Database (Firestore)**: Rules and indexes deployed via Firebase CLI

---

## Prerequisites

### Required Tools
```bash
# Node.js (v18+)
node --version

# Firebase CLI
npm install -g firebase-tools
firebase --version

# Verify logged in
firebase login
firebase projects:list
```

### Environment Variables

**Vercel (Production)**:
- Set via Vercel Dashboard → Project → Settings → Environment Variables
- Required: `NEXT_PUBLIC_FIREBASE_*`, `STRIPE_*`, `PROXY_KEY`

**Firebase Functions**:
- Managed via Firebase Secret Manager
- Set using: `firebase functions:secrets:set SECRET_NAME`

---

## 1. Vercel Deployment (Frontend)

### Automatic Deployment
Vercel deploys automatically on push to `main` branch.

### Manual Deployment
```bash
# Install Vercel CLI (if needed)
npm i -g vercel

# Deploy to production
vercel --prod

# Deploy preview
vercel
```

### Deployment Verification
1. Visit https://ragestate.com
2. Check Vercel Dashboard for build status
3. Verify key pages load:
   - Home page (`/`)
   - Events (`/events`)
   - Shop (`/shop`)
   - Login (`/login`)

### Rollback
```bash
# Via Vercel Dashboard:
# Project → Deployments → Select previous → Promote to Production

# Or via CLI:
vercel rollback
```

---

## 2. Firebase Functions Deployment

### Deploy All Functions
```bash
cd functions
npm install
cd ..

# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:stripePayment
firebase deploy --only functions:sendPurchaseEmail
```

### Function Modules
| Module | Functions | Description |
|--------|-----------|-------------|
| `stripe.js` | stripePayment (HTTP) | Payment processing, ticket transfers |
| `email.js` | sendPurchaseEmail | Transactional emails on fulfillment |
| `notifications.js` | Multiple triggers | Push notifications, device management |
| `feed.js` | Multiple triggers | Feed updates, likes, comments |
| `chat.js` | onChatCreated, onMessageCreated | Chat summaries, moderation |
| `transcode.js` | onMediaUpload | Video/image optimization |
| `printifyWebhook.js` | printifyWebhook | Merchandise fulfillment |
| `rateLimit.js` | scheduledRateLimitCleanup | Daily cleanup job |
| `analytics.js` | aggregateDailyMetrics | Daily metrics aggregation |

### Verify Deployment
```bash
# List deployed functions
firebase functions:list

# Check function logs
firebase functions:log --only stripePayment
firebase functions:log --only sendPurchaseEmail
```

---

## 3. Firestore Rules Deployment

### Deploy Rules
```bash
# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Deploy from specific file
firebase deploy --only firestore:rules --config firebase.json
```

### Rules File Location
- `firestore.rules` (441 lines)
- Key security patterns: Admin checks, user ownership, field validation

### Verify Rules
```bash
# Run rules tests (if configured)
npm run test:rules

# Manual verification via Firebase Console:
# Console → Firestore → Rules → Rules Playground
```

---

## 4. Firestore Indexes Deployment

### Deploy Indexes
```bash
# Deploy all indexes
firebase deploy --only firestore:indexes
```

### Indexes File
- `firestore.indexes.json`
- Contains composite indexes for:
  - Events (by date, status, city)
  - Posts (by user, visibility, timestamp)
  - Comments (by post, parent, timestamp)
  - Follows (bidirectional lookups)
  - Ticket transfers (by sender, recipient, event)

### Monitor Index Building
```bash
# Check index status in Firebase Console:
# Console → Firestore → Indexes
# Status: CREATING → READY
```

**Note**: Large indexes may take 10-30 minutes to build.

---

## 5. Storage Rules Deployment

### Deploy Storage Rules
```bash
firebase deploy --only storage
```

### Storage Rules File
- `storage.rules`
- Covers: Profile pictures, post media, event images

---

## 6. Secret Management (Firebase)

### View Current Secrets
```bash
firebase functions:secrets:access SECRET_NAME
```

### Set/Update Secrets
```bash
# Stripe
firebase functions:secrets:set STRIPE_SECRET
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET

# AWS SES (Email)
firebase functions:secrets:set AWS_ACCESS_KEY_ID
firebase functions:secrets:set AWS_SECRET_ACCESS_KEY
firebase functions:secrets:set AWS_SES_REGION

# Shopify
firebase functions:secrets:set SHOPIFY_ADMIN_ACCESS_TOKEN
firebase functions:secrets:set SHOPIFY_SHOP_NAME

# Printify
firebase functions:secrets:set PRINTIFY_API_TOKEN
firebase functions:secrets:set PRINTIFY_SHOP_ID

# Internal
firebase functions:secrets:set PROXY_KEY
```

### Secrets Used by Functions
| Secret | Used By | Purpose |
|--------|---------|---------|
| STRIPE_SECRET | stripe.js | Payment processing |
| AWS_ACCESS_KEY_ID | sesEmail.js | Email sending |
| AWS_SECRET_ACCESS_KEY | sesEmail.js | Email sending |
| SHOPIFY_ADMIN_ACCESS_TOKEN | shopifyAdmin.js | Inventory sync |
| PRINTIFY_API_TOKEN | printify.js | Merch fulfillment |
| PROXY_KEY | stripe.js | API route authentication |

---

## 7. Post-Deployment Verification Checklist

### Frontend (Vercel)
- [ ] Home page loads without errors
- [ ] User can log in / sign up
- [ ] Events page displays events
- [ ] Shop page displays products
- [ ] Cart and checkout flow works
- [ ] Admin dashboard accessible (for admins)

### Backend (Firebase Functions)
- [ ] `stripePayment` function responds to health check
- [ ] Test purchase completes successfully
- [ ] Email receipt is sent
- [ ] Push notifications deliver

### Database (Firestore)
- [ ] Queries execute without permission errors
- [ ] Indexes are in READY state
- [ ] Rules prevent unauthorized access

### Quick Health Check
```bash
# Check function health endpoint
curl https://us-central1-ragestate-app.cloudfunctions.net/stripePayment/health

# Expected: {"status":"ok","timestamp":"..."}
```

---

## 8. Rollback Procedures

### Frontend Rollback (Vercel)
1. Go to Vercel Dashboard → Project → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"

### Functions Rollback
```bash
# Redeploy previous version from git
git checkout <previous-commit>
firebase deploy --only functions
git checkout main
```

### Rules Rollback
```bash
# Firestore rules are versioned in Firebase Console
# Console → Firestore → Rules → History → Select version → Publish
```

---

## 9. Emergency Contacts

| Role | Contact |
|------|---------|
| Primary Developer | [Internal] |
| Firebase Support | https://firebase.google.com/support |
| Vercel Support | https://vercel.com/support |
| Stripe Support | https://support.stripe.com |

---

## 10. Common Deployment Issues

### "Permission Denied" on Deploy
```bash
# Re-authenticate
firebase login --reauth

# Verify project
firebase use ragestate-app
```

### Function Timeout During Deploy
```bash
# Deploy functions one at a time
firebase deploy --only functions:functionName
```

### Index Building Stuck
- Wait up to 30 minutes for large indexes
- Check Firebase Console for specific errors
- Delete and recreate if stuck > 1 hour

### Vercel Build Failure
1. Check build logs in Vercel Dashboard
2. Run `npm run build` locally to reproduce
3. Fix errors and push again

---

## Appendix: Full Deployment Command

```bash
# Complete deployment (all services)
firebase deploy --only firestore:rules,firestore:indexes,storage,functions

# Or step by step:
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage
firebase deploy --only functions
```
