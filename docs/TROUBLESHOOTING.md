# RAGESTATE Troubleshooting Guide

> **Last Updated**: January 23, 2026
> **Audience**: Developers, Support, Operations

---

## Quick Diagnostic Commands

```bash
# Check build locally
npm run build

# Check for linting errors
npm run lint

# Check npm vulnerabilities
npm audit

# Check Firebase functions status
firebase functions:list

# View recent function logs
firebase functions:log --limit 50

# Check Firestore indexes
firebase firestore:indexes
```

---

## Common Issues and Solutions

### 1. Authentication Issues

#### User Can't Log In
**Symptoms**: Login form submits but user is not authenticated

**Checks**:
1. Verify Firebase Auth is properly initialized
2. Check browser console for errors
3. Verify Firebase project configuration in environment variables

**Solutions**:
```javascript
// Check if Firebase is initialized
import { auth } from '@/firebase/firebase';
console.log('Auth initialized:', !!auth);
```

Common causes:
- Missing/incorrect `NEXT_PUBLIC_FIREBASE_*` environment variables
- Firebase Auth not enabled in Firebase Console
- User's email not verified (if verification required)

#### Token Refresh Failing
**Symptoms**: User logged in but API calls return 401

**Solution**: Force token refresh
```javascript
import { getAuth } from 'firebase/auth';
const auth = getAuth();
await auth.currentUser?.getIdToken(true); // Force refresh
```

#### Admin Access Denied
**Symptoms**: Admin user can't access `/admin/*` routes

**Checks**:
1. Verify user has admin custom claim: `auth.currentUser.getIdTokenResult()`
2. Check `adminUsers/{uid}` document exists in Firestore
3. User may need to sign out and back in after claim is set

**Debug endpoint**: `/admin/events/debug-auth-test` (remove after debugging)

---

### 2. Payment Issues

#### Payment Intent Creation Fails
**Symptoms**: Checkout shows error, payment doesn't process

**Checks**:
1. Check function logs: `firebase functions:log --only stripePayment`
2. Verify `STRIPE_SECRET` is set in Firebase Secret Manager
3. Check Stripe Dashboard for failed payments

**Common errors**:
| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid API key` | Wrong/missing Stripe key | Re-set `STRIPE_SECRET` |
| `Amount must be >= 50` | Cart total too low | Check minimum order amount |
| `Rate limit exceeded` | Too many requests | Wait and retry |

#### Payment Succeeds but Order Not Created
**Symptoms**: Stripe shows payment, but no order in Firestore

**Checks**:
1. Verify `finalize-order` API route is being called
2. Check Vercel logs for API errors
3. Verify Firebase Auth token is being passed

**Solution**: Check `purchases` collection for the payment intent ID

#### Tickets Not Appearing After Purchase
**Symptoms**: Payment complete but tickets not in user's account

**Checks**:
1. Check `ragers` subcollection under the event
2. Verify `ticketTokens` collection has entries
3. Check function logs for errors during order finalization

---

### 3. Firestore Issues

#### PERMISSION_DENIED Errors
**Symptoms**: Console shows "Missing or insufficient permissions"

**Checks**:
1. Verify user is authenticated
2. Check `firestore.rules` for the collection being accessed
3. Use Firebase Console Rules Playground to test

**Common causes**:
- Accessing another user's private data
- Missing admin claim for admin-only routes
- Document path doesn't match rule patterns

**Debug in Rules Playground**:
1. Firebase Console → Firestore → Rules → Rules Playground
2. Set authentication context (user UID, custom claims)
3. Test the exact query/operation

#### Index Not Found
**Symptoms**: Query fails with "requires an index" error

**Solution**:
1. Click the link in the error message to create the index
2. Or deploy indexes: `firebase deploy --only firestore:indexes`
3. Wait for index to build (check status in Firebase Console)

#### Queries Returning Empty Results
**Checks**:
1. Verify collection name is correct (case-sensitive)
2. Check query filters match document fields exactly
3. Verify documents exist in Firebase Console

---

### 4. Deployment Issues

#### Vercel Build Fails
**Symptoms**: Push to `main` doesn't deploy, build errors in Vercel

**Checks**:
1. View build logs in Vercel Dashboard
2. Run `npm run build` locally to reproduce
3. Check for missing environment variables

**Common causes**:
| Error | Solution |
|-------|----------|
| `Module not found` | Check import paths, run `npm install` |
| `Type error` | Fix TypeScript/JSDoc errors |
| `ESLint errors` | Run `npm run lint` and fix |
| `Environment variable missing` | Add to Vercel project settings |

#### Firebase Functions Deploy Fails
**Symptoms**: `firebase deploy --only functions` errors

**Common errors**:
```bash
# Permission denied
firebase login --reauth
firebase use ragestate-app

# Dependencies outdated
cd functions && npm install && cd ..

# Memory/timeout issues
# Deploy one function at a time:
firebase deploy --only functions:stripePayment
```

#### Environment Variables Not Working
**Symptoms**: Features broken in production but work locally

**Checks**:
1. Verify vars are set in Vercel Dashboard (not just `.env.local`)
2. Check variable names start with `NEXT_PUBLIC_` for client-side access
3. Redeploy after adding environment variables

---

### 5. Push Notification Issues

#### Notifications Not Received
**Symptoms**: User enabled notifications but doesn't receive them

**Checks**:
1. Verify FCM token is saved: Check `users/{uid}/devices` collection
2. Check browser notification permissions
3. Verify service worker is registered: `firebase-messaging-sw.js`

**Debug steps**:
```javascript
// Check if service worker is registered
const registration = await navigator.serviceWorker.ready;
console.log('SW registered:', !!registration);

// Check FCM token
import { getMessaging, getToken } from 'firebase/messaging';
const token = await getToken(messaging);
console.log('FCM token:', token);
```

#### Service Worker Not Loading
**Symptoms**: Console errors about service worker

**Checks**:
1. Verify `public/firebase-messaging-sw.js` exists
2. Check browser DevTools → Application → Service Workers
3. Verify HTTPS (required for service workers in production)

---

### 6. Chat Issues

#### Messages Not Sending
**Symptoms**: Chat message stays pending, never appears

**Checks**:
1. Check `chats/{chatId}/messages` collection in Firestore
2. Verify user is authenticated
3. Check Firestore rules allow message creation

#### Chat List Not Updating
**Symptoms**: New chats don't appear in list

**Checks**:
1. Verify `onChatCreated` function is deployed
2. Check `users/{uid}/chatSummaries` collection
3. Review function logs for errors

---

### 7. Performance Issues

#### Slow Page Load
**Symptoms**: Pages take > 3 seconds to load

**Checks**:
1. Run `npm run analyze` to check bundle size
2. Check Vercel Speed Insights for LCP
3. Verify images are optimized (use next/image)

**Common solutions**:
- Enable dynamic imports for large components
- Check for unnecessary re-renders
- Verify Firestore queries use indexes

#### High Firestore Read Count
**Symptoms**: Firebase billing shows unexpected reads

**Checks**:
1. Look for missing `limit()` in queries
2. Check for listeners without cleanup (missing `unsubscribe()`)
3. Verify real-time listeners are scoped appropriately

**Solution**: Use the admin metrics dashboard which reads from pre-aggregated data

---

### 8. Media Upload Issues

#### Image Upload Fails
**Symptoms**: Profile/post image upload shows error

**Checks**:
1. Verify Firebase Storage rules allow the upload
2. Check file size limits (typically 5-10 MB)
3. Verify supported file types

#### Video Processing Stuck
**Symptoms**: Video shows "processing" indefinitely

**Checks**:
1. Check `onMediaUpload` function logs
2. Verify video meets format requirements
3. Check Cloud Function timeout settings

---

## Support Escalation Procedures

### Level 1: Self-Service (User)
1. Clear browser cache and cookies
2. Try incognito/private browsing
3. Check status page (if available)
4. Try different browser/device

### Level 2: Developer Investigation
1. Check Vercel logs for API errors
2. Check Firebase Functions logs
3. Review Firestore security rules
4. Check Stripe Dashboard for payment issues

### Level 3: Infrastructure (Urgent)
1. Check Firebase/Vercel status pages
2. Review recent deployments for breaking changes
3. Check for quota limits or billing issues
4. Consider rollback if recent deployment caused issue

### Escalation Contacts

| Issue Type | Primary Contact | Backup |
|------------|-----------------|--------|
| Authentication | Firebase Support | Internal Dev |
| Payments | Stripe Support | Internal Dev |
| Deployments | Vercel Support | Internal Dev |
| Database | Firebase Support | Internal Dev |

---

## Error Code Reference

### HTTP Status Codes
| Code | Meaning | Common Cause |
|------|---------|--------------|
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing/expired auth token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side bug |

### Firebase Error Codes
| Code | Meaning | Solution |
|------|---------|----------|
| `auth/user-not-found` | No user with email | Check email spelling |
| `auth/wrong-password` | Incorrect password | Use password reset |
| `auth/too-many-requests` | Rate limited | Wait before retry |
| `permission-denied` | Firestore rules blocked | Check auth state |
| `unavailable` | Service temporarily down | Retry with backoff |

### Stripe Error Codes
| Code | Meaning | Solution |
|------|---------|----------|
| `card_declined` | Card was declined | Try different card |
| `expired_card` | Card has expired | Update card info |
| `incorrect_cvc` | CVC doesn't match | Re-enter CVC |
| `processing_error` | Temporary issue | Retry payment |

---

## Health Check Endpoints

### API Health
```bash
# Stripe function health
curl https://us-central1-ragestate-app.cloudfunctions.net/stripePayment/health

# Expected response:
{"status":"ok","timestamp":"..."}
```

### Frontend Check
- Home: https://ragestate.com
- Login: https://ragestate.com/login
- Events: https://ragestate.com/events

---

## Logs Location Quick Reference

| Log Type | Location |
|----------|----------|
| Frontend errors | Browser DevTools Console |
| API route errors | Vercel Dashboard → Logs |
| Cloud Function logs | Firebase Console → Functions → Logs |
| Firestore errors | Browser console + Function logs |
| Build logs | Vercel Dashboard → Deployments |
| Auth events | Firebase Console → Authentication |

---

## Recovery Procedures

### Rollback Frontend (Vercel)
1. Go to Vercel Dashboard → Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"

### Rollback Functions
```bash
git checkout <last-working-commit>
firebase deploy --only functions
git checkout main
```

### Rollback Firestore Rules
1. Firebase Console → Firestore → Rules
2. Click "History"
3. Select previous version
4. Click "Publish"

### Emergency: Disable Feature
If a feature is causing issues, disable via:
1. Environment variable (redeploy required)
2. Firestore config document (immediate)
3. Feature flag (if implemented)
