/**
 * Server-side rate limiting utility for Next.js API routes.
 * Uses Firestore Admin for persistent tracking across serverless invocations.
 *
 * This provides more robust rate limiting than in-memory Map() which is lost
 * on function cold start, preventing brute-force attacks on sensitive endpoints.
 */
import 'server-only';
import { firestoreAdmin } from './firebaseAdmin';

// Rate limit configurations
const RATE_LIMIT_CONFIGS = {
  // Order lookup for guests: 5 calls per 5 minutes per IP
  // Prevents enumeration attacks on guest orders
  ORDER_LOOKUP: {
    collection: 'rateLimits',
    maxAttempts: 5,
    windowMs: 5 * 60 * 1000, // 5 minutes
    keyPrefix: 'order_lookup',
  },
  // Generic API action: 10 per minute
  API_ACTION: {
    collection: 'rateLimits',
    maxAttempts: 10,
    windowMs: 60 * 1000,
    keyPrefix: 'api_action',
  },
};

/**
 * Check and record a rate-limited action using Firestore.
 * Uses Firestore transaction for atomic check-and-increment.
 *
 * @param {string} configKey - Key from RATE_LIMIT_CONFIGS (e.g., 'ORDER_LOOKUP')
 * @param {string} identifier - IP address, user ID, or other unique identifier
 * @returns {Promise<{ allowed: boolean, remaining: number, resetAt: Date | null, message: string }>}
 */
export async function checkRateLimit(configKey, identifier) {
  const config = RATE_LIMIT_CONFIGS[configKey];
  if (!config) {
    console.warn('Unknown rate limit config key:', configKey);
    return { allowed: true, remaining: 0, resetAt: null, message: '' };
  }

  const { collection, maxAttempts, windowMs, keyPrefix } = config;
  const docId = `${keyPrefix}_${identifier}`;
  const docRef = firestoreAdmin.collection(collection).doc(docId);
  const now = Date.now();

  try {
    const result = await firestoreAdmin.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      let data = snap.exists ? snap.data() : { attempts: [], windowStart: now };

      // Clean up attempts outside the current window
      const windowStart = now - windowMs;
      const recentAttempts = (data.attempts || []).filter((ts) => ts > windowStart);

      // Check if rate limited
      if (recentAttempts.length >= maxAttempts) {
        const oldestAttempt = Math.min(...recentAttempts);
        const resetAt = new Date(oldestAttempt + windowMs);
        const remainingMs = resetAt.getTime() - now;
        const remainingSecs = Math.ceil(remainingMs / 1000);

        return {
          allowed: false,
          remaining: 0,
          resetAt,
          message: `Too many requests. Please try again in ${remainingSecs} seconds.`,
        };
      }

      // Record this attempt
      recentAttempts.push(now);
      tx.set(docRef, {
        attempts: recentAttempts,
        lastAttempt: now,
        identifier,
        updatedAt: now,
      });

      return {
        allowed: true,
        remaining: maxAttempts - recentAttempts.length,
        resetAt: null,
        message: '',
      };
    });

    return result;
  } catch (err) {
    // On error, fail open (allow the request) but log it
    console.error('Rate limit check failed:', { configKey, identifier, error: err?.message });
    return { allowed: true, remaining: 0, resetAt: null, message: '' };
  }
}

/**
 * Get client IP from Next.js request
 * @param {Request} request - Next.js Request object
 * @returns {string}
 */
export function getClientIp(request) {
  // Check common headers in order of preference
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // Take the first IP in the chain (original client)
    return xForwardedFor.split(',')[0].trim();
  }

  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp;
  }

  // Fallback
  return 'unknown';
}
